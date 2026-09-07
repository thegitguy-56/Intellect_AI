"""Seed prior_art_corpus with a sample dataset and generate embeddings.

Free-tier scope tradeoff (documented in docs/PROJECT_BUILD_PLAN.md Section 8
and docs/ARCHITECTURE.md): the bundled data/sample_prior_art.json holds ~40
synthetic-but-representative patent-style entries across a range of tech
domains, standing in for a real USPTO/Google Patents Public Data subset. It's
enough to exercise the full embedding -> pgvector similarity search ->
gap-analysis pipeline end-to-end. Swap in a real bulk-data subset (a few
hundred to a few thousand rows realistically fit Neon's free tier) by
replacing the JSON file with the same {title, assignee, filing_date,
full_text} shape and re-running this script.

Usage (from backend/, with the venv active and .env populated):
    python scripts/seed_corpus.py
"""

import asyncio
import json
import sys
import platform
from pathlib import Path

# Windows ProactorEventLoop has a known issue timing out on IPv6 SSL
# connections — asyncpg connects to Neon which resolves to IPv6, causing
# CancelledError → TimeoutError. SelectorEventLoop handles it correctly.
if platform.system() == "Windows":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db import close_pool, execute, fetch_one, init_pool  # noqa: E402
from app.services.embeddings import embed_batch  # noqa: E402

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_prior_art.json"


async def main() -> None:
    entries = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(entries)} sample prior-art entries from {DATA_PATH.name}")

    await init_pool()

    inserted = 0
    skipped = 0
    texts = [e["full_text"] for e in entries]
    print("Generating embeddings (hashing vectorizer — no model download)...")
    vectors = embed_batch(texts)

    for entry, vector in zip(entries, vectors, strict=True):
        existing = await fetch_one(
            "SELECT id FROM prior_art_corpus WHERE title = $1", entry["title"]
        )
        if existing is not None:
            skipped += 1
            continue

        metadata = {"assignee": entry.get("assignee"), "filing_date": entry.get("filing_date")}
        await execute(
            """
            INSERT INTO prior_art_corpus (title, source, full_text, embedding, metadata)
            VALUES ($1, 'seed_dataset', $2, $3, $4)
            """,
            entry["title"],
            entry["full_text"],
            vector,
            json.dumps(metadata),
        )
        inserted += 1

    await close_pool()
    print(f"Done. Inserted {inserted} new rows, skipped {skipped} already-seeded rows.")


if __name__ == "__main__":
    asyncio.run(main())
