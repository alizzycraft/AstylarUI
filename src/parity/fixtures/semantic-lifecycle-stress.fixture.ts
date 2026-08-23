import type { DOMElement } from '../../app/types/dom-element';
import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture, ParityInteractionStep } from '../parity.types';

const styles: SiteData['styles'] = [
  { selector: 'root', background: '#e0f2fe', fontFamily: 'Arial, sans-serif' },
  {
    selector: '#semantic-life-surface', boxSizing: 'border-box', position: 'absolute',
    left: '0', top: '0', width: '800px', height: '600px', padding: '48px', background: '#e0f2fe',
  },
  {
    selector: '#semantic-life-surface', mediaMaxWidth: '599px', width: '390px', height: '844px',
    padding: '24px',
  },
  {
    selector: '#semantic-life-title', boxSizing: 'border-box', width: '520px', height: '40px',
    margin: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px',
    fontWeight: '700', lineHeight: '40px',
  },
  { selector: '#semantic-life-title', mediaMaxWidth: '599px', width: '342px' },
  {
    selector: '#semantic-life-status', boxSizing: 'border-box', width: '520px', height: '40px',
    margin: '12px 0 0', padding: '8px 12px', background: '#dcfce7', color: '#166534',
    fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px',
  },
  { selector: '#semantic-life-status', mediaMaxWidth: '599px', width: '342px' },
  {
    selector: '#semantic-life-invoker', boxSizing: 'border-box', width: '164px', height: '44px',
    margin: '20px 0 0', padding: '10px 12px', borderWidth: '0', borderRadius: '0',
    background: '#0369a1', color: '#ffffff', fontFamily: 'Arial, sans-serif',
    fontSize: '14px', fontWeight: '700', lineHeight: '24px',
  },
  { selector: '#semantic-life-invoker:focus', background: '#f59e0b', color: '#111827' },
  {
    selector: '#semantic-life-content', boxSizing: 'border-box', width: '520px', height: '128px',
    margin: '20px 0 0', padding: '20px', background: '#ffffff',
  },
  { selector: '#semantic-life-content', mediaMaxWidth: '599px', width: '342px', height: '160px' },
  {
    selector: '#semantic-life-data-label', boxSizing: 'border-box', display: 'block', width: '480px',
    height: '24px', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '13px',
    fontWeight: '700', lineHeight: '24px',
  },
  { selector: '#semantic-life-data-label', mediaMaxWidth: '599px', width: '302px' },
  {
    selector: '#semantic-life-data', boxSizing: 'border-box', display: 'block', width: '480px',
    height: '44px', margin: '8px 0 0', padding: '9px 12px', borderWidth: '1px',
    borderStyle: 'solid', borderColor: '#64748b', borderRadius: '0', background: '#f8fafc',
    color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '24px',
  },
  { selector: '#semantic-life-data', mediaMaxWidth: '599px', width: '302px' },
  {
    selector: '#semantic-life-backdrop', position: 'fixed', left: '0', top: '0', width: '100vw',
    height: '100vh', zIndex: '20', background: '#0f172a', opacity: '.82',
  },
  {
    selector: '#semantic-life-dialog', boxSizing: 'border-box', display: 'flex',
    flexDirection: 'column', gap: '16px', position: 'fixed', left: '220px', right: 'auto',
    top: '170px', bottom: 'auto', width: '360px', height: '260px', margin: '0', padding: '24px',
    borderWidth: '0', zIndex: '21', background: '#ffffff', color: '#0f172a',
  },
  {
    selector: '#semantic-life-dialog', mediaMaxWidth: '599px', left: '25px', top: '240px',
    width: '340px',
  },
  {
    selector: '#semantic-life-dialog-title', boxSizing: 'border-box', width: '312px', height: '36px',
    margin: '0', fontFamily: 'Arial, sans-serif', fontSize: '22px', fontWeight: '700',
    lineHeight: '32px',
  },
  { selector: '#semantic-life-dialog-title', mediaMaxWidth: '599px', width: '292px' },
  {
    selector: '#semantic-life-dialog-copy', boxSizing: 'border-box', width: '312px', height: '72px',
    margin: '0', color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '15px',
    lineHeight: '24px',
  },
  { selector: '#semantic-life-dialog-copy', mediaMaxWidth: '599px', width: '292px' },
  {
    selector: '#semantic-life-dialog-action', boxSizing: 'border-box', alignSelf: 'flex-end',
    width: '128px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0',
    borderRadius: '0', background: '#0369a1', color: '#ffffff', fontFamily: 'Arial, sans-serif',
    fontSize: '14px', fontWeight: '700', lineHeight: '24px',
  },
  { selector: '#semantic-life-dialog-action:focus', background: '#f59e0b', color: '#111827' },
  {
    selector: '#semantic-life-backdrop.semantic-life-hidden',
    display: 'none',
  },
];

const dataChildren = (): DOMElement[] => [
  { type: 'label', id: 'semantic-life-data-label', for: 'semantic-life-data', textContent: 'Workspace token' },
  { type: 'input', inputType: 'text', id: 'semantic-life-data', value: 'stable-token', readonly: true },
];

const dialogChildren = (): DOMElement[] => [
  { type: 'h2', id: 'semantic-life-dialog-title', textContent: 'Apply lifecycle update?' },
  {
    type: 'p', id: 'semantic-life-dialog-copy',
    textContent: 'Escape closes this modal and restores the update control.',
  },
  {
    type: 'input', inputType: 'button', id: 'semantic-life-dialog-action',
    value: 'Review update', autofocus: true,
  },
];

function siteData(
  status = 'Lifecycle ready.',
  content: DOMElement[] = dataChildren(),
  dialogOpen = false,
): SiteData {
  const hidden = !dialogOpen;
  return {
    styles,
    root: { children: [{
      type: 'main', id: 'semantic-life-surface', children: [
        { type: 'h1', id: 'semantic-life-title', textContent: 'Semantic lifecycle' },
        {
          type: 'div', id: 'semantic-life-status', role: 'status', ariaLive: 'polite',
          ariaAtomic: true, textContent: status,
        },
        {
          type: 'input', inputType: 'button', id: 'semantic-life-invoker',
          value: 'Apply update', ariaLabel: 'Apply lifecycle update',
        },
        { type: 'section', id: 'semantic-life-content', ariaLabel: 'Lifecycle data', children: content },
        {
          type: 'div', id: 'semantic-life-backdrop', hidden,
          class: hidden ? 'semantic-life-hidden' : undefined,
        },
        {
          type: 'div', id: 'semantic-life-dialog-host',
          children: dialogOpen ? [{
            type: 'dialog', id: 'semantic-life-dialog', open: true, modal: true,
            ariaLabelledby: 'semantic-life-dialog-title', children: dialogChildren(),
          }] : [],
        },
      ],
    }] },
  };
}

const replacementChildren = (): DOMElement[] => [{
  type: 'p', id: 'semantic-life-data', textContent: 'Semantic data node replaced.',
}];

const cycle = (number: number): ParityInteractionStep[] => [
  {
    id: `semantic-cycle-${number}-focus-invoker`,
    actions: [{ type: 'semantic-focus', elementId: 'semantic-life-invoker' }],
  },
  {
    id: `semantic-cycle-${number}-activate-invoker`,
    actions: [{ type: 'semantic-activate', elementId: 'semantic-life-invoker' }],
  },
  {
    id: `semantic-cycle-${number}-open-modal-mobile`,
    actions: [{ type: 'apply-update', stepIndex: 0, viewportId: 'mobile' }],
  },
  {
    id: `semantic-cycle-${number}-contain-modal-focus`,
    actions: [{ type: 'press-key', key: 'Tab' }],
  },
  {
    id: `semantic-cycle-${number}-dismiss-modal`,
    actions: [{ type: 'press-key', key: 'Escape' }],
  },
  {
    id: `semantic-cycle-${number}-publish-status`,
    actions: [{ type: 'apply-update', stepIndex: 1 }],
  },
  {
    id: `semantic-cycle-${number}-replace-data`,
    actions: [{ type: 'apply-update', stepIndex: 2 }],
  },
  {
    id: `semantic-cycle-${number}-restore-desktop`,
    actions: [{ type: 'apply-update', stepIndex: 3, viewportId: 'desktop' }],
  },
];

export const semanticLifecycleStressFixture: ParityFixture = {
  id: 'semantic-lifecycle-stress',
  title: 'Repeated semantic and modal lifecycle',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Three identical semantic focus/activation, responsive modal open/contain/dismiss, status announcement, incompatible data replacement, restoration, and final disposal cycles remain browser-exact while semantic nodes, listeners, observers, registries, and Babylon resources plateau and clean up.',
  measurementIds: [
    'semantic-life-surface', 'semantic-life-title', 'semantic-life-status',
    'semantic-life-invoker', 'semantic-life-content', 'semantic-life-data',
  ],
  interactionIds: ['semantic-life-invoker'],
  semanticIds: [
    'semantic-life-status', 'semantic-life-invoker',
    'semantic-life-content', 'semantic-life-data', 'semantic-life-dialog',
    'semantic-life-dialog-title', 'semantic-life-dialog-action',
  ],
  announcementIds: ['semantic-life-status'],
  modalDialogIds: ['semantic-life-dialog'],
  interactionEventTypes: ['focus', 'blur', 'click', 'keydown', 'keyup'],
  interactionSteps: [...cycle(1), ...cycle(2), ...cycle(3)],
  interactionCycleLength: 8,
  reference: {
    html: `
      <main id="semantic-life-surface">
        <h1 id="semantic-life-title">Semantic lifecycle</h1>
        <div id="semantic-life-status" role="status" aria-live="polite" aria-atomic="true">Lifecycle ready.</div>
        <input id="semantic-life-invoker" type="button" value="Apply update" aria-label="Apply lifecycle update">
        <section id="semantic-life-content" aria-label="Lifecycle data">
          <label id="semantic-life-data-label" for="semantic-life-data">Workspace token</label>
          <input id="semantic-life-data" type="text" value="stable-token" readonly>
        </section>
        <div id="semantic-life-backdrop" hidden></div>
        <div id="semantic-life-dialog-host"></div>
      </main>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#e0f2fe; font-family:Arial,sans-serif; }
      #semantic-life-surface { box-sizing:border-box; position:absolute; left:0; top:0; width:800px; height:600px; padding:48px; background:#e0f2fe; }
      #semantic-life-title { box-sizing:border-box; width:520px; height:40px; margin:0; color:#0f172a; font:700 24px/40px Arial,sans-serif; }
      #semantic-life-status { box-sizing:border-box; width:520px; height:40px; margin:12px 0 0; padding:8px 12px; background:#dcfce7; color:#166534; font:700 14px/24px Arial,sans-serif; }
      #semantic-life-invoker { appearance:none; box-sizing:border-box; width:164px; height:44px; margin:20px 0 0; padding:10px 12px; border:0; border-radius:0; outline:0; background:#0369a1; color:#fff; font:700 14px/24px Arial,sans-serif; }
      #semantic-life-invoker:focus { background:#f59e0b; color:#111827; }
      #semantic-life-content { box-sizing:border-box; width:520px; height:128px; margin:20px 0 0; padding:20px; background:#fff; }
      #semantic-life-data-label { box-sizing:border-box; display:block; width:480px; height:24px; color:#334155; font:700 13px/24px Arial,sans-serif; }
      #semantic-life-data { appearance:none; box-sizing:border-box; display:block; width:480px; height:44px; margin:8px 0 0; padding:9px 12px; border:1px solid #64748b; border-radius:0; background:#f8fafc; color:#0f172a; font:400 14px/24px Arial,sans-serif; }
      #semantic-life-backdrop { position:fixed; left:0; top:0; width:100vw; height:100vh; z-index:20; background:#0f172a; opacity:.82; }
      #semantic-life-dialog { box-sizing:border-box; flex-direction:column; gap:16px; position:fixed; left:220px; right:auto; top:170px; bottom:auto; width:360px; height:260px; margin:0; padding:24px; border:0; z-index:21; background:#fff; color:#0f172a; }
      #semantic-life-dialog[open] { display:flex; }
      #semantic-life-dialog::backdrop { background:transparent; }
      #semantic-life-dialog-title { box-sizing:border-box; width:312px; height:36px; margin:0; font:700 22px/32px Arial,sans-serif; }
      #semantic-life-dialog-copy { box-sizing:border-box; width:312px; height:72px; margin:0; color:#475569; font:400 15px/24px Arial,sans-serif; }
      #semantic-life-dialog-action { appearance:none; box-sizing:border-box; align-self:flex-end; width:128px; height:44px; margin:0; padding:10px 12px; border:0; border-radius:0; outline:0; background:#0369a1; color:#fff; font:700 14px/24px Arial,sans-serif; }
      #semantic-life-dialog-action:focus { background:#f59e0b; color:#111827; }
      @media (max-width:599px) {
        #semantic-life-surface { width:390px; height:844px; padding:24px; }
        #semantic-life-title,#semantic-life-status { width:342px; }
        #semantic-life-content { width:342px; height:160px; }
        #semantic-life-data-label,#semantic-life-data { width:302px; }
        #semantic-life-dialog { left:25px; top:240px; width:340px; }
        #semantic-life-dialog-title,#semantic-life-dialog-copy { width:292px; }
      }
    `,
  },
  siteData: siteData(),
  dynamicSteps: [
    {
      id: 'open-modal-mobile',
      referenceMutations: [
        { type: 'set-attribute', elementId: 'semantic-life-backdrop', name: 'hidden' },
        {
          type: 'set-children', elementId: 'semantic-life-dialog-host',
          html: '<dialog id="semantic-life-dialog" aria-labelledby="semantic-life-dialog-title"><h2 id="semantic-life-dialog-title">Apply lifecycle update?</h2><p id="semantic-life-dialog-copy">Escape closes this modal and restores the update control.</p><input id="semantic-life-dialog-action" type="button" value="Review update" autofocus></dialog>',
        },
      ],
      siteData: siteData('Lifecycle ready.', dataChildren(), true),
    },
    {
      id: 'publish-status-and-close-modal',
      referenceMutations: [
        { type: 'set-attribute', elementId: 'semantic-life-backdrop', name: 'hidden', value: '' },
        { type: 'set-children', elementId: 'semantic-life-dialog-host', html: '' },
        { type: 'set-text', elementId: 'semantic-life-status', textContent: 'Lifecycle update saved.' },
      ],
      siteData: siteData('Lifecycle update saved.'),
    },
    {
      id: 'replace-semantic-data',
      referenceMutations: [{
        type: 'set-children', elementId: 'semantic-life-content',
        html: '<p id="semantic-life-data">Semantic data node replaced.</p>',
      }],
      siteData: siteData('Lifecycle update saved.', replacementChildren()),
    },
    {
      id: 'restore-desktop-state',
      referenceMutations: [
        {
          type: 'set-children', elementId: 'semantic-life-content',
          html: '<label id="semantic-life-data-label" for="semantic-life-data">Workspace token</label><input id="semantic-life-data" type="text" value="stable-token" readonly>',
        },
        { type: 'set-text', elementId: 'semantic-life-status', textContent: 'Lifecycle ready.' },
      ],
      siteData: siteData(),
    },
  ],
};
