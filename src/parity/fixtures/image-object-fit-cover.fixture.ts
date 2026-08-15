import { ParityFixture } from '../parity.types';

export const imageObjectFitCoverFixture: ParityFixture = {
  id: 'image-object-fit-cover',
  title: 'Image object-fit cover',
  category: 'lists-tables-images',
  expectedBehavior:
    'Cover fills the image box while preserving aspect ratio and cropping equally from the long axis.',
  measurementIds: ['cover-image'],
  reference: {
    html: '<img id="cover-image" src="/parity/image-pattern.svg" alt="Covered color pattern">',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #eff6ff; }
      #cover-image { box-sizing: border-box !important; position: absolute; left: 500px; top: 310px; width: 180px; height: 180px; margin: 0; padding: 0; border: 0; background: #bfdbfe; object-fit: cover; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#eff6ff' },
      { selector: '#cover-image', position: 'absolute', left: '500px', top: '310px', width: '180px', height: '180px', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', background: '#bfdbfe', objectFit: 'cover' },
    ],
    root: {
      children: [{ type: 'img', id: 'cover-image', src: '/parity/image-pattern.svg', alt: 'Covered color pattern' }],
    },
  },
};
