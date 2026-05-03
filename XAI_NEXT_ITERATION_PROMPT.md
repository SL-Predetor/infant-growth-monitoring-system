# Next Iteration — XAI Implementation Kickoff Prompt

Paste everything between the triple fences below as the first message in a fresh Claude Code session running from `C:\Users\Yasindu\Desktop\Research\infant-growth-monitoring-system\`.

---

```
I'm implementing the XAI (Explainable AI) extension for my SLIIT final-year research
project — the ASD detection system that lives in this repo.

READ FIRST:
- `CLAUDE.md` — full project context (backend, frontend, models, paths)
- `XAI_RESEARCH_PLAN.md` — the approved implementation plan (26 KB, detailed)

SCOPE DECISION — FULL RESEARCH-GRADE (option B):
Build the backend XAI module, all four explain-endpoints, the frontend XAI
components on both result screens, AND all 5 research notebooks
(01 through 05). Target score: 8.7/10, paper draft for IEEE ICIIS/SCSE.

WHAT ALREADY EXISTS (do NOT rewrite — port it):
- `GradCAM_ASD` class: `mlModels/autisumDetect/sector1/Stage_4/stage4_final_model_evaluation.ipynb` §5.
  Target layer `conv2d_14`. VGG mean subtraction, nested-backbone handling, JET overlay.
  Port verbatim into `backEnd/xai/facial_gradcam.py`; only change is accepting a numpy
  RGB array from the endpoint instead of reading from disk.
- SHAP pattern: `mlModels/autisumDetect/sector2/Stage_2/qchat_model_training.ipynb`
  uses `shap.Explainer(xgb_final, X)` (XGBoost-2.x compatible). Reuse this pattern
  in `backEnd/xai/qchat_shap.py`.
- LogReg probe + scaler: already loaded in `backEnd/routers/asd_router.py`. The
  `logreg_probe.coef_` vector is a free linear-attribution tool — use it for
  per-embedding-dimension contributions in `backEnd/xai/facial_probe.py`.
- Calibration / Brier / ECE / bootstrap CI helpers: already exist in
  `sector1/Stage_4/stage4_advanced_evaluation.ipynb` and
  `sector2/Stage_2/qchat_model_training.ipynb`. Reuse.

WHAT'S GENUINELY NEW (this is the novelty):
- Per-sample fusion attribution (facial vs qchat contribution per prediction)
- Cross-modal agreement-as-confidence (|P_facial − P_qchat| → auto-approve vs flag)
- Agreement-vs-correctness empirical experiment (notebook 02)
- One-flip counterfactuals for Q-CHAT (flip one answer → measure ΔP)
- SHAP-vs-LIME comparison study (notebook 04)
- Clinical translator (SHAP values → plain-language sentences with DSM-5 mapping)
- Live XAI endpoints served from FastAPI (offline artefacts → live responses)

KEY CONSTRAINTS:
- Do NOT commit to git — I'll handle commits and merges.
- Do NOT add heavy dependencies. Only `lime==0.2.0.1` is new.
  `shap`, `matplotlib`, `opencv-python` are already in `backEnd/requirements.txt`.
- Preserve VGG-Face preprocessing exactly: 224×224, BGR (swap with img[..., ::-1]),
  subtract means [93.5940, 104.7624, 129.1863], NO /255 normalization.
- LABEL CONVENTION (critical — sign of every SHAP/coef value depends on this):
  filesystem has Autistic=0 (alphabetical), Non_Autistic=1. Training applies a
  `1 - y` flip so the MODEL target is Autistic=1, Non_Autistic=0. All XAI
  outputs must use the POST-FLIP convention: a positive SHAP value means
  "pushes toward ASD", a negative means "pushes toward Non-ASD". Verify this
  once empirically in notebook 01 before trusting any explanation.
- Preserve fusion constants exactly: α=0.15, FACIAL_THRESHOLD=0.06,
  QCHAT_THRESHOLD=0.35, FUSION_THRESHOLD=0.35.
- Model paths (per `backEnd/routers/asd_router.py` and CLAUDE.md §2 — the router
  resolves `PROJECT_ROOT / "mlModels"`, NOT `backEnd/mlModels/`):
    - mlModels/autisumDetect/sector1/Stage_4/models/fold_5_best.h5  (gitignored, ~525 MB)
    - mlModels/autisumDetect/sector1/Stage_4/models/logreg_probe_model.pkl
    - mlModels/autisumDetect/sector1/Stage_4/models/logreg_probe_scaler.pkl
    - mlModels/autisumDetect/sector2/Stage_2/models/xgboost_qchat_stage2.pkl
    - mlModels/autisumDetect/sector2/Stage_2/models/qchat_feature_columns.pkl
  Note: `backEnd/mlModels/` is a legacy duplicate excluded from Docker; do not
  create new files there.
- Windows shell: use `robocopy` not `rsync`; use forward slashes in bash paths.
- On any file copy from another folder, exclude `.ipynb_checkpoints/` and `tt/`.

BUILD ORDER (follow XAI_RESEARCH_PLAN.md §6.8 timeline):

WEEK 1 — Q-CHAT XAI + fusion attribution backend (focus: live endpoints)
  1. Create `backEnd/xai/` module with empty files per plan §6.1
  2. Implement `backEnd/xai/schemas.py` with the Pydantic models in plan §3.4
  3. Implement `backEnd/xai/qchat_feature_map.py` with the DSM-5 table from plan §6.5
  4. Implement `backEnd/xai/qchat_shap.py` — port the `shap.Explainer` pattern;
     add one-flip counterfactuals; optional LIME stub
  5. Implement `backEnd/xai/fusion_attribution.py` — the math from plan §4.1
     (contributions, shares, dominant_modality, disagreement, agreement_bucket)
  6. Implement `backEnd/xai/clinical_translator.py` — SHAP → sentences;
     disagreement → "flag for clinician review" copy
  7. Add endpoints `/api/asd/explain-qchat` and `/api/asd/explain-fused`
     in `backEnd/routers/asd_router.py`. Load `SHAP_EXPLAINER` at module init.
  8. Smoke-test each endpoint with curl; verify response shapes match schemas.
  9. Empirically confirm SHAP sign convention matches the post-flip label
     convention: craft a Q-CHAT input where every answer is maximally
     typical (answers that score 0 in the raw Q-CHAT rubric), verify
     P(ASD) is low and all SHAP values are near zero or negative.

  Notebook 01 moves to start of Week 2 (it is a full stability bootstrap and
  does not fit alongside the backend work in one week).

WEEK 2 — Notebook 01 + Grad-CAM backend + frontend XAI components
  1. Create `mlModels/autisumDetect/sector4_xai/01_shap_analysis.ipynb`:
     full SHAP on Stage-2 test set; per-prediction values; stability
     bootstrap (1000 samples, Spearman rank); top-driver profile; save
     JSON + plots to `sector4_xai/results/` and `sector4_xai/plots/`.
  2. Implement `backEnd/xai/facial_gradcam.py` — port `GradCAM_ASD` class verbatim
  3. Implement `backEnd/xai/facial_probe.py` — rank embedding dims by
     |value × coef|; return top-10
  4. Implement `backEnd/xai/figure_render.py` — base64 PNG helpers
  5. Add endpoints `/api/asd/explain-face` and `/api/asd/explain-all`
  6. Create frontend XAI components in `frontEnd/components/xai/`:
       - ShapContributionsChart.tsx
       - CounterfactualTable.tsx
       - GradcamOverlay.tsx
       - ModalityAttributionBar.tsx
       - AgreementBadge.tsx
       - PlainLanguagePanel.tsx
  7. Wire into `frontEnd/app/(tabs)/asd-qchat-result.tsx` and
     `frontEnd/app/(tabs)/asd-result.tsx`. Expandable "Why this result?" section.

WEEK 3 — Agreement experiment, faithfulness, comparison, case studies, writeup
  1. Create `sector4_xai/02_agreement_vs_correctness.ipynb` — the experiment
     in plan §4.2. Fixed-seed pairing of blind test samples, compute accuracy
     per agreement bucket, χ² test, τ threshold sweep.
  2. Create `sector4_xai/03_gradcam_faithfulness.ipynb` — AUC-Del and AUC-Ins
     on full 392-image blind test. This is the empirical defense against the
     "GradCAM shows a dataset confound" finding already in the research.
  3. Create `sector4_xai/04_shap_vs_lime.ipynb` — Spearman rank agreement on
     300 Q-CHAT test rows, runtime comparison
  4. Create `sector4_xai/05_case_studies.ipynb` — 6 canonical cases (plan §5.2)
     with every plot and plain-language paragraph for each
  5. Draft Chapter 6 of the thesis under `mlModels/autisumDetect/sector4_xai/THESIS_CHAPTER_6.md`
  6. Draft a 5-8 page paper outline under `sector4_xai/PAPER_OUTLINE.md`

CHECKPOINTS:
- End of Week 1: show me the Q-CHAT explanation for a sample input, the fusion
  attribution breakdown, AND the empirical sign-convention check before moving on.
- End of Week 2: show me the full result screen rendering SHAP + modality bar +
  agreement badge for a test case, plus notebook 01 results.
- End of Week 3: show me the 6 case study plots and the faithfulness table.

START HERE:
Begin Week 1 step 1 — create the `backEnd/xai/` scaffold with all empty files,
then read `mlModels/autisumDetect/sector2/Stage_2/qchat_model_training.ipynb` to
get the exact SHAP pattern already used in research. Confirm the pattern
matches the plan, then proceed.
```

---

## How to use this

1. Commit/stash current work if needed
2. Close this Claude Code session
3. Open a new one with the working directory set to `C:\Users\Yasindu\Desktop\Research\infant-growth-monitoring-system\`
4. Paste the block above as the first message
5. The new session will auto-load `CLAUDE.md` and have the XAI plan in context

## If scope needs to shrink mid-way

Drop in this order — the first cut is cheap, each subsequent cut hurts more:

1. **First cut — drop notebook 04 (SHAP vs LIME).** Lowest-novelty of the five. Method comparison for its own sake; losing it does not weaken any core claim.
2. **Second cut — drop notebook 02 (agreement vs correctness).** Painful: this is the *novel contribution*. Only cut if Weeks 2-3 are genuinely running out. If this goes, keep the per-sample fusion attribution in the backend + describe the hypothesis conceptually in the thesis, but flag that the empirical validation is future work.
3. **Never cut notebook 03 (Grad-CAM faithfulness).** The existing research already flagged that Grad-CAM reveals a dataset confound (CLAUDE.md §3.2). Without AUC-Del / AUC-Ins you have no empirical defense when a reviewer asks "how do you know Grad-CAM is faithful given the confound?" This is load-bearing for thesis credibility.
4. **Never cut notebook 05 (case studies).** These become your thesis figures and paper illustrations. They are cheap once 01–03 have produced the underlying data.

Keeping 01, 03, 05 and the backend puts you at ~8.4/10 research-grade.
Adding 02 pushes to ~8.6/10 (the novelty claim is empirically backed).
Adding 04 pushes to ~8.7/10 (full rigor, method comparison included).
