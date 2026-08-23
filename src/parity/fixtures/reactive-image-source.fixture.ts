import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const oldSource = '/parity/image-pattern.svg?parity-delay=400';
const newSource = '/parity/article-pattern.svg?parity-delay=40';

const styles = [
  { selector: 'root', background: '#e2e8f0' },
  { selector: '#source-frame', boxSizing: 'border-box' as const, position: 'absolute' as const, left: '240px', top: '140px', width: '320px', height: '180px', padding: '20px', background: '#ffffff' },
  { selector: '#source-image', boxSizing: 'border-box' as const, width: '280px', height: '140px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#0f172a', objectFit: 'cover' },
];

const createSiteData = (source: string): SiteData => ({
  styles,
  root: { children: [{
    type: 'section', id: 'source-frame', children: [
      { type: 'img', id: 'source-image', src: source, alt: 'Replaceable pattern' },
    ],
  }] },
});

export const reactiveImageSourceFixture: ParityFixture = {
  id: 'reactive-image-source',
  title: 'Reactive image source replacement',
  category: 'responsive',
  expectedBehavior: 'Replacing a still-loading image source shows only the new image; completion of the older delayed source cannot overwrite the current element or grow scene resources.',
  measurementIds: ['source-frame', 'source-image'],
  reference: {
    html: `<section id="source-frame"><img id="source-image" src="${oldSource}" alt="Replaceable pattern"></section>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#e2e8f0; }
      #source-frame, #source-frame * { box-sizing:border-box; }
      #source-frame { position:absolute; left:240px; top:140px; width:320px; height:180px; padding:20px; background:#fff; }
      #source-image { width:280px; height:140px; border:4px solid #0f172a; object-fit:cover; }
    `,
  },
  siteData: createSiteData(oldSource),
  dynamicSteps: [{
    id: 'replace-pending-source',
    referenceMutations: [{ type: 'set-source', elementId: 'source-image', source: newSource }],
    siteData: createSiteData(newSource),
  }],
};
