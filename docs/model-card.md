# Fiche modèle — EfficientNet-Lite0 Food-101 int8

## À retenir

Le modèle produit est un EfficientNet-Lite0 quantifié en int8, fine-tuné sur
Food-101 et exécuté dans le navigateur avec MediaPipe Tasks Vision. Il est compact
et adapté à une démonstration locale, mais ses scores ne mesurent pas la performance
sur des photos utilisateur.

## Résumé et identité vérifiée

| Champ | Modèle produit | Baseline de comparaison |
|---|---|---|
| Architecture | EfficientNet-Lite0 | EfficientNet-Lite0 |
| Entraînement | fine-tuning Food-101 relabellisé | ImageNet, 1 000 classes |
| Sorties | 8 familles EcoPlate | 1 000 classes puis mapping métier |
| Quantification | int8 | int8 |
| Entrée | RGB, 224 × 224 | RGB, 224 × 224 |
| Runtime | MediaPipe Tasks Vision / WASM CPU | identique |
| Fichier | `efficientnet_lite0_food101_8_int8.tflite` | `efficientnet_lite0_imagenet_int8.tflite` |
| Taille | 4 140 006 octets (3,95 Mio) | 5 434 517 octets (5,18 Mio) |
| SHA-256 | `5b7d5e3ea72564157a5763c78bdf8536cf25805f15bfc5a284eb1d3c84d4c2ae` | `bc2ffe19c1118de0c0c2a9088992da5589722656e0fba81421385300a4a34b16` |

Les labels embarqués dans le modèle produit sont, dans l'ordre : `beef`, `dairy`,
`eggs`, `fish`, `legumes`, `plants`, `pork`, `poultry`. Les noms, tailles et SHA-256
sont définis dans `src/vision/modelConfig.ts` et vérifiés automatiquement. Cela
documente précisément l'artefact réellement chargé par le navigateur.

Deux anciens essais fine-tunés restent archivés sous les suffixes `finetune1` et
`finetune2`, mais ne sont jamais chargés par l'application et ne sont pas inclus dans
les résultats faute de traçabilité suffisante de leurs hyperparamètres.

## Provenance

Liens directs vers les ressources utilisées :

- [modèle EcoPlate fine-tuné, au format TFLite](https://soct.github.io/Ecoplate/models/efficientnet_lite0_food101_8_int8.tflite) ;
- [baseline EfficientNet-Lite0 int8 de Google AI Edge](https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/int8/latest/efficientnet_lite0.tflite) ;
- [dataset `ethz/food101` chargé avec Hugging Face](https://huggingface.co/datasets/ethz/food101) ;
- [page originale de Food-101 — ETH Zurich](https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/).

Le premier fichier est l'artefact créé pour EcoPlate à partir du baseline. La
préparation et le pipeline de fine-tuning sont documentés dans `training/`. Les 101
classes du dataset sont relabellisées vers huit familles selon
`training/class_food101.md`.

L'artefact produit actuel est identifiable par ses métadonnées et son empreinte, mais
son ancien entraînement ne possède pas de manifeste complet (seed et hyperparamètres
exacts). `train_food101.py` génère désormais ce manifeste pour les prochains runs ;
il ne faut pas prétendre pouvoir reproduire bit à bit le fichier actuel.

## Usage dans EcoPlate Edge

L'application charge par défaut le modèle Food-101. Elle :

1. recadre l'image entière à 224 × 224 ;
2. conserve automatiquement les trois premières familles en abaissant si nécessaire
   le seuil de base de 10 %, puis affiche toutes les familles supplémentaires au-dessus
   de ce seuil ; le sélecteur peut remplacer ce seuil par une valeur manuelle ;
3. sélectionne la première proposition sans la présenter comme certaine ;
4. permet validation, retrait, remplacement et ajout par l'utilisateur ;
5. combine éventuellement une description locale ;
6. renvoie `?` sous 35 % de confiance ou lorsque deux familles sont séparées de
   moins de huit points sans information humaine pour trancher.

Pour limiter les faux signaux liés à la similarité visuelle entre les protéines
animales, une seule famille parmi bœuf, porc, volaille et poisson est conservée
pour les prédictions issues de la vision : celle qui a la confiance la plus
élevée. Ce choix ne s'applique ni aux ingrédients saisis dans le texte, ni aux
corrections manuelles de l'utilisateur.

Le baseline ImageNet est sélectionnable dans la démonstration. Ses classes sont
converties par le mapping explicite de `src/vision/classMapping.ts`.

## Performances

Les résultats complets, par famille, matrice de confusion et étude des seuils se
trouvent dans `evaluation/food101-benchmark.json` et `docs/evaluation.md`. Ils portent
exclusivement sur les 25 250 images du split de validation Food-101 relabellisé.

Cette évaluation n'est pas une mesure en conditions d'usage. Food-101 contient des
images de plats déjà cadrées et partage la même taxonomie que celle utilisée pour le
fine-tuning. Les performances sur des photos prises par des utilisateurs restent non
mesurées tant que la campagne séparée de 30 photos n'est pas réalisée.

## Prétraitements et segmentation

L'image entière est la référence et l'option par défaut. La grille 3 × 3 est une
ablation de recadrage plus lente. SlimSAM n'a produit aucune inférence dans le
benchmark autonome : ses poids distants ont échoué au chargement. L'option est donc
désactivée. Même avec des poids locaux, aucune vérité terrain de masque n'existe dans
Food-101 ; il s'agirait d'une ablation de prétraitement, pas d'une segmentation validée.

## Usages prévus

- démonstration pédagogique d'inférence Edge AI ;
- aliment isolé ou plat simple ressemblant au domaine Food-101 ;
- proposition de catégories à confirmer ;
- discussion sur spécialisation, mapping, rejet et traitement local.

## Usages non prévus

- inventaire exhaustif d'une assiette composée ;
- mesure d'une masse, d'une recette, d'une origine ou d'un mode de production ;
- diagnostic médical, nutritionnel ou allergène ;
- calcul réglementaire ou certification environnementale ;
- décision automatique sans correction possible.

## Limites et risques

- 61 classes de plats composés ou desserts sont forcées artificiellement dans une
  famille lors de l'entraînement ; consulter l'audit du mapping ;
- les probabilités ne sont pas calibrées sur des photos utilisateur ;
- les familles sont déséquilibrées après relabellisation ;
- le recadrage central peut supprimer un aliment en bord de cadre ;
- Food-101 possède ses propres biais de collecte, présentation et représentation ;
- un bon score de validation peut refléter le style visuel du dataset plutôt qu'une
  généralisation au produit réel.

## Atténuations et évolution

Suggestions filtrées, scores, rejet, correction et texte restent visibles. Le mapping, les empreintes
et les métriques sont versionnés et testés. La prochaine validation doit porter sur
des photos réelles autorisées. Un prochain entraînement devrait intégrer `mixed_dish`
et `unknown`, puis calibrer les seuils sur un jeu distinct du split de validation.
