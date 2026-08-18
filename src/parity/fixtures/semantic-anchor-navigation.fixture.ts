import type { ParityFixture } from '../parity.types';

export const semanticAnchorNavigationFixture: ParityFixture = {
  id: 'semantic-anchor-navigation',
  title: 'Semantic anchor navigation outcomes',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Accepted pointer, keyboard, and semantic anchor activation records one deterministic navigation outcome; same-document fragments scroll their destination into view, external URLs remain host-routable intents, and cancelled clicks do neither.',
  measurementIds: [
    'anchor-surface', 'anchor-fragment', 'anchor-external', 'anchor-cancelled',
    'anchor-target', 'anchor-end',
  ],
  interactionIds: ['anchor-fragment', 'anchor-external', 'anchor-cancelled'],
  scrollIds: ['anchor-surface'],
  semanticIds: ['anchor-fragment', 'anchor-external', 'anchor-cancelled', 'anchor-target'],
  interactionEventTypes: ['focus', 'blur', 'keydown', 'keyup', 'click'],
  cancelClickIds: ['anchor-cancelled'],
  interactionSteps: [
    { id: 'focus-fragment', actions: [{ type: 'semantic-focus', elementId: 'anchor-fragment' }] },
    { id: 'keyboard-fragment', actions: [{ type: 'press-key', key: 'Enter' }] },
    { id: 'focus-external', actions: [{ type: 'semantic-focus', elementId: 'anchor-external' }] },
    { id: 'semantic-external', actions: [{ type: 'semantic-activate', elementId: 'anchor-external' }] },
    { id: 'focus-cancelled', actions: [{ type: 'semantic-focus', elementId: 'anchor-cancelled' }] },
    { id: 'cancelled-fragment', actions: [{ type: 'semantic-activate', elementId: 'anchor-cancelled' }] },
  ],
  reference: {
    html: `
      <section id="anchor-surface">
        <a id="anchor-fragment" href="#anchor-target">Jump to details</a>
        <a id="anchor-external" href="https://example.com/docs?from=astylar#intro" target="_blank">Open documentation</a>
        <a id="anchor-cancelled" href="#anchor-end">Cancelled destination</a>
        <div id="anchor-target" tabindex="-1">Fragment destination</div>
        <div id="anchor-end">End marker</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #anchor-surface { box-sizing:border-box; position:absolute; left:150px; top:100px; width:500px; height:280px; overflow:auto; border:2px solid #334155; background:#e2e8f0; }
      #anchor-fragment, #anchor-external, #anchor-cancelled { box-sizing:border-box; position:absolute; left:28px; width:250px; height:44px; padding:10px 12px; border:0; border-radius:0; color:#1d4ed8; background:#fff; font:600 15px/24px Arial,sans-serif; text-decoration:underline; }
      #anchor-fragment { top:24px; }
      #anchor-external { top:84px; }
      #anchor-cancelled { top:144px; }
      #anchor-fragment:focus, #anchor-external:focus, #anchor-cancelled:focus { outline:3px solid #60a5fa; outline-offset:2px; }
      #anchor-target, #anchor-end { box-sizing:border-box; position:absolute; left:28px; width:420px; height:70px; padding:20px; background:#dbeafe; color:#1e3a8a; font:700 16px/30px Arial,sans-serif; }
      #anchor-target { top:460px; }
      #anchor-end { top:650px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
      {
        selector: '#anchor-surface', boxSizing: 'border-box', position: 'absolute',
        left: '150px', top: '100px', width: '500px', height: '280px', overflow: 'auto',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#334155', background: '#e2e8f0',
      },
      {
        selector: '.anchor-link', boxSizing: 'border-box', position: 'absolute', left: '28px',
        width: '250px', height: '44px', padding: '10px 12px', color: '#1d4ed8',
        borderWidth: '0', borderStyle: 'none', borderRadius: '0', background: '#ffffff',
        fontFamily: 'Arial, sans-serif', fontSize: '15px',
        fontWeight: '600', lineHeight: '24px', textDecoration: 'underline',
      },
      { selector: '#anchor-fragment', top: '24px' },
      { selector: '#anchor-external', top: '84px' },
      { selector: '#anchor-cancelled', top: '144px' },
      {
        selector: '.anchor-target', boxSizing: 'border-box', position: 'absolute', left: '28px',
        width: '420px', height: '70px', padding: '20px', background: '#dbeafe', color: '#1e3a8a',
        fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '30px',
      },
      { selector: '#anchor-target', top: '460px' },
      { selector: '#anchor-end', top: '650px' },
    ],
    root: { children: [{
      type: 'section', id: 'anchor-surface', children: [
        { type: 'a', id: 'anchor-fragment', class: 'anchor-link', href: '#anchor-target', textContent: 'Jump to details' },
        { type: 'a', id: 'anchor-external', class: 'anchor-link', href: 'https://example.com/docs?from=astylar#intro', target: '_blank', textContent: 'Open documentation' },
        { type: 'a', id: 'anchor-cancelled', class: 'anchor-link', href: '#anchor-end', textContent: 'Cancelled destination' },
        { type: 'div', id: 'anchor-target', class: 'anchor-target', tabindex: -1, textContent: 'Fragment destination' },
        { type: 'div', id: 'anchor-end', class: 'anchor-target', textContent: 'End marker' },
      ],
    }] },
  },
};
