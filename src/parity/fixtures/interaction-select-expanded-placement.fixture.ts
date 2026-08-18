import type { ParityFixture } from '../parity.types';

export const interactionSelectExpandedPlacementFixture: ParityFixture = {
  id: 'interaction-select-expanded-placement',
  title: 'Expanded select viewport placement',
  category: 'forms-interactive',
  expectedBehavior:
    'An expanded single-select near the viewport bottom places its complete popup above the control when the available space below is insufficient.',
  measurementIds: ['expanded-placement-surface', 'expanded-placement-control'],
  interactionIds: ['expanded-placement-control'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'keydown', 'keyup'],
  interactionSteps: [
    { id: 'open-near-bottom', actions: [{ type: 'click', elementId: 'expanded-placement-control' }] },
    { id: 'cancel-popup', actions: [{ type: 'press-key', key: 'Escape' }] },
  ],
  reference: {
    html: `
      <section id="expanded-placement-surface">
        <select id="expanded-placement-control">
          <option value="alpha" selected>Alpha option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
          <option value="delta">Delta option</option>
        </select>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#faf5ff; font-family:Arial,sans-serif; }
      #expanded-placement-surface { box-sizing:border-box; position:absolute; left:140px; top:360px; width:520px; height:220px; background:#f3e8ff; }
      #expanded-placement-control { appearance:none; box-sizing:border-box; position:absolute; left:150px; top:130px; width:220px; height:56px; margin:0; padding:12px 14px; border:2px solid #6b21a8; border-radius:0; outline:0; background:#fff; color:#3b0764; font:400 16px/28px Arial,sans-serif; }
      #expanded-placement-control:focus { border-color:#9333ea; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#faf5ff', fontFamily: 'Arial, sans-serif' },
      { selector: '#expanded-placement-surface', boxSizing: 'border-box', position: 'absolute', left: '140px', top: '360px', width: '520px', height: '220px', background: '#f3e8ff' },
      {
        selector: '#expanded-placement-control', boxSizing: 'border-box', position: 'absolute',
        left: '150px', top: '130px', width: '220px', height: '56px', margin: '0', padding: '12px 14px',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#6b21a8', borderRadius: '0',
        background: '#ffffff', color: '#3b0764', fontFamily: 'Arial, sans-serif', fontSize: '16px',
        fontWeight: '400', lineHeight: '28px',
      },
      { selector: '#expanded-placement-control:focus', borderColor: '#9333ea' },
    ],
    root: { children: [{
      type: 'section', id: 'expanded-placement-surface', children: [{
        type: 'select', id: 'expanded-placement-control', value: 'alpha', options: [
          { value: 'alpha', label: 'Alpha option' },
          { value: 'beta', label: 'Beta option' },
          { value: 'gamma', label: 'Gamma option' },
          { value: 'delta', label: 'Delta option' },
        ],
      }],
    }] },
  },
};
