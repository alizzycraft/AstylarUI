import { ParityFixture } from '../parity.types';

export const responsiveMediaFixture: ParityFixture = {
  id: 'responsive-media',
  title: 'Width-based media conditions',
  category: 'responsive',
  expectedBehavior:
    'Width media conditions participate in source order and select desktop, tablet, and mobile style variants at their matching breakpoints.',
  measurementIds: ['media-card'],
  viewportIds: ['desktop', 'tablet', 'mobile'],
  reference: {
    html: '<div id="media-card">Breakpoint card</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #media-card { box-sizing: border-box; position: absolute; left: 10vw; top: 14vh; width: 60vw; height: 22vh; padding: 20px; border: 0; background: #dbeafe; color: #1e3a8a; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; }
      @media (max-width: 700px) { #media-card { width: 70vw; background: #ede9fe; color: #5b21b6; } }
      @media (max-width: 500px) { #media-card { width: 80vw; background: #dcfce7; color: #14532d; } }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#media-card', boxSizing: 'border-box', position: 'absolute', left: '10vw', top: '14vh', width: '60vw', height: '22vh', padding: '20px', borderWidth: '0', background: '#dbeafe', color: '#1e3a8a', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '24px' },
      { selector: '#media-card', mediaMaxWidth: '700px', width: '70vw', background: '#ede9fe', color: '#5b21b6' },
      { selector: '#media-card', mediaMaxWidth: '500px', width: '80vw', background: '#dcfce7', color: '#14532d' },
    ],
    root: {
      children: [{ type: 'div', id: 'media-card', textContent: 'Breakpoint card' }],
    },
  },
};
