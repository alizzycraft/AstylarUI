import type { DOMElement, SiteData, StyleRule } from 'astylarui';
import { DEFAULT_TTS_VIEW_MODEL, type TtsDemoViewModel } from './tts-demo-model';

const VOICES = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'coral', label: 'Coral' },
  { value: 'nova', label: 'Nova' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'sage', label: 'Sage' },
  { value: 'shimmer', label: 'Shimmer' },
];

function labelledSelect(
  id: string,
  label: string,
  value: string,
  options: readonly { value: string; label: string }[],
  disabled = false,
): DOMElement {
  return {
    type: 'label', id: `${id}-field`, for: id, class: 'setting-field', children: [
      { type: 'span', id: `${id}-label`, class: 'setting-label', textContent: label },
      { type: 'select', id, name: id, value, options: [...options], ariaLabel: label, disabled },
    ],
  };
}

function settingsPanel(view: TtsDemoViewModel): DOMElement {
  return {
    type: 'aside', id: 'settings-panel', children: [
      { type: 'header', id: 'brand-header', class: 'app-header', children: [
        { type: 'h1', id: 'app-title', class: 'app-title', textContent: '◉ AI-TTS-MP3' },
        { type: 'p', id: 'app-subtitle', class: 'app-subtitle', textContent: 'Text to MP3 conversion' },
      ] },
      { type: 'div', id: 'settings-header', children: [
        { type: 'h2', id: 'settings-title', textContent: '⚙ Settings' },
      ] },
      { type: 'div', id: 'settings-content', children: [
        labelledSelect('provider', 'Voice Provider', view.provider.toLowerCase(), [{ value: 'openai', label: 'Openai' }]),
        labelledSelect('model', 'Model', view.model, [{ value: view.model, label: 'tts-1' }]),
        labelledSelect('voice', 'Voice', view.voice, VOICES),
        { type: 'label', id: 'instructions-field', for: 'instructions', class: 'setting-field', children: [
          { type: 'span', id: 'instructions-label', class: 'setting-label', textContent: 'API Key' },
          { type: 'input', inputType: 'password', id: 'instructions', name: 'instructions', value: view.instructions || 'reference-only-reference-only' },
        ] },
      ] },
      { type: 'footer', id: 'settings-footer', textContent: 'Licensed under AGPL v3' },
    ],
  };
}

function editor(view: TtsDemoViewModel): DOMElement {
  const lines = Math.max(1, view.text.split(/\r?\n/).length);
  return {
    type: 'section', id: 'speech-form', children: [
      { type: 'div', id: 'title-row', children: [
        { type: 'input', inputType: 'text', id: 'generation-title', name: 'generation-title',
          value: view.title, placeholder: 'Title for history (optional)', ariaLabel: 'Title for history', maxLength: 80 },
        { type: 'span', id: 'save-history', textContent: '◉　Save to History' },
      ] },
      { type: 'div', id: 'editor-container', children: [
        { type: 'div', id: 'editor-header', children: [
          { type: 'strong', id: 'workspace-title', textContent: '▣　text-to-speech.txt' },
          { type: 'span', id: 'character-count', textContent: `${lines} lines | ${view.text.length} chars | ${Math.max(1, Math.ceil(view.text.length / 4))} tks | ~$0.00007 est.` },
        ] },
        { type: 'div', id: 'editor-wrapper', children: [
          { type: 'div', id: 'line-numbers', textContent: Array.from({ length: lines }, (_, index) => `${index + 1}`).join('\n') },
          { type: 'textarea', id: 'speech-text', name: 'speech-text', value: view.text,
            ariaLabel: 'Text to speak', rows: 12, maxLength: view.maxCharacters },
        ] },
      ] },
      { type: 'div', id: 'editor-bottom', children: [
        ...(view.status === 'idle' ? [] : [{
          type: 'span' as const,
          id: 'generation-status',
          role: view.status === 'error' ? 'alert' as const : 'status' as const,
          ariaLive: view.status === 'error' ? 'assertive' as const : 'polite' as const,
          ariaAtomic: true,
          textContent: view.status === 'success' ? 'Speech generated successfully!' : view.statusMessage,
        }]),
        ...(view.status === 'generating' ? [{
          type: 'button' as const, inputType: 'button' as const, id: 'cancel-speech', value: 'Cancel generation',
        }] : []),
        { type: 'button', inputType: 'button', id: 'generate-speech',
          value: view.status === 'generating' ? 'Generating...' : '♩　Generate Speech',
          ariaLabel: view.status === 'generating' ? 'Generating speech' : 'Generate speech',
          disabled: view.status === 'generating' },
      ] },
    ],
  };
}

function player(view: TtsDemoViewModel): DOMElement {
  const selected = view.history.find((item) => item.id === view.selectedHistoryId);
  if (!selected) {
    return { type: 'section', id: 'player-placeholder', class: 'audio-player', children: [
      { type: 'strong', id: 'player-placeholder-title', textContent: 'Generate speech to see audio controls here' },
    ] };
  }
  return {
    type: 'article', id: 'selected-player', class: 'audio-player', ariaLabel: `Audio player for ${selected.title}`, children: [
      { type: 'strong', id: 'selected-player-title', textContent: selected.text },
      { type: 'div', id: 'selected-player-row', children: [
        { type: 'p', id: 'selected-player-meta', textContent: `Provider: openai\nModel: tts-1\nVoice: ${selected.voice}` },
        { type: 'button', inputType: 'button', id: 'selected-play',
          class: view.playingHistoryId === selected.id ? 'transport-play playing' : 'transport-play',
          value: view.playingHistoryId === selected.id ? 'Pause' : '▷',
          ariaLabel: view.playingHistoryId === selected.id ? 'Pause' : 'Play' },
        { type: 'span', id: 'selected-current-time', textContent: view.currentTimeLabel },
        { type: 'div', id: 'selected-progress-track', role: 'progressbar', ariaLabel: 'Playback progress', children: [
          { type: 'div', id: 'selected-progress-fill', style: { width: `${view.progressPercent}%` } },
        ] },
        { type: 'span', id: 'selected-duration', textContent: view.durationLabel },
        { type: 'button', inputType: 'button', id: 'selected-download', value: `${view.durationLabel}　⇩`, ariaLabel: `Download ${selected.title}` },
        { type: 'p', id: 'selected-player-info', textContent: `${selected.createdLabel}\nSize: ${selected.sizeLabel}\nDuration: ${selected.durationLabel}` },
      ] },
    ],
  };
}

function historyItem(item: TtsDemoViewModel['history'][number], selected: boolean, playing: boolean): DOMElement {
  const classNames = [
    'history-item',
    selected ? 'selected' : '',
    item.text.length > 40 ? 'expanded' : '',
  ].filter(Boolean).join(' ');
  return {
    type: 'article', id: `history-${item.id}`, class: classNames,
    role: 'button', tabindex: 0, ariaLabel: `Select ${item.title}`, children: [
      { type: 'small', id: `history-${item.id}-meta`, children: [
        { type: 'span', id: `history-${item.id}-provider`, textContent: `⚙　Openai　　● ${item.voice.charAt(0).toUpperCase()}${item.voice.slice(1)}` },
        { type: 'span', id: `history-${item.id}-created`, textContent: item.createdLabel },
      ] },
      { type: 'p', id: `history-${item.id}-text`, textContent: item.text },
      { type: 'footer', id: `history-${item.id}-actions`, children: [
        { type: 'span', id: `history-${item.id}-size`, textContent: `${item.sizeLabel}　 ${item.durationLabel}` },
        { type: 'button', inputType: 'button', id: `history-${item.id}-play`,
          class: playing ? 'transport-play playing' : 'transport-play',
          value: playing ? 'Pause' : '▷', ariaLabel: playing ? 'Pause' : 'Play' },
        { type: 'button', inputType: 'button', id: `history-${item.id}-download`, value: '⇩', ariaLabel: `Download ${item.title}` },
        { type: 'button', inputType: 'button', id: `history-${item.id}-delete`, value: '♲', ariaLabel: `Delete ${item.title}` },
      ] },
    ],
  };
}

function historyPanel(view: TtsDemoViewModel): DOMElement {
  const query = view.historyQuery.trim().toLowerCase();
  const filtered = view.history.filter((item) => !query || `${item.title} ${item.text} ${item.voice}`.toLowerCase().includes(query));
  return {
    type: 'aside', id: 'history-panel', children: [
      { type: 'header', id: 'history-header', class: 'app-header', children: [
        { type: 'h2', id: 'history-title', textContent: `▣　History (${view.history.length})` },
        { type: 'p', id: 'history-subtitle', textContent: 'Generated speech will appear here' },
      ] },
      { type: 'div', id: 'history-body', children: [
        { type: 'section', id: 'storage-disclosure', children: [
          { type: 'strong', id: 'storage-title', textContent: 'Storage　♧' },
          { type: 'div', id: 'storage-bar' },
          { type: 'div', id: 'storage-text', children: [
            { type: 'b', id: 'storage-percent', textContent: '0%' },
            { type: 'span', id: 'storage-size', textContent: '7.5 KB / 20 MB' },
          ] },
        ] },
        { type: 'div', id: 'history-search-row', children: [
          { type: 'input', inputType: 'text', id: 'history-search', name: 'history-search', value: view.historyQuery, placeholder: 'Search history...', ariaLabel: 'Search history' },
          { type: 'button', inputType: 'button', id: 'clear-history', value: '♲ All', ariaLabel: 'Clear all history', disabled: view.history.length === 0 },
        ] },
        { type: 'div', id: 'history-list', children: filtered.length
          ? filtered.map((item) => historyItem(item, item.id === view.selectedHistoryId, item.id === view.playingHistoryId))
          : [{ type: 'article', id: 'history-empty', children: [
              { type: 'h3', id: 'history-empty-title', textContent: query ? 'No items match your search' : 'No TTS history yet' },
              { type: 'p', id: 'history-empty-copy', textContent: 'Generated speech will appear here' },
            ] }] },
      ] },
      { type: 'footer', id: 'history-footer', textContent: 'by:　▣　♧　♡　◎' },
    ],
  };
}

const styles: StyleRule[] = [
  { selector: '*', boxSizing: 'border-box', margin: '0', padding: '0' },
  { selector: '#tts-app', display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0d1117', color: '#e6edf3', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '14px', lineHeight: '1.5' },
  { selector: 'input', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '14px', lineHeight: '1.5' },
  { selector: 'select', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '14px', lineHeight: '1.5' },
  { selector: 'textarea', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '14px', lineHeight: '1.5' },
  { selector: 'button', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '14px', lineHeight: '1.5' },
  { selector: '#settings-panel', display: 'flex', flexDirection: 'column', flexShrink: '0', width: '320px', minWidth: '320px', maxWidth: '320px', height: '100vh', overflow: 'hidden', background: '#0d1117', borderWidth: '0 1px 0 0', borderStyle: 'solid', borderColor: '#21262d' },
  { selector: '#history-panel', display: 'flex', flexDirection: 'column', flexShrink: '0', width: '320px', minWidth: '320px', maxWidth: '320px', height: '100vh', overflow: 'hidden', background: '#0d1117', borderWidth: '0 0 0 1px', borderStyle: 'solid', borderColor: '#21262d' },
  { selector: '.app-header', padding: '24px 16px 16px', textAlign: 'center', background: '#161b22', borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: '#21262d' },
  { selector: '#brand-header', height: '91.5px', flexShrink: '0' },
  { selector: '.app-title', margin: '0', fontSize: '18px', lineHeight: '27px', fontWeight: '700' },
  { selector: '.app-subtitle', margin: '4px 0 0 0', color: '#7d8590', fontSize: '13px' },
  { selector: '#settings-header', flexShrink: '0', height: '48px', padding: '16px 16px 7px', background: '#161b22', borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: '#21262d' },
  { selector: '#settings-title', margin: '0', fontSize: '16px', lineHeight: '24px' },
  { selector: '#settings-content', flex: '1', minHeight: '0', overflow: 'auto', padding: '16px', background: '#161b22' },
  { selector: '.setting-field', display: 'block', margin: '0 0 24px 0', fontWeight: '600' },
  { selector: '.setting-label', display: 'block', margin: '0 0 8px 0' },
  { selector: '.setting-field select', display: 'block', width: '100%', height: '50px', padding: '12px', background: '#0d1117', color: '#e6edf3', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '6px' },
  { selector: '.setting-field input', display: 'block', width: '100%', height: '50px', padding: '12px', background: '#0d1117', color: '#e6edf3', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '6px' },
  { selector: '#settings-footer', flexShrink: '0', height: '46px', padding: '12px 16px', textAlign: 'center', color: '#7d8590', background: '#161b22', borderWidth: '1px 0 0 0', borderStyle: 'solid', borderColor: '#21262d' },
  { selector: '#workspace-panel', display: 'flex', flexDirection: 'column', flex: '1', minWidth: '0', height: '100vh', overflow: 'hidden', background: '#0d1117' },
  { selector: '#speech-form', display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', gap: '12px', margin: '16px 24px 8px', padding: '16px 16px 8px', overflow: 'hidden', background: '#161b22', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '12px' },
  { selector: '#title-row', display: 'flex', alignItems: 'center', gap: '28px', height: '44px' },
  { selector: '#generation-title', flex: '1', minWidth: '0', height: '44px', padding: '12px', background: '#0d1117', color: '#e6edf3', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '6px' },
  { selector: '#save-history', width: '180px', color: '#8b949e' },
  { selector: '#editor-container', display: 'flex', flexDirection: 'column', flex: '1', minHeight: '200px', overflow: 'hidden', background: '#1a202c', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '8px' },
  { selector: '#editor-header', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '48px', padding: '12px 16px', background: '#2d3748', color: '#7d8590', fontSize: '12px', borderWidth: '0 0 1px 0', borderStyle: 'solid', borderColor: '#4a5568' },
  { selector: '#workspace-title', color: '#e2e8f0' },
  { selector: '#editor-wrapper', display: 'flex', flex: '1', minHeight: '0', overflow: 'hidden' },
  { selector: '#line-numbers', width: '50px', padding: '16px 12px', textAlign: 'right', whiteSpace: 'pre-line', background: '#2d3748', color: '#718096', borderWidth: '0 1px 0 0', borderStyle: 'solid', borderColor: '#4a5568' },
  { selector: '#speech-text', flex: '1', minWidth: '0', height: '100%', minHeight: '170px', padding: '16px', overflow: 'auto', whiteSpace: 'pre-wrap', background: '#1a202c', color: '#e2e8f0', fontFamily: 'Consolas', fontSize: '14px', lineHeight: '21px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#30363d', borderRadius: '0' },
  { selector: '#editor-bottom', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '56px', gap: '12px' },
  { selector: '#generate-speech', height: 'auto', margin: '0 0 0 auto', minWidth: '198px', padding: '14px 24px', background: '#238636', color: '#ffffff', fontWeight: '600', borderWidth: '0', borderRadius: '6px' },
  { selector: '#cancel-speech', padding: '10px 16px', background: '#21262d', color: '#e6edf3', borderWidth: '1px', borderStyle: 'solid', borderColor: '#30363d', borderRadius: '6px' },
  { selector: '.audio-player', flexShrink: '0', minHeight: '116px', margin: '8px 24px 16px', padding: '16px', background: '#161b22', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '12px' },
  { selector: '#player-placeholder', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590' },
  { selector: '#selected-player', height: '131px' },
  { selector: '#selected-player-row', display: 'flex', alignItems: 'center', gap: '16px', margin: '23px 0 0 0', color: '#7d8590', fontSize: '12px' },
  { selector: '#selected-player-title', height: '19px', lineHeight: '19px', margin: '1px 0 0 0' },
  { selector: '#selected-player-meta', minWidth: '100px', whiteSpace: 'pre-line' },
  { selector: '#selected-play', width: '17px', height: '30px', background: 'transparent', color: '#e6edf3', fontSize: '20px', borderWidth: '0' },
  { selector: '#selected-progress-track', flex: '1', height: '10px', padding: '3px 0 2px' },
  { selector: '#selected-progress-fill', width: '100%', height: '5px', background: '#238636', borderRadius: '3px' },
  { selector: '#selected-duration', display: 'none' },
  { selector: '#selected-download', width: '41.125px', height: '18px', background: 'transparent', color: '#7d8590', borderWidth: '0' },
  { selector: '#selected-player-info', minWidth: '100px', margin: '0', textAlign: 'right', whiteSpace: 'pre-line' },
  { selector: '#history-title', height: '28px', margin: '0', fontSize: '18px', lineHeight: '27px' },
  { selector: '#history-header', height: '92.5px', flexShrink: '0' },
  { selector: '#history-subtitle', margin: '4px 0 0 0', color: '#7d8590', fontSize: '13px' },
  { selector: '#history-body', flex: '1', minHeight: '0', overflow: 'auto' },
  { selector: '#storage-disclosure', margin: '16px', padding: '13px 12px 11px', background: '#161b22', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '6px' },
  { selector: '#storage-bar', height: '6px', margin: '12px 0 8px', background: '#21262d', borderRadius: '3px' },
  { selector: '#storage-text', display: 'flex', justifyContent: 'space-between' },
  { selector: '#storage-size', color: '#7d8590', fontSize: '12px' },
  { selector: '#history-search-row', display: 'flex', gap: '8px', padding: '0 16px 16px' },
  { selector: '#history-search', flex: '1', minWidth: '0', height: '40px', padding: '10px', background: '#0d1117', color: '#e6edf3', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '6px' },
  { selector: '#clear-history', width: '64px', background: '#0d1117', color: '#e6edf3', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '6px' },
  { selector: '.history-item', position: 'relative', height: '133px', minHeight: '128px', margin: '0 8px', padding: '12px 16px', background: '#161b22', borderWidth: '1px', borderStyle: 'solid', borderColor: '#21262d', borderRadius: '6px' },
  { selector: '.history-item.expanded', display: 'flex', flexDirection: 'column', height: 'auto', minHeight: '133px' },
  { selector: '.history-item.selected', borderColor: '#1f6feb' },
  { selector: '.history-item small', display: 'flex', justifyContent: 'space-between', height: '16px', margin: '3px 0 4px', lineHeight: '16px', color: '#7d8590' },
  { selector: '.history-item p', margin: '18px 0 0 0' },
  { selector: '.history-item footer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', margin: '28px 0 0 0', color: '#7d8590' },
  { selector: '.history-item.expanded footer', flexShrink: '0', margin: '16px 0 0 0' },
  { selector: '.history-item footer span', margin: '0 auto 0 0' },
  { selector: '.history-item button', width: '11px', height: '21px', background: 'transparent', color: '#e6edf3', borderWidth: '0' },
  { selector: '.transport-play:focus, .transport-play.playing', color: '#58a6ff' },
  { selector: '#history-empty', minHeight: '200px', margin: '8px', padding: '48px 16px', background: 'transparent', textAlign: 'center', color: '#7d8590' },
  { selector: '#history-empty-title', margin: '0', color: '#e6edf3', fontSize: '14px' },
  { selector: '#history-empty-copy', margin: '0' },
  { selector: '#history-footer', flexShrink: '0', height: '46px', padding: '12px 16px', textAlign: 'center', color: '#7d8590', background: '#161b22', borderWidth: '1px 0 0 0', borderStyle: 'solid', borderColor: '#21262d' },
  { selector: '#github-banner', position: 'fixed', right: '-38px', top: '26px', zIndex: '100', width: '150px', padding: '8px 0', transform: 'rotate(45deg)', background: '#2e394e', color: '#8898b1', textAlign: 'center', fontSize: '12px' },
  { selector: '#history-panel', mediaMaxWidth: '768px', width: '280px', minWidth: '280px', maxWidth: '280px' },
  { selector: '#speech-form', mediaMaxWidth: '768px', margin: '16px', padding: '24px' },
  { selector: '#title-row', mediaMaxWidth: '768px', flexDirection: 'column', alignItems: 'stretch', height: 'auto' },
  { selector: '#generation-title', mediaMaxWidth: '768px', height: '45px' },
  { selector: '#save-history', mediaMaxWidth: '768px', width: 'auto' },
  { selector: '#editor-bottom', mediaMaxWidth: '768px', flexDirection: 'column', alignItems: 'stretch' },
];

export function buildTtsDemoSite(view: TtsDemoViewModel = DEFAULT_TTS_VIEW_MODEL): SiteData {
  return {
    styles,
    meta: {
      description: 'An Angular text-to-speech application rendered through the AstylarUI public API.',
    },
    root: { children: [{
      type: 'div', id: 'tts-app', children: [
        settingsPanel(view),
        { type: 'main', id: 'workspace-panel', children: [editor(view), player(view)] },
        historyPanel(view),
        { type: 'div', id: 'github-banner', textContent: 'View on GitHub' },
      ],
    }] },
  };
}
