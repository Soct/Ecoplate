# Compétences démontrées

Cette page relie les compétences mobilisées à des éléments vérifiables du projet.
Les niveaux indiqués sont une auto-évaluation située : ils décrivent ce que ce
projet permet de démontrer, pas une certification générale.

## Compétences techniques démontrées par EcoPlate Edge

| Compétence | Niveau sur ce projet | Preuve consultable | Suite logique |
|---|:---:|---|---|
| Cadrage d’un besoin IA | 3/4 | [besoins et critères d’acceptation](rapport-conduite-projet.md#12-collecte-et-analyse-du-besoin-métier) | confronter le cadrage à des entretiens réels |
| Audit data et IA responsable | 3/4 | [audit Food-101](audit-mapping-food101.md) et [data card](data-card.md) | valider le comportement sur des photos utilisateur |
| Computer vision Edge | 3/4 | [model card](model-card.md) et intégration MediaPipe/WASM | comparer d’autres modèles et runtimes sur appareils mobiles |
| Gestion de l’incertitude | 3/4 | [rejet, seuils et erreurs](evaluation.md#étude-du-rejet) | calibrer les seuils sur un jeu indépendant |
| TypeScript et développement web | 3/4 | [architecture des modules](architecture.md#responsabilités-des-modules) et démonstration interactive | approfondir les tests navigateur automatisés |
| Qualité logicielle | 3/4 | tests métier, build strict et [workflow de contrôle](rapport-conduite-projet.md#52-outils-et-processus-de-suivi) | ajouter couverture instrumentée et budgets de performance |
| Données environnementales | 2/4 | [data card AGRIBALYSE](data-card.md) | mieux formaliser l’incertitude des profils ACV |
| Industrialisation / MLOps | 2/4 | artefact versionné, CI et déploiement statique | mettre en place registre, monitoring et réentraînement |
| Accessibilité web | 2/4 | HTML natif, navigation clavier et interface responsive | réaliser un audit WCAG avec technologies d’assistance |

## Compétences consolidées pendant la formation

Cette seconde lecture s’appuie sur les autres projets inventoriés. Le niveau 3/4
signifie ici « mis en œuvre de manière autonome dans au moins un POC documenté » ;
il ne signifie pas une expertise générale en production.

| Domaine | Niveau | Projets servant de preuves | Limite actuelle |
|---|:---:|---|---|
| Cadrage et aide à la décision | 3/4 | Fashion-Insta, EcoPlate Edge | peu d’entretiens avec de vraies parties prenantes |
| Data engineering et orchestration | 3/4 | CheckIt.AI, OpenAgenda RAG | volumes et exploitation en production non éprouvés |
| MLOps et monitoring | 3/4 | Home Credit, CheckIt.AI, EcoPlate Edge | registre et réentraînement automatisé à approfondir |
| Vision par ordinateur | 3/4 | BrainScanAI, EcoPlate Edge | validation sur données externes encore limitée |
| NLP, RAG et fine-tuning | 3/4 | OpenAgenda RAG, Qwen3 médical, Coach FFE | évaluation humaine et robustesse à renforcer |
| Agents et orchestration d’outils | 3/4 | Coach FFE | un seul agent complet réalisé |
| Apprentissage par renforcement | 2/4 | Eagle-1 | expérience limitée à un environnement simulé |
| Cloud et architecture distribuée | 2/4 | Fashion-Insta, Home Credit | architecture davantage conçue que suivie en exploitation réelle |

## Soft skills illustrées

- **Analyse et résolution de problèmes :** comparaison des architectures, des
  modèles et des prétraitements à partir de critères mesurables.
- **Pensée critique :** distinction entre performance Food-101 et performance en
  conditions réelles, avec affichage explicite des limites.
- **Autonomie et gestion de projet :** passage d’une idée à un prototype testé,
  documenté et déployable sans infrastructure serveur.
- **Vulgarisation :** séparation entre prédiction, correction humaine et repère
  climatique pour éviter les raccourcis trompeurs.
- **Communication technique :** model card, data card, architecture, benchmark et
  étude de cas organisés autour de décisions compréhensibles.

## Ce que ce projet ne permet pas encore d’affirmer

Ce projet ne suffit pas à revendiquer une expertise générale en production ML, en
MLOps à grande échelle ou en analyse du cycle de vie. Il ne mesure pas encore la
performance sur des photos prises par des utilisateurs et ne remplace pas une
expérience sur des données métier réelles.

La prochaine preuve à produire est une campagne de 30 photos autorisées, annotées
avant l’inférence, sur ordinateur et téléphone. Elle permettra de mesurer la
généralisation, le taux de rejet utile, la correction utilisateur et la latence par
appareil.

## Documents associés

- [Rapport complet](rapport-conduite-projet.md) — conduite, arbitrages et suivi ;
- [Projets de formation](projets-formation.md) — objectifs, réalisations, résultats et limites ;
- [Carte mentale](../public/livrables/carte-mentale.svg) — synthèse visuelle du
  parcours et des compétences.
