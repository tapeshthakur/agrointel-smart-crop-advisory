from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
ML_DIR = PROJECT_ROOT / "ml"
ML_MODELS_DIR = ML_DIR / "models"
DB_PATH = PROJECT_ROOT / "backend" / "database" / "predictions.db"
DATASET_PATH = ML_DIR / "crop_data.csv"


st.set_page_config(page_title="Smart Crop Analytics", page_icon="🌾", layout="wide")
st.title("Smart Crop Advisory Analytics Dashboard")


def _latest_file(pattern: str) -> Path:
    candidates = list(ML_MODELS_DIR.glob(pattern))
    if not candidates:
        raise FileNotFoundError(f"No file matches pattern: {pattern}")
    return max(candidates, key=lambda p: p.stat().st_mtime)


@st.cache_data(show_spinner=False)
def load_metrics() -> Tuple[Dict[str, Any], Dict[str, Any]]:
    classifier_path = _latest_file("rf_classifier_*_metrics.json")
    regressor_path = _latest_file("rf_regressor_*_metrics.json")

    with classifier_path.open("r", encoding="utf-8") as fp:
        classifier = json.load(fp)
    with regressor_path.open("r", encoding="utf-8") as fp:
        regressor = json.load(fp)

    return classifier, regressor


@st.cache_data(show_spinner=False)
def load_feature_importance() -> pd.DataFrame:
    fi_path = _latest_file("rf_classifier_*_feature_importance.csv")
    return pd.read_csv(fi_path)


@st.cache_data(show_spinner=False)
def load_predictions() -> pd.DataFrame:
    if not DB_PATH.exists():
        return pd.DataFrame(
            columns=[
                "id",
                "timestamp",
                "input_data",
                "crop_prediction",
                "irrigation_prediction",
            ]
        )

    with sqlite3.connect(DB_PATH) as conn:
        df = pd.read_sql_query(
            """
            SELECT id, timestamp, input_data, crop_prediction, irrigation_prediction
            FROM predictions
            ORDER BY id DESC
            """,
            conn,
        )
    return df


@st.cache_data(show_spinner=False)
def build_confusion_matrix() -> Tuple[plt.Figure, pd.DataFrame]:
    model_path = _latest_file("rf_classifier_*_v*.pkl")
    model = joblib.load(model_path)
    data = pd.read_csv(DATASET_PATH)

    feature_order = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = data[feature_order]
    y_true = data["label"]
    y_pred = model.predict(X)

    labels = sorted(set(y_true))
    cm = confusion_matrix(y_true, y_pred, labels=labels)

    fig, ax = plt.subplots(figsize=(10, 7))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=labels)
    disp.plot(ax=ax, xticks_rotation=45, cmap="Blues", colorbar=False)
    ax.set_title("Classifier Confusion Matrix")
    plt.tight_layout()

    cm_df = pd.DataFrame(cm, index=labels, columns=labels)
    return fig, cm_df


def _render_model_performance() -> None:
    st.header("Model Performance")
    classifier, regressor = load_metrics()

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Accuracy", f"{classifier.get('test_accuracy', 0):.4f}")
    c2.metric("Precision", f"{classifier.get('test_precision_weighted', 0):.4f}")
    c3.metric("Recall", f"{classifier.get('test_recall_weighted', 0):.4f}")
    c4.metric("F1-score", f"{classifier.get('test_f1_weighted', 0):.4f}")

    r1, r2, r3 = st.columns(3)
    r1.metric("MAE", f"{regressor.get('test_mae', 0):.4f}")
    r2.metric("RMSE", f"{regressor.get('test_rmse', 0):.4f}")
    r3.metric("R²", f"{regressor.get('test_r2', 0):.4f}")

    st.subheader("Confusion Matrix")
    fig, cm_df = build_confusion_matrix()
    st.pyplot(fig, use_container_width=True)
    with st.expander("View confusion matrix values"):
        st.dataframe(cm_df)


def _render_feature_importance() -> None:
    st.header("Feature Importance")
    fi_df = load_feature_importance()

    fig, ax = plt.subplots(figsize=(10, 5))
    top_df = fi_df.head(10).iloc[::-1]
    ax.barh(top_df["feature"], top_df["importance"], color="#0f766e")
    ax.set_xlabel("Importance")
    ax.set_ylabel("Feature")
    ax.set_title("Top Feature Importances (Classifier)")
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)


def _render_prediction_analytics() -> None:
    st.header("Prediction Analytics")
    predictions = load_predictions()

    st.metric("Total predictions", int(len(predictions)))

    if predictions.empty:
        st.info("No predictions found in database yet.")
        return

    left, right = st.columns(2)

    with left:
        st.subheader("Crop Distribution")
        crop_counts = (
            predictions["crop_prediction"]
            .dropna()
            .replace("", pd.NA)
            .dropna()
            .value_counts()
        )
        if crop_counts.empty:
            st.info("No crop predictions logged yet.")
        else:
            fig, ax = plt.subplots(figsize=(6, 6))
            ax.pie(crop_counts.values, labels=crop_counts.index, autopct="%1.1f%%", startangle=90)
            ax.axis("equal")
            st.pyplot(fig, use_container_width=True)

    with right:
        st.subheader("Irrigation Prediction Trend")
        trend_df = predictions[["timestamp", "irrigation_prediction"]].copy()
        trend_df["timestamp"] = pd.to_datetime(trend_df["timestamp"], errors="coerce")
        trend_df = trend_df.dropna(subset=["timestamp", "irrigation_prediction"]).sort_values("timestamp")

        if trend_df.empty:
            st.info("No irrigation predictions logged yet.")
        else:
            st.line_chart(
                trend_df.set_index("timestamp")["irrigation_prediction"],
                use_container_width=True,
            )

    st.subheader("Recent Predictions")
    preview = predictions.head(20).copy()
    st.dataframe(preview, use_container_width=True)


try:
    _render_model_performance()
    _render_feature_importance()
    _render_prediction_analytics()
except Exception as exc:
    st.error(f"Dashboard failed to load data: {exc}")
