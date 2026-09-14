# Entraînement Food-101 Edge AI

Le dossier `training/` est autonome : il contient sa configuration `uv`, le
mapping Food-101, les scripts et les sorties d'entraînement. Il peut être copié
dans un autre dossier puis exécuté depuis n'importe quel répertoire.

## Installer et télécharger les données

Depuis ce dossier :

```bash
cd training
uv sync --group data
uv run --group data download_food101.py
```

Le dataset Hugging Face `ethz/food101` est sauvegardé dans
`training/dataset/food101`. Le téléchargement n'est effectué que si ce dossier
est absent. Le dataset complet représente environ 5 Go téléchargés et plusieurs
fois plus d'espace une fois préparé.

La préparation relabelle ensuite les 101 classes en huit classes métier :

```bash
uv run --group data prepare_food101.py --overwrite
```

Résultat : `training/dataset/food101-relabeled/{train,validation}/`.

`prepare_food101.py` télécharge automatiquement le dataset manquant. Pour
interdire tout téléchargement implicite, utiliser `--no-download`.

## Fine-tuner et exporter le modèle

MediaPipe Model Maker est compatible avec Python 3.10 dans ce projet :

```bash
uv sync --python 3.10 --group training
uv run --python 3.10 --group training \
  train_food101.py --epochs 10 --batch-size 32
```

Le modèle est exporté dans `training/artifacts/food101_edge_int8.tflite`, avec
`labels.txt` et `training-manifest.json`. Le manifeste conserve hyperparamètres,
versions, métriques de validation, taille et SHA-256 de l'artefact et du mapping.
Utiliser `--head-only` pour un premier essai plus rapide.

Le modèle produit actuellement distribué est
`public/models/efficientnet_lite0_food101_8_int8.tflite`. Le modèle ImageNet original
reste dans `public/models/efficientnet_lite0_imagenet_int8.tflite` comme baseline.

## Évaluer les modèles

Depuis la racine, après préparation du dataset :

```bash
uv run --python 3.10 training/evaluate_models.py
```

Le script compare les deux artefacts sur les 25 250 images du split de validation,
calcule accuracy, top-3, macro-F1, précision/rappel/F1 par famille, matrice de
confusion et plusieurs seuils de rejet. Il écrit
`evaluation/food101-benchmark.json`. Pour une ablation rapide de la grille :

```bash
uv run --python 3.10 training/evaluate_models.py \
  --variant grid --max-samples 808 \
  --output evaluation/food101-grid-benchmark.json
```

Avec une limite, l'échantillonnage parcourt les 101 classes Food-101 en round-robin ;
808 correspond ainsi à huit images déterministes par classe.

Les latences de ce script sont des latences TFLite Python sur la machine locale.
Elles ne remplacent pas les mesures instrumentées dans le navigateur.
