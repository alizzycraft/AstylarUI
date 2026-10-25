// Pending bounded audit finding;not live registry or canonical acceptance.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createTimepickerProgrammaticFocusReviewReader} from '../../scripts/join-material-timepicker-programmatic-focus.mjs';
export const publicTabSelectionFinding=Object.freeze({
  id:'core-native-tab-selection-overwritten-by-control-sync',
  classification:'confirmed-core-renderer-defect',
  file:'src/lib/astylar-semantic-bridge.ts',
  pattern:String.raw`\['text', 'search', 'tel', 'url', 'password'\]\.includes\(node\.type\)\) \{\s*node\.setSelectionRange\(state\.selectionStart, state\.selectionEnd, state\.selectionDirection\);`,
  introducedBy:'Historical first-bad revision/runtime not established;current and installed six complete owning methods agree.',
  owner:'core native-origin focus and semantic control-selection synchronization',
  focusedProof:'tests/material-parity/public-email-selection.spec.mjs',
  observation:{
    publicPairs:4,types:['text','email'],dpr:[1,2],actions:['Tab','Z','Delete','Backspace'],
    passingControl:'Identical application source,bundle,2515 build inputs and SiteData/styles with explicit Control+A before typing:all four pairs replace correctly.',
    failure:'All four candidate Tab-entry pairs prefix Z instead of native selected replacement. Text native range[0,16],candidate[0,0];email endpoints remain null.',
    causalTrace:{pairs:1,type:'text',dpr:1,nativeInitial:[0,16],candidateInitial:[0,16],
      firstDivergence:'Queued AstylarSemanticBridge.syncControlStates invokes applyControlState,which calls setSelectionRange(0,0,"none") over the browser-created[0,16] range before typing.',
      endpointControl:'Instrumented after-Tab and after-type values/focus/selection match the uninstrumented failing pair.'},
  },
  evidence:[
    {file:'artifacts/material-parity/public-email-selection-20261025/latest-report.json',sha256:'c5ee5295c582fe7506c21b3e3124cc357e4cac82785822dfa5294d36caa26683'},
    {file:'artifacts/material-parity/public-email-tab-entry-20261025/latest-report.json',sha256:'beb04e64610f8c4ef4d6b6298ff504874d4fc2e9fbafa2c8b507fc6488fbee3a'},
    {file:'artifacts/material-parity/public-tab-selection-trace-20261025/latest-report.json',sha256:'966276cd72bd0043b30e86923b67e130a0a8048831d43906db875e754b15f1dd'},
    {file:'artifacts/material-parity/public-tab-selection-cause-owner-corrected-20261025.log',sha256:'d971268a26af1bf91f1869fda64a0a54f23808be7f95efdaacc321efd25475e3'},
  ],
  recommendation:'Preserve browser-owned selection at the native-origin focus/control-sync boundary before managed editing consumes it. Keep scene-origin programmatic focus,pointer/directional selection,updates and unsupported selection APIs separate. Do not globally selectAll,patch Material callbacks,change input types or invent email endpoints.',
  boundary:'Core mechanism demonstrated for one public text Tab-entry trace with four text/email failing pairs and four explicit-selection controls. Not email-specific setter attribution,original Material runtime causality,all focus origins,IME/clipboard,raster,full current rendering or whole-case closure. No implementation fix authorized by this audit.',
});

const hash=b=>createHash('sha256').update(b).digest('hex');
const registryPrior={producer:'a78756e84226ba44a9a0fd782b3bef6ecc58a3335a6c42ced7b20e8735859d85',policy:'51c9f568e0d0f9078060c27ad876becb918624abeea79dc7febd0339ccb1d581'};
export const focusSelectionAuditSources=Object.freeze([
  'scripts/audit-material-timepicker-programmatic-focus.mjs',
  'scripts/join-material-timepicker-programmatic-focus.mjs',
  'scripts/audit-public-email-selection.mjs',
  'scripts/audit-public-email-tab-entry.mjs',
  'scripts/audit-public-tab-selection-trace.mjs',
  'tests/material-parity/public-email-selection.spec.mjs',
  'tests/material-parity/public-tab-selection-finding.mjs',
]);
export const focusSelectionAuditProofs=Object.freeze([
  ['tests/material-parity/focus-action-scope.spec.mjs','supplementary Timepicker staged reader recovers exact historical tests and validates all dependencies'],
  ['tests/material-parity/focus-action-scope.spec.mjs','supplementary Timepicker focus join preserves the complete accepted predecessor and rejects forged evidence'],
  ['tests/material-parity/focus-action-scope.spec.mjs','supplementary Timepicker DOM focus opens only the candidate popup across eight retained contexts'],
  ['tests/material-parity/public-email-selection.spec.mjs','Focus selection staged registry preserves every accepted source proof finding and plan'],
  ['tests/material-parity/public-email-selection.spec.mjs','pending public Tab-selection finding authenticates its bounded cause without promoting the audit'],
  ['tests/material-parity/public-email-selection.spec.mjs','public Tab trace observes native selection overwritten by queued semantic control sync'],
  ['tests/material-parity/public-email-selection.spec.mjs','Tab selection trace binds complete current and installed selection-sync methods'],
  ['tests/material-parity/public-email-selection.spec.mjs','public text and email Tab-entry failures separate initial selection from explicit replacement'],
  ['tests/material-parity/public-email-selection.spec.mjs','public selection controls reuse authenticated installed keyboard-owner applicability'],
]);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const finding={...publicTabSelectionFinding,justification:publicTabSelectionFinding.observation.causalTrace.firstDivergence+' '+publicTabSelectionFinding.boundary};
const additions={
  policy:[['export const sourceAuditDefinitions = Object.freeze([\n','  Object.freeze('+JSON.stringify(finding,null,2)+'),\n']],
  producer:[
    ['function sourceFingerprints(root) {\n  const files = [\n',focusSelectionAuditSources.map(f=>'    '+JSON.stringify(f)+',\n').join('')],
    ['function focusedProofInventory(root) {\n  return [\n',focusSelectionAuditProofs.map(([file,title])=>'    proof(root, '+JSON.stringify(file)+', new RegExp('+JSON.stringify("test\\('"+escape(title)+"'")+'),\n      '+JSON.stringify(title)+', "Bounded supplementary Timepicker action and public Tab-selection cause evidence;not current rendering,original Material causality or whole-case acceptance."),\n').join('')],
    ['function implementationPlan() {\n  return [\n','    '+JSON.stringify({priority:2.06,rootCause:publicTabSelectionFinding.owner,action:publicTabSelectionFinding.recommendation+' '+publicTabSelectionFinding.boundary})+',\n'],
  ],
};
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,after);};
export function prepareFocusSelectionAuditRegistry(bytes,kind,read){
  assert.ok(Object.hasOwn(registryPrior,kind));let source=bytes.toString().replaceAll('\r\n','\n');assert.equal(hash(source),registryPrior[kind]);
  if(kind==='producer'){
    for(const file of focusSelectionAuditSources){assert.ok(read(file).length>0);assert.equal(source.includes(JSON.stringify(file)),false);}
    for(const [file,title]of focusSelectionAuditProofs)assert.equal([...read(file).toString().matchAll(new RegExp("test\\('"+escape(title)+"'",'g'))].length,1);
  }
  for(const [anchor,prefix]of additions[kind])source=once(source,anchor,anchor+prefix);return source;
}
export function restoreFocusSelectionAuditRegistry(bytes,kind){
  assert.ok(Object.hasOwn(registryPrior,kind));let source=bytes.toString().replaceAll('\r\n','\n');
  for(const [anchor,prefix]of additions[kind].toReversed())source=once(source,anchor+prefix,anchor);
  assert.equal(hash(source),registryPrior[kind]);return source;
}

export const focusSelectionReview='d47c41d3d6ac4dff3632688a36e8e20e2ec631fe0c9feca1bc05a198f36d3bab';
const selectionPrior={runner:'3eca9c8cc977ca99a05f039b8a1a1d6a47e7edd325af0bd3e15db606194f07ca',launcher:'3dc88f081af3b239d59d85a915a62495c9344cf2fa04ed98e3eafd52577bdf70'};
const selectionChanges=kind=>kind==='launcher'?[
  ["const sortArrow = rawRequested.includes('--sort-arrow');","const focusSelection = rawRequested.includes('--focus-selection');\nassert.ok(!focusSelection || rawRequested.every(argument => ['--focus-selection', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst sortArrow = rawRequested.includes('--sort-arrow');"],
  ['const requested = rawRequested.filter(',"const requested = rawRequested.filter(argument => argument !== '--focus-selection').filter("],
  ['|--sort-arrow]','|--sort-arrow|--focus-selection]'],
  ['for (const [name, relative] of Object.entries(inputs)) {',`if (focusSelection) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${focusSelectionReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
  ['treeFocus || sortArrow)','treeFocus || sortArrow || focusSelection)'],
  ["if (requested.includes('--dry-run'))",`if (focusSelection) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${focusSelectionReview}';\nif (requested.includes('--dry-run'))`],
]:[
  ["import { sortArrowReview, createSortArrowReviewReader } from '../tests/material-parity/sort-arrow-findings.mjs';","import { sortArrowReview, createSortArrowReviewReader } from '../tests/material-parity/sort-arrow-findings.mjs';\nimport { focusSelectionReview, createFocusSelectionAuditReviewReader } from '../tests/material-parity/public-tab-selection-finding.mjs';"],
  ['const applicability=sortArrowReaderFactory?.','const focusSelectionReaderFactory = options.caseObligationReviewSha256===focusSelectionReview ? createFocusSelectionAuditReviewReader : sortArrowReaderFactory;\n    const applicability=focusSelectionReaderFactory?.'],
  ['    audit.coverage = attachCaseObligationCoverage(audit.coverage,',"    assert.ok(!applicability || typeof applicability.then !== 'function', 'Audit evidence readers must be synchronous within evidence session');\n    audit.coverage = attachCaseObligationCoverage(audit.coverage,"],
];
export function prepareFocusSelectionAuditSelection(bytes,kind){
  assert.ok(Object.hasOwn(selectionPrior,kind));let source=bytes.toString().replaceAll('\r\n','\n');assert.equal(hash(source),selectionPrior[kind]);
  for(const [before,after]of selectionChanges(kind))source=once(source,before,after);return source;
}
export function restoreFocusSelectionAuditSelection(bytes,kind){
  assert.ok(Object.hasOwn(selectionPrior,kind));let source=bytes.toString().replaceAll('\r\n','\n');
  for(const [before,after]of selectionChanges(kind).toReversed())source=once(source,after,before);
  assert.equal(hash(source),selectionPrior[kind]);return source;
}
const sharedPrior='d6fbdca941896c58f162c47748792183fd218015dabd8cff628979fc4d222892';
const sharedChanges=[
  ["import {restoreSortArrowRegistry,restoreSortArrowSelection} from './sort-arrow-findings.mjs';","import {restoreSortArrowRegistry,restoreSortArrowSelection} from './sort-arrow-findings.mjs';\nimport {restoreFocusSelectionAuditRegistry,restoreFocusSelectionAuditSelection,restoreFocusSelectionSharedSource} from './public-tab-selection-finding.mjs';"],
  ['export function restoreTreeFocusRegistry(bytes,kind){',"export function restoreTreeFocusRegistry(bytes,kind){\n  if(bytes.toString().includes('core-native-tab-selection-overwritten-by-control-sync')||bytes.toString().includes('\"scripts/audit-material-timepicker-programmatic-focus.mjs\"'))bytes=restoreFocusSelectionAuditRegistry(bytes,kind);"],
  ['export function restoreTreeFocusSelection(bytes,kind){',"export function restoreTreeFocusSelection(bytes,kind){\n  if(bytes.toString().includes('--focus-selection')||bytes.toString().includes('focusSelectionReaderFactory'))bytes=restoreFocusSelectionAuditSelection(bytes,kind);"],
  ['  return (name,options)=>{\n    const kind=paths.get',"  return (name,options)=>{\n    if(path.resolve(root,name)===path.resolve(root,'tests/material-parity/tree-focus-registration.mjs')){\n      const source=restoreFocusSelectionSharedSource(read(name)),encoding=typeof options==='string'?options:options?.encoding;return encoding?Buffer.from(source).toString(encoding):Buffer.from(source);\n    }\n    const kind=paths.get"],
];
export function prepareFocusSelectionSharedSource(bytes){
  let source=bytes.toString().replaceAll('\r\n','\n');assert.equal(hash(source),sharedPrior);
  for(const [before,after]of sharedChanges)source=once(source,before,after);return source;
}
export function restoreFocusSelectionSharedSource(bytes){
  let source=bytes.toString().replaceAll('\r\n','\n');if(hash(source)===sharedPrior)return source;
  for(const [before,after]of sharedChanges.toReversed())source=once(source,after,before);
  assert.equal(hash(source),sharedPrior,'Complete shared replay predecessor must recover');return source;
}
const sortSharedPrior='4cfa22bd2a6ebd16e2a612cb19e9c01d7219151a16839877ff1cacc304882813';
const sortSharedChanges=[
  ["import {createHash} from 'node:crypto';","import {createHash} from 'node:crypto';\nimport {createFocusSelectionAuditPriorRead} from './public-tab-selection-finding.mjs';"],
  ['export function createSortArrowPriorRead({root,read}){','export function createSortArrowPriorRead({root,read}){\n  read=createFocusSelectionAuditPriorRead({root,read});'],
];
export function prepareFocusSelectionSortSource(bytes){let source=bytes.toString().replaceAll('\r\n','\n');assert.equal(hash(source),sortSharedPrior);for(const [a,b]of sortSharedChanges)source=once(source,a,b);return source;}
export function restoreFocusSelectionSortSource(bytes){let source=bytes.toString().replaceAll('\r\n','\n');if(hash(source)===sortSharedPrior)return source;for(const [a,b]of sortSharedChanges.toReversed())source=once(source,b,a);assert.equal(hash(source),sortSharedPrior);return source;}
export function createFocusSelectionAuditPriorRead({root,read}){
  const kinds=new Map(Object.entries({
    'tests/material-parity/input-equivalence-audit.mjs':'producer','tests/material-parity/input-equivalence-policy.mjs':'policy',
    'scripts/run-material-input-audit.mjs':'runner','scripts/export-material-input-audit-current-ancestry.mjs':'launcher',
    'tests/material-parity/tree-focus-registration.mjs':'tree-replay','tests/material-parity/sort-arrow-findings.mjs':'sort-replay',
  }).map(([file,kind])=>[path.resolve(root,file),kind]));
  const priorRead=(name,options)=>{
    const kind=kinds.get(path.resolve(root,name));if(!kind)return read(name,options);
    const source=read(name).toString().replaceAll('\r\n','\n');
    const prior=kind==='tree-replay'?restoreFocusSelectionSharedSource(source):kind==='sort-replay'?restoreFocusSelectionSortSource(source):hash(source)===(registryPrior[kind]??selectionPrior[kind])?source:
      Object.hasOwn(registryPrior,kind)?restoreFocusSelectionAuditRegistry(source,kind):restoreFocusSelectionAuditSelection(source,kind);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?Buffer.from(prior).toString(encoding):Buffer.from(prior);
  };
  return priorRead;
}
export function createFocusSelectionAuditReviewReader({root,read,reviewSha256}){
  assert.equal(reviewSha256,focusSelectionReview,'Only exact supplementary focus/selection review selects this reader');
  const priorRead=createFocusSelectionAuditPriorRead({root,read});
  const reader=createTimepickerProgrammaticFocusReviewReader({root,read:priorRead});assert.equal(reader.sha256,reviewSha256);
  return {...reader,sourceApplicability:{mode:'exact-focus-selection-partial-review',restoredRegistrySelectionSources:4,
    predecessorApplicability:reader.sourceApplicability,boundary:'Exact whole-source registry/selection plus historical test restorations only;not canonical publication,original Material cause,current rendering or case closure.'}};
}
