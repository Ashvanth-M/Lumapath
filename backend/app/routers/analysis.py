"""Analysis endpoints — persistence today, server-side inference later."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.auth import current_user_id
from app.config import get_settings
from app.schemas.analysis import SaveResultRequest, SaveResultResponse
from app.services import vision
from app.services.persistence import save_analysis_result

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post(
    "/results",
    response_model=SaveResultResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_result(
    payload: SaveResultRequest,
    user_id: str = Depends(current_user_id),
) -> SaveResultResponse:
    """Persist a completed analysis produced by the browser pipeline.

    This is what turns a screening from a browser-session artefact into a record
    the family keeps across devices.
    """
    result_id, assessment_id = save_analysis_result(payload, user_id)
    return SaveResultResponse(resultId=result_id, assessmentId=assessment_id)


@router.post("/video", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def analyse_video(
    file: UploadFile = File(...),
    activity_id: str = Form(...),
    age_band: str = Form(...),
    user_id: str = Depends(current_user_id),
) -> dict:
    """Run vision models over an uploaded interaction video."""
    settings = get_settings()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    body = await file.read(max_bytes + 1)
    if len(body) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video exceeds the {settings.max_upload_mb} MB limit.",
        )
    return vision.analyse_video(body, activity_id, age_band)


@router.post("/audio", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def analyse_audio(
    file: UploadFile = File(...),
    user_id: str = Depends(current_user_id),
) -> dict:
    """Voice-activity segmentation over an uploaded audio track."""
    return vision.analyse_audio(await file.read())
