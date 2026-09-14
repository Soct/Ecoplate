#!/usr/bin/env python3
"""Fine-tune EfficientNet-Lite0 on the relabeled Food-101 folders."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

TRAINING_DIR = Path(__file__).resolve().parent
ROOT = TRAINING_DIR.parent


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fine-tune EfficientNet-Lite0 et exporte un TFLite quantifié."
    )
    parser.add_argument(
        "--data-dir", type=Path, default=TRAINING_DIR / "dataset" / "food101-relabeled"
    )
    parser.add_argument("--output-dir", type=Path, default=TRAINING_DIR / "artifacts")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument(
        "--head-only",
        action="store_true",
        help="Entraîne seulement la tête de classification; par défaut, fine-tune tout le modèle.",
    )
    args = parser.parse_args()

    try:
        from mediapipe_model_maker import image_classifier, quantization
    except ImportError as error:
        raise SystemExit(
            "Dépendance manquante : utilisez uv run --python 3.10 "
            "--group training --locked."
        ) from error

    train_dir = args.data_dir / "train"
    validation_dir = args.data_dir / "validation"
    if not train_dir.exists() or not validation_dir.exists():
        raise SystemExit(
            f"Dossiers train/validation introuvables dans {args.data_dir}. "
            "Lancez d'abord prepare_food101.py."
        )
    if args.epochs < 1 or args.batch_size < 1:
        raise SystemExit("epochs et batch-size doivent être positifs.")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    train_data = image_classifier.Dataset.from_folder(str(train_dir))
    validation_data = image_classifier.Dataset.from_folder(str(validation_dir))

    print(f"Labels détectés : {train_data.label_names}")
    print("Backbone : EfficientNet-Lite0 — entrée 224x224 — export full integer quantization")

    hparams = image_classifier.HParams(
        export_dir=str(args.output_dir),
        epochs=args.epochs,
        batch_size=args.batch_size,
        shuffle=True,
        do_fine_tuning=not args.head_only,
    )
    options = image_classifier.ImageClassifierOptions(
        supported_model=image_classifier.SupportedModels.EFFICIENTNET_LITE0,
        hparams=hparams,
    )

    model = image_classifier.ImageClassifier.create(
        train_data=train_data,
        validation_data=validation_data,
        options=options,
    )

    loss, accuracy = model.evaluate(validation_data)
    print(f"Validation — loss: {loss:.4f}, accuracy: {accuracy:.4f}")

    quantization_config = quantization.QuantizationConfig.for_int8(train_data)
    model.export_model(
        model_name="food101_edge_int8.tflite",
        quantization_config=quantization_config,
    )
    model_path = args.output_dir / "food101_edge_int8.tflite"
    model_sha256 = hashlib.sha256(model_path.read_bytes()).hexdigest()
    mapping_path = TRAINING_DIR / "class_food101.md"
    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "architecture": "EfficientNet-Lite0",
        "dataset": "Food-101 relabelled to eight EcoPlate families",
        "dataDir": str(args.data_dir.resolve()),
        "labels": list(train_data.label_names),
        "epochs": args.epochs,
        "batchSize": args.batch_size,
        "fineTuning": not args.head_only,
        "quantization": "full-int8",
        "validationLoss": float(loss),
        "validationAccuracy": float(accuracy),
        "artifact": {
            "file": model_path.name,
            "sizeBytes": model_path.stat().st_size,
            "sha256": model_sha256,
        },
        "mapping": {
            "file": str(mapping_path.relative_to(ROOT)) if mapping_path.exists() else None,
            "sha256": hashlib.sha256(mapping_path.read_bytes()).hexdigest() if mapping_path.exists() else None,
        },
        "dependencies": {
            package: version(package)
            for package in ("mediapipe-model-maker", "mediapipe", "tensorflow")
        },
    }
    manifest_path = args.output_dir / "training-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Modèle exporté dans : {model_path}")
    print(f"Manifeste d'entraînement : {manifest_path}")
    print("Le fichier TFLite contient les metadata et les labels pour MediaPipe Tasks.")


if __name__ == "__main__":
    main()
