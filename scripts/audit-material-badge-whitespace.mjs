import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectOwnerInitialStyle } from '../tests/material-parity/owner-initial-style-survey.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';

export function inspectBadgeWhitespace(input, reference, candidate) {
  assert.equal(input.id, 'badge-label');
  const proof = inspectOwnerInitialStyle(input, 'whiteSpace', reference, candidate,
    { family: 'badge', reviewedGeneratedOwners: true });
  const rs = reference.nodes.filter(n => n.attributes?.id === input.id);
  const as = candidate.nodes.filter(n => n.authored?.id === input.id);
  assert.equal(rs.length, 1); assert.equal(as.length, 1);
  const r = rs[0], a = as[0];
  assert.equal(r.type, 'span'); assert.equal(a.authored.type, 'span');
  assert.equal(r.ownText, 'Notifications'); assert.equal(a.authored.textContent, 'Notifications');
  assert.deepEqual(reference.nodes.filter(n => n.parent === r.key), []);
  assert.deepEqual(candidate.nodes.filter(n => n.parent === a.key), []);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  assert.equal(input.reference.whiteSpace, 'normal');
  assert.deepEqual(proof.issues, [...stages, '.badge-label'].map(source => ({
    reason: 'explicit-relevant-request', side: 'astylar', node: a.key, source, key: 'whiteSpace', value: 'nowrap',
  })));
  assert.deepEqual(input.astylarAuthored.map(({ index, ...rule }) => {
    const { selector, ...declarations } = candidate.rules[index];
    assert.deepEqual(rule, { selector, declarations }); return rule;
  }), [{ selector: '.badge-label', declarations: { whiteSpace: 'nowrap' } }]);
  return { ...proof, classification: 'application-plugin-authoring-defect',
    attribution: 'badge-label-explicit-nowrap-versus-reference-normal',
    firstDivergence: 'authored whitespace request', inputEquivalent: false,
    rendererCauseProven: false, visualEffectProven: false };
}

export function collectBadgeWhitespace() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), findings = [], boundary = realpathSync('artifacts/material-parity');
  const load = descriptor => {
    const target = realpathSync(descriptor.file), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    const bytes = readFileSync(target); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  let casesScanned = 0;
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of entries) {
    casesScanned++; if (e.family !== 'badge') continue;
    const inputs = e.styleInputs.filter(i => i.id === 'badge-label'); assert.equal(inputs.length, 1);
    const input = inputs[0];
    findings.push({ case: `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
      kind, inputTrees: e.inputTrees, inputSha256: hash(JSON.stringify(input)),
      proof: inspectBadgeWhitespace(input, load(e.inputTrees.reference), load(e.inputTrees.astylar)) });
  }
  assert.equal(casesScanned, 2311); assert.equal(findings.length, 52);
  assert.equal(findings.filter(f => f.kind === 'static').length, 12);
  assert.equal(new Set(findings.map(f => f.case)).size, findings.length);
  const history = ['7945a42^', '7945a42', '48c994e'].map(ref => {
    const commit = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
    const source = execFileSync('git', ['show', `${commit}:${sourceFile}`], { encoding: 'utf8' });
    return { commit, sourceSha256: hash(source), witnesses: source.split('\n').flatMap((text, i) =>
      text.includes("selector: '.badge-label'") ? [{ line: i + 1, text }] : []) };
  });
  assert.equal(history[0].witnesses.length, 0);
  assert.ok(history[1].witnesses.some(w => w.text.includes("whiteSpace: 'nowrap'") && w.text.includes('top:')));
  assert.ok(history[2].witnesses.some(w => w.text.trim() === "{ selector: '.badge-label', whiteSpace: 'nowrap' },"));
  const source = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  return { schemaVersion: 1, kind: 'badge-explicit-whitespace-input-audit',
    capture: { file, sha256: hash(bytes) }, casesScanned, observations: findings.length, findings, history,
    currentSource: { file: sourceFile, sha256: hash(source), witnesses: source.split('\n').flatMap((text, i) =>
      text.includes("selector: '.badge-label'") ? [{ line: i + 1, text }] : []) },
    collectorSha256: hash(readFileSync(new URL(import.meta.url), 'utf8').replaceAll('\r\n', '\n')),
    canonicalAttributionChanged: false, rendererChanged: false,
    limits: ['No canonical classifications are changed.',
      'The parent/child history proves introduction at this edge and later retention, not developer intent or a rendering bisect.',
      'The unbroken word Notifications does not demonstrate a visual effect of nowrap.',
      'Existing intrinsic parent-width and positioned-margin proofs are separate; nowrap is not proved to cause or repair them.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectBadgeWhitespace(), output = JSON.stringify(report, null, 2) + '\n';
  const target = 'docs/material-badge-whitespace-audit.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(target, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(target, output);
  console.log(JSON.stringify({ casesScanned: report.casesScanned, observations: report.observations, sha256: hash(output) }));
}
