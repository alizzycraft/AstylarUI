import { ParityFixture } from '../parity.types';

export const minMaxConstraintsFixture: ParityFixture = {
  id: 'min-max-constraints',
  title: 'Minimum and maximum size constraints',
  category: 'box-model-units',
  expectedBehavior:
    'Minimum constraints expand undersized boxes and maximum constraints shrink oversized boxes on both axes.',
  measurementIds: ['minimum-box', 'maximum-box'],
  reference: {
    html: '<div id="minimum-box"></div><div id="maximum-box"></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #minimum-box, #maximum-box { box-sizing: border-box; position: absolute; margin: 0; padding: 10px; border: 2px solid #334155; }
      #minimum-box { left: 90px; top: 100px; width: 60px; height: 40px; min-width: 140px; min-height: 90px; background: #a7f3d0; }
      #maximum-box { left: 360px; top: 240px; width: 260px; height: 180px; max-width: 150px; max-height: 80px; background: #bfdbfe; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#minimum-box', boxSizing: 'border-box', position: 'absolute', left: '90px', top: '100px', width: '60px', height: '40px', minWidth: '140px', minHeight: '90px', margin: '0', padding: '10px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#334155', background: '#a7f3d0' },
      { selector: '#maximum-box', boxSizing: 'border-box', position: 'absolute', left: '360px', top: '240px', width: '260px', height: '180px', maxWidth: '150px', maxHeight: '80px', margin: '0', padding: '10px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#334155', background: '#bfdbfe' },
    ],
    root: {
      children: [
        { type: 'div', id: 'minimum-box' },
        { type: 'div', id: 'maximum-box' },
      ],
    },
  },
};
