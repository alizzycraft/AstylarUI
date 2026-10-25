import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createEditingContextReviewReader } from './editing-context-review-source.mjs';
import { joinTextHeldEvidence,textHeldPredecessor } from '../../scripts/join-material-text-held-evidence.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
export const textHeldProducerPrior='036c7e1d05923920d4c6ebacfc916ca8a759214bd45cb4c9b8f917d632b233b1';
export const textHeldSources=Object.freeze([
  'scripts/audit-material-text-control-held-focus.mjs',
  'scripts/audit-material-text-held-event-order.mjs',
  'scripts/join-material-text-held-evidence.mjs',
  'tests/material-parity/retained-overlay-focus.spec.mjs',
  'tests/material-parity/text-held-registration.mjs',
]);
export const textHeldProofTitles=Object.freeze([
  'original text-input held rows retain post-release focus,not held-focus evidence',
  'supplementary text-control holds retain raw input owners without accepting event parity',
  'one traced text-input hold exposes blur-synthesized public release before native release',
  'Text held obligation join conserves the accepted review and validates existing full receipt rules',
  'Text held registration conserves all accepted sources and proofs without live writes',
]);
const sourceAnchor='function sourceFingerprints(root) {\n  const files = [\n';
const proofAnchor='function focusedProofInventory(root) {\n  return [\n';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const sourcePrefix=textHeldSources.map(f=>'    '+JSON.stringify(f)+',\n').join('');
const proofPrefix=textHeldProofTitles.map(title=>'    proof(root, "tests/material-parity/retained-overlay-focus.spec.mjs", new RegExp('+JSON.stringify("test\\('"+escape(title)+"'")+'),\n      '+JSON.stringify(title)+', "Bounded original/retained held-control observations and one causal witness;not current rendering,equal inputs or whole-case closure."),\n').join('');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,b);};
export function prepareTextHeldProducer(source,read){
  let text=source.toString().replaceAll('\r\n','\n');assert.equal(hash(text),textHeldProducerPrior);
  for(const f of textHeldSources){assert.equal(text.includes(JSON.stringify(f)),false);assert.ok(read(f).length>0);}
  const proof=read('tests/material-parity/retained-overlay-focus.spec.mjs').toString();
  for(const title of textHeldProofTitles)assert.equal([...proof.matchAll(new RegExp("test\\('"+escape(title)+"'",'g'))].length,1);
  text=once(text,sourceAnchor,sourceAnchor+sourcePrefix);return once(text,proofAnchor,proofAnchor+proofPrefix);
}
export function restoreTextHeldProducer(source){
  let text=source.toString().replaceAll('\r\n','\n');
  text=once(text,sourceAnchor+sourcePrefix,sourceAnchor);text=once(text,proofAnchor+proofPrefix,proofAnchor);
  assert.equal(hash(text),textHeldProducerPrior);return text;
}

export const textHeldReview='45d3fb0779cfa4d53137cfbc47225791634874026936b1abb5135222dee75588';
const selectionPrior={launcher:'c6fa9144b52a28eba0d001b4a70f85b7c30fda3987df79a53f7b208c18989a82',runner:'a9ad6a99e6f99686aa8e1dc0408753d497c2ce6bfa1e34feaef4ff3ec78add09'};
const selectionTransitions=kind=>kind==='launcher'?[
  ["const editingContext = rawRequested.includes('--editing-context');","const textHeld = rawRequested.includes('--text-held');\nassert.ok(!textHeld || rawRequested.every(argument => ['--text-held', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst editingContext = rawRequested.includes('--editing-context');"],
  ['const requested = rawRequested.filter(',"const requested = rawRequested.filter(argument => argument !== '--text-held').filter("],
  ['|--editing-context]','|--editing-context|--text-held]'],
  ['for (const [name, relative] of Object.entries(inputs)) {',`if (textHeld) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${textHeldReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
  ['dividerOwnerContext || editingContext)','dividerOwnerContext || editingContext || textHeld)'],
  ["if (requested.includes('--dry-run'))",`if (textHeld) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${textHeldReview}';\nif (requested.includes('--dry-run'))`],
]:[
  ["import { editingContextReview, createEditingContextReviewReader } from '../tests/material-parity/editing-context-review-source.mjs';","import { editingContextReview, createEditingContextReviewReader } from '../tests/material-parity/editing-context-review-source.mjs';\nimport { textHeldReview, createTextHeldReviewReader } from '../tests/material-parity/text-held-registration.mjs';"],
  ['const applicability=editingReaderFactory?.','const textHeldReaderFactory = options.caseObligationReviewSha256===textHeldReview ? createTextHeldReviewReader : editingReaderFactory;\n    const applicability=textHeldReaderFactory?.'],
];
export function prepareTextHeldSelection(source,kind){
  assert.ok(['launcher','runner'].includes(kind));let text=source.toString().replaceAll('\r\n','\n');
  assert.equal(hash(text),selectionPrior[kind]);for(const [a,b]of selectionTransitions(kind))text=once(text,a,b);return text;
}
export function restoreTextHeldSelection(source,kind){
  assert.ok(['launcher','runner'].includes(kind));let text=source.toString().replaceAll('\r\n','\n');
  for(const [a,b]of selectionTransitions(kind).toReversed())text=once(text,b,a);
  assert.equal(hash(text),selectionPrior[kind]);return text;
}
const proofTransitions=[
  ['tests/material-parity/divider-original-crop-provenance.spec.mjs','89891611696bbab5c8511793a34d97ea3406d081f4bf3b514e165e9e544e7745','9ca785898fa39aed4349afb5705ea5d782f10f7a8999dc3241be93dd49948f57','  const model=baseline.projectedGeometryModel;','  const currentness=parent.obligations.sourceCurrentness;'],
  ['docs/evidence/material-divider-light-desktop-requirement-review.json','7a90b3708d6a48428c34602d5ca8824f7fb43502fa689aca99cae9673a7d174d','dd5e4496fc416a0599007cedf6fb4edc74f0f6610055fdd1ddc8ab7bcc0b7bf1','        "projectedGeometryModel": {','        "globalBaselineEqualityAccepted": false,'],
];
export function createTextHeldPriorRead({root,read}){
  const files=new Map([
    ['tests/material-parity/input-equivalence-audit.mjs',{kind:'producer',prior:textHeldProducerPrior}],
    ['scripts/export-material-input-audit-current-ancestry.mjs',{kind:'launcher',prior:selectionPrior.launcher}],
    ['scripts/run-material-input-audit.mjs',{kind:'runner',prior:selectionPrior.runner}],
    ...proofTransitions.map(([file,current,prior,start,end])=>[file,{kind:'proof',current,prior,start,end}]),
  ].map(([file,value])=>[path.resolve(root,file),value]));
  return (name,options)=>{
    const entry=files.get(path.resolve(root,name));if(!entry)return read(name,options);
    const bytes=read(name);let text=bytes.toString().replaceAll('\r\n','\n');
    if(hash(text)===entry.prior)return read(name,options);
    if(entry.kind==='proof'){
      assert.equal(hash(text),entry.current);const start=text.indexOf(entry.start),end=text.indexOf(entry.end,start);
      assert.ok(start>=0&&end>start);text=text.slice(0,start)+text.slice(end);
    }else text=entry.kind==='producer'?restoreTextHeldProducer(text):restoreTextHeldSelection(text,entry.kind);
    assert.equal(hash(text),entry.prior);const encoding=typeof options==='string'?options:options?.encoding;
    return encoding?Buffer.from(text).toString(encoding):Buffer.from(text);
  };
}
export function createTextHeldReviewReader({root,read,reviewSha256}){
  assert.equal(reviewSha256,textHeldReview,'Only exact held-control successor selects this reader');
  const priorRead=createTextHeldPriorRead({root,read});
  const prior=createEditingContextReviewReader({root,read:priorRead,reviewSha256:textHeldPredecessor});
  const parent=JSON.parse(prior.read(path.resolve(root,`artifacts/material-parity/working-audit/proposals/${textHeldPredecessor}.json`))).review;
  const joined=joinTextHeldEvidence(parent,file=>read(path.resolve(root,file)));assert.equal(joined.sha256,textHeldReview);
  const file=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${textHeldReview}.json`);
  const bytes=Buffer.from(JSON.stringify({status:'proposal-not-canonical',sha256:textHeldReview,review:joined.review}));
  return {read(name,options){if(path.resolve(root,name)!==file)return prior.read(name,options);
    const encoding=typeof options==='string'?options:options?.encoding;return encoding?bytes.toString(encoding):Buffer.from(bytes);},
    sourceApplicability:{mode:'exact-held-text-controls',reviewSha256,addedChildren:33,predecessorApplicability:prior.sourceApplicability,
      boundary:'Explicit in-memory supplement;two whole-hash-bound proof additions and staged inventory/selection restoration only. Not canonical/current rendering or case closure.'}};
}
