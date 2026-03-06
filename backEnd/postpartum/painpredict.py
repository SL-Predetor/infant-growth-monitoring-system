import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt

# -----------------------------------------------------------
# 1. INPUT DATA (MATCHES X_all FORMAT)


input_data = {
    "age": 28,
    "weeks_since_delivery": 6,
    "delivery_type": "vaginal_no_tear",
    "parenting_type": "partner",

    "pain_pattern": "movement",
    "healing_progress": "same",

    "sleep_hours": "6-7hrs",
    "daytime_fatigue_score": 5,
    "baby_sleep_pattern": "3-4hrs",

    "meals_per_day": "3",
    "protein_intake": "adequate",
    "iron_intake": "daily",
    "fluid_intake": "2-3L",
    "fruit_veg_intake": "3+",

    "physical_activity": "15-30mins",
    "feeding_posture": "upright",
    "lifting_posture": "neutral"
}

df_input = pd.DataFrame([input_data])

# Ensure categorical columns are strings
for col in df_input.columns:
    if df_input[col].dtype == "object":
        df_input[col] = df_input[col].astype(str)

# -----------------------------------------------------------
# 2. LOAD SAVED MODELS (PIPELINES)


models = {
    "perineal": joblib.load("models/perineal_RandomForest.joblib"),
    "csection": joblib.load("models/csection_RandomForest.joblib"),
    "back_pelvic": joblib.load("models/back_pelvic_Ridge.joblib")
}

# -----------------------------------------------------------
# 3. PREDICT PAIN SCORES


print("\nPredicted Pain Scores (0–10):\n")

predictions = {}
for pain_type, pipeline in models.items():
    score = pipeline.predict(df_input)[0]
    predictions[pain_type] = score
    print(f"{pain_type.capitalize()} pain: {score:.2f}")

# -----------------------------------------------------------
# 4. STEP 1 – PAIN SCORE → RISK LEVEL


def pain_risk_level(score):
    if score < 2.5:
        return "LOW"
    elif score < 5.5:
        return "MODERATE"
    else:
        return "HIGH"

# -----------------------------------------------------------
# 5. STEP 2 – EXTRACT TOP SHAP FEATURES


def get_top_shap_features(pipeline, X, top_n=3):
    model = pipeline.named_steps["model"]
    preprocessor = pipeline.named_steps["preprocessor"]

    X_trans = preprocessor.transform(X)
    feature_names = preprocessor.get_feature_names_out()

    if "RandomForest" in model.__class__.__name__:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_trans)[0]
    else:
        explainer = shap.LinearExplainer(model, X_trans)
        shap_values = explainer.shap_values(X_trans)[0]

    shap_df = pd.DataFrame({
        "feature": feature_names,
        "impact": shap_values
    })

    shap_df["abs_impact"] = shap_df["impact"].abs()
    return shap_df.sort_values("abs_impact", ascending=False).head(top_n)

# -----------------------------------------------------------
# 6. STEP 3 – FEATURE → HUMAN LABELS


FEATURE_LABELS = {
    "sleep_hours": "Poor sleep",
    "daytime_fatigue_score": "High fatigue",
    "physical_activity": "Low physical activity",
    "feeding_posture": "Poor feeding posture",
    "lifting_posture": "Poor lifting posture",
    "fluid_intake": "Low fluid intake",
    "protein_intake": "Low protein intake",
    "fruit_veg_intake": "Low fruit & vegetable intake"
}

# -----------------------------------------------------------
# 7. STEP 4 – KNOWLEDGE-BASED RECOMMENDATIONS


RECOMMENDATIONS = {
    "sleep_hours": "Aim for short daytime naps and improve nighttime sleep hygiene",
    "daytime_fatigue_score": "Plan rest breaks and reduce prolonged physical strain",
    "physical_activity": "Try gentle postpartum stretching or walking for 10–15 minutes daily",
    "feeding_posture": "Maintain upright posture with back support during feeding",
    "lifting_posture": "Lift the baby with a neutral spine and avoid bending forward",
    "fluid_intake": "Increase fluid intake to 2–3 liters per day (water, soups, herbal drinks)",
    "protein_intake": "Include protein-rich foods like eggs, lentils, yogurt, or fish daily",
    "fruit_veg_intake": "Increase fruit and vegetable intake to support healing"
}

# -----------------------------------------------------------
# 8. STEP 5 – FINAL EXPLAINABLE OUTPUT


def generate_explainable_output(pain_name, score, pipeline, X):
    risk = pain_risk_level(score)
    shap_df = get_top_shap_features(pipeline, X)

    print(f"\n{pain_name.replace('_', ' ').title()} Pain Risk: {risk}\n")
    print("Main contributing factors:")

    guidance = set()

    for _, row in shap_df.iterrows():
        for key in FEATURE_LABELS:
            if key in row["feature"]:
                print(f"• {FEATURE_LABELS[key]} ({row['impact']:+.2f})")
                guidance.add(RECOMMENDATIONS[key])

    print("\nPersonalized Guidance:")
    for g in guidance:
        print("•", g)

    print("\nDisclaimer:")
    print("This guidance supports recovery and does not replace medical advice.")

# -----------------------------------------------------------
# 9. STEP 6 – GENERATE FINAL OUTPUT (BACK/PELVIC)


generate_explainable_output(
    pain_name="back_pelvic",
    score=predictions["back_pelvic"],
    pipeline=models["back_pelvic"],
    X=df_input
)
