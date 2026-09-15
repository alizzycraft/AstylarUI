import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inspectTransformOriginDeclarationStage } from '../tests/material-parity/transform-origin-stage-evidence.mjs';

assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'));
const file = 'docs/material-transform-origin-stage-survey.json';
const capturePath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const sha = value => createHash('sha256').update(value).digest('hex');
const bytes = readFileSync(capturePath), captureSha256 = sha(bytes);
assert.equal(captureSha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), rows = [], controls = [], tested = new Set(), treeFiles = new Set();
const load = ref => { const data = readFileSync(ref.file); assert.equal(sha(data), ref.sha256); treeFiles.add(ref.file); return JSON.parse(data); };
const inactive = v => v === undefined || ['none', 'matrix(1,0,0,1,0,0)'].includes(v.replace(/\s/g, ''));
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
  const inputs = entry.styleInputs.filter(i => i.reference?.transformOrigin !== undefined && i.astylar?.transformOrigin === undefined &&
    inactive(i.reference?.transform) && inactive(i.astylar?.transform));
  if (!inputs.length) continue;
  const reference = load(entry.inputTrees.reference), candidate = load(entry.inputTrees.astylar);
  for (const input of inputs) {
    const before = sha(JSON.stringify([input, reference, candidate]));
    const proof = inspectTransformOriginDeclarationStage(entry, reference, candidate, input);
    assert.equal(sha(JSON.stringify([input, reference, candidate])), before);
    rows.push({ case: `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`,
      family: entry.family, element: input.id, referenceOrigin: input.reference.transformOrigin,
      referenceTransform: input.reference.transform ?? '<omitted>', inputTrees: entry.inputTrees, ...proof });
    if (proof.status !== 'observed-declaration-stage-gap') continue;
    const key = `${proof.referenceType}/${proof.candidateType}/${proof.mapping.status}`;
    if (tested.has(key)) continue; tested.add(key);
    const mutations = [
      ['changed-reference-origin', (r, a, i) => { i.reference.transformOrigin = '99999px 99999px'; }],
      ['replaced-reference-property', (r, a, i) => { delete i.reference.width; i.reference.direction = 'ltr'; }],
      ['explicit-reference-origin', r => { r.nodes.find(n => n.key === proof.referenceNode).inline['transform-origin'] = { value: '0px 0px', important: false }; }],
      ['reference-ancestor-reset', r => { r.nodes.find(n => n.key === proof.referencePath[0].key).inline.all = { value: 'initial', important: false }; }],
      ['reference-motion-request', r => { r.nodes.find(n => n.key === proof.referenceNode).inline.animation = { value: 'origin-motion 1s', important: false }; }],
      ['candidate-origin-request', (r, a) => { a.nodes.find(n => n.key === proof.candidateNode).authored.style = { transformOrigin: '0px 0px' }; }],
      ['candidate-ancestor-request', (r, a) => { a.rules.push({ selector: '*', transformBox: 'content-box' }); }],
      ['candidate-stage-request', (r, a, i) => { a.nodes.find(n => n.key === proof.candidateNode).normalResolvedStyle.transformOrigin = '0px 0px'; i.astylarNormalResolvedStyle.transformOrigin = '0px 0px'; }],
      ['missing-provenance', (r, a) => { delete a.resolvedStyleEvidenceVersion; }],
      ['missing-ancestor', r => { r.nodes.find(n => n.key === proof.referenceNode).parent = '__missing'; }],
    ];
    for (const [mutation, mutate] of mutations) {
      const r = structuredClone(reference), a = structuredClone(candidate), i = structuredClone(input);
      mutate(r, a, i); const result = inspectTransformOriginDeclarationStage(entry, r, a, i);
      assert.equal(result.status, 'unresolved', `${key}: ${mutation}`);
      controls.push({ context: key, mutation, status: result.status, reason: result.reason });
    }
  }
}
assert.equal(rows.length, 6938);
const reasons = {}, byFamily = {}, signatures = new Map();
for (const row of rows) {
  const reason = row.status === 'observed-declaration-stage-gap' ? row.attribution : row.reason;
  reasons[reason] = (reasons[reason] ?? 0) + 1;
  const family = byFamily[row.family] ??= { observedStageGap: 0, unresolved: 0 };
  family[row.status === 'observed-declaration-stage-gap' ? 'observedStageGap' : 'unresolved']++;
  const key = JSON.stringify([row.family, row.element, row.referenceTransform.replace(/\s/g, ''), row.referenceOrigin]);
  if (!signatures.has(key)) signatures.set(key, new Set()); signatures.get(key).add(row.status);
}
const originalProofCommit = '3c040455a35160825dfd3d69f18de993ec7f3134';
const originalCoreFiles = ['src/app/services/dom/elements/css-transform.ts', 'src/app/services/dom/elements/element-material.service.ts',
  'src/app/services/dom/elements/element-creation.service.ts', 'src/app/types/style-rule.ts', 'src/app/types/transform-data.ts'];
const reusedCoreProof = originalCoreFiles.map(file => {
  const current = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const original = execFileSync('git', ['show', originalProofCommit + ':' + file], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  assert.equal(current, original, file);
  return { file, originalProofCommit, unchanged: true, sha256: sha(current) };
});
const sourceFiles = ['scripts/audit-material-transform-origin-stages.mjs', 'tests/material-parity/transform-origin-stage-evidence.mjs',
  'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
  'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs',
  'tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/run-material-parity.mjs', 'tests/material-parity/input-tree-evidence.mjs',
  'examples/material-showcase/src/app/material-input-evidence.ts', 'src/lib/astylar.ts'];
const summary = { observations: rows.length, observedStageGaps: rows.filter(r => r.status === 'observed-declaration-stage-gap').length,
  unresolved: rows.filter(r => r.status === 'unresolved').length, reasons, byFamily, rawSignatures: signatures.size,
  mixedDispositionSignatures: [...signatures.values()].filter(v => v.size > 1).length,
  mutationControls: controls.length, mutationContexts: tested.size, checkedTreeFiles: treeFiles.size };
const record = { schemaVersion: 1, kind: 'transform-origin-declaration-stage-provenance', baselineCommit: 'edd2fc4',
  capturePath, captureSha256, scope: 'Guarded diagnostic attribution only; main audit classifier and renderer unchanged.', summary,
  observations: rows, mutationControls: controls, reusedCoreProof,
  existingCoreFinding: 'core-transform-origin-not-authored-or-applied',
  collectorStages: { reference: 'captureBrowserInputTree getComputedStyle(element) and styleId(computed)',
    candidate: 'Astylar.inspectCurrentDocumentStyles normal/effective cascade declarations, copied by collectMaterialCoreResolvedStyles and materialStyleSnapshot',
    boundary: 'Neither candidate path calculates a used transform origin. ElementMaterialService.applyTransforms has no origin argument. The confirmed public transform-subset limitation remains distinct from absent authored-origin declarations.' },
  limitations: ['No origin is classified equivalent and no candidate computed value/reference-box geometry is synthesized.',
    'Motion contexts remain unresolved rather than assuming benchmark animation suppression proves every state.',
    'Captured ancestry and matched rules do not prove uncaptured outer scopes or UA rules. The attribution concerns observed stages only.',
    'The original public browser origin reductions are reused as historical evidence; unchanged core source is verified, not a new renderer/browser run.',
    'Main audit counts, source/proof inventory, canonical payload and full harness are not changed by this standalone proof.'],
  sourceFingerprints: sourceFiles.map(file => ({ file, sha256: sha(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) })) };
const output = JSON.stringify(record, null, 2) + '\n';
if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), output);
else writeFileSync(file, output);
console.log(JSON.stringify({ mode: process.argv[2] === '--check' ? 'check' : 'generate', file, summary, bytes: Buffer.byteLength(output), sha256: sha(output) }));
