import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
const esbuild = createRequire(`${process.cwd()}/examples/material-showcase/package.json`)('esbuild');
const hash = b => createHash('sha256').update(b).digest('hex'), read = file => fs.readFileSync(file), json = file => JSON.parse(read(file));
const receipt = file => ({ file, sha256: hash(read(file)) });
// Reuse the established compiler/token comparator and guarded local-binding
// restoration. No new source normalizer or synthetic bridge is introduced.
function extract(file, name, bindings, args) {
  const ast = ts.createSourceFile(file, read(file).toString(), 99, true);
  const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.equal(matches.length, 1);
  return new Function(...bindings, matches[0].getText(ast) + `;return ${name};`)(...args);
}
const canonicalFile = 'scripts/check-public-native-checkable-value.mjs';
const canonical = extract(canonicalFile, 'canonical', ['ts', 'esbuild', 'assert'], [ts, esbuild, assert]);
const helperFile = 'scripts/check-public-semantic-css-hidden.mjs', names = ['reconcile', 'reconcileElement', 'applyAttributes', 'semanticChildren', 'nativeId', 'nativeIdRefs'];
const methods = extract(helperFile, 'methods', ['ts', 'assert', 'read', 'names'], [ts, assert, read, names]);
const restore = extract(helperFile, 'restoreBundledLocals', ['ts', 'assert'], [ts, assert]);
const currentFile = 'src/lib/astylar-semantic-bridge.ts', installedFile = 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js';
const current = methods(currentFile), installed = methods(installedFile);
for (const name of names) assert.deepEqual(canonical(current[name]), canonical(installed[name]), name);
assert.match(current.reconcile, /filter\(\(element\) => !element\.hidden\)/);
assert.match(current.reconcileElement, /if \(child\.hidden\) continue/);
assert.ok(current.applyAttributes.includes("node.setAttribute('aria-describedby', this.nativeIdRefs(element.ariaDescribedby))"));
let controls = 0;
for (const forged of ['probe(){let text2=this.other.get(key);}', 'probe(){let text2=this.textNodes.get(key);node.text2=text2;}', 'probe(){for(const attribute2 of node.other){} }']) {
  assert.throws(() => restore(forged)); controls++;
}
for (const [name, before, after] of [['reconcile', '!element.hidden', 'true'], ['reconcileElement', 'if (child.hidden) continue;', 'if (false) continue;']]) {
  assert.ok(current[name].includes(before)); assert.notDeepEqual(canonical(current[name].replace(before, after)), canonical(current[name])); controls++;
}
const one = a => { assert.equal(a.length, 1); return a[0]; };
function inspect(v) {
  assert.ok(['reference', 'astylar'].includes(v.mode)); assert.ok(['visible', 'hidden-child', 'hidden-root', 'hidden-parent'].includes(v.variant)); assert.ok([1, 2].includes(v.dpr));
  const hidden = v.variant !== 'visible', lost = v.mode === 'astylar' && hidden;
  assert.equal(v.snapshot.mode, v.mode); assert.equal(v.snapshot.name, v.variant);
  const locate = (nodes, id) => nodes.flatMap(n => [...(n.id === id ? [n] : []), ...locate(n.children ?? [], id)]);
  const root = v.snapshot.site.root.children, target = one(locate(root, 'target')), description = one(locate(root, 'description'));
  assert.equal(target.type, 'button'); assert.equal(target.value, 'Target'); assert.equal(target.ariaDescribedby, 'description');
  assert.equal(description.type, 'span'); assert.equal(description.textContent, 'Help info');
  assert.equal(description.hidden, ['hidden-child', 'hidden-root'].includes(v.variant) ? true : undefined);
  assert.equal(root.includes(description), v.variant === 'hidden-root');
  const parents = locate(root, 'hidden-parent'); assert.equal(parents.length, v.variant === 'hidden-parent' ? 1 : 0);
  if (parents.length) { assert.equal(parents[0].hidden, true); assert.equal(parents[0].children[0], description); }
  const button = one(v.nodes.filter(n => !n.ignored && n.role?.value === 'button' && n.name?.value === 'Target'));
  const actual = button.description?.value ?? null; assert.equal(actual, lost ? null : 'Help info');
  assert.equal(v.description, actual); assert.equal(v.expectedDescription, 'Help info');
  const exposed = v.nodes.filter(n => !n.ignored && n.role?.value === 'StaticText' && n.name?.value === 'Help info').length;
  assert.equal(exposed, hidden ? 0 : 1); assert.equal(v.exposedText, exposed); assert.equal(v.expected, hidden ? 0 : 1);
  const d = v.semanticDom, attrs = Object.fromEntries(d.buttonAttributes);
  assert.equal(d.buttonExists, true); assert.equal(d.buttonTag, 'BUTTON'); assert.equal(attrs['aria-describedby'], d.referenceId);
  if (v.mode === 'reference') assert.equal(d.referenceId, 'description'); else assert.match(d.referenceId, /^astylar-semantic-\d+-description$/);
  assert.equal(d.targetExists, !lost);
  assert.equal(d.targetText, lost ? null : 'Help info'); assert.equal(d.targetTag, lost ? null : 'SPAN');
  if (!lost) {
    assert.equal(d.targetHidden, ['hidden-child', 'hidden-root'].includes(v.variant)); assert.equal(d.targetParentHidden, v.variant === 'hidden-parent');
  }
  if (v.mode === 'astylar') {
    const diagnostics = v.snapshot.diagnostics; assert.deepEqual(diagnostics.messages, []); assert.deepEqual(diagnostics.plugins.pluginIds, ['astylar.core']);
    assert.equal(diagnostics.semantics.identities.totalNodes, v.variant === 'hidden-parent' ? 4 : 3);
    assert.equal(diagnostics.semantics.nodes, hidden ? 2 : 3); assert.equal(diagnostics.semantics.reconciliation.created, hidden ? 2 : 3);
    assert.equal(diagnostics.semantics.reconciliation.disposed, 0);
  }
  assert.equal(v.disposed.disposed, true);
  return { lost, actual, exposed, semanticDom: d,
    ...(v.mode === 'astylar' ? { identities: v.snapshot.diagnostics.semantics.identities, reconciliation: v.snapshot.diagnostics.semantics.reconciliation } : {}) };
}
const verified = [];
for (const run of ['public-hidden-description-20261022', 'public-hidden-description-repeat-20261022']) {
  const root = `artifacts/material-parity/${run}`, report = json(root + '/latest-report.json'), p = json(root + '/provenance.json');
  assert.deepEqual(report.provenance, p); assert.equal(report.browser, '155.0.8059.80'); assert.equal(report.accepted, false);
  assert.deepEqual(report.errors, []); assert.equal(report.captures.length, 16); assert.equal(json(root + '/failure.json').captures.length, 16);
  for (const r of [p.producer, p.baseProducer, p.generatedProducer]) assert.equal(hash(read(r.file)), r.sha256);
  assert.equal(hash(read(root + '/producer.mjs')), p.generatedProducer.sha256); assert.equal(hash(read(root + '/audit.js')), p.bundleSha256);
  const bundled = methods(root + '/audit.js');
  for (const name of names) assert.deepEqual(canonical(current[name]), canonical(restore(bundled[name])), `${run}:${name}`);
  for (const r of p.bundleInputs) assert.equal(hash(read(r.file)), r.sha256);
  for (const overlay of p.overlays) { assert.equal(hash(read(overlay.file)), overlay.originalSha256); assert.equal(hash(overlay.compiledSource), overlay.compiledSha256); }
  const referenceBuilder = one(p.overlays.filter(o => o.file.endsWith('/cursor-defaults.mjs'))).compiledSource;
  assert.ok(referenceBuilder.includes('node.hidden = !!description.hidden;')); assert.ok(referenceBuilder.includes('node.setAttribute("aria-describedby", description.ariaDescribedby)'));
  assert.ok(!referenceBuilder.includes('if(description.hidden) return;'));
  const pairs = new Map(), failures = [], observations = [];
  for (const c of report.captures) {
    const file = root + '/' + c.file, bytes = read(file); assert.equal(hash(bytes), c.sha256); const v = JSON.parse(bytes), result = inspect(v);
    for (const k of ['mode', 'variant', 'dpr', 'description', 'expectedDescription', 'exposedText', 'expected']) assert.equal(v[k], c[k]);
    const key = `${v.dpr}/${v.variant}`, pair = pairs.get(key) ?? {}; assert.equal(pair[v.mode], undefined); pair[v.mode] = v.snapshot.site; pairs.set(key, pair);
    if (result.lost) failures.push({ check: 'description', mode: v.mode, variant: v.variant, dpr: v.dpr, expected: 'Help info', actual: null });
    for (const mutate of [x => { one(x.nodes.filter(n => !n.ignored && n.role?.value === 'button' && n.name?.value === 'Target')).description = { value: 'forged' }; },
      x => { x.semanticDom.targetExists = !x.semanticDom.targetExists; },
      x => { const find = a => a.flatMap(n => [...(n.id === 'description' ? [n] : []), ...find(n.children ?? [])]); one(find(x.snapshot.site.root.children)).hidden = !descriptionHidden(x.variant); }]) {
      const forged = structuredClone(v); mutate(forged); assert.throws(() => inspect(forged)); controls++;
    }
    observations.push({ file, sha256: c.sha256, mode: v.mode, variant: v.variant, dpr: v.dpr, ...result });
  }
  assert.equal(pairs.size, 8); for (const pair of pairs.values()) assert.deepEqual(pair.reference, pair.astylar);
  assert.deepEqual(failures, report.failures); assert.equal(failures.length, 6);
  verified.push({ report: receipt(root + '/latest-report.json'), captures: 16, failures, observations });
}
function descriptionHidden(variant) { return ['hidden-child', 'hidden-root'].includes(variant); }
assert.equal(controls, 101);
const types = 'src/app/types/dom-element.ts', catalog = 'docs/compatibility/capabilities.json';
assert.ok(read(types).toString().includes('hidden?: boolean;')); assert.ok(read(types).toString().includes('ariaDescribedby?: string;'));
console.log(JSON.stringify({ producer: receipt('scripts/check-public-hidden-description.mjs'), canonicalComparator: receipt(canonicalFile), reusedHelpers: receipt(helperFile),
  methodBindings: [currentFile, installedFile].map(receipt), boundMethods: names, publicType: receipt(types), catalog: receipt(catalog),
  negativeControlsRejected: controls, verified, classification: 'confirmed-core-renderer-defect',
  conclusion: 'Equal public inputs retain hidden referenced descriptions in native HTML,but core bridge prunes hidden roots/children before creating their native ID targets. Reference attributes project while target DOM nodes disappear;public semantic identity counts still include the hidden authored graph. Current/installed/both actual bundles bind complete owning methods. Visible-description and ordinary hidden-text exposure controls pass.',
  boundary: 'Static aria-describedby to authored hidden target/root/ancestor atDPR1/2. Not all ARIA relationships,CSS hiding,inherited visibility,updates,AT behavior,Material tooltip/sort causality,paint or whole-audit acceptance.' }));
