import type { ParityFixture } from '../parity.types';

export const interactionFocusStyleFixture: ParityFixture = {
  id: 'interaction-focus-style',
  title: 'Authored focus-state paint',
  category: 'controls-states',
  expectedBehavior:
    'Focusing a control applies authored background and text-color paint and blurring it restores normal paint without changing geometry.',
  measurementIds: ['focus-style-target', 'focus-style-outside'],
  interactionIds: ['focus-style-target'],
  interactionEventTypes: ['focus', 'blur'],
  interactionSteps: [
    { id: 'focus-target', actions: [{ type: 'click', elementId: 'focus-style-target' }] },
    { id: 'blur-target', actions: [{ type: 'click', elementId: 'focus-style-outside' }] },
    { id: 'refocus-target', actions: [{ type: 'click', elementId: 'focus-style-target' }] },
    { id: 'reblur-target', actions: [{ type: 'click', elementId: 'focus-style-outside' }] },
  ],
  reference: {
    html: `<input id="focus-style-target" type="button" value="Ready"><div id="focus-style-outside"></div>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #focus-style-target { appearance:none; box-sizing:border-box; position:absolute; left:220px; top:220px; width:260px; height:64px; margin:0; padding:12px 16px; border:3px solid #1e3a8a; border-radius:0; outline:0; background:#dbeafe; color:#0f172a; font:400 18px/34px Arial,sans-serif; }
      #focus-style-target:focus { background:#93c5fd; color:#ffffff; }
      #focus-style-outside { position:absolute; left:540px; top:220px; width:80px; height:80px; background:#e2e8f0; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#focus-style-target', boxSizing: 'border-box', position: 'absolute',
        left: '220px', top: '220px', width: '260px', height: '64px', margin: '0',
        padding: '12px 16px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#1e3a8a',
        borderRadius: '0', background: '#dbeafe', color: '#0f172a', fontFamily: 'Arial, sans-serif',
        fontSize: '18px', fontWeight: '400', lineHeight: '34px',
      },
      { selector: '#focus-style-target:focus', background: '#93c5fd', color: '#ffffff' },
      {
        selector: '#focus-style-outside', position: 'absolute', left: '540px', top: '220px',
        width: '80px', height: '80px', background: '#e2e8f0',
      },
    ],
    root: { children: [
      { type: 'input', inputType: 'button', id: 'focus-style-target', value: 'Ready' },
      { type: 'div', id: 'focus-style-outside' },
    ] },
  },
};
