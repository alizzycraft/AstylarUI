import { ParityFixture } from '../parity.types';

export const boxModelBasicFixture: ParityFixture = {
  id: 'box-model-basic',
  title: 'Basic content-box geometry',
  category: 'box-model-units',
  expectedBehavior:
    'An absolutely positioned content-box includes padding and border outside its declared width and height.',
  measurementIds: ['box-primary'],
  reference: {
    html: `
      <div id="box-primary">
        Box model parity
      </div>
    `,
    css: `
      #parity-reference-viewport {
        position: relative;
        overflow: hidden;
        background: #f1f5f9;
        color: #0f172a;
        font-family: Arial, sans-serif;
        font-size: 16px;
      }

      #box-primary {
        box-sizing: content-box !important;
        position: absolute;
        left: 100px;
        top: 80px;
        width: 240px;
        height: 120px;
        padding: 20px;
        border: 4px solid #2563eb;
        border-radius: 12px;
        background: #dbeafe;
        color: #0f172a;
        font-family: Arial, sans-serif;
        font-size: 16px;
        line-height: 20px;
      }
    `
  },
  siteData: {
    styles: [
      {
        selector: 'root',
        background: '#f1f5f9'
      },
      {
        selector: '#box-primary',
        position: 'absolute',
        left: '100px',
        top: '80px',
        width: '240px',
        height: '120px',
        boxSizing: 'content-box',
        padding: '20px',
        borderWidth: '4px',
        borderStyle: 'solid',
        borderColor: '#2563eb',
        borderRadius: '12px',
        background: '#dbeafe',
        color: '#0f172a',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '20px'
      }
    ],
    root: {
      children: [
        {
          type: 'div',
          id: 'box-primary',
          textContent: 'Box model parity'
        }
      ]
    }
  }
};
