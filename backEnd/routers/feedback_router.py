"""
Feedback Router
===============
Stores user feedback (star rating + comment) alongside
the prediction results from the cry-analysis pipeline.

Collection: TinySteps_db.Discomfort
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from postpartum.db import get_feedback_collection

router = APIRouter()


# ── Request schema ──────────────────────────────────────────
class FeedbackRequest(BaseModel):
    predictionResult: str = Field(..., min_length=1, max_length=100)
    audioModelScore: float = Field(..., ge=0, le=1)
    imageModelScore: float = Field(..., ge=0, le=1)
    fusionModelScore: float = Field(..., ge=0, le=1)
    audioModelInputs: Optional[Dict] = None
    imageModelInputs: Optional[Dict] = None
    allClassProbabilities: Optional[Dict[str, float]] = None
    contextInputs: Optional[Dict] = None
    userRating: int = Field(..., ge=1, le=5)
    userComment: Optional[str] = Field(None, max_length=500)


# ── Response schema ─────────────────────────────────────────
class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedbackId: Optional[str] = None


# ── POST /feedback ──────────────────────────────────────────
@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(body: FeedbackRequest):
    collection = get_feedback_collection()
    if collection is None:
        raise HTTPException(
            status_code=503,
            detail="Database is currently unavailable. Please try again later.",
        )

    doc = {
        "predictionResult": body.predictionResult,
        "audioModelScore": body.audioModelScore,
        "imageModelScore": body.imageModelScore,
        "fusionModelScore": body.fusionModelScore,
        "audioModelInputs": body.audioModelInputs or {},
        "imageModelInputs": body.imageModelInputs or {},
        "allClassProbabilities": body.allClassProbabilities or {},
        "contextInputs": body.contextInputs or {},
        "userRating": body.userRating,
        "userComment": (body.userComment or "").strip(),
        "timestamp": datetime.now(timezone.utc),
    }

    try:
        result = collection.insert_one(doc)
        return FeedbackResponse(
            success=True,
            message="Feedback saved successfully",
            feedbackId=str(result.inserted_id),
        )
    except Exception as e:
        print(f"[ERROR] Failed to save feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback")
