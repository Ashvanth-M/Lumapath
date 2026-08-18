# LumaPath AI — Backend

FastAPI service for analysis persistence and, in future, server-side vision and
audio inference.

## Why this exists

The browser pipeline in `src/services/ai/` analyses video on the parent's
device. That is good for privacy but caps what models can run — a phone will not
download 20 MB of weights happily, and Whisper is out of reach entirely.

This service is where heavier inference moves to. Today it does one job well:
persisting completed analyses so a screening survives beyond the browser tab it
was created in.

## Setup

Requires Python 3.11+.

```bash
cd backend
python -m venv .venv
```

Activate it — on Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

Then install and configure:

```bash
pip install -r requirements.txt
```

```bash
cp .env.example .env
```

Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_JWT_SECRET`
from your Supabase dashboard under **Project Settings → API**.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000/v1`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/v1/health`

Set `VITE_BACKEND_URL=http://localhost:8000` in the frontend's `.env.local` so
it knows where to find this.

## Security model — read this

The service-role key **bypasses Row Level Security**. In the browser-direct
path, Postgres itself refuses to return one family's data to another. Here it
will not: the database trusts this service completely.

Authorization is therefore application code:

1. `app/auth.py` verifies the Supabase JWT and extracts the user id.
2. `app/services/persistence.py::assert_owns_child` confirms that user owns the
   child before any read or write.

**Any new endpoint touching child data must call `assert_owns_child`.** Skipping
it lets any signed-in parent reach any other family's records. There is no
second line of defence behind it.

Ownership failures return 404, not 403 — a 403 would confirm the record exists
and leak the existence of other families' data to anyone probing ids.

## Endpoints

| Method | Path | Auth | Status |
|---|---|---|---|
| `GET` | `/v1/health` | none | Working |
| `GET` | `/v1/health/models` | none | Working |
| `POST` | `/v1/analysis/results` | Bearer | Working |
| `POST` | `/v1/analysis/video` | Bearer | 501 — not implemented |
| `POST` | `/v1/analysis/audio` | Bearer | 501 — not implemented |

The two 501s return an explicit "not implemented" rather than plausible
placeholder numbers. A stub that invents scores would flow straight into a
clinical-looking report, which is worse than an honest error.

## Implementing server-side inference

1. Uncomment the ML block in `requirements.txt`.
2. Load models once in `vision.warm_up()`, not per request.
3. Fill in `analyse_video` — decode frames with OpenCV, run MediaPipe
   FaceLandmarker and HandLandmarker, and return the same `BehaviourAnalysis`
   shape the frontend already renders (`src/types/index.ts`).

Keep the Pydantic schemas in `app/schemas/analysis.py` in sync with the
TypeScript types. A mismatch surfaces as a 422 the frontend cannot explain.

## Deployment

The API is stateless, so anything that runs a container works — Fly.io, Render,
Railway, or Cloud Run. Note that the ML dependencies push the image well past
Cloudflare Workers' limits, which is why the frontend and backend deploy
separately.
