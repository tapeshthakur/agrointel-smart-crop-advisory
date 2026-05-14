from __future__ import annotations

import argparse
import json
import pickle
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    root_mean_squared_error,
)
from sklearn.model_selection import KFold, StratifiedKFold, cross_validate, train_test_split


def load_dataset(csv_path: str) -> pd.DataFrame:
    """Load dataset from CSV."""
    data = pd.read_csv(csv_path)
    if data.empty:
        raise ValueError(f"CSV file is empty: {csv_path}")
    return data


def parse_column_list(raw: Optional[str]) -> Optional[List[str]]:
    """Parse comma-separated column names."""
    if not raw:
        return None
    return [col.strip() for col in raw.split(",") if col.strip()]


def resolve_feature_columns(
    df: pd.DataFrame,
    feature_columns: Optional[List[str]],
    target_columns: List[str],
) -> List[str]:
    """Resolve feature columns from input or by inference."""
    if feature_columns:
        missing = [c for c in feature_columns if c not in df.columns]
        if missing:
            raise ValueError(f"Feature columns not found in dataset: {missing}")
        return feature_columns

    inferred = [c for c in df.columns if c not in target_columns]
    if not inferred:
        raise ValueError("No feature columns available after excluding target columns")
    return inferred


def split_data(
    X: pd.DataFrame,
    y: pd.Series,
    test_size: float,
    random_state: int,
    stratify: bool = False,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """Perform train-test split."""
    stratify_values = y if stratify else None
    return train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_values,
    )


def cross_validate_classifier(
    model: RandomForestClassifier,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    cv_folds: int,
) -> Dict[str, float]:
    """Run cross-validation for classifier."""
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    scores = cross_validate(
        model,
        X_train,
        y_train,
        cv=cv,
        scoring=["accuracy", "precision_weighted", "recall_weighted", "f1_weighted"],
    )
    return {
        "cv_accuracy_mean": float(scores["test_accuracy"].mean()),
        "cv_precision_weighted_mean": float(scores["test_precision_weighted"].mean()),
        "cv_recall_weighted_mean": float(scores["test_recall_weighted"].mean()),
        "cv_f1_weighted_mean": float(scores["test_f1_weighted"].mean()),
    }


def cross_validate_regressor(
    model: RandomForestRegressor,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    cv_folds: int,
) -> Dict[str, float]:
    """Run cross-validation for regressor."""
    cv = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
    scores = cross_validate(
        model,
        X_train,
        y_train,
        cv=cv,
        scoring=["neg_mean_absolute_error", "neg_root_mean_squared_error", "r2"],
    )
    return {
        "cv_mae_mean": float(-scores["test_neg_mean_absolute_error"].mean()),
        "cv_rmse_mean": float(-scores["test_neg_root_mean_squared_error"].mean()),
        "cv_r2_mean": float(scores["test_r2"].mean()),
    }


def evaluate_classifier(
    model: RandomForestClassifier,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> Dict[str, float]:
    """Evaluate classifier on test set."""
    preds = model.predict(X_test)
    return {
        "test_accuracy": float(accuracy_score(y_test, preds)),
        "test_precision_weighted": float(
            precision_score(y_test, preds, average="weighted", zero_division=0)
        ),
        "test_recall_weighted": float(
            recall_score(y_test, preds, average="weighted", zero_division=0)
        ),
        "test_f1_weighted": float(f1_score(y_test, preds, average="weighted", zero_division=0)),
    }


def evaluate_regressor(
    model: RandomForestRegressor,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> Dict[str, float]:
    """Evaluate regressor on test set."""
    preds = model.predict(X_test)
    rmse = root_mean_squared_error(y_test, preds)
    return {
        "test_mae": float(mean_absolute_error(y_test, preds)),
        "test_rmse": float(rmse),
        "test_r2": float(r2_score(y_test, preds)),
    }


def feature_importance_dataframe(model, feature_names: List[str]) -> pd.DataFrame:
    """Build sorted feature-importance dataframe."""
    importance_df = pd.DataFrame(
        {"feature": feature_names, "importance": model.feature_importances_}
    )
    return importance_df.sort_values("importance", ascending=False).reset_index(drop=True)


def save_versioned_pickle(model, output_dir: Path, model_prefix: str) -> Path:
    """Save model as versioned pickle file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = output_dir / f"{model_prefix}_v{timestamp}.pkl"
    with model_path.open("wb") as fp:
        pickle.dump(model, fp)
    return model_path


def save_json(data: Dict[str, float], output_path: Path) -> None:
    """Save metrics dictionary to JSON."""
    with output_path.open("w", encoding="utf-8") as fp:
        json.dump(data, fp, indent=2)


def run_classifier_pipeline(
    df: pd.DataFrame,
    feature_columns: List[str],
    target_column: str,
    args: argparse.Namespace,
) -> Dict[str, str]:
    """Train/evaluate/save classifier pipeline."""
    if target_column not in df.columns:
        raise ValueError(f"Classification target not found: {target_column}")

    X = df[feature_columns]
    y = df[target_column]

    X_train, X_test, y_train, y_test = split_data(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=True,
    )

    model = RandomForestClassifier(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        random_state=args.random_state,
        n_jobs=-1,
    )

    cv_metrics = cross_validate_classifier(model, X_train, y_train, args.cv_folds)
    model.fit(X_train, y_train)
    test_metrics = evaluate_classifier(model, X_test, y_test)
    all_metrics = {**cv_metrics, **test_metrics}

    base_name = f"rf_classifier_{target_column}"
    model_path = save_versioned_pickle(model, args.output_dir, base_name)

    metrics_path = args.output_dir / f"{base_name}_metrics.json"
    save_json(all_metrics, metrics_path)

    fi_df = feature_importance_dataframe(model, feature_columns)
    fi_path = args.output_dir / f"{base_name}_feature_importance.csv"
    fi_df.to_csv(fi_path, index=False)

    return {
        "model": str(model_path),
        "metrics": str(metrics_path),
        "feature_importance": str(fi_path),
    }


def run_regressor_pipeline(
    df: pd.DataFrame,
    feature_columns: List[str],
    target_column: str,
    args: argparse.Namespace,
) -> Dict[str, str]:
    """Train/evaluate/save regressor pipeline."""
    if target_column not in df.columns:
        raise ValueError(f"Regression target not found: {target_column}")

    X = df[feature_columns]
    y = df[target_column]

    X_train, X_test, y_train, y_test = split_data(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=False,
    )

    model = RandomForestRegressor(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        random_state=args.random_state,
        n_jobs=-1,
    )

    cv_metrics = cross_validate_regressor(model, X_train, y_train, args.cv_folds)
    model.fit(X_train, y_train)
    test_metrics = evaluate_regressor(model, X_test, y_test)
    all_metrics = {**cv_metrics, **test_metrics}

    base_name = f"rf_regressor_{target_column}"
    model_path = save_versioned_pickle(model, args.output_dir, base_name)

    metrics_path = args.output_dir / f"{base_name}_metrics.json"
    save_json(all_metrics, metrics_path)

    fi_df = feature_importance_dataframe(model, feature_columns)
    fi_path = args.output_dir / f"{base_name}_feature_importance.csv"
    fi_df.to_csv(fi_path, index=False)

    return {
        "model": str(model_path),
        "metrics": str(metrics_path),
        "feature_importance": str(fi_path),
    }


def build_arg_parser() -> argparse.ArgumentParser:
    """Build CLI parser."""
    parser = argparse.ArgumentParser(description="Random Forest crop training pipeline")
    parser.add_argument("--csv-path", required=True, help="Path to source CSV file")
    parser.add_argument(
        "--feature-columns",
        default=None,
        help="Comma-separated feature column names. If omitted, inferred from all non-target columns.",
    )
    parser.add_argument(
        "--classification-target",
        default=None,
        help="Target column for RandomForestClassifier (e.g., recommended_crop)",
    )
    parser.add_argument(
        "--regression-target",
        default=None,
        help="Target column for RandomForestRegressor (e.g., expected_yield)",
    )
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio")
    parser.add_argument("--cv-folds", type=int, default=5, help="Cross-validation folds")
    parser.add_argument("--n-estimators", type=int, default=300, help="Number of trees")
    parser.add_argument("--max-depth", type=int, default=None, help="Max tree depth")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed")
    parser.add_argument(
        "--output-dir",
        default="models",
        help="Output folder for versioned model and artifacts",
    )
    return parser


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()

    if not args.classification_target and not args.regression_target:
        raise ValueError("Provide at least one target: --classification-target and/or --regression-target")

    df = load_dataset(args.csv_path)

    target_columns = [
        c for c in [args.classification_target, args.regression_target] if c is not None
    ]

    feature_columns = resolve_feature_columns(
        df,
        parse_column_list(args.feature_columns),
        target_columns,
    )

    args.output_dir = Path(args.output_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    outputs: Dict[str, Dict[str, str]] = {}

    if args.classification_target:
        outputs["classifier"] = run_classifier_pipeline(
            df, feature_columns, args.classification_target, args
        )

    if args.regression_target:
        outputs["regressor"] = run_regressor_pipeline(
            df, feature_columns, args.regression_target, args
        )

    print(json.dumps(outputs, indent=2))


if __name__ == "__main__":
    main()
