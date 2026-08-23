import type { ParityFixture } from '../parity.types';

export const overflowHorizontalWheelFixture: ParityFixture = {
  id: 'overflow-horizontal-wheel',
  title: 'Horizontal wheel scrolling',
  category: 'overflow-scrolling',
  expectedBehavior:
    'Horizontal wheel input scrolls a fixed-width overflow:auto container, clamps at both ends, moves its row beneath a stable clip, and reports browser-equivalent scroll extents.',
  measurementIds: ['scroll-shell', 'scroll-box', 'scroll-strip', 'scroll-one', 'scroll-two', 'scroll-three'],
  scrollIds: ['scroll-box'],
  interactionSteps: [
    { id: 'scroll-right', actions: [{ type: 'wheel', elementId: 'scroll-box', deltaX: 65 }] },
    { id: 'clamp-right', actions: [{ type: 'wheel', elementId: 'scroll-box', deltaX: 500 }] },
    { id: 'scroll-left', actions: [{ type: 'wheel', elementId: 'scroll-box', deltaX: -35 }] },
  ],
  reference: {
    html: `
      <section id="scroll-shell">
        <div id="scroll-box">
          <div id="scroll-strip">
            <div id="scroll-one">First</div>
            <div id="scroll-two">Second</div>
            <div id="scroll-three">Third</div>
          </div>
        </div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#ecfeff; font-family:Arial,sans-serif; }
      #scroll-shell { position:absolute; left:180px; top:120px; width:320px; height:240px; padding:40px; background:#a5f3fc; }
      #scroll-box { box-sizing:border-box; width:240px; height:120px; margin:0; padding:0; overflow:auto; scrollbar-width:none; background:#ffffff; }
      #scroll-box::-webkit-scrollbar { display:none; }
      #scroll-strip { display:flex; flex-flow:row nowrap; box-sizing:border-box; width:360px; height:120px; margin:0; padding:0; }
      #scroll-one, #scroll-two, #scroll-three { box-sizing:border-box; flex:0 0 120px; width:120px; height:120px; margin:0; padding:40px 16px; color:#ffffff; font:700 16px/40px Arial,sans-serif; text-align:center; }
      #scroll-one { background:#0369a1; }
      #scroll-two { background:#047857; }
      #scroll-three { background:#be123c; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#ecfeff', fontFamily: 'Arial, sans-serif' },
      { selector: '#scroll-shell', position: 'absolute', left: '180px', top: '120px', width: '320px', height: '240px', padding: '40px', background: '#a5f3fc' },
      { selector: '#scroll-box', boxSizing: 'border-box', width: '240px', height: '120px', margin: '0', padding: '0', overflow: 'auto', background: '#ffffff' },
      { selector: '#scroll-strip', display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', boxSizing: 'border-box', width: '360px', height: '120px', margin: '0', padding: '0' },
      { selector: '#scroll-one, #scroll-two, #scroll-three', boxSizing: 'border-box', flex: '0 0 120px', width: '120px', height: '120px', margin: '0', padding: '40px 16px', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '40px', textAlign: 'center' },
      { selector: '#scroll-one', background: '#0369a1' },
      { selector: '#scroll-two', background: '#047857' },
      { selector: '#scroll-three', background: '#be123c' },
    ],
    root: {
      children: [{
        type: 'section', id: 'scroll-shell', children: [{
          type: 'div', id: 'scroll-box', children: [{
            type: 'div', id: 'scroll-strip', children: [
              { type: 'div', id: 'scroll-one', textContent: 'First' },
              { type: 'div', id: 'scroll-two', textContent: 'Second' },
              { type: 'div', id: 'scroll-three', textContent: 'Third' },
            ],
          }],
        }],
      }],
    },
  },
};
