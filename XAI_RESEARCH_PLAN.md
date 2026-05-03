# XAI Research Extension — ASD Detection System
## Full End-to-End Plan (grounded in the existing codebase)

**Author:** Yasindu Kaveesha
**Degree:** B.Sc. (Hons) Data Science / CS, SLIIT
**Parent system:** TinySteps multi-modal ASD screening
**Version:** 2.0 — revised after deep read of all sector1/2/3 notebooks, plots, and cell outputs

---

## 0. What's Already There (grounded in actual notebook content)

Before planning extensions, here's exactly what XAI-adjacent work **already exists** in the codebase:

| Artifact | Location | What it is | Reusable? |
|----------|----------|-----------|-----------|
| `GradCAM_ASD` class | `sector1/Stage_4/stage4_final_model_evaluation.ipynb` §5 (cells 21-23) | Full Grad-CAM implementation targeting `conv2d_14`, with nested-backbone handling and JET overlay | **Yes — port to backend as-is** |
| `gradcam_autistic.png` + `gradcam_non_autistic.png` | `sector1/Stage_4/plots/` | 4 correctly-classified ASD + 4 Non-ASD examples with heatmaps overlaid | For thesis figures |
| SHAP on XGBoost | `sector2/Stage_2/qchat_model_training.ipynb` | `shap.Explainer(xgb_final, X)` — XGBoost-2.x compatible API; saves beeswarm + bar plots | **Yes — pattern directly reusable** |
| `shap_summary_qchat.png` | `sector2/Stage_2/plots/shap_summary_qchat.png` | Beeswarm with feature contributions | Thesis figure |
| `shap_bar_qchat.png` | `sector2/Stage_2/plots/shap_bar_qchat.png` | Mean \|SHAP\| bar chart | Thesis figure |
| Calibration analysis | `sector2/Stage_2/qchat_model_training.ipynb` + `sector1/Stage_4/stage4_advanced_evaluation.ipynb` | Brier + ECE (10-bin uniform) implemented for both streams | Reusable |
| Bootstrap 95% CI | `sector1/Stage_4/stage4_advanced_evaluation.ipynb` | 2000 resamples for AUC/Recall/Precision/F1 | Reusable |
| t-SNE + silhouette | `sector1/Stage_4/tsne_embedding_visualization.ipynb` | Perplexity sweep (10/30/50), silhouette scores 256-D vs 2-D | Reusable |
| LogReg probe + coefficients | `sector1/Stage_4/save_logreg_probe.py` | `logreg_probe_{model,scaler}.pkl`, OOF AUC 0.8593 | `logreg.coef_` is a free linear-attribution tool — not yet used as XAI |
| Monte-Carlo fusion | `sector3/late_fusion_simulation.ipynb` | 500 iter × 300 pairs, α-sweep, complementarity aggregate | **Aggregate only — no per-sample tracking** |

**What does NOT exist anywhere in the codebase:**
- LIME (any modality)
- Counterfactual explanations
- Per-sample fusion attribution (sector3 discards sample-level data inside the MC loop)
- Cross-modal agreement analysis (per-sample P_facial vs P_qchat)
- Live XAI served through the backend (`asd_router.py` has no explain endpoints)
- Any XAI UI on the frontend

These absences **define the novelty space** for this extension.

---

## 1. Research Context

### 1.1 Motivation
Our trained multi-modal pipeline achieves strong aggregate performance (fused AUC ≈ 0.9994, joint-FN 0.23% in the MC simulation) but operates as a black box at inference time. Two concrete gaps:

1. **Training-time XAI was produced, but never served.** Grad-CAM plots exist in the notebook folder; SHAP plots exist in sector2. Neither is reachable from the app.
2. **Fusion-level XAI does not exist at all.** Sector 3 reports aggregate AUC/complementarity across 500 Monte-Carlo iterations but discards sample-level probabilities inside the loop. There is no per-prediction explanation for *why* the fused score landed where it did.

### 1.2 Research Questions
1. **RQ1** — Can the existing offline `GradCAM_ASD` class and `shap.Explainer` patterns be lifted into live FastAPI endpoints without distorting their semantics?
2. **RQ2** — At inference time, how should the fused score `P = αP_facial + (1-α)P_qchat` be decomposed into per-sample modality contributions, and what information does that decomposition carry?
3. **RQ3** — Does cross-modal agreement (|P_facial − P_qchat|) correlate with prediction correctness on held-out data, and can it be used as a confidence signal that flags cases for clinical review?
4. **RQ4** — Do different XAI methods on the Q-CHAT model (SHAP, a newly-added LIME comparison, one-flip counterfactuals) converge on the same top drivers, or disagree?

### 1.3 Novelty Claim (defensible, scoped)
**Per-prediction modality attribution with cross-modal-agreement-as-confidence, coupled with a clinical-translation layer.** Sector 3 already establishes aggregate complementarity (0.23% joint FN rate). This extension pushes that from *population-level* to *patient-level*, which directly enables:
- A deployment policy ("flag low-agreement cases for clinician review")
- A human-interpretable explanation per prediction

This is a modest but genuine SLIIT-level contribution: it is not trivially available in the existing literature for multi-modal ASD screening, and it requires the sector-3 simulation to be extended with per-sample tracking — work that is not yet done.

---

## 2. Literature Positioning

| Method | Canonical ref | Used on | Status in our project |
|--------|-------------|---------|----------------------|
| SHAP `Explainer` | Lundberg & Lee, NeurIPS 2017 | Q-CHAT XGBoost | **Already implemented** offline |
| Grad-CAM | Selvaraju et al., ICCV 2017 | VGG-Face CNN | **Already implemented** offline (`conv2d_14` target) |
| Counterfactual (one-flip) | Wachter et al., 2017 | Q-CHAT binary features | To add |
| LIME | Ribeiro et al., KDD 2016 | Comparison baseline for Q-CHAT | To add |
| Per-sample modality attribution | This work | Fusion layer | To add (novel in our pipeline) |

### 2.1 Gap being addressed
Published multi-modal ASD fusion papers typically report aggregate AUC and, when present, SHAP on one branch. The combination of **(a) per-sample modality decomposition + (b) cross-modal agreement correlated with correctness + (c) patient-facing translation** is uncommon. That combination is the contribution.

---

## 3. System Architecture (after extension)

### 3.1 Current inference flow (unchanged)
```
Image ──► MTCNN ──► VGG-Face (conv2d_14 block) ──► asd_feature_vector_256
                                                         │
                                                         ├──► sigmoid head ──► P_facial (fold_5)
                                                         │
                                                         └──► logreg_probe (used in production) ──► P_facial'

QChat 12-feature vector ──► xgboost_qchat_stage2 ──► P_qchat

P_fused = 0.15·P_facial + 0.85·P_qchat ──► risk label
```

### 3.2 New XAI layer
```
Image ──► ... (same) ──► P_facial          ┐
   │                                        │
   └──► GradCAM_ASD.generate_heatmap ──► base64 overlay
   └──► logreg_probe.coef_ · embedding ──► per-dim contributions

QChat ──► ... (same) ──► P_qchat           │
   │                                        │
   └──► shap.Explainer(xgb)(x) ──► per-feature SHAP values
   └──► one_flip_counterfactuals(x) ──► Δ per feature
   └──► LIME explain_instance (optional comparison) ──► top-K features
                                            │
                                            ▼
                            Modality Attribution Module
                          { facial_contribution = α·P_facial
                            qchat_contribution  = (1-α)·P_qchat
                            dominant_modality, modality_share,
                            |P_facial − P_qchat|, agreement_bucket,
                            both_above_threshold, both_below_threshold }
                                            │
                                            ▼
                               Clinical Translator
                  (SHAP → readable sentences with A-codes mapped to
                   clinical behaviour names and DSM-5 criterion labels;
                   disagreement → "flag for clinician review" copy)
                                            │
                                            ▼
                                    Frontend cards
```

### 3.3 New Backend Endpoints (all mounted under `/api/asd/`)
| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/explain-qchat` | POST | 12-feature payload (same as predict-qchat) | SHAP values, counterfactual Δ, optional LIME, plain-language summary |
| `/explain-face` | POST | image file | Grad-CAM heatmap (base64 PNG), probe-coefficient contributions on top-K embedding dims, caveat text |
| `/explain-fused` | POST | `{p_facial, p_qchat}` (or full features to recompute) | Modality shares, |Δ|, agreement bucket, clinical recommendation |
| `/explain-all` | POST | image + 12-feature payload | Single aggregate response (one call for the UI) |

### 3.4 Data contracts (strict; go into `backEnd/xai/schemas.py`)

```python
# Q-CHAT response (Pydantic)
class QChatContribution(BaseModel):
    feature: str                 # e.g. "A4"
    behaviour_name: str          # "Protodeclarative pointing (joint attention)"
    raw_answer: int              # 0-4
    shap: float                  # e.g. 1.57
    direction: Literal["increases_risk", "decreases_risk", "neutral"]
    percent_of_abs_total: float  # e.g. 0.15

class QChatCounterfactual(BaseModel):
    feature: str
    flipped_answer: int
    new_probability: float
    delta: float                 # new - original

class QChatExplanation(BaseModel):
    base_value: float
    shap_values: list[float]
    feature_names: list[str]
    contributions: list[QChatContribution]
    top_drivers: list[QChatContribution]        # top 3 by |shap|
    counterfactuals: list[QChatCounterfactual]  # one per answered feature
    plain_language: str
```

```python
# Facial response
class ProbeDimContribution(BaseModel):
    embedding_dim: int          # 0..255
    value: float                # embedding[dim]
    coef: float                 # logreg.coef_[0, dim]
    contribution: float         # value * coef

class FaceExplanation(BaseModel):
    gradcam_overlay_base64: str
    attention_region_summary: str   # "midface" | "periocular" | "diffuse" | ...
    top_probe_dims: list[ProbeDimContribution]   # top 10 by |contribution|
    prediction: float
    threshold_used: float
    disclaimer: str                 # the confound caveat, verbatim
```

```python
# Fused response
class FusedExplanation(BaseModel):
    p_facial: float
    p_qchat: float
    alpha: float                    # 0.15
    facial_contribution: float      # alpha * p_facial
    qchat_contribution: float       # (1-alpha) * p_qchat
    p_fused: float
    modality_share: dict[str, float]   # normalized
    dominant_modality: Literal["facial", "qchat"]
    disagreement: float                # |p_facial - p_qchat|
    agreement_bucket: Literal["high", "medium", "low"]
    clinician_review_recommended: bool
    clinical_message: str
```

---

## 4. The Novel Component in Detail: Per-Sample Fusion Attribution + Agreement-as-Confidence

### 4.1 Decomposition (pure math — no ML)
Given α = 0.15:
- `C_facial = α · P_facial`
- `C_qchat  = (1 − α) · P_qchat`
- `share_m  = C_m / (C_facial + C_qchat)`  (normalised)
- `dominant = argmax_m C_m`
- `disagreement = |P_facial − P_qchat|`
- Agreement bucket:
  - `high` if `disagreement < 0.15`
  - `medium` if `0.15 ≤ disagreement < 0.35`
  - `low` if `disagreement ≥ 0.35`

### 4.2 The research experiment — does agreement predict correctness?
**H0:** Agreement bucket is independent of prediction correctness.
**H1 (our hypothesis):** Low-agreement cases have measurably lower correctness than high-agreement cases.

**Protocol (new notebook `sector4_xai/02_agreement_vs_correctness.ipynb`):**

1. Construct a **paired** dataset for this analysis. Because sector3 simulation pairs by class label only (the two streams have no patient overlap), we will run this on the synthetically paired blind-test samples — fixed pairing, not MC resampled. Use sector1 Fold-5 blind test (392 images) and a stratified sample of sector2 Stage-2 test rows (368 rows). For each class, shuffle once with a fixed seed and pair index-wise. This gives a reproducible 392/368 → 368 pair set.
2. Compute `P_facial` and `P_qchat` for every pair, then `P_fused`, then correctness at the fusion threshold 0.35.
3. Bin by agreement bucket.
4. Report: accuracy, precision, recall, and 95% bootstrap CIs per bucket.
5. Statistical test: χ² on (correct, incorrect) × (high, medium, low). Report p-value.
6. Threshold sweep: τ_disagree ∈ {0.15, 0.20, 0.25, 0.30, 0.35, 0.40}; for each, report recall of correct-classification among cases that would be *auto-approved* (agreement ≥ τ) vs *flagged* (agreement < τ).

**Decision rule for deployment:** if flagged-bucket correctness is meaningfully lower than auto-approved correctness at some τ, adopt τ as the "recommend-clinician" threshold. This becomes a deployment artefact, not just an analysis.

### 4.3 What this buys the thesis
A policy-grade XAI artefact: "When the two streams disagree by more than τ, we do not make a unilateral prediction; we recommend clinical follow-up." That is a meaningful, testable claim that goes beyond naïve fusion.

---

## 5. Evaluation Methodology

### 5.1 XAI faithfulness metrics
| Metric | Target | Notebook |
|--------|--------|----------|
| Grad-CAM AUC-Deletion (mask top-K pixels → measure prob drop) | Steeper drop = more faithful | `sector4_xai/03_gradcam_faithfulness.ipynb` |
| Grad-CAM AUC-Insertion (start blur, insert top-K) | Faster rise = more faithful | same |
| SHAP stability (1000-row bootstrap, feature-rank Spearman) | ρ > 0.9 | `sector4_xai/01_shap_analysis.ipynb` |
| SHAP vs LIME top-5 rank agreement | ρ > 0.7 expected | `sector4_xai/04_shap_vs_lime.ipynb` |
| Counterfactual validity (flipping top feature actually moves prediction) | ≥ 95 % | `sector4_xai/01_shap_analysis.ipynb` |

**Note on sample size for Grad-CAM faithfulness:** the blind test has 195 ASD + 197 Non-ASD = 392 images; run on the full set. For SHAP stability, use the 1,838-row parent-only Stage-2 set.

### 5.2 Qualitative case studies (6 canonical cases)
Pick and render all plots + plain-language text for:
1. High-risk, both streams agree, true ASD
2. Low-risk, both streams agree, true Non-ASD
3. High-risk fused but facial low, Q-CHAT high (Q-CHAT drives, confound-resistant)
4. High-risk fused, facial high, Q-CHAT low (disagreement → review)
5. False positive — system flags but ground truth is Non-ASD (what features drove the error?)
6. False negative — system misses a true ASD case (which modality failed?)

Each case shows: inputs, all four panels (SHAP bar, SHAP waterfall or force, Grad-CAM overlay, modality bar), plain-language paragraph, retrospective commentary paragraph.

### 5.3 Ablation experiments
- SHAP vs LIME on 300 test rows: rank agreement, runtime
- Grad-CAM target-layer sensitivity: `conv2d_14` vs `conv2d_13` — faithfulness difference
- α-perturbation sensitivity on fusion attribution: does the dominant-modality designation flip under α ∈ {0.10, 0.15, 0.20}?

### 5.4 Optional lightweight user study (if time permits)
- 3 rendered case studies, 5-10 non-clinical parents
- 3 Likert items: understandability, trust, what's missing
- Report N, medians, and a qualitative theme pass. Do not over-claim.

---

## 6. Implementation Plan

### 6.1 Backend structure
```
backEnd/
  xai/                               NEW module
    __init__.py
    schemas.py                       Pydantic response models (section 3.4)
    qchat_shap.py                    shap.Explainer + counterfactual + LIME
    facial_gradcam.py                Port of GradCAM_ASD class from notebook
    facial_probe.py                  Linear probe coefficient attribution
    fusion_attribution.py            Section 4.1 math + agreement bucket
    clinical_translator.py           SHAP → plain English, with A-code → behaviour map
    qchat_feature_map.py             12-feature → DSM-5 criterion + behaviour name table
    figure_render.py                 base64 PNG encoding helpers
  routers/
    asd_router.py                    Add 4 new endpoints; load explainers at module init
```

### 6.2 Loading strategy
All explainers load **once at module import**, same as current `xgb_final` and `fold_5_best` loading in `asd_router.py`:
```python
# backEnd/xai/__init__.py
from xai.qchat_shap import build_shap_explainer
from xai.facial_gradcam import GradCAM_ASD

SHAP_EXPLAINER = build_shap_explainer(xgb_final)    # one-time
GRADCAM        = GradCAM_ASD(fold5_model, target_conv_layer='conv2d_14')
```

**No new heavy dependencies.** `shap`, `matplotlib`, `opencv-python` are already in `requirements.txt`. Only `lime` is new; add `lime==0.2.0.1` to requirements.

### 6.3 Port the existing GradCAM code verbatim
The `GradCAM_ASD` class in `stage4_final_model_evaluation.ipynb` §5 works on a loaded model in-place. Copy it into `backEnd/xai/facial_gradcam.py` with a single change: accept a numpy RGB array from `/predict-face` instead of reading from disk. Preserve VGG mean subtraction and `conv2d_14` target exactly.

### 6.4 Port the SHAP pattern verbatim
```python
# backEnd/xai/qchat_shap.py
import shap

def build_shap_explainer(xgb_model):
    # pass a small background set if available; otherwise Explainer will handle it
    return shap.Explainer(xgb_model)   # XGBoost 2.x compatible

def explain_row(explainer, feature_vector, feature_names):
    exp = explainer(feature_vector[None, :])    # (1, n_features)
    values = exp.values[0]
    base = float(exp.base_values[0])
    return base, values
```

This replicates the pattern already proven in `sector2/Stage_2/qchat_model_training.ipynb`.

### 6.5 Clinical translator — feature name table
Derived directly from Q-CHAT-10 and the Stage-2 SHAP ranking we have:

| Code | Behaviour | DSM-5 criterion | Mean \|SHAP\| (Stage-2) |
|------|-----------|-----------------|------------------------|
| A4 | Protodeclarative pointing (joint attention) | A2 – nonverbal communication | 1.57 |
| A7 | Empathic response | A1 – social-emotional reciprocity | 1.53 |
| A8 | Typicality of first words | B – restricted/repetitive | 1.21 |
| A1 | Response to name | A1 – social-emotional reciprocity | 1.14 |
| A9 | Use of simple gestures | A2 – nonverbal communication | 1.13 |
| A10 | Visual fixation / unusual staring | B – restricted/repetitive | 1.08 |
| A2 | Eye contact quality | A1 – social-emotional reciprocity | 0.93 |
| A6 | Gaze following | A2 – nonverbal communication | 0.88 |
| A5 | Pretend play | A3 – peer relationships | 0.87 |
| A3 | Protoimperative pointing | A2 – nonverbal communication | 0.41 |
| Sex_M | Sex (male) | — | 0.34 |
| Family_mem_with_ASD_Yes | Family history | — | 0.13 |

These names + DSM-5 labels go in `backEnd/xai/qchat_feature_map.py` as a dict. The translator uses them to emit sentences like: *"The strongest driver of this score was A4 (pointing to show shared interest, a nonverbal communication indicator), which contributed 31% of the absolute SHAP magnitude."*

### 6.6 Frontend components
```
frontEnd/components/xai/
  ShapContributionsChart.tsx      horizontal bar; green = decreases risk, red = increases
  ShapWaterfall.tsx                optional; alternative view
  CounterfactualTable.tsx          "if A4 were 0, score drops to 45% (-23pp)"
  GradcamOverlay.tsx               renders base64 PNG with toggle and caveat tooltip
  ModalityAttributionBar.tsx       stacked bar showing facial vs qchat contributions
  AgreementBadge.tsx               3-colour state badge + tooltip
  PlainLanguagePanel.tsx           expandable text card
```

Wire `ShapContributionsChart + CounterfactualTable + PlainLanguagePanel` into `asd-qchat-result.tsx`.
Wire `ModalityAttributionBar + AgreementBadge + GradcamOverlay (toggle) + PlainLanguagePanel` into `asd-result.tsx`.

### 6.7 New research notebooks
```
mlModels/autisumDetect/sector4_xai/
  01_shap_analysis.ipynb                 full SHAP; per-prediction values; stability; top-driver profile
  02_agreement_vs_correctness.ipynb      section 4.2 experiment
  03_gradcam_faithfulness.ipynb          AUC-Del / AUC-Ins on full blind test
  04_shap_vs_lime.ipynb                  method comparison on 300 rows
  05_case_studies.ipynb                  the 6 canonical cases rendered end-to-end
  results/
    agreement_bucket_metrics.json
    gradcam_faithfulness.json
    shap_stability.json
  plots/
    agreement_vs_correctness.png
    gradcam_deletion_insertion_curves.png
    shap_vs_lime_rank_agreement.png
    case_study_*.png   (6 files)
```

### 6.8 Timeline (realistic, 2-3 weeks)
| Week | Deliverables |
|------|-------------|
| 1 | `xai/schemas.py`, `qchat_shap.py`, `facial_probe.py`, `fusion_attribution.py`, `clinical_translator.py`. `/explain-qchat` + `/explain-fused` endpoints functional. Notebook 01. |
| 2 | `facial_gradcam.py` (ported class) and `/explain-face` + `/explain-all`. Frontend components wired into both result screens. Notebook 02 (agreement experiment). |
| 3 | Notebook 03 (faithfulness), 04 (SHAP vs LIME), 05 (case studies). Thesis chapter draft. Optional user study. |

---

## 7. Thesis Integration

### 7.1 New chapter (20-25 pages)
**Chapter 6 — Explainability for Multi-Modal ASD Screening**
- 6.1 Motivation (references § 1)
- 6.2 Related work (§ 2)
- 6.3 Method
  - 6.3.1 SHAP on the Q-CHAT XGBoost (extends existing offline work to live inference)
  - 6.3.2 Grad-CAM on the facial CNN (ported class, target `conv2d_14`)
  - 6.3.3 Linear-probe coefficient attribution as a complement to Grad-CAM
  - 6.3.4 One-flip counterfactuals for Q-CHAT
  - 6.3.5 **Per-sample fusion attribution + agreement-as-confidence** (§ 4)
  - 6.3.6 Clinical translator (§ 6.5)
- 6.4 Evaluation
  - 6.4.1 Faithfulness (AUC-Del / AUC-Ins, SHAP stability)
  - 6.4.2 Cross-method agreement (SHAP vs LIME)
  - 6.4.3 Agreement-vs-correctness experiment and deployment threshold
  - 6.4.4 Six case studies
- 6.5 Discussion
  - Does XAI fix the GradCAM-exposed confound? (Honest answer: no — but it surfaces it to the user)
  - Limits of SHAP on a model that reconstructs a scoring rule (the A1-A10 beeswarm is honest, not a discovery)
- 6.6 Summary

### 7.2 Knock-on additions
- Chapter 3 (Background): ~3 pages on SHAP, Grad-CAM, LIME, counterfactuals
- Chapter 4 (System Design): updated architecture figure with XAI layer
- Chapter 7 (Conclusion): explainability listed as distinct contribution
- Abstract + intro strengthened with one sentence each

### 7.3 Publication target
Realistic: **IEEE ICIIS or IEEE SCSE** (both SLIIT-adjacent, student-friendly short paper). Stretch: **IEEE EMBC** if a clinician co-author can be added.

---

## 8. Honest Limitations (pre-emptive)
1. XAI does not fix the dataset confound. Grad-CAM still shows the model attending to age/photo-style. XAI *surfaces* this problem rather than resolves it — argue in the thesis that surfacing it to the end user is itself valuable.
2. SHAP on the Q-CHAT XGBoost essentially re-derives the clinically hand-crafted Q-CHAT rule (all A1-A10 dominate, demographics near-zero). We cannot claim novel clinical insight from this — only that the model's behaviour is consistent with the instrument.
3. No clinician-in-the-loop validation. We can claim internal faithfulness (AUC-Del/Ins), not clinical utility.
4. Fusion attribution assumes linear fusion (α·p + (1-α)·p). Extends trivially to any linear combination. Non-linear fusion would require a different decomposition.
5. Agreement-vs-correctness is computed on synthetically paired blind-test samples because the two streams have no true patient overlap. State this plainly. It is the same limitation sector3 already acknowledges.
6. The optional user study (N≈5-10) is formative, not confirmatory.

Addressing limitations honestly **increases** the score; do not hide them.

---

## 9. Score Projection (informed by the real numbers now)

| Dimension | Current | After Tier 1 (qchat + fusion explain) | After Tier 1 + 2 (+ Grad-CAM, faithfulness, agreement experiment) |
|-----------|---------|--------------------------------------|-----------------------------------------------------------------|
| Problem relevance | 8/10 | 9/10 | 9/10 |
| Methodology depth | 9/10 | 9/10 | 9.5/10 |
| Technical implementation | 8/10 | 8.5/10 | 8.5/10 |
| Dataset quality | 5/10 | 5/10 | 5/10 |
| Results honesty | 9/10 | 9/10 | 9.5/10 |
| Novelty | 7/10 | 8/10 | **8.5/10** |
| End-to-end integration | 7/10 | 8/10 | 8.5/10 |
| Documentation | 7/10 | 8/10 | 8.5/10 |
| **Weighted average** | **7.5/10** | **8.2/10** | **8.7/10** |

---

## 10. Definition of Done
- [ ] All 4 `/api/asd/explain-*` endpoints returning valid Pydantic responses
- [ ] `backEnd/xai/` module with unit tests per component
- [ ] 5 notebooks in `mlModels/autisumDetect/sector4_xai/`, each with results + plots saved
- [ ] `asd-qchat-result.tsx` shows SHAP bar + counterfactual + plain language
- [ ] `asd-result.tsx` shows modality bar + agreement badge + Grad-CAM toggle + plain language
- [ ] Agreement-vs-correctness experiment produces a defensible τ threshold
- [ ] Grad-CAM faithfulness table in the thesis (AUC-Del, AUC-Ins per class)
- [ ] SHAP stability table (Spearman ≥ 0.9 target)
- [ ] Chapter 6 drafted (first pass)
- [ ] Paper outline (5-8 pages) for ICIIS/SCSE

---

## 11. Immediate Next Steps
1. Create empty scaffold under `backEnd/xai/`.
2. Port `shap.Explainer` pattern first (cheapest win, highest research value) + fusion attribution math.
3. Wire `/api/asd/explain-qchat` and `/api/asd/explain-fused`.
4. Build `ShapContributionsChart` + `ModalityAttributionBar` + `AgreementBadge` and drop them into the result screens.
5. Run `sector4_xai/01_shap_analysis.ipynb` and `02_agreement_vs_correctness.ipynb`.
6. Supervisor checkpoint before moving to Grad-CAM porting.

---

*This document replaces the earlier version and is grounded in the actual contents of sector1/2/3 notebooks and plots. Update it in-place as scope changes; do not fork it.*
