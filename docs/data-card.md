# Data card — profils environnementaux

## Source

| Champ | Valeur |
|---|---|
| Producteur | ADEME, programme AGRIBALYSE® |
| Jeu | AGRIBALYSE — Synthèse |
| Version | 3.2, tableur produits alimentaires publié en août 2025 |
| Ressource CSV consultée | publication data.gouv mise à jour le 29 janvier 2026 |
| Indicateur | Changement climatique |
| Unité | kg CO2e / kg de produit consommé |
| Licence | Licence Ouverte / Open Licence 2.0 |
| Page officielle | <https://www.data.gouv.fr/datasets/agribalyse-synthese> |
| Documentation | <https://doc.agribalyse.fr/documentation/les-donnees/documentation-complete> |
| Empreinte du CSV consulté | SHA-256 `0c85fdf1a257e27e7ea771789a2b973b8c2fe946aa2bc43a1fcc906c2f565cc4` |

AGRIBALYSE est une base d’Analyse du Cycle de Vie. Ses résultats agrègent plusieurs
étapes du champ à l’assiette et reposent sur des hypothèses méthodologiques. La page
officielle précise que ces données scientifiques doivent être adaptées à leur contexte
d’usage et ne constituent pas directement un affichage environnemental grand public.

## Sous-ensemble embarqué

EcoPlate Edge ne mélange aucune autre source chiffrée. Huit lignes du même indicateur
et de la même version sont utilisées comme repères :

| Famille interne | Code AGB | Produit de référence | Facteur | DQR | Niveau |
|---|---:|---|---:|---:|:---:|
| `beef` | 6200 | Bœuf, steak ou bifteck, grillé | 36,6 | 2,86 | E |
| `pork` | 28202 | Porc, filet, maigre, en rôti, cuit | 8,4 | 2,86 | D |
| `poultry` | 36005 | Poulet, viande et peau, rôti/cuit au four | 6,13 | 2,31 | C |
| `fish` | 26038 | Saumon, cuit à la vapeur | 6,87 | 2,59 | C |
| `dairy` | 12115 | Emmental ou emmenthal | 6,28 | 1,77 | C |
| `eggs` | 22010 | Œuf, dur | 2,74 | 2,46 | B |
| `legumes` | 20904 | Tofu, nature | 1,00 | 2,04 | A |
| `plants` | 20047_2 | Tomate de saison, crue | 0,626 | 2,43 | A |

La DQR est conservée comme métadonnée de qualité de donnée. Le fichier exécutable
`src/climate/profiles.json` contient en plus la justification et les limites de
chaque mapping.

## Transformation

Les facteurs ne sont pas exposés comme « empreinte du repas ». Ils déterminent des
niveaux internes selon les seuils documentés suivants :

| Niveau | Facteur de référence |
|:---:|---:|
| A | ≤ 2 |
| B | > 2 et ≤ 4 |
| C | > 4 et ≤ 7 |
| D | > 7 et ≤ 15 |
| E | > 15 |

Sans quantités complètes, le niveau le plus prudent des familles retenues détermine
le résultat. Lorsque toutes les quantités sont saisies par l’utilisateur, une moyenne
pondérée des seuls repères est possible. Elle reste nommée « repère pondéré » et non
« kg CO2e du repas ».

## Limites structurelles

- Une famille interne couvre beaucoup plus d’aliments qu’un produit de référence.
- `plants` agrège fruits, légumes et féculents dont les impacts sont très variables.
- `dairy` utilise un fromage et ne représente pas correctement lait et yaourt.
- `fish` utilise le saumon et ne couvre pas la diversité des pêches et élevages.
- `pork` étend un profil de filet aux charcuteries.
- Le facteur par kilogramme ne tient pas compte d’une portion tant que l’utilisateur
  ne la déclare pas.
- L’indicateur climatique ne résume pas biodiversité, eau, usage des sols ou nutrition.
- La saison, l’origine, le transport, la cuisson et le gaspillage réels sont inconnus.

## Qualité, maintenance et versionnement

Avant toute mise à jour :

1. télécharger la ressource officielle ;
2. vérifier la version, la licence, l’unité et l’indicateur ;
3. comparer les huit codes AGB et les colonnes utilisées ;
4. exécuter les tests de couverture et de traçabilité ;
5. réexaminer les seuils et les explications ;
6. noter la décision dans `docs/journal-decisions.md`.

Un changement de version AGRIBALYSE ne doit jamais être appliqué silencieusement.
