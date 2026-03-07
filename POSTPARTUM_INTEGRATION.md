# Postpartum Backend Integration Notes

This document explains how the postpartum pain prediction backend has
been merged into the infant-growth-monitoring-system project.

## Location of code

All postpartum-related Python code now resides under:

```
backEnd/postpartum/
```

Files of interest:

* `api.py` – FastAPI router exposing `/postpartum/*` endpoints.
* `painpredict.py` – standalone script copied from original project.
* `postpartum_pipeline.py` – data preparation & training pipeline.
* `models/` – directory where the three joblib models should be placed.

## Routing

`backEnd/app.py` imports and includes the postpartum router:

```python
from postpartum import router as postpartum_router
app.include_router(postpartum_router)
```

The router mounts at `/postpartum` and provides:

* `GET /postpartum/health` – returns model loaded status
* `POST /postpartum/predict` – accepts `MotherInput` JSON and returns
  pain scores and guidance
* `GET /postpartum/history` – placeholder returning empty list
* `DELETE /postpartum/history` – placeholder with disabled message

The database dependencies have been removed for now; history endpoints
return static results and can be extended later.

## Models

Place your `.joblib` model files inside
`backEnd/postpartum/models/` so that the API can load them. They are
resolved relative to the package using:

```python
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
```

## Dependencies

Additional backend requirements were added to
`backEnd/requirements.txt`:

```
shap==0.50.0
seaborn==0.13.2
```

Run `pip install -r backEnd/requirements.txt` in the backend virtual
environment to install them.

## Database

The original project used a SQLite database via `SessionLocal` and
`PredictionRecord`.  Those imports and related code have been removed in
the router; you can re‑introduce them later when you decide to add a
database to the main project.

## Running the backend

1. `cd backEnd`
2. Activate your virtualenv (`.venv\Scripts\activate`)
3. `pip install -r requirements.txt` (done earlier)
4. `python app.py`

The postpartum endpoints will be available at
`http://localhost:8000/postpartum/…` alongside the existing cry-analysis
routes.

---

This file can be expanded when you add frontend or database support.