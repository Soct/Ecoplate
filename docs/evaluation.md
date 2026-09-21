# Résultats et protocole d’évaluation

## À retenir

Le modèle Food-101 classe nettement mieux les images de son jeu de validation que le
modèle ImageNet de référence. Ce résultat ne permet pas encore de conclure pour des
photos prises par les utilisateurs. La réponse `?`, la correction humaine et la
future campagne de 30 photos sont donc aussi importantes que le taux de bonnes
classifications.

Ressources évaluées : [modèle EcoPlate TFLite](https://soct.github.io/Ecoplate/models/efficientnet_lite0_food101_8_int8.tflite),
[jeu de données Food-101 sur Hugging Face](https://huggingface.co/datasets/ethz/food101)
et [page originale de Food-101](https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/).

## Synthèse au 10 septembre 2026

La spécialisation du modèle sur Food-101 apporte un gain net sur le jeu de validation
regroupé en huit familles : **54,27 % d’exactitude top-1 contre 15,28 %** pour
ImageNet, et **82,95 % de top-3
contre 33,90 %**. La macro-F1 passe de **17,02 % à 53,69 %**.

Ces chiffres indiquent la capacité du modèle à reproduire un regroupement construit
à partir de Food-101 sur des images issues de ce même jeu. Ils ne mesurent pas encore
la performance sur des photos utilisateur en conditions réelles.

| Élément | État | Résultat vérifié |
|---|---|---|
| Identité modèle produit | vérifiée | Food-101, 8 sorties, 4 140 006 octets, SHA-256 testé |
| Modèle de référence | vérifié | ImageNet, 1 000 sorties, 5 434 517 octets, SHA-256 testé |
| Split de validation | évalué en entier | 25 250 images, 101 classes, 8 familles forcées |
| Tests unitaires | exécutés | 83 tests |
| Benchmark navigateur | exécuté | Firefox 155 headless, 10 passages par configuration |
| Grille 3 × 3 | ablation exécutée | 808 images : 8 par classe Food-101 |
| SlimSAM | échec mesuré | aucune inférence en 60 s, erreur réseau au chargement des poids ; option désactivée |
| Photos utilisateur | protocole prêt | 30 cas à collecter ; aucune métrique annoncée |

Les artefacts sources sont :

- `evaluation/food101-benchmark.json` : split complet ;
- `evaluation/food101-stratified-full-benchmark.json` : référence de l'ablation ;
- `evaluation/food101-grid-benchmark.json` : grille sur les mêmes 808 images ;
- `evaluation/browser-latency.json` : mesures Firefox ;
- `evaluation/browser-preprocessing-ablation.json` : comparaison produit et échec SlimSAM ;
- `training/evaluate_models.py` : calcul reproductible.

## Reproductibilité et écart entre appareils

Avec le même modèle, le même navigateur, le même appareil et le même prétraitement,
une image produit le même classement lors des essais successifs. Cette stabilité ne
garantit toutefois pas des scores identiques entre deux appareils.

Un écart a été constaté manuellement avec `public/demo-images/image1.png` sur la
version déployée : l’ordinateur propose `dairy / plants / beef`, tandis que le
téléphone propose `dairy / plants / fish`. Les scores de protéine sont faibles et
proches (environ 9–11 %), ce qui suffit à changer la troisième proposition après
le filtrage des protéines concurrentes.

L’application exécute pourtant le même modèle TFLite et le même code métier en local.
L’écart peut venir du décodage des couleurs, du redimensionnement de l’image, de
l’implémentation WASM/CPU ou du navigateur. Il ne dépend pas d’une source de données
distante, puisque l’inférence est locale. Cette explication doit encore être vérifiée
sur plusieurs appareils en enregistrant les pixels transmis au modèle, l’identité du
fichier chargé et les scores avant filtrage. En attendant, les comparaisons doivent
être effectuées sur un même appareil.

## Comparaison entre ImageNet et le modèle spécialisé

Mesures brutes, avant application du rejet :

| Modèle | Taille | Exactitude top-1 | Top-3 | Macro-F1 |
|---|---:|---:|---:|---:|
| ImageNet original + mapping | 5,18 Mio | 15,28 % | 33,90 % | 17,02 % |
| Food-101 fine-tuné, int8 | 3,95 Mio | **54,27 %** | **82,95 %** | **53,69 %** |
| Gain absolu | −1,23 Mio | **+38,99 pts** | **+49,05 pts** | **+36,67 pts** |

### Précision, rappel et F1 par famille

| Famille | Support | ImageNet P / R / F1 | Food-101 P / R / F1 |
|---|---:|---:|---:|
| Bœuf | 2 500 | 28,0 / 21,2 / 24,1 % | 51,9 / 54,5 / 53,2 % |
| Porc | 1 500 | 29,6 / 17,7 / 22,2 % | 37,1 / 60,3 / 45,9 % |
| Volaille | 1 500 | 0,0 / 0,0 / 0,0 % | 27,5 / 69,1 / 39,3 % |
| Poisson | 4 750 | 54,6 / 0,4 / 0,8 % | 65,3 / 45,2 / 53,4 % |
| Produits laitiers | 5 750 | 55,8 / 25,7 / 35,2 % | 69,4 / 55,8 / 61,8 % |
| Œufs | 2 500 | 3,1 / 0,3 / 0,5 % | 49,8 / 63,1 / 55,6 % |
| Légumineuses | 1 250 | 38,3 / 19,6 / 25,9 % | 60,1 / 70,8 / 65,0 % |
| Végétaux/féculents | 5 500 | 32,4 / 23,9 / 27,5 % | 66,8 / 47,0 / 55,2 % |

Le modèle spécialisé progresse dans chaque famille, mais les résultats restent
insuffisants pour répondre sans réserve. La précision sur la volaille n’est que de
27,5 %, tandis que le rappel du poisson et celui des végétaux restent sous 50 %.

### Matrice de confusion du modèle Food-101

Lignes = famille attendue ; colonnes = top-1 prédit. Les cellules diagonales sont
les bonnes classifications.

| Attendu ↓ / prédit → | bœuf | porc | volaille | poisson | laitier | œufs | légum. | plantes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| bœuf | **1 363** | 245 | 321 | 130 | 143 | 169 | 37 | 92 |
| porc | 180 | **904** | 171 | 68 | 38 | 56 | 28 | 55 |
| volaille | 65 | 98 | **1 036** | 73 | 63 | 71 | 29 | 65 |
| poisson | 372 | 418 | 655 | **2 148** | 361 | 249 | 133 | 414 |
| laitier | 265 | 264 | 507 | 345 | **3 206** | 549 | 138 | 476 |
| œufs | 85 | 84 | 312 | 106 | 176 | **1 577** | 41 | 119 |
| légumineuses | 32 | 39 | 106 | 38 | 49 | 39 | **885** | 62 |
| plantes | 264 | 384 | 662 | 383 | 582 | 460 | 181 | **2 584** |

La matrice complète du modèle ImageNet, y compris la colonne des classes sans
correspondance, est conservée dans le fichier JSON. Ses règles d’association ne
prédisent pratiquement jamais la volaille, le poisson ou les œufs, ce qui explique
l’écart avec le modèle spécialisé.

## Étude du rejet

La règle de décision combine le seuil ci-dessous avec une marge d’ambiguïté de huit
points entre les deux premières familles. L’« exactitude opérationnelle » compte un
rejet comme une erreur sur une image Food-101. L’« exactitude des réponses acceptées »
ne porte que sur les images pour lesquelles le modèle a proposé une famille.

| Seuil | Rejet Food-101 | Exactitude opérationnelle | Exactitude des réponses acceptées | Rejet ImageNet | Exactitude ImageNet acceptée |
|---:|---:|---:|---:|---:|---:|
| 0 % | 27,48 % | 45,71 % | 63,04 % | 49,14 % | 27,45 % |
| 20 % | 27,48 % | 45,71 % | 63,04 % | 62,90 % | 35,10 % |
| **35 %** | **39,96 %** | **40,84 %** | **68,03 %** | **77,13 %** | **43,64 %** |
| 50 % | 68,12 % | 26,27 % | 82,42 % | 85,83 % | 50,38 % |
| 65 % | 84,68 % | 14,31 % | 93,41 % | 91,24 % | 58,02 % |

Le seuil 35 % conserve un compromis démontrable, mais rejette déjà quatre images
Food-101 sur dix. Monter le seuil augmente la précision des réponses conservées au
prix d'une couverture trop faible. Ce seuil n'est pas calibré pour les photos réelles.

## Ablation du prétraitement

L'ablation utilise les mêmes 808 images : huit exemples déterministes pour chacune
des 101 classes Food-101. SlimSAM n'est pas inclus, car ses poids ne sont pas conservés
localement et aucune vérité terrain de masque ne permet de valider la segmentation.

| Modèle / prétraitement | Top-1 | Top-3 | Macro-F1 | Rejet à 35 % | Latence TFLite médiane* |
|---|---:|---:|---:|---:|---:|
| Food-101 / image entière | 53,71 % | **83,66 %** | 52,71 % | 39,85 % | 5,81 ms |
| Food-101 / grille 3 × 3 | **58,54 %** | 83,54 % | **57,65 %** | **32,43 %** | 55,03 ms |
| ImageNet / image entière | 14,98 % | 34,03 % | 17,49 % | 77,85 % | 6,42 ms |
| ImageNet / grille 3 × 3 | 17,82 % | 34,41 % | 18,84 % | 71,41 % | 43,30 ms |

\* Mesure Python sur la machine d'évaluation, utile uniquement pour comparer les
variantes entre elles.

La grille gagne 4,83 points de top-1 pour le modèle spécialisé, mais perd 0,12 point
de top-3 et multiplie la latence locale par environ 9,5. Comme le produit présente un
top-3 et vise une interaction rapide, l'image entière reste le défaut. La grille et
SlimSAM ont été conservés comme ablations explicites pendant la mesure.

Un second passage dans l'application réelle, sur une image déterministe de chacune
des 101 classes, confirme la décision : l'image entière atteint 51,49 % de top-1,
84,16 % de top-3 et 40,59 % de rejet en 20 ms médian ; la grille atteint 54,46 %,
80,20 % et 34,65 % en 195 ms. SlimSAM ne produit aucune première inférence : après
60 secondes, l'interface remonte `NetworkError when attempting to fetch resource`
au téléchargement de ses poids. Un essai préalable avait déjà dépassé 240 secondes.
L’exactitude, le top-3 et le taux de rejet de SlimSAM sont donc **indisponibles**, et
non égaux à zéro. L’option reste désactivée tant que les poids ne sont pas disponibles
localement.

## Latence navigateur

Firefox 155 headless, Linux x86-64, même image locale, modèle déjà chargé, dix passages
par configuration. Le premier passage reste inclus. Cette série valide l'exécution et
compare les variantes ; elle ne généralise pas à d'autres appareils.

| Modèle / prétraitement | Médiane | P95 | Vues classées |
|---|---:|---:|---:|
| Food-101 / image entière | **31,0 ms** | 59 ms | 1 |
| Food-101 / grille 3 × 3 | 249,0 ms | 287 ms | 10 |
| ImageNet / image entière | **27,5 ms** | 57 ms | 1 |
| ImageNet / grille 3 × 3 | 302,0 ms | 347 ms | 10 |

Le modèle spécialisé est plus petit et plus exact que la référence ImageNet, sans
pénalité notable sur la durée d’une inférence. Le traitement par grille coûte environ
huit fois plus dans Firefox.

## Audit prudent du regroupement des classes

Le regroupement initial attribue toutes les classes à une famille. L’audit considère 61
classes ambiguës — `pizza`, `lasagna`, `risotto`, desserts et plats composés — comme
`unknown`. Cela représente 15 250 images, soit 60,40 % du split.

Avec le seuil choisi, le modèle Food-101 obtient 40,97 % d’exactitude et 36,23 % de
macro-F1 sur ce classement à neuf classes. ImageNet atteint 51,61 % d’exactitude,
mais seulement 17,69 % de macro-F1 : son score global vient surtout de son taux de
rejet de 77,13 %, pas d’une meilleure reconnaissance. Il faut donc présenter les
mesures par famille et entraîner une véritable classe `unknown`, plutôt que se fier
au seul score global.

## Erreurs représentatives et décisions

| Exemple | Attendu historique | Prédit Food-101 | Lecture | Décision |
|---|---|---|---|---|
| `apple_pie` | plantes | œufs, 25,4 % | dessert composite, vérité forcée | passer à `unknown` dans l'audit |
| `bread_pudding` | laitier | œufs, 53,1 % | deux familles plausibles | ne pas déduire une recette de la photo |
| `cannoli` | laitier | légumineuses, 54,3 % | erreur confiante | conserver rejet/correction et analyser la calibration |
| `caprese_salad` | laitier | bœuf, 23,0 % | faible confiance | le seuil 35 % doit rejeter ce cas |
| `ceviche` | poisson | laitier, 29,3 % | plat visuellement complexe | rejet et texte utilisateur utiles |
| `breakfast_burrito` avec ImageNet | œufs | plantes (`burrito`), 45,7 % | association fondée sur le nom trop réductrice | utiliser le modèle spécialisé |

Les chemins exacts et les scores non arrondis sont conservés dans les artefacts JSON.

## Protocole séparé pour les photos utilisateur

`evaluation/vision-cases.csv` définit 30 cas : trois exemples pour chacune des huit
familles, trois images non alimentaires et trois scènes complexes hors périmètre.
Ils doivent être collectés avec des photos personnelles ou sous licence, annotés avant
l'inférence, puis exécutés sur ordinateur et téléphone. Les métriques attendues sont
top-1, top-3, rejet utile, correction, médiane et p95 par appareil.

Tant que cette collecte n'est pas terminée, le portfolio doit afficher explicitement
« validation Food-101 » et « performance réelle non mesurée ».
