import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
import joblib
import shap

# Optional EBM model
try:
    from interpret.glassbox import ExplainableBoostingRegressor
    use_ebm = True
except:
    use_ebm = False

# -----------------------------------------------------------
# 1. LOAD DATASET

DATA_PATH = "postpartum_dataset.xlsx"
df = pd.read_excel(DATA_PATH)

print("Dataset shape:", df.shape)
print(df.head())

# -----------------------------------------------------------
# 2. BASIC EDA PLOTS

os.makedirs("plots", exist_ok=True)

plt.figure(figsize=(6,4))
df["age"].hist()
plt.title("Age distribution")
plt.savefig("plots/age_distribution.png")
plt.close()

plt.figure(figsize=(6,4))
sns.boxplot(x="delivery_type", y="back_pelvic_pain_score", data=df)
plt.title("Back/Pelvic Pain by Delivery Type")
plt.savefig("plots/backpelvic_by_delivery.png")
plt.close()

# Correlation (numeric only)
num_cols = df.select_dtypes(include=[np.number]).columns
plt.figure(figsize=(10,8))
sns.heatmap(df[num_cols].corr(), annot=True, cmap="coolwarm")
plt.title("Correlation Heatmap")
plt.savefig("plots/correlation_heatmap.png")
plt.close()

print("Saved EDA plots → /plots")

# -----------------------------------------------------------
# 3. EPDS SCORE PROCESSING

epds_cols = [
    'epds_q1_laugh_funny','epds_q2_enjoyment','epds_q3_self_blame',
    'epds_q4_anxious','epds_q5_scared_panicky','epds_q6_cope',
    'epds_q7_sleeping_unhappy','epds_q8_sad_miserable',
    'epds_q9_crying','epds_q10_harm_thought'
]

df["epds_total_score"] = df[epds_cols].sum(axis=1)
df["epds_risk_level"] = pd.cut(df["epds_total_score"], bins=[-1,9,30], labels=["low","high"])

plt.figure(figsize=(6,4))
df["epds_total_score"].hist()
plt.title("EPDS Total Score Distribution")
plt.savefig("plots/epds_distribution.png")
plt.close()

print("EPDS processed.")

# -----------------------------------------------------------
# 4. APPLY PAIN LOGIC (DELIVERY TYPE RULES)

df.loc[df["delivery_type"].isin(["vaginal_no_tear", "vaginal_tear"]), "csection_pain_score"] = 0
df.loc[df["delivery_type"]=="csection", "perineal_pain_score"] = 0

# -----------------------------------------------------------
# 5. PREP ML FEATURES

targets = {
    "perineal": "perineal_pain_score",
    "csection": "csection_pain_score",
    "back_pelvic": "back_pelvic_pain_score"
}

# Features = everything except pain + EPDS
exclude_cols = list(targets.values()) + epds_cols + ["epds_total_score","epds_risk_level"]
X_all = df.drop(columns=exclude_cols)

# Identify numeric and categorical
numeric_features = X_all.select_dtypes(include=["int64","float64"]).columns.tolist()
categorical_features = [c for c in X_all.columns if c not in numeric_features]

# -----------------------------------------------------------
# 6. FIX ALL CATEGORICAL MIXED TYPES


# sleep_hours: <3hrs, 3-5hrs, 6-7hrs, >7hrs  (safe)
# meals_per_day: 2,3,>3 → MUST be converted to strings
# fluid_intake: <1L,1-2L,2-3L,>3L (safe)
# fruit_veg_intake: <1, 1-2times, 3+ (safe)
# physical_activity: <15mins, 15-30mins, >30mins, none (safe)

# Convert categorical columns to strings
for c in categorical_features:
    X_all[c] = X_all[c].astype(str)

print("Categorical columns converted to strings.")

# -----------------------------------------------------------
# 7. PREPROCESSORS

numeric_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("onehot", OneHotEncoder(handle_unknown="ignore"))
])

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features)
    ]
)

# -----------------------------------------------------------
# 8. TRAINING FUNCTION

os.makedirs("models", exist_ok=True)

def train_and_evaluate(X, y, name="target"):
    results = {}

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    models = {
        "Ridge": Ridge(),
        "RandomForest": RandomForestRegressor(n_estimators=200, random_state=42),
        "XGBoost": xgb.XGBRegressor(n_estimators=200, random_state=42)
    }

    if use_ebm and name != "back_pelvic":
        models["EBM"] = ExplainableBoostingRegressor()

    for mname, model in models.items():
        print(f"Training {mname} for {name} pain...")

        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", model)
        ])

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = mean_squared_error(y_test, y_pred) ** 0.5
        r2 = r2_score(y_test, y_pred)

        print(f"{mname}: MAE={mae:.3f}, RMSE={rmse:.3f}, R2={r2:.3f}")

        results[mname] = {
            "pipeline": pipeline,
            "mae": mae,
            "rmse": rmse,
            "r2": r2
        }

    best = min(results.items(), key=lambda x: x[1]["mae"])
    best_name = best[0]
    best_model = best[1]["pipeline"]

    joblib.dump(best_model, f"models/{name}_{best_name}.joblib")
    print(f"Saved best model → models/{name}_{best_name}.joblib\n")

    return best_model, results


# -----------------------------------------------------------
# 9. TRAIN ALL TARGET MODELS

best_models = {}

for pain_name, target_col in targets.items():
    best_model, results = train_and_evaluate(X_all, df[target_col], name=pain_name)
    best_models[pain_name] = best_model

# -----------------------------------------------------------
# 10. SHAP EXPLANATIONS (example: back_pelvic model)

print("Generating SHAP explanations (back_pelvic)...")

model = best_models["back_pelvic"]
model_step = model.named_steps["model"]
preprocessor_step = model.named_steps["preprocessor"]

sample = X_all.sample(200, random_state=42)
sample_trans = preprocessor_step.transform(sample)

if isinstance(model_step, (RandomForestRegressor, xgb.XGBRegressor)):
    explainer = shap.TreeExplainer(model_step)
    shap_values = explainer.shap_values(sample_trans)
    shap.summary_plot(shap_values, sample_trans, show=False)
    plt.savefig("plots/shap_backpelvic.png")
    plt.close()

print("SHAP saved → plots/shap_backpelvic.png")

# -----------------------------------------------------------
# 11. SAVE CLEANED DATASET

df.to_csv("postpartum_dataset_cleaned.csv", index=False)
print("Saved cleaned dataset → postpartum_dataset_cleaned.csv")

print("\nALL DONE SUCCESSFULLY 🎉")