import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Execute only the exact historical parsing methods, not a reconstructed
// renderer or an assertion about what an old published build painted.
assert.equal(process.argv.length, 2);
const revision = '19d01be551aca2dab9e75e5ed79f2c819d099e8d';
const showcaseRevision = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const borderFile = 'src/app/services/dom/elements/element-border.service.ts';
const styleFile = 'src/app/services/dom/style.service.ts';
const hash = value => createHash('sha256').update(value).digest('hex');
const sources = [];
function methods(file, className, names) {
  const source = execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const declarations = parsed.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === className);
  assert.equal(declarations.length, 1);
  const extracted = names.map(name => {
    const matching = declarations[0].members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(parsed) === name);
    assert.equal(matching.length, 1);
    return { name, text: matching[0].getText(parsed), line: parsed.getLineAndCharacterOfPosition(matching[0].getStart(parsed)).line + 1 };
  });
  sources.push({ file, sha256: hash(source), methods: extracted.map(m => ({ name: m.name, line: m.line, sha256: hash(m.text) })) });
  const code = `class HistoricalMethods {\n${extracted.map(m => m.text).join('\n')}\n}`;
  const output = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal((output.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  // The constructor is a transparent RGB data carrier. No Babylon graphics,
  // material behavior, camera projection or historical runtime is simulated.
  class Color3Record { constructor(r, g, b) { Object.assign(this, { r, g, b }); } }
  const traces = [];
  const Constructor = new Function('Color3', 'console', `${output.outputText}\nreturn HistoricalMethods;`)(
    Color3Record, { log: (...args) => traces.push(args) });
  return { instance: new Constructor(), traces };
}

execFileSync('git', ['merge-base', '--is-ancestor', revision, showcaseRevision]);
const births = execFileSync('git', ['log', revision, '--format=%H', '--diff-filter=A', '--', borderFile], { encoding: 'utf8' }).trim().split(/\r?\n/);
assert.deepEqual(births, [revision], 'Bound the introduction of this file, not the first renderer implementation');
const parser = methods(styleFile, 'StyleService', ['parseBackgroundColor', 'parseHexColor', 'parseRgbColor']);
const border = methods(borderFile, 'ElementBorderService', ['parseBorderProperties']);
const calls = [], render = { actions: { style: { parseBackgroundColor(value) {
  calls.push(value); return parser.instance.parseBackgroundColor(value);
} } } };
const observations = [];
for (const color of ['#123456', '#c04a20']) {
  for (const borderColor of ['currentColor', 'CURRENTCOLOR', color]) {
    const input = { color, borderColor, borderStyle: 'solid' }, before = structuredClone(input);
    const parsed = border.instance.parseBorderProperties(render, input);
    assert.deepEqual(input, before);
    const rgb = [parsed.color.r, parsed.color.g, parsed.color.b];
    const expected = borderColor === color
      ? [1, 3, 5].map(start => Number.parseInt(color.slice(start, start + 2), 16) / 255)
      : [0.2, 0.2, 0.3];
    assert.deepEqual(rgb, expected);
    observations.push({ input, parserArgument: calls.at(-1), rgb, contextualColorUsed: borderColor === color ? null : false });
  }
}
assert.equal(calls.length, observations.length);
console.log(JSON.stringify({ kind: 'historical-border-context-method-replay', revision, showcaseRevision,
  ancestorVerified: true, borderFileIntroducedAtRevision: true, sources, observations,
  literalControls: 2, keywordControls: 4, inputsUnchanged: true,
  historicalPublicRuntimeVerified: false, historicalRasterVerified: false,
  earliestRendererDefectRevisionEstablished: false, canonicalClassificationChanged: false,
  limitation: 'Exact historical border/color methods use only the border-color string and return a fixed fallback for currentColor despite two distinct element colors. This source/method boundary predates the showcase. It does not date earlier predecessor implementations or prove any historical build, cascade, material, geometry or framebuffer behavior.' }, null, 2));
