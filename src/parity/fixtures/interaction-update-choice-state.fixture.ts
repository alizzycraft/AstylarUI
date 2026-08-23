import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const createSiteData = (status: string): SiteData => ({
  styles: [
    { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
    {
      selector: '#choice-state-surface', boxSizing: 'border-box', position: 'absolute',
      left: '150px', top: '120px', width: '500px', height: '300px', padding: '0',
      background: '#e2e8f0',
    },
    {
      selector: '.choice-state-box', boxSizing: 'border-box', position: 'absolute',
      top: '36px', height: '48px', margin: '0', padding: '8px 12px', borderWidth: '2px',
      borderStyle: 'solid', borderColor: '#334155', borderRadius: '0', background: '#ffffff',
      color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400',
      lineHeight: '28px',
    },
    { selector: '#choice-state-start', left: '32px', width: '80px', textAlign: 'center' },
    { selector: '#choice-state-select', left: '132px', width: '180px' },
    {
      selector: '.choice-state-check', boxSizing: 'border-box', position: 'absolute',
      width: '32px', height: '32px', margin: '0', padding: '0', borderWidth: '2px',
      borderStyle: 'solid', borderColor: '#1e3a8a', background: '#ffffff',
    },
    { selector: '#choice-state-checkbox', left: '340px', top: '44px', borderRadius: '5px' },
    { selector: '#choice-state-radio-alpha', left: '132px', top: '136px', borderRadius: '50%' },
    { selector: '#choice-state-radio-beta', left: '200px', top: '136px', borderRadius: '50%' },
    {
      selector: '#choice-state-status', position: 'absolute', left: '32px', top: '224px',
      width: '400px', height: '36px', color: '#334155', fontFamily: 'Arial, sans-serif',
      fontSize: '18px', lineHeight: '24px',
    },
  ],
  root: { children: [{
    type: 'section', id: 'choice-state-surface', children: [
      {
        type: 'input', inputType: 'button', id: 'choice-state-start',
        class: 'choice-state-box', value: 'Start',
      },
      {
        type: 'select', id: 'choice-state-select', class: 'choice-state-box', value: 'alpha',
        options: [
          { value: 'alpha', label: 'Alpha option' },
          { value: 'beta', label: 'Beta option' },
          { value: 'gamma', label: 'Gamma option' },
        ],
      },
      {
        type: 'input', inputType: 'checkbox', id: 'choice-state-checkbox',
        class: 'choice-state-check', checked: false,
      },
      {
        type: 'input', inputType: 'radio', id: 'choice-state-radio-alpha',
        class: 'choice-state-check', name: 'choice-state-channel', value: 'alpha', checked: true,
      },
      {
        type: 'input', inputType: 'radio', id: 'choice-state-radio-beta',
        class: 'choice-state-check', name: 'choice-state-channel', value: 'beta', checked: false,
      },
      { type: 'div', id: 'choice-state-status', textContent: status },
    ],
  }] },
});

export const interactionUpdateChoiceStateFixture: ParityFixture = {
  id: 'interaction-update-choice-state',
  title: 'Choice-control state across application update',
  category: 'forms-interactive',
  expectedBehavior:
    'Stable compatible checkbox, radio, and select controls retain their live checked, selected, and focused state across unrelated updates and responsive reflow.',
  measurementIds: [
    'choice-state-surface', 'choice-state-start', 'choice-state-select', 'choice-state-checkbox',
    'choice-state-radio-alpha', 'choice-state-radio-beta', 'choice-state-status',
  ],
  interactionIds: [
    'choice-state-start', 'choice-state-select', 'choice-state-checkbox',
    'choice-state-radio-alpha', 'choice-state-radio-beta',
  ],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur',
    'keydown', 'keyup', 'input', 'change',
  ],
  interactionSteps: [
    { id: 'focus-start', actions: [{ type: 'click', elementId: 'choice-state-start' }] },
    { id: 'tab-to-select', actions: [{ type: 'press-key', key: 'Tab' }] },
    { id: 'select-beta', actions: [{ type: 'press-key', key: 'ArrowDown' }] },
    { id: 'check-checkbox', actions: [{ type: 'click', elementId: 'choice-state-checkbox' }] },
    { id: 'select-radio-beta', actions: [{ type: 'click', elementId: 'choice-state-radio-beta' }] },
    { id: 'update-sibling', actions: [{ type: 'apply-update', stepIndex: 0 }] },
    {
      id: 'resize-and-update-sibling-again',
      actions: [{ type: 'apply-update', stepIndex: 1, viewportId: 'tablet' }],
    },
  ],
  reference: {
    html: `
      <section id="choice-state-surface">
        <input id="choice-state-start" class="choice-state-box" type="button" value="Start">
        <select id="choice-state-select" class="choice-state-box">
          <option value="alpha" selected>Alpha option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
        </select>
        <input id="choice-state-checkbox" class="choice-state-check" type="checkbox" aria-label="Enabled">
        <input id="choice-state-radio-alpha" class="choice-state-check" name="choice-state-channel" type="radio" value="alpha" checked aria-label="Alpha">
        <input id="choice-state-radio-beta" class="choice-state-check" name="choice-state-channel" type="radio" value="beta" aria-label="Beta">
        <div id="choice-state-status">Initial layout</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #choice-state-surface { box-sizing:border-box; position:absolute; left:150px; top:120px; width:500px; height:300px; padding:0; background:#e2e8f0; }
      .choice-state-box { appearance:none; box-sizing:border-box; position:absolute; top:36px; height:48px; margin:0; padding:8px 12px; border:2px solid #334155; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #choice-state-start { left:32px; width:80px; text-align:center; }
      #choice-state-select { left:132px; width:180px; }
      .choice-state-check { appearance:none; box-sizing:border-box; position:absolute; width:32px; height:32px; margin:0; padding:0; border:2px solid #1e3a8a; outline:0; background:#fff; }
      #choice-state-checkbox { left:340px; top:44px; border-radius:5px; }
      #choice-state-radio-alpha { left:132px; top:136px; border-radius:50%; }
      #choice-state-radio-beta { left:200px; top:136px; border-radius:50%; }
      #choice-state-checkbox:checked::after { content:''; display:block; width:19.2px; height:19.2px; margin:4.4px; background:#315fa5; }
      #choice-state-radio-alpha:checked::after, #choice-state-radio-beta:checked::after { content:''; display:block; width:19.2px; height:19.2px; margin:4.4px; border-radius:50%; background:#315fa5; }
      .choice-state-box:focus, .choice-state-check:focus { outline:3px solid #60a5fa; outline-offset:2px; }
      #choice-state-status { position:absolute; left:32px; top:224px; width:400px; height:36px; color:#334155; font:400 18px/24px Arial,sans-serif; }
    `,
  },
  siteData: createSiteData('Initial layout'),
  dynamicSteps: [{
    id: 'updated-sibling',
    referenceMutations: [{
      type: 'set-text', elementId: 'choice-state-status', textContent: 'Updated layout',
    }],
    siteData: createSiteData('Updated layout'),
  }, {
    id: 'final-sibling',
    referenceMutations: [{
      type: 'set-text', elementId: 'choice-state-status', textContent: 'Final layout',
    }],
    siteData: createSiteData('Final layout'),
  }],
};
