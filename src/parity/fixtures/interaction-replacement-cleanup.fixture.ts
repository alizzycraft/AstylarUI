import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const sharedStyles: SiteData['styles'] = [
  { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
  {
    selector: '#replacement-surface', boxSizing: 'border-box', position: 'absolute',
    left: '180px', top: '160px', width: '440px', height: '240px', padding: '0',
    background: '#e2e8f0',
  },
  {
    selector: '#volatile-control.replacement-text', boxSizing: 'border-box', position: 'absolute',
    left: '40px', top: '50px', width: '240px', height: '56px', margin: '0', padding: '12px 14px',
    borderWidth: '2px', borderStyle: 'solid', borderColor: '#334155', borderRadius: '0',
    background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif',
    fontSize: '16px', fontWeight: '400', lineHeight: '28px',
  },
  {
    selector: '#volatile-control.replacement-check', boxSizing: 'border-box', position: 'absolute',
    left: '40px', top: '60px', width: '36px', height: '36px', margin: '0', padding: '0',
    borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e3a8a', borderRadius: '5px',
    background: '#ffffff',
  },
  {
    selector: '#replacement-status', position: 'absolute', left: '40px', top: '150px',
    width: '340px', height: '32px', color: '#334155', fontFamily: 'Arial, sans-serif',
    fontSize: '18px', lineHeight: '24px',
  },
];

const createTextSiteData = (status: string): SiteData => ({
  styles: sharedStyles,
  root: { children: [{
    type: 'section', id: 'replacement-surface', children: [
      {
        type: 'input', inputType: 'text', id: 'volatile-control',
        class: 'replacement-text', value: 'Fresh',
      },
      { type: 'div', id: 'replacement-status', textContent: status },
    ],
  }] },
});

const createCheckboxSiteData = (): SiteData => ({
  styles: sharedStyles,
  root: { children: [{
    type: 'section', id: 'replacement-surface', children: [
      {
        type: 'input', inputType: 'checkbox', id: 'volatile-control',
        class: 'replacement-check', checked: false, ariaLabel: 'Replacement',
      },
      { type: 'div', id: 'replacement-status', textContent: 'Checkbox replacement' },
    ],
  }] },
});

const createRemovedSiteData = (): SiteData => ({
  styles: sharedStyles,
  root: { children: [{
    type: 'section', id: 'replacement-surface', children: [
      { type: 'div', id: 'replacement-status', textContent: 'Control removed' },
    ],
  }] },
});

export const interactionReplacementCleanupFixture: ParityFixture = {
  id: 'interaction-replacement-cleanup',
  title: 'Removed and incompatible control cleanup',
  category: 'forms-interactive',
  expectedBehavior:
    'An incompatibly replaced or removed focused control loses its live state and focus, unregisters cleanly, and does not resurrect stale state when the authored ID is later reused.',
  measurementIds: ['replacement-surface', 'volatile-control', 'replacement-status'],
  optionalMeasurementIds: ['volatile-control'],
  interactionIds: ['volatile-control'],
  semanticIds: ['volatile-control'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup', 'input', 'change',
  ],
  interactionSteps: [
    {
      id: 'edit-original-text',
      actions: [
        { type: 'click', elementId: 'volatile-control' },
        { type: 'type-text', text: 'X' },
      ],
    },
    { id: 'replace-with-checkbox', actions: [{ type: 'apply-update', stepIndex: 0 }] },
    { id: 'activate-replacement', actions: [{ type: 'click', elementId: 'volatile-control' }] },
    { id: 'remove-control', actions: [{ type: 'apply-update', stepIndex: 1 }] },
    { id: 'readd-text', actions: [{ type: 'apply-update', stepIndex: 2 }] },
    {
      id: 'edit-readded-text',
      actions: [
        { type: 'click', elementId: 'volatile-control' },
        { type: 'type-text', text: 'Y' },
      ],
    },
    { id: 'remove-control-again', actions: [{ type: 'apply-update', stepIndex: 1 }] },
    { id: 'readd-text-again', actions: [{ type: 'apply-update', stepIndex: 2 }] },
  ],
  reference: {
    html: `
      <section id="replacement-surface">
        <input id="volatile-control" class="replacement-text" type="text" value="Fresh">
        <div id="replacement-status">Original text control</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #replacement-surface { box-sizing:border-box; position:absolute; left:180px; top:160px; width:440px; height:240px; padding:0; background:#e2e8f0; }
      #volatile-control.replacement-text { appearance:none; box-sizing:border-box; position:absolute; left:40px; top:50px; width:240px; height:56px; margin:0; padding:12px 14px; border:2px solid #334155; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #volatile-control.replacement-check { appearance:none; box-sizing:border-box; position:absolute; left:40px; top:60px; width:36px; height:36px; margin:0; padding:0; border:2px solid #1e3a8a; border-radius:5px; outline:0; background:#fff; }
      #volatile-control.replacement-check:checked::after { content:''; display:block; width:22px; height:22px; margin:5px; background:#315fa5; }
      #volatile-control:focus { outline:3px solid #60a5fa; outline-offset:2px; }
      #replacement-status { position:absolute; left:40px; top:150px; width:340px; height:32px; color:#334155; font:400 18px/24px Arial,sans-serif; }
    `,
  },
  siteData: createTextSiteData('Original text control'),
  dynamicSteps: [{
    id: 'checkbox-replacement',
    referenceMutations: [{
      type: 'set-children', elementId: 'replacement-surface',
      html: '<input id="volatile-control" class="replacement-check" type="checkbox" aria-label="Replacement"><div id="replacement-status">Checkbox replacement</div>',
    }],
    siteData: createCheckboxSiteData(),
  }, {
    id: 'control-removed',
    referenceMutations: [{
      type: 'set-children', elementId: 'replacement-surface',
      html: '<div id="replacement-status">Control removed</div>',
    }],
    siteData: createRemovedSiteData(),
  }, {
    id: 'text-readded',
    referenceMutations: [{
      type: 'set-children', elementId: 'replacement-surface',
      html: '<input id="volatile-control" class="replacement-text" type="text" value="Fresh"><div id="replacement-status">Text re-added</div>',
    }],
    siteData: createTextSiteData('Text re-added'),
  }],
};
