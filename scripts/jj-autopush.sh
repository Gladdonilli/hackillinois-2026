#!/usr/bin/env bash
# jj-autopush: Background daemon that pushes bookmarks to GitHub — only when they
# point to described (named) commits. Skips unnamed working-copy churn.
# Usage: ./scripts/jj-autopush.sh [--interval SECONDS]
#
# Only pushes when:
#   1. A bookmark's target commit has changed since last check
#   2. That commit has a non-empty description (i.e. it was explicitly named/described)
# This prevents flooding GitHub with hundreds of working-copy snapshots.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INTERVAL=10  # Default poll interval

if [[ "${1:-}" == "--interval" ]] && [[ -n "${2:-}" ]]; then
    INTERVAL="$2"
fi

PUSH_COUNT=0
LAST_BOOKMARK_STATE=""

log() {
    echo "[jj-autopush $(date '+%H:%M:%S')] $*"
}

# Get a fingerprint of all bookmarks and their target commits (only described ones)
# Format: "bookmark:commit_id" per line, sorted — so we can detect changes
get_bookmark_state() {
    jj bookmark list --all -R "$REPO_DIR" -T 'separate("\n", name ++ ":" ++ self.normal_target().map(|c| c.commit_id().short(12)) ++ ":" ++ self.normal_target().map(|c| if(c.description(), "described", "empty")))' 2>/dev/null | sort || echo ""
}

push_described_bookmarks() {
    local output
    # jj git push --all only pushes bookmarks — and we've already confirmed
    # at least one bookmark moved to a described commit
    if output=$(jj git push --all -R "$REPO_DIR" 2>&1); then
        if echo "$output" | grep -q "Nothing changed"; then
            return 1  # Nothing to push
        fi
        PUSH_COUNT=$((PUSH_COUNT + 1))
        log "✓ Pushed (#$PUSH_COUNT): $(echo "$output" | tr '\n' ' ')"
        return 0
    else
        log "✗ Push failed: $(echo "$output" | tr '\n' ' ')"
        return 1
    fi
}

has_described_changes() {
    local old="$1" new="$2"
    # Compare old vs new bookmark state — only trigger if a bookmark pointing
    # to a "described" commit has changed
    local changed_described
    changed_described=$(comm -13 <(echo "$old") <(echo "$new") | grep ":described$" || true)
    [[ -n "$changed_described" ]]
}

# Trap for clean exit
cleanup() {
    log "Stopping. Total pushes: $PUSH_COUNT"
    exit 0
}
trap cleanup SIGINT SIGTERM

log "Started — watching $REPO_DIR (poll: ${INTERVAL}s)"
log "Only pushing bookmarks on described (named) commits"
LAST_BOOKMARK_STATE="$(get_bookmark_state)"
log "Tracking $(echo "$LAST_BOOKMARK_STATE" | grep -c ':described$' || echo 0) described bookmark(s)"

while true; do
    sleep "$INTERVAL"
    CURRENT_STATE="$(get_bookmark_state)"

    if [[ "$CURRENT_STATE" != "$LAST_BOOKMARK_STATE" ]]; then
        if has_described_changes "$LAST_BOOKMARK_STATE" "$CURRENT_STATE"; then
            log "Described bookmark change detected"
            LAST_BOOKMARK_STATE="$CURRENT_STATE"
            sleep 1  # Let JJ finish any multi-step operation
            push_described_bookmarks || true
        else
            # Bookmark moved but to an unnamed commit — skip silently
            LAST_BOOKMARK_STATE="$CURRENT_STATE"
        fi
    fi
done
