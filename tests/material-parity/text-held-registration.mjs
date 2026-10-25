import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

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
