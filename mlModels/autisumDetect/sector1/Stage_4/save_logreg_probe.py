"""
Save LogReg probe model + scaler as production pkl files.
Validated at AUC=0.8593 via 5-fold CV in late_fusion_simulation.ipynb.
This script fits on the FULL dataset for production deployment.
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score

# ─── Paths (relative to project root) ────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(SCRIPT_DIR, 'data', 'ImgFeatures_Stage4.csv')
MODEL_DIR  = os.path.join(SCRIPT_DIR, 'models')
SCALER_PATH = os.path.join(MODEL_DIR, 'logreg_probe_scaler.pkl')
MODEL_PATH  = os.path.join(MODEL_DIR, 'logreg_probe_model.pkl')

# ─── Step 1: Load feature embeddings ─────────────────────────────────────────
if not os.path.exists(DATA_PATH):
    print(f'ERROR: ImgFeatures_Stage4.csv not found at:\n  {DATA_PATH}')
    sys.exit(1)

print('Step 1 — Loading embeddings...')
df = pd.read_csv(DATA_PATH)
FEAT_COLS = [f'V_{i}' for i in range(256)]
X = df[FEAT_COLS].values
y = df['Actual_Label'].values
print(f'  X shape: {X.shape}  y shape: {y.shape}')
print(f'  ASD={int(y.sum())}  Non-ASD={int((y == 0).sum())}')

# ─── Step 2: Fit on full dataset ────────────────────────────────────────────
print('\nStep 2 — Fitting scaler + LogReg on full dataset...')
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = LogisticRegression(max_iter=1000, random_state=42, C=1.0)
model.fit(X_scaled, y)
print('  Fit complete.')

# ─── Step 3: Verify AUC ─────────────────────────────────────────────────────
print('\nStep 3 — Verifying...')
y_prob = model.predict_proba(X_scaled)[:, 1]
auc = roc_auc_score(y, y_prob)
print(f'  LogReg probe AUC on full dataset: {auc:.4f}')

if auc < 0.80:
    print(f'ERROR: AUC={auc:.4f} is below 0.80 — something is wrong. Aborting.')
    sys.exit(1)

# ─── Step 4: Save artifacts ─────────────────────────────────────────────────
print('\nStep 4 — Saving pkl files...')
os.makedirs(MODEL_DIR, exist_ok=True)

joblib.dump(scaler, SCALER_PATH)
joblib.dump(model, MODEL_PATH)

scaler_kb = os.path.getsize(SCALER_PATH) / 1024
model_kb  = os.path.getsize(MODEL_PATH) / 1024
print(f'  Scaler: {SCALER_PATH}  ({scaler_kb:.1f} KB)')
print(f'  Model : {MODEL_PATH}  ({model_kb:.1f} KB)')

# ─── Step 5: Verify by reloading ────────────────────────────────────────────
print('\nStep 5 — Reload verification...')
scaler_loaded = joblib.load(SCALER_PATH)
model_loaded  = joblib.load(MODEL_PATH)

X_test = X[:5]
X_test_scaled = scaler_loaded.transform(X_test)
probs_reload = model_loaded.predict_proba(X_test_scaled)[:, 1]
probs_orig   = y_prob[:5]

print(f'  Original  probs (first 5): {np.round(probs_orig, 6)}')
print(f'  Reloaded  probs (first 5): {np.round(probs_reload, 6)}')

if np.allclose(probs_orig, probs_reload):
    verification = 'PASSED'
    print('  Verification passed — models saved correctly')
else:
    verification = 'FAILED'
    print('  WARNING: Probabilities do not match!')

# ─── Summary ─────────────────────────────────────────────────────────────────
print(f"""
==========================================
LogReg Probe — Saved Successfully
==========================================
Scaler : sector1/Stage_4/models/logreg_probe_scaler.pkl  ({scaler_kb:.1f} KB)
Model  : sector1/Stage_4/models/logreg_probe_model.pkl   ({model_kb:.1f} KB)
Full-dataset AUC : {auc:.4f}
Features         : 256 (V_0 to V_255)
Training samples : {len(y)}
Verification     : {verification}
==========================================
These two files are the production facial
stream components for the FastAPI backend.
==========================================""")
