"""
Server-side vision inference.

Nothing is implemented yet — this is the seam the whole backend exists for. The
browser pipeline in `src/services/ai/behaviourAnalysis.service.ts` currently
does the analysis on the parent's device; moving it here lets real models run
without shipping ~20 MB of weights to a phone.

Endpoints call into this module and get a clear 501 until a model lands. That is
deliberate: returning plausible-looking numbers from a stub would be worse than
returning nothing, because the result would flow into a clinical-looking report.

To implement:
  1. Uncomment the ML block in requirements.txt.
  2. Load models once at startup, not per request — see `warm_up()`.
  3. Decode frames with OpenCV, run MediaPipe FaceLandmarker / HandLandmarker,
     and return the same BehaviourAnalysis shape the frontend already renders.
"""

from fastapi import HTTPException, status

_MODELS_LOADED = False


def warm_up() -> None:
    """Load models into memory at startup. No-op until inference is wired up."""
    global _MODELS_LOADED
    _MODELS_LOADED = False


def is_ready() -> bool:
    return _MODELS_LOADED


def analyse_video(video_bytes: bytes, activity_id: str, age_band: str) -> dict:
    """Extract behavioural features from an uploaded interaction video."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "Server-side video analysis is not implemented yet. The browser "
            "pipeline currently produces the analysis; POST the finished result "
            "to /v1/analysis/results instead."
        ),
    )


def analyse_audio(audio_bytes: bytes) -> dict:
    """Voice-activity segmentation and vocalisation counts."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Server-side audio analysis is not implemented yet.",
    )
