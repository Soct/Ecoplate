#!/usr/bin/env python3
"""List the class names stored in a local Food-101 Hugging Face dataset."""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Liste les classes Food-101 d'un dataset sauvegardé avec save_to_disk()."
    )
    parser.add_argument(
        "dataset_dir",
        nargs="?",
        type=Path,
        default=Path("dataset/food101"),
        help="Dossier du DatasetDict local (défaut : dataset/food101)",
    )
    args = parser.parse_args()

    try:
        from datasets import load_from_disk
    except ImportError as error:
        raise SystemExit(
            "Dépendance manquante. Lance le script avec : "
            "uv run --group data python scripts/list_food101_classes.py"
        ) from error

    if not args.dataset_dir.exists():
        raise SystemExit(
            f"Dataset introuvable : {args.dataset_dir}. "
            "Télécharge-le d'abord avec la commande indiquée dans le README."
        )

    dataset = load_from_disk(str(args.dataset_dir))
    split = dataset["train"] if hasattr(dataset, "keys") and "train" in dataset else dataset
    label_feature = split.features.get("label")
    class_names = getattr(label_feature, "names", None)

    if not class_names:
        raise SystemExit(
            "La colonne 'label' ne contient pas de liste de classes. "
            "Vérifie qu'il s'agit bien du dataset Food-101."
        )

    print(f"{len(class_names)} classes Food-101 :")
    for class_id, class_name in enumerate(class_names):
        print(f"{class_id:>3}  {class_name}")


if __name__ == "__main__":
    main()
