#!/usr/bin/env python3
"""Benchmark reproducible des modèles TFLite sur le split validation Food-101.

Ce script mesure la classification hors navigateur. La latence qu'il produit décrit
uniquement la machine d'évaluation ; la latence navigateur reste mesurée par l'UI.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import zipfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from statistics import median
from typing import Iterable

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
FAMILIES = ("beef", "pork", "poultry", "fish", "dairy", "eggs", "legumes", "plants")
MODEL_PATHS = {
    "food101-finetuned": ROOT / "public/models/efficientnet_lite0_food101_8_int8.tflite",
    "imagenet-baseline": ROOT / "public/models/efficientnet_lite0_imagenet_int8.tflite",
}

# Même politique que src/vision/classMapping.ts. L'ordre est significatif.
IMAGENET_RULES = (
    ("beef", ("beef", "meat loaf", "meatloaf", "cheeseburger")),
    ("pork", ("pork", "hotdog", "hot dog")),
    ("poultry", ("poultry", "drumstick")),
    ("fish", ("fish", "salmon", "tuna", "tench", "barracouta", "eel", "sturgeon", "garfish", "coho", "rock beauty", "anemone fish", "lionfish", "puffer")),
    ("dairy", ("dairy", "ice cream", "pizza", "carbonara")),
    ("eggs", ("eggs", "eggnog")),
    ("legumes", ("legumes", "guacamole")),
    ("plants", ("plants", "banana", "lemon", "orange", "strawberry", "pineapple", "fig", "granny smith", "custard apple", "pomegranate", "jackfruit", "cucumber", "artichoke", "bell pepper", "broccoli", "cauliflower", "cabbage", "zucchini", "mushroom", "acorn squash", "butternut squash", "spaghetti squash", "mashed potato", "corn", "bagel", "pretzel", "french loaf", "burrito")),
)

# Classes dont l'affectation à une seule famille n'est pas défendable sans recette.
# Elles deviennent `unknown` dans l'audit conservateur, sans réécrire les labels qui
# ont servi à entraîner le modèle à huit sorties.
CONSERVATIVE_UNKNOWN = frozenset({
    "apple_pie", "baklava", "beignets", "bibimbap", "bread_pudding",
    "breakfast_burrito", "caesar_salad", "cannoli", "caprese_salad",
    "carrot_cake", "chocolate_cake", "chocolate_mousse", "churros",
    "clam_chowder", "club_sandwich", "crab_cakes", "creme_brulee",
    "croque_madame", "cup_cakes", "donuts", "dumplings", "escargots",
    "foie_gras", "french_onion_soup", "french_toast", "fried_rice",
    "gnocchi", "greek_salad", "grilled_cheese_sandwich", "guacamole",
    "gyoza", "hot_and_sour_soup", "lasagna", "lobster_bisque",
    "lobster_roll_sandwich", "macaroni_and_cheese", "macarons", "miso_soup",
    "nachos", "pad_thai", "paella", "pancakes", "panna_cotta", "pho",
    "pizza", "poutine", "ramen", "ravioli", "red_velvet_cake", "risotto",
    "samosa", "shrimp_and_grits", "spaghetti_bolognese", "spaghetti_carbonara",
    "spring_rolls", "strawberry_shortcake", "sushi", "tacos", "takoyaki",
    "tiramisu", "waffles",
})


@dataclass(frozen=True)
class Example:
    path: Path
    expected_family: str
    food101_class: str


def labels_from_tflite(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        label_file = next(name for name in names if "label" in name.lower())
        return archive.read(label_file).decode("utf-8").splitlines()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def original_food101_class(path: Path) -> str:
    # prepare_food101.py écrit 000000_food_class.jpg.
    return path.stem.split("_", 1)[1]


def load_examples(data_dir: Path, max_samples: int | None) -> list[Example]:
    examples = [
        Example(path, path.parent.name, original_food101_class(path))
        for path in sorted(data_dir.glob("*/*.jpg"))
    ]
    if max_samples is None or max_samples >= len(examples):
        return examples
    # Échantillonnage déterministe par classe Food-101 pour les ablations rapides.
    # Une stratification limitée aux huit familles surreprésenterait les premières
    # classes de chaque dossier, puisque les noms conservent l'index source.
    food101_classes = sorted({item.food101_class for item in examples})
    by_class = {
        label: [item for item in examples if item.food101_class == label]
        for label in food101_classes
    }
    selected: list[Example] = []
    while len(selected) < max_samples and any(by_class.values()):
        for label in food101_classes:
            if by_class[label] and len(selected) < max_samples:
                selected.append(by_class[label].pop(0))
    return selected


def map_label(label: str) -> str | None:
    normalized = label.lower()
    if normalized in FAMILIES:
        return normalized
    for family, patterns in IMAGENET_RULES:
        if any(pattern in normalized for pattern in patterns):
            return family
    return None


def square_views(path: Path, variant: str) -> list[np.ndarray]:
    with Image.open(path) as opened:
        image = opened.convert("RGB")
        width, height = image.size
        side = min(width, height)
        left = (width - side) / 2
        top = (height - side) / 2

        def render(x: float, y: float, size: float) -> np.ndarray:
            crop = image.crop((round(x), round(y), round(x + size), round(y + size)))
            resized = crop.resize((224, 224), Image.Resampling.BILINEAR)
            return np.asarray(resized, dtype=np.uint8)

        views = [render(left, top, side)]
        if variant == "grid":
            tile_size = side / 3 * 1.15
            for row in (1 / 6, 1 / 2, 5 / 6):
                for column in (1 / 6, 1 / 2, 5 / 6):
                    x = min(left + side - tile_size, max(left, left + side * column - tile_size / 2))
                    y = min(top + side - tile_size, max(top, top + side * row - tile_size / 2))
                    views.append(render(x, y, tile_size))
        return views


class TFLiteModel:
    def __init__(self, path: Path, threads: int) -> None:
        import tensorflow as tf

        self.path = path
        self.labels = labels_from_tflite(path)
        self.interpreter = tf.lite.Interpreter(model_path=str(path), num_threads=threads)
        self.interpreter.allocate_tensors()
        self.input = self.interpreter.get_input_details()[0]
        self.output = self.interpreter.get_output_details()[0]

    def predict(self, pixels: np.ndarray) -> list[tuple[str, float]]:
        input_scale, input_zero = self.input["quantization"]
        # Les métadonnées des deux artefacts décrivent des normalisations différentes :
        # Model Maker Food-101 utilise [0, 1], le modèle Google ImageNet [-1, 1].
        normalized = pixels.astype(np.float32) / 255
        if len(self.labels) == 1000:
            normalized = normalized * 2 - 1
        if self.input["dtype"] == np.uint8:
            if input_scale:
                values = np.clip(normalized / input_scale + input_zero, 0, 255).astype(np.uint8)
            else:
                values = pixels.astype(np.uint8)
        else:
            values = normalized.astype(self.input["dtype"])
        self.interpreter.set_tensor(self.input["index"], values[None])
        self.interpreter.invoke()
        scores = self.interpreter.get_tensor(self.output["index"])[0]
        output_scale, output_zero = self.output["quantization"]
        if output_scale:
            scores = (scores.astype(np.float32) - output_zero) * output_scale
        ranked = np.argsort(scores)[::-1][:20]
        return [(self.labels[index], float(scores[index])) for index in ranked]


def aggregate(predictions: list[list[tuple[str, float]]]) -> list[dict[str, object]]:
    scores: dict[str, dict[str, object]] = {}
    for view_index, view in enumerate(predictions):
        for label, confidence in view:
            family = map_label(label)
            key = family or f"label:{label}"
            current = scores.setdefault(key, {
                "label": label, "family": family, "strongest": confidence,
                "full": 0.0, "tiles": [],
            })
            if confidence > current["strongest"]:
                current["label"] = label
                current["strongest"] = confidence
            if view_index == 0:
                current["full"] = max(current["full"], confidence)
            else:
                current["tiles"].append(confidence)

    result = []
    for current in scores.values():
        if len(predictions) == 1:
            confidence = current["full"]
        else:
            best_tiles = sorted(current["tiles"], reverse=True)[:3]
            average = sum(best_tiles) / len(best_tiles) if best_tiles else 0
            support = min(1, sum(value >= 0.35 for value in current["tiles"]) / 3)
            confidence = 0.5 * current["full"] + 0.35 * average + 0.15 * support
        result.append({"label": current["label"], "family": current["family"], "confidence": confidence})
    return sorted(result, key=lambda item: item["confidence"], reverse=True)


def reject(predictions: list[dict[str, object]], threshold: float, margin: float) -> bool:
    mapped = [item for item in predictions if item["family"]]
    if not mapped or mapped[0]["confidence"] < threshold:
        return True
    second = next((item for item in mapped[1:] if item["family"] != mapped[0]["family"]), None)
    return second is not None and mapped[0]["confidence"] - second["confidence"] < margin


def safe_ratio(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def metrics(
    rows: list[dict[str, object]],
    threshold: float,
    conservative: bool = False,
    margin: float = 0.08,
) -> dict[str, object]:
    labels = list(FAMILIES) + (["unknown"] if conservative else [])
    matrix = {expected: Counter() for expected in labels}
    top1 = top3 = accepted = accepted_correct = correct = rejected_count = 0
    for row in rows:
        expected = "unknown" if conservative and row["food101_class"] in CONSERVATIVE_UNKNOWN else row["expected"]
        predictions = row["predictions"]
        is_rejected = reject(predictions, threshold, margin)
        raw = [item["family"] or "unmapped" for item in predictions]
        top1 += bool(raw and raw[0] == expected)
        top3 += expected in raw[:3]
        predicted = "rejected" if is_rejected else (raw[0] if raw else "unmapped")
        if conservative and is_rejected:
            predicted = "unknown"
        matrix[expected][predicted] += 1
        rejected_count += is_rejected
        if not is_rejected:
            accepted += 1
            accepted_correct += predicted == expected
        correct += predicted == expected

    per_class = []
    for label in labels:
        tp = matrix[label][label]
        support = sum(matrix[label].values())
        fp = sum(matrix[other][label] for other in labels if other != label)
        precision = safe_ratio(tp, tp + fp)
        recall = safe_ratio(tp, support)
        f1 = safe_ratio(2 * precision * recall, precision + recall)
        per_class.append({"family": label, "support": support, "precision": precision, "recall": recall, "f1": f1})
    columns = labels + ["unmapped", "rejected"]
    if conservative:
        columns = labels + ["unmapped"]
    return {
        "sampleCount": len(rows),
        "accuracy": safe_ratio(correct, len(rows)),
        "top1Accuracy": safe_ratio(top1, len(rows)),
        "top3Accuracy": safe_ratio(top3, len(rows)),
        "macroF1": sum(item["f1"] for item in per_class) / len(per_class),
        "rejectionRate": safe_ratio(rejected_count, len(rows)),
        "acceptedAccuracy": safe_ratio(accepted_correct, accepted),
        "perFamily": per_class,
        "confusionLabels": columns,
        "confusionMatrix": [[matrix[label][column] for column in columns] for label in labels],
    }


def percentile(values: list[float], value: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, int(np.ceil(value * len(ordered))) - 1)] if ordered else 0.0


def evaluate(model: TFLiteModel, examples: Iterable[Example], variant: str) -> tuple[list[dict[str, object]], list[float]]:
    rows: list[dict[str, object]] = []
    latencies: list[float] = []
    started = time.perf_counter()
    examples = list(examples)
    for index, example in enumerate(examples, 1):
        views = square_views(example.path, variant)
        inference_started = time.perf_counter()
        predictions = aggregate([model.predict(view) for view in views])
        latencies.append((time.perf_counter() - inference_started) * 1000)
        rows.append({
            "path": str(example.path.relative_to(ROOT)),
            "expected": example.expected_family,
            "food101_class": example.food101_class,
            "predictions": predictions,
        })
        if index % 500 == 0 or index == len(examples):
            elapsed = time.perf_counter() - started
            print(f"  {index}/{len(examples)} images ({elapsed:.1f} s)", flush=True)
    return rows, latencies


def representative_errors(rows: list[dict[str, object]], limit: int = 12) -> list[dict[str, object]]:
    errors = []
    for row in rows:
        top = row["predictions"][0] if row["predictions"] else None
        if not top or top["family"] != row["expected"]:
            errors.append({
                "path": row["path"],
                "food101Class": row["food101_class"],
                "expected": row["expected"],
                "predicted": top["family"] if top else None,
                "originalLabel": top["label"] if top else None,
                "confidence": top["confidence"] if top else 0,
                "cause": "plat composé / mapping" if row["food101_class"] in CONSERVATIVE_UNKNOWN else "confusion visuelle",
            })
        if len(errors) == limit:
            break
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=ROOT / "dataset/food101-relabeled/validation")
    parser.add_argument("--models", nargs="+", choices=MODEL_PATHS, default=list(MODEL_PATHS))
    parser.add_argument("--variant", choices=("full", "grid"), default="full")
    parser.add_argument("--max-samples", type=int)
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--output", type=Path, default=ROOT / "evaluation/food101-benchmark.json")
    args = parser.parse_args()

    examples = load_examples(args.data_dir, args.max_samples)
    if not examples:
        raise SystemExit(f"Aucune image de validation trouvée dans {args.data_dir}")
    benchmark = {
        "scope": "Food-101 validation relabellisé ; pas des photos utilisateur",
        "variant": args.variant,
        "sampleCount": len(examples),
        "classDistribution": dict(sorted(Counter(item.expected_family for item in examples).items())),
        "conservativeUnknownClasses": sorted(CONSERVATIVE_UNKNOWN),
        "models": {},
    }
    for model_id in args.models:
        path = MODEL_PATHS[model_id]
        print(f"{model_id} — {path.name}", flush=True)
        model = TFLiteModel(path, args.threads)
        rows, latencies = evaluate(model, examples, args.variant)
        threshold_study = [
            {"threshold": threshold, **metrics(rows, threshold)}
            for threshold in (0.0, 0.2, 0.35, 0.5, 0.65)
        ]
        benchmark["models"][model_id] = {
            "asset": str(path.relative_to(ROOT)),
            "sizeBytes": path.stat().st_size,
            "sha256": sha256(path),
            "outputLabels": len(model.labels),
            "labels": model.labels if len(model.labels) <= 10 else {"count": len(model.labels), "first": model.labels[:3], "last": model.labels[-3:]},
            "rawClassification": metrics(rows, 0.0, margin=0.0),
            "metricsAtProductThreshold": metrics(rows, 0.35),
            "conservativeMappingAtProductThreshold": metrics(rows, 0.35, conservative=True),
            "thresholdStudy": threshold_study,
            "hostLatency": {
                "warning": "TFLite Python sur la machine d'évaluation ; ce n'est pas une latence navigateur",
                "medianMs": median(latencies),
                "p95Ms": percentile(latencies, 0.95),
                "viewsPerImage": 10 if args.variant == "grid" else 1,
            },
            "representativeErrors": representative_errors(rows),
        }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(benchmark, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Résultats écrits dans {args.output}")


if __name__ == "__main__":
    main()
