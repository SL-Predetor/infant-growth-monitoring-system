"""
Clinical translator: converts SHAP values and modality attribution into
plain-language sentences suitable for displaying to parents and flagging
for clinician review.

Sentence style: factual, non-alarmist, grounded in DSM-5 domain labels.
Threshold for "notable": |shap_value| > 0.10 (empirically, most non-signal
features in the Stage-2 model have |SHAP| < 0.05).
"""

from xai.schemas import ShapContribution, ModalityAttribution
from xai.qchat_feature_map import QCHAT_FEATURE_MAP

NOTABLE_SHAP_THRESHOLD = 0.10


def shap_to_sentences(
    shap_contributions: list[ShapContribution],
    p_asd: float,
    max_sentences: int = 5,
) -> list[str]:
    """
    Convert SHAP contributions into plain-language sentences.

    Rules:
    - Only emit sentences for features with |shap_value| > NOTABLE_SHAP_THRESHOLD
    - Positive SHAP (toward ASD): use atypical_sentence from feature map
    - Negative SHAP (away from ASD): use typical_sentence (only if feature_value=1
      to avoid restating the obvious when both value and shap are 0)
    - Cap at max_sentences
    - Prepend overall summary line
    """
    sentences: list[str] = []

    overall = _overall_summary(p_asd)
    sentences.append(overall)

    notable = [c for c in shap_contributions if abs(c.shap_value) > NOTABLE_SHAP_THRESHOLD]
    notable = notable[: max_sentences - 1]  # reserve 1 slot for overall

    for contrib in notable:
        meta = QCHAT_FEATURE_MAP.get(contrib.feature, {})
        if contrib.shap_value > 0:
            # Feature pushed toward ASD
            sent = meta.get("atypical_sentence", f"{contrib.clinical_label}: atypical response detected.")
        else:
            # Feature pushed away from ASD — only mention if the answer was atypical
            # (value=1) but the model discounted it; avoid redundant "typical" statements
            if int(contrib.feature_value) == 1:
                sent = f"{contrib.clinical_label}: present but weighted lightly by the model in this profile."
            else:
                sent = meta.get("typical_sentence", f"{contrib.clinical_label}: typical response observed.")

        sentences.append(sent)

    return sentences


def modality_to_sentences(modality: ModalityAttribution) -> list[str]:
    """
    Plain-language summary of the modality attribution for the fused result screen.
    """
    sentences: list[str] = []

    sentences.append(
        f"The behavioural questionnaire (Q-CHAT) contributed "
        f"{modality.qchat_share:.0%} of this prediction, "
        f"and the facial analysis contributed {modality.facial_share:.0%}."
    )

    if modality.agreement_bucket == "strong_agree":
        sentences.append(
            "Both assessment methods are in strong agreement, increasing confidence in the result."
        )
    elif modality.agreement_bucket == "moderate_agree":
        sentences.append(
            "The two assessment methods show moderate agreement. The result is reliable "
            "but consider supplementing with a clinical observation if in doubt."
        )
    else:
        sentences.append(
            "The facial analysis and the behavioural questionnaire give substantially "
            "different signals. This discrepancy means the automated score should be "
            "treated with caution — a clinician review is recommended."
        )

    if modality.flag_for_clinician and modality.flag_reason:
        sentences.append(f"Note: {modality.flag_reason}")

    return sentences


def _overall_summary(p_asd: float) -> str:
    if p_asd >= 0.70:
        return (
            f"The model estimates a {p_asd:.0%} probability of ASD based on the answers provided. "
            "This is above the high-risk threshold and warrants prompt specialist consultation."
        )
    elif p_asd >= 0.35:
        return (
            f"The model estimates a {p_asd:.0%} probability of ASD based on the answers provided. "
            "Some indicators are present — discuss with your child's paediatrician."
        )
    else:
        return (
            f"The model estimates a {p_asd:.0%} probability of ASD based on the answers provided. "
            "No strong indicators were detected, though regular developmental monitoring is always advisable."
        )
