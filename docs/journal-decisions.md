# Décisions techniques et retour d’expérience

Ce journal explique les principaux choix effectués pendant le développement
d’EcoPlate Edge : le problème rencontré, les options envisagées, la décision prise
et ce que je changerais aujourd’hui.

## Décisions

| Date | Problème | Options | Critères | Décision | Résultat observé | Avec du recul |
|---|---|---|---|---|---|---|
| 2026-09-04 | aucune application dans le dépôt | prototype isolé ou site portfolio intégré | livrables de l’énoncé, cohérence | intégrer démonstration et portfolio dans le même site | un seul build relie démo et preuves | conserver des modules distincts pour éviter le couplage |
| 2026-09-04 | modèle exécuté dans le navigateur | TensorFlow.js MobileNet, MediaPipe EfficientNet, ONNX Food-101 | taille, licence, hébergement statique, adéquation | EfficientNet-Lite0 int8 / MediaPipe | modèle local de 5,18 Mio et intégration TypeScript validée | choisir définitivement après l’évaluation sur des photos réelles |
| 2026-09-04 | précision alimentaire limitée | associer toutes les classes ou limiter les correspondances | risque de faux positif | correspondances limitées et réponse `?` | les classes sans correspondance restent visibles | ajouter une famille seulement lorsqu’une erreur réelle le justifie |
| 2026-09-04 | résultat climatique | kg CO2e ou A–E | masse des aliments inconnue | repère qualitatif A–E ; pondération uniquement lorsque toutes les masses sont déclarées | l’application n’estime pas visuellement le poids des aliments | mieux distinguer encore information climatique et information nutritionnelle |
| 2026-09-04 | source environnementale | plusieurs sources ou AGRIBALYSE seule | cohérence des unités et traçabilité | huit lignes AGRIBALYSE 3.2 | codes, DQR, facteur et limites conservés | envisager plusieurs profils par famille dans une V2 |
| 2026-09-04 | confidentialité | backend, API ou local | image sensible, coût, Pages | local sans télémétrie | aucun composant d’upload ajouté | ajouter un test navigateur automatisé du réseau |
| 2026-09-04 | absence de mesures sur des photos réelles | publier une estimation ou préparer une évaluation | fiabilité des résultats présentés | indiquer « non mesuré » et préparer 30 cas | protocole reproductible, sans performance réelle annoncée | planifier la collecte plus tôt avec un jeu de données dédié |
| 2026-09-10 | identité du modèle ambiguë après renommage | se fier au nom du fichier ou vérifier ses métadonnées et son empreinte | reproductibilité | noms explicites, taille et SHA-256 testés | le produit charge bien le modèle Food-101 à 8 classes ; ImageNet sert de référence | versionner un manifeste à chaque export |
| 2026-09-10 | classement forcé des plats composés | conserver 8 familles ou introduire `unknown` | cohérence avec l’usage | auditer les 101 classes et mesurer une variante plus prudente | 61 classes sont considérées comme ambiguës | réentraîner avec des classes `mixed_dish` et `unknown` plutôt que corriger après coup |
| 2026-09-10 | SlimSAM activé sans résultat concluant | activation par défaut, option ou désactivation | gain de précision, latence, coût de chargement | désactiver SlimSAM après l’échec du chargement | aucune amélioration de la segmentation n’a pu être mesurée | le réévaluer uniquement avec des poids disponibles localement |

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

La comparaison sur Food-101 invalide l’hypothèse selon laquelle un modèle ImageNet
suffirait à reconnaître huit familles alimentaires. En revanche, le comportement du
modèle spécialisé sur des photos utilisateur reste inconnu. Une amélioration sur le
jeu d’évaluation Food-101 ne garantit pas la même progression en situation réelle.

Un facteur unique ne peut pas représenter précisément toute une famille alimentaire.
Il peut seulement servir de repère qualitatif, à condition que cette limite soit
clairement annoncée.

### Ce qui serait changé dans la méthode

Je définirais et collecterais les images d’évaluation avant de finaliser l’interface.
Les erreurs observées guideraient ainsi l’association des classes et le choix du
modèle. Je mènerais également un test utilisateur court pour vérifier que la
confiance, la correction et le caractère indicatif du score sont compris sans
explication orale.

### Évolution de la représentation du métier

Je ne vois plus le métier d’AI Engineer comme la seule construction d’un modèle. Il
faut relier ses capacités à un usage, définir les cas où le système ne doit pas
répondre, permettre la correction humaine, surveiller les données et les performances,
sécuriser les échanges et expliquer les compromis à des non-spécialistes.

### Amélioration prioritaire

Ma priorité est d’évaluer les 30 photos réelles afin de mesurer l’écart avec Food-101.
J’ajouterai de nouvelles fonctionnalités seulement après cette étape. SlimSAM restera
désactivé tant que ses poids ne seront pas disponibles localement et que son intérêt
n’aura pas été mesuré.
