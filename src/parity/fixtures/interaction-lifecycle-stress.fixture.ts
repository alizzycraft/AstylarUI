import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture, ParityInteractionStep } from '../parity.types';

const styles: SiteData['styles'] = [
  { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
  {
    selector: '#stress-shell', boxSizing: 'border-box', position: 'absolute', left: '120px',
    top: '80px', width: '560px', height: '430px', padding: '20px', background: '#e2e8f0',
  },
  {
    selector: '#stress-shell', mediaMaxWidth: '650px', left: '15px', top: '60px',
    width: '360px', height: '520px', padding: '15px',
  },
  {
    selector: '#stress-status', position: 'absolute', left: '20px', top: '20px', width: '520px',
    height: '32px', margin: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif',
    fontSize: '16px', fontWeight: '700', lineHeight: '32px',
  },
  { selector: '#stress-status', mediaMaxWidth: '650px', left: '15px', top: '15px', width: '330px' },
  {
    selector: '#stress-scroll', boxSizing: 'border-box', position: 'absolute', left: '20px',
    top: '72px', width: '240px', height: '110px', overflow: 'auto', borderWidth: '1px',
    borderStyle: 'solid', borderColor: '#64748b', background: '#ffffff',
  },
  {
    selector: '#stress-scroll', mediaMaxWidth: '650px', left: '15px', top: '65px',
    width: '330px', height: '120px',
  },
  { selector: '#stress-scroll-content', width: '238px', height: '220px', background: '#f8fafc' },
  { selector: '#stress-scroll-content', mediaMaxWidth: '650px', width: '328px' },
  {
    selector: '.stress-line', boxSizing: 'border-box', width: '238px', height: '40px', margin: '0',
    padding: '0 12px', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px',
    lineHeight: '40px',
  },
  { selector: '.stress-line', mediaMaxWidth: '650px', width: '328px' },
  {
    selector: '.stress-control', boxSizing: 'border-box', position: 'absolute', left: '280px',
    width: '240px', height: '56px', margin: '0', padding: '12px 16px', borderWidth: '2px',
    borderStyle: 'solid', borderColor: '#475569', borderRadius: '0', background: '#ffffff',
    color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontWeight: '400',
    lineHeight: '28px',
  },
  {
    selector: '.stress-control', mediaMaxWidth: '650px', left: '15px', width: '330px',
  },
  {
    selector: '#stress-text:focus, #stress-select:focus',
    borderColor: '#2563eb', background: '#dbeafe',
  },
  { selector: '#stress-text', top: '72px' },
  { selector: '#stress-text', mediaMaxWidth: '650px', top: '215px' },
  { selector: '#stress-select', top: '142px' },
  { selector: '#stress-select', mediaMaxWidth: '650px', top: '285px' },
  {
    selector: '#stress-note', position: 'absolute', left: '20px', top: '220px', width: '500px',
    height: '90px', margin: '0', padding: '12px', boxSizing: 'border-box', background: '#cbd5e1',
    color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '22px',
  },
  {
    selector: '#stress-note', mediaMaxWidth: '650px', left: '15px', top: '370px',
    width: '330px', height: '100px',
  },
];

const scrollChildren = () => [
  { type: 'p' as const, id: 'stress-line-1', class: 'stress-line', textContent: 'Row one' },
  { type: 'p' as const, id: 'stress-line-2', class: 'stress-line', textContent: 'Row two' },
  { type: 'p' as const, id: 'stress-line-3', class: 'stress-line', textContent: 'Row three' },
  { type: 'p' as const, id: 'stress-line-4', class: 'stress-line', textContent: 'Row four' },
  { type: 'p' as const, id: 'stress-line-5', class: 'stress-line', textContent: 'Row five' },
];

const interactiveChildren = (status: string) => [
  { type: 'p' as const, id: 'stress-status', textContent: status },
  {
    type: 'div' as const, id: 'stress-scroll', children: [{
      type: 'div' as const, id: 'stress-scroll-content', children: scrollChildren(),
    }],
  },
  {
    type: 'input' as const, inputType: 'text' as const, id: 'stress-text',
    class: 'stress-control', value: 'abcdefghij',
  },
  {
    type: 'select' as const, id: 'stress-select', class: 'stress-control', value: 'alpha',
    options: [
      { value: 'alpha', label: 'Alpha option' },
      { value: 'beta', label: 'Beta option' },
    ],
  },
  {
    type: 'p' as const, id: 'stress-note',
    textContent: 'IDs return fresh after replacement.',
  },
];

const createInteractiveSiteData = (status: string): SiteData => ({
  styles,
  root: { children: [{
    type: 'section', id: 'stress-shell', children: interactiveChildren(status),
  }] },
});

const createReplacedSiteData = (): SiteData => ({
  styles,
  root: { children: [{
    type: 'section', id: 'stress-shell', children: [{
      type: 'p', id: 'stress-status', textContent: 'Interactive subtree replaced',
    }, {
      type: 'p', id: 'stress-note',
      textContent: 'Interactive state cleared.',
    }],
  }] },
});

const interactiveReferenceHtml = (status: string): string => `
  <p id="stress-status">${status}</p>
  <div id="stress-scroll"><div id="stress-scroll-content">
    <p id="stress-line-1" class="stress-line">Row one</p>
    <p id="stress-line-2" class="stress-line">Row two</p>
    <p id="stress-line-3" class="stress-line">Row three</p>
    <p id="stress-line-4" class="stress-line">Row four</p>
    <p id="stress-line-5" class="stress-line">Row five</p>
  </div></div>
  <input id="stress-text" class="stress-control" type="text" value="abcdefghij">
  <select id="stress-select" class="stress-control">
    <option value="alpha" selected>Alpha option</option>
    <option value="beta">Beta option</option>
  </select>
  <p id="stress-note">IDs return fresh after replacement.</p>
`;

const cycle = (cycleNumber: number): ParityInteractionStep[] => [
  {
    id: `cycle-${cycleNumber}-scroll`,
    actions: [{ type: 'wheel', elementId: 'stress-scroll', deltaY: 40 }],
  },
  {
    id: `cycle-${cycleNumber}-backward-selection`,
    actions: [
      { type: 'pointer-down', elementId: 'stress-text', offsetX: 94, offsetY: 28 },
      { type: 'hover', elementId: 'stress-text', offsetX: 31, offsetY: 28 },
      { type: 'pointer-up' },
    ],
  },
  {
    id: `cycle-${cycleNumber}-replace-selection`,
    actions: [{ type: 'type-text', text: 'X' }],
  },
  {
    id: `cycle-${cycleNumber}-open-for-cancel`,
    actions: [{ type: 'click', elementId: 'stress-select' }],
  },
  {
    id: `cycle-${cycleNumber}-cancel-popup`,
    actions: [{ type: 'press-key', key: 'Escape' }],
  },
  {
    id: `cycle-${cycleNumber}-open-for-commit`,
    actions: [{ type: 'click', elementId: 'stress-select' }],
  },
  {
    id: `cycle-${cycleNumber}-commit-beta`,
    actions: [{ type: 'press-key', key: 'ArrowDown' }, { type: 'press-key', key: 'Enter' }],
  },
  {
    id: `cycle-${cycleNumber}-mobile-compatible-update`,
    actions: [{ type: 'apply-update', stepIndex: 0, viewportId: 'mobile' }],
  },
  {
    id: `cycle-${cycleNumber}-incompatible-replacement`,
    actions: [{ type: 'apply-update', stepIndex: 1 }],
  },
  {
    id: `cycle-${cycleNumber}-desktop-restoration`,
    actions: [{ type: 'apply-update', stepIndex: 2, viewportId: 'desktop' }],
  },
];

export const interactionLifecycleStressFixture: ParityFixture = {
  id: 'interaction-lifecycle-stress',
  title: 'Combined Phase 9 interaction lifecycle',
  category: 'forms-interactive',
  expectedBehavior:
    'Three equivalent scroll, backward pointer selection, expanded-select cancel/commit, compatible responsive update, incompatible replacement, restoration, and disposal cycles keep state exact while every owned resource and registration plateaus and cleans up.',
  measurementIds: [
    'stress-shell', 'stress-status', 'stress-scroll', 'stress-scroll-content',
    'stress-text', 'stress-select', 'stress-note',
  ],
  optionalMeasurementIds: [
    'stress-scroll', 'stress-scroll-content', 'stress-text', 'stress-select',
  ],
  interactionIds: ['stress-text', 'stress-select'],
  scrollIds: ['stress-scroll'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup',
    'input', 'change',
  ],
  interactionSteps: [...cycle(1), ...cycle(2), ...cycle(3)],
  interactionCycleLength: 10,
  reference: {
    html: `<section id="stress-shell">${interactiveReferenceHtml('Desktop cycle ready')}</section>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #stress-shell { box-sizing:border-box; position:absolute; left:120px; top:80px; width:560px; height:430px; padding:20px; background:#e2e8f0; }
      #stress-status { position:absolute; left:20px; top:20px; width:520px; height:32px; margin:0; color:#0f172a; font:700 16px/32px Arial,sans-serif; }
      #stress-scroll { scrollbar-width:none; box-sizing:border-box; position:absolute; left:20px; top:72px; width:240px; height:110px; overflow:auto; border:1px solid #64748b; background:#fff; }
      #stress-scroll::-webkit-scrollbar { display:none; }
      #stress-scroll-content { width:238px; height:220px; background:#f8fafc; }
      .stress-line { box-sizing:border-box; width:238px; height:40px; margin:0; padding:0 12px; color:#334155; font:400 14px/40px Arial,sans-serif; }
      .stress-control { appearance:none; box-sizing:border-box; position:absolute; left:280px; width:240px; height:56px; margin:0; padding:12px 16px; border:2px solid #475569; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 20px/28px Arial,sans-serif; }
      #stress-text:focus,#stress-select:focus { border-color:#2563eb; background:#dbeafe; }
      #stress-text { top:72px; }
      #stress-select { top:142px; }
      #stress-note { box-sizing:border-box; position:absolute; left:20px; top:220px; width:500px; height:90px; margin:0; padding:12px; background:#cbd5e1; color:#334155; font:400 14px/22px Arial,sans-serif; }
      @media (max-width:650px) {
        #stress-shell { left:15px; top:60px; width:360px; height:520px; padding:15px; }
        #stress-status { left:15px; top:15px; width:330px; }
        #stress-scroll { left:15px; top:65px; width:330px; height:120px; }
        #stress-scroll-content,.stress-line { width:328px; }
        .stress-control { left:15px; width:330px; }
        #stress-text { top:215px; }
        #stress-select { top:285px; }
        #stress-note { left:15px; top:370px; width:330px; height:100px; }
      }
    `,
  },
  siteData: createInteractiveSiteData('Desktop cycle ready'),
  dynamicSteps: [
    {
      id: 'mobile-compatible-update',
      referenceMutations: [
        { type: 'set-text', elementId: 'stress-status', textContent: 'Mobile state preserved' },
      ],
      siteData: createInteractiveSiteData('Mobile state preserved'),
    },
    {
      id: 'incompatible-replacement',
      referenceMutations: [{
        type: 'set-children', elementId: 'stress-shell',
        html: '<p id="stress-status">Interactive subtree replaced</p><p id="stress-note">Interactive state cleared.</p>',
      }],
      siteData: createReplacedSiteData(),
    },
    {
      id: 'desktop-restoration',
      referenceMutations: [{
        type: 'set-children', elementId: 'stress-shell',
        html: interactiveReferenceHtml('Desktop cycle ready'),
      }],
      siteData: createInteractiveSiteData('Desktop cycle ready'),
    },
  ],
};
