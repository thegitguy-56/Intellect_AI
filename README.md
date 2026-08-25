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
| LLM | Groq API (Llama 3.3) |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`), self-hosted on Render |
| NER / Classification | spaCy (`en_core_web_sm`) + rule-based section splitting |
| OCR | Tesseract via `pytesseract`, fallback for scanned PDFs |
| Charts | Recharts |
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

Work proceeds phase by phase (scaffolding → DB/auth → upload pipeline → NLP
analysis → embeddings/search → recommendations/assistant → risk scoring →
reporting → supporting screens → polish → deployment → docs). Each phase is
verified end-to-end before moving to the next — see commit history for
progress.

## Known free-tier tradeoffs

- **Render cold starts**: the FastAPI service sleeps after inactivity;
  first request after idle can take 30-50s. UI should show a clear loading
  state for this, not look broken.
- **Prior-art corpus size**: scoped to a few hundred–few thousand patents
  (USPTO/Google Patents Public Data subset) to fit free-tier compute/storage.
- **Embedding model**: `all-MiniLM-L6-v2` (384-dim) chosen for memory
  footprint on Render's free tier over larger, more accurate models.
