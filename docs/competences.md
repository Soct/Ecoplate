# Compétences démontrées

Cette page décrit les compétences réellement mises en œuvre dans les projets, les
éléments consultables qui permettent de les vérifier et les prochaines étapes. Elle
ne leur attribue pas de niveau abstrait.

## Compétences techniques démontrées par EcoPlate Edge

| Compétence | Mise en œuvre consultable | Suite logique |
|---|---|---|
| Cadrage d’un besoin IA | [besoins et critères d’acceptation](rapport-conduite-projet.md#12-collecte-et-analyse-du-besoin-métier) | confronter le cadrage à des entretiens réels |
| Audit des données et IA responsable | [audit Food-101](audit-mapping-food101.md) et [fiche des données](data-card.md) | valider le comportement sur des photos utilisateur |
| Vision par ordinateur dans le navigateur | [fiche du modèle](model-card.md) et intégration MediaPipe/WASM | comparer d’autres modèles et moteurs d’inférence sur mobile |
| Gestion de l’incertitude | [rejet, seuils et erreurs](evaluation.md#étude-du-rejet) | calibrer les seuils sur un jeu indépendant |
| Qualité logicielle | tests métier, compilation stricte et [chaîne de contrôle](rapport-conduite-projet.md#52-outils-et-processus-de-suivi) | mesurer la couverture et fixer des seuils de performance |
| Données environnementales | [fiche AGRIBALYSE](data-card.md) | mieux représenter l’incertitude des profils d’analyse du cycle de vie |
| Industrialisation / MLOps | modèle versionné, intégration continue et déploiement statique | ajouter un registre, une surveillance et un réentraînement automatisé |
| Accessibilité web | HTML natif, navigation clavier et interface responsive | réaliser un audit WCAG avec technologies d’assistance |

## Compétences présentées dans le portfolio

Cette grille reprend les huit domaines affichés sur la page d’accueil. Elle associe
chaque domaine à des pratiques concrètes, aux projets concernés et à une limite
actuelle.

| Domaine affiché sur la page d’accueil | Pratiques mises en œuvre | Projets concernés | Limite actuelle |
|---|---|---|---|
| Industrialisation | API, CI et déploiement | Home Credit, CheckIt.AI, EcoPlate Edge | monitoring et maintenance en production à approfondir |
| IA responsable | confidentialité, incertitude et contrôle humain | EcoPlate Edge, Fashion-Insta, Qwen3 médical | gouvernance en production à renforcer |
| Données & pipelines pour l’IA | ETL, stockage et orchestration | CheckIt.AI, OpenAgenda RAG | volumes de production non éprouvés |
| LLM, RAG & agents | recherche, outils et workflows | OpenAgenda RAG, Qwen3 médical, Coach FFE | robustesse et évaluation en production à consolider |
| Computer vision & Edge AI | prétraitement et inférence locale | BrainScanAI, EcoPlate Edge | validation sur données externes et appareils mobiles encore limitée |
| Fine-tuning & adaptation de modèles | LoRA, SFT et quantification | Qwen3 médical, EcoPlate Edge | validation humaine et généralisation à renforcer |
| Évaluation & expérimentation | baselines, métriques et ablations | BrainScanAI, Home Credit, EcoPlate Edge | protocoles appliqués dans des cadres encore limités |
| Cadrage & architecture IA | besoin, risques et critères de décision | Fashion-Insta, EcoPlate Edge | peu d’entretiens avec de vraies parties prenantes |

## Compétences humaines mises en pratique

- **Analyse et résolution de problèmes :** comparaison des architectures, des
  modèles et des prétraitements à partir de critères mesurables.
- **Esprit critique :** je distingue les résultats obtenus sur Food-101 des
  performances, encore inconnues, sur des photos prises en situation réelle.
- **Autonomie et gestion de projet :** passage d’une idée à un prototype testé,
  documenté et déployable sans infrastructure serveur.
- **Vulgarisation :** je sépare la prédiction, la correction humaine et le repère
  climatique afin de ne pas présenter une estimation comme une mesure exacte.
- **Communication technique :** les fiches du modèle et des données, l’architecture
  et les évaluations expliquent les décisions autant que les résultats.

## Compétences à consolider

Je dois encore acquérir de l’expérience sur des systèmes ML exploités à grande
échelle et sur des données métier réelles. L’analyse du cycle de vie reste également
un domaine à approfondir. Pour EcoPlate, la principale inconnue demeure la qualité
des prédictions sur des photos prises par les utilisateurs.

Ma prochaine étape est donc une campagne de 30 photos autorisées, annotées avant
l’inférence et testées sur ordinateur et téléphone. Je pourrai alors mesurer la
généralisation, la pertinence des rejets, le besoin de correction et la latence sur
chaque appareil.

## Documents associés

- [Rapport complet](rapport-conduite-projet.md) — conduite, arbitrages et suivi ;
- [Carte mentale](../public/livrables/carte-mentale.svg) — synthèse visuelle du
  parcours et des compétences.
