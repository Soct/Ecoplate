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
  predictionsAboveThreshold,
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
      <a href="#skills">Compétences</a>
      <a href="#deliverables">Livrables</a>
    </nav>
    <span class="local-pill"><span aria-hidden="true">●</span> 100 % navigateur</span>
  </header>

  <main id="main-content">
    <section class="hero" id="top">
      <div class="hero-copy">
        <p class="eyebrow">Projet personnel · Edge AI · Computer Vision</p>
        <h1>Voir l’aliment.<br><span>Nuancer l’impact.</span></h1>
        <p class="hero-lead">Un EfficientNet compact spécialisé sur Food-101 transforme une photo en indication climatique explicable et corrigeable — sans envoyer l’image.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#demo">Tester l’analyse</a>
          <a class="text-link" href="#project">Comprendre la démarche <span aria-hidden="true">↘</span></a>
        </div>
        <dl class="hero-stats">
          <div><dt>8</dt><dd>familles alimentaires</dd></div>
          <div><dt>A–E</dt><dd>indicateur qualitatif</dd></div>
          <div><dt>0</dt><dd>image envoyée</dd></div>
        </dl>
      </div>
      <div class="hero-visual" aria-label="Illustration du parcours de l’image vers l’indicateur">
        <div class="plate" aria-hidden="true">
          <span class="food food-one"></span><span class="food food-two"></span><span class="food food-three"></span>
          <span class="scan-line"></span>
        </div>
        <div class="floating-card card-confidence"><span>Confiance</span><strong>visible</strong></div>
        <div class="floating-card card-score"><span>Score indicatif</span><strong>A–E / ?</strong></div>
        <div class="privacy-stamp"><span aria-hidden="true">⌁</span> Local-first</div>
      </div>
    </section>

    <section class="demo-section" id="demo" aria-labelledby="demo-title">
      <div class="section-heading">
        <div><p class="eyebrow">Démonstration interactive</p><h2 id="demo-title">Analysez un aliment simple</h2></div>
        <p>Le modèle par défaut est le fine-tuning Food-101 int8 de 3,95 Mio. Le baseline ImageNet reste sélectionnable pour rendre la comparaison reproductible.</p>
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

          <label class="field-label model-label" for="vision-model">Modèle de classification</label>
          <select id="vision-model" class="model-select">
            <option value="food101-finetuned">Food-101 fine-tuné · 8 familles</option>
            <option value="imagenet-baseline">ImageNet original · baseline</option>
          </select>

          <fieldset class="segmentation-options">
            <legend class="field-label">Prétraitement / ablation</legend>
            <label><input type="radio" name="segmentation-mode" value="full" checked /> Image entière (par défaut)</label>
            <label><input type="radio" name="segmentation-mode" value="grid" /> Recadrages par grille 3 × 3</label>
            <label class="option-disabled"><input type="radio" name="segmentation-mode" value="sam-auto" disabled /> SlimSAM (désactivé : poids non locaux)</label>
            <small id="segmentation-help">L’image entière est le prétraitement de référence. SlimSAM n’a produit aucune inférence lors du benchmark autonome.</small>
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
              <option value="0.05">5 %</option>
              <option value="0.10" selected>10 %</option>
              <option value="0.20">20 %</option>
              <option value="0.35">35 %</option>
            </select>
            <small>Les scores masqués restent pris en compte pour l’ambiguïté · rejet à 35 %</small>
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

    <section class="capability-section" aria-labelledby="capability-title">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Périmètre mesuré</p><h2 id="capability-title">Ce que le modèle sait faire<br>— et ne sait pas faire.</h2></div>
        <p>Les métriques du projet portent sur le split de validation Food-101 relabellisé. Elles ne mesurent pas la performance sur des photos prises par de vrais utilisateurs.</p>
      </div>
      <div class="capability-grid">
        <article><span class="capability-sign" aria-hidden="true">✓</span><h3>Sait faire</h3><p>Classer une image proche de Food-101 parmi huit familles, afficher les suggestions dépassant un seuil choisi, exposer leur confiance et laisser l’utilisateur corriger le résultat.</p></article>
        <article><span class="capability-sign" aria-hidden="true">×</span><h3>Ne sait pas faire</h3><p>Identifier tous les ingrédients d’un plat composé, estimer une masse, une recette, une origine, ni garantir la généralisation à une photo réelle.</p></article>
      </div>
      <p class="validation-warning"><strong>À retenir :</strong> validation Food-101 ≠ validation en conditions d’usage. Le rejet <code>?</code>, le texte et la correction humaine restent des fonctions centrales.</p>
    </section>

    <section class="benchmark-section" id="study" aria-labelledby="study-title">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">25 250 images de validation</p><h2 id="study-title">Le fine-tuning mesuré,<br>pas seulement annoncé.</h2></div>
        <p>Mesures brutes sur Food-101 relabellisé. La macro-F1 complète l’accuracy pour rendre visible le déséquilibre entre familles.</p>
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
      <blockquote class="portfolio-message">« J’ai spécialisé un modèle ImageNet compact sur Food-101 avec une relabellisation vers huit familles métier, je l’ai exporté en int8 et exécuté dans le navigateur. J’ai comparé l’effet du fine-tuning et de la segmentation, tout en séparant les performances mesurées sur Food-101 des limites non mesurées sur des photos réelles. »</blockquote>
      <p class="study-links"><a href="${import.meta.env.BASE_URL}livrables/evaluation.html">Voir les matrices, seuils et erreurs →</a> <a href="${import.meta.env.BASE_URL}livrables/audit-mapping-food101.html">Lire l’audit du mapping →</a> <a href="${import.meta.env.BASE_URL}livrables/benchmarks/food101-benchmark.json">Télécharger les résultats JSON →</a></p>
    </section>

    <section class="project-section" id="project">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Du besoin à la décision</p><h2>Une IA volontairement limitée,<br>donc réellement utile.</h2></div>
        <p>Une photographie ne révèle ni la masse, ni l’origine, ni la recette. Le produit transforme cette limite en interaction : le modèle suggère, l’utilisateur tranche, les règles expliquent.</p>
      </div>
      <ol class="flow" aria-label="Architecture fonctionnelle">
        <li><span>01</span><strong>Photo locale</strong><small>Décodage et recadrage 224 × 224</small></li>
        <li><span>02</span><strong>EfficientNet</strong><small>Classification dans le navigateur</small></li>
        <li><span>03</span><strong>Fusion</strong><small>Vision + texte + correction humaine</small></li>
        <li><span>04</span><strong>Règles climat</strong><small>8 profils AGRIBALYSE 3.2</small></li>
        <li><span>05</span><strong>A–E ou ?</strong><small>Résultat, confiance et limites</small></li>
      </ol>

      <div class="principles-grid">
        <article><span class="principle-number">01</span><h3>Confidentialité par architecture</h3><p>Site statique, sans backend ni API d’image. Le réseau sert uniquement à charger les fichiers publics de l’application.</p></article>
        <article><span class="principle-number">02</span><h3>Humain dans la boucle</h3><p>Chaque suggestion peut être validée, retirée, remplacée ou complétée. Une correction explicite devient prioritaire.</p></article>
        <article><span class="principle-number">03</span><h3>Incertitude assumée</h3><p>Une confiance faible, des classes proches ou l’absence de mapping donnent « ? », jamais une fausse certitude.</p></article>
        <article><span class="principle-number">04</span><h3>Deux couches séparées</h3><p>Le modèle reconnaît une image. Une couche déterministe et testée produit ensuite l’indicateur métier.</p></article>
      </div>
    </section>

    <section class="data-section" aria-labelledby="profiles-title">
      <div class="section-heading">
        <div><p class="eyebrow">Données environnementales</p><h2 id="profiles-title">Huit repères, pas huit vérités.</h2></div>
        <p>Chaque famille pointe vers un produit précis d’AGRIBALYSE 3.2. Les valeurs servent à classer qualitativement ; les écarts à la réalité restent affichés.</p>
      </div>
      <div class="profile-table-wrap"><table class="profile-table"><thead><tr><th>Famille</th><th>Repère</th><th>Niveau</th><th>Référence</th></tr></thead><tbody id="profile-rows"></tbody></table></div>
      <p class="source-note">Source : ADEME, AGRIBALYSE® 3.2, indicateur « Changement climatique », Licence Ouverte 2.0. Les facteurs sont exprimés par kg de produit consommé et ne sont pas affichés comme résultat utilisateur.</p>
    </section>

    <section class="skills-section" id="skills">
      <div class="section-heading split-heading">
        <div><p class="eyebrow">Portfolio AI Engineer</p><h2>Compétences démontrées,<br>preuves à l’appui.</h2></div>
        <p>Le projet est traité comme une mission : besoin, audit du mapping Food-101, comparaison ImageNet/fine-tuning, production, contrôle des performances et retour critique.</p>
      </div>
      <div class="skills-layout">
        <div class="skill-list">
          <article><div><span>AI Engineering</span><strong>Intermédiaire</strong></div><p>Intégration d’un modèle quantifié, prétraitement, seuil de rejet et mesure de latence.</p><meter min="0" max="4" value="3">3 sur 4</meter></article>
          <article><div><span>TypeScript & Web</span><strong>Intermédiaire</strong></div><p>Modules typés, interface responsive, accessibilité clavier et déploiement statique.</p><meter min="0" max="4" value="3">3 sur 4</meter></article>
          <article><div><span>Audit data & IA responsable</span><strong>Intermédiaire</strong></div><p>Traçabilité des données, biais, limites d’usage et séparation prédiction/décision.</p><meter min="0" max="4" value="3">3 sur 4</meter></article>
          <article><div><span>Industrialisation MLOps</span><strong>En progression</strong></div><p>Build reproductible et CI ; monitoring réel et réentraînement restent des axes futurs.</p><meter min="0" max="4" value="2">2 sur 4</meter></article>
        </div>
        <aside class="reflection-card">
          <p class="eyebrow">Capacité réflexive</p>
          <h3>Ce que le projet a changé</h3>
          <p>Le rôle d’un AI Engineer ne consiste pas seulement à maximiser une métrique. Il faut choisir le bon niveau d’automatisation, créer un mécanisme de rejet et rendre l’incertitude actionnable.</p>
          <h4>Avec plus de temps</h4>
          <p>Je constituerais un jeu photographié et autorisé pour mesurer l’écart entre la validation Food-101 et l’usage réel, puis je réentraînerais avec des classes <code>mixed_dish</code> et <code>unknown</code>.</p>
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
const candidateList = new CandidateList(required<HTMLElement>('#candidate-list'));
const resultCard = new ResultCard(required<HTMLElement>('#result'));

new ImageInput(fileInput, dropZone, imagePreview, (file) => {
  selectedFile = file;
  setStatus(`Photo prête : ${file.name}. Lancez l’analyse.`, 'ready');
}, (message) => setStatus(message, 'error'));

function selectedSegmentationMode(): 'full' | 'grid' | 'sam-auto' {
  const value = document.querySelector<HTMLInputElement>('input[name="segmentation-mode"]:checked')?.value;
  if (value === 'grid' || value === 'sam-auto') return value;
  return 'full';
}

function selectedModelId(): ModelId {
  return modelSelect.value === 'imagenet-baseline' ? 'imagenet-baseline' : DEFAULT_MODEL_ID;
}

function selectedDisplayThreshold(): number {
  const value = Number(displayThresholdSelect.value);
  return Number.isFinite(value) ? value : DEFAULT_DISPLAY_THRESHOLD;
}

document.querySelectorAll<HTMLInputElement>('input[name="segmentation-mode"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    segmentationHelp.textContent = input.value === 'grid'
      ? 'La grille analyse l’image entière puis neuf recadrages ; elle augmente nettement la latence.'
      : input.value === 'sam-auto'
        ? 'Ablation expérimentale : SlimSAM isole la zone centrale et télécharge ses poids au premier essai.'
        : 'L’image entière est le prétraitement de référence et l’option activée par défaut.';
  });
});

modelSelect.addEventListener('change', () => {
  const descriptor = MODEL_DESCRIPTORS[selectedModelId()];
  setStatus(`${descriptor.label} sélectionné. Relancez l’analyse.`, 'ready');
});

displayThresholdSelect.addEventListener('change', () => {
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
  const isVisible = (candidate: IngredientCandidate) =>
    candidate.source !== 'vision'
    || candidate.selected
    || (candidate.confidence ?? 0) >= selectedDisplayThreshold();
  const visibleCandidates = workingCandidates.filter(isVisible);
  const hiddenCandidates = workingCandidates.filter((candidate) => !isVisible(candidate));
  candidateList.render(visibleCandidates, (next) => {
    workingCandidates = [...next, ...hiddenCandidates];
    renderCandidatesAndScore();
  });
  resultCard.render(calculateScore(workingCandidates));
}

function toVisionCandidates(predictions: VisionPrediction[]): IngredientCandidate[] {
  const mapped = predictions.filter((prediction) => prediction.family);
  const firstVisible = predictionsAboveThreshold(predictions, selectedDisplayThreshold())
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
  const relevantPredictions = predictionsAboveThreshold(
    predictions,
    selectedDisplayThreshold(),
  );
  if (relevantPredictions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = `Aucune prédiction n’atteint le seuil de ${Math.round(selectedDisplayThreshold() * 100)} %.`;
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
      if (mode === 'sam-auto') {
        const bitmap = await createImageBitmap(selectedFile);
        const point = { x: bitmap.width / 2, y: bitmap.height / 2 };
        bitmap.close();
        setStatus('Segmentation SlimSAM puis classification en cours…', 'loading');
        const { segmentImage } = await import('./vision/segmentation');
        const segmented = await segmentImage(selectedFile, point);
        canvases = segmented.canvases;
        segmentationLabel = segmented.modelLabel;
        segmentationLatency = segmented.latencyMs;
      } else {
        const prepared = await preprocessImage(selectedFile);
        canvases = mode === 'grid' ? prepared.canvases : [prepared.canvas];
        if (mode === 'grid') segmentationLabel = 'Image entière + grille 3 × 3';
      }
      setStatus('Classification en cours sur votre appareil…', 'loading');
      const inference = await classifyImages(canvases, modelId);
      lastVisionPredictions = inference.predictions;
      visionCandidates = toVisionCandidates(inference.predictions);
      renderRawPredictions(inference.predictions);
      runtimeMetrics.hidden = false;
      runtimeMetrics.textContent = `Dernière inférence : ${Math.round(inference.latencyMs + segmentationLatency)} ms · prétraitement : ${segmentationLabel} · modèle : ${inference.model.shortLabel} · ${inference.modelSizeMb.toFixed(2)} Mio (${inference.model.outputLabels} sorties) · suggestions ≥ ${Math.round(selectedDisplayThreshold() * 100)} % · ${canvases.length} vue(s) · entrée : 224 × 224 px`;
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
