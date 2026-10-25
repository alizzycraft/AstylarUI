// Pending findings;the frozen live policy/source inventory is not changed here.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const original={file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62'};
export const sortArrowFindings=Object.freeze([
  Object.freeze({
    id:'fixture-sort-hover-arrow-omitted',classification:'application-plugin-authoring-defect',
    owner:'showcase Sort arrow presence/state translation',file:'examples/material-showcase/src/app/astylar.component.ts',
    pattern:String.raw`\.\.\.\(state\.open \|\| focused \? \[\{\s+type: 'showcase\.material:sort-arrow'`,
    introducedBy:'705cf584 first authors an activated-only text arrow;75fe617b adds focused presence but not hover;5b74d1b3 preserves that gate for the plugin arrow. Source history only,not first-bad runtime or historical reference equivalence.',
    history:{initialArrow:'705cf584b749caaf59149bba4b017567ca794c23',focusGate:'75fe617bf947eabf8c4353322a1b97ca5b3bc7d7',pluginArrow:'5b74d1b3e79016a1ba402090d66c60a123718e71'},
    observation:{property:'arrow node presence versus native opacity',cases:60,hoverFailures:8,hiddenControls:12,presentControls:40,
      reference:'All eight hover owners have arrow opacity0.54.',astylar:'All eight hover trees omit sort-arrow entirely.',
      firstDivergence:'Candidate conditional authoring before plugin rendering or projection.'},
    evidence:{report:original},focusedProof:'tests/material-parity/sort-arrow-geometry.spec.mjs',
    action:'Match native hover/focus/activation arrow presence through authored state;do not add renderer offsets or duplicate input routing.',
    boundary:'Retained input presence and current source/history only;not raw hover timing,animation,paint,current served build or whole-case closure.'
  }),
  Object.freeze({
    id:'fixture-sort-arrow-triangulation-fills-notch-and-overdraws',classification:'application-plugin-authoring-defect',
    owner:'Material sort-arrow CSS-space vector paint geometry',file:'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    pattern:String.raw`export function materialSortArrowTriangles\(direction: 'asc' \| 'desc'\)`,
    introducedBy:'5b74d1b3 replaces the text glyph with the five-triangle function. Initial unit-scale vertices equal current CSS vertices;e4ca3db4 changes coordinate API but preserves topology. Not historical browser or first-bad-runtime proof.',
    history:{introduction:'5b74d1b3e79016a1ba402090d66c60a123718e71',parent:'6a43034a5f42a03f96f413c9301b136afff776a6',cssBoundary:'e4ca3db4070b1aaac0c1a43dda67bc135f18900a'},
    observation:{property:'vector fill coverage before projection',nativePolygonArea:49.08,summedTriangleArea:64.48,
      witnesses:[{point:{x:2,y:-1.5},nativeFilled:false,candidateTriangles:1},{point:{x:0,y:-2},nativeFilled:true,candidateTriangles:2}],
      firstDivergence:'Current plugin triangles differ from the retained native SVG path despite equal bounds.'},
    evidence:{report:original,currentPluginSha256:'dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e'},
    retainedPaint:{states:['focus','activate'],profile:'light',dpr:1,metricReplay:'Exact complete original focused-raster metrics on existing PNGs;zero phase shift.',
      focusStem:{reference:[129,126,131],astylar:[75,72,78]},opaqueStem:{reference:[29,27,32],astylar:[29,27,32]},
      attribution:'Consistent with extra fill/double alpha coverage;not proof of capture-time plugin identity or historical GPU cause.'},
    focusedProof:'tests/material-parity/sort-arrow-geometry.spec.mjs',
    action:'Preserve native path and dimensions with faithful nonoverlapping vector geometry;do not retune scale,offset,color or opacity to hide the mismatch.',
    boundary:'Current geometry and source history plus two retained local observations. Captured-plugin linkage and fresh current raster remain unverified;not all-context paint or case closure.'
  })
]);

// Prepare the existing registry in memory before touching any live source or
// historical reader. Whole-predecessor guards prohibit marker-only replay.
const registryPrior={producer:'eb07363c7e36b1c94b29e0f0d03ef5534dfeea496f35c210f9e0391b41406ef7',policy:'417d36eb37b97da5be73522d1c1cc19fac4477050c44351b7729d14cd0d7bbce'};
const digest=s=>createHash('sha256').update(s).digest('hex');
export const sortArrowSources=Object.freeze([
  'scripts/join-material-sort-arrow-evidence.mjs',
  'tests/material-parity/sort-arrow-findings.mjs',
  'tests/material-parity/sort-arrow-geometry.spec.mjs',
]);
export const sortArrowProofTitles=Object.freeze([
  'Sort staged registry preserves all existing sources proofs findings and plans',
  'Sort arrow partial join conserves the complete Tree predecessor and all remaining work',
  'pending Sort arrow findings preserve separate state and vector ownership',
  'all retained Sort hover contexts omit the candidate arrow despite visible native opacity',
  'Sort arrow bounds conceal extra filled area and overlapping current plugin triangles',
]);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const actions=sortArrowFindings.map(f=>({priority:2.2,rootCause:f.owner,action:f.action+' '+f.boundary}));
const additions={
  policy:[['export const sourceAuditDefinitions = Object.freeze([\n',sortArrowFindings.map(f=>'  Object.freeze('+JSON.stringify({...f,justification:f.observation.firstDivergence+' '+f.boundary},null,2)+'),\n').join('')]],
  producer:[
    ['function sourceFingerprints(root) {\n  const files = [\n',sortArrowSources.map(f=>'    '+JSON.stringify(f)+',\n').join('')],
    ['function focusedProofInventory(root) {\n  return [\n',sortArrowProofTitles.map(title=>'    proof(root, "tests/material-parity/sort-arrow-geometry.spec.mjs", new RegExp('+JSON.stringify("test\\('"+escape(title)+"'")+'),\n      '+JSON.stringify(title)+', "Bounded retained Sort presence and vector/pixel evidence;not fresh current rendering or complete case acceptance."),\n').join('')],
    ['function implementationPlan() {\n  return [\n',actions.map(a=>'    '+JSON.stringify(a)+',\n').join('')],
  ],
};
const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,b);};
export function prepareSortArrowRegistry(bytes,kind,read){
  assert.ok(Object.hasOwn(registryPrior,kind));let text=bytes.toString().replaceAll('\r\n','\n');assert.equal(digest(text),registryPrior[kind]);
  if(kind==='producer'){
    for(const file of sortArrowSources){assert.ok(read(file).length>0);assert.equal(text.includes(JSON.stringify(file)),false);}
    const proof=read('tests/material-parity/sort-arrow-geometry.spec.mjs').toString();
    for(const title of sortArrowProofTitles)assert.equal([...proof.matchAll(new RegExp("test\\('"+escape(title)+"'",'g'))].length,1);
  }
  for(const [anchor,prefix]of additions[kind])text=once(text,anchor,anchor+prefix);return text;
}
export function restoreSortArrowRegistry(bytes,kind){
  assert.ok(Object.hasOwn(registryPrior,kind));let text=bytes.toString().replaceAll('\r\n','\n');
  for(const [anchor,prefix]of additions[kind])text=once(text,anchor+prefix,anchor);
  assert.equal(digest(text),registryPrior[kind]);return text;
}
