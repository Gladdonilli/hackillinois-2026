"""
Upload MLAAD-tiny fake WAVs to Modal volume.
Reads from /home/li859/datasets/larynx-5k/fake/mlaad_*.wav and pushes to
/model-cache/dataset/fake/ on the model-cache volume.

Chunks into batches of 200 to avoid memory pressure (each WAV ~150KB).

Usage:
  source ~/modal-env/bin/activate
  modal run LARYNX/backend/upload_mlaad_to_volume.py
"""

import modal
from pathlib import Path

app = modal.App("larynx-upload-mlaad")
model_cache = modal.Volume.from_name("model-cache", create_if_missing=True)

MLAAD_DIR = Path("/home/li859/datasets/larynx-5k/fake")
UPLOAD_CHUNK = 200  # files per remote call


@app.function(
    image=modal.Image.debian_slim(python_version="3.11"),
    volumes={"/model-cache": model_cache},
    timeout=600,
)
def upload_chunk(wav_items: list[tuple[str, bytes]]) -> int:
    """Upload a chunk of WAV files to the volume. Returns count written."""
    dest = Path("/model-cache/dataset/fake")
    dest.mkdir(parents=True, exist_ok=True)
    written = 0
    for filename, wav_bytes in wav_items:
        fpath = dest / filename
        if not fpath.exists():
            with open(fpath, "wb") as f:
                f.write(wav_bytes)
            written += 1
    model_cache.commit()
    return written


@app.function(
    image=modal.Image.debian_slim(python_version="3.11"),
    volumes={"/model-cache": model_cache},
    timeout=120,
)
def verify_volume() -> dict[str, int]:
    """Count files on volume by prefix."""
    from collections import Counter
    base = Path("/model-cache/dataset")
    counts = {}
    for subdir in ["real", "fake"]:
        d = base / subdir
        if d.exists():
            files = list(d.glob("*.wav"))
            counts[subdir] = len(files)
            # Prefix breakdown for fake
            if subdir == "fake":
                prefixes = Counter()
                for f in files:
                    name = f.name
                    if name.startswith("mlaad_"):
                        prefixes["mlaad_*"] += 1
                    elif name.startswith("elkey"):
                        prefixes[name.split("_")[0]] += 1
                    elif name.startswith("wf_"):
                        prefixes["wf_*"] += 1
                    else:
                        prefixes["other"] += 1
                counts["fake_breakdown"] = dict(prefixes)
        else:
            counts[subdir] = 0
    return counts


@app.local_entrypoint()
def main():
    import time

    # Collect MLAAD files
    mlaad_files = sorted(MLAAD_DIR.glob("mlaad_*.wav"))
    print(f"Found {len(mlaad_files)} MLAAD files to upload")

    if not mlaad_files:
        print("No MLAAD files found. Exiting.")
        return

    # Read all WAV bytes locally and chunk
    chunks = []
    current_chunk = []
    for f in mlaad_files:
        current_chunk.append((f.name, f.read_bytes()))
        if len(current_chunk) >= UPLOAD_CHUNK:
            chunks.append(current_chunk)
            current_chunk = []
    if current_chunk:
        chunks.append(current_chunk)

    print(f"Uploading in {len(chunks)} chunks of up to {UPLOAD_CHUNK} files each...")
    t0 = time.time()

    # Dispatch all chunks in parallel via .map()
    total_written = 0
    for i, count in enumerate(upload_chunk.map(chunks)):
        total_written += count
        elapsed = time.time() - t0
        print(f"  Chunk {i+1}/{len(chunks)}: +{count} files ({elapsed:.1f}s elapsed)")

    elapsed = time.time() - t0
    print(f"\n✅ Upload complete: {total_written} new files written in {elapsed:.1f}s")

    # Verify
    print("\nVerifying volume contents...")
    counts = verify_volume.remote()
    print(f"  Real: {counts.get('real', 0)}")
    print(f"  Fake: {counts.get('fake', 0)}")
    if 'fake_breakdown' in counts:
        for prefix, count in sorted(counts['fake_breakdown'].items()):
            print(f"    {prefix}: {count}")
