import { profiles } from '../climate/profiles';
import type { FamilyId, IngredientCandidate } from '../types';

type ChangeHandler = (candidates: IngredientCandidate[]) => void;

const SOURCE_LABELS = {
  vision: 'Vision',
  text: 'Texte',
  user: 'Utilisateur',
} as const;

export class CandidateList {
  constructor(private readonly root: HTMLElement) {}

  render(candidates: IngredientCandidate[], onChange: ChangeHandler): void {
    this.root.replaceChildren();

    const heading = document.createElement('div');
    heading.className = 'candidate-heading';
    const title = document.createElement('h3');
    title.textContent = 'Liste finale modifiable';
    const validateAll = document.createElement('button');
    validateAll.type = 'button';
    validateAll.className = 'button button-quiet button-small';
    validateAll.textContent = 'Tout valider';
    validateAll.disabled = candidates.length === 0;
    validateAll.addEventListener('click', () => {
      onChange(candidates.map((candidate) => ({
        ...candidate,
        selected: true,
        validated: true,
      })));
    });
    heading.append(title, validateAll);
    this.root.append(heading);

    if (candidates.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Aucune famille détectée. Décrivez un ingrédient ou ajoutez-en un manuellement.';
      this.root.append(empty);
    }

    const list = document.createElement('div');
    list.className = 'candidate-list';
    candidates.forEach((candidate) => {
      list.append(this.createRow(candidate, candidates, onChange));
    });
    this.root.append(list, this.createAddControl(candidates, onChange));
  }

  private createRow(
    candidate: IngredientCandidate,
    candidates: IngredientCandidate[],
    onChange: ChangeHandler,
  ): HTMLElement {
    const row = document.createElement('article');
    row.className = `candidate-row${candidate.selected ? '' : ' is-muted'}`;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = candidate.selected;
    toggle.setAttribute('aria-label', `Retenir ${candidate.originalLabel ?? candidate.family}`);
    toggle.addEventListener('change', () => {
      onChange(candidates.map((item) =>
        item.id === candidate.id
          ? { ...item, selected: toggle.checked, validated: true }
          : item,
      ));
    });

    const content = document.createElement('div');
    content.className = 'candidate-content';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Famille alimentaire');
    profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.shortLabel;
      option.selected = profile.id === candidate.family;
      select.append(option);
    });
    select.addEventListener('change', () => {
      const family = select.value as FamilyId;
      onChange(candidates.map((item) =>
        item.id === candidate.id
          ? {
              ...item,
              family,
              source: 'user',
              evidenceSources: [...new Set([...(item.evidenceSources ?? [item.source]), 'user' as const])],
              selected: true,
              validated: true,
            }
          : item,
      ));
    });

    const meta = document.createElement('div');
    meta.className = 'candidate-meta';
    const evidence = candidate.evidenceSources ?? [candidate.source];
    const source = document.createElement('span');
    source.className = `source-badge source-${candidate.source}`;
    source.textContent = evidence.map((item) => SOURCE_LABELS[item]).join(' + ');
    meta.append(source);
    if (candidate.confidence !== undefined) {
      const confidence = document.createElement('span');
      confidence.textContent = `${(candidate.confidence * 100).toFixed(1).replace('.', ',')} % de confiance vision`;
      meta.append(confidence);
    }
    if (candidate.originalLabel && candidate.source === 'vision') {
      const original = document.createElement('span');
      original.textContent = `Classe : ${candidate.originalLabel}`;
      meta.append(original);
    }
    content.append(select, meta);

    const quantityLabel = document.createElement('label');
    quantityLabel.className = 'quantity-field';
    const quantityText = document.createElement('span');
    quantityText.textContent = 'g';
    const quantity = document.createElement('input');
    quantity.type = 'number';
    quantity.min = '1';
    quantity.max = '5000';
    quantity.step = '1';
    quantity.inputMode = 'numeric';
    quantity.placeholder = '—';
    quantity.value = candidate.quantityG?.toString() ?? '';
    quantity.setAttribute('aria-label', 'Quantité déclarée en grammes');
    quantity.addEventListener('change', () => {
      const parsed = Number(quantity.value);
      onChange(candidates.map((item) =>
        item.id === candidate.id
          ? {
              ...item,
              quantityG: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
              validated: true,
            }
          : item,
      ));
    });
    quantityLabel.append(quantity, quantityText);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-button';
    remove.setAttribute('aria-label', `Supprimer ${candidate.originalLabel ?? candidate.family}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      onChange(candidates.filter((item) => item.id !== candidate.id));
    });

    row.append(toggle, content, quantityLabel, remove);
    return row;
  }

  private createAddControl(
    candidates: IngredientCandidate[],
    onChange: ChangeHandler,
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'add-control';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Famille à ajouter');
    profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.shortLabel;
      select.append(option);
    });
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-secondary button-small';
    button.textContent = 'Ajouter une famille';
    button.addEventListener('click', () => {
      const family = select.value as FamilyId;
      const existing = candidates.find((candidate) => candidate.family === family);
      if (existing) {
        onChange(candidates.map((candidate) =>
          candidate.id === existing.id
            ? { ...candidate, selected: true, validated: true, source: 'user' }
            : candidate,
        ));
        return;
      }
      onChange([
        ...candidates,
        {
          id: `user-${family}-${Date.now()}`,
          family,
          source: 'user',
          evidenceSources: ['user'],
          selected: true,
          validated: true,
        },
      ]);
    });
    container.append(select, button);
    return container;
  }
}
