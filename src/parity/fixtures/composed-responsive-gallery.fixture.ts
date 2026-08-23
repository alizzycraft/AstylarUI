import { ParityFixture } from '../parity.types';

export const composedResponsiveGalleryFixture: ParityFixture = {
  id: 'composed-responsive-gallery',
  title: 'Responsive composed card gallery',
  category: 'composed-application',
  expectedBehavior: 'One gallery DOM adapts from three columns to two and then one while its flex shell and explicit row tracks follow each deterministic viewport.',
  measurementIds: ['gallery-shell', 'gallery-heading', 'gallery-grid', 'gallery-card-1', 'gallery-card-2', 'gallery-card-3', 'gallery-card-4', 'gallery-card-5', 'gallery-card-6'],
  viewportIds: ['desktop', 'tablet', 'mobile'],
  reference: {
    html: `<section id="gallery-shell"><h2 id="gallery-heading">Project gallery</h2><div id="gallery-grid"><article id="gallery-card-1"></article><article id="gallery-card-2"></article><article id="gallery-card-3"></article><article id="gallery-card-4"></article><article id="gallery-card-5"></article><article id="gallery-card-6"></article></div></section>`,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #gallery-shell { box-sizing: border-box; display: flex; flex-direction: column; position: absolute; left: 20px; top: 80px; width: 350px; height: 600px; margin: 0; padding: 0; border: 0; background: #ffffff; }
      #gallery-heading { box-sizing: border-box; flex: 0 0 80px; width: 350px; height: 80px; margin: 0; padding: 24px 20px; border: 0; background: #0f172a; color: #ffffff; font: 700 22px/32px Arial, sans-serif; text-align: left; }
      #gallery-grid { box-sizing: border-box; display: grid; grid-template-columns: 1fr; grid-template-rows: 71.6667px 71.6667px 71.6667px 71.6667px 71.6667px 71.6667px; gap: 10px; width: 350px; height: 520px; margin: 0; padding: 20px; border: 0; background: #e2e8f0; }
      #gallery-grid > article { box-sizing: border-box; min-width: 0; min-height: 0; margin: 0; padding: 0; border: 0; }
      #gallery-card-1 { background:#bfdbfe } #gallery-card-2 { background:#a7f3d0 } #gallery-card-3 { background:#fed7aa } #gallery-card-4 { background:#e9d5ff } #gallery-card-5 { background:#fecdd3 } #gallery-card-6 { background:#fde68a }
      @media (min-width: 600px) { #gallery-shell { left:40px; top:80px; width:560px; height:540px } #gallery-heading { width:560px; height:80px } #gallery-grid { grid-template-columns:1fr 1fr; grid-template-rows:130px 130px 130px; gap:15px; width:560px; height:460px } }
      @media (min-width: 750px) { #gallery-shell { left:80px; top:60px; width:640px; height:480px } #gallery-heading { width:640px; height:80px } #gallery-grid { grid-template-columns:1fr 1fr 1fr; grid-template-rows:170px 170px; gap:20px; width:640px; height:400px } }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'#gallery-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', position:'absolute', left:'20px', top:'80px', width:'350px', height:'600px', margin:'0', padding:'0', borderWidth:'0', background:'#ffffff' },
      { selector:'#gallery-heading', boxSizing:'border-box', flex:'0 0 80px', width:'350px', height:'80px', margin:'0', padding:'24px 20px', borderWidth:'0', background:'#0f172a', color:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'22px', fontWeight:'700', lineHeight:'32px', textAlign:'left' },
      { selector:'#gallery-grid', boxSizing:'border-box', display:'grid', gridTemplateColumns:'1fr', gridTemplateRows:'71.6667px 71.6667px 71.6667px 71.6667px 71.6667px 71.6667px', gap:'10px', width:'350px', height:'520px', margin:'0', padding:'20px', borderWidth:'0', background:'#e2e8f0' },
      { selector:'#gallery-grid > article', boxSizing:'border-box', minWidth:'0', minHeight:'0', margin:'0', padding:'0', borderWidth:'0' },
      { selector:'#gallery-card-1', background:'#bfdbfe' }, { selector:'#gallery-card-2', background:'#a7f3d0' }, { selector:'#gallery-card-3', background:'#fed7aa' }, { selector:'#gallery-card-4', background:'#e9d5ff' }, { selector:'#gallery-card-5', background:'#fecdd3' }, { selector:'#gallery-card-6', background:'#fde68a' },
      { selector:'#gallery-shell', mediaMinWidth:'600px', left:'40px', top:'80px', width:'560px', height:'540px' },
      { selector:'#gallery-heading', mediaMinWidth:'600px', width:'560px', height:'80px' },
      { selector:'#gallery-grid', mediaMinWidth:'600px', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'130px 130px 130px', gap:'15px', width:'560px', height:'460px' },
      { selector:'#gallery-shell', mediaMinWidth:'750px', left:'80px', top:'60px', width:'640px', height:'480px' },
      { selector:'#gallery-heading', mediaMinWidth:'750px', width:'640px', height:'80px' },
      { selector:'#gallery-grid', mediaMinWidth:'750px', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'170px 170px', gap:'20px', width:'640px', height:'400px' },
    ],
    root:{children:[{type:'section',id:'gallery-shell',children:[{type:'h2',id:'gallery-heading',textContent:'Project gallery'},{type:'div',id:'gallery-grid',children:[1,2,3,4,5,6].map(number=>({type:'article' as const,id:`gallery-card-${number}`}))}]}]},
  },
};
