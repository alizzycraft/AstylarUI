import type { DOMElement, SiteData, StyleRule } from 'astylarui';
import {
  button,
  historyCard,
  playerCard,
  selectControl,
  statusBanner,
  textControl,
} from './component-builders';
import { DEFAULT_TTS_VIEW_MODEL, type TtsDemoViewModel } from './tts-demo-model';

const VOICES = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'coral', label: 'Coral' },
  { value: 'nova', label: 'Nova' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'sage', label: 'Sage' },
  { value: 'shimmer', label: 'Shimmer' },
];

function settingsPanel(view: TtsDemoViewModel): DOMElement {
  return {
    type: 'aside',
    id: 'settings-panel',
    ariaLabelledby: 'settings-title',
    children: [
      { type: 'header', id: 'brand-header', children: [
        { type: 'p', id: 'brand-mark', textContent: '◉ ASTYLAR LABS' },
        { type: 'h1', id: 'app-title', textContent: 'AI Speech Studio' },
        { type: 'p', id: 'app-subtitle', textContent: 'Text to MP3 · session workspace' },
      ] },
      { type: 'h2', id: 'settings-title', textContent: 'Settings' },
      selectControl({
        id: 'provider',
        label: 'Provider',
        value: view.provider,
        options: [{ value: 'OpenAI', label: 'OpenAI' }],
        description: 'This focused demo supports one provider.',
        disabled: true,
      }),
      selectControl({
        id: 'model',
        label: 'Model',
        value: view.model,
        options: [{ value: 'gpt-4o-mini-tts', label: 'GPT-4o mini TTS' }],
        disabled: true,
      }),
      selectControl({ id: 'voice', label: 'Voice', value: view.voice, options: VOICES }),
      textControl({
        id: 'instructions',
        label: 'Voice instructions',
        value: view.instructions,
        description: 'Describe tone, pace, emphasis, or delivery.',
        multiline: true,
        rows: 4,
        maxLength: 500,
      }),
      {
        type: 'div',
        id: 'privacy-note',
        class: 'note-card',
        children: [
          { type: 'strong', id: 'privacy-title', textContent: 'Server-side credentials' },
          { type: 'p', id: 'privacy-copy', textContent: 'The browser never receives or stores an OpenAI API key.' },
        ],
      },
    ],
  };
}

function workspacePanel(view: TtsDemoViewModel): DOMElement {
  const hasSelection = !!view.selectedHistoryId;
  return {
    type: 'main',
    id: 'workspace-panel',
    children: [
      { type: 'header', id: 'workspace-header', children: [
        { type: 'div', id: 'workspace-heading', children: [
          { type: 'p', id: 'workspace-kicker', textContent: 'AstylarUI application demo' },
          { type: 'h2', id: 'workspace-title', textContent: 'Create a speech preview' },
        ] },
        {
          type: 'span',
          id: 'mode-badge',
          class: `mode-badge mode-badge-${view.mode}`,
          textContent: view.mode === 'live' ? 'LIVE OPENAI MODE' : 'MOCK MODE · $0',
        },
      ] },
      {
        type: 'form',
        id: 'speech-form',
        children: [
          textControl({
            id: 'generation-title',
            label: 'Title for session history (optional)',
            value: view.title,
            placeholder: 'Example: Product introduction',
            maxLength: 80,
          }),
          textControl({
            id: 'speech-text',
            label: 'Text to speak',
            value: view.text,
            placeholder: 'Enter the text you want to hear…',
            multiline: true,
            rows: 12,
            maxLength: view.maxCharacters,
          }),
          {
            type: 'div',
            id: 'editor-footer',
            children: [
              {
                type: 'span',
                id: 'character-count',
                textContent: `${view.text.length.toLocaleString()} / ${view.maxCharacters.toLocaleString()} characters`,
              },
              {
                type: 'div',
                id: 'generation-actions',
                children: [
                  ...(view.status === 'generating'
                    ? [button('cancel-speech', 'Cancel generation')]
                    : []),
                  button(
                    'generate-speech',
                    view.status === 'generating' ? 'Generating speech…' : 'Generate speech',
                    'primary',
                    view.status === 'generating',
                  ),
                ],
              },
            ],
          },
        ],
      },
      statusBanner(view.status, view.statusMessage),
      ...(hasSelection ? [playerCard({
        idPrefix: 'selected',
        title: view.history.find((item) => item.id === view.selectedHistoryId)?.title ?? 'Selected speech',
        voice: view.history.find((item) => item.id === view.selectedHistoryId)?.voice ?? view.voice,
        currentTimeLabel: view.currentTimeLabel,
        durationLabel: view.durationLabel,
        progressPercent: view.progressPercent,
        playing: view.playingHistoryId === view.selectedHistoryId,
      })] : [{
        type: 'section' as const,
        id: 'player-placeholder',
        class: 'empty-card',
        children: [
          { type: 'h3' as const, id: 'player-placeholder-title', textContent: 'Your latest generation will appear here' },
          { type: 'p' as const, id: 'player-placeholder-copy', textContent: 'Generate a preview to unlock playback and MP3 download controls.' },
        ],
      }]),
    ],
  };
}

function historyPanel(view: TtsDemoViewModel): DOMElement {
  const query = view.historyQuery.trim().toLocaleLowerCase();
  const filtered = view.history.filter((item) =>
    !query || `${item.title} ${item.text} ${item.voice}`.toLocaleLowerCase().includes(query));

  return {
    type: 'aside',
    id: 'history-panel',
    ariaLabelledby: 'history-title',
    children: [
      { type: 'header', id: 'history-header', children: [
        { type: 'div', id: 'history-heading', children: [
          { type: 'h2', id: 'history-title', textContent: 'Session history' },
          { type: 'p', id: 'history-subtitle', textContent: `${view.history.length} generation${view.history.length === 1 ? '' : 's'} · cleared on refresh` },
        ] },
        button('clear-history', 'Clear all history', 'danger', view.history.length === 0),
      ] },
      {
        type: 'details',
        id: 'storage-disclosure',
        open: view.storageDisclosureOpen,
        children: [
          { type: 'summary', id: 'storage-summary', textContent: 'AI-generated voice and session storage' },
          { type: 'p', id: 'storage-copy', textContent: 'This voice is AI-generated. Audio remains in memory for this tab and is not written to local storage.' },
        ],
      },
      textControl({
        id: 'history-search',
        label: 'Search history',
        value: view.historyQuery,
        placeholder: 'Search title, text, or voice…',
      }),
      {
        type: 'section',
        id: 'history-list',
        ariaLabel: 'Generated speech history',
        children: filtered.length > 0
          ? filtered.map((item) => historyCard(item, {
            selected: item.id === view.selectedHistoryId,
            playing: item.id === view.playingHistoryId,
          }))
          : [{
            type: 'div',
            id: 'history-empty',
            class: 'empty-card',
            children: [
              { type: 'h3', id: 'history-empty-title', textContent: query ? 'No matching generations' : 'No speech generated yet' },
              { type: 'p', id: 'history-empty-copy', textContent: query ? 'Try a different history search.' : 'Your session history will appear here.' },
            ],
          }],
      },
    ],
  };
}

const styles: StyleRule[] = [
  { selector: '#tts-app', display: 'flex', width: '100%', height: '100%', minHeight: '640px', background: '#0b0f14', color: '#eef4ff', fontFamily: 'Arial', fontSize: '15px', lineHeight: '22px', overflow: 'hidden' },
  { selector: '#settings-panel', boxSizing: 'border-box', width: '282px', padding: '28px 24px', background: '#151b23', borderWidth: '0 1px 0 0', borderStyle: 'solid', borderColor: '#27303c', overflow: 'auto' },
  { selector: '#workspace-panel', boxSizing: 'border-box', flex: '1', minWidth: '0', padding: '28px', background: '#0f141b', overflow: 'auto' },
  { selector: '#history-panel', boxSizing: 'border-box', width: '330px', padding: '28px 20px', background: '#11171e', borderWidth: '0 0 0 1px', borderStyle: 'solid', borderColor: '#27303c', overflow: 'auto' },
  { selector: '#brand-header', margin: '0 0 34px 0', background: '#151b23' },
  { selector: '#brand-mark', margin: '0 0 8px 0', color: '#66a3ff', fontSize: '12px', fontWeight: '700', letterSpacing: '1.4px' },
  { selector: '#app-title', margin: '0 0 5px 0', fontSize: '23px', lineHeight: '29px' },
  { selector: '#app-subtitle', margin: '0', color: '#91a0b5', fontSize: '13px' },
  { selector: '#settings-title', margin: '0 0 20px 0', fontSize: '17px' },
  { selector: '.control-field', display: 'flex', flexDirection: 'column', gap: '7px', margin: '0 0 18px 0' },
  { selector: '.control-field label', color: '#eaf1fc', fontWeight: '700' },
  { selector: '.control-field input', boxSizing: 'border-box', width: '100%', padding: '12px', background: '#0b1016', color: '#f4f7fb', borderWidth: '1px', borderStyle: 'solid', borderColor: '#2b3542', borderRadius: '8px' },
  { selector: '.control-field select', boxSizing: 'border-box', width: '100%', padding: '12px', background: '#0b1016', color: '#f4f7fb', borderWidth: '1px', borderStyle: 'solid', borderColor: '#2b3542', borderRadius: '8px' },
  { selector: '.control-field textarea', boxSizing: 'border-box', width: '100%', minHeight: '92px', padding: '12px', background: '#0b1016', color: '#f4f7fb', borderWidth: '1px', borderStyle: 'solid', borderColor: '#2b3542', borderRadius: '8px', lineHeight: '22px' },
  { selector: '.control-help', color: '#8291a7', fontSize: '12px', lineHeight: '17px' },
  { selector: '.note-card', padding: '14px', background: '#182432', borderWidth: '1px', borderStyle: 'solid', borderColor: '#263b50', borderRadius: '10px' },
  { selector: '.note-card strong', color: '#b7d5ff' },
  { selector: '.note-card p', margin: '6px 0 0 0', color: '#8fa3bc', fontSize: '12px', lineHeight: '18px' },
  { selector: '#workspace-header', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', margin: '0 0 20px 0', background: '#0f141b' },
  { selector: '#workspace-kicker', margin: '0 0 5px 0', color: '#6da8ff', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' },
  { selector: '#workspace-title', margin: '0', fontSize: '26px', lineHeight: '32px' },
  { selector: '.mode-badge', padding: '6px 9px', background: '#173622', color: '#74db94', borderWidth: '1px', borderStyle: 'solid', borderColor: '#245d37', borderRadius: '999px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' },
  { selector: '.mode-badge-live', background: '#352a16', color: '#ffdc8a', borderColor: '#6d5420' },
  { selector: '#speech-form', padding: '20px', background: '#171d25', borderWidth: '1px', borderStyle: 'solid', borderColor: '#27303c', borderRadius: '14px', boxShadow: '0 14px 34px rgba(0, 0, 0, 0.18)' },
  { selector: '#speech-text', minHeight: '250px' },
  { selector: '#editor-footer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  { selector: '#generation-actions', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' },
  { selector: '#character-count', color: '#8b9bb0', fontSize: '12px' },
  { selector: '#generate-speech', width: '180px' },
  { selector: '.ui-button', padding: '10px 14px', background: '#283342', color: '#f4f7fb', borderWidth: '1px', borderStyle: 'solid', borderColor: '#39475a', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
  { selector: '.ui-button-primary', background: '#247c3d', borderColor: '#329b50', color: '#ffffff' },
  { selector: '.ui-button-danger', padding: '8px 10px', background: '#2c2024', borderColor: '#5a3038', color: '#ffb4bf', fontSize: '12px' },
  { selector: '.ui-button-icon', padding: '8px 10px', background: '#1d2631', color: '#cbd6e5', fontSize: '12px' },
  { selector: '.status-banner', display: 'block', margin: '16px 0', padding: '12px 14px', background: '#17202b', color: '#b8c6d8', borderWidth: '1px', borderStyle: 'solid', borderColor: '#293748', borderRadius: '9px' },
  { selector: '.status-generating', background: '#2a2518', color: '#ffe19a', borderColor: '#55471e' },
  { selector: '.status-success', background: '#14291c', color: '#9ce6ae', borderColor: '#285538' },
  { selector: '.status-error', background: '#32191e', color: '#ffabb8', borderColor: '#6b2c38' },
  { selector: '.player-card', padding: '18px', background: '#171d25', borderWidth: '1px', borderStyle: 'solid', borderColor: '#2b3542', borderRadius: '14px' },
  { selector: '.player-heading', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', margin: '0 0 16px 0' },
  { selector: '.player-card h3', margin: '0 0 4px 0', fontSize: '17px' },
  { selector: '.player-card p', margin: '0', color: '#8fa0b7', fontSize: '12px' },
  { selector: '.transport-row', display: 'flex', alignItems: 'center', gap: '10px' },
  { selector: '.progress-track', flex: '1', height: '7px', background: '#26303d', borderRadius: '999px', overflow: 'hidden' },
  { selector: '.progress-fill', height: '100%', background: '#36a957', borderRadius: '999px' },
  { selector: '.time-label', minWidth: '34px', color: '#93a2b6', fontSize: '11px', textAlign: 'center' },
  { selector: '.empty-card', padding: '30px 20px', background: '#131920', borderWidth: '1px', borderStyle: 'solid', borderColor: '#27303c', borderRadius: '12px', textAlign: 'center' },
  { selector: '.empty-card h3', margin: '0 0 8px 0', fontSize: '16px' },
  { selector: '.empty-card p', margin: '0', color: '#8190a4' },
  { selector: '#history-header', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', margin: '0 0 16px 0', background: '#11171e' },
  { selector: '#clear-history', width: '100%' },
  { selector: '#history-title', margin: '0 0 5px 0', fontSize: '20px' },
  { selector: '#history-subtitle', margin: '0', color: '#8392a7', fontSize: '12px' },
  { selector: '#storage-disclosure', margin: '0 0 16px 0', padding: '12px', background: '#171e27', borderWidth: '1px', borderStyle: 'solid', borderColor: '#293543', borderRadius: '9px' },
  { selector: '#storage-summary', color: '#d8e2ef', fontWeight: '700', cursor: 'pointer' },
  { selector: '#storage-copy', margin: '8px 0 0 0', color: '#8291a6', fontSize: '12px', lineHeight: '18px' },
  { selector: '#history-list', display: 'flex', flexDirection: 'column', gap: '10px' },
  { selector: '.history-card', position: 'relative', padding: '14px', background: '#171d25', borderWidth: '1px', borderStyle: 'solid', borderColor: '#293440', borderRadius: '10px' },
  { selector: '.history-card-selected', borderColor: '#4089e8', background: '#182435' },
  { selector: '.history-select', width: '100%', padding: '7px 9px', margin: '0 0 7px 0', background: '#202b38', color: '#dce8f8', borderWidth: '1px', borderStyle: 'solid', borderColor: '#34465b', borderRadius: '7px', textAlign: 'left', fontWeight: '700', cursor: 'pointer' },
  { selector: '.history-card h3', position: 'relative', margin: '5px 0', fontSize: '15px' },
  { selector: '.history-meta', position: 'relative', margin: '0', color: '#7790ad', fontSize: '10px' },
  { selector: '.history-text', position: 'relative', margin: '0 0 12px 0', color: '#b6c1d0', fontSize: '12px', lineHeight: '18px' },
  { selector: '.history-actions', position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' },
  { selector: '.history-chip', padding: '4px 6px', background: '#202a36', color: '#91a0b5', borderRadius: '5px', fontSize: '10px' },
  { selector: '.visually-hidden', position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' },
  { selector: '#settings-panel', mediaMaxWidth: '1050px', width: '240px', padding: '22px 18px' },
  { selector: '#history-panel', mediaMaxWidth: '1050px', width: '280px', padding: '22px 16px' },
  { selector: '#workspace-panel', mediaMaxWidth: '1050px', padding: '22px' },
  { selector: '#tts-app', mediaMaxWidth: '760px', flexDirection: 'column', height: 'auto', minHeight: '100%', overflow: 'auto' },
  { selector: '#settings-panel', mediaMaxWidth: '760px', width: '100%', borderWidth: '0 0 1px 0', overflow: 'visible' },
  { selector: '#workspace-panel', mediaMaxWidth: '760px', width: '100%', overflow: 'visible' },
  { selector: '#history-panel', mediaMaxWidth: '760px', width: '100%', borderWidth: '1px 0 0 0', overflow: 'visible' },
  { selector: '#workspace-header', mediaMaxWidth: '520px', alignItems: 'flex-start', flexDirection: 'column' },
  { selector: '#editor-footer', mediaMaxWidth: '520px', alignItems: 'stretch', flexDirection: 'column' },
  { selector: '.transport-row', mediaMaxWidth: '520px', flexWrap: 'wrap' },
];

export function buildTtsDemoSite(view: TtsDemoViewModel = DEFAULT_TTS_VIEW_MODEL): SiteData {
  return {
    root: {
      children: [
        {
          type: 'div',
          id: 'tts-app',
          children: [settingsPanel(view), workspacePanel(view), historyPanel(view)],
        },
      ],
    },
    styles,
    meta: {
      description: 'An Angular text-to-speech application rendered through the AstylarUI public API.',
    },
  };
}
