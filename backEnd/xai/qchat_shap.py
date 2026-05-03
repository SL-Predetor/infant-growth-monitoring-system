"""
Q-CHAT SHAP explainer and one-flip counterfactual generator.

SHAP pattern ported from:
  mlModels/autisumDetect/sector2/Stage_2/qchat_model_training.ipynb
  Uses shap.Explainer(model, background) — XGBoost-2.x compatible (NOT TreeExplainer).

Sign convention (post label-flip, Autistic=1 in the XGBoost model target):
  positive SHAP value → feature pushes prediction toward ASD
  negative SHAP value → feature pushes prediction toward Non-ASD
"""

import shap
import numpy as np
import pandas as pd
from typing import Optional

from xai.schemas import ShapContribution, Counterfactual
from xai.qchat_feature_map import QCHAT_FEATURE_MAP, ALL_FEATURES


def build_shap_explainer(xgboost_model, feature_columns: list) -> shap.Explainer:
    """
    Build a SHAP PermutationExplainer over xgboost_model.predict_proba.

    We deliberately wrap the predict_proba callable rather than passing the
    raw model. Reasons:
      - shap.TreeExplainer (the "natural" choice for XGBoost) can't parse
        the legacy XGBoost-saved booster used here: its loader trips on
        XGBoost 3.x's vector-format base_score ('[6.849837E-1]'),
        regardless of shap version.
      - shap.Explainer(model, bg) auto-dispatch raises "model is not
        callable" because the sklearn-wrapped XGBClassifier doesn't expose
        __call__.
      - shap.Explainer(model.predict_proba, bg) gives a PermutationExplainer
        which works across versions and is fast enough for 12 binary
        features at request time.

    Background: zero-vector (all-typical child = lowest-risk Q-CHAT
    profile). Attributions read as "deviation from a fully-typical child."
    Output is in probability space; values for class 1 (Autistic, post
    label-flip) sum to P(ASD)_sample − P(ASD)_background.
    """
    background = pd.DataFrame(
        np.zeros((1, len(feature_columns)), dtype=np.float32),
        columns=feature_columns,
    )
    explainer = shap.Explainer(xgboost_model.predict_proba, background)
    return explainer


def explain_qchat_sample(
    explainer: shap.Explainer,
    xgboost_model,
    feature_columns: list,
    sample: dict,
) -> tuple[list[ShapContribution], float]:
    """
    Compute SHAP values for a single Q-CHAT sample.

    Args:
        explainer: pre-built shap.Explainer (call build_shap_explainer once at startup)
        xgboost_model: the loaded XGBoost model
        feature_columns: ordered list of feature names
        sample: dict mapping feature names to 0/1 values

    Returns:
        (shap_contributions, base_value)
          shap_contributions: sorted by |shap_value| descending
          base_value: SHAP expected value E[f(X)]
    """
    row = {col: 0 for col in feature_columns}
    row.update({k: v for k, v in sample.items() if k in feature_columns})
    df = pd.DataFrame([row])[feature_columns]

    sv = explainer(df)
    # PermutationExplainer over predict_proba returns (1, n_features, n_classes).
    # We only need class 1 (ASD). Fall back to (1, n_features) if a future
    # explainer choice returns margin-space SHAP for the positive class only.
    raw = sv.values
    if raw.ndim == 3:
        shap_vals = raw[0, :, 1]
        base_arr = sv.base_values[0]
        base_val = float(base_arr[1] if hasattr(base_arr, "__getitem__") else base_arr)
    else:
        shap_vals = raw[0]
        base_val = float(sv.base_values[0])

    contributions = []
    for feat, shap_v in zip(feature_columns, shap_vals):
        meta = QCHAT_FEATURE_MAP.get(feat, {})
        contributions.append(
            ShapContribution(
                feature=feat,
                shap_value=round(float(shap_v), 6),
                feature_value=float(row[feat]),
                clinical_label=meta.get("label", feat),
                dsm5_domain=meta.get("dsm5_domain", "Unknown"),
            )
        )

    contributions.sort(key=lambda c: abs(c.shap_value), reverse=True)
    return contributions, base_val


def compute_counterfactuals(
    xgboost_model,
    feature_columns: list,
    sample: dict,
    p_asd_current: float,
) -> list[Counterfactual]:
    """
    One-flip counterfactuals: for each binary feature, flip its value and
    compute the resulting change in P(ASD).

    Returns list sorted by |delta_p| descending (largest impact first).
    A negative delta_p means flipping REDUCES ASD risk — actionable for clinicians.
    """
    row_base = {col: 0 for col in feature_columns}
    row_base.update({k: v for k, v in sample.items() if k in feature_columns})

    counterfactuals = []
    for feat in feature_columns:
        current_val = int(row_base[feat])
        flipped_val = 1 - current_val  # binary flip

        row_flipped = dict(row_base)
        row_flipped[feat] = flipped_val
        df_flipped = pd.DataFrame([row_flipped])[feature_columns]

        p_flipped = float(xgboost_model.predict_proba(df_flipped)[0][1])
        delta_p = p_flipped - p_asd_current

        meta = QCHAT_FEATURE_MAP.get(feat, {})
        counterfactuals.append(
            Counterfactual(
                feature=feat,
                clinical_label=meta.get("label", feat),
                current_value=current_val,
                flipped_value=flipped_val,
                p_asd_current=round(p_asd_current, 4),
                p_asd_flipped=round(p_flipped, 4),
                delta_p=round(delta_p, 4),
            )
        )

    counterfactuals.sort(key=lambda c: abs(c.delta_p), reverse=True)
    return counterfactuals
