"""
LumaPath AI backend.

Run locally:
    cd backend
    uvicorn app.main:app --reload --port 8000

Interactive API docs: http://localhost:8000/docs
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import analysis, health
from app.services import vision

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("lumapath")

settings = get_settings()

app = FastAPI(
    title="LumaPath AI API",
    version="0.1.0",
    description=(
        "Analysis persistence and (in future) server-side vision and audio "
        "inference for the LumaPath developmental screening platform.\n\n"
        "Every endpoint that touches child data requires a Supabase access "
        "token and verifies that the caller owns the child profile."
    ),
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router, prefix="/v1")
app.include_router(analysis.router, prefix="/v1")


@app.on_event("startup")
def on_startup() -> None:
    if not settings.is_configured:
        log.warning(
            "Supabase is not configured. Copy backend/.env.example to "
            "backend/.env — every data endpoint will fail until you do."
        )
    vision.warm_up()
    log.info("LumaPath backend ready on /v1 — docs at /docs")
