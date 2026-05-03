"""Pydantic response models for all /api/asd/explain-* endpoints."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ShapContribution(BaseModel):
    feature: str           # e.g. "A4"
    shap_value: float      # post-flip: positive → pushes toward ASD (Autistic=1)
    feature_value: float   # actual value in this sample (0 or 1)
    clinical_label: str    # human-readable feature name
    dsm5_domain: str       # DSM-5 criterion label


class Counterfactual(BaseModel):
    feature: str
    clinical_label: str
    current_value: int
    flipped_value: int
    p_asd_current: float
    p_asd_flipped: float
    delta_p: float         # p_flipped - p_current; negative means flipping reduces ASD risk


class QChatExplainResponse(BaseModel):
    p_asd: float
    base_value: float                        # SHAP expected value (E[f(x)])
    shap_contributions: List[ShapContribution]
    counterfactuals: List[Counterfactual]    # one-flip per feature, sorted by |delta_p| desc
    top_driver: str                          # feature name with largest |shap_value|
    plain_language: List[str]               # 3-5 clinical sentences


class ModalityAttribution(BaseModel):
    facial_contribution: float   # alpha * p_facial
    qchat_contribution: float    # (1-alpha) * p_qchat
    facial_share: float          # facial_contribution / p_fused (NaN → 0 when p_fused=0)
    qchat_share: float
    dominant_modality: str       # "facial" | "qchat" | "balanced"
    p_facial: float
    p_qchat: float
    p_fused: float
    agreement_score: float       # 1 - |p_facial - p_qchat|  (1=perfect agreement)
    disagreement: float          # |p_facial - p_qchat|
    agreement_bucket: str        # "strong_agree" | "moderate_agree" | "disagree"
    flag_for_clinician: bool
    flag_reason: Optional[str]


class FusedExplainResponse(BaseModel):
    fused_probability: float
    modality: ModalityAttribution
    qchat_shap: List[ShapContribution]
    top_driver: str
    plain_language: List[str]


class EmbeddingDimContribution(BaseModel):
    dim_index: int
    embedding_value: float
    coef_value: float
    attribution: float   # |embedding_value * coef_value|, signed: embedding_value * coef_value


class FaceExplainResponse(BaseModel):
    p_asd: float
    gradcam_b64: Optional[str]               # base64-encoded PNG with JET overlay
    top_embedding_dims: List[EmbeddingDimContribution]  # top-10 by |attribution|
    plain_language: List[str]


class AllExplainResponse(BaseModel):
    fused: FusedExplainResponse
    face: FaceExplainResponse
    qchat: QChatExplainResponse
