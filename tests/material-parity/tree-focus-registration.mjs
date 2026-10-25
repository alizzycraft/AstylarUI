import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {treeFocusFindings} from './tree-focus-findings.mjs';
import path from 'node:path';
import {createTextHeldReviewReader,textHeldReview} from './text-held-registration.mjs';
import {joinTreeFocusEvidence,treeFocusPredecessor} from '../../scripts/join-material-tree-focus-evidence.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const prior={producer:'626f7af1259251792e11e81a76470409d5f9b16159e1ad3c11f5d48b65e04755',policy:'a363d8f56fd4271a61138dbcd5bdd951603b7cd3521df3bdf40fbf955315d04e'};
export const treeFocusSources=Object.freeze([
  'scripts/audit-material-tree-pointer-tabstop.mjs',
  'scripts/audit-public-tree-fixed-tabstop.mjs',
  'scripts/audit-public-tree-tab-exit-trace.mjs',
  'scripts/join-material-tree-focus-evidence.mjs',
  'tests/material-parity/tree-focus-findings.mjs',
  'tests/material-parity/tree-tabstop-inputs.spec.mjs',
  'tests/material-parity/tree-focus-registration.mjs',
]);
export const treeFocusProofTitles=Object.freeze([
  'pending Tree findings keep authoring and public core failure scopes separate',
  'Tree partial evidence join conserves its exact predecessor and all remaining case work',
  'one equal-input Tab-exit trace binds pointer-move canvas tab restoration and semantic refocus',
  'equal-input public fixed-tabstop probe distinguishes forward traversal from backward canvas reentry',
  'current semantic Tab routing leaves nonmodal browser defaults intact unless authored handling cancels',
  'all retained tree pointer contexts expose fixed candidate tab stops behind normalized focus',
  'current and initial tree authoring keep the first tab stop independently of focused leaf',
  'one actual Tree DOM context preserves fixed requested tab stops and divergent traversal',
  'Tree staged registry conserves every live source proof finding and plan without writes',
]);
const actions=[
  {priority:0.15,rootCause:'Babylon pointer move reintroduces canvas sequential focus and semantic sync recaptures backward exit',action:treeFocusFindings[1].action+' Preserve the uninstrumented equal-input pair and authenticated causal trace;historical introduction and broader contexts remain open.'},
  {priority:2.1,rootCause:'Tree authored roving tab stop remains fixed on the first item',action:treeFocusFindings[0].action+' Preserve the independent core Tab-exit finding;do not confuse equivalent fixed-tabstop forward behavior with Material roving-state parity.'},
];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const sourceAnchor='function sourceFingerprints(root) {\n  const files = [\n';
const proofAnchor='function focusedProofInventory(root) {\n  return [\n';
const planAnchor='function implementationPlan() {\n  return [\n';
const definitionAnchor='export const sourceAuditDefinitions = Object.freeze([\n';
const sourcePrefix=treeFocusSources.map(f=>'    '+JSON.stringify(f)+',\n').join('');
const proofPrefix=treeFocusProofTitles.map(title=>'    proof(root, "tests/material-parity/tree-tabstop-inputs.spec.mjs", new RegExp('+JSON.stringify("test\\('"+escape(title)+"'")+'),\n      '+JSON.stringify(title)+', "Bounded Tree input,raw-owner,public Tab-exit and conservation evidence;not current rendering or whole-case acceptance."),\n').join('');
const planPrefix=actions.map(a=>'    '+JSON.stringify(a)+',\n').join('');
const patterns=[String.raw`tabindex: index === 0 \? 0 : -1`,String.raw`this\.canvas\.tabIndex = -1`];
const definitionPrefix=treeFocusFindings.map((f,i)=>'  Object.freeze('+JSON.stringify({...f,pattern:patterns[i],justification:f.observation.firstDivergence+' '+f.boundary},null,2)+'),\n').join('');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,b);};
export function prepareTreeFocusRegistry(bytes,kind,read){
  assert.ok(Object.hasOwn(prior,kind));let text=bytes.toString().replaceAll('\r\n','\n');assert.equal(hash(text),prior[kind]);
  if(kind==='policy')return once(text,definitionAnchor,definitionAnchor+definitionPrefix);
  for(const f of treeFocusSources){assert.ok(read(f).length>0);assert.equal(text.includes(JSON.stringify(f)),false);}
  const proof=read('tests/material-parity/tree-tabstop-inputs.spec.mjs').toString();
  for(const title of treeFocusProofTitles)assert.equal([...proof.matchAll(new RegExp("test\\('"+escape(title)+"'",'g'))].length,1);
  text=once(text,sourceAnchor,sourceAnchor+sourcePrefix);text=once(text,proofAnchor,proofAnchor+proofPrefix);
  return once(text,planAnchor,planAnchor+planPrefix);
}
export function restoreTreeFocusRegistry(bytes,kind){
  assert.ok(Object.hasOwn(prior,kind));let text=bytes.toString().replaceAll('\r\n','\n');
  if(kind==='policy')text=once(text,definitionAnchor+definitionPrefix,definitionAnchor);
  else{for(const [anchor,prefix]of [[sourceAnchor,sourcePrefix],[proofAnchor,proofPrefix],[planAnchor,planPrefix]])text=once(text,anchor+prefix,anchor);}
  assert.equal(hash(text),prior[kind]);return text;
}
export const treeFocusReview='6ea59073771388cec874ad6985e38823f68d1d72ab7c37d72cb61c5e11a0e411';
const selectionPrior={launcher:'7af19a4f6ba2dcaa46b40b4faf67a6aad773ebe15f9e4f05ffd89a854bcd805d',runner:'d98689c7cef5015894a8ccf6a382c956798f08cf9c911b604ceb929a7228a89a'};
const selectionTransitions=kind=>kind==='launcher'?[
  ["const textHeld = rawRequested.includes('--text-held');","const treeFocus = rawRequested.includes('--tree-focus');\nassert.ok(!treeFocus || rawRequested.every(argument => ['--tree-focus', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst textHeld = rawRequested.includes('--text-held');"],
  ['const requested = rawRequested.filter(',"const requested = rawRequested.filter(argument => argument !== '--tree-focus').filter("],
  ['|--text-held]','|--text-held|--tree-focus]'],
  ['for (const [name, relative] of Object.entries(inputs)) {',`if (treeFocus) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${treeFocusReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
  ['editingContext || textHeld)','editingContext || textHeld || treeFocus)'],
  ["if (requested.includes('--dry-run'))",`if (treeFocus) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${treeFocusReview}';\nif (requested.includes('--dry-run'))`],
]:[
  ["import { textHeldReview, createTextHeldReviewReader } from '../tests/material-parity/text-held-registration.mjs';","import { textHeldReview, createTextHeldReviewReader } from '../tests/material-parity/text-held-registration.mjs';\nimport { treeFocusReview, createTreeFocusReviewReader } from '../tests/material-parity/tree-focus-registration.mjs';"],
  ['const applicability=textHeldReaderFactory?.','const treeFocusReaderFactory = options.caseObligationReviewSha256===treeFocusReview ? createTreeFocusReviewReader : textHeldReaderFactory;\n    const applicability=treeFocusReaderFactory?.'],
];
export function prepareTreeFocusSelection(bytes,kind){
  assert.ok(Object.hasOwn(selectionPrior,kind));let text=bytes.toString().replaceAll('\r\n','\n');assert.equal(hash(text),selectionPrior[kind]);
  for(const [a,b]of selectionTransitions(kind))text=once(text,a,b);return text;
}
export function restoreTreeFocusSelection(bytes,kind){
  assert.ok(Object.hasOwn(selectionPrior,kind));let text=bytes.toString().replaceAll('\r\n','\n');
  for(const [a,b]of selectionTransitions(kind).toReversed())text=once(text,b,a);assert.equal(hash(text),selectionPrior[kind]);return text;
}
const replayPrior='1421a151e00273dfdc1796af0a48b3b2e5810130d4f2a689c0fcf1b09e729f30';
const pendingPrior='2ecab5e23e19625604db60f59e9fd0dd659cb05c0bd9b41ebc2e0476ac17e8e7';
const heldProofPrior='1567cecbfaaa02dc6ca3028213c9c42d33a05644eb141fea6e3b6b4ce8250dc1';
const dividerProofPrior='653231b57d60e6c358389250394d53e2d90fb2f9b20648cbb056f8465e28fa02';
const editingReplayPrior='15793066d47a31f940f8497270bb1c205100ee1e184f173ec7cd1bc450f0a8b4';
export function restoreTreeFocusEditingSource(bytes){
  let text=bytes.toString().replaceAll('\r\n','\n');if(hash(text)===editingReplayPrior)return text;
  text=once(text,"  if(kind==='proof')source=createTextHeldPriorRead({root:process.cwd(),read:()=>source})('tests/material-parity/divider-owner-context-registration.spec.mjs');\n",'');
  assert.equal(hash(text),editingReplayPrior);return text;
}
export function restoreTreeFocusDividerProof(bytes){
  let text=bytes.toString().replaceAll('\r\n','\n');if(hash(text)===dividerProofPrior)return text;
  text=once(text,"import { createTreeFocusPriorRead } from './tree-focus-registration.mjs';\n",'');
  text=once(text,"assert.equal(createTreeFocusPriorRead({root:process.cwd(),read:readFileSync})(file,'utf8'),staged,'Live policy", "assert.equal(bytes.toString().replaceAll('\\r\\n','\\n'),staged,'Live policy");
  assert.equal(hash(text),dividerProofPrior);return text;
}
export function restoreTreeFocusHeldProof(bytes){
  let text=bytes.toString().replaceAll('\r\n','\n');if(hash(text)===heldProofPrior)return text;
  text=once(text,"import { createTreeFocusPriorRead } from './tree-focus-registration.mjs';\nconst readHeldStage=createTreeFocusPriorRead({root:process.cwd(),read:readFileSync});\n",'');
  text=once(text,"readHeldStage(file,'utf8'),bytes.toString()","readFileSync(file,'utf8').replaceAll('\\r\\n','\\n'),bytes.toString()");
  text=once(text,"live=readHeldStage(file,'utf8'),before=acceptedRead","live=readFileSync(file,'utf8').replaceAll('\\r\\n','\\n'),before=acceptedRead");
  text=once(text,"assert.equal(readHeldStage(file,'utf8'),live);","assert.equal(readFileSync(file,'utf8').replaceAll('\\r\\n','\\n'),live);");
  assert.equal(hash(text),heldProofPrior);return text;
}
const pendingExportHook=`  if(source.toString().includes(kind==='runner'?'menuSelectDisabledReview':'const menuSelectDisabled =')){
    const file=path.resolve(kind==='runner'?'scripts/run-material-input-audit.mjs':'scripts/export-material-input-audit-current-ancestry.mjs');
    const read=(name,options)=>path.resolve(name)===file?(typeof options==='string'?source.toString(options):Buffer.from(source)):readFileSync(name,options);
    source=createMenuHistoricalRead({root:process.cwd(),read})(file);
  }
`;
export function restoreTreeFocusPendingSource(bytes){
  let text=bytes.toString().replaceAll('\r\n','\n');if(hash(text)===pendingPrior||hash(text)==='638e41f56b35c7be24abd563b631cbc1c41345324814c041fa2f30078ad75d3c')return text;
  text=once(text,pendingExportHook,'');assert.equal(hash(text),pendingPrior);return text;
}
const inheritedStages={
  // Editing-context replay can pass its fully restored Divider proof through
  // this reader again. Accept that exact predecessor, never marker absence.
  'divider-proof':['035e13aab28532b8e832992c1027ab15d340193d5940df46af5917e0a67380e7'],
  policy:['cbf641365e8ab55748befc3e59c283e30eadab314519c8f9fbf7f5647f4a7b30'],
  producer:['036c7e1d05923920d4c6ebacfc916ca8a759214bd45cb4c9b8f917d632b233b1','ec5be8ce8f6a47371e22b4c041abcc677013d9263834edc4a6ae4b94d07c906d','d791949cfe8a3821d76250379e0c68795759d2f88650ad3414ceeaa7dbd52b17'],
  launcher:['c6fa9144b52a28eba0d001b4a70f85b7c30fda3987df79a53f7b208c18989a82','5168a9b9165fdae234bd90b1db314923a385bbca52b39f536d649dcac30ce955','625e585f51d670cceb52a2eaa0600c70d6051d91c7c743bed1ad4e71f2f6673c'],
  runner:['a9ad6a99e6f99686aa8e1dc0408753d497c2ce6bfa1e34feaef4ff3ec78add09','34f44830880417b629269d5782131dd9c84c149103b52628ae227573f5c9a005','d6b7a4f8704689f5e1a44b0b45795c43913aca48181eefd12179c125856e8bb9'],
};
export function restoreTreeFocusReplaySource(bytes){
  let text=bytes.toString().replaceAll('\r\n','\n');if(hash(text)===replayPrior)return text;
  for(const hook of [
    "import { createTreeFocusPriorRead, restoreTreeFocusRegistry, restoreTreeFocusSelection } from './tree-focus-registration.mjs';\n",
    "import { restoreTreeFocusPendingSource } from './tree-focus-registration.mjs';\n",
    "  if(kind==='pending')source=restoreTreeFocusPendingSource(source);\n",
    '  if(source.toString().includes(\'"scripts/audit-material-tree-pointer-tabstop.mjs"\'))source=restoreTreeFocusRegistry(source,\'producer\');\n',
    "  if(source.toString().includes('--tree-focus'))source=restoreTreeFocusSelection(source,kind);\n",
    '  read=createTreeFocusPriorRead({root,read});\n',
  ])text=once(text,hook,'');
  assert.equal(hash(text),replayPrior);return text;
}
export function createTreeFocusPriorRead({root,read}){
  const paths=new Map([['tests/material-parity/input-equivalence-audit.mjs','producer'],['tests/material-parity/input-equivalence-policy.mjs','policy'],
    ['scripts/export-material-input-audit-current-ancestry.mjs','launcher'],['scripts/run-material-input-audit.mjs','runner'],
    ['tests/material-parity/text-held-registration.mjs','replay'],['tests/material-parity/pending-evidence-registration.mjs','pending'],
    ['tests/material-parity/retained-overlay-focus.spec.mjs','held-proof'],['tests/material-parity/divider-owner-context-registration.spec.mjs','divider-proof'],
    ['tests/material-parity/editing-context-registration.mjs','editing-replay']].map(([f,k])=>[path.resolve(root,f),k]));
  return (name,options)=>{
    const kind=paths.get(path.resolve(root,name));if(!kind)return read(name,options);
    const bytes=read(name),text=bytes.toString().replaceAll('\r\n','\n');
    if(hash(text)===(kind==='editing-replay'?editingReplayPrior:kind==='divider-proof'?dividerProofPrior:kind==='held-proof'?heldProofPrior:kind==='pending'?pendingPrior:kind==='replay'?replayPrior:prior[kind]??selectionPrior[kind]))return read(name,options);
    if(inheritedStages[kind]?.includes(hash(text)))return read(name,options);
    if(kind==='producer')assert.ok(text.includes('"scripts/audit-material-tree-pointer-tabstop.mjs"'),'Unexpected producer stage '+hash(text));
    if(kind==='policy')assert.ok(text.includes('core-pointer-move-restores-canvas-tabstop-and-recaptures-backward-exit'),'Unexpected policy stage '+hash(text));
    const restored=kind==='editing-replay'?restoreTreeFocusEditingSource(bytes):kind==='divider-proof'?restoreTreeFocusDividerProof(bytes):kind==='held-proof'?restoreTreeFocusHeldProof(bytes):kind==='pending'?restoreTreeFocusPendingSource(bytes):kind==='replay'?restoreTreeFocusReplaySource(bytes):Object.hasOwn(prior,kind)?restoreTreeFocusRegistry(bytes,kind):restoreTreeFocusSelection(bytes,kind),encoding=typeof options==='string'?options:options?.encoding;
    return encoding?Buffer.from(restored).toString(encoding):Buffer.from(restored);
  };
}
export function createTreeFocusReviewReader({root,read,reviewSha256}){
  assert.equal(reviewSha256,treeFocusReview,'Only exact Tree partial review selects this reader');
  assert.equal(treeFocusPredecessor,textHeldReview);
  const priorRead=createTreeFocusPriorRead({root,read});
  const parentReader=createTextHeldReviewReader({root,read:priorRead,reviewSha256:textHeldReview});
  const parent=JSON.parse(parentReader.read(path.resolve(root,`artifacts/material-parity/working-audit/proposals/${textHeldReview}.json`))).review;
  const joined=joinTreeFocusEvidence(parent,f=>read(path.resolve(root,f)));assert.equal(joined.sha256,treeFocusReview);
  const file=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${treeFocusReview}.json`);
  const bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:treeFocusReview,review:joined.review}));
  return{read(name,options){if(path.resolve(root,name)!==file)return parentReader.read(name,options);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);},
    sourceApplicability:{mode:'exact-tree-tabstop-partial-review',reviewSha256,addedChildren:53,restoredSourcePaths:9,predecessorApplicability:parentReader.sourceApplicability,
      boundary:'Nine exact whole-source-bound registry,selection,helper and proof restorations only;all prior assertions and remaining case work preserve. Not canonical,current rendering or case closure.'}};
}
