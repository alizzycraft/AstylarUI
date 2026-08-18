import type { ParityFixture } from '../parity.types';

export const interactionSelectExpandedKeyboardFixture: ParityFixture = {
  id: 'interaction-select-expanded-keyboard',
  title: 'Expanded select keyboard commit',
  category: 'forms-interactive',
  expectedBehavior:
    'Arrow keys move the active option in an expanded single-select while skipping disabled choices, and Enter commits the active option and closes the popup with native events.',
  measurementIds: ['expanded-keyboard-surface', 'expanded-keyboard-control'],
  interactionIds: ['expanded-keyboard-control'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'keydown', 'keyup', 'input', 'change'],
  interactionSteps: [
    { id: 'open-select', actions: [{ type: 'click', elementId: 'expanded-keyboard-control' }] },
    { id: 'move-to-beta-skipping-disabled', actions: [{ type: 'press-key', key: 'ArrowDown' }] },
    { id: 'move-to-gamma', actions: [{ type: 'press-key', key: 'ArrowDown' }] },
    { id: 'commit-with-enter', actions: [{ type: 'press-key', key: 'Enter' }] },
  ],
  reference: {
    html: `
      <section id="expanded-keyboard-surface">
        <select id="expanded-keyboard-control">
          <option value="alpha" selected>Alpha option</option>
          <option value="blocked" disabled>Blocked option</option>
          <option value="beta">Beta option</option>
          <option value="gamma">Gamma option</option>
        </select>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fff7ed; font-family:Arial,sans-serif; }
      #expanded-keyboard-surface { box-sizing:border-box; position:absolute; left:190px; top:150px; width:420px; height:260px; background:#ffedd5; }
      #expanded-keyboard-control { appearance:none; box-sizing:border-box; position:absolute; left:100px; top:72px; width:220px; height:56px; margin:0; padding:12px 14px; border:2px solid #9a3412; border-radius:0; outline:0; background:#fff; color:#431407; font:400 16px/28px Arial,sans-serif; }
      #expanded-keyboard-control:focus { border-color:#ea580c; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fff7ed', fontFamily: 'Arial, sans-serif' },
      { selector: '#expanded-keyboard-surface', boxSizing: 'border-box', position: 'absolute', left: '190px', top: '150px', width: '420px', height: '260px', background: '#ffedd5' },
      {
        selector: '#expanded-keyboard-control', boxSizing: 'border-box', position: 'absolute',
        left: '100px', top: '72px', width: '220px', height: '56px', margin: '0', padding: '12px 14px',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#9a3412', borderRadius: '0',
        background: '#ffffff', color: '#431407', fontFamily: 'Arial, sans-serif', fontSize: '16px',
        fontWeight: '400', lineHeight: '28px',
      },
      { selector: '#expanded-keyboard-control:focus', borderColor: '#ea580c' },
    ],
    root: { children: [{
      type: 'section', id: 'expanded-keyboard-surface', children: [{
        type: 'select', id: 'expanded-keyboard-control', value: 'alpha', options: [
          { value: 'alpha', label: 'Alpha option' },
          { value: 'blocked', label: 'Blocked option', disabled: true },
          { value: 'beta', label: 'Beta option' },
          { value: 'gamma', label: 'Gamma option' },
        ],
      }],
    }] },
  },
};
