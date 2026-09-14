# Décisions techniques et retour d’expérience

Ce document retrace les arbitrages qui ont structuré EcoPlate Edge. Il sert de
complément technique à la démonstration et au rapport de projet.

## Décisions

| Date | Problème | Options | Critères | Décision | Résultat observé | Avec du recul |
|---|---|---|---|---|---|---|
| 2026-09-04 | aucune application dans le dépôt | prototype isolé ou site portfolio intégré | livrables de l’énoncé, cohérence | intégrer démonstration et portfolio dans le même site | un seul build relie démo et preuves | conserver des modules distincts pour éviter le couplage |
| 2026-09-04 | modèle navigateur | TensorFlow.js MobileNet, MediaPipe EfficientNet, ONNX Food-101 | taille, licence, statique, adéquation | EfficientNet-Lite0 int8 / MediaPipe | modèle local 5,18 Mio et API compilable | la campagne photo doit décider, pas l’intuition |
| 2026-09-04 | précision alimentaire limitée | mapper toutes les classes ou mapping court | risque de faux positif | mapping court et `?` | classes non mappées restent visibles | ajouter une famille uniquement après une erreur réelle documentée |
| 2026-09-04 | résultat climatique | kg CO2e ou A–E | données de masse absentes | A–E qualitatif ; pondération seulement si masses toutes déclarées | aucune pesée visuelle prétendue | séparer encore plus nettement climat et nutrition |
| 2026-09-04 | source environnementale | plusieurs sources ou AGRIBALYSE seule | cohérence des unités et traçabilité | huit lignes AGRIBALYSE 3.2 | codes, DQR, facteur et limites conservés | envisager plusieurs profils par famille dans une V2 |
| 2026-09-04 | confidentialité | backend, API ou local | image sensible, coût, Pages | local sans télémétrie | aucun composant d’upload ajouté | ajouter un test navigateur automatisé du réseau |
| 2026-09-04 | métriques absentes | inventer une estimation ou préparer la mesure | intégrité du portfolio | déclarer « non mesuré » et livrer 30 cas | rapport honnête et protocole reproductible | planifier la collecte plus tôt avec un jeu de données dédié |
| 2026-09-10 | identité du modèle ambiguë après renommage | se fier au nom ou inspecter métadonnées/empreinte | reproductibilité | noms explicites + taille/SHA-256 testés | le produit charge bien le fine-tuning 8 classes ; ImageNet devient le baseline | versionner un manifeste dès chaque export |
| 2026-09-10 | mapping forcé des plats composés | conserver 8 familles ou introduire `unknown` | défendabilité métier | auditer 101 classes et mesurer une variante conservatrice | 61 classes signalées comme ambiguës | réentraîner avec `mixed_dish`/`unknown` plutôt que corriger après coup |
| 2026-09-10 | SlimSAM activé sans ablation concluante | défaut, option, désactivation | gain accuracy, latence, coût de chargement | désactiver SlimSAM après timeout/erreur réseau | aucune promesse de segmentation validée ni contrôle cassé | le réévaluer seulement avec des poids locaux |

## Bilan réflexif

### Compétences réellement mobilisées

- transformation d’un besoin flou en critères d’acceptation ;
- comparaison d’architectures sous contraintes ;
- intégration d’un modèle quantifié en WebAssembly ;
- définition d’un contrat entre IA, fusion et règles métier ;
- traçabilité d’une donnée ACV ;
- conception d’un mécanisme de rejet ;
- tests unitaires et documentation orientée décision ;
- communication des limites dans l’interface.

### Hypothèses invalidées ou fragiles

L'hypothèse « un modèle ImageNet suffit à reconnaître huit familles alimentaires »
est invalidée sur Food-101 par la comparaison au fine-tuning. L'adéquation statistique
du modèle spécialisé aux photos utilisateur reste toutefois inconnue avant la
campagne réelle : améliorer une métrique dans le domaine source ne prouve pas la
généralisation au contexte produit.

L’hypothèse « une famille peut être représentée par un facteur unique » est trop forte
pour un chiffre. Elle reste acceptable uniquement comme repère qualitatif explicite.

### Ce qui serait changé dans la méthode

Avec davantage de temps et un accès anticipé à des images autorisées, le jeu d’évaluation
serait défini et collecté avant l’interface finale. Les erreurs auraient ainsi guidé
le mapping et le choix du modèle. Un petit test utilisateur aurait aussi validé si
les notions de confiance, correction et score indicatif sont comprises sans oral.

### Évolution de la représentation du métier

Le projet montre que l’AI Engineer n’est pas seulement responsable d’un modèle. Il
doit relier une capacité statistique à un usage, décider quand ne pas répondre,
organiser la correction humaine, surveiller données et performances, sécuriser les
flux et rendre les compromis lisibles pour des non-spécialistes.

### Amélioration prioritaire

Exécuter les 30 cas visuels réels et mesurer l'écart de domaine. Toute nouvelle
fonctionnalité est secondaire tant que cette preuve manque ; SlimSAM reste désactivé
jusqu'à ce que ses poids soient locaux et son gain mesuré.
