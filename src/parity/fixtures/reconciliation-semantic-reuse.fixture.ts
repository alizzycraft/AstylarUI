import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

function siteData(panelLabel: string, panelTitle: string, actionLabel: string): SiteData {
  return {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#reuse-panel', position: 'absolute', left: '80px', top: '70px',
        width: '360px', height: '160px', padding: '24px', background: '#ffffff',
        borderWidth: '1px', borderColor: '#cbd5e1', borderRadius: '12px',
      },
      {
        selector: '#reuse-action', width: '180px', height: '44px',
        background: '#2563eb', color: '#ffffff', borderRadius: '8px',
      },
    ],
    root: {
      children: [{
        type: 'section', id: 'reuse-panel', ariaLabel: panelLabel, title: panelTitle,
        children: [{
          type: 'button', id: 'reuse-action', inputType: 'button',
          textContent: 'Open workspace', ariaLabel: actionLabel, title: 'Initial action',
        }],
      }],
    },
  };
}

export const reconciliationSemanticReuseFixture: ParityFixture = {
  id: 'reconciliation-semantic-reuse',
  title: 'Semantic-only visual owner reuse',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Changing semantic labels and advisory titles updates the native semantic tree without reflowing or replacing compatible Babylon visual owners.',
  measurementIds: ['reuse-panel', 'reuse-action'],
  semanticIds: ['reuse-panel', 'reuse-action'],
  visualReuseStepIndexes: [0, 1],
  reference: {
    html: `
      <section id="reuse-panel" aria-label="Workspace actions" title="Initial panel">
        <button id="reuse-action" type="button" aria-label="Open workspace" title="Initial action">Open workspace</button>
      </section>`,
    css: `
      #parity-reference-viewport{position:relative;overflow:hidden;background:#f8fafc;font-family:Arial,sans-serif}
      #reuse-panel{position:absolute;left:80px;top:70px;width:360px;height:160px;padding:24px;background:#fff;border:1px solid #cbd5e1;border-radius:12px;box-sizing:border-box}
      #reuse-action{width:180px;height:44px;background:#2563eb;color:#fff;border:0;border-radius:8px}
    `,
  },
  siteData: siteData('Workspace actions', 'Initial panel', 'Open workspace'),
  dynamicSteps: [
    {
      id: 'renamed',
      referenceMutations: [
        { type: 'set-attribute', elementId: 'reuse-panel', name: 'aria-label', value: 'Project actions' },
        { type: 'set-attribute', elementId: 'reuse-panel', name: 'title', value: 'Updated panel' },
        { type: 'set-attribute', elementId: 'reuse-action', name: 'aria-label', value: 'Open project' },
      ],
      siteData: siteData('Project actions', 'Updated panel', 'Open project'),
    },
    {
      id: 'renamed-again',
      referenceMutations: [
        { type: 'set-attribute', elementId: 'reuse-panel', name: 'aria-label', value: 'Team actions' },
        { type: 'set-attribute', elementId: 'reuse-panel', name: 'title', value: 'Final panel' },
        { type: 'set-attribute', elementId: 'reuse-action', name: 'aria-label', value: 'Open team' },
      ],
      siteData: siteData('Team actions', 'Final panel', 'Open team'),
    },
  ],
};
