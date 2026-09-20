import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';
import { verifyMotionSourceConservation } from './motion-source-conservation.mjs';

test('motion replay conserves every finding and rejects stale or changed mapping evidence', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const historical = execFileSync('git', ['show', `4650791a7208b841dd29f1ced015f98234949623:${file}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const current = readFileSync(file, 'utf8');
  const saved = JSON.parse(readFileSync('docs/material-owner-initial-motion-review.json', 'utf8'));
  const fresh = collectOwnerInitialMotion();
  const verify = (value = fresh, source = current) => verifyMotionSourceConservation(saved, value, historical, source);
  const result = verify();
  assert.equal(result.groups, 121); assert.equal(result.observations, 7254);
  assert.equal(result.unchangedMappingDeclarations.length, 12);
  assert.equal(result.historicalReceiptsRewritten, false);
  assert.equal(result.inputEquivalent, false);
  for (const { name } of result.unchangedMappingDeclarations) {
    const changed = current.replace(`function ${name}(`, `function changed_${name}(`);
    assert.notEqual(changed, current);
    assert.throws(() => verify(fresh, changed), /mapping/);
  }
  assert.throws(() => verify({ ...fresh, observations: 7253 }), /evidence changed/);
  assert.throws(() => verify({ ...fresh, findings: fresh.findings.slice(1) }), /evidence changed/);
  assert.throws(() => verify({ ...fresh, sourceFingerprints: saved.sourceFingerprints }), /not current/);
  const receipts = fresh.sourceFingerprints.map((s, i) => i ? s : { ...s, sha256: '0'.repeat(64) });
  assert.throws(() => verify({ ...fresh, sourceFingerprints: receipts }), /not current/);
});
