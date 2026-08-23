import type { ParityFixture } from '../parity.types';

export const interactionSelectExpandedStackingFixture: ParityFixture = {
  id: 'interaction-select-expanded-stacking',
  title: 'Expanded select stacking and targeting',
  category: 'forms-interactive',
  expectedBehavior:
    'An expanded single-select popup paints and receives option selection above overlapping high-z-index page content, like native platform select UI.',
  measurementIds: ['expanded-stacking-surface', 'expanded-stacking-control', 'expanded-stacking-blocker'],
  interactionIds: ['expanded-stacking-control'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'input', 'change'],
  interactionSteps: [
    { id: 'open-over-blocker', actions: [{ type: 'click', elementId: 'expanded-stacking-control' }] },
    {
      id: 'choose-gamma-through-overlap',
      actions: [{
        type: 'select-option', elementId: 'expanded-stacking-control', value: 'gamma',
        offsetX: 110, offsetY: 121,
      }],
    },
  ],
  reference: {
    html: `
      <section id="expanded-stacking-surface">
        <select id="expanded-stacking-control">
          <option value="alpha" selected>Alpha option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
          <option value="delta">Delta option</option>
        </select>
        <div id="expanded-stacking-blocker"></div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #expanded-stacking-surface { box-sizing:border-box; position:absolute; left:190px; top:130px; width:420px; height:340px; background:#e2e8f0; }
      #expanded-stacking-control { appearance:none; box-sizing:border-box; position:absolute; z-index:1; left:100px; top:60px; width:220px; height:56px; margin:0; padding:12px 14px; border:2px solid #0f172a; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 16px/28px Arial,sans-serif; }
      #expanded-stacking-control:focus { border-color:#2563eb; }
      #expanded-stacking-blocker { box-sizing:border-box; position:absolute; z-index:3; left:80px; top:120px; width:260px; height:120px; background:#fca5a5; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      { selector: '#expanded-stacking-surface', boxSizing: 'border-box', position: 'absolute', left: '190px', top: '130px', width: '420px', height: '340px', background: '#e2e8f0' },
      {
        selector: '#expanded-stacking-control', boxSizing: 'border-box', position: 'absolute', zIndex: '1',
        left: '100px', top: '60px', width: '220px', height: '56px', margin: '0', padding: '12px 14px',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#0f172a', borderRadius: '0',
        background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px',
        fontWeight: '400', lineHeight: '28px',
      },
      { selector: '#expanded-stacking-control:focus', borderColor: '#2563eb' },
      {
        selector: '#expanded-stacking-blocker', boxSizing: 'border-box', position: 'absolute', zIndex: '3',
        left: '80px', top: '120px', width: '260px', height: '120px', background: '#fca5a5',
      },
    ],
    root: { children: [{
      type: 'section', id: 'expanded-stacking-surface', children: [
        {
          type: 'select', id: 'expanded-stacking-control', value: 'alpha', options: [
            { value: 'alpha', label: 'Alpha option' },
            { value: 'beta', label: 'Beta option' },
            { value: 'gamma', label: 'Gamma option' },
            { value: 'delta', label: 'Delta option' },
          ],
        },
        { type: 'div', id: 'expanded-stacking-blocker' },
      ],
    }] },
  },
};
