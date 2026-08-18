"""
Request and response shapes for the analysis API.

These mirror the TypeScript types in `src/types/index.ts`. Keep the two in sync —
a mismatch here surfaces as a 422 the frontend cannot explain.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

AgeBandId = Literal["0-6m", "6-12m", "1-2y", "2-3y", "3-4y", "4-6y"]
RiskLevel = Literal["low", "monitor", "elevated"]
ResultSource = Literal["video", "manual", "live"]


class DomainScores(BaseModel):
    eyeContact: float = Field(ge=0, le=100)
    speech: float = Field(ge=0, le=100)
    gesture: float = Field(ge=0, le=100)
    attention: float = Field(ge=0, le=100)
    facialExpression: float = Field(ge=0, le=100)
    auditoryResponse: float = Field(ge=0, le=100)


class TimelineEventIn(BaseModel):
    atSec: float = Field(ge=0)
    label: str
    kind: str
    detail: str = ""


class SaveResultRequest(BaseModel):
    """A completed analysis, ready to persist."""

    childId: str
    ageBandId: AgeBandId
    overallScore: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    riskLevel: RiskLevel
    matrixLevel: int = Field(ge=1, le=7)
    matrixLevelName: str
    responseLatencyMs: float = Field(ge=0)
    faceDetectionRate: float | None = Field(default=None, ge=0, le=1)
    scores: DomainScores
    aiExplanation: str = ""
    observations: list[str] = Field(default_factory=list)
    riskFactors: list[str] = Field(default_factory=list)
    timeline: list[TimelineEventIn] = Field(default_factory=list)
    source: ResultSource = "video"
    activityId: str | None = None
    # Full BehaviourAnalysis blob, stored as jsonb for the replay view.
    analysisData: dict[str, Any] | None = None


class SaveResultResponse(BaseModel):
    resultId: str
    assessmentId: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    supabaseConfigured: bool
    version: str
