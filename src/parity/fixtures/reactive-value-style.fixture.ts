import type { SiteData } from '../../app/types/site-data';
import type { StyleRule } from '../../app/types/style-rule';
import type { ParityFixture } from '../parity.types';

const finalValue = 'Approved\nReady to publish';

const createSiteData = (updated: boolean): SiteData => {
  const styles: StyleRule[] = [
    { selector: 'root', background: '#f1f5f9', fontFamily: 'Arial, sans-serif' },
    {
      selector: '#update-workspace', boxSizing: 'border-box', display: 'flex',
      flexDirection: updated ? 'column' : 'row', alignItems: 'flex-start', gap: '16px',
      position: 'absolute', left: '200px', top: '110px', width: updated ? '300px' : '400px',
      height: updated ? '220px' : '130px', padding: '16px', background: '#cbd5e1',
    },
    {
      selector: '#update-control', boxSizing: 'border-box', width: '220px', height: '80px',
      padding: '8px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#475569',
      background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif',
      fontSize: '14px', lineHeight: '20px', whiteSpace: 'pre-wrap',
    },
    {
      selector: '#update-summary', boxSizing: 'border-box', width: '132px', height: '64px',
      padding: '10px', background: '#dbeafe', color: '#1e3a8a', fontFamily: 'Arial, sans-serif',
      fontSize: '13px', lineHeight: '22px',
    },
  ];
  return {
    styles,
    root: { children: [{
      type: 'section', id: 'update-workspace', children: [
        { type: 'textarea', id: 'update-control', rows: 3, value: updated ? finalValue : 'Draft' },
        { type: 'p', id: 'update-summary', textContent: 'Review state' },
      ],
    }] },
  };
};

export const reactiveValueStyleFixture: ParityFixture = {
  id: 'reactive-value-style',
  title: 'Reactive control value and layout styles',
  category: 'responsive',
  expectedBehavior: 'Updating a visible textarea value and authored Flex direction, width, and height reflows the existing scene to the same result as a fresh render.',
  measurementIds: ['update-workspace', 'update-control', 'update-summary'],
  reference: {
    html: '<section id="update-workspace"><textarea id="update-control" rows="3">Draft</textarea><p id="update-summary">Review state</p></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f1f5f9; font-family:Arial,sans-serif; }
      #update-workspace { box-sizing:border-box; display:flex; flex-direction:row; align-items:flex-start; gap:16px; position:absolute; left:200px; top:110px; width:400px; height:130px; padding:16px; background:#cbd5e1; }
      #update-control { box-sizing:border-box; width:220px; height:80px; padding:8px; border:2px solid #475569; background:#fff; color:#0f172a; font:400 14px/20px Arial,sans-serif; white-space:pre-wrap; resize:none; }
      #update-summary { box-sizing:border-box; width:132px; height:64px; margin:0; padding:10px; background:#dbeafe; color:#1e3a8a; font:400 13px/22px Arial,sans-serif; }
    `,
  },
  siteData: createSiteData(false),
  dynamicSteps: [{
    id: 'value-and-column-layout',
    referenceMutations: [
      { type: 'set-value', elementId: 'update-control', value: finalValue },
      { type: 'set-style', elementId: 'update-workspace', property: 'flex-direction', value: 'column' },
      { type: 'set-style', elementId: 'update-workspace', property: 'width', value: '300px' },
      { type: 'set-style', elementId: 'update-workspace', property: 'height', value: '220px' },
    ],
    siteData: createSiteData(true),
  }],
};
