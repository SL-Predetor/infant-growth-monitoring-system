"""
LogReg probe attribution: rank embedding dimensions by |value * coef|.

The LogReg probe (logreg_probe_model.pkl) was trained on 256-D embeddings
extracted from VGG-Face backbone (asd_feature_vector layer).
Its coef_ vector gives a linear attribution over embedding dimensions.

Per-sample contribution of dimension i:
  attribution_i = embedding_value_i * coef_i
  (positive → pushes toward ASD, negative → away from ASD)
"""

import numpy as np
from xai.schemas import EmbeddingDimContribution


def rank_embedding_dims(
    embedding: np.ndarray,
    logreg_model,
    top_k: int = 10,
) -> list[EmbeddingDimContribution]:
    """
    Rank 256-D embedding dimensions by |value * coef|.
    Returns top_k dims sorted by |attribution| descending.
    """
    coefs = logreg_model.coef_[0]               # shape (256,)
    attributions = embedding[0] * coefs          # element-wise signed attribution
    sorted_idx = np.argsort(np.abs(attributions))[::-1][:top_k]

    result = []
    for idx in sorted_idx:
        result.append(
            EmbeddingDimContribution(
                dim_index=int(idx),
                embedding_value=float(embedding[0][idx]),
                coef_value=float(coefs[idx]),
                attribution=float(attributions[idx]),
            )
        )
    return result
