import type { DOMElement } from 'astylarui';
import type { GenerationStatus, SpeechHistoryItemView } from './tts-demo-model';

interface SelectControlOptions {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  description?: string;
  disabled?: boolean;
}

interface TextControlOptions {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  description?: string;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
}

export function button(
  id: string,
  label: string,
  variant: 'primary' | 'secondary' | 'danger' | 'icon' = 'secondary',
  disabled = false,
): DOMElement {
  return {
    type: 'button',
    inputType: 'button',
    id,
    class: `ui-button ui-button-${variant}`,
    value: label,
    disabled,
  };
}

export function selectControl(options: SelectControlOptions): DOMElement {
  const descriptionId = options.description ? `${options.id}-description` : undefined;
  return {
    type: 'div',
    id: `${options.id}-field`,
    class: 'control-field',
    children: [
      { type: 'label', id: `${options.id}-label`, for: options.id, textContent: options.label },
      {
        type: 'select',
        id: options.id,
        name: options.id,
        value: options.value,
        options: [...options.options],
        disabled: options.disabled,
        ariaDescribedby: descriptionId,
      },
      ...(options.description ? [{
        type: 'small' as const,
        id: descriptionId,
        class: 'control-help',
        textContent: options.description,
      }] : []),
    ],
  };
}

export function textControl(options: TextControlOptions): DOMElement {
  const descriptionId = options.description ? `${options.id}-description` : undefined;
  const control: DOMElement = options.multiline ? {
    type: 'textarea',
    id: options.id,
    name: options.id,
    value: options.value,
    placeholder: options.placeholder,
    maxLength: options.maxLength,
    rows: options.rows ?? 4,
    ariaDescribedby: descriptionId,
  } : {
    type: 'input',
    inputType: 'text',
    id: options.id,
    name: options.id,
    value: options.value,
    placeholder: options.placeholder,
    maxLength: options.maxLength,
    ariaDescribedby: descriptionId,
  };

  return {
    type: 'div',
    id: `${options.id}-field`,
    class: `control-field${options.multiline ? ' control-field-editor' : ''}`,
    children: [
      { type: 'label', id: `${options.id}-label`, for: options.id, textContent: options.label },
      control,
      ...(options.description ? [{
        type: 'small' as const,
        id: descriptionId,
        class: 'control-help',
        textContent: options.description,
      }] : []),
    ],
  };
}

export function statusBanner(status: GenerationStatus, message: string): DOMElement {
  return {
    type: 'output',
    id: 'generation-status',
    class: `status-banner status-${status}`,
    role: status === 'error' ? 'alert' : 'status',
    ariaLive: status === 'error' ? 'assertive' : 'polite',
    ariaAtomic: true,
    textContent: message,
  };
}

export function playerCard(options: {
  idPrefix: string;
  title: string;
  voice: string;
  currentTimeLabel: string;
  durationLabel: string;
  progressPercent: number;
  playing: boolean;
  disabled?: boolean;
}): DOMElement {
  const progress = Math.max(0, Math.min(100, options.progressPercent));
  return {
    type: 'article',
    id: `${options.idPrefix}-player`,
    class: 'player-card',
    ariaLabel: `Audio player for ${options.title}`,
    children: [
      {
        type: 'div',
        id: `${options.idPrefix}-player-heading`,
        class: 'player-heading',
        children: [
          { type: 'div', id: `${options.idPrefix}-player-copy`, children: [
            { type: 'h3', id: `${options.idPrefix}-player-title`, textContent: options.title },
            { type: 'p', id: `${options.idPrefix}-player-meta`, textContent: `OpenAI · ${options.voice}` },
          ] },
          button(
            `${options.idPrefix}-download`,
            `Download ${options.title}`,
            'icon',
            options.disabled,
          ),
        ],
      },
      {
        type: 'div',
        id: `${options.idPrefix}-transport`,
        class: 'transport-row',
        children: [
          button(
            `${options.idPrefix}-play`,
            options.playing ? 'Pause' : 'Play',
            'primary',
            options.disabled,
          ),
          button(`${options.idPrefix}-restart`, 'Restart', 'secondary', options.disabled),
          { type: 'span', id: `${options.idPrefix}-current-time`, class: 'time-label', textContent: options.currentTimeLabel },
          {
            type: 'div',
            id: `${options.idPrefix}-progress-track`,
            class: 'progress-track',
            role: 'progressbar',
            ariaLabel: 'Playback progress',
            ariaDescribedby: `${options.idPrefix}-progress-description`,
            children: [
              {
                type: 'div',
                id: `${options.idPrefix}-progress-fill`,
                class: 'progress-fill',
                style: { width: `${progress}%` },
              },
            ],
          },
          { type: 'span', id: `${options.idPrefix}-duration`, class: 'time-label', textContent: options.durationLabel },
          {
            type: 'small',
            id: `${options.idPrefix}-progress-description`,
            class: 'visually-hidden',
            textContent: `${Math.round(progress)} percent played`,
          },
        ],
      },
    ],
  };
}

export function historyCard(
  item: SpeechHistoryItemView,
  options: { selected: boolean; playing: boolean },
): DOMElement {
  return {
    type: 'article',
    id: `history-${item.id}`,
    class: `history-card${options.selected ? ' history-card-selected' : ''}`,
    ariaCurrent: options.selected,
    children: [
      {
        type: 'button',
        inputType: 'button',
        id: `history-${item.id}-select`,
        class: 'history-select',
        value: `Select ${item.title}`,
        ariaLabel: `Select ${item.title}`,
      },
      { type: 'p', id: `history-${item.id}-meta`, class: 'history-meta', textContent: `OpenAI · ${item.voice} · ${item.createdLabel}` },
      { type: 'h3', id: `history-${item.id}-title`, textContent: item.title },
      { type: 'p', id: `history-${item.id}-text`, class: 'history-text', textContent: item.text },
      {
        type: 'div',
        id: `history-${item.id}-actions`,
        class: 'history-actions',
        children: [
          { type: 'span', id: `history-${item.id}-size`, class: 'history-chip', textContent: item.sizeLabel },
          { type: 'span', id: `history-${item.id}-duration`, class: 'history-chip', textContent: item.durationLabel },
          button(`history-${item.id}-play`, options.playing ? 'Pause' : 'Play', 'icon'),
          button(`history-${item.id}-download`, `Download ${item.formatLabel}`, 'icon'),
          button(`history-${item.id}-delete`, `Delete ${item.title}`, 'danger'),
        ],
      },
    ],
  };
}
