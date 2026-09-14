# Modèles locaux

| Fichier | Rôle | Sorties | Taille | SHA-256 |
|---|---|---:|---:|---|
| `efficientnet_lite0_food101_8_int8.tflite` | modèle produit, fine-tuné sur Food-101 relabellisé | 8 | 4 140 006 octets | `5b7d5e3ea72564157a5763c78bdf8536cf25805f15bfc5a284eb1d3c84d4c2ae` |
| `efficientnet_lite0_imagenet_int8.tflite` | baseline Google AI Edge original | 1 000 | 5 434 517 octets | `bc2ffe19c1118de0c0c2a9088992da5589722656e0fba81421385300a4a34b16` |

Les noms décrivent volontairement le jeu d'entraînement et le nombre de sorties.
`src/vision/modelConfig.test.ts` vérifie tailles et empreintes pour empêcher qu'un
renommage manuel inverse à nouveau leur identité.

Le baseline provient de Google AI Edge / MediaPipe :
<https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/int8/latest/efficientnet_lite0.tflite>.
Les deux modèles reçoivent une image RGB 224 × 224. Le modèle Food-101 produit
directement les huit familles ; le baseline passe par le mapping ImageNet explicite.
