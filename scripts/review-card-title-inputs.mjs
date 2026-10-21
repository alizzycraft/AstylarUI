import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
assert.equal(definitions.length, 175);
assert.equal(hash(JSON.stringify(definitions)), '1d87ea04c45cbd796bb6dc627f77e7349253ef0d8d1e25a40ca0c87ed633b474');
const proofFile = 'artifacts/material-parity/card-static-ax-review-20261021.log';
const proofBytes = execFileSync(process.execPath, ['scripts/check-card-static-ax.mjs'], { maxBuffer: 2000000 });
assert.deepEqual(proofBytes, fs.readFileSync(proofFile));
const proof = JSON.parse(proofBytes); assert.equal(proof.pairs, 12);
const revision = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const reference = 'examples/material-showcase/src/app/reference.component.ts';
const pattern = "type: 'h2', id: 'card-title'";
const history = [[candidate, '6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24', pattern],
  [reference, '2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e', '<mat-card-title>Project Atlas</mat-card-title>']]
  .map(([file, sha256, excerpt]) => {
    const bytes = execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 4000000 });
    assert.equal(hash(bytes), sha256); assert.ok(bytes.toString().includes(excerpt));
    return { revision, file, sha256, excerpt };
  });
assert.equal(fs.readFileSync(candidate, 'utf8').split(pattern).length, 2);
const finding = {
  id: 'fixture-card-title-promoted-to-heading',
  introducedBy: 'Initial2f440115 candidate authors H2 versus native MAT-CARD-TITLE;initial runtime and motive unproven',
  file: candidate, pattern, classification: 'application-plugin-authoring-defect',
  owner: 'Material showcase card title semantic element authoring',
  focusedProof: 'node scripts/check-card-static-ax.mjs',
  observation: { component: 'card-title', pairedStaticCases: 12, captures: 24,
    reference: 'MAT-CARD-TITLE generic container with StaticText Project Atlas',
    astylar: 'H2 heading level2 named Project Atlas with the same StaticText',
    stage: 'authored title tag before semantic bridge projection' },
  justification: 'All12 pinned static pairs resolve actual AX nodes through backend DOM identity and preserve the same title text. Candidate explicitly authors H2;the reference custom element exposes generic. Complete current component/source-map bindings and initial Git source authenticate. This is a semantic authoring substitution,not a renderer-invented heading. Native header-text wrapper omission is separately observed and does not prove a core flex defect;the already-classified normal/nowrap and font-family inputs are not duplicate findings.',
  history,
  evidence: [candidate, reference, 'scripts/capture-card-static-ax.mjs', 'scripts/check-card-static-ax.mjs',
    'scripts/check-card-recorded-nodes.mjs', proofFile, proof.report.file,
    'artifacts/material-parity/card-recorded-node-accounting-20261021.log',
    'artifacts/material-parity/card-header-formatting-boundary-20261021.log',
    ...proof.observations.map(row => row.file)].map(receipt),
  recommendation: 'Preserve the reference title semantic contract and formatting ancestry in comparison authoring. Do not suppress correctly requested heading roles in core or tune title offsets to conceal unequal inputs.',
  boundary: 'Actual AX for12 static contexts only;not interaction AX,AT traversal,all descriptions/associations,anonymous formatting,constrained wrapping,current paint,initial runtime or compensation motive.',
};
assert.equal(definitions.some(row => row.id === finding.id), false);
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: 175, sha256: hash(JSON.stringify(definitions)) }, groups: [...definitions, finding] };
assert.deepEqual(review.groups.slice(0, -1), definitions);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
assert.equal(hash(JSON.stringify(JSON.parse(fs.readFileSync(saved.file)).review)), saved.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/review-card-title-inputs.mjs'), saved,
  complete175PredecessorPreserved: true, initialHistoryReauthenticated: true,
  actualAxVerifierReplayedExactly: true, initialHistory: history,
  canonicalPublication: false, registrationPending: true, renderingAccepted: false }));
