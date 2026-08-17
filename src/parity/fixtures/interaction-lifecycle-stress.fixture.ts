import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture, ParityInteractionStep } from '../parity.types';

const createStressSiteData = (status: string): SiteData => ({
  styles: [
    { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
    {
      selector: '#stress-shell', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      gap: '12px', position: 'absolute', left: '100px', top: '100px', width: '600px',
      height: '300px', padding: '24px', background: '#e2e8f0',
    },
    {
      selector: '#stress-shell', mediaMaxWidth: '650px', left: '20px', top: '70px',
      width: '350px', height: '360px',
    },
    {
      selector: '#stress-status', width: '552px', height: '32px', margin: '0', color: '#0f172a',
      fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '32px',
    },
    { selector: '#stress-status', mediaMaxWidth: '650px', width: '302px' },
    {
      selector: '#stress-form', display: 'flex', flexDirection: 'column', gap: '10px',
      width: '552px', height: '210px',
    },
    { selector: '#stress-form', mediaMaxWidth: '650px', width: '302px', height: '270px' },
    {
      selector: '.stress-control', boxSizing: 'border-box', width: '260px', height: '44px',
      margin: '0', padding: '8px 10px', borderWidth: '1px', borderStyle: 'solid',
      borderColor: '#64748b', borderRadius: '0', background: '#ffffff', color: '#0f172a',
      fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '26px',
    },
    { selector: '.stress-control:focus', background: '#dbeafe' },
    {
      selector: '#stress-check-row', display: 'flex', alignItems: 'center', gap: '10px',
      width: '300px', height: '34px',
    },
    {
      selector: '#stress-check', boxSizing: 'border-box', width: '24px', height: '24px',
      margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid',
      borderColor: '#1d4ed8', borderRadius: '0', background: '#ffffff',
    },
    { selector: '#stress-check:checked', background: '#2563eb' },
    {
      selector: '#stress-check-label', width: '220px', height: '30px', color: '#334155',
      fontFamily: 'Arial, sans-serif', fontSize: '13px', lineHeight: '30px',
    },
    {
      selector: '#stress-reset', boxSizing: 'border-box', width: '120px', height: '44px',
      margin: '0', padding: '8px 12px', borderWidth: '0', borderRadius: '0',
      background: '#334155', color: '#ffffff', fontFamily: 'Arial, sans-serif',
      fontSize: '13px', fontWeight: '700', lineHeight: '28px', textAlign: 'center',
    },
    { selector: '#stress-reset:focus', background: '#0f172a' },
  ],
  root: {
    children: [{
      type: 'section', id: 'stress-shell', children: [
        { type: 'p', id: 'stress-status', textContent: status },
        {
          type: 'form', id: 'stress-form', children: [
            {
              type: 'input', inputType: 'text', id: 'stress-text', class: 'stress-control',
              value: 'Seed',
            },
            {
              type: 'select', id: 'stress-select', class: 'stress-control', value: 'alpha',
              options: [
                { value: 'alpha', label: 'Alpha' },
                { value: 'beta', label: 'Beta' },
              ],
            },
            {
              type: 'div', id: 'stress-check-row', children: [
                { type: 'input', inputType: 'checkbox', id: 'stress-check' },
                {
                  type: 'label', id: 'stress-check-label', for: 'stress-check',
                  textContent: 'Enable cycle checks',
                },
              ],
            },
            { type: 'input', inputType: 'reset', id: 'stress-reset', value: 'Reset cycle' },
          ],
        },
      ],
    }],
  },
});

const cycle = (cycleNumber: number): ParityInteractionStep[] => [
  { id: `cycle-${cycleNumber}-focus-text`, actions: [{ type: 'click', elementId: 'stress-text' }] },
  {
    id: `cycle-${cycleNumber}-edit-text`,
    actions: [{ type: 'press-key', key: 'End' }, { type: 'type-text', text: 'X' }],
  },
  { id: `cycle-${cycleNumber}-tab-select`, actions: [{ type: 'press-key', key: 'Tab' }] },
  { id: `cycle-${cycleNumber}-choose-beta`, actions: [{ type: 'press-key', key: 'ArrowDown' }] },
  {
    id: `cycle-${cycleNumber}-toggle-check`,
    actions: [{ type: 'click', elementId: 'stress-check-label' }],
  },
  { id: `cycle-${cycleNumber}-reset`, actions: [{ type: 'click', elementId: 'stress-reset' }] },
  {
    id: `cycle-${cycleNumber}-mobile-update`,
    actions: [{ type: 'apply-update', stepIndex: 0, viewportId: 'mobile' }],
  },
  {
    id: `cycle-${cycleNumber}-desktop-update`,
    actions: [{ type: 'apply-update', stepIndex: 1, viewportId: 'desktop' }],
  },
];

export const interactionLifecycleStressFixture: ParityFixture = {
  id: 'interaction-lifecycle-stress',
  title: 'Repeated interactive update lifecycle',
  category: 'forms-interactive',
  expectedBehavior:
    'Three equivalent text, select, checkbox, reset, update, and responsive cycles keep browser-equivalent state while resources and registrations plateau and final disposal cleans the scene.',
  measurementIds: [
    'stress-shell', 'stress-status', 'stress-form', 'stress-text', 'stress-select',
    'stress-check-row', 'stress-check', 'stress-check-label', 'stress-reset',
  ],
  interactionIds: [
    'stress-form', 'stress-text', 'stress-select', 'stress-check-label',
    'stress-check', 'stress-reset',
  ],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup',
    'input', 'change', 'reset',
  ],
  interactionSteps: [...cycle(1), ...cycle(2), ...cycle(3)],
  interactionCycleLength: 8,
  reference: {
    html: `
      <section id="stress-shell">
        <p id="stress-status">Desktop cycle ready</p>
        <form id="stress-form">
          <input id="stress-text" class="stress-control" type="text" value="Seed">
          <select id="stress-select" class="stress-control"><option value="alpha" selected>Alpha</option><option value="beta">Beta</option></select>
          <div id="stress-check-row"><input id="stress-check" type="checkbox"><label id="stress-check-label" for="stress-check">Enable cycle checks</label></div>
          <input id="stress-reset" type="reset" value="Reset cycle">
        </form>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #stress-shell { box-sizing:border-box; display:flex; flex-direction:column; gap:12px; position:absolute; left:100px; top:100px; width:600px; height:300px; padding:24px; background:#e2e8f0; }
      #stress-status { width:552px; height:32px; margin:0; color:#0f172a; font:700 16px/32px Arial,sans-serif; }
      #stress-form { display:flex; flex-direction:column; gap:10px; width:552px; height:210px; }
      .stress-control { appearance:none; box-sizing:border-box; width:260px; height:44px; margin:0; padding:8px 10px; border:1px solid #64748b; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 14px/26px Arial,sans-serif; }
      .stress-control:focus { background:#dbeafe; }
      #stress-check-row { display:flex; align-items:center; gap:10px; width:300px; height:34px; }
      #stress-check { appearance:none; box-sizing:border-box; width:24px; height:24px; margin:0; padding:0; border:2px solid #1d4ed8; border-radius:0; background:#fff; }
      #stress-check:checked { background:#2563eb; }
      #stress-check-label { width:220px; height:30px; color:#334155; font:400 13px/30px Arial,sans-serif; }
      #stress-reset { appearance:none; box-sizing:border-box; width:120px; height:44px; margin:0; padding:8px 12px; border:0; border-radius:0; outline:0; background:#334155; color:#fff; font:700 13px/28px Arial,sans-serif; text-align:center; }
      #stress-reset:focus { background:#0f172a; }
      @media (max-width:650px) { #stress-shell { left:20px; top:70px; width:350px; height:360px; } #stress-status { width:302px; } #stress-form { width:302px; height:270px; } }
    `,
  },
  siteData: createStressSiteData('Desktop cycle ready'),
  dynamicSteps: [
    {
      id: 'mobile-cycle',
      referenceMutations: [
        { type: 'set-text', elementId: 'stress-status', textContent: 'Mobile cycle ready' },
      ],
      siteData: createStressSiteData('Mobile cycle ready'),
    },
    {
      id: 'desktop-cycle',
      referenceMutations: [
        { type: 'set-text', elementId: 'stress-status', textContent: 'Desktop cycle ready' },
      ],
      siteData: createStressSiteData('Desktop cycle ready'),
    },
  ],
};
