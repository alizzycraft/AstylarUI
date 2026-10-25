// Pending findings;the frozen live policy/source inventory is not changed here.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createTreeFocusReviewReader,treeFocusReview} from './tree-focus-registration.mjs';
import {joinSortArrowEvidence,sortArrowPredecessor} from '../../scripts/join-material-sort-arrow-evidence.mjs';
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
const registryPrior={producer:'eb07363c7e36b1c94b29e0f0d03ef5534dfeea496f35c210f9e0391b41406ef7',policy:'747498030c70667fa30ff0b4137312231af24d6709ce7ca9465bb23c5efe1910'};
const digest=s=>createHash('sha256').update(s).digest('hex');
export const sortArrowSources=Object.freeze([
  'scripts/join-material-sort-arrow-evidence.mjs',
  'tests/material-parity/sort-arrow-findings.mjs',
  'tests/material-parity/sort-arrow-geometry.spec.mjs',
]);
export const sortArrowProofTitles=Object.freeze([
  'Sort staged selection and reader preserve older routes and authenticate the exact successor',
  'Sort staged registry preserves all existing sources proofs findings and plans',
  'Sort arrow partial join conserves the complete Tree predecessor and all remaining work',
  'pending Sort arrow findings preserve separate state and vector ownership',
  'all retained Sort hover contexts omit the candidate arrow despite visible native opacity',
  'Sort arrow bounds conceal extra filled area and overlapping current plugin triangles',
]);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const actions=sortArrowFindings.map(f=>({priority:2.2,rootCause:f.owner,action:f.action+' '+f.boundary}));
const legacyPolicyPrefix=sortArrowFindings.map(f=>'  Object.freeze('+JSON.stringify({...f,justification:f.observation.firstDivergence+' '+f.boundary},null,2)+'),\n').join('');
const policyPrefix=sortArrowFindings.map(f=>'  Object.freeze('+JSON.stringify({...f,
  evidence:[...Object.values(f.evidence).filter(r=>r&&typeof r==='object'&&r.file),
    ...(f.evidence.currentPluginSha256?[{file:f.file,sha256:f.evidence.currentPluginSha256}]:[])],
  evidenceDetails:f.evidence,justification:f.observation.firstDivergence+' '+f.boundary},null,2)+'),\n').join('');
const additions={
  policy:[['export const sourceAuditDefinitions = Object.freeze([\n',policyPrefix]],
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
  if(kind==='policy'&&text.includes('export const sourceAuditDefinitions = Object.freeze([\n'+legacyPolicyPrefix)){
    text=once(text,'export const sourceAuditDefinitions = Object.freeze([\n'+legacyPolicyPrefix,'export const sourceAuditDefinitions = Object.freeze([\n');
    assert.equal(digest(text),'417d36eb37b97da5be73522d1c1cc19fac4477050c44351b7729d14cd0d7bbce');return text;
  }
  for(const [anchor,prefix]of additions[kind])text=once(text,anchor+prefix,anchor);
  assert.equal(digest(text),registryPrior[kind]);return text;
}

export const sortArrowReview='8554f8ef7d18ee02a80a409eddb7f96a1aad188983d124d49f9c9d556799f71e';
const selectionPrior={launcher:'29bab606f3637f429f9bfa248001966100e48dd8ac8be8a20810606532a7a96c',runner:'9761500b238b1af13e030157af2c7414bc6091353fd96629bdcc75cc03c89127'};
const selectionChanges=kind=>kind==='launcher'?[
  ["const treeFocus = rawRequested.includes('--tree-focus');","const sortArrow = rawRequested.includes('--sort-arrow');\nassert.ok(!sortArrow || rawRequested.every(argument => ['--sort-arrow', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst treeFocus = rawRequested.includes('--tree-focus');"],
  ['const requested = rawRequested.filter(',"const requested = rawRequested.filter(argument => argument !== '--sort-arrow').filter("],
  ['|--tree-focus]','|--tree-focus|--sort-arrow]'],
  ['for (const [name, relative] of Object.entries(inputs)) {',`if (sortArrow) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${sortArrowReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
  ['textHeld || treeFocus)','textHeld || treeFocus || sortArrow)'],
  ["if (requested.includes('--dry-run'))",`if (sortArrow) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${sortArrowReview}';\nif (requested.includes('--dry-run'))`],
]:[
  ["import { treeFocusReview, createTreeFocusReviewReader } from '../tests/material-parity/tree-focus-registration.mjs';","import { treeFocusReview, createTreeFocusReviewReader } from '../tests/material-parity/tree-focus-registration.mjs';\nimport { sortArrowReview, createSortArrowReviewReader } from '../tests/material-parity/sort-arrow-findings.mjs';"],
  ['const applicability=treeFocusReaderFactory?.','const sortArrowReaderFactory = options.caseObligationReviewSha256===sortArrowReview ? createSortArrowReviewReader : treeFocusReaderFactory;\n    const applicability=sortArrowReaderFactory?.'],
];
export function prepareSortArrowSelection(bytes,kind){
  assert.ok(Object.hasOwn(selectionPrior,kind));let text=bytes.toString().replaceAll('\r\n','\n');assert.equal(digest(text),selectionPrior[kind]);
  for(const [a,b]of selectionChanges(kind))text=once(text,a,b);return text;
}
export function restoreSortArrowSelection(bytes,kind){
  assert.ok(Object.hasOwn(selectionPrior,kind));let text=bytes.toString().replaceAll('\r\n','\n');
  for(const [a,b]of selectionChanges(kind).toReversed())text=once(text,b,a);assert.equal(digest(text),selectionPrior[kind]);return text;
}
export function createSortArrowPriorRead({root,read}){
  const kinds=new Map(Object.entries({
    'tests/material-parity/input-equivalence-audit.mjs':'producer','tests/material-parity/input-equivalence-policy.mjs':'policy',
    'scripts/run-material-input-audit.mjs':'runner','scripts/export-material-input-audit-current-ancestry.mjs':'launcher',
  }).map(([file,kind])=>[path.resolve(root,file),kind]));
  return(name,options)=>{
    const kind=kinds.get(path.resolve(root,name));if(!kind)return read(name,options);
    const bytes=read(name),text=bytes.toString().replaceAll('\r\n','\n');
    const restored=digest(text)===(registryPrior[kind]??selectionPrior[kind])||(kind==='policy'&&digest(text)==='417d36eb37b97da5be73522d1c1cc19fac4477050c44351b7729d14cd0d7bbce')?text:Object.hasOwn(registryPrior,kind)?restoreSortArrowRegistry(bytes,kind):restoreSortArrowSelection(bytes,kind);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?Buffer.from(restored).toString(encoding):Buffer.from(restored);
  };
}
export function createSortArrowReviewReader({root,read,reviewSha256}){
  assert.equal(reviewSha256,sortArrowReview,'Only exact Sort partial review selects this reader');assert.equal(sortArrowPredecessor,treeFocusReview);
  const prior=createTreeFocusReviewReader({root,read:createSortArrowPriorRead({root,read}),reviewSha256:treeFocusReview});
  const parent=JSON.parse(prior.read(path.resolve(root,`artifacts/material-parity/working-audit/proposals/${treeFocusReview}.json`))).review;
  const joined=joinSortArrowEvidence(parent,f=>read(path.resolve(root,f)));assert.equal(joined.sha256,sortArrowReview);
  const file=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${sortArrowReview}.json`),bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:sortArrowReview,review:joined.review}));
  return{read(name,options){if(path.resolve(root,name)!==file)return prior.read(name,options);const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);},
    sourceApplicability:{mode:'exact-sort-arrow-partial-review',reviewSha256,addedChildren:62,restoredSourcePaths:4,predecessorApplicability:prior.sourceApplicability,
      boundary:'Four exact whole-source registry/selection restorations only. Historical rendering and capture-time plugin identity remain unverified;not canonical publication or case closure.'}};
}
