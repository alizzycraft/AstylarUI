import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { StringDecoder } from 'node:string_decoder';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Parser from 'jsonparse';

// Hash every parsed token, including punctuation and property order, without
// retaining section objects. These are structural receipts, not equivalence
// classifications. Whitespace and equivalent JSON string escapes are ignored.
export async function sectionDigests(chunks) {
  const parser = new Parser(), original = parser.onToken;
  const sections = [], names = new Set();
  let depth = 0, started = false, closed = false, name, hash, tokens = 0;
  parser.onValue = function() {
    if (this.value && this.stack.length) delete this.value[this.key];
  };
  parser.onToken = function(token, value) {
    assert.equal(closed, false, 'tokens after root');
    if (!started) {
      assert.equal(token, 1, 'audit root must be an object');
      started = true;
    } else if (depth === 1 && name === undefined && token === 10) {
      assert.ok(!names.has(value), 'duplicate section');
      name = value; names.add(name);
    } else if (name !== undefined && !(depth === 1 && !hash && token === 5)) {
      hash ??= createHash('sha256');
      hash.update(JSON.stringify([token, value]) + '\n'); tokens++;
    }
    if (token === 1 || token === 3) depth++;
    if (token === 2 || token === 4) depth--;
    original.call(this, token, value);
    if (hash && depth === 1) {
      sections.push({ name, tokens, sha256: hash.digest('hex') });
      name = undefined; hash = undefined; tokens = 0;
    }
    if (depth === 0) closed = true;
  };
  const decoder = new StringDecoder('utf8');
  for await (const chunk of chunks) {
    const text = decoder.write(chunk);
    if (text) parser.write(text);
  }
  const tail = decoder.end();
  if (tail) parser.write(tail);
  assert.ok(started && closed && depth === 0 && parser.stack.length === 0, 'incomplete audit');
  return sections;
}

export async function auditSectionDigests(directory) {
  const manifest = JSON.parse(readFileSync(path.join(directory, 'material-input-equivalence-audit.json')));
  assert.equal(manifest.payload, 'material-input-equivalence-audit.json.gz');
  const file = path.join(directory, manifest.payload);
  let compressedBytes = 0, decodedBytes = 0;
  const compressedHash = createHash('sha256'), decodedHash = createHash('sha256');
  // Authenticate compressed bytes separately, retaining neither representation.
  for await (const chunk of createReadStream(file)) { compressedBytes += chunk.length; compressedHash.update(chunk); }
  assert.equal(compressedBytes, manifest.compressedBytes);
  assert.equal(compressedHash.digest('hex'), manifest.compressedSha256);
  async function* decoded() {
    for await (const chunk of createReadStream(file).pipe(createGunzip())) {
      decodedBytes += chunk.length; decodedHash.update(chunk); yield chunk;
    }
  }
  const sections = await sectionDigests(decoded());
  assert.equal(decodedBytes, manifest.uncompressedBytes);
  assert.equal(decodedHash.digest('hex'), manifest.uncompressedSha256);
  return { manifest, sections };
}

// Compare selected receipt leaves without holding either multi-GB audit in
// memory. Containers are included so empty-container and shape changes cannot
// silently pass as equal leaves. Callers must authenticate both byte streams.
async function* selectedEntries(chunks, sections) {
  const parser = new Parser(), original = parser.onToken;
  let entries = [], complete = false, started = false;
  const rootNames = new Set();
  const currentPath = () => [...parser.stack.slice(1).map(frame => frame.key), parser.key];
  const append = (kind, value) => {
    if (!sections.has(parser.stack[1]?.key ?? parser.key)) return;
    const at = currentPath();
    if (sections.has(at[0])) entries.push({ path: at, kind, value });
  };
  parser.onToken = function(token, value) {
    assert.equal(complete, false, 'tokens after root');
    if (!started) { assert.equal(token, Parser.C.LEFT_BRACE, 'audit root must be an object'); started = true; }
    if (this.stack.length === 1 && this.state === Parser.C.KEY && token === Parser.C.STRING) {
      assert.ok(!rootNames.has(value), 'duplicate section'); rootNames.add(value);
    }
    if (token === 1 || token === 3) append(token === 1 ? 'object-start' : 'array-start', null);
    original.call(this, token, value);
  };
  parser.onValue = function(value) {
    if (value !== null && typeof value === 'object') append(Array.isArray(value) ? 'array-end' : 'object-end', null);
    else append('value', value);
    if (this.stack.length) delete this.value[this.key];
    else complete = true;
  };
  const decoder = new StringDecoder('utf8');
  for await (const chunk of chunks) {
    parser.write(decoder.write(chunk));
    yield* entries; entries = [];
  }
  const tail = decoder.end();
  if (tail) parser.write(tail);
  yield* entries;
  assert.ok(complete && parser.stack.length === 0, 'incomplete audit');
}

export async function compareSectionLeaves(before, after, names) {
  const selected = new Set(names);
  assert.equal(selected.size, names.length, 'duplicate requested section');
  const left = selectedEntries(before, selected), right = selectedEntries(after, selected);
  const changes = [], counts = Object.fromEntries(names.map(name => [name, 0]));
  try {
    while (true) {
      const [a, b] = await Promise.all([left.next(), right.next()]);
      assert.equal(a.done, b.done, 'receipt membership changed');
      if (a.done) break;
      assert.deepEqual(a.value.path, b.value.path, 'receipt path/order changed');
      assert.equal(a.value.kind, b.value.kind, 'receipt shape changed');
      counts[a.value.path[0]]++;
      if (!Object.is(a.value.value, b.value.value)) changes.push({ path: a.value.path, before: a.value.value, after: b.value.value });
    }
  } finally { await Promise.allSettled([left.return(), right.return()]); }
  for (const name of names) assert.ok(counts[name] > 0, `missing receipt section ${name}`);
  return { counts, changes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 4, 'provide previous and current report directories');
  const previous = await auditSectionDigests(process.argv[2]);
  const current = await auditSectionDigests(process.argv[3]);
  const before = new Map(previous.sections.map(s => [s.name, s]));
  const after = new Map(current.sections.map(s => [s.name, s]));
  console.log(JSON.stringify({ previous, current,
    added: current.sections.filter(s => !before.has(s.name)),
    removed: previous.sections.filter(s => !after.has(s.name)),
    changed: current.sections.filter(s => before.has(s.name) && before.get(s.name).sha256 !== s.sha256),
    note: 'Changed sections require separate explanation. This inventory does not approve them or establish parity.' }, null, 2));
}
