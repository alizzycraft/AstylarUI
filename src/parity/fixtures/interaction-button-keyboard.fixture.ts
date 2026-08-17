import type { ParityFixture } from '../parity.types';

export const interactionButtonKeyboardFixture: ParityFixture = {
  id: 'interaction-button-keyboard',
  title: 'Button keyboard activation',
  category: 'forms-interactive',
  expectedBehavior:
    'Enter synthesizes a button click during keydown, while Space synthesizes its click after keyup, with browser-compatible keyboard click details.',
  measurementIds: ['button-keyboard-surface', 'button-keyboard-control'],
  interactionIds: ['button-keyboard-control'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'keydown', 'keyup',
  ],
  interactionSteps: [
    { id: 'pointer-focus', actions: [{ type: 'click', elementId: 'button-keyboard-control' }] },
    { id: 'enter-activates', actions: [{ type: 'press-key', key: 'Enter' }] },
    { id: 'space-activates', actions: [{ type: 'press-key', key: 'Space' }] },
  ],
  reference: {
    html: `
      <section id="button-keyboard-surface">
        <input id="button-keyboard-control" type="button" value="Run action">
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #button-keyboard-surface { box-sizing:border-box; position:absolute; left:240px; top:180px; width:320px; height:160px; padding:48px 60px; background:#e2e8f0; }
      #button-keyboard-control { appearance:none; box-sizing:border-box; position:absolute; left:60px; top:48px; width:200px; height:64px; margin:0; padding:16px 24px; border:2px solid #1e3a8a; border-radius:8px; outline:0; background:#dbeafe; color:#172554; font:700 16px/28px Arial,sans-serif; text-align:center; }
      #button-keyboard-control:focus { outline:3px solid #60a5fa; outline-offset:2px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#button-keyboard-surface', boxSizing: 'border-box', position: 'absolute',
        left: '240px', top: '180px', width: '320px', height: '160px', padding: '48px 60px',
        background: '#e2e8f0',
      },
      {
        selector: '#button-keyboard-control', boxSizing: 'border-box', position: 'absolute',
        left: '60px', top: '48px', width: '200px', height: '64px', margin: '0',
        padding: '16px 24px', borderWidth: '2px', borderStyle: 'solid',
        borderColor: '#1e3a8a', borderRadius: '8px', background: '#dbeafe', color: '#172554',
        fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '28px',
        textAlign: 'center',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'button-keyboard-surface', children: [{
          type: 'input', inputType: 'button', id: 'button-keyboard-control', value: 'Run action',
        }],
      }],
    },
  },
};
