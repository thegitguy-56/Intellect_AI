# IntellectFlow — Patent Analysis, Prior-Art Search & Innovation Recommendation System

NLP capstone project. Users upload patent documents and get automated
extraction/analysis, semantic prior-art search, AI-driven innovation
recommendations, a patent Q&A assistant, and downloadable analytical reports.

Full build plan: see [`docs/PROJECT_BUILD_PLAN.md`](docs/PROJECT_BUILD_PLAN.md).

## Repo layout

```
/frontend           Next.js (App Router, TypeScript, Tailwind v4) — Vercel
/backend            FastAPI (NLP service: OCR, NER, embeddings, Groq) — Render
/design-reference    Stitch-generated screens (source of truth for UI, per screen: code.html + screen.png)
```

Frontend and backend are separate deployable units — no shared build step,
no monorepo tooling coupling them together.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) on Vercel |
| Backend (NLP service) | FastAPI on Render — cold starts ~30-50s after idle |
| Database | Neon Postgres + `pgvector` |
| File storage | Cloudflare R2 |
| Auth | NextAuth.js against Neon `users` table |
| LLM | Groq API (`openai/gpt-oss-120b` by default — the plan's originally specified Llama 3.3 model was retired from Groq's catalog; `GROQ_MODEL` is configurable) |
| Embeddings | scikit-learn `HashingVectorizer` (word/bigram hashing, no trained model — deliberately lightweight, see `docs/ARCHITECTURE.md`) |
| NER / Classification | spaCy (`en_core_web_sm`) + rule-based section splitting |
| OCR | Tesseract via `pytesseract`, fallback for scanned PDFs |
| Charts | Hand-rolled SVG (matches the literal Stitch chart/gauge markup more closely than a charting library would) |
| Report export | `reportlab` (Python, on Render) |

## Local dev setup

### Prerequisites
- Node.js 20+, npm
- Python 3.11+
- A Neon Postgres project with the `pgvector` extension enabled
- A Cloudflare R2 bucket + API token
- A Groq API key

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in DATABASE_URL, R2, NEXTAUTH_SECRET, etc.
npm run dev                  # http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env          # fill in DATABASE_URL, R2, GROQ_API_KEY, etc.
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/health
```

Run backend tests:
```bash
cd backend
venv\Scripts\python.exe -m pytest tests/ -q
```

Seed the prior-art corpus (needed before semantic search returns anything):
```bash
cd backend
venv\Scripts\python.exe scripts/seed_corpus.py
```

## App routes

| Route | Screen |
|---|---|
| `/` | Login |
| `/signup` | Sign-up (3-step) |
| `/library` | Patent Library (home) |
| `/upload` | New Analysis (upload) |
| `/patents/[id]` | Overview |
| `/patents/[id]/analysis` | Extracted Data (highlighted entities) |
| `/patents/[id]/prior-art` | Prior-Art similarity map |
| `/patents/[id]/opportunities` | Innovation gap map |
| `/patents/[id]/assistant` | AI Assistant chat |
| `/patents/[id]/report` | Report preview & export |
| `/patents/[id]/risk` | Risk & compliance detail |
| `/analytics` | Analytics dashboard |
| `/settings` | Settings / profile |

Global search is a `⌘K` command palette (`src/components/CommandPalette.tsx`)
available from any authenticated page, not a separate route.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the pipeline design,
the hybrid symbolic/LLM rationale, and free-tier tradeoffs in more depth.

## Deployment

**Backend (Render)**: this repo includes `render.yaml` at the root plus
`backend/Dockerfile`. The backend deploys as a **Docker** web service, not
Render's native Python runtime, because the OCR fallback needs the
`tesseract-ocr` and `poppler-utils` system binaries that `pip install` alone
can't provide. In the Render dashboard: New → Blueprint → point at this
repo → it picks up `render.yaml` → fill in the `sync: false` env vars
(DATABASE_URL, R2 credentials, GROQ_API_KEY, INTERNAL_API_KEY) with real
values.

**Frontend (Vercel)**: import the repo, then in Project Settings → General
set **Root Directory** to `frontend`. Add all vars from
`frontend/.env.example` (real values), pointing
`NEXT_PUBLIC_API_BASE_URL` at the deployed Render URL and using Neon's
pooled connection string for `DATABASE_URL` / direct for `DIRECT_URL`.

After both are live: re-run `npx prisma migrate deploy` against production
`DIRECT_URL` if it hasn't seen the schema yet, then
`python scripts/seed_corpus.py` against the production `DATABASE_URL` to
seed the prior-art corpus.

## Environment variables

See `frontend/.env.example` and `backend/.env.example` for the full list.
Both services read `DATABASE_URL` (Neon **pooled** connection string) and
share the same Cloudflare R2 bucket credentials. `INTERNAL_API_KEY` is a
shared secret so the FastAPI service only accepts calls from the Next.js
backend, not the public internet.

## Design system

`design-reference/` holds the literal Stitch-generated spec for all 16
screens (15 required + a dark-mode variant of the prior-art map) — colors,
typography (Sora + JetBrains Mono), spacing, and component styles are ported
into `frontend/src/app/globals.css` as Tailwind v4 `@theme` tokens. When
building a screen, match `design-reference/<screen>/code.html` and
`screen.png` exactly rather than reinterpreting the design — see
`design-reference/syntactic_analytical_lab/DESIGN.md` for the system-wide
rationale.

## Build phases

All 11 phases from the build plan have code in place: scaffolding, DB/auth,
upload pipeline, NLP analysis, embeddings/search, recommendations/assistant,
risk scoring, reporting, supporting screens, deployment configs, and docs.
See commit history for what landed in each phase. Free-tier tradeoffs are
documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) rather than
duplicated here.
