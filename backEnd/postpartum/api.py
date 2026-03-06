from fastapi import APIRouter
from fastapi import HTTPException
from fastapi import Query
from pydantic import BaseModel
import pandas as pd
import joblib
import shap
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from .db import get_postpartum_collection, is_postpartum_db_connected

# A router that will be included by the main application
router = APIRouter(prefix="/postpartum", tags=["Postpartum"])

# CORS is configured globally in app.py; routers do not support middleware.
# The earlier standalone app had this configuration, so it's omitted here.

# Load models from a subdirectory relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

try:
    models = {
        "perineal": joblib.load(os.path.join(MODEL_DIR, "perineal_RandomForest.joblib")),
        "csection": joblib.load(os.path.join(MODEL_DIR, "csection_RandomForest.joblib")),
        "back_pelvic": joblib.load(os.path.join(MODEL_DIR, "back_pelvic_Ridge.joblib")),
    }
    print("✅ Postpartum models loaded")
except Exception as e:
    print(f"Warning: Could not load models: {e}")
    models = {}

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "models_loaded": len(models) > 0,
        "db_connected": is_postpartum_db_connected(),
    }


# -------------------------------
# Input schema
# -------------------------------
class MotherInput(BaseModel):
    age: int
    weeks_since_delivery: int
    delivery_type: str
    parenting_type: str
    pain_pattern: str
    healing_progress: str
    sleep_hours: str
    daytime_fatigue_score: int
    baby_sleep_pattern: str
    meals_per_day: str
    protein_intake: str
    iron_intake: str
    fluid_intake: str
    fruit_veg_intake: str
    physical_activity: str
    feeding_posture: str
    lifting_posture: str


# -------------------------------
# Utility functions
# -------------------------------
def pain_risk(score):
    if score < 2.5:
        return "LOW"
    elif score < 5.5:
        return "MODERATE"
    else:
        return "HIGH"
    

def generate_guidance_from_shap(top_features, input_dict):
    guidance = []

    for feature, value in top_features:
        if "sleep_hours_<3hrs" in feature:
            guidance.append(
                "Very short sleep duration detected — improve sleep hygiene and nap when possible"
            )

        if "daytime_fatigue_score" in feature:
            fatigue = input_dict["daytime_fatigue_score"]
            if fatigue >= 7:
                guidance.append(
                    "High fatigue detected, plan frequent rest breaks and seek support"
                )
            elif fatigue >= 4:
                guidance.append(
                    "Moderate fatigue detected, prioritize short rest periods"
                )
            else:
                guidance.append(
                    "Fatigue levels are acceptable, maintain current rest routine"
                )

        if "physical_activity_none" in feature or "physical_activity_<15mins" in feature:
            guidance.append(
                "Introduce gentle postpartum activity (10–15 minutes daily)"
            )

        if "feeding_posture" in feature:
            guidance.append(
                "Maintain upright posture during feeding to reduce back strain"
            )

        if "fluid_intake_<1L" in feature:
            guidance.append(
                "Increase fluid intake to at least 2–3 liters per day"
            )
        if input_dict["weeks_since_delivery"] < 6:
            guidance.append(
            "Early postpartum period. Allow additional recovery time and avoid strain"
        )
        if "protein_intake_rare" in feature:
            guidance.append(
                "Increase protein intake to support tissue healing and recovery"
            )

    # Remove duplicates
    return list(set(guidance))


def generate_baseline_guidance(input_dict):
    guidance = []

    # Nutrition
    if input_dict["protein_intake"] in ["rare", "sometimes"]:
        guidance.append("Ensure adequate protein intake to support tissue healing")

    if input_dict["iron_intake"] != "daily":
        guidance.append("Improve iron intake to prevent postpartum fatigue")

    if input_dict["fluid_intake"] in ["<1L", "1-2L"]:
        guidance.append("Increase fluid intake to maintain hydration and recovery")

    if input_dict["fruit_veg_intake"] in ["<1", "1-2times"]:
        guidance.append("Increase fruit and vegetable intake for micronutrient support")

    # Activity & posture
    if input_dict["physical_activity"] in ["none", "<15mins"]:
        guidance.append("Gradually introduce light physical activity as tolerated")

    if input_dict["lifting_posture"] != "neutral":
        guidance.append("Use neutral lifting posture to reduce back and pelvic strain")

    if input_dict["feeding_posture"] != "upright":
        guidance.append("Adopt upright feeding posture to minimize musculoskeletal pain")

    return guidance


# -------------------------------
# Prediction endpoint
# -------------------------------
@router.post("/predict")
def predict(data: MotherInput):
    if not models or "back_pelvic" not in models:
        raise HTTPException(status_code=503, detail="Postpartum models are not available on server")

    input_dict = data.dict()
    df = pd.DataFrame([input_dict])

    # -------------------------
    # 1. Predict pain scores
    # -------------------------
    predictions = {}
    for pain, pipeline in models.items():
        score = pipeline.predict(df)[0]
        predictions[pain] = {
            "score": round(score, 2),
            "risk": pain_risk(score)
        }

    # -------------------------
    # 2. SHAP explainability (Back/Pelvic model)
    # -------------------------
    pipeline = models["back_pelvic"]
    model = pipeline.named_steps["model"]
    preprocessor = pipeline.named_steps["preprocessor"]

    X_trans = preprocessor.transform(df)
    feature_names = preprocessor.get_feature_names_out()

    explainer = shap.LinearExplainer(model, X_trans)
    shap_values = explainer.shap_values(X_trans)[0]

    shap_df = pd.DataFrame({
        "feature": feature_names,
        "value": shap_values
    })

    # Top 3 positive contributors
    top_features = (
        shap_df.sort_values("value", ascending=False)
        .head(3)[["feature", "value"]]
        .values.tolist()
    )

    guidance = generate_guidance_from_shap(top_features, input_dict)
    baseline_guidance = generate_baseline_guidance(input_dict)

    guidance = list(set(guidance + baseline_guidance))
    created_at = datetime.now(timezone.utc)
    record = {
        "created_at": created_at,
        "input": input_dict,
        "predictions": predictions,
        "top_factors": [f[0] for f in top_features],
        "guidance": {
            "model_based": guidance,
            "general_care": baseline_guidance
        },
    }

    collection = get_postpartum_collection()
    if collection is not None:
        try:
            collection.insert_one(record)
        except Exception as e:
            print(f"Warning: Could not save postpartum prediction: {e}")

    # -------------------------
    # 3. Return full response
    # -------------------------
    return {
        "predictions": predictions,
        "top_factors": [f[0] for f in top_features],
        "guidance": {
            "model_based": guidance,
            "general_care": baseline_guidance
        },
        "created_at": created_at.isoformat(),
    }


def _serialize_record(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc.get("_id")),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "input": doc.get("input", {}),
        "predictions": doc.get("predictions", {}),
        "top_factors": doc.get("top_factors", []),
        "guidance": doc.get("guidance", {}),
    }


@router.get("/history")
def get_history(limit: int = Query(default=20, ge=1, le=100)):
    collection = get_postpartum_collection()
    if collection is None:
        return []

    try:
        docs = (
            collection.find({}, {"input": 1, "predictions": 1, "top_factors": 1, "guidance": 1, "created_at": 1})
            .sort("created_at", -1)
            .limit(limit)
        )
        return [_serialize_record(doc) for doc in docs]
    except Exception as e:
        print(f"Warning: Could not fetch postpartum history: {e}")
        return []


@router.get("/dashboard")
def get_dashboard(days: int = Query(default=30, ge=7, le=365)):
    collection = get_postpartum_collection()
    if collection is None:
        return {
            "total_records": 0,
            "period_days": days,
            "avg_scores": {"perineal": 0, "csection": 0, "back_pelvic": 0},
            "risk_distribution": {"LOW": 0, "MODERATE": 0, "HIGH": 0},
            "trend": [],
        }

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    try:
        docs = list(
            collection.find(
                {"created_at": {"$gte": since}},
                {"created_at": 1, "predictions": 1},
            ).sort("created_at", 1)
        )
    except Exception as e:
        print(f"Warning: Could not fetch dashboard data: {e}")
        return {
            "total_records": 0,
            "period_days": days,
            "avg_scores": {"perineal": 0, "csection": 0, "back_pelvic": 0},
            "risk_distribution": {"LOW": 0, "MODERATE": 0, "HIGH": 0},
            "trend": [],
        }

    score_sum = {"perineal": 0.0, "csection": 0.0, "back_pelvic": 0.0}
    score_count = {"perineal": 0, "csection": 0, "back_pelvic": 0}
    risk_distribution = {"LOW": 0, "MODERATE": 0, "HIGH": 0}
    trend_map: Dict[str, int] = {}

    for doc in docs:
        created_at = doc.get("created_at")
        if created_at:
            key = created_at.date().isoformat()
            trend_map[key] = trend_map.get(key, 0) + 1

        predictions = doc.get("predictions", {})
        for pain_key in ["perineal", "csection", "back_pelvic"]:
            entry = predictions.get(pain_key)
            if entry and isinstance(entry.get("score"), (int, float)):
                score_sum[pain_key] += float(entry["score"])
                score_count[pain_key] += 1
            risk = entry.get("risk") if isinstance(entry, dict) else None
            if isinstance(risk, str) and risk in risk_distribution:
                risk_distribution[risk] += 1

    avg_scores = {}
    for pain_key in ["perineal", "csection", "back_pelvic"]:
        if score_count[pain_key] == 0:
            avg_scores[pain_key] = 0
        else:
            avg_scores[pain_key] = round(score_sum[pain_key] / score_count[pain_key], 2)

    trend = [{"date": day, "count": trend_map[day]} for day in sorted(trend_map.keys())]

    return {
        "total_records": len(docs),
        "period_days": days,
        "avg_scores": avg_scores,
        "risk_distribution": risk_distribution,
        "trend": trend,
    }


@router.delete("/history")
def clear_history():
    collection = get_postpartum_collection()
    if collection is None:
        return {"message": "MongoDB not configured for postpartum"}

    try:
        result = collection.delete_many({})
        return {"message": "History cleared", "deleted_count": result.deleted_count}
    except Exception as e:
        print(f"Warning: Could not clear postpartum history: {e}")
        return {"message": "Failed to clear history", "deleted_count": 0}
