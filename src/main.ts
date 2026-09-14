import './style.css';
import { calculateScore } from './climate/calculateScore';
import { profiles } from './climate/profiles';
import { mergeCandidates } from './fusion/mergeCandidates';
import { normalizeIngredients } from './text/normalizeIngredients';
import type { IngredientCandidate, UnknownTerm, VisionPrediction } from './types';
import { CandidateList } from './ui/CandidateList';
import { ImageInput } from './ui/ImageInput';
import { ResultCard } from './ui/ResultCard';
import { classifyImages } from './vision/model';
import {
  DEFAULT_MODEL_ID,
  MODEL_DESCRIPTORS,
  type ModelId,
} from './vision/modelConfig';
import { preprocessImage } from './vision/preprocess';
import {
  DEFAULT_DISPLAY_THRESHOLD,
  effectiveDisplayThreshold,
  filterCompetingPredictions,
} from './vision/displayPolicy';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Conteneur principal introuvable.');

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="#top" aria-label="EcoPlate Edge, accueil">
      <span class="brand-mark" aria-hidden="true">E</span>
      <span>EcoPlate <em>Edge</em></span>
    </a>
    <nav aria-label="Navigation principale">
      <a href="#demo">Démonstration</a>
      <a href="#study">Étude</a>
      <a href="#project">Projet</a>
      <a href="#privacy">Confidentialité</a>
      <a href="#skills">Compétences</a>
      <a href="#deliverables">Livrables</a>
    </nav>
    <span class="local-pill" aria-label="100 % local, aucune image envoyée"><span aria-hidden="true">●</span><span class="local-pill-label">100 % local · aucune image envoyée</span></span>
  </header>

  <main id="main-content">
    <section class="hero" id="top">
      <div class="hero-copy">
        <p class="eyebrow">POC étudiant · classification d’images</p>
        <h1>EcoPlate<br><span>Edge</span></h1>
        <p class="hero-tagline">Un prototype de classification exécuté localement</p>
        <p class="hero-lead">Une image est classée dans huit familles alimentaires, puis mise en relation avec des repères AGRIBALYSE. Le résultat reste modifiable et les performances sont présentées avec leur périmètre de mesure.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#demo">Tester l’analyse</a>
          <a class="text-link" href="#project">Voir le fonctionnement <span aria-hidden="true">↘</span></a>
        </div>
        <aside class="privacy-highlight" aria-label="Confidentialité et RGPD">
          <span class="privacy-highlight-mark" aria-hidden="true">✓</span>
          <div>
            <strong>Confidentialité · RGPD</strong>
            <p>Vos images et descriptions restent dans votre navigateur. Aucune donnée n’est envoyée à un serveur et l’application ne nécessite aucun compte.</p>
            <a class="privacy-highlight-link" href="#privacy">En savoir plus sur la confidentialité <span aria-hidden="true">→</span></a>
          </div>
        </aside>
        <dl class="hero-stats">
          <div><dt>54,27 %</dt><dd>top-1 · fine-tuning</dd></div>
          <div><dt>3,95 Mio</dt><dd>modèle int8</dd></div>
          <div><dt>0</dt><dd>image transmise</dd></div>
        </dl>
      </div>
      <div class="hero-visual" aria-label="Schéma du parcours de l’image vers l’indicateur">
        <div class="process-board">
          <div class="process-board-header"><span>Flux de traitement</span><strong>dans le navigateur</strong></div>
          <div class="process-line" aria-hidden="true"></div>
          <div class="process-node node-input"><strong>Image</strong><small>fichier local</small></div>
          <div class="process-node node-model"><strong>Modèle</strong><small>Food-101 · int8</small></div>
          <div class="process-node node-review"><strong>Correction</strong><small>vision + texte</small></div>
          <div class="process-node node-output"><strong>Repère</strong><small>A–E ou ?</small></div>
          <div class="process-note"><span aria-hidden="true">●</span> aucune image envoyée</div>
        </div>
      </div>
    </section>

    <section class="demo-section" id="demo" aria-labelledby="demo-title">
      <div class="section-heading">
        <div><p class="eyebrow">Démonstration interactive</p><h2 id="demo-title">Analysez un aliment simple</h2></div>
        <p>Le modèle par défaut est le fine-tuning Food-101 int8 de 3,95 Mio. Le baseline ImageNet reste disponible pour comparer les deux approches dans les mêmes conditions.</p>
      </div>

      <div class="demo-grid">
        <div class="input-panel panel">
          <div class="step-label"><span>01</span> Image locale</div>
          <label class="drop-zone" id="drop-zone" for="image-file">
            <img id="image-preview" hidden alt="" />
            <span class="drop-content">
              <span class="upload-icon" aria-hidden="true">↥</span>
              <strong>Choisir ou déposer une photo</strong>
              <small>JPG, PNG ou WebP · 12 Mo maximum</small>
            </span>
          </label>
          <input class="visually-hidden" id="image-file" type="file" accept="image/jpeg,image/png,image/webp" />
          <div class="privacy-guarantees" aria-label="Garanties de confidentialité">
            <div><strong>Local</strong><small>Analyse dans le navigateur</small></div>
            <div><strong>Sans compte</strong><small>Aucune inscription requise</small></div>
            <div><strong>Non transmis</strong><small>Aucune image envoyée</small></div>
          </div>
          <div class="demo-examples" aria-label="Images d’exemple">
            <label class="field-label" for="demo-image-select">Ou choisir une image d’exemple</label>
            <div class="demo-image-picker">
              <select id="demo-image-select" class="model-select">
                <option value="image1">Image 1</option>
                <option value="image2">Image 2</option>
                <option value="image3">Image 3</option>
                <option value="image4">Image 4</option>
              </select>
              <button class="button button-secondary button-small" id="load-demo-image" type="button">Charger</button>
            </div>
            <small class="demo-examples-note">Les fichiers doivent être déposés dans <code>public/demo-images/</code>.</small>
          </div>

          <label class="field-label model-label" for="vision-model">Modèle de classification</label>
          <select id="vision-model" class="model-select">
            <option value="food101-finetuned">Food-101 fine-tuné · 8 familles</option>
            <option value="imagenet-baseline">ImageNet original · baseline</option>
          </select>

          <fieldset class="segmentation-options">
            <legend class="field-label">Prétraitement</legend>
            <label><input type="radio" name="segmentation-mode" value="full" checked /> Image entière (par défaut)</label>
            <label><input type="radio" name="segmentation-mode" value="grid" /> Recadrages par grille 3 × 3</label>
            <small id="segmentation-help">L’image entière est le prétraitement de référence. La grille est conservée pour l’ablation et augmente nettement la latence.</small>
          </fieldset>

          <div class="step-label step-text"><span>02</span> Description facultative</div>
          <label class="field-label" for="ingredients">Ingrédients ou courte description</label>
          <textarea id="ingredients" rows="3" placeholder="Ex. 150 g de bœuf, tomates et lentilles"></textarea>
          <button class="button button-quiet button-small" id="parse-text" type="button">Interpréter le texte</button>
          <div id="unknown-terms" class="notice notice-neutral" hidden></div>

          <button class="button button-primary analyze-button" id="analyze" type="button">
            <span class="button-label">Analyser localement</span><span aria-hidden="true">→</span>
          </button>
          <div class="status-line" id="status" role="status" aria-live="polite">Ajoutez une photo ou une description pour commencer.</div>
          <div class="privacy-note"><span aria-hidden="true">▣</span><span><strong>Traitement privé.</strong> L’image est décodée, recadrée et classée dans cette page.</span></div>
        </div>

        <div class="analysis-panel panel">
          <div class="step-label"><span>03</span> Suggestions et correction</div>
          <div class="prediction-display-control">
            <label for="display-threshold">Afficher les suggestions à partir de</label>
            <select id="display-threshold">
              <option value="auto" selected>Automatique · top 3</option>
              <option value="0.05">5 %</option>
              <option value="0.10">10 %</option>
              <option value="0.20">20 %</option>
              <option value="0.35">35 %</option>
            </select>
            <small id="display-threshold-help">Seuil automatique à 10 % minimum, abaissé au score du troisième résultat si nécessaire · les égalités sont conservées</small>
            <p class="prediction-policy-note">Choix de modélisation : une seule protéine animale est conservée. Le bœuf, le porc, la volaille et le poisson ont des apparences visuelles proches ; leurs prédictions concurrentes ne signifient donc pas que le plat contient plusieurs viandes.</p>
          </div>
          <div id="raw-predictions" class="raw-predictions">
            <p class="empty-state">Toutes les classes dépassant le seuil choisi apparaîtront ici avec leur confiance.</p>
          </div>
          <div id="contradictions" class="notice notice-warning" hidden></div>
          <div id="candidate-list"></div>
        </div>

        <div class="result-panel panel">
          <div class="step-label"><span>04</span> Résultat explicable</div>
          <div id="result"></div>
          <div id="runtime-metrics" class="runtime-metrics" hidden></div>
          <p class="legal-note">Cet indicateur n’est ni une certification, ni une mesure réglementaire, nutritionnelle ou médicale.</p>
        </div>
      </div>
    </section>

    <section class="privacy-section" id="privacy" aria-labelledby="privacy-title">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Confidentialité et traitement local</p><h2 id="privacy-title">Vos données restent<br>sur votre appareil.</h2></div>
        <p>EcoPlate Edge est conçu pour analyser une image sans l’envoyer à un service distant. Cette page explique concrètement ce qui se passe lorsque vous lancez une analyse.</p>
      </div>
      <div class="privacy-grid">
        <article><span class="privacy-card-label">Reste sur l’appareil</span><h3>Image, texte et résultat</h3><p>Votre image, votre description, les prédictions et le résultat climatique sont manipulés dans la mémoire de votre navigateur. Ils ne sont pas téléversés ni enregistrés par l’application sur un serveur.</p></article>
        <article><span class="privacy-card-label">Téléchargé au démarrage</span><h3>Les fichiers de l’application</h3><p>Le navigateur peut télécharger le HTML, le JavaScript, le modèle de vision, le runtime et les images d’exemple. Ce sont des fichiers publics nécessaires au fonctionnement, pas vos données personnelles.</p></article>
        <article><span class="privacy-card-label">Aucun service distant</span><h3>Pas de compte, pas d’API d’image</h3><p>Il n’y a pas de compte à créer, pas d’API d’inférence et pas de stockage distant des analyses. Le réseau sert à charger les ressources de la page, puis le modèle fonctionne localement.</p></article>
      </div>
      <div class="privacy-flow" aria-label="Flux local des données"><strong>Votre image</strong><span>→</span><strong>Navigateur</strong><span>→</span><strong>Modèle local</strong><span>→</span><strong>Résultat</strong><em>aucune image ne sort de ce parcours</em></div>
    </section>

    <section class="capability-section" aria-labelledby="capability-title">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Périmètre du prototype</p><h2 id="capability-title">Ce qui est évalué<br>et ce qui ne l’est pas.</h2></div>
        <p>Les métriques du projet portent sur le split de validation Food-101 relabellisé. Elles ne mesurent pas la performance sur des photos prises par de vrais utilisateurs.</p>
      </div>
      <div class="capability-grid">
        <article><span class="capability-sign" aria-hidden="true">✓</span><h3>Mesuré ici</h3><p>Le classement d’une image Food-101 relabellisée dans huit familles, avec top-1, top-3, macro-F1, rejet par seuil et latence du modèle dans le navigateur.</p></article>
        <article><span class="capability-sign" aria-hidden="true">—</span><h3>Hors mesure</h3><p>La reconnaissance de tous les ingrédients d’un plat, la masse, l’origine, la recette et la généralisation à des photos personnelles. Le protocole de 30 photos est prêt, mais la collecte n’est pas faite.</p></article>
      </div>
      <p class="validation-warning"><strong>À retenir :</strong> validation Food-101 ≠ validation en conditions d’usage. Le rejet <code>?</code>, le texte et la correction humaine restent des fonctions centrales.</p>
    </section>

    <section class="benchmark-section" id="study" aria-labelledby="study-title">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Résultats disponibles</p><h2 id="study-title">Ce que montrent<br>les évaluations.</h2></div>
        <p>Les chiffres ci-dessous portent sur le split de validation Food-101 relabellisé. Ils documentent le comportement du prototype, pas une performance garantie sur des photos utilisateur.</p>
      </div>
      <div class="benchmark-table-wrap"><table class="benchmark-table"><thead><tr><th>Modèle</th><th>Top-1</th><th>Top-3</th><th>Macro-F1</th><th>Taille</th></tr></thead><tbody>
        <tr><th>ImageNet original</th><td>15,28 %</td><td>33,90 %</td><td>17,02 %</td><td>5,18 Mio</td></tr>
        <tr class="benchmark-winner"><th>Food-101 fine-tuné</th><td>54,27 %</td><td>82,95 %</td><td>53,69 %</td><td>3,95 Mio</td></tr>
      </tbody></table></div>
      <div class="study-findings">
        <article><span>Seuil produit</span><strong>39,96 % rejetés</strong><p>À 35 % et avec une marge de 8 points, l’accuracy des réponses acceptées atteint 68,03 % sur Food-101.</p></article>
        <article><span>Ablation grille</span><strong>Top-3 inchangé</strong><p>+4,83 points de top-1, −0,12 point de top-3 et environ 8× plus lente dans Firefox : l’image entière reste le défaut.</p></article>
        <article><span>Mapping conservateur</span><strong>61 classes ambiguës</strong><p>Les plats composés et desserts deviennent <code>unknown</code> dans l’audit ; l’accuracy seule devient trompeuse.</p></article>
      </div>
      <div class="metric-strip" aria-label="Autres chiffres de l’évaluation">
        <article><strong>25 250</strong><span>images dans le split complet</span></article>
        <article><strong>+38,99 pts</strong><span>gain top-1 vs ImageNet</span></article>
        <article><strong>31 ms</strong><span>médiane navigateur · image entière</span></article>
        <article><strong>30</strong><span>cas utilisateur à collecter</span></article>
      </div>
      <div class="family-results">
        <div class="family-results-heading"><h3>Résultats du fine-tuning par famille</h3><p>Support = nombre d’images dans la validation. Les rappels montrent notamment que la précision globale ne suffit pas.</p></div>
        <div class="benchmark-table-wrap"><table class="benchmark-table compact-table"><thead><tr><th>Famille</th><th>Support</th><th>Précision</th><th>Rappel</th><th>F1</th></tr></thead><tbody>
          <tr><th>Bœuf</th><td>2 500</td><td>51,9 %</td><td>54,5 %</td><td>53,2 %</td></tr>
          <tr><th>Porc</th><td>1 500</td><td>37,1 %</td><td>60,3 %</td><td>45,9 %</td></tr>
          <tr><th>Volaille</th><td>1 500</td><td>27,5 %</td><td>69,1 %</td><td>39,3 %</td></tr>
          <tr><th>Poisson</th><td>4 750</td><td>65,3 %</td><td>45,2 %</td><td>53,4 %</td></tr>
          <tr><th>Produits laitiers</th><td>5 750</td><td>69,4 %</td><td>55,8 %</td><td>61,8 %</td></tr>
          <tr><th>Œufs</th><td>2 500</td><td>49,8 %</td><td>63,1 %</td><td>55,6 %</td></tr>
          <tr><th>Légumineuses</th><td>1 250</td><td>60,1 %</td><td>70,8 %</td><td>65,0 %</td></tr>
          <tr><th>Végétaux / féculents</th><td>5 500</td><td>66,8 %</td><td>47,0 %</td><td>55,2 %</td></tr>
        </tbody></table></div>
      </div>
      <blockquote class="portfolio-message">Lecture du résultat : le fine-tuning améliore nettement le classement, mais certaines familles restent difficiles. Le seuil de rejet, le texte et la correction utilisateur compensent partiellement cette incertitude ; ils ne la suppriment pas.</blockquote>
      <p class="study-links"><a href="${import.meta.env.BASE_URL}livrables/evaluation.html">Voir les matrices, seuils et erreurs →</a> <a href="${import.meta.env.BASE_URL}livrables/audit-mapping-food101.html">Lire l’audit du mapping →</a> <a href="${import.meta.env.BASE_URL}livrables/benchmarks/food101-benchmark.json">Télécharger les résultats JSON →</a></p>
    </section>

    <section class="project-section" id="project">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Fonctionnement</p><h2>Le pipeline du prototype,<br>de l’image au repère.</h2></div>
        <p>Une photographie ne fournit ni masse, ni origine, ni recette. Le prototype sépare donc la classification, la saisie complémentaire et le calcul déterministe du repère climatique.</p>
      </div>
      <ol class="flow" aria-label="Architecture fonctionnelle">
        <li><span>01</span><strong>Photo locale</strong><small>Décodage et recadrage 224 × 224</small></li>
        <li><span>02</span><strong>EfficientNet</strong><small>Classification dans le navigateur</small></li>
        <li><span>03</span><strong>Fusion</strong><small>Vision + texte + correction humaine</small></li>
        <li><span>04</span><strong>Règles climat</strong><small>8 profils AGRIBALYSE 3.2</small></li>
        <li><span>05</span><strong>A–E ou ?</strong><small>Résultat, confiance et limites</small></li>
      </ol>

      <div class="principles-grid">
        <article><span class="principle-label">Confidentialité</span><h3>Exécution locale</h3><p>Site statique, sans backend ni API d’image. Le réseau sert uniquement à charger les fichiers publics de l’application.</p></article>
        <article><span class="principle-label">Contrôle humain</span><h3>Correction explicite</h3><p>Une suggestion peut être validée, retirée, remplacée ou complétée avec une description textuelle.</p></article>
        <article><span class="principle-label">En cas de doute</span><h3>Afficher « ? » plutôt qu’inventer</h3><p>C’est la carte « Indicateur climatique qualitatif » qui affiche « ? » et le statut « À confirmer ». Cela arrive si la confiance est trop faible, si deux familles sont trop proches ou si aucune famille n’est reconnue ; ce n’est pas une statistique d’entraînement.</p></article>
        <article><span class="principle-label">Traitement séparé</span><h3>Calcul explicable</h3><p>Le modèle classe l’image. Une couche déterministe et testée transforme ensuite les familles retenues en niveau qualitatif.</p></article>
      </div>
    </section>

    <section class="data-section" aria-labelledby="profiles-title">
      <div class="section-heading">
        <div><p class="eyebrow">Données environnementales</p><h2 id="profiles-title">Les données utilisées<br>pour le calcul.</h2></div>
        <p>Chaque famille pointe vers un produit précis d’AGRIBALYSE 3.2. Les valeurs servent uniquement à produire un niveau qualitatif à partir d’une famille retenue.</p>
      </div>
      <div class="data-overview" aria-label="Résumé des données environnementales">
        <article><strong>8</strong><span>familles internes</span></article>
        <article><strong>0,626–36,6</strong><span>kg CO₂e / kg de repère</span></article>
        <article><strong>AGRIBALYSE 3.2</strong><span>source ADEME</span></article>
        <article><strong>1,77–2,86</strong><span>DQR des références</span></article>
      </div>
      <div class="profile-table-wrap"><table class="profile-table"><thead><tr><th>Famille</th><th>Repère</th><th>Niveau</th><th>Référence</th></tr></thead><tbody id="profile-rows"></tbody></table></div>
      <p class="source-note">Source : ADEME, AGRIBALYSE® 3.2, indicateur « Changement climatique », Licence Ouverte 2.0. Les facteurs sont exprimés par kg de produit consommé et ne sont pas affichés comme résultat utilisateur.</p>
    </section>

    <section class="skills-section" id="skills">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Retour de projet</p><h2>Compétences mobilisées<br>et prochaines étapes.</h2></div>
        <p>Le projet couvre l’intégration du modèle, la préparation des données, l’évaluation, l’interface et la documentation des limites.</p>
      </div>
      <div class="skills-layout">
        <div class="skill-list">
          <article><div><span>AI Engineering</span><strong>Intermédiaire</strong></div><p>Intégration d’un modèle quantifié, prétraitement, seuil de rejet et mesure de latence.</p><meter min="0" max="4" value="3">3 sur 4</meter></article>
          <article><div><span>TypeScript & Web</span><strong>Intermédiaire</strong></div><p>Modules typés, interface responsive, accessibilité clavier et déploiement statique.</p><meter min="0" max="4" value="3">3 sur 4</meter></article>
          <article><div><span>Audit data & IA responsable</span><strong>Intermédiaire</strong></div><p>Traçabilité des données, biais, limites d’usage et séparation prédiction/décision.</p><meter min="0" max="4" value="3">3 sur 4</meter></article>
          <article><div><span>Industrialisation MLOps</span><strong>En progression</strong></div><p>Build reproductible et CI ; monitoring réel et réentraînement restent des axes futurs.</p><meter min="0" max="4" value="2">2 sur 4</meter></article>
        </div>
        <aside class="reflection-card">
          <p class="eyebrow">Retour critique</p>
          <h3>Ce qui reste à faire</h3>
          <p>La prochaine étape est de mesurer l’écart entre Food-101 et des photos réellement prises par des utilisateurs, avec une annotation préalable et une mesure de correction.</p>
          <h4>Avec plus de temps</h4>
          <p>Je constituerais un jeu photographié et autorisé, puis je réentraînerais avec des classes <code>mixed_dish</code> et <code>unknown</code> au lieu de forcer les plats composés dans une famille.</p>
          <div class="soft-skills"><span>Analyse</span><span>Autonomie</span><span>Vulgarisation</span><span>Arbitrage</span></div>
        </aside>
      </div>
    </section>

    <section class="deliverables-section" id="deliverables">
      <div class="section-heading"><div><p class="eyebrow">Dossier de preuve</p><h2>Livrables du projet</h2></div><p>Les documents reprennent le template de conduite de projet et relient chaque compétence à une décision, une mesure ou une limite.</p></div>
      <div class="deliverable-grid">
        <a href="${import.meta.env.BASE_URL}livrables/rapport-conduite-projet.pdf"><span>PDF · Rapport</span><strong>Conduite de projet AI Engineering</strong><small>Besoin, audit, solution, risques et pilotage →</small></a>
        <a href="${import.meta.env.BASE_URL}livrables/carte-mentale.svg"><span>SVG · Carte mentale</span><strong>Projets, compétences et progression</strong><small>Vue synthétique accessible →</small></a>
        <a href="${import.meta.env.BASE_URL}livrables/model-card.html"><span>Documentation</span><strong>Model card EfficientNet‑Lite0</strong><small>Provenance, usage et limites →</small></a>
        <a href="${import.meta.env.BASE_URL}livrables/evaluation.html"><span>Évaluation</span><strong>Protocole et résultats</strong><small>Métriques, erreurs et mode opératoire →</small></a>
        <a href="${import.meta.env.BASE_URL}livrables/audit-mapping-food101.html"><span>Audit data</span><strong>Mapping Food‑101 vers EcoPlate</strong><small>Ambiguïtés, variante conservatrice et décisions →</small></a>
      </div>
    </section>
  </main>

  <footer><div class="brand"><span class="brand-mark" aria-hidden="true">E</span><span>EcoPlate <em>Edge</em></span></div><p>Projet démonstrateur · Données indicatives · Traitement local</p><a href="#top">Retour en haut ↑</a></footer>
`;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Élément introuvable : ${selector}`);
  return element;
}

let selectedFile: File | null = null;
let visionCandidates: IngredientCandidate[] = [];
let lastVisionPredictions: VisionPrediction[] = [];
let textCandidates: IngredientCandidate[] = [];
let workingCandidates: IngredientCandidate[] = [];
let unknownTerms: UnknownTerm[] = [];
let displayThresholdOverride: number | null = null;

const fileInput = required<HTMLInputElement>('#image-file');
const dropZone = required<HTMLElement>('#drop-zone');
const imagePreview = required<HTMLImageElement>('#image-preview');
const ingredientsInput = required<HTMLTextAreaElement>('#ingredients');
const analyzeButton = required<HTMLButtonElement>('#analyze');
const parseTextButton = required<HTMLButtonElement>('#parse-text');
const status = required<HTMLElement>('#status');
const rawPredictions = required<HTMLElement>('#raw-predictions');
const contradictionsBox = required<HTMLElement>('#contradictions');
const unknownTermsBox = required<HTMLElement>('#unknown-terms');
const runtimeMetrics = required<HTMLElement>('#runtime-metrics');
const segmentationHelp = required<HTMLElement>('#segmentation-help');
const modelSelect = required<HTMLSelectElement>('#vision-model');
const displayThresholdSelect = required<HTMLSelectElement>('#display-threshold');
const displayThresholdHelp = required<HTMLElement>('#display-threshold-help');
const demoImageSelect = required<HTMLSelectElement>('#demo-image-select');
const loadDemoImageButton = required<HTMLButtonElement>('#load-demo-image');
const candidateList = new CandidateList(required<HTMLElement>('#candidate-list'));
const resultCard = new ResultCard(required<HTMLElement>('#result'));

const demoImages = [
  { baseName: 'image1', label: 'Image 1' },
  { baseName: 'image2', label: 'Image 2' },
  { baseName: 'image3', label: 'Image 3' },
  { baseName: 'image4', label: 'Image 4' },
] as const;

const demoImageExtensions = ['jpg', 'jpeg', 'png', 'webp'] as const;

new ImageInput(fileInput, dropZone, imagePreview, (file) => {
  selectedFile = file;
  setStatus(`Photo prête : ${file.name}. Lancez l’analyse.`, 'ready');
}, (message) => setStatus(message, 'error'));

function selectedSegmentationMode(): 'full' | 'grid' {
  const value = document.querySelector<HTMLInputElement>('input[name="segmentation-mode"]:checked')?.value;
  if (value === 'grid') return value;
  return 'full';
}

function selectedModelId(): ModelId {
  return modelSelect.value === 'imagenet-baseline' ? 'imagenet-baseline' : DEFAULT_MODEL_ID;
}

function selectedDisplayThreshold(): number {
  if (displayThresholdSelect.value === 'auto') return DEFAULT_DISPLAY_THRESHOLD;
  const value = Number(displayThresholdSelect.value);
  return Number.isFinite(value) ? value : DEFAULT_DISPLAY_THRESHOLD;
}

function selectedEffectiveDisplayThreshold(): number {
  return displayThresholdOverride ?? effectiveDisplayThresholdForSuggestions(lastVisionPredictions);
}

function effectiveDisplayThresholdForSuggestions(predictions: VisionPrediction[]): number {
  const mappedPredictions = filterCompetingPredictions(predictions)
    .filter((prediction) => prediction.family);
  return effectiveDisplayThreshold(mappedPredictions, selectedDisplayThreshold());
}

function renderDisplayThresholdHelp(): void {
  if (displayThresholdOverride !== null) {
    displayThresholdHelp.textContent = `Seuil manuel de ${Math.round(displayThresholdOverride * 100)} % · il remplace la règle automatique des trois premiers résultats · les égalités sont conservées`;
    return;
  }

  const automaticThreshold = effectiveDisplayThresholdForSuggestions(lastVisionPredictions);
  displayThresholdHelp.textContent = lastVisionPredictions.length === 0
    ? `Seuil automatique à ${Math.round(DEFAULT_DISPLAY_THRESHOLD * 100)} % minimum, abaissé au score du troisième résultat si nécessaire · les égalités sont conservées`
    : `Seuil automatique établi à ${Math.round(automaticThreshold * 100)} % pour englober les trois premiers résultats si disponibles · les égalités sont conservées`;
}

document.querySelectorAll<HTMLInputElement>('input[name="segmentation-mode"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    segmentationHelp.textContent = input.value === 'grid'
      ? 'La grille analyse l’image entière puis neuf recadrages ; elle augmente nettement la latence.'
      : 'L’image entière est le prétraitement de référence et l’option activée par défaut.';
  });
});

loadDemoImageButton.addEventListener('click', async () => {
  const demoImage = demoImages.find((item) => item.baseName === demoImageSelect.value);
  if (!demoImage) return;
  try {
    let response: Response | null = null;
    let fileName = '';
    for (const extension of demoImageExtensions) {
      const candidate = `${demoImage.baseName}.${extension}`;
      const candidateResponse = await fetch(`${import.meta.env.BASE_URL}demo-images/${candidate}`);
      const contentType = candidateResponse.headers.get('content-type') ?? '';
      if (candidateResponse.ok && contentType.startsWith('image/')) {
        response = candidateResponse;
        fileName = candidate;
        break;
      }
    }
    if (!response) throw new Error(`Ajoutez ${demoImage.baseName}.jpg, .png ou .webp dans public/demo-images/`);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    selectedFile = file;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.alt = `Aperçu local de ${demoImage.label}`;
    imagePreview.hidden = false;
    dropZone.classList.add('has-image');
    setStatus(`${demoImage.label} chargée. Lancez l’analyse.`, 'ready');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Exemple indisponible.', 'error');
  }
});

modelSelect.addEventListener('change', () => {
  const descriptor = MODEL_DESCRIPTORS[selectedModelId()];
  setStatus(`${descriptor.label} sélectionné. Relancez l’analyse.`, 'ready');
});

displayThresholdSelect.addEventListener('change', () => {
  displayThresholdOverride = displayThresholdSelect.value === 'auto'
    ? null
    : selectedDisplayThreshold();
  renderDisplayThresholdHelp();
  if (lastVisionPredictions.length === 0) return;
  visionCandidates = toVisionCandidates(lastVisionPredictions);
  renderRawPredictions(lastVisionPredictions);
  const explicitUserCandidates = workingCandidates.filter((candidate) => candidate.source === 'user');
  const merged = mergeCandidates([visionCandidates, textCandidates, explicitUserCandidates]);
  workingCandidates = merged.candidates;
  renderContradictions(merged.contradictions);
  renderCandidatesAndScore();
});

function setStatus(message: string, kind: 'idle' | 'loading' | 'ready' | 'error' = 'idle'): void {
  status.textContent = message;
  status.dataset.kind = kind;
}

function parseText(): void {
  const extraction = normalizeIngredients(ingredientsInput.value);
  textCandidates = extraction.candidates;
  unknownTerms = extraction.unknownTerms;
  const explicitUserCandidates = workingCandidates.filter((candidate) => candidate.source === 'user');
  const merged = mergeCandidates([visionCandidates, textCandidates, explicitUserCandidates]);
  workingCandidates = merged.candidates;
  renderUnknownTerms();
  renderContradictions(merged.contradictions);
  renderCandidatesAndScore();
  if (ingredientsInput.value.trim()) {
    setStatus(`${textCandidates.length} famille(s) reconnue(s) dans la description.`, 'ready');
  }
}

function renderUnknownTerms(): void {
  if (unknownTerms.length === 0) {
    unknownTermsBox.hidden = true;
    unknownTermsBox.replaceChildren();
    return;
  }
  unknownTermsBox.hidden = false;
  const strong = document.createElement('strong');
  strong.textContent = 'Termes non reconnus : ';
  unknownTermsBox.replaceChildren(strong, document.createTextNode(unknownTerms.map((item) => item.term).join(', ')));
}

function renderContradictions(contradictions: string[]): void {
  contradictionsBox.hidden = contradictions.length === 0;
  contradictionsBox.replaceChildren();
  contradictions.forEach((contradiction) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = contradiction;
    contradictionsBox.append(paragraph);
  });
}

function renderCandidatesAndScore(): void {
  const displayThreshold = selectedEffectiveDisplayThreshold();
  const isVisible = (candidate: IngredientCandidate) =>
    candidate.source !== 'vision'
    || candidate.selected
    || (candidate.confidence ?? 0) >= displayThreshold;
  const visibleCandidates = workingCandidates.filter(isVisible);
  const hiddenCandidates = workingCandidates.filter((candidate) => !isVisible(candidate));
  candidateList.render(visibleCandidates, (next) => {
    workingCandidates = [...next, ...hiddenCandidates];
    renderCandidatesAndScore();
  });
  resultCard.render(calculateScore(workingCandidates));
}

function toVisionCandidates(predictions: VisionPrediction[]): IngredientCandidate[] {
  const mapped = filterCompetingPredictions(predictions).filter((prediction) => prediction.family);
  const displayThreshold = selectedEffectiveDisplayThreshold();
  const firstVisible = mapped
    .filter((prediction) => prediction.confidence >= displayThreshold)
    .find((prediction) => prediction.family);
  return mapped.map((prediction, index) => ({
    id: `vision-${index}-${prediction.family}`,
    family: prediction.family!,
    source: 'vision',
    evidenceSources: ['vision'],
    selected: prediction === firstVisible,
    validated: false,
    confidence: prediction.confidence,
    originalLabel: prediction.originalLabel,
  }));
}

function renderRawPredictions(predictions: VisionPrediction[]): void {
  rawPredictions.replaceChildren();
  const displayThreshold = selectedEffectiveDisplayThreshold();
  const relevantPredictions = filterCompetingPredictions(predictions).filter(
    (prediction) => prediction.confidence >= displayThreshold,
  );
  if (relevantPredictions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = `Aucune prédiction n’atteint le seuil de ${Math.round(displayThreshold * 100)} %.`;
    rawPredictions.append(empty);
    return;
  }
  relevantPredictions.forEach((prediction, index) => {
    const item = document.createElement('div');
    item.className = 'prediction-item';
    const rank = document.createElement('span');
    rank.className = 'prediction-rank';
    rank.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = prediction.originalLabel;
    const mapping = document.createElement('small');
    mapping.textContent = prediction.family
      ? `→ ${profiles.find((profile) => profile.id === prediction.family)?.shortLabel}`
      : 'Hors des huit familles prises en charge';
    copy.append(label, mapping);
    const meter = document.createElement('div');
    meter.className = 'confidence-meter';
    const fill = document.createElement('span');
    fill.style.width = `${Math.max(2, prediction.confidence * 100)}%`;
    const value = document.createElement('b');
    value.textContent = `${Math.round(prediction.confidence * 100)} %`;
    meter.append(fill, value);
    item.append(rank, copy, meter);
    rawPredictions.append(item);
  });
}

async function analyze(): Promise<void> {
  if (!selectedFile && !ingredientsInput.value.trim()) {
    setStatus('Ajoutez une photo ou une description avant l’analyse.', 'error');
    return;
  }

  analyzeButton.disabled = true;
  analyzeButton.classList.add('is-loading');
  setStatus(selectedFile ? 'Préparation de l’image et chargement du modèle…' : 'Interprétation de la description…', 'loading');
  try {
    const extraction = normalizeIngredients(ingredientsInput.value);
    textCandidates = extraction.candidates;
    unknownTerms = extraction.unknownTerms;

    if (selectedFile) {
      const mode = selectedSegmentationMode();
      const modelId = selectedModelId();
      let canvases: HTMLCanvasElement[];
      let segmentationLabel = 'Image entière';
      let segmentationLatency = 0;
      const prepared = await preprocessImage(selectedFile);
      canvases = mode === 'grid' ? prepared.canvases : [prepared.canvas];
      if (mode === 'grid') segmentationLabel = 'Image entière + grille 3 × 3';
      setStatus('Classification en cours sur votre appareil…', 'loading');
      const inference = await classifyImages(canvases, modelId);
      lastVisionPredictions = inference.predictions;
      visionCandidates = toVisionCandidates(inference.predictions);
      renderRawPredictions(inference.predictions);
      renderDisplayThresholdHelp();
      runtimeMetrics.hidden = false;
      runtimeMetrics.textContent = `Dernière inférence : ${Math.round(inference.latencyMs + segmentationLatency)} ms · prétraitement : ${segmentationLabel} · modèle : ${inference.model.shortLabel} · ${inference.modelSizeMb.toFixed(2)} Mio (${inference.model.outputLabels} sorties) · suggestions ≥ ${Math.round(selectedEffectiveDisplayThreshold() * 100)} % · ${canvases.length} vue(s) · entrée : 224 × 224 px`;
      setStatus(
        visionCandidates.length
          ? 'Analyse terminée. Vérifiez la famille proposée avant de retenir le score.'
          : 'Analyse terminée, mais aucune classe n’a un mapping climatique défendable.',
        'ready',
      );
    }

    const explicitUserCandidates = workingCandidates.filter((candidate) => candidate.source === 'user');
    const merged = mergeCandidates([visionCandidates, textCandidates, explicitUserCandidates]);
    workingCandidates = merged.candidates;
    renderUnknownTerms();
    renderContradictions(merged.contradictions);
    renderCandidatesAndScore();
  } catch (error) {
    setStatus(
      error instanceof Error
        ? `Analyse impossible : ${error.message}`
        : 'Analyse impossible dans ce navigateur.',
      'error',
    );
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.classList.remove('is-loading');
  }
}

parseTextButton.addEventListener('click', parseText);
analyzeButton.addEventListener('click', () => void analyze());

const profileRows = required<HTMLTableSectionElement>('#profile-rows');
profiles.forEach((profile) => {
  const row = document.createElement('tr');
  const family = document.createElement('th');
  family.scope = 'row';
  family.textContent = profile.shortLabel;
  const reference = document.createElement('td');
  reference.textContent = profile.referenceProduct;
  const level = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `grade-badge grade-${profile.climateLevel.toLowerCase()}`;
  badge.textContent = profile.climateLevel;
  level.append(badge);
  const record = document.createElement('td');
  record.textContent = `AGB ${profile.recordId}`;
  row.append(family, reference, level, record);
  profileRows.append(row);
});

renderCandidatesAndScore();

if (window.location.hash) {
  requestAnimationFrame(() => {
    document.querySelector(window.location.hash)?.scrollIntoView();
  });
}
