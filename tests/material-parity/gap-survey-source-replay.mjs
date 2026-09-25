import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { restoreMappingReadAdapterSource } from './audit-evidence-session.mjs';
import { borderEvidenceBaseline, verifyBorderEvidenceSourceTransition } from './position-composition-producer-transition.mjs';

const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
export const gapSurveyNormalizationRevision = '4650791a7208b841dd29f1ced015f98234949623';
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';

// The survey is historical evidence, not a demand that the live normalizer
// retain its old color-rounding bug. That dependency is read historically;
// The mapping module's later read adapter can be restored only by its exact
// import substitution; its entire remaining source must retain the old digest.
// The reviewed border extension requires both complete pinned sources and the
// unchanged shared selector. No other dependency change is admitted.
export function readGapSurveySource(descriptor, readers = {}) {
  const readCurrent = readers.current ?? (file => readFileSync(file, 'utf8'));
  const readHistorical = readers.historical ?? ((revision, file) => execFileSync('git',
    ['show', `${revision}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  let source = descriptor.file === moduleFile
    ? readHistorical(gapSurveyNormalizationRevision, descriptor.file) : readCurrent(descriptor.file);
  if (descriptor.file === 'tests/material-parity/generated-node-mapping-evidence.mjs' && hash(source) !== descriptor.sha256) {
    source = restoreMappingReadAdapterSource(descriptor, source);
  }
  if (descriptor.file === 'tests/material-parity/border-initial-input-evidence.mjs' && hash(source) !== descriptor.sha256) {
    const historical = readHistorical(borderEvidenceBaseline, descriptor.file);
    verifyBorderEvidenceSourceTransition(historical, source);
    source = historical;
  }
  assert.equal(hash(source), descriptor.sha256, `gap survey dependency changed: ${descriptor.file}`);
  return source;
}

export function bindGapSurveyNormalizer(survey, currentSource = readFileSync(moduleFile, 'utf8')) {
  assert.equal(survey.productionNormalization.module, moduleFile);
  const descriptors = survey.sourceFingerprints.filter(s => s.file === moduleFile);
  assert.equal(descriptors.length, 1, 'historical normalizer must have one full-source receipt');
  const historical = bindOwnerCaretNormalization(readGapSurveySource(descriptors[0]), survey.productionNormalization);
  const parsed = ts.createSourceFile(moduleFile, currentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const functions = survey.productionNormalization.functions.map(name => {
    const nodes = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(parsed);
  }).join('\n');
  const current = bindOwnerCaretNormalization(currentSource,
    { ...survey.productionNormalization, sha256: hash(functions) });
  return input => {
    const before = historical(input), after = current(input);
    for (const property of ['columnGap', 'rowGap']) assert.equal(after[property], before[property],
      `current ${property} differs from historical gap evidence`);
    // Expose only the verified gap projection, never historical color values.
    return { columnGap: before.columnGap, rowGap: before.rowGap };
  };
}
