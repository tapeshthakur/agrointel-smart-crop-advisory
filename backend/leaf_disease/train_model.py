from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import numpy as np


IMAGE_SIZE: Tuple[int, int] = (224, 224)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train MobileNetV2 on PlantVillage leaf disease classes.")
    parser.add_argument("--dataset-dir", required=True, help="Directory containing one subfolder per PlantVillage class.")
    parser.add_argument("--output-dir", default="ml/models", help="Where model, labels, and report files are saved.")
    parser.add_argument("--epochs", type=int, default=12, help="Frozen-base training epochs.")
    parser.add_argument("--fine-tune-epochs", type=int, default=8, help="Fine-tuning epochs.")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--fine-tune-at", type=int, default=100, help="Unfreeze MobileNetV2 layers from this index.")
    parser.add_argument(
        "--no-class-weights",
        action="store_true",
        help="Disable inverse-frequency class weights for imbalanced datasets.",
    )
    return parser.parse_args()


def configure_gpu(tf) -> None:
    gpus = tf.config.list_physical_devices("GPU")
    for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)
    print(f"GPU devices: {[gpu.name for gpu in gpus] or ['CPU only']}")


def _image_files(directory: Path) -> List[Path]:
    extensions = {".jpg", ".jpeg", ".png", ".bmp", ".gif"}
    return [path for path in directory.rglob("*") if path.is_file() and path.suffix.lower() in extensions]


def resolve_dataset_dir(dataset_dir: Path) -> Path:
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_dir}")

    wrapper_dir = dataset_dir / "PlantVillage"
    if wrapper_dir.is_dir() and any(child.is_dir() for child in wrapper_dir.iterdir()):
        print(f"Detected nested PlantVillage folder; using clean class root: {wrapper_dir}")
        return wrapper_dir

    nested_class_dirs = [
        child
        for child in dataset_dir.iterdir()
        if child.is_dir() and any(grandchild.is_dir() for grandchild in child.iterdir())
    ]
    if nested_class_dirs:
        names = ", ".join(child.name for child in nested_class_dirs[:5])
        raise ValueError(
            "Dataset directory must contain one image folder per class. "
            f"Found nested directories under: {names}. Pass the actual class root instead."
        )

    return dataset_dir


def class_distribution(dataset_dir: Path) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for child in sorted(path for path in dataset_dir.iterdir() if path.is_dir()):
        counts[child.name] = len(_image_files(child))
    return counts


def build_class_weights(class_names: Sequence[str], counts: Dict[str, int]) -> Dict[int, float]:
    total = sum(counts.get(name, 0) for name in class_names)
    if not total or not class_names:
        return {}

    class_count = len(class_names)
    weights: Dict[int, float] = {}
    for index, class_name in enumerate(class_names):
        count = max(1, counts.get(class_name, 0))
        weights[index] = round(float(total / (class_count * count)), 6)
    return weights


def load_datasets(tf, args: argparse.Namespace):
    dataset_dir = resolve_dataset_dir(Path(args.dataset_dir))
    train_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        validation_split=args.validation_split,
        subset="training",
        seed=args.seed,
        image_size=IMAGE_SIZE,
        batch_size=args.batch_size,
        label_mode="int",
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        validation_split=args.validation_split,
        subset="validation",
        seed=args.seed,
        image_size=IMAGE_SIZE,
        batch_size=args.batch_size,
        label_mode="int",
    )

    class_names = list(train_ds.class_names)
    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)
    return train_ds, val_ds, class_names, dataset_dir, class_distribution(dataset_dir)


def build_model(tf, class_count: int, fine_tune_at: int):
    layers = tf.keras.layers
    data_augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.08),
            layers.RandomZoom(0.12),
            layers.RandomBrightness(0.15),
        ],
        name="augmentation",
    )

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(*IMAGE_SIZE, 3))
    x = data_augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.25)(x)
    outputs = layers.Dense(class_count, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs, name="leaf_disease_mobilenetv2")

    return model, base_model, max(0, fine_tune_at)


def compile_model(tf, model, learning_rate: float) -> None:
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )


def validation_predictions(model, val_ds) -> Tuple[List[int], List[int]]:
    y_true: List[int] = []
    y_pred: List[int] = []
    for images, labels in val_ds:
        predictions = model.predict(images, verbose=0)
        y_true.extend(labels.numpy().astype(int).tolist())
        y_pred.extend(np.argmax(predictions, axis=1).astype(int).tolist())
    return y_true, y_pred


def per_class_accuracy(matrix: np.ndarray, class_names: List[str]) -> Dict[str, float]:
    scores: Dict[str, float] = {}
    for index, class_name in enumerate(class_names):
        total = int(matrix[index].sum())
        correct = int(matrix[index, index])
        scores[class_name] = round(float(correct / total), 4) if total else 0.0
    return scores


def save_confusion_matrix_csv(matrix: np.ndarray, class_names: List[str], output_path: Path) -> None:
    with output_path.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.writer(fp)
        writer.writerow(["actual\\predicted", *class_names])
        for class_name, row in zip(class_names, matrix.tolist()):
            writer.writerow([class_name, *row])


def merge_histories(*histories) -> Dict[str, List[float]]:
    merged: Dict[str, List[float]] = {}
    for history in histories:
        for key, values in history.history.items():
            merged.setdefault(key, []).extend(float(value) for value in values)
    return merged


def main() -> None:
    args = parse_args()
    import tensorflow as tf

    configure_gpu(tf)
    train_ds, val_ds, class_names, resolved_dataset_dir, counts = load_datasets(tf, args)
    if len(class_names) < 30:
        print(
            "Warning: fewer than 30 classes found. Full PlantVillage training usually has about 38 classes."
        )
    print("Class distribution:")
    for class_name in class_names:
        print(f"  {class_name}: {counts.get(class_name, 0)}")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    model, base_model, fine_tune_at = build_model(tf, len(class_names), args.fine_tune_at)
    compile_model(tf, model, learning_rate=1e-3)

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            output_dir / "leaf_disease_mobilenetv2.keras",
            monitor="val_accuracy",
            save_best_only=True,
        ),
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=2),
    ]

    class_weights = {} if args.no_class_weights else build_class_weights(class_names, counts)
    if class_weights:
        print("Using inverse-frequency class weights for imbalanced disease classes.")

    print("Phase 1: training classifier head with frozen MobileNetV2 base")
    history_phase_1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        callbacks=callbacks,
        class_weight=class_weights or None,
    )

    print(f"Phase 2: fine-tuning MobileNetV2 layers from index {fine_tune_at}")
    base_model.trainable = True
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False
    compile_model(tf, model, learning_rate=1e-5)

    history_phase_2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs + args.fine_tune_epochs,
        initial_epoch=len(history_phase_1.history["loss"]),
        callbacks=callbacks,
        class_weight=class_weights or None,
    )

    model.save(output_dir / "leaf_disease_mobilenetv2.keras")
    (output_dir / "labels.json").write_text(json.dumps(class_names, indent=2), encoding="utf-8")

    val_loss, val_accuracy = model.evaluate(val_ds, verbose=0)
    y_true, y_pred = validation_predictions(model, val_ds)
    from sklearn.metrics import classification_report, confusion_matrix

    matrix = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    class_accuracy = per_class_accuracy(matrix, class_names)
    weak_classes = {name: score for name, score in class_accuracy.items() if score < 0.75}
    report_by_class = classification_report(
        y_true,
        y_pred,
        labels=list(range(len(class_names))),
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )
    training_history = merge_histories(history_phase_1, history_phase_2)
    confusion_matrix_path = output_dir / "leaf_disease_confusion_matrix.csv"
    classification_report_path = output_dir / "leaf_disease_classification_report.json"
    history_path = output_dir / "leaf_disease_training_history.json"
    save_confusion_matrix_csv(matrix, class_names, confusion_matrix_path)
    classification_report_path.write_text(json.dumps(report_by_class, indent=2), encoding="utf-8")
    history_path.write_text(json.dumps(training_history, indent=2), encoding="utf-8")

    report = {
        "model": "MobileNetV2 transfer learning",
        "dataset_dir": str(resolved_dataset_dir.resolve()),
        "classes": len(class_names),
        "class_distribution": counts,
        "class_weights": class_weights,
        "image_size": list(IMAGE_SIZE),
        "validation_accuracy": round(float(val_accuracy), 4),
        "validation_loss": round(float(val_loss), 4),
        "per_class_validation_accuracy": class_accuracy,
        "macro_avg_f1": round(float(report_by_class.get("macro avg", {}).get("f1-score", 0)), 4),
        "weighted_avg_f1": round(float(report_by_class.get("weighted avg", {}).get("f1-score", 0)), 4),
        "weak_classes_below_0_75": weak_classes,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "model_path": str((output_dir / "leaf_disease_mobilenetv2.keras").resolve()),
        "labels_path": str((output_dir / "labels.json").resolve()),
        "classification_report_path": str(classification_report_path.resolve()),
        "confusion_matrix_path": str(confusion_matrix_path.resolve()),
        "training_history_path": str(history_path.resolve()),
    }
    (output_dir / "leaf_disease_training_report.json").write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )

    print(f"Validation accuracy: {report['validation_accuracy']}")
    print("Per-class validation accuracy:")
    for class_name, score in class_accuracy.items():
        print(f"  {class_name}: {score:.4f}")
    if weak_classes:
        print("Weak classes below 0.75:")
        for class_name, score in weak_classes.items():
            print(f"  {class_name}: {score:.4f}")


if __name__ == "__main__":
    main()
