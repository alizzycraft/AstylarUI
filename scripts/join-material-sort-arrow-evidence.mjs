import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {evaluateFocusedRaster} from '../tests/material-parity/focused-raster-metrics.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const sortArrowPredecessor='6ea59073771388cec874ad6985e38823f68d1d72ab7c37d72cb61c5e11a0e411';
const inputKey='supplementarySortArrowPresence',paintKey='supplementarySortArrowLocalPixels';
export function restoreSortArrowEvidence(review){return{...review,groups:review.groups.map(g=>{
  if(!g.obligations.inputStyleStructure[inputKey])return g;
  const inputStyleStructure={...g.obligations.inputStyleStructure},localPaint={...g.obligations.localPaint};
  delete inputStyleStructure[inputKey];delete localPaint[paintKey];
  return{...g,obligations:{...g.obligations,inputStyleStructure,localPaint}};
})};}
export function joinSortArrowEvidence(parent,read=readFileSync){
  assert.equal(hash(JSON.stringify(parent)),sortArrowPredecessor);
  const reportReceipt={file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62'};
  const bytes=read(reportReceipt.file);assert.equal(hash(bytes),reportReceipt.sha256);const report=JSON.parse(bytes),rows=new Map();
  for(const [kind,items]of [['static',report.results],['interaction',report.interactions]])for(const r of items.filter(r=>r.family==='sort')){
    const trees={};for(const side of ['reference','astylar']){const q=r.inputTrees[side],b=read(q.file);assert.equal(hash(b),q.sha256);trees[side]=JSON.parse(b);}
    const svg=trees.reference.nodes.filter(n=>n.type==='svg');assert.equal(svg.length,1);
    const owner=trees.reference.nodes.find(n=>n.key===svg[0].parent),opacity=Number(trees.reference.styles[owner.style].opacity);
    const arrows=trees.astylar.nodes.filter(n=>n.authored?.id==='sort-arrow'),id=`${kind}:sort@${r.profile}/${r.viewport.id}${r.state?'/'+r.state:''}`;
    assert.ok(!rows.has(id));
    if(kind==='static'){assert.equal(opacity,0);assert.equal(arrows.length,0);}
    else if(r.state==='hover'){assert.equal(opacity,.54);assert.equal(arrows.length,0);}
    else{assert.equal(arrows.length,1);assert.equal(arrows[0].authored.data.opacity,opacity);assert.equal(arrows[0].authored.data.direction,r.state==='activate-twice'?'desc':'asc');}
    rows.set(id,{row:r,kind,nativeOpacity:opacity,candidateArrow:arrows[0]?.authored??null});
  }
  assert.equal(rows.size,60);
  const pngHashes={focus:{reference:'811cf77777b732c2c3470a623c1074159f348eb6bed0a29e9b86152dcf6aca2f',astylar:'928b374f2f2470653c0c2bdf0e12fe93b9bccc62d890150965536a56893a603e'},activate:{reference:'377516f4a20733938c9a81d872e3325dbdae9fd6e7ff879325d69cca54e85fec',astylar:'0df80abafbdf7f3701fdf61234c333092781d2b03cebe9f7f2b45b785db67c67'}};
  let cases=0,paintCases=0,hoverFailures=0;
  const groups=parent.groups.map(g=>{
    const o=rows.get(g.case);if(!o)return g;cases++;assert.equal(g.inspection,'partial');assert.equal(g.currentRendering,'unverified');
    const hover=o.row.state==='hover';hoverFailures+=Number(hover);assert.equal(g.obligations.inputStyleStructure[inputKey],undefined);
    let localPaint=g.obligations.localPaint;
    if(['interaction:sort@light/desktop-dpr1/focus','interaction:sort@light/desktop-dpr1/activate'].includes(g.case)){
      paintCases++;assert.equal(localPaint[paintKey],undefined);const images={},receipts={};
      for(const side of ['reference','astylar']){const file=`artifacts/material-parity/current-full-20261005/interactions/sort/light/desktop-dpr1/${o.row.state}/sort-primary-raster-${side}.png`,b=read(file);
        assert.equal(hash(b),pngHashes[o.row.state][side]);images[side]=PNG.sync.read(b);receipts[side]={file,sha256:hash(b)};}
      const {id,...metric}=o.row.focusedRasters.find(r=>r.id==='sort-primary');assert.equal(id,'sort-primary');assert.deepEqual(evaluateFocusedRaster(images.reference,images.astylar),metric);
      const pixel=(p,x,y)=>[...p.data.slice((y*p.width+x)*4,(y*p.width+x)*4+3)];
      localPaint={...localPaint,[paintKey]:{disposition:'inspected-retained-local-pixels-only',
        observations:Object.fromEntries(['reference','astylar'].map(s=>[s,{stem:pixel(images[s],114,15),notch:pixel(images[s],112,16),background:pixel(images[s],0,0)}])),
        evidence:{report:reportReceipt,pngs:receipts},
        boundary:'Audit-pinned existing PNGs with exact original metric replay. Not captured plugin identity,GPU-cause proof,fresh current output or complete local-paint acceptance.'}};
    }
    return{...g,obligations:{...g.obligations,localPaint,inputStyleStructure:{...g.obligations.inputStyleStructure,
      [inputKey]:{disposition:'inspected-arrow-presence-opacity-only',nativeOpacity:o.nativeOpacity,candidateArrow:o.candidateArrow,
        outcome:hover?'Native opacity0.54 but candidate arrow absent.':o.kind==='static'?'Both visible arrow presentations absent;other semantics not equated.':'Candidate arrow presence and opacity match this recorded native endpoint only.',
        finding:hover?'fixture-sort-hover-arrow-omitted':null,evidence:{report:reportReceipt,pairedTrees:o.row.inputTrees},
        boundary:'One retained input property/state endpoint,not full structure,arrow geometry,raw hover/held timing,paint,current source or case closure.'}}}};
  });
  assert.deepEqual({cases,paintCases,hoverFailures},{cases:60,paintCases:2,hoverFailures:8});const review={...parent,groups};
  assert.equal(hash(JSON.stringify(restoreSortArrowEvidence(review))),sortArrowPredecessor);
  return{review,sha256:hash(JSON.stringify(review)),cases,addedChildren:62};
}
