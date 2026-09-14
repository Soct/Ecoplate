# Guide de démonstration — 60 secondes

Ce guide aide à présenter le prototype rapidement. Il sert de support oral
complémentaire à la démonstration et aux documents techniques.

## Préparation

- ouvrir la page sur un navigateur récent ;
- choisir une photo autorisée d’un aliment simple ;
- disposer d’une description de secours : `150 g de bœuf, tomates et lentilles` ;
- laisser l’onglet réseau ouvert si la confidentialité doit être démontrée.

## Déroulé

| Temps | Action | Message clé |
|---:|---|---|
| 0–8 s | Montrer « 100 % navigateur » puis choisir la photo | « Le fichier reste dans cette page. » |
| 8–20 s | Lancer l’analyse et montrer les trois classes | « Le modèle propose, il ne décide pas. » |
| 20–32 s | Lire la confiance et la famille Food-101 proposée | « Une faible confiance ne devient jamais une certitude. Le baseline ImageNet reste sélectionnable. » |
| 32–43 s | Corriger une famille ou ajouter la description | « La correction humaine est prioritaire et traçable. » |
| 43–52 s | Montrer A–E ou `?`, le facteur principal et les limites | « C’est un repère qualitatif, pas un bilan carbone. » |
| 52–60 s | Ouvrir le rapport ou la model card | « Les choix, sources, tests et métriques non mesurées sont documentés. » |

## Variante sans photo alimentaire disponible

Saisir uniquement `150 g de bœuf, tomates et lentilles`, cliquer sur « Interpréter le
texte », puis retirer le bœuf pour montrer la mise à jour immédiate de l’indicateur.
Cette variante prouve les règles et la correction mais ne remplace pas la démonstration
d’inférence visuelle.

## Questions anticipées

**Pourquoi pas une empreinte exacte ?** La photo ne fournit ni masses fiables, ni
origine, ni recette. Le chiffre serait trompeur.

**Pourquoi ce modèle ?** Le backbone EfficientNet-Lite0 reste compact, mais il a été
fine-tuné sur Food-101 puis quantifié en int8. Le baseline ImageNet original est
conservé pour mesurer l'apport réel de cette spécialisation.

**Ces métriques valent-elles pour mes photos ?** Non. Elles portent sur le split de
validation Food-101 relabellisé. Les photos utilisateur constituent un autre domaine
et restent à mesurer avec le protocole séparé.

**Pourquoi SlimSAM est-il désactivé ?** Son chargement distant a échoué avant toute
inférence pendant le benchmark. Sans poids locaux, vérité terrain de masque ni gain
mesuré, il reste une ablation de prétraitement non exploitable dans le produit.

**Où part la photo ?** Nulle part : elle devient un bitmap et un canvas en mémoire.
Le site n’a aucun backend d’inférence.

**Que signifie `?` ?** Information insuffisante, ambiguë ou hors mapping. Ce statut
est distinct d’un impact élevé.
