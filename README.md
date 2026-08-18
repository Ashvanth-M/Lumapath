# LumaPath AI

> GUIDED INSIGHTS. STRONGER FUTURES.

AI-assisted developmental communication screening for children aged 0–6. Parents
record a short standardised interaction at home; the app measures behavioural
signals, maps them onto the Communication Matrix, and produces a clinician-ready
report.

**LumaPath AI is a screening aid, not a diagnostic tool.** Results should be
interpreted by a qualified clinician alongside developmental history and direct
observation.

## Repository layout

```
LumaPath-AI/
├── frontend/     React + TanStack Start app, and the in-browser CV pipeline
├── backend/      FastAPI service — analysis persistence and future ML inference
└── supabase/     Database schema, RLS policies and storage buckets (shared)
```

The two services deploy separately: the frontend to Cloudflare Workers, the
backend to any container host. `supabase/` sits at the root because both sides
depend on the same schema.

## Setting up

### 1. Database

Create a project at [supabase.com](https://supabase.com), then run the
migrations **in order** from the SQL Editor:

```
supabase/migrations/001_schema.sql
supabase/migrations/002_rls.sql
supabase/migrations/003_storage.sql
supabase/migrations/004_nullable_video.sql
```

### 2. Frontend

```bash
cd frontend && npm install
```

Copy `frontend/.env.example` to `frontend/.env.local` and fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.

```bash
npm run dev
```

Runs on `http://localhost:8080`.

### 3. Backend (optional)

The frontend talks to Supabase directly when no backend is configured, so this
is only needed for server-side inference. See [backend/README.md](backend/README.md).

```bash
cd backend && pip install -r requirements.txt
```

```bash
uvicorn app.main:app --reload --port 8000
```

Then set `VITE_BACKEND_URL=http://localhost:8000` in `frontend/.env.local`.

## Where the analysis happens

Video analysis runs **in the browser**, in `frontend/src/services/ai/`. Frames
are sampled to a canvas and measured pixel by pixel — the recording never has to
leave the device. That is a deliberate privacy choice for children's video, and
it caps how large a model can be. Moving heavier inference server-side is what
`backend/` exists for.

## Security model

Two different mechanisms, depending on the path:

- **Browser → Supabase** uses the anon key. Row Level Security means Postgres
  itself refuses to return one family's data to another.
- **Browser → backend → Supabase** uses the service-role key, which **bypasses
  RLS**. The backend verifies the caller's JWT and re-checks child ownership on
  every request. See the security section in `backend/README.md`.

Never prefix a secret with `VITE_` — that prefix inlines the value into the
JavaScript bundle every visitor downloads.

## Built with

**Frontend** — TanStack Start · React 19 · TypeScript · Tailwind CSS · shadcn/ui
· TanStack Query · Zustand · Recharts · jsPDF

**Backend** — FastAPI · Pydantic · Supabase

**Platform** — Supabase (Postgres, Auth, Storage, RLS) · Cloudflare Workers

---

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
