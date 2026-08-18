"""
Database writes for completed analyses.

**Read this before adding an endpoint.** The client here holds the service-role
key, so Postgres will happily return or modify any row in any table regardless
of who is asking. Row Level Security — the thing that protects one family's data
from another in the browser-direct path — does not apply.

Every function that touches a child's data therefore calls `assert_owns_child`
first. If you add a new query and skip that call, you have created a hole that
lets any signed-in parent read or write any other family's records.
"""

from typing import Any

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.db import get_db
from app.schemas.analysis import SaveResultRequest


def assert_owns_child(child_id: str, user_id: str) -> None:
    """Raise 404 unless `child_id` belongs to `user_id`.

    404 rather than 403 on purpose: a 403 would confirm the child exists, which
    leaks the existence of other families' records to anyone probing ids.
    """
    db = get_db()
    try:
        response = (
            db.table("children")
            .select("id")
            .eq("id", child_id)
            .eq("parent_id", user_id)
            .limit(1)
            .execute()
        )
    except APIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not verify the child profile: {exc.message}",
        ) from exc

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such child profile.",
        )


def save_analysis_result(payload: SaveResultRequest, user_id: str) -> tuple[str, str]:
    """Persist a completed analysis. Returns `(result_id, assessment_id)`."""
    assert_owns_child(payload.childId, user_id)
    db = get_db()

    try:
        assessment = (
            db.table("assessments")
            .insert(
                {
                    "child_id": payload.childId,
                    "age_band": payload.ageBandId,
                    "status": "completed",
                }
            )
            .execute()
        )
        assessment_id = assessment.data[0]["id"]

        result = (
            db.table("analysis_results")
            .insert(
                {
                    "assessment_id": assessment_id,
                    "child_id": payload.childId,
                    "age_band": payload.ageBandId,
                    "overall_score": payload.overallScore,
                    "confidence": payload.confidence,
                    "risk_level": payload.riskLevel,
                    "matrix_level": payload.matrixLevel,
                    "matrix_level_name": payload.matrixLevelName,
                    "response_latency_ms": payload.responseLatencyMs,
                    "face_detection_rate": payload.faceDetectionRate,
                    "eye_contact_score": payload.scores.eyeContact,
                    "speech_score": payload.scores.speech,
                    "gesture_score": payload.scores.gesture,
                    "attention_score": payload.scores.attention,
                    "facial_expression_score": payload.scores.facialExpression,
                    "auditory_response_score": payload.scores.auditoryResponse,
                    "ai_explanation": payload.aiExplanation,
                    "observations": payload.observations,
                    "risk_factors": payload.riskFactors,
                    "analysis_data": payload.analysisData,
                    "source": payload.source,
                }
            )
            .execute()
        )
        result_id = result.data[0]["id"]

        if payload.timeline:
            db.table("timeline_events").insert(
                [
                    {
                        "analysis_result_id": result_id,
                        "timestamp_ms": event.atSec * 1000,
                        "event_type": event.kind,
                        "description": f"{event.label} — {event.detail}".strip(" —"),
                        "confidence": payload.confidence,
                    }
                    for event in payload.timeline
                ]
            ).execute()

        _insert_domain_scores(result_id, payload)
    except APIError as exc:
        # The assessment row may already exist at this point. Left in place
        # deliberately — a partial record is easier to diagnose than a silent
        # rollback, and `status` marks it as incomplete.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not save the analysis: {exc.message}",
        ) from exc

    return result_id, assessment_id


def _insert_domain_scores(result_id: str, payload: SaveResultRequest) -> None:
    rows: list[dict[str, Any]] = [
        {
            "analysis_result_id": result_id,
            "domain": domain,
            "score": score,
            "confidence": payload.confidence,
        }
        for domain, score in payload.scores.model_dump().items()
    ]
    get_db().table("domain_scores").insert(rows).execute()
