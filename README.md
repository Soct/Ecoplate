# EcoPlate Edge

EcoPlate Edge est une application web statique qui analyse la photo d’un aliment
ou d’un plat simple directement dans le navigateur. Elle affiche les suggestions
d’un modèle de vision, laisse l’utilisateur les corriger, fusionne une description
facultative, puis calcule un indicateur climatique qualitatif **A–E ou `?`**.

Le résultat est volontairement indicatif : une photo ne permet pas de connaître
la masse, la recette, l’origine ou le mode de production. L’application ne produit
donc ni bilan carbone exact, ni éco-score officiel.

## Démarrer

Prérequis : Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

Les modèles EfficientNet-Lite0 int8 Food-101 et ImageNet sont présents dans
`public/models`. Le script
`postinstall` copie le runtime WebAssembly MediaPipe dans `public/mediapipe`, ce qui
permet au build de ne dépendre d’aucun CDN au moment de l’inférence.

Commandes utiles :

```bash
npm test
npm run check
npm run build
npm run preview
```

Test navigateur facultatif avec Firefox installé :

```bash
uv run --with selenium python scripts/e2e_smoke.py
```

## Parcours utilisateur

1. L’utilisateur choisit une image locale.
2. Le navigateur la valide, la recadre et la redimensionne à 224 × 224.
3. L'EfficientNet-Lite0 fine-tuné retourne directement huit familles ; le mode
   automatique conserve les trois premiers résultats en abaissant si nécessaire
   le seuil de base de 10 %, puis affiche aussi tous les résultats supplémentaires
   au-dessus de ce seuil. Le sélecteur permet de remplacer ce seuil manuellement.
4. Le modèle ImageNet original et son mapping versionné restent disponibles comme baseline.
5. Une description facultative est normalisée avec un dictionnaire et des règles locales.
6. L’utilisateur valide, retire, remplace ou ajoute une famille et peut saisir des grammes.
7. Une règle déterministe calcule A–E, ou `?` si le signal reste insuffisant ou ambigu.

```text
Image locale ──> prétraitement ──> EfficientNet ──> classes + confiance ─┐
                                                                         ├─> fusion ─> profils ─> A–E / ?
Texte local ───> synonymes + quantités ──> ingrédients ──────────────────┘
                                         correction utilisateur ────────┘
```

## Choix principaux

- **Local-first** : pas de backend, de compte, de journal distant ni d’API d’image.
- **Spécialisation mesurée** : EfficientNet-Lite0 fine-tuné sur Food-101,
  quantifié en int8 (4 140 006 octets), comparé au baseline ImageNet original.
- **Humain dans la boucle** : le top-k est une suggestion, pas une liste certaine
  d’ingrédients.
- **Rejet explicite** : seuil de confiance à 35 %, marge d’ambiguïté à 8 points et
  absence de mapping produisent `?`.
- **Couche métier séparée** : les profils AGRIBALYSE ne sont pas intégrés au modèle.
- **Pas de fausse précision** : les facteurs ACV servent uniquement de repères de
  classement. Une quantité déclarée permet une pondération, jamais une pesée visuelle.

## Structure

```text
src/
├── climate/       profils AGRIBALYSE et calcul A–E / ?
├── evaluation/    calcul reproductible des métriques
├── fusion/        déduplication, priorité et contradictions
├── text/          normalisation locale des ingrédients
├── ui/            composants DOM accessibles
├── vision/        modèles, identité vérifiée, prétraitement et mapping ImageNet
├── main.ts        orchestration et portfolio
└── style.css      interface responsive et styles d’impression
evaluation/        protocole 30 images et 15 cas textuels
docs/              rapport, cartes, modèle, données et décisions
public/            modèle, runtime et livrables consultables
```

## Données et modèle

- Modèle produit : **EfficientNet-Lite0 int8 fine-tuné sur Food-101 relabellisé**,
  intégré avec `@mediapipe/tasks-vision` ; baseline ImageNet conservé.
- Modèle/runtime : licence Apache-2.0 selon les pages officielles Google AI Edge ;
  détails et réserves dans [la model card](docs/model-card.md).
- Profils : **AGRIBALYSE® 3.2**, ADEME, Licence Ouverte 2.0, indicateur changement
  climatique par kg de produit consommé.
- Huit produits de référence et leurs identifiants sont conservés dans
  `src/climate/profiles.json` ; détails dans [la data card](docs/data-card.md).

### Reproduire la préparation et l'évaluation Food-101

Le pipeline autonome et son téléchargement conditionnel sont documentés dans
[`training/README.md`](training/README.md). Depuis la racine du projet :

```bash
cd training
uv sync --group data
uv run --group data download_food101.py
uv run --group data prepare_food101.py --overwrite
uv run --python 3.10 training/evaluate_models.py
```

Le dataset complet représente environ 5 Go téléchargés. Les dossiers `dataset/`
et `training/artifacts/` sont ignorés par Git car ils contiennent les données et
les fichiers générés.

## Tests et évaluation

Les tests couvrent le calcul, les seuils de rejet, les huit profils, le mapping,
la fusion, les contradictions, les quantités et quinze descriptions documentées.

Le benchmark reproductible porte sur le split de validation Food-101. Le fichier
[vision-cases.csv](evaluation/vision-cases.csv) définit séparément 30 photographies
réelles à collecter : aucune performance en conditions d'usage n'est déduite de
Food-101. La page affiche la latence réelle de chaque inférence navigateur et la
taille vérifiée du modèle choisi.

Consulter [le protocole d’évaluation](docs/evaluation.md) pour le mode opératoire,
les formules et les critères d’acceptation.

Les résultats bruts reproductibles sont conservés dans `evaluation/*.json` et copiés
dans `dist/livrables/benchmarks/` lors du build afin de rester consultables depuis le
portfolio déployé.

## Déploiement

`npm run build` produit un site autonome dans `dist/`. La configuration Vite utilise
des chemins relatifs afin de fonctionner sous un sous-chemin GitHub Pages. Le workflow
`.github/workflows/deploy-pages.yml` compile, teste et publie ce dossier.

Le dépôt ne peut pas connaître à l’avance le propriétaire et le nom de dépôt publics :
le lien de démonstration est donc celui de la page une fois GitHub Pages activé dans
les paramètres du dépôt.

## Livrables

- [Rapport de conduite de projet](docs/rapport-conduite-projet.md)
- [Architecture](docs/architecture.md)
- [Model card](docs/model-card.md)
- [Data card](docs/data-card.md)
- [Évaluation](docs/evaluation.md)
- [Journal de décisions](docs/journal-decisions.md)
- [Inventaire des compétences](docs/competences.md)
- [Scénario de démonstration](docs/scenario-demonstration.md)
- [Audit du mapping Food-101](docs/audit-mapping-food101.md)
- [Carte mentale](public/livrables/carte-mentale.svg)
- [Capture desktop](public/livrables/demo-desktop.png)
- [Capture mobile](public/livrables/demo-mobile.png)

## Limites d’usage

EcoPlate Edge est adapté à une démonstration sur un aliment ou un plat simple. Les
assiettes composées, aliments masqués, sauces, plats très transformés, photos floues
ou non alimentaires doivent être corrigés ou rejetés. Le projet ne doit pas servir
à une certification, une recommandation médicale, une comparaison commerciale de
produits ou une décision réglementaire.
