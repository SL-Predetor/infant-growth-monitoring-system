"""
Q-CHAT-10 feature metadata: clinical labels, DSM-5 domains, scoring direction,
and sentence templates used by the clinical translator.

Scoring direction (atypical=1 means ASD-risk answer):
  A1-A9: 1 = atypical response (does NOT do the expected behaviour)
  A10:   1 = atypical (hypersensitive / unusual sensory response)

SHAP sign convention (post label-flip, Autistic=1):
  positive SHAP → pushes toward ASD prediction
  negative SHAP → pushes toward Non-ASD prediction
"""

from typing import TypedDict


class FeatureMeta(TypedDict):
    label: str          # short display label for UI charts
    full_question: str  # the actual Q-CHAT question text
    dsm5_domain: str    # DSM-5 criterion mapped to
    atypical_means: str # what atypical answer (1) indicates clinically
    typical_sentence: str    # plain-language sentence when feature=0 (low risk)
    atypical_sentence: str   # plain-language sentence when feature=1 (high risk)


QCHAT_FEATURE_MAP: dict[str, FeatureMeta] = {
    "A1": {
        "label": "Name response",
        "full_question": "If you call your child's name, does he/she respond by looking up at you?",
        "dsm5_domain": "DSM-5 Criterion A — Social communication",
        "atypical_means": "Child does not reliably respond to their own name",
        "typical_sentence": "Responds to their name — a key early social signal.",
        "atypical_sentence": "Not reliably responding to their name, which is an early marker of reduced social attention.",
    },
    "A2": {
        "label": "Eye contact",
        "full_question": "Is it easy to make eye contact with your child?",
        "dsm5_domain": "DSM-5 Criterion A — Nonverbal communication",
        "atypical_means": "Eye contact is difficult or inconsistent",
        "typical_sentence": "Makes eye contact readily, supporting social-emotional connection.",
        "atypical_sentence": "Difficulty sustaining eye contact, which may reflect differences in social attention.",
    },
    "A3": {
        "label": "Pointing to share",
        "full_question": "Does your child point to indicate interest in something (e.g., an interesting sight)?",
        "dsm5_domain": "DSM-5 Criterion A — Joint attention",
        "atypical_means": "Does not use declarative pointing to share interest",
        "typical_sentence": "Points to share interest — a hallmark of joint attention.",
        "atypical_sentence": "Not yet using pointing to share interest, an important joint attention milestone.",
    },
    "A4": {
        "label": "Pointing to request",
        "full_question": "Does your child point with one finger to ask for something or to get help?",
        "dsm5_domain": "DSM-5 Criterion A — Joint attention / communicative intent",
        "atypical_means": "Does not use imperative pointing to request",
        "typical_sentence": "Uses pointing to request — communicating intentionally.",
        "atypical_sentence": "Not using pointing to make requests, suggesting limited communicative gesturing.",
    },
    "A5": {
        "label": "Pretend play",
        "full_question": "Does your child engage in pretend play (e.g., pretend to talk on the phone or care for a doll)?",
        "dsm5_domain": "DSM-5 Criterion B — Restricted/repetitive behaviours (imagination)",
        "atypical_means": "Limited or absent pretend play",
        "typical_sentence": "Engages in pretend play — demonstrating imaginative thinking.",
        "atypical_sentence": "Limited pretend play, which can reflect differences in symbolic thinking.",
    },
    "A6": {
        "label": "Following gaze",
        "full_question": "Does your child follow your gaze when you look at something?",
        "dsm5_domain": "DSM-5 Criterion A — Joint attention / gaze following",
        "atypical_means": "Does not follow caregiver's gaze",
        "typical_sentence": "Follows your gaze — showing gaze-following as expected.",
        "atypical_sentence": "Not following a caregiver's gaze, which is a core joint-attention behaviour.",
    },
    "A7": {
        "label": "Empathy / social comfort",
        "full_question": "If someone in your family is crying or upset, does your child show signs of wanting to comfort them?",
        "dsm5_domain": "DSM-5 Criterion A — Social-emotional reciprocity",
        "atypical_means": "Does not show comfort-seeking or empathic response",
        "typical_sentence": "Shows empathy towards distressed family members — socially responsive.",
        "atypical_sentence": "Not yet showing empathic responses to others' distress, which may reflect social-emotional differences.",
    },
    "A8": {
        "label": "First words",
        "full_question": "Would you describe your child's first words as typical?",
        "dsm5_domain": "DSM-5 Criterion A — Verbal communication development",
        "atypical_means": "First words were atypical, delayed, or unusual in content",
        "typical_sentence": "First words developed as expected for age.",
        "atypical_sentence": "First words were atypical or delayed, which is a language development signal.",
    },
    "A9": {
        "label": "Gestures",
        "full_question": "Does your child use simple gestures (e.g., wave goodbye)?",
        "dsm5_domain": "DSM-5 Criterion A — Nonverbal communication",
        "atypical_means": "Does not use simple social gestures",
        "typical_sentence": "Uses simple social gestures like waving — communicating with gesture.",
        "atypical_sentence": "Not yet using simple social gestures, limiting non-verbal communication.",
    },
    "A10": {
        "label": "Sensory sensitivity",
        "full_question": "Does your child stare at nothing or wander with no purpose?",
        "dsm5_domain": "DSM-5 Criterion B — Restricted/repetitive behaviours (sensory/perceptual)",
        "atypical_means": "Unusual staring or aimless wandering observed",
        "typical_sentence": "No unusual staring or aimless wandering observed.",
        "atypical_sentence": "Episodes of unusual staring or purposeless wandering observed, which may indicate atypical sensory processing.",
    },
    "Sex_M": {
        "label": "Sex (Male)",
        "full_question": "Sex of child",
        "dsm5_domain": "Demographic",
        "atypical_means": "Male sex (higher population prevalence of ASD)",
        "typical_sentence": "Female sex (lower epidemiological ASD prevalence).",
        "atypical_sentence": "Male sex (ASD is ~4× more prevalent in males epidemiologically).",
    },
    "Family_mem_with_ASD_Yes": {
        "label": "Family ASD history",
        "full_question": "Does any family member have ASD?",
        "dsm5_domain": "Genetic / environmental risk factor",
        "atypical_means": "Family history of ASD (elevated genetic risk)",
        "typical_sentence": "No family history of ASD reported.",
        "atypical_sentence": "Family history of ASD reported — a significant genetic risk factor.",
    },
}


# Ordered list of core Q-CHAT items (excludes demographics)
QCHAT_ITEMS = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"]
DEMOGRAPHIC_ITEMS = ["Sex_M", "Family_mem_with_ASD_Yes"]
ALL_FEATURES = QCHAT_ITEMS + DEMOGRAPHIC_ITEMS
