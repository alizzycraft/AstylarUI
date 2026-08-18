import type { ParityFixture } from '../parity.types';

export const overflowNestedWheelFixture: ParityFixture = {
  id: 'overflow-nested-wheel',
  title: 'Nested wheel propagation',
  category: 'overflow-scrolling',
  expectedBehavior:
    'The nearest nested overflow container consumes wheel movement until it reaches a boundary, then further movement in that direction scrolls and clamps its overflow ancestor.',
  measurementIds: [
    'scroll-shell', 'outer-scroll', 'outer-content', 'outer-heading',
    'inner-scroll', 'inner-content', 'inner-one', 'inner-two', 'outer-tail',
  ],
  scrollIds: ['outer-scroll', 'inner-scroll'],
  interactionSteps: [
    { id: 'inner-down', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: 70 }] },
    { id: 'inner-clamp-bottom', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: 500 }] },
    { id: 'propagate-down', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: 50 }] },
    { id: 'inner-reverse', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: -40 }] },
    { id: 'inner-clamp-top', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: -500 }] },
    { id: 'propagate-up', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: -30 }] },
    { id: 'inner-bottom-again', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: 500 }] },
    { id: 'outer-clamp-bottom', actions: [{ type: 'wheel', elementId: 'inner-scroll', deltaY: 500 }] },
  ],
  reference: {
    html: `
      <section id="scroll-shell">
        <div id="outer-scroll">
          <div id="outer-content">
            <div id="outer-heading">Outer heading</div>
            <div id="inner-scroll">
              <div id="inner-content">
                <div id="inner-one">Inner one</div>
                <div id="inner-two">Inner two</div>
              </div>
            </div>
            <div id="outer-tail">Outer tail</div>
          </div>
        </div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdf4; font-family:Arial,sans-serif; }
      #scroll-shell { position:absolute; left:220px; top:60px; width:360px; height:480px; padding:30px; background:#bbf7d0; }
      #outer-scroll { box-sizing:border-box; width:300px; height:300px; margin:0; padding:0; overflow:auto; scrollbar-width:none; background:#ffffff; }
      #outer-scroll::-webkit-scrollbar, #inner-scroll::-webkit-scrollbar { display:none; }
      #outer-content { box-sizing:border-box; width:300px; height:420px; margin:0; padding:0; }
      #outer-heading { box-sizing:border-box; width:300px; height:60px; margin:0; padding:14px 20px; background:#166534; color:#ffffff; font:700 16px/32px Arial,sans-serif; }
      #inner-scroll { box-sizing:border-box; width:220px; height:120px; margin:0 40px; padding:0; overflow:auto; scrollbar-width:none; background:#ffffff; }
      #inner-content { box-sizing:border-box; width:220px; height:220px; margin:0; padding:0; }
      #inner-one, #inner-two { box-sizing:border-box; width:220px; height:110px; margin:0; padding:35px 20px; color:#ffffff; font:700 16px/40px Arial,sans-serif; }
      #inner-one { background:#1d4ed8; }
      #inner-two { background:#9f1239; }
      #outer-tail { box-sizing:border-box; width:300px; height:240px; margin:0; padding:84px 20px; background:#fef3c7; color:#92400e; font:700 16px/72px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdf4', fontFamily: 'Arial, sans-serif' },
      { selector: '#scroll-shell', position: 'absolute', left: '220px', top: '60px', width: '360px', height: '480px', padding: '30px', background: '#bbf7d0' },
      { selector: '#outer-scroll', boxSizing: 'border-box', width: '300px', height: '300px', margin: '0', padding: '0', overflow: 'auto', background: '#ffffff' },
      { selector: '#outer-content', boxSizing: 'border-box', width: '300px', height: '420px', margin: '0', padding: '0' },
      { selector: '#outer-heading', boxSizing: 'border-box', width: '300px', height: '60px', margin: '0', padding: '14px 20px', background: '#166534', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '32px' },
      { selector: '#inner-scroll', boxSizing: 'border-box', width: '220px', height: '120px', margin: '0 40px', padding: '0', overflow: 'auto', background: '#ffffff' },
      { selector: '#inner-content', boxSizing: 'border-box', width: '220px', height: '220px', margin: '0', padding: '0' },
      { selector: '#inner-one, #inner-two', boxSizing: 'border-box', width: '220px', height: '110px', margin: '0', padding: '35px 20px', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '40px' },
      { selector: '#inner-one', background: '#1d4ed8' },
      { selector: '#inner-two', background: '#9f1239' },
      { selector: '#outer-tail', boxSizing: 'border-box', width: '300px', height: '240px', margin: '0', padding: '84px 20px', background: '#fef3c7', color: '#92400e', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '72px' },
    ],
    root: {
      children: [{
        type: 'section', id: 'scroll-shell', children: [{
          type: 'div', id: 'outer-scroll', children: [{
            type: 'div', id: 'outer-content', children: [
              { type: 'div', id: 'outer-heading', textContent: 'Outer heading' },
              { type: 'div', id: 'inner-scroll', children: [{
                type: 'div', id: 'inner-content', children: [
                  { type: 'div', id: 'inner-one', textContent: 'Inner one' },
                  { type: 'div', id: 'inner-two', textContent: 'Inner two' },
                ],
              }] },
              { type: 'div', id: 'outer-tail', textContent: 'Outer tail' },
            ],
          }],
        }],
      }],
    },
  },
};
