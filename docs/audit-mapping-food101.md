# Audit du mapping Food-101 vers EcoPlate

## Conclusion

Le mapping historique force chacune des 101 classes Food-101 dans l'une des huit
familles EcoPlate. Il rend possible un classifieur à huit sorties, mais il transforme
une hypothèse de recette en vérité terrain pour 61 classes ambiguës. Les résultats
issus de ce mapping mesurent donc la capacité à reproduire cette relabellisation —
pas à identifier objectivement l'ingrédient dominant d'une photo.

Le fichier source exhaustif reste `training/class_food101.md`.
La liste conservatrice est versionnée dans `training/evaluate_models.py` et incluse
dans chaque artefact JSON de benchmark.

## Règles d'audit

Une classe conserve sa famille lorsqu'elle désigne directement un aliment ou une
préparation dont l'ingrédient discriminant est explicite : `steak` → `beef`,
`pork_chop` → `pork`, `grilled_salmon` → `fish`, `deviled_eggs` → `eggs`,
`edamame` → `legumes`, `beet_salad` → `plants`.

Elle devient `unknown` dans la variante conservatrice lorsque la photo et le nom
ne suffisent pas à choisir une famille unique. Ce label sert à l'évaluation et au
rejet ; il n'a pas servi au fine-tuning actuel.

| Type d'ambiguïté | Exemples | Mapping historique | Décision conservatrice |
|---|---|---|---|
| recette variable | `pizza`, `lasagna`, `risotto`, `ramen`, `tacos` | dairy, beef, dairy, pork, beef | `unknown` |
| plat multi-ingrédients | `paella`, `pad_thai`, `bibimbap`, `club_sandwich` | fish, fish, plants, poultry | `unknown` |
| dessert composite | `apple_pie`, `tiramisu`, `baklava`, `waffles` | plants, dairy, plants, eggs | `unknown` |
| proxy artificiel | `guacamole`, `escargots`, `foie_gras` | legumes, fish, poultry | `unknown` |
| ingrédient caché | `miso_soup`, `french_onion_soup`, `clam_chowder` | legumes, plants, fish | `unknown` |

## Effet attendu sur l'évaluation

Le split de validation contient 250 images par classe Food-101. Le mapping forcé
crée donc une distribution métier très déséquilibrée : 5 750 images `dairy`, 5 500
`plants`, mais seulement 1 250 `legumes`. Accuracy et F1 par famille doivent toujours
être présentées ensemble avec la macro-F1.

Dans la variante conservatrice, 15 250 images sur 25 250 portent la vérité de
référence `unknown`. Un modèle entraîné uniquement sur huit familles ne peut les
traiter correctement qu'en les rejetant. Une accuracy conservatrice élevée obtenue
par un fort taux de rejet ne constitue donc pas, à elle seule, une amélioration
produit : la macro-F1 et l'accuracy des cas acceptés restent nécessaires.

## Décision

- conserver le modèle à huit sorties pour la démonstration actuelle, avec correction
  humaine, texte et état `?` visibles ;
- ne pas employer les métriques Food-101 comme preuve sur des photos utilisateur ;
- pour un prochain entraînement, ajouter réellement `mixed_dish` et `unknown` aux
  données plutôt que de les simuler uniquement au moment de l'évaluation ;
- revoir au minimum les 61 classes listées comme ambiguës avant tout usage métier.
