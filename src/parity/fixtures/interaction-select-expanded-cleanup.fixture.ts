import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture, ParityInteractionStep } from '../parity.types';

const styles: SiteData['styles'] = [
  { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
  {
    selector: '#expanded-cleanup-surface', boxSizing: 'border-box', position: 'absolute',
    left: '190px', top: '140px', width: '420px', height: '300px', background: '#e2e8f0',
  },
  {
    selector: '#expanded-cleanup-control', boxSizing: 'border-box', position: 'absolute',
    left: '100px', top: '52px', width: '220px', height: '56px', margin: '0', padding: '12px 14px',
    borderWidth: '2px', borderStyle: 'solid', borderColor: '#0f172a', borderRadius: '0',
    background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px',
    fontWeight: '400', lineHeight: '28px',
  },
  { selector: '#expanded-cleanup-control:focus', borderColor: '#2563eb' },
  {
    selector: '#expanded-cleanup-status', position: 'absolute', left: '100px', top: '218px',
    width: '220px', height: '32px', color: '#334155', fontFamily: 'Arial, sans-serif',
    fontSize: '16px', lineHeight: '24px', textAlign: 'center',
  },
];

const createSelectSiteData = (status: string): SiteData => ({
  styles,
  root: { children: [{
    type: 'section', id: 'expanded-cleanup-surface', children: [
      {
        type: 'select', id: 'expanded-cleanup-control', value: 'alpha', options: [
          { value: 'alpha', label: 'Alpha option' },
          { value: 'beta', label: 'Beta option' },
          { value: 'gamma', label: 'Gamma option' },
        ],
      },
      { type: 'p', id: 'expanded-cleanup-status', textContent: status },
    ],
  }] },
});

const createRemovedSiteData = (): SiteData => ({
  styles,
  root: { children: [{
    type: 'section', id: 'expanded-cleanup-surface', children: [
      { type: 'p', id: 'expanded-cleanup-status', textContent: 'Popup owner removed' },
    ],
  }] },
});

const cycle = (number: number): ParityInteractionStep[] => [
  {
    id: `cycle-${number}-open`,
    actions: [{ type: 'click', elementId: 'expanded-cleanup-control' }],
  },
  {
    id: `cycle-${number}-remove`,
    actions: [{ type: 'apply-update', stepIndex: 0 }],
  },
  {
    id: `cycle-${number}-readd`,
    actions: [{ type: 'apply-update', stepIndex: 1 }],
  },
];

export const interactionSelectExpandedCleanupFixture: ParityFixture = {
  id: 'interaction-select-expanded-cleanup',
  title: 'Expanded select replacement cleanup',
  category: 'forms-interactive',
  expectedBehavior:
    'Removing an expanded single-select closes its popup and releases popup resources and observers; reusing the ID creates a fresh closed control without lifecycle growth.',
  measurementIds: [
    'expanded-cleanup-surface', 'expanded-cleanup-control', 'expanded-cleanup-status',
  ],
  optionalMeasurementIds: ['expanded-cleanup-control'],
  interactionIds: ['expanded-cleanup-control'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'blur'],
  interactionSteps: [...cycle(1), ...cycle(2), ...cycle(3)],
  interactionCycleLength: 3,
  reference: {
    html: `
      <section id="expanded-cleanup-surface">
        <select id="expanded-cleanup-control">
          <option value="alpha" selected>Alpha option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
        </select>
        <p id="expanded-cleanup-status">Fresh select</p>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #expanded-cleanup-surface { box-sizing:border-box; position:absolute; left:190px; top:140px; width:420px; height:300px; background:#e2e8f0; }
      #expanded-cleanup-control { appearance:none; box-sizing:border-box; position:absolute; left:100px; top:52px; width:220px; height:56px; margin:0; padding:12px 14px; border:2px solid #0f172a; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #expanded-cleanup-control:focus { border-color:#2563eb; }
      #expanded-cleanup-status { position:absolute; left:100px; top:218px; width:220px; height:32px; margin:0; color:#334155; font:400 16px/24px Arial,sans-serif; text-align:center; }
    `,
  },
  siteData: createSelectSiteData('Fresh select'),
  dynamicSteps: [{
    id: 'remove-popup-owner',
    referenceMutations: [{
      type: 'set-children', elementId: 'expanded-cleanup-surface',
      html: '<p id="expanded-cleanup-status">Popup owner removed</p>',
    }],
    siteData: createRemovedSiteData(),
  }, {
    id: 'readd-popup-owner',
    referenceMutations: [{
      type: 'set-children', elementId: 'expanded-cleanup-surface',
      html: '<select id="expanded-cleanup-control"><option value="alpha" selected>Alpha option</option><option value="beta">Beta option</option><option value="gamma">Gamma option</option></select><p id="expanded-cleanup-status">Fresh select</p>',
    }],
    siteData: createSelectSiteData('Fresh select'),
  }],
};
