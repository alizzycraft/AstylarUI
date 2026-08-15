import { ParityFixture } from '../parity.types';

export const imageIntrinsicSizeFixture: ParityFixture = {
  id: 'image-intrinsic-size',
  title: 'Image intrinsic dimensions',
  category: 'lists-tables-images',
  expectedBehavior:
    'An image without declared CSS dimensions uses the deterministic asset’s natural width and height.',
  measurementIds: ['intrinsic-image'],
  reference: {
    html: '<img id="intrinsic-image" src="/parity/image-pattern.svg" alt="Color pattern">',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #intrinsic-image { position: absolute; left: 90px; top: 80px; margin: 0; padding: 0; border: 0; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#intrinsic-image', position: 'absolute', left: '90px', top: '80px', margin: '0', padding: '0', borderWidth: '0', borderStyle: 'none' },
    ],
    root: {
      children: [{ type: 'img', id: 'intrinsic-image', src: '/parity/image-pattern.svg', alt: 'Color pattern' }],
    },
  },
};
