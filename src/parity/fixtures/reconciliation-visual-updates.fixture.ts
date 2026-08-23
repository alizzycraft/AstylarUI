import type { SiteData } from '../../app/types/site-data';
import type { DOMElement } from '../../app/types/dom-element';
import type { ParityFixture } from '../parity.types';

const initialSource = '/parity/image-pattern.svg';
const updatedSource = '/parity/article-pattern.svg';

function siteData(state: 0 | 1 | 2 | 3 | 4): SiteData {
  const reordered = state >= 3;
  const children: DOMElement[] = [
    { type: 'h2', id: 'reconcile-title', textContent: 'Release workspace' },
    {
      type: 'p', id: 'reconcile-copy',
      textContent: state >= 1
        ? 'Updated release copy remains attached to the same authored visual owner.'
        : 'Initial release copy.',
    },
    {
      type: 'img', id: 'reconcile-image',
      src: state >= 4 ? updatedSource : initialSource,
      alt: 'Decorative release pattern',
    },
  ];
  if (reordered) {
    children.splice(1, 2, children[2], children[1], {
      type: 'p', id: 'reconcile-note', textContent: 'New child inserted after reorder.',
    });
  }
  return {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#reconcile-shell', boxSizing: 'border-box', display: 'flex',
        flexDirection: 'column', gap: '12px', position: 'absolute', left: '100px',
        top: '60px', width: '500px', height: '420px',
        padding: state >= 2 ? '30px' : '20px',
        background: state >= 2 ? '#dbeafe' : '#e2e8f0',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#475569', borderRadius: '12px',
      },
      { selector: '#reconcile-title', height: '42px', margin: '0', fontSize: '24px', lineHeight: '30px' },
      { selector: '#reconcile-copy', height: '64px', margin: '0', padding: '8px', background: '#ffffff', fontSize: '14px', lineHeight: '20px' },
      { selector: '#reconcile-image', width: '160px', height: '90px', objectFit: 'cover' },
      { selector: '#reconcile-note', height: '34px', margin: '0', color: '#1e40af', fontSize: '14px', lineHeight: '20px' },
    ],
    root: { children: [{ type: 'section', id: 'reconcile-shell', children }] },
  };
}

const reorderedHtml = `
  <h2 id="reconcile-title">Release workspace</h2>
  <img id="reconcile-image" src="${initialSource}" alt="Decorative release pattern">
  <p id="reconcile-copy">Updated release copy remains attached to the same authored visual owner.</p>
  <p id="reconcile-note">New child inserted after reorder.</p>`;

export const reconciliationVisualUpdatesFixture: ParityFixture = {
  id: 'reconciliation-visual-updates',
  title: 'Keyed visual updates retain mesh owners',
  category: 'responsive',
  expectedBehavior:
    'Text, paint/layout, child insertion/reorder, and image-source updates match fresh browser layout while compatible uniquely identified Babylon element meshes retain identity.',
  measurementIds: [
    'reconcile-shell', 'reconcile-title', 'reconcile-copy', 'reconcile-image', 'reconcile-note',
  ],
  optionalMeasurementIds: ['reconcile-note'],
  visualOwnerReuseStepIndexes: [0, 1, 2, 3],
  reference: {
    html: `
      <section id="reconcile-shell">
        <h2 id="reconcile-title">Release workspace</h2>
        <p id="reconcile-copy">Initial release copy.</p>
        <img id="reconcile-image" src="${initialSource}" alt="Decorative release pattern">
      </section>`,
    css: `
      #parity-reference-viewport{position:relative;overflow:hidden;background:#f8fafc;font-family:Arial,sans-serif}
      #reconcile-shell{box-sizing:border-box;display:flex;flex-direction:column;gap:12px;position:absolute;left:100px;top:60px;width:500px;height:420px;padding:20px;background:#e2e8f0;border:2px solid #475569;border-radius:12px}
      #reconcile-title{height:42px;margin:0;font-size:24px;line-height:30px}
      #reconcile-copy{box-sizing:border-box;height:64px;margin:0;padding:8px;background:#fff;font-size:14px;line-height:20px}
      #reconcile-image{width:160px;height:90px;object-fit:cover}
      #reconcile-note{height:34px;margin:0;color:#1e40af;font-size:14px;line-height:20px}
    `,
  },
  siteData: siteData(0),
  dynamicSteps: [
    {
      id: 'text',
      referenceMutations: [{
        type: 'set-text', elementId: 'reconcile-copy',
        textContent: 'Updated release copy remains attached to the same authored visual owner.',
      }],
      siteData: siteData(1),
    },
    {
      id: 'paint-layout',
      referenceMutations: [
        { type: 'set-style', elementId: 'reconcile-shell', property: 'padding', value: '30px' },
        { type: 'set-style', elementId: 'reconcile-shell', property: 'background-color', value: '#dbeafe' },
      ],
      siteData: siteData(2),
    },
    {
      id: 'children',
      referenceMutations: [{ type: 'set-children', elementId: 'reconcile-shell', html: reorderedHtml }],
      siteData: siteData(3),
    },
    {
      id: 'image',
      referenceMutations: [{ type: 'set-source', elementId: 'reconcile-image', source: updatedSource }],
      siteData: siteData(4),
    },
  ],
};
