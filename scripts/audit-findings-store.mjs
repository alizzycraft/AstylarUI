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
export function queryFindings(destination, family) {
  assert.match(family, /^[a-zA-Z0-9_-]+$/);
  const pointer = JSON.parse(fs.readFileSync(path.join(destination, 'current.json')));
  assert.match(pointer.generation, /^[a-f0-9]{64}$/);
  const generation = path.join(destination, pointer.generation), indexBytes = fs.readFileSync(path.join(generation, 'index.json'));
  assert.equal(hash(indexBytes), pointer.indexSha256, 'Working index changed; re-import canonical evidence');
  const index = JSON.parse(indexBytes);
  return index.shards.filter(s => s.file.endsWith(`-${family}.jsonl`)).flatMap(shard => {
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
export async function loadFindingEvidence(destination, family, id) {
  const finding = queryFindings(destination, family).find(row => row.id === id); assert.ok(finding, 'Unknown finding');
  const pointer = JSON.parse(fs.readFileSync(path.join(destination, 'current.json')));
  const generation = path.join(destination, pointer.generation), index = JSON.parse(fs.readFileSync(path.join(generation, 'index.json')));
  assert.equal(index.manifest.payload, 'material-input-equivalence-audit.json.gz');
  const payload = path.join(generation, index.manifest.payload);
  assert.equal(hash(fs.readFileSync(payload)), index.manifest.compressedSha256);
  const [section, nested] = finding.evidence.section.split('.');
  const parser = new Parser(); let found;
  parser.onValue = function(value) {
    const top = this.stack[1]?.key ?? (this.stack.length === 1 ? this.key : undefined);
    const target = top === section && (!nested || this.stack[2]?.key === nested);
    if (target && this.stack.length === (nested ? 3 : 2)) {
      if (this.key === finding.evidence.ordinal) found = value;
      delete this.value[this.key];
    } else if (this.value && !target) delete this.value[this.key];
  };
  const input = fs.createReadStream(payload), stream = input.pipe(createGunzip());
  try { for await (const chunk of stream) { parser.write(chunk); if (found !== undefined) break; } }
  finally { stream.destroy(); input.destroy(); }
  assert.ok(found !== undefined, 'Evidence row missing');
  assert.equal(digest(found), finding.evidence.completeRowSha256, 'Evidence row differs from compact finding');
  return found;
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
