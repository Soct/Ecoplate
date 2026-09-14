#!/usr/bin/env python3
"""Export the local Food-101 DatasetDict into relabeled image folders."""

from __future__ import annotations

import argparse
import re
import shutil
from collections import Counter
from pathlib import Path

PROJECT_LABELS = {
    "beef",
    "pork",
    "poultry",
    "fish",
    "dairy",
    "eggs",
    "legumes",
    "plants",
}
MAPPING_ROW = re.compile(r"^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|")
TRAINING_DIR = Path(__file__).resolve().parent
LOCAL_DATASET_DIR = TRAINING_DIR / "dataset" / "food101"
LEGACY_DATASET_DIR = TRAINING_DIR.parent / "dataset" / "food101"
LOCAL_MAPPING_PATH = TRAINING_DIR / "class_food101.md"
LEGACY_MAPPING_PATH = TRAINING_DIR.parent / "class_food101.md"


def default_path(local_path: Path, legacy_path: Path) -> Path:
    """Use the standalone location, while supporting the existing repo layout."""
    return local_path if local_path.exists() or not legacy_path.exists() else legacy_path


def read_mapping(mapping_path: Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for line in mapping_path.read_text(encoding="utf-8").splitlines():
        match = MAPPING_ROW.match(line)
        if match:
            _, old_label, new_label = match.groups()
            mapping[old_label] = new_label

    if len(mapping) != 101:
        raise ValueError(
            f"Mapping incomplet : {len(mapping)} classes trouvées, 101 attendues."
        )
    invalid_labels = set(mapping.values()) - PROJECT_LABELS
    if invalid_labels:
        raise ValueError(f"Nouveaux labels inconnus : {sorted(invalid_labels)}")
    return mapping


def export_split(dataset_split, split_name: str, mapping: dict[str, str], output_dir: Path) -> Counter:
    counts: Counter = Counter()
    labels = dataset_split.features["label"].names

    for index, row in enumerate(dataset_split):
        old_label = labels[row["label"]]
        new_label = mapping[old_label]
        image = row["image"].convert("RGB")
        target_dir = output_dir / split_name / new_label
        target_dir.mkdir(parents=True, exist_ok=True)
        image.save(target_dir / f"{index:06d}_{old_label}.jpg", format="JPEG", quality=95)
        counts[new_label] += 1

    return counts


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prépare Food-101 en dossiers image relabelés pour Model Maker."
    )
    parser.add_argument("--dataset-dir", type=Path, default=None)
    parser.add_argument("--mapping", type=Path, default=None)
    parser.add_argument(
        "--output-dir", type=Path, default=TRAINING_DIR / "dataset" / "food101-relabeled"
    )
    parser.add_argument(
        "--no-download",
        action="store_true",
        help="Échoue si le dataset local est absent au lieu de le télécharger.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Supprime le dossier de sortie avant de le régénérer.",
    )
    args = parser.parse_args()

    dataset_dir = args.dataset_dir or default_path(LOCAL_DATASET_DIR, LEGACY_DATASET_DIR)
    mapping_path = args.mapping or default_path(LOCAL_MAPPING_PATH, LEGACY_MAPPING_PATH)

    try:
        from datasets import load_from_disk
    except ImportError as error:
        raise SystemExit(
            "Dépendances manquantes : utilisez uv run --group data."
        ) from error

    if not (dataset_dir / "dataset_dict.json").exists():
        if args.no_download:
            raise SystemExit(f"Dataset introuvable : {dataset_dir}")
        from download_food101 import download_dataset

        download_dataset(dataset_dir)
    if not mapping_path.exists():
        raise SystemExit(f"Mapping introuvable : {mapping_path}")
    if args.output_dir.exists():
        if not args.overwrite:
            raise SystemExit(
                f"Le dossier existe déjà : {args.output_dir}. "
                "Ajoutez --overwrite pour le régénérer."
            )
        shutil.rmtree(args.output_dir)

    mapping = read_mapping(mapping_path)
    dataset = load_from_disk(str(dataset_dir))
    if "train" not in dataset or "validation" not in dataset:
        raise SystemExit("Les splits train et validation sont requis.")

    for split_name in ("train", "validation"):
        counts = export_split(dataset[split_name], split_name, mapping, args.output_dir)
        print(f"{split_name}: {sum(counts.values())} images — {dict(sorted(counts.items()))}")

    labels = sorted(PROJECT_LABELS)
    (args.output_dir / "labels.txt").write_text("\n".join(labels) + "\n", encoding="utf-8")
    print(f"Données préparées dans : {args.output_dir}")


if __name__ == "__main__":
    main()
