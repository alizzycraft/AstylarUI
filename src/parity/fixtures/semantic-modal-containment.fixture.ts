import type { ParityFixture } from '../parity.types';

export const semanticModalContainmentFixture: ParityFixture = {
  id: 'semantic-modal-containment',
  title: 'Semantic modal containment',
  category: 'accessibility-semantics',
  expectedBehavior:
    'An authored modal dialog takes visual and interaction priority over the background, exposes browser modality, receives deterministic initial focus, contains forward and reverse Tab navigation, and makes background controls inert.',
  measurementIds: [
    'modal-containment-background', 'modal-containment-background-button',
    'modal-containment-high-layer', 'modal-containment-dialog',
    'modal-containment-title', 'modal-containment-copy',
    'modal-containment-primary', 'modal-containment-secondary',
  ],
  interactionIds: [
    'modal-containment-background-button',
    'modal-containment-primary', 'modal-containment-secondary',
  ],
  semanticIds: [
    'modal-containment-dialog', 'modal-containment-title',
    'modal-containment-primary', 'modal-containment-secondary',
    'modal-containment-background-button',
  ],
  modalDialogIds: ['modal-containment-dialog'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup'],
  interactionSteps: [
    { id: 'tab-to-secondary', actions: [{ type: 'press-key', key: 'Tab' }] },
    { id: 'tab-wraps-to-primary', actions: [{ type: 'press-key', key: 'Tab' }] },
    { id: 'reverse-tab-wraps-to-secondary', actions: [{ type: 'press-key', key: 'Shift+Tab' }] },
    { id: 'background-pointer-is-inert', actions: [{ type: 'click', elementId: 'modal-containment-background-button' }] },
    { id: 'background-semantic-focus-is-inert', actions: [{ type: 'semantic-focus', elementId: 'modal-containment-background-button' }] },
  ],
  reference: {
    html: `
      <section id="modal-containment-background">
        <input id="modal-containment-background-button" type="button" value="Background action">
      </section>
      <div id="modal-containment-high-layer"></div>
      <dialog id="modal-containment-dialog" aria-labelledby="modal-containment-title" aria-describedby="modal-containment-copy">
        <h2 id="modal-containment-title">Publish workspace?</h2>
        <p id="modal-containment-copy">Review the final settings before publishing this workspace.</p>
        <div id="modal-containment-actions">
          <input id="modal-containment-primary" type="button" value="Keep editing" autofocus>
          <input id="modal-containment-secondary" type="button" value="Publish">
        </div>
      </dialog>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#dbeafe; font-family:Arial,sans-serif; }
      #modal-containment-background { box-sizing:border-box; position:absolute; left:40px; top:40px; width:720px; height:520px; padding:24px; background:#bfdbfe; }
      #modal-containment-background-button { appearance:none; box-sizing:border-box; width:160px; height:44px; margin:0; padding:10px 12px; border:0; border-radius:0; background:#1d4ed8; color:#fff; font:700 14px/24px Arial,sans-serif; }
      #modal-containment-high-layer { box-sizing:border-box; position:absolute; left:180px; top:130px; width:440px; height:340px; z-index:3; background:#be123c; }
      #modal-containment-dialog { box-sizing:border-box; flex-direction:column; gap:16px; position:fixed; left:220px; top:170px; width:360px; height:260px; margin:0; padding:24px; border:0; z-index:1; background:#fff; color:#0f172a; }
      #modal-containment-dialog[open] { display:flex; }
      #modal-containment-dialog::backdrop { background:transparent; }
      #modal-containment-title { box-sizing:border-box; width:312px; height:36px; margin:0; padding:2px 0; color:#0f172a; font:700 22px/32px Arial,sans-serif; }
      #modal-containment-copy { box-sizing:border-box; width:312px; height:72px; margin:0; padding:0; color:#475569; font:400 15px/24px Arial,sans-serif; }
      #modal-containment-actions { box-sizing:border-box; display:flex; justify-content:flex-end; gap:10px; width:312px; height:44px; }
      #modal-containment-primary, #modal-containment-secondary { appearance:none; box-sizing:border-box; height:44px; margin:0; padding:10px 12px; border:0; border-radius:0; font:700 14px/24px Arial,sans-serif; }
      #modal-containment-primary { width:126px; background:#e2e8f0; color:#334155; }
      #modal-containment-secondary { width:92px; background:#2563eb; color:#fff; }
      #modal-containment-primary:focus, #modal-containment-secondary:focus { outline:0; background:#f59e0b; color:#111827; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#dbeafe', fontFamily: 'Arial, sans-serif' },
      { selector: '#modal-containment-background', boxSizing: 'border-box', position: 'absolute', left: '40px', top: '40px', width: '720px', height: '520px', padding: '24px', background: '#bfdbfe' },
      { selector: '#modal-containment-background-button', boxSizing: 'border-box', width: '160px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0', borderRadius: '0', background: '#1d4ed8', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px' },
      { selector: '#modal-containment-high-layer', boxSizing: 'border-box', position: 'absolute', left: '180px', top: '130px', width: '440px', height: '340px', zIndex: '3', background: '#be123c' },
      { selector: '#modal-containment-dialog', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', position: 'fixed', left: '220px', top: '170px', width: '360px', height: '260px', margin: '0', padding: '24px', borderWidth: '0', zIndex: '1', background: '#ffffff', color: '#0f172a' },
      { selector: '#modal-containment-title', boxSizing: 'border-box', width: '312px', height: '36px', margin: '0', padding: '2px 0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '22px', fontWeight: '700', lineHeight: '32px' },
      { selector: '#modal-containment-copy', boxSizing: 'border-box', width: '312px', height: '72px', margin: '0', padding: '0', color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '24px' },
      { selector: '#modal-containment-actions', boxSizing: 'border-box', display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '312px', height: '44px' },
      { selector: '#modal-containment-primary, #modal-containment-secondary', boxSizing: 'border-box', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0', borderRadius: '0', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px' },
      { selector: '#modal-containment-primary', width: '126px', background: '#e2e8f0', color: '#334155' },
      { selector: '#modal-containment-secondary', width: '92px', background: '#2563eb', color: '#ffffff' },
      { selector: '#modal-containment-primary:focus, #modal-containment-secondary:focus', background: '#f59e0b', color: '#111827' },
    ],
    root: { children: [
      { type: 'section', id: 'modal-containment-background', children: [
        { type: 'input', inputType: 'button', id: 'modal-containment-background-button', value: 'Background action' },
      ] },
      { type: 'div', id: 'modal-containment-high-layer' },
      {
        type: 'dialog', id: 'modal-containment-dialog', open: true, modal: true,
        ariaLabelledby: 'modal-containment-title', ariaDescribedby: 'modal-containment-copy',
        children: [
          { type: 'h2', id: 'modal-containment-title', textContent: 'Publish workspace?' },
          { type: 'p', id: 'modal-containment-copy', textContent: 'Review the final settings before publishing this workspace.' },
          { type: 'div', id: 'modal-containment-actions', children: [
            { type: 'input', inputType: 'button', id: 'modal-containment-primary', value: 'Keep editing', autofocus: true },
            { type: 'input', inputType: 'button', id: 'modal-containment-secondary', value: 'Publish' },
          ] },
        ],
      },
    ] },
  },
};
