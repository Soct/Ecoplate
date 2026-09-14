import type { ClimateResult } from '../types';

export class ResultCard {
  constructor(private readonly root: HTMLElement) {}

  render(result: ClimateResult): void {
    this.root.replaceChildren();
    this.root.className = `result-card grade-${result.grade === '?' ? 'unknown' : result.grade.toLowerCase()}`;

    const main = document.createElement('div');
    main.className = 'result-main';
    const score = document.createElement('div');
    score.className = 'score-orb';
    score.setAttribute('aria-label', `Indicateur climatique ${result.grade}`);
    score.textContent = result.grade;
    const copy = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Indicateur climatique qualitatif';
    const title = document.createElement('h3');
    title.textContent = result.title;
    const explanation = document.createElement('p');
    explanation.textContent = result.explanation;
    copy.append(eyebrow, title, explanation);
    main.append(score, copy);

    const confidence = document.createElement('div');
    confidence.className = 'result-facts';
    const confidenceValue = result.confidence === null
      ? result.confidenceLabel
      : `${result.confidenceLabel} (${Math.round(result.confidence * 100)} %)`;
    confidence.append(
      this.fact('Confiance', confidenceValue),
      this.fact('Méthode', result.usedQuantities ? 'Repères pondérés' : 'Niveau le plus prudent'),
      this.fact('Statut', result.grade === '?' ? 'À confirmer' : 'Indicatif'),
    );

    if (result.mainFactors.length > 0) {
      const factors = document.createElement('div');
      factors.className = 'factor-panel';
      const factorTitle = document.createElement('h4');
      factorTitle.textContent = 'Facteurs principaux';
      const list = document.createElement('ul');
      result.mainFactors.forEach((profile) => {
        const item = document.createElement('li');
        item.textContent = `${profile.shortLabel} — repère ${profile.climateLevel}`;
        list.append(item);
      });
      factors.append(factorTitle, list);
      const alternative = result.mainFactors[0]?.alternative;
      if (alternative) {
        const suggestion = document.createElement('p');
        suggestion.className = 'suggestion';
        suggestion.textContent = alternative;
        factors.append(suggestion);
      }
      this.root.append(main, confidence, factors);
    } else {
      this.root.append(main, confidence);
    }

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Hypothèses et limites';
    const list = document.createElement('ul');
    result.assumptions.forEach((assumption) => {
      const item = document.createElement('li');
      item.textContent = assumption;
      list.append(item);
    });
    details.append(summary, list);
    this.root.append(details);
  }

  private fact(label: string, value: string): HTMLElement {
    const item = document.createElement('div');
    const term = document.createElement('span');
    term.textContent = label;
    const description = document.createElement('strong');
    description.textContent = value;
    item.append(term, description);
    return item;
  }
}
