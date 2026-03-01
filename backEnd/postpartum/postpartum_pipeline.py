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

# (remaining code omitted for brevity, but copy from original if needed)
