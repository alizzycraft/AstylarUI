import { ParityFixture } from '../parity.types';

export const descendantSelectorFixture: ParityFixture = {
  id: 'descendant-selector',
  title: 'Scoped descendant selectors',
  category: 'selectors-cascade',
  expectedBehavior:
    'Descendant selectors match through multiple ancestors, remain scoped to the matching subtree, and combine the specificity of every compound.',
  measurementIds: ['selector-card', 'descendant-target', 'descendant-outside'],
  reference: {
    html: `
      <section id="selector-card" class="selector-card">
        <div class="selector-content">
          <div id="descendant-target" class="badge">Nested target</div>
        </div>
      </section>
      <div id="descendant-outside" class="badge">Outside target</div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #selector-card { box-sizing: border-box; position: absolute; left: 90px; top: 70px; width: 430px; height: 230px; padding: 24px; border: 4px solid #475569; background: #e2e8f0; }
      .selector-content { box-sizing: border-box; position: relative; width: 100%; height: 100%; padding: 22px; background: #ffffff; }
      .badge { box-sizing: border-box; position: absolute; left: 28px; top: 34px; width: 220px; height: 66px; padding: 18px; border: 0; background: #fee2e2; color: #7f1d1d; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; }
      .selector-card .badge { background: #dcfce7; }
      .selector-card .selector-content div.badge { color: #14532d; }
      #descendant-outside { left: 550px; top: 360px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#selector-card', boxSizing: 'border-box', position: 'absolute', left: '90px', top: '70px', width: '430px', height: '230px', padding: '24px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#475569', background: '#e2e8f0' },
      { selector: '.selector-content', boxSizing: 'border-box', position: 'relative', width: '100%', height: '100%', padding: '22px', background: '#ffffff' },
      { selector: '.badge', boxSizing: 'border-box', position: 'absolute', left: '28px', top: '34px', width: '220px', height: '66px', padding: '18px', borderWidth: '0', background: '#fee2e2', color: '#7f1d1d', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '24px' },
      { selector: '.selector-card .badge', background: '#dcfce7' },
      { selector: '.selector-card .selector-content div.badge', color: '#14532d' },
      { selector: '#descendant-outside', left: '550px', top: '360px' },
    ],
    root: {
      children: [
        {
          type: 'section',
          id: 'selector-card',
          class: 'selector-card',
          children: [
            {
              type: 'div',
              class: 'selector-content',
              children: [
                { type: 'div', id: 'descendant-target', class: 'badge', textContent: 'Nested target' },
              ],
            },
          ],
        },
        { type: 'div', id: 'descendant-outside', class: 'badge', textContent: 'Outside target' },
      ],
    },
  },
};
