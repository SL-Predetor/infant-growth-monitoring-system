"""
Per-sample fusion attribution: how much did each modality contribute to the
fused ASD prediction?

Novel contribution: sector3 only performed aggregate-level fusion analysis
(Monte Carlo over 300 paired samples). This module provides per-prediction,
per-sample attribution — the XAI novelty claim.

Fusion rule (from asd_router.py):
  p_fused = ALPHA * p_facial + (1 - ALPHA) * p_qchat
  ALPHA = 0.15

Agreement-as-confidence:
  Cross-modal disagreement = |p_facial - p_qchat|
  When disagreement is HIGH, the fused prediction is dominated by Q-CHAT
  (because alpha=0.15 is small) but the facial signal conflicts — clinician
  review is warranted.
"""

from xai.schemas import ModalityAttribution

ALPHA = 0.15
QCHAT_WEIGHT = 1 - ALPHA  # 0.85

# Disagreement thresholds (tuned from sector3 complementarity analysis)
DISAGREE_STRONG_THRESHOLD = 0.40   # |p_f - p_q| > 0.40 → strong disagreement
DISAGREE_MODERATE_THRESHOLD = 0.20  # |p_f - p_q| > 0.20 → moderate


def compute_fusion_attribution(
    p_facial: float,
    p_qchat: float,
) -> ModalityAttribution:
    """
    Decompose the fused prediction into per-modality contributions.

    Contributions are the weighted inputs:
      facial_contribution = ALPHA * p_facial
      qchat_contribution  = (1 - ALPHA) * p_qchat
      p_fused             = facial_contribution + qchat_contribution

    Shares normalise these to sum to 1 (proportion of fused score).
    When p_fused == 0, shares are set to ALPHA and (1-ALPHA) respectively
    (matching the weight distribution).
    """
    p_fused = ALPHA * p_facial + QCHAT_WEIGHT * p_qchat

    facial_contribution = ALPHA * p_facial
    qchat_contribution = QCHAT_WEIGHT * p_qchat

    if p_fused > 0:
        facial_share = facial_contribution / p_fused
        qchat_share = qchat_contribution / p_fused
    else:
        facial_share = ALPHA
        qchat_share = QCHAT_WEIGHT

    # Dominant modality: compare contributions as fractions of their max possible
    # (i.e., compare ALPHA*p_f vs (1-ALPHA)*p_q — the actual contributions)
    if abs(facial_share - qchat_share) < 0.10:
        dominant_modality = "balanced"
    elif facial_contribution > qchat_contribution:
        dominant_modality = "facial"
    else:
        dominant_modality = "qchat"

    disagreement = abs(p_facial - p_qchat)
    agreement_score = 1.0 - disagreement

    if disagreement > DISAGREE_STRONG_THRESHOLD:
        agreement_bucket = "disagree"
        flag_for_clinician = True
        flag_reason = (
            f"The facial ({p_facial:.0%}) and Q-CHAT ({p_qchat:.0%}) signals differ by "
            f"{disagreement:.0%}. When the two assessment modalities strongly disagree, "
            "a qualified clinician should review the case rather than relying on the "
            "automated fused score alone."
        )
    elif disagreement > DISAGREE_MODERATE_THRESHOLD:
        agreement_bucket = "moderate_agree"
        flag_for_clinician = False
        flag_reason = (
            f"Moderate disagreement between modalities ({disagreement:.0%}). "
            "Result is reliable but consider supplementing with a clinical observation."
        )
    else:
        agreement_bucket = "strong_agree"
        flag_for_clinician = False
        flag_reason = None

    return ModalityAttribution(
        facial_contribution=round(facial_contribution, 4),
        qchat_contribution=round(qchat_contribution, 4),
        facial_share=round(facial_share, 4),
        qchat_share=round(qchat_share, 4),
        dominant_modality=dominant_modality,
        p_facial=round(p_facial, 4),
        p_qchat=round(p_qchat, 4),
        p_fused=round(p_fused, 4),
        agreement_score=round(agreement_score, 4),
        disagreement=round(disagreement, 4),
        agreement_bucket=agreement_bucket,
        flag_for_clinician=flag_for_clinician,
        flag_reason=flag_reason,
    )
