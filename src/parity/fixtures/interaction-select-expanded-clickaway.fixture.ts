import type { ParityFixture } from '../parity.types';

export const interactionSelectExpandedClickawayFixture: ParityFixture = {
  id: 'interaction-select-expanded-clickaway',
  title: 'Expanded select click-away dismissal',
  category: 'forms-interactive',
  expectedBehavior:
    'Clicking a non-focusable surface outside an expanded single-select dismisses its popup without changing the selected option and applies the browser focus/event boundary.',
  measurementIds: ['expanded-clickaway-surface', 'expanded-clickaway-control'],
  interactionIds: ['expanded-clickaway-control'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'blur', 'input', 'change'],
  interactionSteps: [
    { id: 'open-select', actions: [{ type: 'click', elementId: 'expanded-clickaway-control' }] },
    {
      id: 'click-outside-popup',
      actions: [{
        type: 'click', elementId: 'expanded-clickaway-surface', offsetX: 36, offsetY: 36,
      }],
    },
  ],
  reference: {
    html: `
      <section id="expanded-clickaway-surface">
        <select id="expanded-clickaway-control">
          <option value="alpha" selected>Alpha option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
        </select>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdf4; font-family:Arial,sans-serif; }
      #expanded-clickaway-surface { box-sizing:border-box; position:absolute; left:190px; top:150px; width:420px; height:260px; background:#dcfce7; }
      #expanded-clickaway-control { appearance:none; box-sizing:border-box; position:absolute; left:100px; top:72px; width:220px; height:56px; margin:0; padding:12px 14px; border:2px solid #166534; border-radius:0; outline:0; background:#fff; color:#052e16; font:400 16px/28px Arial,sans-serif; }
      #expanded-clickaway-control:focus { border-color:#16a34a; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdf4', fontFamily: 'Arial, sans-serif' },
      { selector: '#expanded-clickaway-surface', boxSizing: 'border-box', position: 'absolute', left: '190px', top: '150px', width: '420px', height: '260px', background: '#dcfce7' },
      {
        selector: '#expanded-clickaway-control', boxSizing: 'border-box', position: 'absolute',
        left: '100px', top: '72px', width: '220px', height: '56px', margin: '0', padding: '12px 14px',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#166534', borderRadius: '0',
        background: '#ffffff', color: '#052e16', fontFamily: 'Arial, sans-serif', fontSize: '16px',
        fontWeight: '400', lineHeight: '28px',
      },
      { selector: '#expanded-clickaway-control:focus', borderColor: '#16a34a' },
    ],
    root: { children: [{
      type: 'section', id: 'expanded-clickaway-surface', children: [{
        type: 'select', id: 'expanded-clickaway-control', value: 'alpha', options: [
          { value: 'alpha', label: 'Alpha option' },
          { value: 'beta', label: 'Beta option' },
          { value: 'gamma', label: 'Gamma option' },
        ],
      }],
    }] },
  },
};
