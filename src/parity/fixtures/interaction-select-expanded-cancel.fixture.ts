import type { ParityFixture } from '../parity.types';

export const interactionSelectExpandedCancelFixture: ParityFixture = {
  id: 'interaction-select-expanded-cancel',
  title: 'Expanded select Escape cancellation',
  category: 'forms-interactive',
  expectedBehavior:
    'A primary pointer click focuses and expands an enabled single-select; Escape closes it without changing the selected option or emitting mutation events.',
  measurementIds: ['expanded-select-surface', 'expanded-select-control'],
  interactionIds: ['expanded-select-control'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'keydown', 'keyup', 'input', 'change'],
  interactionSteps: [
    { id: 'open-select', actions: [{ type: 'click', elementId: 'expanded-select-control' }] },
    { id: 'cancel-with-escape', actions: [{ type: 'press-key', key: 'Escape' }] },
  ],
  reference: {
    html: `
      <section id="expanded-select-surface">
        <select id="expanded-select-control">
          <option value="alpha" selected>Alpha option</option>
          <option value="blocked" disabled>Blocked option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
        </select>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #expanded-select-surface { box-sizing:border-box; position:absolute; left:190px; top:150px; width:420px; height:260px; background:#e2e8f0; }
      #expanded-select-control { appearance:none; box-sizing:border-box; position:absolute; left:100px; top:72px; width:220px; height:56px; margin:0; padding:12px 14px; border:2px solid #334155; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #expanded-select-control:focus { border-color:#2563eb; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#expanded-select-surface', boxSizing: 'border-box', position: 'absolute',
        left: '190px', top: '150px', width: '420px', height: '260px', background: '#e2e8f0',
      },
      {
        selector: '#expanded-select-control', boxSizing: 'border-box', position: 'absolute',
        left: '100px', top: '72px', width: '220px', height: '56px', margin: '0',
        padding: '12px 14px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#334155',
        borderRadius: '0', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif',
        fontSize: '16px', fontWeight: '400', lineHeight: '28px',
      },
      { selector: '#expanded-select-control:focus', borderColor: '#2563eb' },
    ],
    root: {
      children: [{
        type: 'section', id: 'expanded-select-surface', children: [{
          type: 'select', id: 'expanded-select-control', value: 'alpha', options: [
            { value: 'alpha', label: 'Alpha option' },
            { value: 'blocked', label: 'Blocked option', disabled: true },
            { value: 'beta', label: 'Beta option' },
            { value: 'gamma', label: 'Gamma option' },
          ],
        }],
      }],
    },
  },
};
