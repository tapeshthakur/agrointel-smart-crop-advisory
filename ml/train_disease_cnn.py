from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau


IMG_SIZE = (224, 224)
SEED = 42


def build_model(num_classes: int, fine_tune: bool = False) -> tf.keras.Model:
    data_augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.08),
            layers.RandomZoom(0.12),
            layers.RandomContrast(0.12),
        ],
        name="augmentation",
    )

    base_model = MobileNetV2(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = fine_tune

    if fine_tune:
        for layer in base_model.layers[:-35]:
            layer.trainable = False

    inputs = layers.Input(shape=(*IMG_SIZE, 3))
    x = data_augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.35)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.25)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs, name="plant_disease_mobilenetv2")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4 if fine_tune else 3e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def load_datasets(dataset_dir: Path, batch_size: int, validation_split: float):
    train_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        validation_split=validation_split,
        subset="training",
        seed=SEED,
        image_size=IMG_SIZE,
        batch_size=batch_size,
        label_mode="int",
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        validation_split=validation_split,
        subset="validation",
        seed=SEED,
        image_size=IMG_SIZE,
        batch_size=batch_size,
        label_mode="int",
    )

    class_names = train_ds.class_names
    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.shuffle(1000, seed=SEED).prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)
    return train_ds, val_ds, class_names


def save_history_plot(history, output_path: Path) -> None:
    accuracy = history.history.get("accuracy", [])
    val_accuracy = history.history.get("val_accuracy", [])
    loss = history.history.get("loss", [])
    val_loss = history.history.get("val_loss", [])

    plt.figure(figsize=(10, 4))
    plt.subplot(1, 2, 1)
    plt.plot(accuracy, label="train")
    plt.plot(val_accuracy, label="validation")
    plt.title("Accuracy")
    plt.xlabel("Epoch")
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(loss, label="train")
    plt.plot(val_loss, label="validation")
    plt.title("Loss")
    plt.xlabel("Epoch")
    plt.legend()

    plt.tight_layout()
    plt.savefig(output_path, dpi=160)
    plt.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Train MobileNetV2 CNN for PlantVillage disease detection.")
    parser.add_argument("--dataset-dir", required=True, help="Folder containing one subfolder per disease class.")
    parser.add_argument("--output-dir", default="ml/models", help="Directory to save model and metadata.")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--fine-tune-epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--skip-fine-tune", action="store_true")
    args = parser.parse_args()

    dataset_dir = Path(args.dataset_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_dir}")

    train_ds, val_ds, class_names = load_datasets(dataset_dir, args.batch_size, args.validation_split)
    model = build_model(num_classes=len(class_names), fine_tune=False)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    best_model_path = output_dir / "disease_cnn.keras"
    class_names_path = output_dir / "disease_class_names.json"
    metrics_path = output_dir / "disease_cnn_metrics.json"
    plot_path = output_dir / f"disease_cnn_history_{timestamp}.png"

    callbacks = [
        ModelCheckpoint(best_model_path, monitor="val_accuracy", mode="max", save_best_only=True),
        EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=2, min_lr=1e-6),
    ]

    history = model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    if not args.skip_fine_tune and args.fine_tune_epochs > 0:
        fine_tune_model = build_model(num_classes=len(class_names), fine_tune=True)
        fine_tune_model.set_weights(model.get_weights())
        history_fine = fine_tune_model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=args.fine_tune_epochs,
            callbacks=callbacks,
        )
        model = fine_tune_model
        for key, values in history_fine.history.items():
            history.history.setdefault(key, []).extend(values)

    val_loss, val_accuracy = model.evaluate(val_ds, verbose=0)
    model.save(best_model_path)

    class_names_path.write_text(json.dumps(class_names, indent=2), encoding="utf-8")
    metrics = {
        "model": "MobileNetV2 transfer learning",
        "dataset_dir": str(dataset_dir),
        "classes": len(class_names),
        "image_size": IMG_SIZE,
        "validation_accuracy": round(float(val_accuracy), 4),
        "validation_loss": round(float(val_loss), 4),
        "trained_at": timestamp,
        "model_path": str(best_model_path),
        "class_names_path": str(class_names_path),
    }
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    save_history_plot(history, plot_path)

    print(json.dumps(metrics, indent=2))
    print(f"Saved training curve: {plot_path}")


if __name__ == "__main__":
    main()
