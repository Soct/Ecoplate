# Rapport de projet — EcoPlate Edge

## Conduire un projet d’AI Engineering de l’idée au prototype

**Version :** 1.2 — 14 septembre 2026  
**Nature :** projet personnel technique  
**Statut :** MVP fonctionnel, benchmark Food-101 et documentation réalisés. La
validation sur des photos prises en conditions réelles reste à mener.

> Ce rapport présente les décisions, les preuves et les limites du projet dans un
> format complet destiné à accompagner la démonstration interactive.

## Synthèse exécutive

EcoPlate Edge explore la question suivante : peut-on fournir une première indication
climatique à partir d’une photo sans envoyer cette photo à un serveur ? Le MVP apporte
une réponse limitée mais opérationnelle. Un modèle EfficientNet-Lite0 quantifié est
chargé avec MediaPipe et exécuté dans le navigateur. Ses classes restent visibles avec
leur confiance. L’utilisateur peut les confirmer, les corriger ou les compléter par
un texte. Une couche distincte relie huit familles alimentaires à des profils
AGRIBALYSE 3.2 et produit A–E ou `?`.

Le principal arbitrage est de spécialiser un backbone compact sur Food-101, tout en
conservant le modèle ImageNet original comme baseline mesurable. Sur les 25 250 images
de validation Food-101 relabellisées, le fine-tuning atteint 54,27 % de top-1,
82,95 % de top-3 et 53,69 % de macro-F1, contre 15,28 %, 33,90 % et 17,02 % pour
ImageNet. Le modèle produit pèse 3,95 Mio. Ces mesures valident la spécialisation dans
Food-101, pas la performance sur des photos utilisateur. Le rejet explicite, le
top-k, le texte et la validation humaine restent donc centraux. Une grille séparée de
30 photos réelles reste à exécuter sur les appareils cibles.

# 1. Contexte et analyse des besoins

## 1.1 Contexte et rôle

Ce projet personnel a été construit pour démontrer une chaîne complète d’AI
Engineering autour d’un cas d’usage concret : classification alimentaire locale et
repère climatique qualitatif. Il n’existe pas de système de production ni de
client à migrer ; les besoins et critères ci-dessous constituent donc un cadrage
explicite du prototype.

Le rôle couvert par ce document rassemble le cadrage, l’audit des données, le choix
technique, l’implémentation, l’évaluation, la documentation et le déploiement. Les
résultats sont présentés avec leur périmètre réel afin de ne pas confondre une
validation de dataset avec une preuve de performance produit.

Enjeux :

- produire une démonstration compréhensible en moins d’une minute ;
- illustrer une chaîne Edge AI et non une simple maquette ;
- protéger une image potentiellement personnelle ;
- éviter qu’un indicateur pédagogique soit pris pour une mesure scientifique ;
- déployer sans infrastructure payante, sur GitHub Pages ;
- rattacher décisions, compétences et limites à des preuves consultables.

Contraintes : navigateur moderne, fonctionnement mobile, hébergement statique, budget
d’infrastructure nul, modèle compact, accessibilité clavier, source environnementale
unique, absence de backend et délai global estimé à 26–40 heures dans le plan.

## 1.2 Collecte et analyse du besoin métier

### Parties prenantes

| Partie prenante | Attente | Implication |
|---|---|---|
| Utilisateur de démonstration | réponse rapide, privée et compréhensible | fournit image, texte et correction |
| Recruteur | preuve d’AI Engineering et de recul critique | consulte démo, rapport et métriques |
| Lecteur technique ou recruteur | comprendre les choix et évaluer les preuves | consulte la démo, le code et la documentation |
| Porteur du projet | projet finissable, démontrable et maintenable | arbitre, implémente, mesure et documente |
| ADEME / Google | producteurs des données et du modèle | sources attribuées, licences respectées |

### Méthode de recueil

Le besoin est traduit en backlog et en critères d’acceptation à partir du cas d’usage,
des contraintes de confidentialité et de l’objectif de démonstration. Les éléments
non encore mesurés sont séparés des résultats vérifiés ; aucune performance sur des
photos utilisateur n’est déduite du benchmark Food-101.

### Besoins hiérarchisés

| ID | Besoin | Priorité | Critère d’acceptation |
|---|---|:---:|---|
| B01 | Analyser une image sans backend | P1 | aucune requête contenant l’image ; inférence effective en navigateur |
| B02 | Montrer les prédictions et la confiance | P1 | suggestions au-dessus d'un seuil réglable, classe originale conservée |
| B03 | Refuser les cas insuffisants | P1 | `?` sous le seuil, en ambiguïté ou sans mapping |
| B04 | Corriger le modèle | P1 | validation, retrait, remplacement et ajout possibles |
| B05 | Fournir A–E explicable | P1 | résultat issu de la liste affichée, facteurs et limites visibles |
| B06 | Ajouter un texte facultatif | P2 | synonymes, accents, quantités simples et inconnus gérés localement |
| B07 | Conserver la provenance | P2 | badges vision, texte et utilisateur ; preuves fusionnées |
| B08 | Sourcer les profils | P2 | version, code AGB, unité, DQR, justification et limites |
| B09 | Mesurer et tester | P2 | tests automatisés, taille, latence par inférence, protocole 30 images |
| B10 | Être accessible et responsive | P2 | navigation clavier, focus, contraste, mobile, score non porté par la couleur seule |
| B11 | Calculer des portions avancées | P3 | reporté ; seule une masse explicitement saisie pondère les repères |
| B12 | Accélérer par WebGPU | P3 | reporté après benchmark CPU/WASM |

### Contraintes éthiques, sécurité et déploiement

- minimisation : l’image n’est ni persistée ni transmise ;
- transparence : source, confiance, mapping et limites sont consultables ;
- contrôle humain : aucune prédiction n’est irréversible ;
- accessibilité : messages textuels, libellés explicites et focus visibles ;
- environnement : aucune promesse de certification ou de valeur exacte ;
- sécurité : types de fichier et taille validés, aucune donnée utilisateur injectée en
  HTML, aucune clé secrète et aucun service serveur.

# 2. Audit de la solution data existante ou proposée

## 2.1 Solution actuelle ou proposée

Au démarrage, aucune solution n’existait. La proposition initiale prévoyait Vite,
TypeScript, un modèle ONNX ou TensorFlow.js, des profils JSON et GitHub Pages. L’audit
de faisabilité a conduit à MediaPipe Tasks Vision avec EfficientNet-Lite0 int8 : le
modèle officiel contient ses métadonnées, le runtime gère le prétraitement final et
le déploiement reste statique.

Flux implémenté :

```text
File local -> validation 12 Mo -> createImageBitmap -> recadrage 224 x 224
 -> MediaPipe WASM CPU -> modèle Food-101 -> top 3 des 8 familles
                              ou baseline ImageNet -> mapping 8 familles
Texte -> normalisation accents/synonymes/grammes -> familles + inconnus
Vision + texte + utilisateur -> fusion et contradictions -> profils AGRIBALYSE
 -> règle A-E ou ? -> explication, confiance, hypothèses et alternative
```

Le modèle, le runtime WASM, les mappings et les données environnementales sont des
ressources statiques. Aucun Data Lake, orchestrateur, gateway, base ou API n’est utile
au MVP, ce qui réduit coût et surface d’attaque.

## 2.2 Évaluation de l’adéquation aux besoins

| Critère | Évaluation | Preuve / écart |
|---|---|---|
| Confidentialité | forte | architecture sans upload, traitement mémoire |
| Coût | fort | hébergement Pages et inférence client, sans serveur |
| Déployabilité | forte | build Vite autonome, chemins relatifs, workflow Pages |
| Latence | mesurée localement, à confirmer sur appareils cibles | Food-101 : médiane 31 ms, p95 59 ms dans Firefox headless |
| Couverture alimentaire | moyenne dans Food-101, inconnue en usage | top-3 Food-101 82,95 % ; photos utilisateur non mesurées |
| Robustesse | moyenne | rejet et correction ; photos réelles encore à mesurer |
| Explicabilité | forte | top-k, provenance, contradictions et règles distinctes |
| Maintenance | forte | modules typés, JSON versionné et tests |
| Accessibilité | bonne base | HTML sémantique, focus, clavier, réduction des animations ; audit manuel restant |
| Scalabilité | adaptée | calcul distribué sur les appareils, pas de charge serveur |

### Audit des données visuelles

Food-101 comporte 101 catégories de plats. Leur relabellisation forcée crée un jeu
très déséquilibré et transforme 61 recettes ambiguës en une famille unique. L'audit
conservateur les traite comme `unknown` au moment de l'évaluation. ImageNet comporte
1 000 catégories génériques et sert désormais de baseline, non de modèle produit.
La campagne de 30 photos conditionne toujours la validation en conditions d'usage.

### Audit des profils environnementaux

AGRIBALYSE 3.2 est cohérent, versionné et sous Licence Ouverte 2.0. Huit produits de
référence ont été extraits du même CSV et du même indicateur. L’écart principal est
le passage d’un produit précis à une famille large. Les chiffres ne sont donc pas
affichés comme empreinte du repas. Les DQR et limites restent documentées.

### Limites actuelles et prochaine étape

- collecter et exécuter les 30 photographies autorisées ;
- mesurer médiane/p95 sur ordinateur et mobile ;
- vérifier manuellement réseau, contraste et lecteurs d’écran ;
- compléter l’évaluation avant toute généralisation à des photos utilisateur.

# 3. Identification d’une solution technique cible

## 3.1 Comparatif des approches

### Local ou backend

| Option | Confidentialité | Coût récurrent | Modèle lourd | Déploiement | Décision |
|---|:---:|:---:|:---:|:---:|---|
| Backend d’inférence | faible sans mesures supplémentaires | moyen | favorable | complexe | rejetée pour le MVP |
| API tierce | faible | variable | favorable | simple | rejetée : image transmise |
| Navigateur WASM | forte | nul | limité | statique | retenue |

### Modèle généraliste ou spécialisé

| Option | Taille | Couverture aliments | Provenance | Risque |
|---|---:|---:|---:|---|
| EfficientNet-Lite0 int8 / ImageNet | 5,18 Mio | top-3 33,90 % sur Food-101 | officielle et claire | mapping très incomplet |
| EfficientNet-Lite0 fine-tuné / Food-101 | 3,95 Mio | top-3 82,95 % sur Food-101 | pipeline local documenté | mapping forcé, domaine réel inconnu |
| SlimSAM + classifieur | poids supplémentaires | gain non établi | ablation seulement | latence et téléchargement |

### Qualitatif ou chiffré

| Option | Compréhension | Risque de fausse précision | Données nécessaires | Décision |
|---|---|---|---|---|
| kg CO2e automatique | élevée en apparence | très élevé | masse et recette fiables | rejetée |
| A–E avec limites | élevée | maîtrisable | famille + repère | retenue |
| aucun résultat climat | faible valeur produit | nul | aucune | rejetée |

## 3.2 Matrice de décision pondérée

Notation de 1 (défavorable) à 5 (favorable).

| Critère | Poids | Baseline ImageNet | Fine-tuning Food-101 | Backend spécialisé |
|---|---:|---:|---:|---:|
| Confidentialité | 25 % | 5 | 5 | 2 |
| Taille / démarrage | 20 % | 4 | 5 | 4 |
| Adéquation alimentaire | 20 % | 1 | 4 | 5 |
| Coût | 15 % | 5 | 5 | 2 |
| Maintenance | 10 % | 4 | 4 | 2 |
| Faisabilité délai | 10 % | 5 | 4 | 2 |
| **Score pondéré / 5** | **100 %** | **3,90** | **4,60** | **3,00** |

Le modèle Food-101 est retenu : il domine le baseline ImageNet en top-1, top-3 et
macro-F1 tout en étant plus petit. L'image entière reste le prétraitement par défaut :
sur l'ablation de 808 images, la grille gagne 4,83 points de top-1 mais ne gagne rien
en top-3 et multiplie la latence par environ huit à dix. SlimSAM est désactivé après
un timeout et une erreur réseau avant sa première inférence.

## 3.3 Architecture cible et sécurité

L’architecture détaillée figure dans `docs/architecture.md`. Les composants communiquent
uniquement par objets TypeScript en mémoire. Le score ne reçoit jamais un tensor ou
une image. Le workflow de déploiement possède seulement `contents: read`, `pages: write`
et `id-token: write`. Aucun secret d’application n’est nécessaire.

## 3.4 Identification et priorisation des cas d’usage

| Cas | Valeur | Effort | Priorité |
|---|---:|---:|:---:|
| Aliment isolé + correction | 5 | 3 | P1 |
| Description seule | 4 | 2 | P1 |
| Plat simple + texte | 4 | 3 | P1 |
| Assiette multi-aliments | 5 | 5 | futur |
| Portion déclarée | 3 | 2 | P2 partielle |
| Comparaison de repas | 3 | 3 | futur |
| Historique utilisateur | 2 | 4 | exclu |

# 4. Stratégie de mise en œuvre et d’industrialisation

## 4.1 Proposition de démarche projet

### Roadmap, jalons et responsabilités

| Phase | Contenu | Estimation | Preuve / état |
|---|---|---:|---|
| 0 | cadrage, familles, réussite | 1–2 h | plan et périmètre — réalisé |
| 1 | faisabilité modèle | 1–2 h | baseline ImageNet 5,18 Mio — réalisé |
| 2 | structure TypeScript/Vite | 1–2 h | modules et types — réalisé |
| 3 | vision locale | 4–7 h | import, top-k, mapping, erreurs — réalisé |
| 4 | profils environnementaux | 2–4 h | JSON AGRIBALYSE sourcé — réalisé |
| 5 | texte | 3–5 h | synonymes, grammes, inconnus — réalisé |
| 6 | validation et fusion | 3–5 h | correction, provenance, contradiction — réalisé |
| 7 | score et interface | 4–6 h | A–E / `?`, responsive, accessible — réalisé |
| 8 | évaluation | 4–6 h | Food-101 complet et ablation grille réalisés ; photos réelles à exécuter |
| 9 | documentation / déploiement | 3–5 h | docs, workflow et pages générées — réalisé |
| Documentation | étude de cas, rapport, carte, réflexion | inclus dans le projet | preuves organisées et accessibles |

La durée annoncée est une estimation de cadrage, pas un temps réellement mesuré. Un
suivi précis devra être ajouté si le projet est repris dans un contexte professionnel.

### Méthode

Kanban simple : `À faire`, `En cours`, `À vérifier`, `Terminé`. Chaque élément est
fermé avec un test, une mesure, une source ou une limite écrite. L’intégration continue
applique : installation verrouillée, tests, compilation TypeScript, build, publication.

### Definition of Done

- code compilé sans erreur TypeScript ;
- tests automatisés passants ;
- classe originale et confiance visibles ;
- correction complète possible au clavier ;
- score issu de la liste visible ;
- source/licence/limites documentées ;
- build statique charge modèle et WASM sous un sous-chemin ;
- métriques non remplies remplacées par un état explicite, jamais une estimation.

## 4.2 Aide à la prise de décision

### Risques et atténuations

| Risque | Probabilité | Impact | Réponse | Indicateur |
|---|:---:|:---:|---|---|
| classes difficiles à mapper | forte | fort | mapping court, `?`, texte, modèle spécialisé si top-3 < 60 % | top-3, corrections |
| modèle trop lourd | faible | moyen | int8 3,95 Mio, chargement à la demande | taille, temps de chargement |
| photo complexe trompeuse | forte | fort | périmètre visible, validation, cas hors périmètre | rejet utile |
| score pris pour une vérité | moyen | fort | vocabulaire indicatif, facteurs non affichés en résultat | test utilisateur |
| données environnementales mal interprétées | moyen | fort | source unique, codes, DQR, limites | tests de traçabilité |
| incompatibilité mobile | moyen | fort | CPU/WASM, matrice appareils | échecs, p95 |
| dépendance fournisseur | faible | moyen | modèle local, abstraction `model.ts` | capacité de remplacement |
| accessibilité insuffisante | moyen | moyen | HTML natif, clavier, focus, audit manuel | blocages WCAG |

### Scénarios budgétaires

| Scénario | Infrastructure | Travail | Usage recommandé |
|---|---:|---:|---|
| MVP Pages | 0 € hors limites de l’hébergeur | 26–40 h prévues | retenu |
| Modèle spécialisé navigateur | 0 € infra | entraînement et benchmark réalisés | retenu dans le MVP |
| Service backend | hébergement + observabilité + trafic | plusieurs semaines | seulement pour besoins non compatibles Edge |

Le coût de travail doit être valorisé avec le taux journalier du contexte réel ; aucun
taux fictif n’est imposé dans ce rapport.

### KPI de succès

- zéro image transmise ;
- top-3 ≥ 60 % sur cas en périmètre ;
- rejet utile ≥ 70 % sur cas hors périmètre ;
- détection textuelle ≥ 90 % sur 15 cas ;
- latence médiane < 500 ms ordinateur et < 1 500 ms mobile, après chargement ;
- zéro blocage clavier ;
- 100 % des profils avec code, version, unité, DQR et limites ;
- démonstration comprise en moins d’une minute par une personne extérieure.

# 5. Contrôle et suivi du projet

## 5.1 Tableau de bord de pilotage

| Dimension | Indicateur | Situation actuelle | Action |
|---|---|---|---|
| Délais | phases terminées / prévues | technique et documentation construits ; campagne réelle restante | planifier la collecte et l’évaluation |
| Coût | services payants | 0 service requis | surveiller limites Pages |
| Preuves | critères de fin | app, tests, documentation, carte et workflow présents | maintenir les liens et les versions |
| Données | profils traçables | 8/8 | revoir à chaque version AGRIBALYSE |
| Qualité texte | cas documentés | 15 automatisés | enrichir seulement avec erreurs réelles |
| Vision Food-101 | top-1 / top-3 / macro-F1 | 54,27 % / 82,95 % / 53,69 % | analyser les familles faibles |
| Vision usage réel | top-1 / top-3 / rejet | non mesurés honnêtement | exécuter les 30 photos |
| Edge | taille | 4 140 006 octets | acceptable pour le MVP |
| Latence | médiane / p95 | Firefox headless : 31 / 59 ms, 10 passages | mesurer sur appareils cibles |
| Accessibilité | blocage clavier | audit manuel non terminé | grille desktop/mobile |

## 5.2 Outils et processus de suivi

Le monitoring du MVP est local et respectueux de la vie privée : la dernière latence
est affichée dans la page, sans télémétrie distante. La future agrégation de benchmark
utilise `src/evaluation/metrics.ts` à partir de résultats volontairement exportés.

Tests : Vitest pour les règles métier et les mappings, compilation TypeScript stricte,
build Vite, vérification manuelle du parcours, inspection réseau et campagne photo.
Une charge serveur n’a pas de sens ici ; les essais portent sur temps de chargement,
mémoire et latence d’inférence des appareils.

Critères de contrôle en CI :

```text
npm ci -> npm test -> npm run build -> artefact Pages -> déploiement
```

# 6. Conclusion et recommandations

Le MVP démontre la chaîne attendue : inférence réelle dans le navigateur, données
locales, confiance, intervention humaine, fusion explicable, décision qualitative,
tests et déploiement statique. Son apport principal est méthodologique : le système
ne masque ni l’incertitude du modèle ni l’écart entre une famille et un profil ACV.

La priorité suivante n’est pas d’ajouter des fonctionnalités. Il faut d’abord exécuter
le protocole de 30 photos. Si le seuil top-3 n'est pas atteint sur ces photos, réduire
les familles visuelles ou réentraîner avec `mixed_dish` et `unknown`. Ensuite seulement : améliorer les
quantités, essayer WebGPU, comparer deux repas ou prendre en compte saison et origine.

Avant un usage élargi : exécuter la campagne photo, terminer l’audit manuel
d’accessibilité et mesurer les appareils cibles. Le prototype est déjà publiable
comme démonstrateur à condition de conserver ses limites visibles.

# 7. Ressources associées

- application et portfolio : `index.html` + `src/` ;
- guide de lancement : `README.md` ;
- architecture : `docs/architecture.md` ;
- modèle : `docs/model-card.md` ;
- données : `docs/data-card.md` ;
- évaluation : `docs/evaluation.md` ;
- jeu visuel : `evaluation/vision-cases.csv` ;
- cas textuels : `evaluation/text-cases.json` ;
- décisions : `docs/journal-decisions.md` ;
- compétences : `docs/competences.md` ;
- carte mentale : `public/livrables/carte-mentale.svg` ;
- captures responsive : `public/livrables/demo-desktop.png` et `demo-mobile.png` ;
- workflow : `.github/workflows/deploy-pages.yml`.

## Bibliographie et licences

- ADEME, AGRIBALYSE® 3.2, DOI `10.57745/XTENSJ`, Licence Ouverte 2.0 :
  <https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/XTENSJ>
- Synthèse officielle : <https://www.data.gouv.fr/datasets/agribalyse-synthese>
- Google AI Edge, Image Classifier :
  <https://developers.google.com/edge/mediapipe/solutions/vision/image_classifier>
- MediaPipe, licence Apache 2.0 : <https://github.com/google-ai-edge/mediapipe>
- EfficientNet, Tan & Le (2019) : <https://arxiv.org/abs/1905.11946>
