import type { ParityFixture } from '../parity.types';

export const overflowVerticalWheelFixture: ParityFixture = {
  id: 'overflow-vertical-wheel',
  title: 'Vertical wheel scrolling',
  category: 'overflow-scrolling',
  expectedBehavior:
    'Wheel input scrolls a fixed-height overflow:auto container, clamps at both ends, moves its content under a stable clip, and reports browser-equivalent scroll extents.',
  measurementIds: ['scroll-shell', 'scroll-box', 'scroll-one', 'scroll-two', 'scroll-three'],
  scrollIds: ['scroll-box'],
  interactionSteps: [
    { id: 'scroll-down', actions: [{ type: 'wheel', elementId: 'scroll-box', deltaY: 70 }] },
    { id: 'clamp-bottom', actions: [{ type: 'wheel', elementId: 'scroll-box', deltaY: 500 }] },
    { id: 'scroll-up', actions: [{ type: 'wheel', elementId: 'scroll-box', deltaY: -30 }] },
  ],
  reference: {
    html: `
      <section id="scroll-shell">
        <div id="scroll-box">
          <div id="scroll-one">First panel</div>
          <div id="scroll-two">Second panel</div>
          <div id="scroll-three">Third panel</div>
        </div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eef2ff; font-family:Arial,sans-serif; }
      #scroll-shell { position:absolute; left:180px; top:100px; width:320px; height:280px; padding:40px; background:#c7d2fe; }
      #scroll-box { box-sizing:border-box; width:240px; height:160px; margin:0; padding:0; overflow:auto; scrollbar-width:none; background:#ffffff; }
      #scroll-box::-webkit-scrollbar { display:none; }
      #scroll-one, #scroll-two, #scroll-three { box-sizing:border-box; width:240px; height:80px; margin:0; padding:24px; color:#ffffff; font:700 16px/32px Arial,sans-serif; }
      #scroll-one { background:#4338ca; }
      #scroll-two { background:#0f766e; }
      #scroll-three { background:#b45309; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#eef2ff', fontFamily: 'Arial, sans-serif' },
      { selector: '#scroll-shell', position: 'absolute', left: '180px', top: '100px', width: '320px', height: '280px', padding: '40px', background: '#c7d2fe' },
      { selector: '#scroll-box', boxSizing: 'border-box', width: '240px', height: '160px', margin: '0', padding: '0', overflow: 'auto', background: '#ffffff' },
      { selector: '#scroll-one, #scroll-two, #scroll-three', boxSizing: 'border-box', width: '240px', height: '80px', margin: '0', padding: '24px', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '32px' },
      { selector: '#scroll-one', background: '#4338ca' },
      { selector: '#scroll-two', background: '#0f766e' },
      { selector: '#scroll-three', background: '#b45309' },
    ],
    root: {
      children: [{
        type: 'section', id: 'scroll-shell', children: [{
          type: 'div', id: 'scroll-box', children: [
            { type: 'div', id: 'scroll-one', textContent: 'First panel' },
            { type: 'div', id: 'scroll-two', textContent: 'Second panel' },
            { type: 'div', id: 'scroll-three', textContent: 'Third panel' },
          ],
        }],
      }],
    },
  },
};
