import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const lf = x => x.replaceAll('\r\n', '\n');
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const revision = '4650791a7208b841dd29f1ced015f98234949623';
const historicalModuleHash = '82854bccdaa6ff23fc5f9df987f6ec5cf3e22d0da5dbe64357109d5a03035f3b';
const reportFile = 'docs/material-owner-initial-motion-review.json';
const reportHash = 'f8f90799191604823875d849fb6ae56de46dd96c37e3f91c8d540bdd48916294';

// This is a deliberately conservative named-declaration dependency closure.
// Property/local identifiers may over-include declarations, never justify
// skipping one. A newly reachable import fails rather than silently escaping
// this module's source boundary.
function mappingClosure(source) {
  const options = { allowJs: true, noLib: true, noResolve: true, target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = file => file === moduleFile
    ? ts.createSourceFile(file, lf(source), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS) : undefined;
  const program = ts.createProgram([moduleFile], options, host);
  const ast = program.getSourceFile(moduleFile), checker = program.getTypeChecker();
  assert.equal(ast.parseDiagnostics.length, 0);
  const declarations = new Map(), imports = new Set();
  const add = (name, node) => {
    assert.ok(!declarations.has(name), `duplicate declaration: ${name}`);
    declarations.set(name, node);
  };
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node) && node.name) add(node.name.text, node);
    else if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) {
      if (ts.isIdentifier(d.name)) add(d.name.text, node);
    }
    else if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause?.name) imports.add(checker.getSymbolAtLocation(clause.name));
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) imports.add(checker.getSymbolAtLocation(bindings.name));
      else if (bindings) for (const entry of bindings.elements) imports.add(checker.getSymbolAtLocation(entry.name));
    }
  }
  const result = new Map(), queue = ['reviewedTemplateTextMappings'];
  while (queue.length) {
    const name = queue.shift();
    if (result.has(name)) continue;
    const node = declarations.get(name); assert.ok(node, `missing mapping declaration: ${name}`);
    result.set(name, node.getText(ast));
    const visit = n => {
      if (ts.isIdentifier(n)) {
        const symbol = checker.getSymbolAtLocation(n);
        assert.ok(!symbol || !imports.has(symbol), `mapping requires separately reviewed import: ${n.text}`);
        if (declarations.has(n.text) && !result.has(n.text)) queue.push(n.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
  }
  return result;
}

export function verifyMotionSourceConservation(saved, fresh, historicalSource, currentSource) {
  assert.equal(hash(JSON.stringify(saved, null, 2) + '\n'), reportHash, 'historical report changed');
  assert.equal(hash(lf(historicalSource)), historicalModuleHash, 'historical module changed');
  const before = mappingClosure(historicalSource), after = mappingClosure(currentSource);
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), 'mapping dependency membership changed');
  assert.equal(before.size, 12);
  for (const [name, text] of before) assert.ok(after.get(name) === text, `mapping source changed: ${name}`);
  const { sourceFingerprints: oldSources, ...oldEvidence } = saved;
  const { sourceFingerprints: newSources, ...newEvidence } = fresh;
  assert.ok(isDeepStrictEqual(oldEvidence, newEvidence), 'motion evidence changed beyond source receipts');
  assert.equal(oldSources.length, 4); assert.equal(newSources.length, 4);
  const changes = [];
  for (let index = 0; index < oldSources.length; index++) {
    const old = oldSources[index], current = newSources[index];
    assert.equal(current.file, old.file, 'source receipt membership changed');
    const actual = old.file === moduleFile ? lf(currentSource) : lf(readFileSync(old.file, 'utf8'));
    assert.equal(current.sha256, hash(actual), 'current source receipt is not current');
    if (old.file === moduleFile) {
      assert.equal(old.sha256, historicalModuleHash);
      changes.push({ file: old.file, historicalSha256: old.sha256, currentSha256: current.sha256 });
    } else if (old.file === 'tests/material-parity/owner-initial-style-survey.mjs' && current.sha256 !== old.sha256) {
      // c509317 adds an opt-in appearance review. This historical collector
      // never opts in. The complete evidence equality above must still hold;
      // this exact source transition does not permit arbitrary reader changes.
      assert.equal(old.sha256, '77ea9fd39297f31e067f83b262f33a466b6b9a4b501071a178d993be170b731c');
      assert.equal(current.sha256, '4c6d0bc3e58b444a463821967d21626a00f62232918da556c0534ac4aa43822d',
        'unreviewed owner survey source change');
      changes.push({ file: old.file, historicalSha256: old.sha256, currentSha256: current.sha256 });
    } else assert.deepEqual(current, old, 'unreviewed source dependency changed');
  }
  assert.equal(changes.filter(c => c.file === moduleFile).length, 1);
  assert.ok(changes.length === 1 || changes.length === 2);
  return { schemaVersion: 1, historicalRevision: revision, historicalReport: { file: reportFile, sha256: reportHash },
    currentReportSha256: hash(JSON.stringify(fresh, null, 2) + '\n'), sourceReceiptTransitions: changes,
    unchangedMappingDeclarations: [...before].map(([name, text]) => ({ name, sha256: hash(text) })),
    groups: fresh.groups, observations: fresh.observations,
    allNonReceiptEvidenceFreshlyReplayed: true, historicalReceiptsRewritten: false,
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export function collectMotionSourceConservation() {
  const saved = JSON.parse(readFileSync(reportFile, 'utf8'));
  const fresh = collectOwnerInitialMotion();
  const historical = execFileSync('git', ['show', `${revision}:${moduleFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  return verifyMotionSourceConservation(saved, fresh, historical, readFileSync(moduleFile, 'utf8'));
}
