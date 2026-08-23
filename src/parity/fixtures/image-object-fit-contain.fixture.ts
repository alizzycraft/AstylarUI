import { ParityFixture } from '../parity.types';

export const imageObjectFitContainFixture: ParityFixture = {
  id: 'image-object-fit-contain',
  title: 'Image object-fit contain',
  category: 'lists-tables-images',
  expectedBehavior:
    'Contain preserves the image aspect ratio, centers it, and exposes the element background as letterboxing.',
  measurementIds: ['contain-image'],
  reference: {
    html: '<img id="contain-image" src="/parity/image-pattern.svg" alt="Contained color pattern">',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fffbeb; }
      #contain-image { box-sizing: border-box !important; position: absolute; left: 100px; top: 210px; width: 240px; height: 180px; margin: 0; padding: 0; border: 0; background: #fde68a; object-fit: contain; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fffbeb' },
      { selector: '#contain-image', position: 'absolute', left: '100px', top: '210px', width: '240px', height: '180px', boxSizing: 'border-box', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none', background: '#fde68a', objectFit: 'contain' },
    ],
    root: {
      children: [{ type: 'img', id: 'contain-image', src: '/parity/image-pattern.svg', alt: 'Contained color pattern' }],
    },
  },
};
