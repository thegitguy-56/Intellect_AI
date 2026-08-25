# Intelligent Patent Analysis, Prior-Art Search & Innovation Recommendation System
### Full Build Plan for Claude Code

This is a capstone NLP course project. Build a full-stack, free-tier-deployable web platform per the spec below. Work through the phases in order — each phase should be completed and verified before moving to the next.

---

## 1. Project Overview

A web platform where users upload patent documents, get automated extraction/analysis of patent info, semantic prior-art search, AI-driven innovation recommendations, a patent Q&A assistant, and downloadable analytical reports.

**Core modules:**
1. User Management & Patent Upload
2. Patent Document Analysis
3. Prior-Art Semantic Search Engine
4. Innovation Recommendation & AI Patent Assistant
5. Analytics & Report Generation

**NLP techniques used:** Tokenization, Named Entity Recognition (NER), Text Classification, Semantic Search, Text Summarization, Conversational AI, Information Retrieval.

---

## 2. Tech Stack (all free-tier, long-term-viable)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) on Vercel | Free tier |
| Backend (NLP service) | FastAPI on Render (free web service) | Cold starts ~30-50s after idle — document this limitation |
| Database | Neon Postgres + `pgvector` extension | Relational data + embeddings in one DB |
| File storage | Cloudflare R2 (10GB free) | Uploaded PDFs/DOCX |
| Auth | NextAuth.js against Neon `users` table | No third-party auth cost |
| LLM | Groq API (Llama 3.1/3.3) | Assistant chat, summarization, novelty/gap reasoning, structured JSON outputs for risk/compliance scoring |
| Embeddings | `sentence-transformers` self-hosted on Render | Stored as `vector` columns in Neon, queried via cosine distance `<=>` |
| NER / Classification | spaCy (`en_core_web_sm` or trf) + rule-based section splitting on Render | Keeps Groq calls reserved for chat/summarization/reasoning |
| OCR | Tesseract via `pytesseract` on Render | Fallback for scanned PDFs with no text layer |
| Charts | Recharts (Next.js) | Novelty trends, risk gauges, bento dashboard |
| Report export | Server-side PDF generation (Python `reportlab`/`weasyprint` on Render, or Next.js API route) | Downloadable analysis reports |

---

## 3. Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Next.js (Vercel)│◄────►│ FastAPI (Render)  │◄────►│  Neon Postgres   │
│  - UI/UX         │      │ - OCR/extraction  │      │  + pgvector      │
│  - NextAuth       │      │ - NER/classify    │      └─────────────────┘
│  - API routes for│      │ - embeddings      │
│    light ops     │      │ - Groq calls      │      ┌─────────────────┐
└────────┬─────────┘      └──────────┬────────┘      │ Cloudflare R2    │
         │                            │               │ (file storage)   │
         └───────────► both read/write from above ────┘
```

- Next.js handles auth, UI, and light DB reads (e.g., dashboard lists) directly against Neon.
- Heavy NLP work (OCR, NER, embeddings, LLM orchestration) routes through the FastAPI service on Render.
- File uploads go client → R2 directly (presigned URL) or via Next.js API route → R2, then FastAPI is given the R2 key/URL to process.

---

## 4. Database Schema (Neon Postgres)

Design and create these tables (adjust field types as needed, but keep this shape):

- `users` — id, email, hashed_password (if credentials auth), name, created_at
- `patents` — id, user_id (FK), title, original_filename, r2_key, status (`uploaded`/`processing`/`analyzed`/`error`), uploaded_at
- `patent_analysis` — id, patent_id (FK), extracted_text, claims_text, abstract_text, background_text, novelty_score, risk_score, compliance_score, created_at
- `patent_entities` — id, patent_id (FK), entity_type (`person`/`org`/`date`/`monetary`), entity_value, span_start, span_end
- `patent_embeddings` — id, patent_id (FK), embedding `vector(384 or 768)`, source_section (`claims`/`abstract`/`full`)
- `prior_art_corpus` — id, title, source (`seed_dataset`), full_text, embedding `vector`, metadata (jsonb: filing date, assignee, etc.)
- `similarity_results` — id, patent_id (FK), prior_art_id (FK), similarity_score, created_at
- `chat_messages` — id, patent_id (FK), user_id (FK), role (`user`/`assistant`), content, cited_prior_art_ids (jsonb array), created_at
- `reports` — id, patent_id (FK), report_url (or generated file path), sections_included (jsonb), created_at

Enable `pgvector` extension on Neon and add an IVFFlat or HNSW index on embedding columns for query performance.

---

## 5. Task Breakdown

### Phase 0 — Project Scaffolding
- [ ] Initialize monorepo structure: `/frontend` (Next.js) and `/backend` (FastAPI)
- [ ] Set up Next.js with TypeScript, Tailwind CSS, App Router
- [ ] Set up FastAPI project with `pyproject.toml`/`requirements.txt`, folder structure (`routers/`, `services/`, `models/`)
- [ ] Set up Neon Postgres project, enable `pgvector` extension
- [ ] Set up `.env.example` files for both frontend and backend documenting all required env vars (Neon connection string, R2 keys, Groq API key, NextAuth secret, etc.)
- [ ] Set up Cloudflare R2 bucket + API credentials
- [ ] Create a shared README documenting local dev setup for both services

### Phase 1 — Database & Auth
- [ ] Write schema migrations for all tables in Section 4 (use `Prisma` for Next.js side or a plain SQL migration approach — pick one and be consistent)
- [ ] Implement NextAuth.js with credentials provider (email/password) backed by Neon `users` table; add Google OAuth as a stretch option
- [ ] Build sign-up (multi-step) and login pages
- [ ] Protect all authenticated routes/pages with session checks

### Phase 2 — Upload Pipeline
- [ ] Build upload UI (drag-and-drop, scanning-beam animation, radial progress) per the UI spec in Section 7
- [ ] Implement presigned-URL flow: Next.js API route generates R2 presigned upload URL → client uploads directly to R2
- [ ] On successful upload, create `patents` row (status=`uploaded`) and trigger FastAPI `/analyze` endpoint with the R2 key
- [ ] FastAPI: download file from R2, detect type (PDF/DOCX), extract text (PyMuPDF / python-docx), fall back to Tesseract OCR if no text layer found
- [ ] Update `patents.status` to `processing` → `analyzed`/`error` as the pipeline progresses

### Phase 3 — Patent Document Analysis (NLP Core)
- [ ] Implement tokenization + section splitting (claims / abstract / background / description) — rule-based on document structure/headers
- [ ] Implement spaCy NER pipeline: extract person, organization, date, and monetary-value entities; store in `patent_entities`
- [ ] Implement clause/section classification (claims vs. background vs. abstract vs. description) — rule-based first, note as a stretch goal to fine-tune a lightweight classifier if time allows
- [ ] Store all extracted structured data in `patent_analysis`
- [ ] Build the Patent Analysis view UI (split-panel: document with highlighted entities on the left, live extracted-data panel on the right) per Section 7

### Phase 4 — Embeddings & Prior-Art Semantic Search
- [ ] Set up `sentence-transformers` model on the Render backend (choose a model that fits free-tier memory, e.g. `all-MiniLM-L6-v2`)
- [ ] Generate and store embeddings for uploaded patents (claims + abstract) in `patent_embeddings`
- [ ] Seed `prior_art_corpus` with a sample dataset (USPTO/Google Patents Public Data subset — scope this to what's feasible on free-tier compute/storage; a few hundred to a few thousand patents is realistic) and generate embeddings for each
- [ ] Implement semantic search: cosine similarity query (`<=>` in pgvector) between uploaded patent embedding and corpus, return top-k with scores, store in `similarity_results`
- [ ] Build the Prior-Art Search results UI (radial/orbital layout) per Section 7

### Phase 5 — Innovation Recommendation & AI Assistant
- [ ] Build Groq integration service in FastAPI: structured prompting that takes patent claims + top-k prior art and returns a gap analysis / innovation opportunities (request JSON-structured output)
- [ ] Implement the "gap map" data: position patent + prior art on a novelty vs. prior-art-density axis (can be derived from similarity scores + a Groq-generated novelty rating)
- [ ] Build the Innovation Recommendation ("gap map") UI per Section 7
- [ ] Implement chatbot: RAG-style endpoint — retrieve relevant chunks (patent + similar prior art via pgvector) as context, send to Groq, return answer + cited prior-art IDs
- [ ] Store chat history in `chat_messages`
- [ ] Build AI Assistant chat panel UI (slide-in, waveform typing indicator, citation chips) per Section 7

### Phase 6 — Risk/Compliance Scoring
- [ ] Implement structured Groq prompt that returns risk_score, compliance_score, and sub-factor breakdown as JSON, given the extracted patent data and prior-art overlap
- [ ] Store scores in `patent_analysis`
- [ ] Build Compliance/Risk Detail view UI (stacked bar / radial multi-segment chart with expandable explanations) per Section 7

### Phase 7 — Analytics & Reporting
- [ ] Build Analytics Dashboard (bento-grid: novelty trend chart, risk/compliance gauge, count-up stat tiles) aggregating across the user's patents
- [ ] Implement report generation: compile summary, entities, prior-art matches, risk/compliance, recommendations into a downloadable PDF
- [ ] Build Report Preview & Export UI (toggleable sections, export progress animation) per Section 7
- [ ] Store generated report metadata in `reports`

### Phase 8 — Supporting Screens
- [ ] Patent Library / My Patents dashboard home (grid/list toggle, novelty rings, status badges, filters)
- [ ] Patent Detail / Overview hub page (tabbed sub-nav: Overview / Extracted Data / Prior-Art / AI Assistant / Report)
- [ ] Global Search / Cross-Patent Query (command-palette style, searches library + corpus + AI answers)
- [ ] Settings/Profile page (account, notifications, API keys if applicable)
- [ ] Empty, error, and loading states for every screen (per Section 7 style — node-outline skeletons, amber error accents, not generic defaults)

### Phase 9 — Polish & Micro-interactions
- [ ] Implement magnetic hover on buttons, cross-fade page transitions, radial progress rings site-wide
- [ ] Implement the node-and-connection visual language consistently (connecting lines, glowing nodes) across landing, dashboard, and search screens
- [ ] Responsive pass (mobile/tablet breakpoints)
- [ ] Accessibility pass (keyboard nav, contrast, aria labels — especially since this is a research tool)

### Phase 10 — Deployment
- [ ] Deploy FastAPI backend to Render (free web service), configure env vars, verify cold-start behavior is acceptable
- [ ] Deploy Next.js frontend to Vercel, configure env vars, connect to Neon and Render backend URL
- [ ] Verify Neon connection pooling is configured correctly for serverless (use Neon's pooled connection string on Vercel)
- [ ] Verify R2 CORS settings allow direct client uploads from the Vercel domain
- [ ] End-to-end smoke test: sign up → upload → analysis completes → prior-art results appear → chat works → report downloads

### Phase 11 — Documentation (for course submission)
- [ ] Write architecture documentation explaining the hybrid symbolic (spaCy/rules) + LLM (Groq) approach — this is a good discussion point for the NLP course report
- [ ] Document the free-tier deployment tradeoffs (Render cold starts, corpus size limits, embedding model size)
- [ ] Document each NLP technique used and where it's applied (tokenization, NER, classification, semantic search, summarization, conversational AI, information retrieval) — map directly back to the module list for easy grading alignment

---

## 6. Non-Functional Requirements
- Secure patent management (auth-gated, user-scoped data access — a user should only see their own patents)
- Efficient prior-art retrieval (indexed vector search, not brute-force in application code)
- Graceful degradation: if Groq API fails/rate-limits, show a clear error state rather than breaking the flow
- All free-tier limits (Render cold start, Neon storage cap, R2 free quota, Groq rate limits) should be handled with clear loading/error UI, not silent failures

---

## 7. UI/UX Design Direction

Light-mode-first, precision-lab / technical-editorial aesthetic. Base of soft off-white (#FAFAF8) and warm light gray (#F0EFEA), with a bold signature accent — deep indigo or amber (#4338CA or #D97706) — used sparingly for data highlights, active states, and connective lines. Secondary muted terracotta/sage tone for secondary tags/badges. Typography: technical monospace (JetBrains Mono or Space Mono) for data/scores/IDs, paired with a clean geometric sans (Inter or Sora) for headings/body. Generous whitespace, fine 1px hairline borders instead of heavy shadows.

**Signature visual language:** node-and-connection motif throughout (faint animated connecting lines, softly glowing nodes for similarity matches, line-art network pattern backgrounds) — since the product is literally about finding connections between patents, let that metaphor run through the whole UI.

**Screens required (15):**
1. Landing/Login — animated network background, frosted-glass auth card
2. Sign-up/Onboarding — multi-step form, node-style step indicator
3. Patent Library / My Patents (dashboard home) — grid/list toggle, novelty-score rings, status badges, pill filters
4. Upload screen — drag-and-drop, scanning-beam animation, radial progress ring
5. Patent Analysis view — split-panel, highlighted entities, staggered fade-up data panel
6. Patent Detail / Overview hub — tabbed sub-nav, persistent header with novelty gauge
7. Prior-Art Semantic Search results — radial/orbital layout, similarity-mapped connection lines
8. Innovation Recommendation view — 2D gap map (novelty vs. prior-art density), opportunity zone
9. AI Assistant / Chat panel — slide-in, waveform typing indicator, citation chips
10. Analytics Dashboard — asymmetric bento grid, trend chart, animated radial gauge, count-up tiles
11. Compliance/Risk Detail view — stacked/radial multi-segment chart, expandable explanations
12. Report Preview & Export — live document preview, toggleable sections, export animation
13. Global Search / Cross-Patent Query — command-palette style, grouped results
14. Settings/Profile — account, notifications, API keys
15. Empty/Error/Loading states — node-outline skeletons, faded illustration for empty states, amber for errors

**Micro-interactions:** magnetic hover on buttons (scale + soft shadow lift), smooth cross-fade page transitions with slight vertical drift, radial progress rings instead of flat bars.

**Overall feel:** precise, calm, intelligent — a research tool designed with craft and clarity, not a dashboard template.

---

## 8. Execution Notes for Claude Code
- Stitch-generated HTML and reference images for the screens in Section 7 will be attached separately. Convert these **exactly** into React components — match layout, spacing, colors, typography, and animations as closely as possible rather than reinterpreting the design. Treat the Stitch output as the source of truth for visual design; Section 7 is the intent behind it, the attached HTML/images are the literal spec to match.
- Work phase by phase, in order — don't skip ahead to UI polish before the data pipeline works.
- After each phase, run/verify the relevant piece (e.g., after Phase 2, confirm a file actually lands in R2 and a `patents` row is created) before moving on.
- Keep the FastAPI service and Next.js app in separate deployable units from the start — don't couple them.
- Where a free-tier limit forces a scope reduction (e.g., prior-art corpus size, embedding model size), note the tradeoff in code comments and in Phase 11 documentation rather than silently under-building.
- Prefer rule-based/spaCy approaches for structured extraction (NER, section classification) and reserve Groq calls for tasks that genuinely need reasoning (summarization, gap analysis, risk narrative, chat) — this keeps the app within free API rate limits and gives a defensible "hybrid NLP" story for the course report.
