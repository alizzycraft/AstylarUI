import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';

// Retain existing in-memory frames; do not change the maintained reproduction.
const output = path.resolve(process.argv[2] ?? ''), font = process.argv[3];
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.ok(!existsSync(output)); assert.ok(['Arial', 'monospace'].includes(font));
const hash = b => createHash('sha256').update(b).digest('hex');
const base = 'tests/material-parity/input-boundary-evidence.spec.mjs', bytes = readFileSync(base);
assert.equal(hash(bytes), '58fe244dc56a251e144dcc6eab2c36cb18f017291da968e1d002dc36404d60ea');
const ast = ts.createSourceFile(base, bytes.toString(), 99, true, ts.ScriptKind.JS);
const selected = ast.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
  n.expression.expression.getText(ast) === 'test' && n.expression.arguments[0]?.text === 'public equal-input empty caret has paired WebGL raster evidence');
assert.equal(selected.length, 1);
const helpers = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'rasterDifference'); assert.equal(helpers.length, 1);
const imports = ast.statements.filter(n => ts.isImportDeclaration(n) &&
  (n.moduleSpecifier.text.startsWith('node:') || ['playwright-core', 'pngjs'].includes(n.moduleSpecifier.text)))
  .map(n => n.getText(ast)).join('\n');
const edits = [];
let body = selected[0].getText(ast);
function replaceOnce(before, after) {
  assert.equal(body.split(before).length, 2, `Unexpected caret producer: ${before}`);
  body = body.replace(before, after); edits.push({ before, after });
}
if (font === 'monospace') replaceOnce("fontFamily:'Arial',fontSize:'16px'", "fontFamily:'monospace',fontSize:'16px'");
replaceOnce('const bundle = built.outputFiles[0].contents;', "const bundle = built.outputFiles[0].contents; writeFileSync(path.join(output, 'audit.js'), bundle, {flag:'wx'});");
const baseline = "const stageBaseline = await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 140 }, caret: 'initial' });";
replaceOnce(baseline, baseline + "\n          retain(`${variant}-${dpr}-${mode}-baseline`, stageBaseline);");
const screenshot = "const fullDelta = rasterDifference(await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 140 }, caret: 'initial' }), stageBaseline,";
replaceOnce(screenshot, "const fullFrame = await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 140 }, caret: 'initial' });\n            retain(`${variant}-${dpr}-${mode}-sample-${sample}`, fullFrame);\n            const fullDelta = rasterDifference(fullFrame, stageBaseline,");
replaceOnce('referenceEditedEmpty: pair.reference.editedEmpty, stageDelta: pair.astylar.stageDelta,',
  'referenceEditedEmpty: pair.reference.editedEmpty, referenceStageDelta: pair.reference.stageDelta, stageDelta: pair.astylar.stageDelta,');
replaceOnce('const coreSources = inputs.filter(input =>', `writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify({font, frames, inputs, results, browser:browser.version(), packages, bundleSha256:hash(bundle), provenance})+'\\n',{flag:'wx'});
    const coreSources = inputs.filter(input =>`);
let reversed = body; for (const edit of [...edits].reverse()) { assert.equal(reversed.split(edit.after).length, 2); reversed = reversed.replace(edit.after, edit.before); }
assert.equal(reversed, selected[0].getText(ast), 'Entire original action/assertion body must recover');
mkdirSync(output);
const script = 'scripts/capture-public-caret-frames.mjs';
const provenance = { producer: { file: script, sha256: hash(readFileSync(script)) }, base: { file: base, sha256: hash(bytes) },
  originalTestSha256: hash(selected[0].getText(ast)), edits, scope: 'New PNG retention, shared font contrast and native full-stage reporting only; not original historical pixels or a caret metric fix.' };
const generated = imports + "\nimport {writeFileSync} from 'node:fs';\nconst hash=b=>createHash('sha256').update(b).digest('hex');\n"
  + `const output=${JSON.stringify(output)}, font=${JSON.stringify(font)}, provenance=${JSON.stringify(provenance)}, frames=[];\n`
  + "const retain=(name,bytes)=>{const file=path.join(output,name+'.png');writeFileSync(file,bytes,{flag:'wx'});frames.push({file,sha256:hash(bytes)});};\n"
  + helpers[0].getText(ast) + '\n' + body + '\n';
writeFileSync(path.join(output, 'producer.mjs'), generated, { flag: 'wx' });
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify({ ...provenance, generatedSha256: hash(generated) }), { flag: 'wx' });
const result = spawnSync(process.execPath, ['--test', path.join(output, 'producer.mjs')], { cwd: process.cwd(),
  env: { ...process.env, ASTYLAR_AUDIT_TEXT_CASE: 'placeholder-keyboard' }, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
assert.equal(result.signal, null); process.exitCode = result.status ?? 1;
