"""
Verify 6 growth model files against expected values from GROWTH_COMPONENT_OVERVIEW.md §6.1-6.2.
Read-only inspection — no model files are modified.
"""

import os, sys, io
from pathlib import Path

# Force UTF-8 output on Windows (avoids cp1252 emoji crash)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent
GROWTH = ROOT / "mlModels" / "Growth"

EXPECTED = {
    "lstm_weight_variantB.pth": {
        "hidden_size": 64, "num_layers": 1, "input_size": 21, "output_size": 2,
        "desc": "PyTorch LSTM Config3 — hidden=64, 1L, input=21, output=2",
    },
    "scaler_variantB.pkl": {
        "n_features_in_": 15,
        "desc": "StandardScaler — 15 continuous Variant B features",
    },
    "rf_risk_2b.pkl": {
        "n_features_in_": 31,
        "desc": "RF RiskClassifier — Scenario 2B, 31 features",
    },
    "xgb_risk_2a.pkl": {
        "num_features": 40,
        "desc": "XGBoost RiskClassifier — Scenario 2A, 40 features",
    },
    "rf_anomaly_2a.pkl": {
        "n_features_in_": 40,
        "desc": "RF AnomalyClassifier — Scenario 2A, 40 features",
    },
    "xgb_anomaly_2a.pkl": {
        "num_features": 40,
        "desc": "XGBoost AnomalyClassifier — Scenario 2A, 40 features",
    },
}

results = []  # (filename, status, reason)

# ── 1. LSTM ──────────────────────────────────────────────────────────────────
fname = "lstm_weight_variantB.pth"
fpath = GROWTH / fname
print(f"\n{'='*60}")
print(f"FILE: {fname}  ({fpath.stat().st_size/1024:.1f} KB)")
try:
    import torch
    # weights_only=False needed: checkpoint contains Python objects (strings, lists), not just tensors
    ckpt = torch.load(fpath, map_location="cpu", weights_only=False)
    top_keys = list(ckpt.keys())
    print(f"  checkpoint top-level keys: {top_keys}")

    # The .pth is a checkpoint dict, not a raw state_dict.
    # Architecture params stored directly as metadata.
    hidden_size    = ckpt.get("hidden_size")
    num_lstm_layers= ckpt.get("num_layers")
    input_size     = ckpt.get("n_features")   # 'n_features' == input feature count
    config_name    = ckpt.get("config_name", "")
    feature_cols   = ckpt.get("feature_cols", [])
    target_cols    = ckpt.get("target_cols", [])
    output_size    = len(target_cols) if target_cols else None

    # Cross-check via nested state_dict tensor shapes if metadata missing
    inner_sd = ckpt.get("state_dict", {})
    if inner_sd:
        inner_keys = list(inner_sd.keys())
        print(f"  inner state_dict keys ({len(inner_keys)}): {inner_keys}")
        for k, v in inner_sd.items():
            if "weight_ih_l0" in k and hidden_size is None:
                hidden_size = v.shape[0] // 4
                input_size  = v.shape[1]
            if hidden_size is not None:
                n_l = len([kk for kk in inner_keys if "weight_ih_l" in kk])
                if num_lstm_layers is None:
                    num_lstm_layers = n_l
            if ("fc" in k.lower() or "linear" in k.lower()) and "weight" in k and output_size is None:
                output_size = v.shape[0]

    print(f"  config_name : {config_name}")
    print(f"  hidden_size : {hidden_size}   (expected 64)")
    print(f"  num_layers  : {num_lstm_layers}   (expected 1)")
    print(f"  n_features  : {input_size}  (expected 21)")
    print(f"  target_cols : {target_cols}  → output_size={output_size} (expected 2)")
    print(f"  feature_cols({len(feature_cols)}): {feature_cols[:5]}...")

    exp = EXPECTED[fname]
    checks = [
        ("hidden_size",  hidden_size,       exp["hidden_size"]),
        ("num_layers",   num_lstm_layers,   exp["num_layers"]),
        ("input_size",   input_size,        exp["input_size"]),
        ("output_size",  output_size,       exp["output_size"]),
    ]
    failures = [(name, actual, expected) for name, actual, expected in checks if actual != expected]
    if failures:
        detail = "; ".join(f"{n}: expected {e}, got {a}" for n, a, e in failures)
        results.append((fname, "FAIL", detail))
    else:
        results.append((fname, "PASS", exp["desc"]))

except Exception as exc:
    results.append((fname, "ERROR", str(exc)))
    print(f"  ERROR: {exc}")

# ── 2. Scaler ─────────────────────────────────────────────────────────────────
fname = "scaler_variantB.pkl"
fpath = GROWTH / fname
print(f"\n{'='*60}")
print(f"FILE: {fname}  ({fpath.stat().st_size/1024:.1f} KB)")
try:
    import joblib
    scaler = joblib.load(fpath)
    n_feat = getattr(scaler, "n_features_in_", None)
    scale_ = getattr(scaler, "scale_", None)
    feat_names = getattr(scaler, "feature_names_in_", None)
    print(f"  type: {type(scaler).__name__}")
    print(f"  n_features_in_: {n_feat}")
    print(f"  scale_ shape: {scale_.shape if scale_ is not None else 'N/A'}")
    if feat_names is not None:
        print(f"  feature_names_in_: {list(feat_names)}")

    exp_feat = EXPECTED[fname]["n_features_in_"]
    if n_feat == exp_feat:
        results.append((fname, "PASS", EXPECTED[fname]["desc"]))
    else:
        results.append((fname, "FAIL", f"n_features_in_: expected {exp_feat}, got {n_feat}"))

except Exception as exc:
    results.append((fname, "ERROR", str(exc)))
    print(f"  ERROR: {exc}")

# ── 3 & 4. RF / XGB models ───────────────────────────────────────────────────
sklearn_files = [
    ("rf_risk_2b.pkl",    "n_features_in_",  31),
    ("rf_anomaly_2a.pkl", "n_features_in_",  40),
]
xgb_files = [
    ("xgb_risk_2a.pkl",    "num_features", 40),
    ("xgb_anomaly_2a.pkl", "num_features", 40),
]

for fname, attr, exp_val in sklearn_files:
    fpath = GROWTH / fname
    print(f"\n{'='*60}")
    print(f"FILE: {fname}  ({fpath.stat().st_size/1024:.1f} KB)")
    try:
        import joblib
        model = joblib.load(fpath)
        actual = getattr(model, attr, None)
        feat_names = getattr(model, "feature_names_in_", None)
        n_estimators = getattr(model, "n_estimators", None)
        print(f"  type: {type(model).__name__}")
        print(f"  {attr}: {actual}  (expected {exp_val})")
        print(f"  n_estimators: {n_estimators}")
        if feat_names is not None:
            print(f"  feature_names_in_ ({len(feat_names)}): {list(feat_names[:5])}...")

        if actual == exp_val:
            results.append((fname, "PASS", EXPECTED[fname]["desc"]))
        else:
            results.append((fname, "FAIL",
                f"{attr}: expected {exp_val}, got {actual}"
                + (" — likely a renamed 2A model!" if fname == "rf_risk_2b.pkl" and actual == 40 else "")))

    except Exception as exc:
        results.append((fname, "ERROR", str(exc)))
        print(f"  ERROR: {exc}")

for fname, attr, exp_val in xgb_files:
    fpath = GROWTH / fname
    print(f"\n{'='*60}")
    print(f"FILE: {fname}  ({fpath.stat().st_size/1024:.1f} KB)")
    try:
        import joblib, xgboost as xgb
        model = joblib.load(fpath)
        booster = model.get_booster()
        actual = booster.num_features()
        feat_names = booster.feature_names
        print(f"  type: {type(model).__name__}")
        print(f"  num_features(): {actual}  (expected {exp_val})")
        if feat_names:
            print(f"  booster feature_names ({len(feat_names)}): {feat_names[:5]}...")

        if actual == exp_val:
            results.append((fname, "PASS", EXPECTED[fname]["desc"]))
        else:
            results.append((fname, "FAIL", f"{attr}: expected {exp_val}, got {actual}"))

    except Exception as exc:
        results.append((fname, "ERROR", str(exc)))
        print(f"  ERROR: {exc}")

# ── Summary table ─────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("VERIFICATION SUMMARY")
print(f"{'='*60}")
print(f"{'File':<30} {'Status':<8} Reason")
print(f"{'-'*30} {'-'*8} {'-'*40}")
fails = 0
for fname, status, reason in results:
    marker = "[PASS]" if status == "PASS" else ("[FAIL]" if status == "FAIL" else "[ERR]")
    print(f"{fname:<30} {marker:<8} {reason}")
    if status != "PASS":
        fails += 1

print(f"\n{'='*60}")
if fails == 0:
    print("ALL 6 files verified — no action needed")
else:
    print(f"FAILED: {fails} file(s) — see details above")
