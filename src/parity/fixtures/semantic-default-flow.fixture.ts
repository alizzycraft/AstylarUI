import { ParityFixture } from '../parity.types';

export const semanticDefaultFlowFixture: ParityFixture = {
  id: 'semantic-default-flow',
  title: 'Heading and paragraph browser defaults',
  category: 'cascade-defaults',
  expectedBehavior:
    'Unstyled headings and paragraphs use centralized browser-like typography, auto block sizing, and vertical margins.',
  measurementIds: ['semantic-card', 'semantic-heading', 'semantic-paragraph'],
  reference: {
    html: '<div id="semantic-card"><h1 id="semantic-heading">Default heading</h1><p id="semantic-paragraph">Default paragraph text.</p></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a; }
      #semantic-card { box-sizing: border-box !important; position: absolute; left: 120px; top: 70px; width: 520px; height: 300px; padding: 24px; border: 3px solid #475569; background: #ffffff; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#0f172a' },
      { selector: '#semantic-card', position: 'absolute', left: '120px', top: '70px', width: '520px', height: '300px', boxSizing: 'border-box', padding: '24px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#475569', background: '#ffffff' }
    ],
    root: {
      children: [{
        type: 'div',
        id: 'semantic-card',
        children: [
          { type: 'h1', id: 'semantic-heading', textContent: 'Default heading' },
          { type: 'p', id: 'semantic-paragraph', textContent: 'Default paragraph text.' }
        ]
      }]
    }
  }
};
