"""Liveness and configuration check. Unauthenticated on purpose."""

from fastapi import APIRouter

from app.config import get_settings
from app.schemas.analysis import HealthResponse
from app.services import vision

router = APIRouter(tags=["health"])

VERSION = "0.1.0"


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok" if settings.is_configured else "degraded",
        supabaseConfigured=settings.is_configured,
        version=VERSION,
    )


@router.get("/health/models")
def model_status() -> dict[str, bool | str]:
    return {
        "visionReady": vision.is_ready(),
        "note": "Inference is not implemented yet — see app/services/vision.py",
    }
