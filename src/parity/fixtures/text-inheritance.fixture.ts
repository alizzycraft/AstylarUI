import { ParityFixture } from '../parity.types';

export const textInheritanceFixture: ParityFixture = {
  id: 'text-inheritance',
  title: 'Inherited text properties',
  category: 'cascade-defaults',
  expectedBehavior: 'A child inherits color and typography from its parent when it has no declaration of its own.',
  measurementIds: ['inherit-child'],
  reference: {
    html: '<div id="inherit-parent"><div id="inherit-child">Inherited typography</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fff; font-family: Arial, sans-serif; }
      #inherit-parent {
        box-sizing: border-box !important; position: absolute; left: 80px; top: 70px;
        width: 420px; height: 180px; color: #7c2d12; font-family: Georgia, serif;
        font-size: 22px; font-weight: 700; font-style: italic; line-height: 30px;
      }
      #inherit-child {
        box-sizing: border-box !important; position: absolute; left: 20px; top: 24px;
        width: 330px; height: 90px; padding: 18px; border: 2px solid #c2410c;
        background: #ffedd5;
      }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#ffffff' },
      {
        selector: '#inherit-parent', position: 'absolute', left: '80px', top: '70px',
        width: '420px', height: '180px', boxSizing: 'border-box', color: '#7c2d12',
        fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: '700',
        fontStyle: 'italic', lineHeight: '30px'
      },
      {
        selector: '#inherit-child', position: 'absolute', left: '20px', top: '24px',
        width: '330px', height: '90px', boxSizing: 'border-box', padding: '18px',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#c2410c', background: '#ffedd5'
      }
    ],
    root: {
      children: [{
        type: 'div', id: 'inherit-parent',
        children: [{ type: 'div', id: 'inherit-child', textContent: 'Inherited typography' }]
      }]
    }
  }
};
