import type { SiteData } from '../../app/types/site-data';
import type { StyleRule } from '../../app/types/style-rule';
import type { ParityFixture } from '../parity.types';

const shortText = 'Cycle settled.';
const longText = 'This alternating update wraps at narrow widths and forces every dependent layout measurement to be rebuilt.';

const createSiteData = (textContent: string): SiteData => {
  const styles: StyleRule[] = [
    { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
    {
      selector: '#cycle-shell', boxSizing: 'border-box', display: 'flex', flexDirection: 'row',
      alignItems: 'flex-start', gap: '14px', position: 'absolute', left: '40px', top: '60px',
      width: '70vw', height: '180px', padding: '16px', background: '#cbd5e1',
    },
    {
      selector: '#cycle-shell', mediaMaxWidth: '650px', flexDirection: 'column',
      width: '80vw', height: '260px',
    },
    {
      selector: '#cycle-copy', boxSizing: 'border-box', width: '220px', height: 'auto',
      padding: '10px', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif',
      fontSize: '14px', lineHeight: '20px', whiteSpace: 'normal',
    },
    {
      selector: '#cycle-control', boxSizing: 'border-box', width: '160px', height: '48px',
      padding: '8px', borderWidth: '0px', background: '#dbeafe', color: '#1e3a8a', fontFamily: 'Arial, sans-serif',
      fontSize: '13px', lineHeight: '32px', whiteSpace: 'pre-wrap',
    },
  ];
  return {
    styles,
    root: { children: [{
      type: 'section', id: 'cycle-shell', children: [
        { type: 'p', id: 'cycle-copy', textContent },
        { type: 'textarea', id: 'cycle-control', rows: 1, value: 'Stable control' },
      ],
    }] },
  };
};

const texts = [longText, shortText, longText, shortText, longText, shortText];

export const reactiveLifecycleCyclesFixture: ParityFixture = {
  id: 'reactive-lifecycle-cycles',
  title: 'Repeated resize and update lifecycle',
  category: 'responsive',
  expectedBehavior: 'Alternating desktop, tablet, and mobile resizes with short/long text updates remains identical to fresh rendering on every cycle and disposes all owned lifecycle state.',
  measurementIds: ['cycle-shell', 'cycle-copy', 'cycle-control'],
  viewportIds: ['desktop', 'tablet', 'mobile'],
  lifecycleViewports: ['desktop', 'tablet', 'mobile', 'desktop', 'mobile', 'desktop'],
  reference: {
    html: '<section id="cycle-shell"><p id="cycle-copy">Cycle settled.</p><textarea id="cycle-control" rows="1">Stable control</textarea></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #cycle-shell, #cycle-shell * { box-sizing:border-box; }
      #cycle-shell { display:flex; flex-direction:row; align-items:flex-start; gap:14px; position:absolute; left:40px; top:60px; width:70vw; height:180px; padding:16px; background:#cbd5e1; }
      #cycle-copy { width:220px; height:auto; margin:0; padding:10px; background:#fff; color:#0f172a; font:400 14px/20px Arial,sans-serif; white-space:normal; }
      #cycle-control { width:160px; height:48px; padding:8px; border:0; background:#dbeafe; color:#1e3a8a; font:400 13px/32px Arial,sans-serif; white-space:pre-wrap; resize:none; }
      @media (max-width:650px) { #cycle-shell { flex-direction:column; width:80vw; height:260px; } }
    `,
  },
  siteData: createSiteData(shortText),
  dynamicSteps: texts.map((textContent, index) => ({
    id: `cycle-${index + 1}`,
    referenceMutations: [{ type: 'set-text' as const, elementId: 'cycle-copy', textContent }],
    siteData: createSiteData(textContent),
  })),
};
