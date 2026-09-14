# Architecture — EcoPlate Edge

## À retenir

EcoPlate Edge est un site statique : le navigateur charge le modèle et exécute
l’inférence localement. L’image et le texte ne transitent jamais par un backend.
La vision, la fusion des signaux et le calcul climatique sont séparés afin de
limiter les couplages et de rendre chaque décision testable.

## Vue fonctionnelle

```mermaid
flowchart LR
  A[Photo locale] --> B[Validation du fichier]
  B --> C[Recadrage 224 x 224]
  C --> D{Modèle choisi}
  D -->|défaut| E[EfficientNet-Lite0 Food-101 int8]
  D -->|baseline| I[EfficientNet-Lite0 ImageNet int8]
  E --> F[Suggestions au-dessus du seuil d'affichage]
  I --> M[Top ImageNet + mapping versionné]
  M --> F
  T[Description facultative] --> N[Normalisation locale]
  N --> G[Fusion explicable]
  F --> G
  U[Validation / correction utilisateur] --> G
  G --> P[Profils AGRIBALYSE 3.2]
  P --> S[Indicateur A-E ou ?]
  S --> X[Explication, facteurs, limites]
```

## Frontières de confidentialité

Le navigateur télécharge des fichiers statiques publics : HTML, CSS, JavaScript,
WebAssembly, modèle TFLite, profils JSON et documentation publique. Une fois ces ressources
chargées, les données de l’utilisateur restent dans les objets mémoire de la page.

Il n’existe aucun composant pour :

- envoyer l’image ou le texte avec `fetch` ;
- créer un compte ou un identifiant ;
- écrire une prédiction dans un stockage distant ;
- appeler une API d’inférence ;
- enregistrer automatiquement l’image dans `localStorage` ou IndexedDB.

## Responsabilités des modules

| Module | Entrée | Sortie | Responsabilité |
|---|---|---|---|
| `vision/preprocess.ts` | `File` local | canvas 224 × 224 | Validation, décodage, recadrage central |
| `vision/modelConfig.ts` | identifiant modèle | nom, taille, SHA-256, labels | Identité vérifiable des deux artefacts |
| `vision/model.ts` | canvas + modèle | classes, scores, latence | Chargement à la demande, inférence et agrégation des vues |
| `vision/classMapping.ts` | classe directe ou ImageNet | famille éventuelle | Passage direct des 8 sorties et mapping du baseline |
| `evaluation/metrics.ts` | prédictions + vérités | accuracy, top-3, macro-F1, matrice, seuils | Mesures testées sans dépendre de l'UI |
| `text/normalizeIngredients.ts` | texte | familles, grammes, inconnus | Règles déterministes, accents et synonymes |
| `fusion/mergeCandidates.ts` | vision, texte, utilisateur | liste finale, contradictions | Déduplication et ordre de priorité |
| `climate/calculateScore.ts` | liste finale | A–E / `?`, facteurs, limites | Décision métier testable |
| `ui/*` | état typé | DOM | Interaction, accessibilité et présentation |

## Règles de décision

```mermaid
flowchart TD
  A[Liste finale] --> B{Au moins une famille ?}
  B -- non --> Q[?]
  B -- oui --> C{Correction ou texte confirmé ?}
  C -- non --> D{Confiance >= 35 % ?}
  D -- non --> Q
  D -- oui --> E{Top 2 séparés de 8 points ?}
  E -- non --> Q
  E -- oui --> F
  C -- oui --> F{Toutes les masses renseignées ?}
  F -- oui --> G[Moyenne pondérée des repères]
  F -- non --> H[Niveau le plus prudent]
  G --> I[A-E + explication]
  H --> I
```

## Déploiement statique

Le build Vite produit des chemins relatifs (`base: './'`). Le modèle et les trois
variantes du runtime WebAssembly sont copiés tels quels dans `dist`. GitHub Actions
exécute les tests avant de publier l'artefact Pages. L'échec d'un test ou du build
interrompt le déploiement.

Le code SlimSAM est chargé dynamiquement uniquement pour l'ablation. Ses poids
devraient être téléchargés par Transformers.js ; l'image resterait locale. Le
benchmark autonome a échoué avant toute inférence avec une erreur réseau. L'option
est donc désactivée dans l'interface tant que les poids ne sont pas distribués
localement. L'image entière reste le prétraitement par défaut.
