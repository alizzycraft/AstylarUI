import type { ParityFixture } from '../parity.types';

export const interactionFocusNavigationFixture: ParityFixture = {
  id: 'interaction-focus-navigation',
  title: 'Focus and keyboard navigation',
  category: 'forms-interactive',
  expectedBehavior:
    'Pointer focus, forward and reverse Tab navigation, disabled-control skipping, and outside-click blur report the same focus and event order as the browser.',
  measurementIds: [
    'focus-surface',
    'focus-first',
    'focus-disabled',
    'focus-second',
    'focus-outside',
  ],
  interactionIds: ['focus-first', 'focus-disabled', 'focus-second'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown'],
  interactionSteps: [
    { id: 'pointer-focus-first', actions: [{ type: 'click', elementId: 'focus-first' }] },
    { id: 'tab-skips-disabled', actions: [{ type: 'press-key', key: 'Tab' }] },
    { id: 'reverse-tab', actions: [{ type: 'press-key', key: 'Shift+Tab' }] },
    { id: 'outside-click-blurs', actions: [{ type: 'click', elementId: 'focus-outside' }] },
  ],
  reference: {
    html: `
      <section id="focus-surface">
        <input id="focus-first" type="button" value="First">
        <input id="focus-disabled" type="button" value="Disabled" disabled>
        <input id="focus-second" type="button" value="Second">
        <div id="focus-outside">Outside target</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #focus-surface { box-sizing:border-box; display:flex; flex-wrap:wrap; gap:12px; position:absolute; left:120px; top:110px; width:560px; height:230px; padding:28px; background:#e2e8f0; }
      #focus-first, #focus-disabled, #focus-second { appearance:none; box-sizing:border-box; width:150px; height:52px; margin:0; padding:10px 16px; border:2px solid #334155; border-radius:7px; background:#fff; color:#0f172a; font:600 15px/24px Arial,sans-serif; text-align:center; }
      #focus-first:focus, #focus-second:focus { outline:3px solid #60a5fa; outline-offset:2px; }
      #focus-disabled { opacity:.5; }
      #focus-outside { box-sizing:border-box; flex-basis:474px; width:474px; height:70px; padding:20px; background:#cbd5e1; color:#334155; font:400 14px/30px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#focus-surface', boxSizing: 'border-box', display: 'flex', flexWrap: 'wrap',
        gap: '12px', position: 'absolute', left: '120px', top: '110px', width: '560px',
        height: '230px', padding: '28px', background: '#e2e8f0',
      },
      {
        selector: '.focus-button', boxSizing: 'border-box', width: '150px', height: '52px',
        margin: '0', padding: '10px 16px', borderWidth: '2px', borderStyle: 'solid',
        borderColor: '#334155', borderRadius: '7px', background: '#ffffff', color: '#0f172a',
        fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: '600', lineHeight: '24px',
        textAlign: 'center',
      },
      { selector: '#focus-disabled', opacity: '0.5' },
      {
        selector: '#focus-outside', boxSizing: 'border-box', flexBasis: '474px', width: '474px',
        height: '70px', padding: '20px', background: '#cbd5e1', color: '#334155',
        fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '30px',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'focus-surface', children: [
          { type: 'input', inputType: 'button', id: 'focus-first', class: 'focus-button', value: 'First' },
          { type: 'input', inputType: 'button', id: 'focus-disabled', class: 'focus-button', value: 'Disabled', disabled: true },
          { type: 'input', inputType: 'button', id: 'focus-second', class: 'focus-button', value: 'Second' },
          { type: 'div', id: 'focus-outside', textContent: 'Outside target' },
        ],
      }],
    },
  },
};
