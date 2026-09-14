#!/usr/bin/env python3
"""Download and persist the Food-101 dataset used by the training pipeline."""

from __future__ import annotations

import argparse
from pathlib import Path

TRAINING_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_DIR = TRAINING_DIR / "dataset" / "food101"
DEFAULT_CACHE_DIR = TRAINING_DIR / "dataset" / ".cache"


def download_dataset(
    dataset_dir: Path = DEFAULT_DATASET_DIR,
    dataset_id: str = "ethz/food101",
    cache_dir: Path = DEFAULT_CACHE_DIR,
) -> None:
    if (dataset_dir / "dataset_dict.json").exists():
        print(f"Dataset déjà présent : {dataset_dir}")
        return

    try:
        from datasets import load_dataset
    except ImportError as error:
        raise SystemExit(
            "Dépendances manquantes. Lancez : uv run --group data download_food101.py"
        ) from error

    dataset_dir.parent.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    print(f"Téléchargement de {dataset_id} vers {dataset_dir}…")
    dataset = load_dataset(dataset_id, cache_dir=str(cache_dir))
    dataset.save_to_disk(str(dataset_dir))
    print(f"Dataset téléchargé : {dataset_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Télécharge Food-101 uniquement si le dossier cible est absent."
    )
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET_DIR)
    parser.add_argument("--dataset-id", default="ethz/food101")
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=DEFAULT_CACHE_DIR,
        help="Cache Hugging Face utilisé pendant le téléchargement.",
    )
    args = parser.parse_args()

    download_dataset(args.dataset_dir, args.dataset_id, args.cache_dir)


if __name__ == "__main__":
    main()
