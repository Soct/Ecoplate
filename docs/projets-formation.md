# Projets réalisés pendant la formation

Cette page inventorie les projets retrouvés dans les dossiers de formation. Elle
décrit uniquement des éléments vérifiables dans leurs README, rapports, notebooks ou
livrables. Les résultats restent ceux de POC étudiants et ne sont pas présentés comme
des performances de production.

## Vue d’ensemble

| Projet | Sujet principal | Technologies ou méthodes | Preuve disponible |
|---|---|---|---|
| Fashion-Insta | cadrage d’une recommandation vestimentaire | besoins, architecture Azure, coûts, RGPD, Go/No-Go | présentation COMEX |
| Home Credit | industrialisation d’un score de risque | LightGBM, SHAP, MLflow, FastAPI, Streamlit, Docker | notebooks, API et dashboard |
| BrainScanAI | apprentissage semi-supervisé sur des IRM | ResNet18, clustering, pseudo-labels, CNN, PyTorch | deux notebooks et support PDF |
| CheckIt.AI | collecte de données texte-image | RSS, JSONL, SQLite, Airflow, Streamlit | pipeline, tests et tableau de bord |
| OpenAgenda RAG | recherche d’événements en langage naturel | Mistral, FAISS, FastAPI, Docker, RAGAS | API, rapport et évaluation |
| Eagle-1 | apprentissage par renforcement | DQN, Gymnasium, Stable-Baselines3, FastAPI | notebook, vidéo, API et dashboard |
| Qwen3 médical | adaptation d’un modèle de langage | datasets HF, LoRA, SFT, DPO, Unsloth | notebooks et rapport d’évaluation |
| Coach d’ouvertures FFE | agent de conseil aux échecs | LangGraph, Lichess, Stockfish, Milvus, Angular | application et étude MCP |

## Fashion-Insta — cadrage d’un projet IA

- **Objectif :** cadrer un POC de recommandation de vêtements à partir d’une photo.
- **Réalisation :** besoins métier, périmètre Data/IA, architecture Azure, planning,
  coûts, ROI, risques RGPD et critères de décision Go/No-Go.
- **Apport :** apprendre à traduire une idée IA en décision compréhensible par un COMEX.
- **Limite :** il s’agit d’un cadrage ; la pertinence de la recommandation reste à
  mesurer lors du POC.
- **Preuve :** `Cadrage_IA_Fashion_Insta_COMEX.pptx`.

## Home Credit — MLOps d’un modèle de scoring

- **Objectif :** entraîner, exposer et suivre un modèle de risque de défaut de paiement.
- **Réalisation :** pipeline LightGBM avec 20 variables sélectionnées, suivi MLflow,
  API FastAPI, dashboard Streamlit, conteneurisation et CI.
- **Résultat observé :** ROC-AUC 0,7699 et rappel 0,6988 sur le holdout, au seuil métier 0,52.
- **Apport :** relier métriques ML, coût métier, déploiement et dérive des données.
- **Limite :** la validation porte sur le dataset Home Credit, pas sur un flux bancaire réel.
- **Preuve :** notebooks, `app/models/model_metadata.json` et dépôt
  <https://github.com/Soct/oc_mlops>.

## BrainScanAI — apprentissage semi-supervisé d’IRM

- **Objectif :** produire des pseudo-labels par clustering, puis comparer trois stratégies CNN.
- **Réalisation :** audit de 1 506 fichiers, déduplication, embeddings ResNet18,
  quatre méthodes de clustering et séparation stricte du test final.
- **Résultat observé :** rappel cancer de 1,00 pour le supervisé, 0,90 pour les
  labels faibles et 0,80 pour le semi-supervisé. Le semi-supervisé ne dépasse pas la baseline.
- **Apport :** présenter un résultat négatif sans le masquer et repérer les risques de fuite.
- **Limite :** seulement 20 images dans le test final et aucune validation clinique.
- **Preuve :** deux notebooks et `presentation_brainscanai.pdf`.

## CheckIt.AI — pipeline de données multimodales

- **Objectif :** collecter et normaliser des publications comprenant du texte et une image.
- **Réalisation :** extraction de flux RSS, transformation JSONL, chargement SQLite,
  DAG Airflow, métriques d’exécution et dashboard Streamlit.
- **Résultat observé :** run de référence de 50 publications ; 14 tests et 86,79 %
  de couverture documentée.
- **Apport :** construire un ETL idempotent et observable sans fabriquer de labels vrai/faux.
- **Limite :** les URL d’images sont contrôlées syntaxiquement, sans validation HTTP complète.
- **Preuve :** dossier `livrables/` et `resume.md`.

## OpenAgenda — API RAG

- **Objectif :** répondre à des questions sur des événements d’Île-de-France à partir
  des données OpenAgenda.
- **Réalisation :** collecte JSONL, embeddings Mistral, index FAISS, filtrage temporel,
  génération sourcée, API FastAPI et conteneurisation.
- **Résultat observé :** sur 10 cas annotés, précision du contexte 1,00, pertinence
  de réponse 0,8536 et fidélité 0,70 ; 76 tests et 71 % de couverture documentée.
- **Apport :** séparer qualité de recherche et qualité de génération.
- **Limite :** l’échantillon d’évaluation est trop petit pour généraliser ; la fidélité
  au contexte reste l’axe prioritaire.
- **Preuve :** `docs/TECHNICAL_REPORT.md`, présentation et `scores.json`.

## Eagle-1 — agent d’apprentissage par renforcement

- **Objectif :** entraîner et exposer un agent DQN sur `LunarLander-v3`.
- **Réalisation :** notebook d’entraînement, évaluation sur 100 épisodes, vidéo,
  API FastAPI, interface et dashboard Streamlit.
- **Résultat observé :** récompense moyenne 225,42 ± 103,73 et 77 % d’épisodes à
  200 points ou plus ; la dispersion reste élevée.
- **Apport :** choisir un algorithme adapté à un espace d’actions discret et suivre
  la variabilité des épisodes.
- **Limite :** environnement simulé et résultat sensible aux graines.
- **Preuve :** notebook, vidéo et `rapport.md`.

## Qwen3 médical — fine-tuning LoRA et DPO

- **Objectif :** adapter un modèle Qwen3 1,7B à des questions médicales bilingues.
- **Réalisation :** préparation de jeux SFT/DPO, contrôles PII, entraînement LoRA 4-bit,
  alignement DPO et comparaison avec le modèle de base.
- **Résultat observé :** sur 233 QCM, le checkpoint SFT passe de 12 à 102 réponses
  exactes ; les gains sur 267 réponses libres sont plus faibles et irréguliers.
- **Apport :** distinguer amélioration sur tâche structurée et qualité de génération libre.
- **Limite :** licences de certaines sources à confirmer et validation humaine médicale absente.
- **Preuve :** trois notebooks de référence et `rapport.md`.

## Coach d’ouvertures FFE — agent LangGraph

- **Objectif :** produire un conseil pédagogique à partir d’une position d’échecs.
- **Réalisation :** orchestration LangGraph entre Lichess, Stockfish, une recherche
  vectorielle Milvus et des ressources vidéo, avec interface Angular et API FastAPI.
- **Résultat observé :** parcours de démonstration avec solutions de repli lorsque
  Lichess, YouTube ou Milvus ne sont pas disponibles.
- **Apport :** concevoir un agent déterministe, observable et dégradable proprement.
- **Limite :** la recherche d’une position dans une vidéo et le serveur MCP ont été
  étudiés, mais ne sont pas implémentés dans le POC.
- **Preuve :** application et `livrable/rapport-etude-video-mcp.md`.

## Lecture du parcours

Ces projets montrent une progression depuis le cadrage d’un cas d’usage jusqu’à
l’industrialisation, puis vers des systèmes spécialisés : données multimodales,
vision, RAG, apprentissage par renforcement, fine-tuning et agents. Le point commun
est la recherche de preuves mesurables et la documentation des limites. Les axes à
renforcer restent l’évaluation sur données réelles, le suivi de production et la
validation par des utilisateurs ou experts métier.
