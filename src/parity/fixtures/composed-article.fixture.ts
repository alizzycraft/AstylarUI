import { ParityFixture } from '../parity.types';

export const composedArticleFixture: ParityFixture = {
  id: 'composed-article',
  title: 'Composed article page',
  category: 'composed-application',
  expectedBehavior:
    'An article composes a flex metadata row, heading, sized image, and wrapped body copy with browser-equivalent geometry, line breaks, and paint.',
  measurementIds: [
    'article-shell',
    'article-meta',
    'article-category',
    'article-date',
    'article-title',
    'article-image',
    'article-copy',
  ],
  reference: {
    html: `
      <article id="article-shell">
        <div id="article-meta"><span id="article-category">Engineering</span><span id="article-date">August 16, 2026</span></div>
        <h1 id="article-title">Designing interfaces for spatial applications</h1>
        <img id="article-image" src="/parity/article-pattern.svg" alt="Abstract color pattern">
        <p id="article-copy">Familiar web layout rules make spatial interfaces easier to author, review, and maintain. The same structure can become a readable surface inside a three-dimensional scene.</p>
      </article>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #e2e8f0; font-family: Arial, sans-serif; }
      #article-shell { box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; position: absolute; left: 90px; top: 45px; width: 620px; height: 510px; margin: 0; padding: 32px 40px; border: 0; background: #ffffff; }
      #article-meta { box-sizing: border-box; display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 540px; height: 24px; margin: 0; padding: 0; border: 0; }
      #article-category, #article-date { box-sizing: border-box; height: 24px; margin: 0; padding: 0; border: 0; color: #475569; font: 700 13px/24px Arial, sans-serif; }
      #article-category { width: 120px; color: #1d4ed8; text-align: left; }
      #article-date { width: 140px; font-weight: 400; text-align: right; }
      #article-title { box-sizing: border-box; width: 540px; height: 72px; margin: 0; padding: 0; border: 0; color: #0f172a; font: 700 28px/36px Arial, sans-serif; text-align: left; }
      #article-image { box-sizing: border-box; width: 540px; height: 210px; margin: 0; padding: 0; border: 0; background: #bfdbfe; object-fit: cover; }
      #article-copy { box-sizing: border-box; width: 540px; height: 92px; margin: 0; padding: 0; border: 0; color: #334155; font: 400 16px/23px Arial, sans-serif; text-align: left; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#article-shell', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', position: 'absolute', left: '90px', top: '45px', width: '620px', height: '510px', margin: '0', padding: '32px 40px', borderWidth: '0', background: '#ffffff' },
      { selector: '#article-meta', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '540px', height: '24px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#article-category, #article-date', boxSizing: 'border-box', height: '24px', margin: '0', padding: '0', borderWidth: '0', color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: '700', lineHeight: '24px' },
      { selector: '#article-category', width: '120px', color: '#1d4ed8', textAlign: 'left' },
      { selector: '#article-date', width: '140px', fontWeight: '400', textAlign: 'right' },
      { selector: '#article-title', boxSizing: 'border-box', width: '540px', height: '72px', margin: '0', padding: '0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '28px', fontWeight: '700', lineHeight: '36px', textAlign: 'left' },
      { selector: '#article-image', boxSizing: 'border-box', width: '540px', height: '210px', margin: '0', padding: '0', borderWidth: '0', background: '#bfdbfe', objectFit: 'cover' },
      { selector: '#article-copy', boxSizing: 'border-box', width: '540px', height: '92px', margin: '0', padding: '0', borderWidth: '0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '23px', textAlign: 'left' },
    ],
    root: {
      children: [{ type: 'article', id: 'article-shell', children: [
        { type: 'div', id: 'article-meta', children: [
          { type: 'span', id: 'article-category', textContent: 'Engineering' },
          { type: 'span', id: 'article-date', textContent: 'August 16, 2026' },
        ] },
        { type: 'h1', id: 'article-title', textContent: 'Designing interfaces for spatial applications' },
        { type: 'img', id: 'article-image', src: '/parity/article-pattern.svg', alt: 'Abstract color pattern' },
        { type: 'p', id: 'article-copy', textContent: 'Familiar web layout rules make spatial interfaces easier to author, review, and maintain. The same structure can become a readable surface inside a three-dimensional scene.' },
      ] }],
    },
  },
};
