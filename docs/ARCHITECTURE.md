# Architecture

## Hybrid symbolic + LLM design

IntellectFlow deliberately splits NLP work between rule-based/statistical
methods and an LLM, rather than routing everything through Groq:

| Task | Approach | Why |
|---|---|---|
| Section splitting (claims/abstract/background) | Rule-based regex over heading patterns (`backend/app/services/sectioning.py`) | Patent headings are regular enough that rules generalize well; an LLM call per document would be slower, costlier, and less deterministic for a purely structural task. |
| Named entity recognition | spaCy `en_core_web_sm` (`backend/app/services/ner.py`) | A trained statistical NER model is the right tool for span-level extraction; it's fast, local, and free, and this is exactly the class of problem NER models are built for. |
| Semantic similarity / prior-art retrieval | Hashing-trick word/bigram vectors (`scikit-learn` `HashingVectorizer`) + pgvector cosine distance (`backend/app/services/embeddings.py`) | Dense retrieval is an embeddings problem, not a generation problem — cheap, cacheable, and scales without touching the LLM budget. Deliberately not a trained sentence-embedding model (no torch/sentence-transformers) — this is a course capstone, and a multi-hundred-MB deep learning dependency isn't worth it for free-tier hosting; see the tradeoff note below. |
| Novelty / gap analysis, risk & compliance scoring, chat assistant | Groq, `openai/gpt-oss-120b` by default, JSON mode (`backend/app/services/llm.py`) | These genuinely require reasoning over retrieved context — comparing claims against prior art, weighing risk factors, answering open-ended questions — which is exactly what an LLM is for and what rules/embeddings can't do. `GROQ_MODEL` is configurable; the plan's originally specified Llama 3.3 model has since been retired from Groq's catalog. |

This keeps Groq calls reserved for the ~3 places in the pipeline that need
real reasoning (gap analysis, risk scoring, chat), which matters on a free
API tier with rate limits, and gives a defensible "hybrid NLP" story: each
technique is used where it's actually the right tool, not because it's the
only tool.

## Pipeline

A single upload triggers one pipeline run (`backend/app/routers/patents.py:
_run_pipeline`), rather than separate endpoints per phase, because that
mirrors how the work actually has to happen — extraction must complete
before sectioning, sectioning before embeddings, embeddings before
similarity search, and similarity search before gap/risk analysis has
useful context:

1. **Extract** — PyMuPDF (PDF) / python-docx (DOCX) / Tesseract OCR fallback
   when a PDF has no real text layer.
2. **Section-split** — rule-based, into claims/abstract/background.
3. **NER** — spaCy, mapped to `patent_entities` (person/org/date/monetary).
4. **Embed** — claims + abstract text, `patent_embeddings` (384-dim).
5. **Similarity search** — pgvector `<=>` cosine distance against
   `prior_art_corpus`, top-8 stored in `similarity_results`.
6. **Groq gap analysis** — novelty score + narrative, from claims + retrieved
   prior art.
7. **Groq risk/compliance scoring** — aggregate scores stored in
   `patent_analysis`; the per-factor breakdown (shown in the Risk tab) is
   regenerated on demand rather than persisted, since it isn't in the
   Section 4 schema and there's no reason to spend a Groq call on it before
   anyone asks to see it.

If Groq fails or rate-limits (step 6/7), the pipeline still completes and
marks the patent `analyzed` — extraction, entities, embeddings, and
prior-art matches are already useful on their own, so a Groq outage
degrades gracefully instead of failing the whole upload (see
`LLMUnavailableError` handling in `patents.py`).

## Data flow between services

Prisma (`frontend/prisma/schema.prisma`) is the single schema/migration
source of truth. The FastAPI backend reads/writes the same Postgres tables
directly via `asyncpg` — it does not run its own migrations. This is why
every primary key is a database-generated UUID (`gen_random_uuid()`) rather
than a Prisma-side `cuid()`: rows created by either service need to be
insertable without the two runtimes coordinating ID generation.

Next.js API routes call the FastAPI service server-to-server
(`frontend/src/lib/backend.ts`), authenticated with a shared
`INTERNAL_API_KEY` header — the FastAPI service never receives requests
directly from the browser.

## Free-tier tradeoffs

- **Render cold starts**: the FastAPI service sleeps after ~15 minutes
  idle; the first request after that takes 30-50s. The upload flow's
  polling/processing UI (`ProcessingState`) is what a user sees during this
  — deliberately not a spinner-then-timeout, since a cold start is expected
  behavior on this tier, not an error.
- **Prior-art corpus size**: `backend/data/sample_prior_art.json` ships ~40
  synthetic-but-representative entries, standing in for a real USPTO/Google
  Patents Public Data subset (a few hundred–few thousand rows would
  realistically fit Neon's free tier). See `backend/scripts/seed_corpus.py`
  for how to swap in real data.
- **No trained embedding model**: embeddings are word/bigram hashing
  vectors (`scikit-learn` `HashingVectorizer`), not a sentence-transformer.
  This trades retrieval quality for a dependency footprint that's a fraction
  of `torch` + `sentence-transformers` (which alone can be 500MB-2GB) — a
  deliberate choice for a capstone project on constrained free-tier hosting
  and local disk space, not an oversight. The tradeoff: results reflect
  lexical/word overlap rather than deep semantic similarity, so a query
  using different vocabulary for the same concept may rank lower than it
  would with a real sentence embedding model.
- **OCR on Render's free CPU tier**: Tesseract OCR (the scanned-PDF
  fallback) has no GPU acceleration and can take several seconds per page —
  acceptable for occasional scanned uploads in a course project, not for
  high-volume production use. The Dockerfile-based Render deploy (see
  `backend/Dockerfile`) exists specifically because Tesseract and
  Poppler are system binaries `pip install` can't provide on Render's
  native Python runtime.

## NLP techniques → where they're used

| Technique | Location |
|---|---|
| Tokenization | Implicit in spaCy's NER pipeline and the sentence-transformer's tokenizer |
| Named Entity Recognition | `backend/app/services/ner.py` |
| Text classification (section splitting) | `backend/app/services/sectioning.py` |
| Semantic search / dense retrieval | `backend/app/services/embeddings.py` + pgvector `<=>` queries |
| Text summarization | Groq gap-analysis summary, `backend/app/services/llm.py:gap_analysis` |
| Conversational AI | RAG chat assistant, `backend/app/routers/chat.py` |
| Information retrieval | Prior-art similarity search (`patents.py` pipeline) + ad-hoc corpus search (`search.py`) |
