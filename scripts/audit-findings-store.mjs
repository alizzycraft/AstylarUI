import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import Parser from 'jsonparse';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const atomicJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n'); fs.renameSync(temporary, file);
};
const fields = ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'classification',
  'attribution', 'justification', 'recommendedOwner', 'cases', 'reviewedCases', 'states', 'case', 'id', 'title'];
export function compactFinding(row, section, ordinal, sourceSha256) {
  return { ...Object.fromEntries(fields.filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]])),
    id: digest([sourceSha256, section, ordinal]),
    evidence: { sourceSha256, section, ordinal, completeRowSha256: digest(row) } };
}
export async function importFindings(directory, destination) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'material-input-equivalence-audit.json')));
  assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
  const payload = path.join(directory, manifest.payload), packed = fs.readFileSync(payload);
  assert.equal(packed.length, manifest.compressedBytes); assert.equal(hash(packed), manifest.compressedSha256);
  const generation = path.join(destination, manifest.compressedSha256);
  const indexFile = path.join(generation, 'index.json');
  if (fs.existsSync(indexFile)) {
    const previous = fs.existsSync(path.join(destination, 'current.json')) ? JSON.parse(fs.readFileSync(path.join(destination, 'current.json'))) : {};
    const index = verifyFindings(generation, previous.generation === manifest.compressedSha256 ? previous.indexSha256 : undefined);
    atomicJson(path.join(destination, 'current.json'), { generation: manifest.compressedSha256, indexSha256: hash(fs.readFileSync(indexFile)) });
    return { ...index.counts, reused: true };
  }
  fs.mkdirSync(generation, { recursive: true });
  const shards = new Map(), counts = { discrepancies: 0, sourceFindings: 0, controls: 0, occurrences: 0, unresolved: 0 };
  const sections = [], metadata = {};
  const parser = new Parser(), decodedHash = createHash('sha256');
  let decodedBytes = 0, roots = 0;
  const append = (value, section, ordinal) => {
    const family = value.family ?? 'global'; assert.match(family, /^[a-zA-Z0-9_-]+$/);
    const shard = `${section.replaceAll('.', '-')}-${family}.jsonl`;
    const list = shards.get(shard) ?? []; list.push(compactFinding(value, section, ordinal, manifest.uncompressedSha256)); shards.set(shard, list);
    if (section === 'discrepancies') { counts.discrepancies++; counts.occurrences += value.occurrences; if (value.attribution === 'unresolved') counts.unresolved++; }
    else if (section === 'sourceFindings') counts.sourceFindings++;
    else counts.controls++;
  };
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    const control = ['controlTypography', 'retainedTypography'].includes(top) && this.stack[2]?.key === 'differences';
    if (this.stack.length === 2 && ['discrepancies', 'sourceFindings'].includes(top)) {
      append(value, top, this.key); delete this.value[this.key];
    } else if (control && this.stack.length === 3) {
      append(value, `${top}.differences`, this.key); delete this.value[this.key];
    } else if (this.stack.length === 1) {
      sections.push(this.key);
      if (['schemaVersion', 'coverage', 'summary', 'contract'].includes(this.key)) metadata[this.key] = value;
      delete this.value[this.key];
    } else if (this.stack.length === 0) roots++;
    else if (this.value && !['discrepancies', 'sourceFindings', 'coverage', 'summary', 'contract'].includes(top) && !control)
      delete this.value[this.key];
  };
  for await (const chunk of fs.createReadStream(payload).pipe(createGunzip())) {
    decodedBytes += chunk.length; decodedHash.update(chunk); parser.write(chunk);
  }
  assert.equal(roots, 1); assert.equal(parser.stack.length, 0);
  assert.equal(decodedBytes, manifest.uncompressedBytes); assert.equal(decodedHash.digest('hex'), manifest.uncompressedSha256);
  assert.equal(counts.discrepancies, metadata.summary.uniqueStyleDifferences);
  assert.equal(counts.occurrences, metadata.summary.totalStyleDifferenceOccurrences);
  assert.equal(counts.sourceFindings, metadata.summary.sourceFindings);
  const receipts = [];
  for (const [file, rows] of shards) {
    const bytes = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    fs.writeFileSync(path.join(generation, file), bytes); receipts.push({ file, rows: rows.length, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) });
  }
  // Preserve the complete original package once; compact records are an index,
  // never a lossy replacement for the actual observations/proof trees.
  fs.writeFileSync(path.join(generation, manifest.payload), packed);
  atomicJson(indexFile, { schemaVersion: 1, manifest, metadata, sections, counts, shards: receipts });
  atomicJson(path.join(destination, 'current.json'), { generation: manifest.compressedSha256, indexSha256: hash(fs.readFileSync(indexFile)) });
  return { ...counts, compactBytes: receipts.reduce((n, s) => n + s.bytes, 0), reused: false };
}
export function verifyFindings(generation, expectedIndexSha256) {
  const indexBytes = fs.readFileSync(path.join(generation, 'index.json'));
  if (expectedIndexSha256) assert.equal(hash(indexBytes), expectedIndexSha256, 'Working index changed');
  const index = JSON.parse(indexBytes);
  assert.equal(index.manifest.payload, 'material-input-equivalence-audit.json.gz');
  const source = fs.readFileSync(path.join(generation, index.manifest.payload));
  assert.equal(hash(source), index.manifest.compressedSha256);
  const ids = new Set(), counts = { discrepancies: 0, sourceFindings: 0, controls: 0, occurrences: 0, unresolved: 0 };
  for (const shard of index.shards) {
    assert.match(shard.file, /^[a-zA-Z0-9_-]+\.jsonl$/);
    const bytes = fs.readFileSync(path.join(generation, shard.file));
    assert.equal(hash(bytes), shard.sha256); assert.equal(bytes.length, shard.bytes);
    assert.equal(bytes.toString().trimEnd().split('\n').length, shard.rows);
    for (const line of bytes.toString().trimEnd().split('\n')) {
      const row = JSON.parse(line), { section, ordinal, sourceSha256 } = row.evidence;
      assert.equal(sourceSha256, index.manifest.uncompressedSha256);
      assert.equal(row.id, digest([sourceSha256, section, ordinal]));
      assert.ok(!ids.has(row.id), 'Duplicate finding'); ids.add(row.id);
      if (section === 'discrepancies') { counts.discrepancies++; counts.occurrences += row.occurrences; if (row.attribution === 'unresolved') counts.unresolved++; }
      else if (section === 'sourceFindings') counts.sourceFindings++;
      else { assert.ok(['controlTypography.differences', 'retainedTypography.differences'].includes(section)); counts.controls++; }
    }
  }
  assert.deepEqual(counts, index.counts);
  return index;
}
export function queryFindings(destination, family, snapshot) {
  assert.match(family, /^[a-zA-Z0-9_-]+$/);
  const pointer = snapshot ?? JSON.parse(fs.readFileSync(path.join(destination, 'current.json')));
  assert.match(pointer.generation, /^[a-f0-9]{64}$/);
  const generation = path.join(destination, pointer.generation), indexBytes = fs.readFileSync(path.join(generation, 'index.json'));
  assert.equal(hash(indexBytes), pointer.indexSha256, 'Working index changed; re-import canonical evidence');
  const index = JSON.parse(indexBytes);
  const familyShards = new Set(['discrepancies', 'sourceFindings',
    'controlTypography-differences', 'retainedTypography-differences']
    .map(section => `${section}-${family}.jsonl`));
  return index.shards.filter(s => familyShards.has(s.file)).flatMap(shard => {
    assert.match(shard.file, /^[a-zA-Z0-9_-]+\.jsonl$/);
    const bytes = fs.readFileSync(path.join(generation, shard.file)); assert.equal(hash(bytes), shard.sha256);
    return bytes.toString().trimEnd().split('\n').map(line => JSON.parse(line));
  });
}
export function saveReviewProposal(destination, review) {
  assert.ok(review.groups?.length > 0);
  // Review proposals are separate from accepted canonical classifications.
  // Export/integration must still apply the existing full predecessor checks.
  const bytes = JSON.stringify(review), sha256 = hash(bytes);
  const file = path.join(destination, 'proposals', `${sha256}.json`);
  if (!fs.existsSync(file)) atomicJson(file, { status: 'proposal-not-canonical', sha256, review });
  return { file, sha256, groups: review.groups.length };
}
// Coverage integration consumes reviewed proposal bytes, not their existence.
// Reauthenticate every actual evidence dependency; no persistent cache is used.
export const caseInspectionObligations = Object.freeze([
  'inputStyleStructure', 'localPaint', 'semantics', 'authoredActivation',
  'authoredEditing', 'programmaticFocus', 'historyOwnership', 'sourceCurrentness',
]);
const differenceClassifications = new Set([
  'equivalent-representation', 'public-api-structural-difference', 'documented-limitation',
  'application-plugin-authoring-defect', 'stale-fixture-reference-input',
  'harness-instrumentation-defect', 'confirmed-core-defect', 'suspected-core-defect',
]);
const hasEvidenceReceipt = value => !!value && typeof value === 'object' && (
  typeof value.file === 'string' && /^[a-f0-9]{64}$/.test(value.sha256 ?? '') ||
  Object.values(value).some(child => hasEvidenceReceipt(child)));
function assertCaseInspection(row, schemaVersion) {
  assert.equal(row.currentRendering, 'unverified');
  if (schemaVersion === 1 || row.inspection === 'partial') {
    assert.equal(row.inspection, 'partial');
    assert.equal(row.inspectionClosure, undefined, 'Partial records cannot claim inspection closure');
    return;
  }
  assert.equal(row.inspection, 'complete');
  const closure = row.inspectionClosure;
  assert.ok(closure && ['inspected-pass', 'inspected-failure'].includes(closure.outcome));
  assert.ok(hasEvidenceReceipt(closure.review), 'Closure needs a receipt-bound requirement review');
  assert.ok(typeof closure.conclusion === 'string' && closure.conclusion.trim());
  assert.ok(Array.isArray(closure.findings));
  assert.equal(closure.findings.some(finding => finding.outcome === 'failure'), closure.outcome === 'inspected-failure');
  const ids = new Set();
  for (const finding of closure.findings) {
    assert.ok(typeof finding.id === 'string' && finding.id.trim() && !ids.has(finding.id)); ids.add(finding.id);
    assert.ok(differenceClassifications.has(finding.classification));
    assert.ok(['equivalent', 'failure'].includes(finding.outcome));
    if (finding.outcome === 'equivalent') assert.ok(['equivalent-representation', 'public-api-structural-difference'].includes(finding.classification));
    assert.ok(typeof finding.owner === 'string' && finding.owner.trim(), 'Missing responsible subsystem');
    assert.ok(typeof finding.firstDivergence === 'string' && finding.firstDivergence.trim(), 'Missing first meaningful stage or equivalence explanation');
    assert.ok(typeof finding.conclusion === 'string' && finding.conclusion.trim());
    assert.ok(hasEvidenceReceipt(finding.evidence), 'Classified finding needs actual evidence');
    if (['confirmed-core-defect', 'suspected-core-defect'].includes(finding.classification))
      assert.ok(hasEvidenceReceipt(finding.publicReproduction), 'Core finding needs a receipt-bound public reproduction');
  }
  for (const name of caseInspectionObligations) assert.ok(Object.hasOwn(row.obligations, name), `Missing closure obligation: ${name}`);
  for (const [name, obligation] of Object.entries(row.obligations)) {
    assert.ok(['applicable', 'not-applicable'].includes(obligation.applicability), `Unverified applicability: ${name}`);
    if (obligation.applicability === 'applicable') {
      assert.ok(['inspected', 'inspected-failure'].includes(obligation.disposition), `Uninspected obligation: ${name}`);
      if (obligation.disposition === 'inspected-failure')
        assert.equal(closure.outcome, 'inspected-failure', `Cannot report a passing closure with a failed obligation: ${name}`);
    } else assert.equal(obligation.disposition, 'inspected-authored-exclusion');
    assert.ok(typeof obligation.conclusion === 'string' && obligation.conclusion.trim(), `Missing conclusion: ${name}`);
    assert.ok(hasEvidenceReceipt(obligation.evidence), `Missing closure evidence: ${name}`);
    assert.ok(obligation.remaining === undefined || Array.isArray(obligation.remaining) && obligation.remaining.length === 0,
      `Outstanding inspection work: ${name}`);
  }
}
export function loadCaseObligationReview(file, expectedReviewSha256, configuredCases,
  { root = process.cwd(), read = fs.readFileSync } = {}) {
  assert.match(expectedReviewSha256, /^[a-f0-9]{64}$/);
  const resolve = name => {
    assert.equal(typeof name, 'string');
    assert.ok(!path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'Evidence path must remain workspace-relative');
    return path.resolve(root, name);
  };
  const envelope = JSON.parse(read(resolve(file)));
  assert.equal(envelope.status, 'proposal-not-canonical');
  assert.equal(envelope.sha256, expectedReviewSha256);
  assert.equal(digest(envelope.review), expectedReviewSha256, 'Case-obligation proposal changed');
  const review = envelope.review;
  assert.equal(review.kind, 'case-obligation-coverage-extension');
  assert.equal(review.status, 'proposal-not-canonical');
  const schemaVersion = review.inspectionSchemaVersion ?? 1;
  assert.ok([1, 2].includes(schemaVersion));
  if (Object.hasOwn(review, 'inspectionSchemaVersion')) assert.equal(review.inspectionSchemaVersion, 2, 'Version 1 is the unchanged implicit legacy format');
  assert.ok(review.groups.length > 0);
  const configured = new Set(configuredCases), seen = new Set(), dependencies = new Map();
  assert.equal(configured.size, configuredCases.length, 'Duplicate configured case');
  const bind = (name, sha256) => {
    resolve(name); assert.match(sha256, /^[a-f0-9]{64}$/);
    if (dependencies.has(name)) assert.equal(dependencies.get(name), sha256, 'Conflicting dependency receipt');
    dependencies.set(name, sha256);
  };
  const receipts = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.file === 'string' && typeof value.sha256 === 'string') bind(value.file, value.sha256);
    for (const child of Object.values(value)) receipts(child);
  };
  for (const row of review.groups) {
    assert.ok(configured.has(row.case), 'Unknown case in obligation evidence');
    assert.ok(!seen.has(row.case), 'Duplicate case in obligation evidence'); seen.add(row.case);
    assertCaseInspection(row, schemaVersion);
    assert.ok(row.case.includes(`:${row.family}@`));
    assert.ok(row.obligations && Object.keys(row.obligations).length > 0);
    bind(row.evidence.report, row.evidence.reportSha256);
    for (const side of ['reference', 'astylar']) {
      const receipt = row.evidence.pairedTrees[side]; assert.ok(receipt);
      bind(receipt.file, receipt.sha256);
    }
    receipts(row);
  }
  const evidenceFingerprints = [...dependencies].sort(([a], [b]) => a.localeCompare(b))
    .map(([file, sha256]) => {
      assert.equal(hash(read(resolve(file))), sha256, `Case obligation evidence changed: ${file}`);
      return { file, sha256 };
    });
  return { schemaVersion, scope: review.scope, reviewSha256: expectedReviewSha256,
    inspectionComplete: schemaVersion === 2 && seen.size === configured.size && review.groups.every(row => row.inspection === 'complete'),
    currentRenderingAccepted: false, cases: review.groups,
    unjoinedCases: configuredCases.filter(id => !seen.has(id)), evidenceFingerprints };
}
export function attachCaseObligationCoverage(coverage, file, reviewSha256, options) {
  assert.equal(Object.hasOwn(coverage, 'inspectionEvidence'), false, 'Coverage evidence already attached');
  const configured = [...coverage.caseInventory.static, ...coverage.caseInventory.interaction];
  const result = { ...coverage, inspectionEvidence: loadCaseObligationReview(file, reviewSha256, configured, options) };
  assertCaseObligationCoverage(result);
  return result;
}
export function assertCaseObligationCoverage(coverage) {
  if (coverage.inspectionEvidence === undefined) return;
  const evidence = coverage.inspectionEvidence;
  assert.ok([1, 2].includes(evidence.schemaVersion));
  assert.equal(evidence.currentRenderingAccepted, false);
  const configured = [...coverage.caseInventory.static, ...coverage.caseInventory.interaction], seen = new Set();
  for (const row of evidence.cases) {
    assert.ok(configured.includes(row.case) && !seen.has(row.case), 'Obligation case membership changed'); seen.add(row.case);
    assertCaseInspection(row, evidence.schemaVersion);
  }
  assert.ok(JSON.stringify(evidence.unjoinedCases) === JSON.stringify(configured.filter(id => !seen.has(id))),
    'Unjoined obligation cases changed');
  assert.equal(evidence.inspectionComplete, evidence.schemaVersion === 2 && seen.size === configured.length &&
    evidence.cases.every(row => row.inspection === 'complete'));
  assert.equal(digest({kind:'case-obligation-coverage-extension',status:'proposal-not-canonical',
    ...(evidence.schemaVersion === 2 ? {inspectionSchemaVersion: 2} : {}),
    scope:evidence.scope,groups:evidence.cases}), evidence.reviewSha256, 'Bound obligation dispositions changed');
  assert.ok(evidence.evidenceFingerprints.length > 0);
  assert.equal(new Set(evidence.evidenceFingerprints.map(row => row.file)).size, evidence.evidenceFingerprints.length);
  for (const receipt of evidence.evidenceFingerprints) assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  const bound = new Map(evidence.evidenceFingerprints.map(row => [row.file, row.sha256]));
  const assertBound = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.file === 'string' && typeof value.sha256 === 'string') {
      assert.ok(!path.isAbsolute(value.file) && !value.file.split(/[\\/]/).includes('..'));
      assert.equal(bound.get(value.file), value.sha256, 'Closure receipt is not bound to authenticated coverage');
    }
    for (const child of Object.values(value)) assertBound(child);
  };
  for (const row of evidence.cases) if (row.inspection === 'complete') assertBound(row);
}
export function describeCaseInspectionCoverage(coverage) {
  assertCaseObligationCoverage(coverage);
  const evidence = coverage.inspectionEvidence;
  assert.ok(evidence);
  if (evidence.schemaVersion === 1) return `Case-obligation evidence: ${evidence.cases.length} exact cases have partial evidence joins; ${evidence.unjoinedCases.length} configured cases are not yet joined. Matrix completeness is not full inspection closure. Current rendering acceptance and full inspection completion are not certified by these records.`;
  const complete = evidence.cases.filter(row => row.inspection === 'complete');
  const failures = complete.filter(row => row.inspectionClosure.outcome === 'inspected-failure').length;
  return `Case inspection coverage: ${complete.length} complete (${complete.length - failures} inspected-pass, ${failures} inspected-failure); ${evidence.cases.length - complete.length} partial; ${evidence.unjoinedCases.length} unjoined. Documented failures count as inspected. These are authenticated reviewed inspection dispositions, not independently proven rendering parity or completion of the audit's final gates. Current rendering acceptance remains unverified.`;
}
export async function loadFindingEvidence(destination, family, id, snapshot) {
  const pointer = snapshot ?? JSON.parse(fs.readFileSync(path.join(destination, 'current.json')));
  const ids = Array.isArray(id) ? id : [id];
  assert.ok(ids.length > 0); assert.equal(new Set(ids).size, ids.length);
  const rows = queryFindings(destination, family, pointer);
  const findings = ids.map(id => { const row = rows.find(row => row.id === id); assert.ok(row, 'Unknown finding'); return row; });
  const generation = path.join(destination, pointer.generation), index = JSON.parse(fs.readFileSync(path.join(generation, 'index.json')));
  assert.equal(index.manifest.payload, 'material-input-equivalence-audit.json.gz');
  const payload = path.join(generation, index.manifest.payload);
  assert.equal(hash(fs.readFileSync(payload)), index.manifest.compressedSha256);
  const parser = new Parser(), found = new Map();
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    const candidates = findings.filter(finding => {
      const [section, nested] = finding.evidence.section.split('.');
      return top === section && (!nested || this.stack[2]?.key === nested) && this.stack.length === (nested ? 3 : 2);
    });
    if (candidates.length) {
      for (const finding of candidates) if (this.key === finding.evidence.ordinal) found.set(finding.id, value);
      delete this.value[this.key];
    } else if (this.value && !findings.some(finding => top === finding.evidence.section.split('.')[0])) delete this.value[this.key];
  };
  const input = fs.createReadStream(payload), stream = input.pipe(createGunzip());
  try { for await (const chunk of stream) { parser.write(chunk); if (found.size === findings.length) break; } }
  finally { stream.destroy(); input.destroy(); }
  for (const finding of findings) {
    assert.ok(found.has(finding.id), 'Evidence row missing');
    assert.equal(digest(found.get(finding.id)), finding.evidence.completeRowSha256, 'Evidence row differs from compact finding');
  }
  const values = ids.map(id => found.get(id));
  return Array.isArray(id) ? values : values[0];
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, argument, option, id] = process.argv.slice(2), destination = 'artifacts/material-parity/working-audit';
  if (mode === 'import') console.log(JSON.stringify(await importFindings(argument ?? 'docs', destination)));
  else if (mode === 'evidence') console.log(JSON.stringify(await loadFindingEvidence(destination, argument, option), null, 2));
  else if (mode === 'query') {
    assert.ok(option === undefined || option === '--all' || option === '--id', 'Use query FAMILY [--all|--id ID]');
    const canonical = JSON.parse(fs.readFileSync('docs/material-input-equivalence-audit.json'));
    const pointer = JSON.parse(fs.readFileSync(path.join(destination, 'current.json')));
    assert.equal(pointer.generation, canonical.compressedSha256, 'Canonical snapshot changed; import it before querying current findings');
    const rows = queryFindings(destination, argument);
    if (option === '--all') console.log(JSON.stringify(rows, null, 2));
    else if (option === '--id') { const row = rows.find(r => r.id === id); assert.ok(row, 'Unknown finding'); console.log(JSON.stringify(row, null, 2)); }
    else console.log(JSON.stringify({ family: argument, total: rows.length, shown: Math.min(rows.length, 20),
      findings: rows.slice(0, 20).map(({ id, element, property, classification, attribution, occurrences }) => ({ id, element, property, classification, attribution, occurrences })),
      detail: 'Use --id ID for one complete record; --all is explicit.' }, null, 2));
  }
  else if (mode === 'verify') {
    const pointer = JSON.parse(fs.readFileSync(path.join(destination, 'current.json')));
    assert.match(pointer.generation, /^[a-f0-9]{64}$/);
    console.log(JSON.stringify(verifyFindings(path.join(destination, pointer.generation), pointer.indexSha256).counts));
  } else throw new Error('Use import [source-directory], query FAMILY, evidence FAMILY ID, or verify');
}
