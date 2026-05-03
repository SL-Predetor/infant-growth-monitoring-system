from fastapi import APIRouter, HTTPException
from typing import Optional
import numpy as np
import torch
import torch.nn as nn
import joblib
import os
from datetime import date, timedelta, datetime

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ── Supabase ─────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ [Growth] Supabase client connected")
except Exception as e:
    supabase = None
    print(f"⚠️  [Growth] Supabase client not connected: {e}")
    print("   → Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")

# ── Model paths ───────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "mlModels", "Growth")
LSTM_PATH   = os.path.join(MODEL_DIR, "lstm_weight_variantB.pth")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler_variantB.pkl")
RISK_PATH   = os.path.join(MODEL_DIR, "rf_risk_2b.pkl")
XGB_PATH    = os.path.join(MODEL_DIR, "xgb_risk_2a.pkl")
RF_ANOMALY_PATH  = os.path.join(MODEL_DIR, "rf_anomaly_2a.pkl")
XGB_ANOMALY_PATH = os.path.join(MODEL_DIR, "xgb_anomaly_2a.pkl")

# ── LSTM Architecture (must match training exactly) ───────────────────────────
class LSTMForecaster(nn.Module):
    def __init__(self, input_size=21, hidden_size=64,
                 num_layers=1, bidirectional=False):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=bidirectional,
            dropout=0.0
        )
        d = 2 if bidirectional else 1
        self.bn = nn.BatchNorm1d(hidden_size * d)
        self.fc = nn.Linear(hidden_size * d, 2)

    def forward(self, x):
        out, _ = self.lstm(x)
        last = out[:, -1, :]
        last = self.bn(last)
        return self.fc(last)

# ── Variant B feature order (21 features — MUST match training exactly) ───────
VARIANT_B = [
    'F_Breast_Formula', 'F_Solid_Meal', 'F_Nutritious_Snacks',
    'F_Iron_Rich', 'F_Animal_Protein', 'F_Plant_Based', 'F_Junk_Food',
    'Feeding_Frequency', 'Sleep_Hours', 'Age_in_Days', 'Gender',
    'Illness_Day', 'SES_Level', 'Maternal_BMI',
    'Gestational_Age_Weeks', 'Birth_Weight_g',
    'Gestational_Diabetes', 'Maternal_Nutrition_Score',
    'FeedType_breastfed', 'FeedType_formula', 'FeedType_mixed'
]

BINARY_COLS = [
    'Gender', 'Gestational_Diabetes', 'Illness_Day',
    'FeedType_breastfed', 'FeedType_formula', 'FeedType_mixed'
]

# ── Load models at startup ────────────────────────────────────────────────────
lstm_model = None
scaler      = None
risk_model  = None
xgb_model   = None
rf_anomaly_model  = None
xgb_anomaly_model = None

def load_models():
    global lstm_model, scaler, risk_model
    try:
        scaler = joblib.load(SCALER_PATH)
        print("✅ [Growth] Scaler loaded")
    except Exception as e:
        print(f"⚠️  [Growth] Scaler not loaded: {e}")

    try:
        lstm_model = LSTMForecaster(
            input_size=21, hidden_size=64,
            num_layers=1, bidirectional=False
        )
        checkpoint = torch.load(
            LSTM_PATH,
            map_location=torch.device('cpu'),
            weights_only=False
        )
        # Handle both direct state_dict and wrapped checkpoint
        if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
            state = checkpoint['state_dict']
            # Also read architecture from checkpoint to verify
            print(f"  Checkpoint config: hidden={checkpoint.get('hidden_size')}, "
                  f"layers={checkpoint.get('num_layers')}, "
                  f"window={checkpoint.get('window_size')}, "
                  f"features={checkpoint.get('n_features')}")
        else:
            state = checkpoint
        lstm_model.load_state_dict(state)
        lstm_model.eval()
        print("✅ [Growth] LSTM loaded")
    except Exception as e:
        print(f"⚠️  [Growth] LSTM not loaded: {e}")

    try:
        risk_model = joblib.load(RISK_PATH)
        print("✅ [Growth] Risk model loaded")
    except Exception as e:
        print(f"⚠️  [Growth] Risk model not loaded: {e}")

    try:
        global xgb_model
        xgb_model = joblib.load(XGB_PATH)
        print("✅ [Growth] XGBoost 2A loaded")
    except Exception as e:
        print(f"⚠️  [Growth] XGBoost 2A not loaded: {e}")

    global rf_anomaly_model, xgb_anomaly_model
    try:
        rf_anomaly_model = joblib.load(RF_ANOMALY_PATH)
        print("✅ [Growth] RF Anomaly 2A loaded")
    except Exception as e:
        rf_anomaly_model = None
        print(f"⚠️  [Growth] RF Anomaly 2A not loaded: {e}")

    try:
        xgb_anomaly_model = joblib.load(XGB_ANOMALY_PATH)
        print("✅ [Growth] XGB Anomaly 2A loaded")
    except Exception as e:
        xgb_anomaly_model = None
        print(f"⚠️  [Growth] XGB Anomaly 2A not loaded: {e}")

load_models()

# ── WHO 2006 WAZ calculation ──────────────────────────────────────────────────
def calculate_waz(weight_kg: float, age_days: int, gender: str) -> float:
    male_ref = {
        0: 3.346, 30: 4.4, 60: 5.6, 90: 6.4, 120: 7.0,
        150: 7.5, 180: 7.9, 210: 8.3, 240: 8.6, 270: 9.2,
        300: 9.5, 330: 9.8, 365: 10.2
    }
    female_ref = {
        0: 3.232, 30: 4.2, 60: 5.1, 90: 5.8, 120: 6.4,
        150: 6.9, 180: 7.3, 210: 7.7, 240: 8.1, 270: 8.6,
        300: 8.9, 330: 9.2, 365: 9.5
    }
    ref = male_ref if gender.lower() == 'male' else female_ref
    keys = sorted(ref.keys())
    closest = keys[0]
    for k in keys:
        if k <= age_days:
            closest = k
    median = ref[closest]
    sd = median * 0.13
    return round((weight_kg - median) / sd, 3)

# ── Build one feature row from log + infant ───────────────────────────────────
def build_feature_row(log: dict, infant: dict, age_days: int) -> dict:
    feed_type = log.get('feed_type', 'breastfed')
    return {
        'F_Breast_Formula':       log.get('f_breast_formula', 0),
        'F_Solid_Meal':           log.get('f_solid_meal', 0),
        'F_Nutritious_Snacks':    log.get('f_nutritious_snacks', 0),
        'F_Iron_Rich':            log.get('f_iron_rich', 0),
        'F_Animal_Protein':       log.get('f_animal_protein', 0),
        'F_Plant_Based':          log.get('f_plant_based', 0),
        'F_Junk_Food':            log.get('f_junk_food', 0),
        'Feeding_Frequency':      log.get('feeding_frequency', 0),
        'Sleep_Hours':            float(log.get('sleep_hours', 12.0)),
        'Age_in_Days':            age_days,
        'Gender':                 1 if str(infant.get('gender', 'male')).lower() == 'male' else 0,
        'Illness_Day':            1 if log.get('has_illness', False) else 0,
        'SES_Level':              int(infant.get('ses_level', 1)),
        'Maternal_BMI':           float(infant.get('maternal_bmi', 22.0) or 22.0),
        'Gestational_Age_Weeks':  int(infant.get('gestational_age_weeks', 38) or 38),
        'Birth_Weight_g':         float((infant.get('birth_weight_kg', 3.2) or 3.2)) * 1000,
        'Gestational_Diabetes':   1 if infant.get('gestational_diabetes', False) else 0,
        'Maternal_Nutrition_Score': int(infant.get('maternal_nutrition_quality', 1) or 1),
        'FeedType_breastfed':     1 if feed_type == 'breastfed' else 0,
        'FeedType_formula':       1 if feed_type == 'formula' else 0,
        'FeedType_mixed':         1 if feed_type == 'mixed' else 0,
    }

# XGB 2A uses same 31 behavioral features as RF 2B for now.
# When full 39-feature list is confirmed, update VARIANT_B_RISK_XGB.
# Model routing is ready — swap features when spec is confirmed.
VARIANT_B_RISK_XGB = None  # set after VARIANT_B_RISK is defined

# ── Risk model feature order (31 features — MUST match training exactly) ──────
VARIANT_B_RISK = [
    'Age_in_Days', 'Gender_Male',
    'F_Breast_Formula', 'F_Solid_Meal', 'F_Nutritious_Snacks',
    'F_Iron_Rich', 'F_Animal_Protein', 'F_Plant_Based', 'F_Junk_Food',
    'Feeding_Frequency', 'Feeding_Source_Diversity', 'Feeding_Compliance',
    'Daily_Calorie_Intake', 'Sleep_Hours',
    'Illness_Day', 'Recovery_Day', 'Has_Illness_Episode',
    'SES_Level', 'Maternal_BMI', 'Gestational_Diabetes',
    'Maternal_Nutrition_Score', 'Gestational_Age_Weeks', 'Birth_Weight_g',
    'IllType_diarrhoea', 'IllType_fever', 'IllType_none',
    'IllType_persistent', 'IllType_respiratory',
    'FeedType_breastfed', 'FeedType_formula', 'FeedType_mixed'
]

# ── Build one feature row for risk model (31 features) ────────────────────────
def build_risk_feature_row(log: dict, infant: dict,
                            age_days: int) -> dict:
    feed_type = log.get('feed_type', 'breastfed')
    illness_type = (log.get('illness_type') or 'none').lower()
    # normalize illness type values
    if illness_type not in ['diarrhoea','fever','respiratory','persistent']:
        illness_type = 'none'

    ff = float(log.get('feeding_frequency', 0) or 0)

    # Feeding_Source_Diversity: count of non-zero food groups
    food_vals = [
        log.get('f_breast_formula', 0), log.get('f_solid_meal', 0),
        log.get('f_nutritious_snacks', 0), log.get('f_iron_rich', 0),
        log.get('f_animal_protein', 0), log.get('f_plant_based', 0),
        log.get('f_junk_food', 0)
    ]
    diversity = float(sum(1 for v in food_vals if float(v or 0) > 0))

    # Feeding_Compliance: actual feeds / expected (8 per day)
    compliance = min(ff / 8.0, 1.0)

    return {
        'Age_in_Days':              age_days,
        'Gender_Male':              1 if str(infant.get('gender','male')).lower() == 'male' else 0,
        'F_Breast_Formula':         float(log.get('f_breast_formula', 0) or 0),
        'F_Solid_Meal':             float(log.get('f_solid_meal', 0) or 0),
        'F_Nutritious_Snacks':      float(log.get('f_nutritious_snacks', 0) or 0),
        'F_Iron_Rich':              float(log.get('f_iron_rich', 0) or 0),
        'F_Animal_Protein':         float(log.get('f_animal_protein', 0) or 0),
        'F_Plant_Based':            float(log.get('f_plant_based', 0) or 0),
        'F_Junk_Food':              float(log.get('f_junk_food', 0) or 0),
        'Feeding_Frequency':        ff,
        'Feeding_Source_Diversity': diversity,
        'Feeding_Compliance':       compliance,
        'Daily_Calorie_Intake':     float(log.get('daily_calorie_intake', 0) or 0),
        'Sleep_Hours':              float(log.get('sleep_hours', 12.0) or 12.0),
        'Illness_Day':              1 if log.get('has_illness', False) else 0,
        'Recovery_Day':             int(log.get('recovery_day', 0) or 0),
        'Has_Illness_Episode':      1 if log.get('has_illness_episode', False) else 0,
        'SES_Level':                int(infant.get('ses_level', 1) or 1),
        'Maternal_BMI':             float(infant.get('maternal_bmi', 22.0) or 22.0),
        'Gestational_Diabetes':     1 if infant.get('gestational_diabetes', False) else 0,
        'Maternal_Nutrition_Score': float(infant.get('maternal_nutrition_quality', 1) or 1),
        'Gestational_Age_Weeks':    int(infant.get('gestational_age_weeks', 38) or 38),
        'Birth_Weight_g':           float((infant.get('birth_weight_kg', 3.2) or 3.2)) * 1000,
        'IllType_diarrhoea':        1 if illness_type == 'diarrhoea' else 0,
        'IllType_fever':            1 if illness_type == 'fever' else 0,
        'IllType_none':             1 if illness_type == 'none' else 0,
        'IllType_persistent':       1 if illness_type == 'persistent' else 0,
        'IllType_respiratory':      1 if illness_type == 'respiratory' else 0,
        'FeedType_breastfed':       1 if feed_type == 'breastfed' else 0,
        'FeedType_formula':         1 if feed_type == 'formula' else 0,
        'FeedType_mixed':           1 if feed_type == 'mixed' else 0,
    }

# ── Scale features (continuous only, binary stays raw) ───────────────────────
def scale_features(matrix: np.ndarray) -> np.ndarray:
    if scaler is None:
        return matrix
    binary_idx = [VARIANT_B.index(c) for c in BINARY_COLS if c in VARIANT_B]
    cont_idx   = [i for i in range(len(VARIANT_B)) if i not in binary_idx]
    scaled = matrix.copy().astype(float)
    scaled[:, cont_idx] = scaler.transform(matrix[:, cont_idx])
    return scaled

# ── Pad window to 7 days ──────────────────────────────────────────────────────
def pad_window(rows: list, window: int = 7) -> list:
    if len(rows) >= window:
        return rows[-window:]
    padding = [rows[0]] * (window - len(rows))
    return padding + rows

# ── Run LSTM ──────────────────────────────────────────────────────────────────
def run_lstm(feature_rows: list) -> dict:
    if lstm_model is None or scaler is None:
        return {
            "predicted_weight_change_g": 14.5,
            "predicted_height_change_cm": 0.11,
            "stub": True
        }
    try:
        matrix = np.array(
            [[row[f] for f in VARIANT_B] for row in feature_rows],
            dtype=float
        )
        scaled = scale_features(matrix)
        tensor = torch.FloatTensor(scaled).unsqueeze(0)
        with torch.no_grad():
            output = lstm_model(tensor)
        return {
            "predicted_weight_change_g": round(float(output[0][0]), 2),
            "predicted_height_change_cm": round(float(output[0][1]), 4),
            "stub": False
        }
    except Exception as e:
        print(f"LSTM error: {e}")
        return {
            "predicted_weight_change_g": 14.5,
            "predicted_height_change_cm": 0.11,
            "stub": True,
            "error": str(e)
        }

# ── Run risk model ────────────────────────────────────────────────────────────
def run_risk(feature_row: dict) -> dict:
    if risk_model is None:
        return {"risk_score": 0.15, "stub": True}
    try:
        X = np.array(
            [[feature_row[f] for f in VARIANT_B_RISK]],
            dtype=float
        )
        prob = float(risk_model.predict_proba(X)[0][1])
        return {"risk_score": round(prob, 4), "stub": False}
    except Exception as e:
        print(f"Risk model error: {e}")
        import traceback; traceback.print_exc()
        return {"risk_score": 0.15, "stub": True, "error": str(e)}

# Set XGB feature alias now that VARIANT_B_RISK is defined
VARIANT_B_RISK_XGB = VARIANT_B_RISK  # same 31 for now

def run_xgb_risk(feature_row: dict) -> dict:
    """Use XGBoost 2A when weight measurement is available.
    Falls back to RF 2B if XGB not loaded."""
    if xgb_model is None:
        print("XGB not loaded, falling back to RF 2B")
        return run_risk(feature_row)
    try:
        X = np.array(
            [[feature_row[f] for f in VARIANT_B_RISK_XGB]],
            dtype=float
        )
        prob = float(xgb_model.predict_proba(X)[0][1])
        return {
            "risk_score": round(prob, 4),
            "stub": False,
            "model_used": "xgb_2a"
        }
    except Exception as e:
        print(f"XGB error: {e}, falling back to RF 2B")
        result = run_risk(feature_row)
        result['model_used'] = 'rf_2b_fallback'
        return result

# ── Rule engine ───────────────────────────────────────────────────────────────

def run_rule_engine(
    current_waz: float,
    predicted_weight_change_g: float,
    current_weight_kg: float,
    age_days: int,
    gender: str,
    personal_baseline_waz: Optional[float] = None
) -> dict:
    daily_change_kg = predicted_weight_change_g / 1000
    predicted_weight_7d = current_weight_kg + (daily_change_kg * 7)
    predicted_waz_7d = calculate_waz(predicted_weight_7d, age_days + 7, gender)
    waz_drop = current_waz - predicted_waz_7d

    # Trigger 1: WHO threshold
    trigger1 = predicted_waz_7d < -2.0

    # Trigger 2: velocity faltering
    trigger2 = (current_waz > -1.5) and (waz_drop > 0.7)

    # Trigger 3: personal baseline deviation
    trigger3 = False
    # Skip baseline deviation check for first 30 days
    if age_days <= 30:
        pass  # too early for personal baseline
    else:
        if personal_baseline_waz is not None:
            trigger3 = current_waz < (personal_baseline_waz - 1.0)

    alert_fired = trigger1 or trigger2 or trigger3

    if trigger1 and trigger2:
        trigger_type = "both"
        message = "Your baby's weight is predicted to fall below the healthy range and growth is faltering."
        recommendation = "Please visit a healthcare provider within 3 days."
    elif trigger1:
        trigger_type = "threshold"
        message = "Your baby's weight is predicted to fall below the healthy range in the next 7 days."
        recommendation = "Please visit a healthcare provider within 3 days."
    elif trigger2:
        trigger_type = "velocity_faltering"
        message = "Your baby's weight gain has slowed significantly this week."
        recommendation = "Monitor feedings closely and consult your health worker."
    elif trigger3:
        trigger_type = "baseline_deviation"
        message = "Your baby's growth has dropped below their personal baseline pattern."
        recommendation = "Check feeding frequency and consult your health worker if concerned."
    else:
        trigger_type = "none"
        message = "Baby's growth is on track."
        recommendation = ""

    return {
        "alert_fired": alert_fired,
        "trigger_type": trigger_type,
        "current_waz": round(current_waz, 3),
        "predicted_waz_7day": round(predicted_waz_7d, 3),
        "waz_drop": round(waz_drop, 3),
        "alert_message": message,
        "recommendation": recommendation
    }

# ── Personal WAZ baseline ─────────────────────────────────────────────────────
def calc_personal_baseline(
    measurements: list, dob_str: str, gender: str
) -> Optional[float]:
    if not measurements or len(measurements) < 2:
        return None
    dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
    first7 = measurements[:7]
    waz_vals = []
    for m in first7:
        if not m.get('weight_g'):
            continue
        mdate = datetime.strptime(m['measured_date'], '%Y-%m-%d').date()
        age_d = (mdate - dob).days
        waz = calculate_waz(float(m['weight_g']) / 1000, age_d, gender)
        waz_vals.append(waz)
    if not waz_vals:
        return None
    return round(sum(waz_vals) / len(waz_vals), 3)

# ═════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/growth/status")
def growth_status():
    return {
        "lstm_loaded":       lstm_model is not None,
        "scaler_loaded":     scaler is not None,
        "risk_rf_loaded":    risk_model is not None,
        "risk_xgb_loaded":   xgb_model is not None,
        "mode": "live" if lstm_model is not None else "stub"
    }


@router.get("/growth/dashboard/{infant_id}")
def get_dashboard(infant_id: str):
    try:
        # 1. Infant profile
        r = supabase.table('infants').select('*').eq('id', infant_id).single().execute()
        if not r.data:
            raise HTTPException(404, "Infant not found")
        infant = r.data

        # 2. Age in days
        dob = datetime.strptime(infant['date_of_birth'], '%Y-%m-%d').date()
        age_days = (date.today() - dob).days

        # 3. Last 7 daily logs
        logs_r = supabase.table('daily_logs').select('*')\
            .eq('infant_id', infant_id)\
            .order('log_date', desc=False)\
            .limit(50).execute()
        all_logs = logs_r.data or []
        last7    = all_logs[-7:] if len(all_logs) >= 7 else all_logs
        log_count = len(all_logs)

        # 4. Measurements (ascending for chart + baseline)
        meas_r = supabase.table('measurements').select('*')\
            .eq('infant_id', infant_id)\
            .order('measured_date', desc=False)\
            .limit(30).execute()
        measurements = meas_r.data or []
        latest_meas  = measurements[-1] if measurements else None

        # 5. WAZ
        current_waz = None
        if latest_meas and latest_meas.get('weight_g'):
            current_waz = calculate_waz(
                float(latest_meas['weight_g']) / 1000,
                age_days,
                infant.get('gender', 'male')
            )

        # 6. Personal baseline
        personal_baseline = calc_personal_baseline(
            measurements,
            infant['date_of_birth'],
            infant.get('gender', 'male')
        )

        # 7. LSTM + risk + alerts
        lstm_result  = None
        risk_result  = None
        alert_result = None

        if log_count >= 7:
            feature_rows = []
            for log in last7:
                log_date = datetime.strptime(log['log_date'], '%Y-%m-%d').date()
                log_age  = (log_date - dob).days
                feature_rows.append(build_feature_row(log, infant, log_age))

            padded      = pad_window(feature_rows, 7)
            lstm_result = run_lstm(padded)
            risk_feature = build_risk_feature_row(
                last7[-1], infant,
                (datetime.strptime(last7[-1]['log_date'], '%Y-%m-%d').date() - dob).days
            )
            # Route to XGBoost 2A if weight measured within last 14 days
            weight_available = (
                latest_meas is not None and
                latest_meas.get('weight_g') is not None and
                (date.today() - datetime.strptime(
                    latest_meas['measured_date'], '%Y-%m-%d'
                ).date()).days <= 14
            )

            if weight_available and xgb_model is not None:
                risk_result = run_xgb_risk(risk_feature)
                risk_result['model_used'] = 'xgb_2a'
                print(f"  Using XGBoost 2A (weight available, {(date.today() - datetime.strptime(latest_meas['measured_date'], '%Y-%m-%d').date()).days} days ago)")
            else:
                risk_result = run_risk(risk_feature)
                risk_result['model_used'] = 'rf_2b'
                print(f"  Using RF 2B (no recent weight measurement)")

            if current_waz is not None and latest_meas:
                alert_result = run_rule_engine(
                    current_waz,
                    lstm_result['predicted_weight_change_g'],
                    float(latest_meas['weight_g']) / 1000,
                    age_days,
                    infant.get('gender', 'male'),
                    personal_baseline
                )

                # Save alert to DB if fired
                if alert_result['alert_fired']:
                    try:
                        supabase.table('growth_alerts').insert({
                            'infant_id':    infant_id,
                            'alert_date':   date.today().isoformat(),
                            'alert_type':   alert_result['trigger_type'],
                            'message':      alert_result['alert_message'],
                            'recommendation': alert_result['recommendation'],
                            'risk_score':   risk_result.get('risk_score'),
                            'is_read':      False
                        }).execute()
                    except Exception as alert_err:
                        print(f"  [growth] growth_alerts insert skipped: {alert_err}")

        # 8. Risk level label
        rs = risk_result['risk_score'] if risk_result else None
        risk_level = (
            "Low"     if rs is not None and rs < 0.30 else
            "Medium"  if rs is not None and rs < 0.60 else
            "High"    if rs is not None else
            "unknown"
        )

        return {
            "baby_name":          infant.get('name'),
            "age_days":           age_days,
            "log_count":          log_count,
            "logs_needed":        max(0, 7 - log_count),
            "ai_ready":           log_count >= 7,
            "current_waz":        current_waz,
            "waz_color": (
                "green"  if current_waz and current_waz > -1  else
                "yellow" if current_waz and current_waz > -2  else
                "red"    if current_waz is not None            else
                "grey"
            ),
            "latest_weight_g":    float(latest_meas['weight_g']) if latest_meas else None,
            "latest_height_cm":   float(latest_meas['height_cm']) if latest_meas and latest_meas.get('height_cm') else None,
            "chart_data":         measurements,
            "personal_baseline":  personal_baseline,
            "prediction":         lstm_result,
            "risk_score":         rs,
            "risk_level":         risk_level,
            "alert":              alert_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, str(e))


@router.get("/growth/history/{infant_id}")
def get_history(infant_id: str, days: int = 30):
    try:
        since = (date.today() - timedelta(days=days)).isoformat()
        r = supabase.table('daily_logs').select('*')\
            .eq('infant_id', infant_id)\
            .gte('log_date', since)\
            .order('log_date', desc=True).execute()
        return {
            "logs":  r.data or [],
            "count": len(r.data or [])
        }
    except Exception as e:
        raise HTTPException(500, str(e))

# ── Anomaly scoring (40-feature models) ──────────────────────────────────────
from pydantic import BaseModel

class AnomalyScoreRequest(BaseModel):
    age_in_days: int = 0
    weight_g: float = 3500.0
    height_cm: float = 50.0
    bmi: Optional[float] = None
    waz_score: float = 0.0
    illness_day: int = 0
    recovery_day: int = 0
    has_illness_episode: int = 0
    weight_velocity: float = 0.0
    weight_trend_3day: float = 0.0
    height_velocity: float = 0.0
    height_trend_3day: float = 0.0
    sleep_hours: float = 16.0
    feeding_frequency: int = 8
    feeding_compliance: float = 1.0
    daily_calorie_intake: float = 0.0
    calories_burned: float = 0.0
    appetite_factor: float = 1.0
    gestational_diabetes: int = 0
    maternal_bmi: float = 22.0
    maternal_nutrition_score: float = 3.0
    ses_level: int = 2
    daily_feeding_deviation: float = 0.0
    cumulative_feeding_deviation: float = 0.0
    f_solid_meal: float = 0.0
    f_nutritious_snacks: float = 0.0
    f_iron_rich: float = 0.0
    f_animal_protein: float = 0.0
    f_plant_based: float = 0.0
    f_junk_food: float = 0.0
    feeding_source_diversity: float = 0.0
    solids_onset_day: int = 0
    recalled_calorie_intake: float = 0.0
    metabolic_efficiency: float = 1.0
    underweight_flag: int = 0
    severe_underweight_flag: int = 0
    unexplained_growth_residual: float = 0.0


@router.post("/growth/anomaly-score")
def anomaly_score(req: AnomalyScoreRequest):
    if rf_anomaly_model is None:
        raise HTTPException(503, "Anomaly model not available")

    bmi = req.bmi if req.bmi else req.weight_g / ((req.height_cm / 100) ** 2)
    net_energy = req.daily_calorie_intake - req.calories_burned

    features = np.array([[
        req.f_solid_meal, req.f_nutritious_snacks, req.f_iron_rich,
        req.f_animal_protein, req.f_plant_based, req.f_junk_food,
        req.feeding_frequency, req.feeding_source_diversity, req.feeding_compliance,
        req.weight_g, req.height_cm,
        req.weight_g, req.height_cm,          # Weight_Clean_g, Height_Clean_cm
        bmi,
        req.daily_calorie_intake, req.recalled_calorie_intake,
        req.sleep_hours, req.calories_burned, net_energy,
        req.solids_onset_day, req.appetite_factor, req.metabolic_efficiency,
        req.ses_level, req.maternal_bmi, req.gestational_diabetes,
        req.maternal_nutrition_score,
        req.waz_score, req.underweight_flag, req.severe_underweight_flag,
        req.illness_day, req.recovery_day, req.has_illness_episode,
        req.unexplained_growth_residual,
        req.weight_velocity, req.height_velocity,
        req.weight_trend_3day, req.height_trend_3day,
        req.daily_feeding_deviation, req.cumulative_feeding_deviation,
        req.age_in_days
    ]], dtype=float)

    features = np.nan_to_num(features, nan=0.0)

    rf_score = float(rf_anomaly_model.predict_proba(features)[0][1])

    if xgb_anomaly_model is not None:
        xgb_score = float(xgb_anomaly_model.predict_proba(features)[0][1])
    else:
        xgb_score = rf_score

    ensemble = (rf_score + xgb_score) / 2
    confidence = "high" if abs(rf_score - xgb_score) < 0.15 else "low"

    if ensemble < 0.35:
        label, message = "normal", "All clear"
    elif ensemble < 0.50:
        label, message = "monitoring", "Monitoring — borderline signal"
    elif ensemble < 0.65:
        label, message = "anomaly", "Acute episode detected"
    else:
        label, message = "critical", "Critical — consult a doctor immediately"

    return {
        "rf_anomaly_score":       round(rf_score, 4),
        "xgb_anomaly_score":      round(xgb_score, 4),
        "ensemble_anomaly_score": round(ensemble, 4),
        "confidence":             confidence,
        "anomaly_label":          label,
        "recovery_signal":        req.recovery_day > 0 and ensemble < 0.35,
        "gdm_sensitive":          req.gestational_diabetes == 1,
        "alert_message":          message
    }
