import type { DOMElement, SiteData, StyleRule } from 'astylarui';

function panel(id: string, title: string, copy: string): DOMElement {
  return {
    type: 'section',
    id,
    ariaLabelledby: `${id}-title`,
    children: [
      { type: 'h2', id: `${id}-title`, textContent: title },
      { type: 'p', id: `${id}-copy`, textContent: copy },
    ],
  };
}

const styles: StyleRule[] = [
  { selector: '#tts-app', display: 'flex', width: '100%', height: '100%', background: '#0b0f14', color: '#eef4ff', fontFamily: 'Arial', fontSize: '16px' },
  { selector: '#settings-panel', width: '280px', padding: '28px', background: '#151b23', borderWidth: '0 1px 0 0', borderStyle: 'solid', borderColor: '#27303c' },
  { selector: '#workspace-panel', flex: '1', padding: '28px', background: '#0f141b' },
  { selector: '#history-panel', width: '300px', padding: '28px', background: '#11171e', borderWidth: '0 0 0 1px', borderStyle: 'solid', borderColor: '#27303c' },
  { selector: '#tts-app h2', margin: '0 0 12px 0', fontSize: '20px', lineHeight: '26px' },
  { selector: '#tts-app p', margin: '0', color: '#9cabc0', lineHeight: '24px' },
  { selector: '#workspace-panel', mediaMaxWidth: '900px', padding: '22px' },
  { selector: '#settings-panel', mediaMaxWidth: '900px', width: '220px', padding: '22px' },
  { selector: '#history-panel', mediaMaxWidth: '900px', width: '240px', padding: '22px' },
  { selector: '#tts-app', mediaMaxWidth: '680px', flexDirection: 'column', height: 'auto', minHeight: '100%' },
  { selector: '#settings-panel', mediaMaxWidth: '680px', width: 'auto', borderWidth: '0 0 1px 0' },
  { selector: '#history-panel', mediaMaxWidth: '680px', width: 'auto', borderWidth: '1px 0 0 0' },
];

export function buildTtsDemoSite(): SiteData {
  return {
    root: {
      children: [
        {
          type: 'div',
          id: 'tts-app',
          children: [
            panel('settings-panel', 'Settings', 'Voice and model controls will live here.'),
            panel('workspace-panel', 'Text to speech', 'The generation and playback workspace will live here.'),
            panel('history-panel', 'Session history', 'Generated speech will appear here for this session.'),
          ],
        },
      ],
    },
    styles,
    meta: {
      description: 'An Angular text-to-speech application rendered through the AstylarUI public API.',
    },
  };
}
