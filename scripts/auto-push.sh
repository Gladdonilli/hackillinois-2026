#!/bin/bash
# Auto-commit and push to GitHub every N minutes
# Usage: ./scripts/auto-push.sh [interval_minutes]
# Default: every 5 minutes

INTERVAL=${1:-5}
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[auto-push] Watching $REPO_DIR every ${INTERVAL}m"
echo "[auto-push] Press Ctrl+C to stop"

while true; do
    sleep "${INTERVAL}m"
    
    cd "$REPO_DIR" || exit 1
    
    # Check if there are changes in the working copy
    DIFF=$(jj diff --stat 2>/dev/null)
    if [ -z "$DIFF" ]; then
        echo "[auto-push] $(date +%H:%M:%S) No changes, skipping"
        continue
    fi
    
    # Describe current working copy with timestamp
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M")
    jj describe -m "auto: checkpoint $TIMESTAMP" 2>/dev/null
    
    # Create new empty change on top
    jj new 2>/dev/null
    
    # Get the bookmark that points to the parent (the one we just described)
    # Move main bookmark forward to include our new commit
    PARENT=$(jj log -r '@-' --no-graph -T 'change_id.shortest()' 2>/dev/null)
    jj bookmark set main -r "$PARENT" 2>/dev/null
    
    # Push to GitHub
    if jj git push --bookmark main 2>/dev/null; then
        echo "[auto-push] $(date +%H:%M:%S) ✓ Pushed: $DIFF"
    else
        echo "[auto-push] $(date +%H:%M:%S) ✗ Push failed (network?)"
    fi
done
