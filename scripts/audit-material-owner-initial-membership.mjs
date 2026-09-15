import { readOwnerInitialBaseline } from '../tests/material-parity/owner-initial-style-baseline.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { bindOwnerInitialMembership } from '../tests/material-parity/owner-initial-style-membership.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const target = 'docs/material-owner-initial-style-membership.json';
const surveyFile = 'docs/material-owner-initial-style-survey.json', survey = JSON.parse(readFileSync(surveyFile));
const { manifest, rows } = await readOwnerInitialBaseline();
assert.equal(manifest.compressedSha256, survey.canonicalCompressedSha256);
const bytes = readFileSync(survey.capture.file); assert.equal(hash(bytes), survey.capture.sha256);
const raw = JSON.parse(bytes), groups = bindOwnerInitialMembership(rows, raw);
assert.equal(groups.length, 600);
const files = ['tests/material-parity/owner-initial-style-baseline.mjs', surveyFile, 'scripts/audit-material-owner-initial-membership.mjs',
  'tests/material-parity/owner-initial-style-membership.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/input-equivalence-policy.mjs'];
const result = { schemaVersion: 1, kind: 'owner-initial-style-canonical-case-membership',
  canonicalCompressedSha256: manifest.compressedSha256, capture: survey.capture,
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  groupCount: groups.length, unresolvedOccurrences: groups.reduce((n, g) => n + g.occurrences, 0),
  preservedStaticOccurrences: groups.reduce((n, g) => n + g.preservedStaticCases.length, 0),
  splitGroups: groups.filter(g => g.preservedStaticCases.length).length,
  canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false, groups,
  limits: ['This verifies original case membership, not new attribution or rendering equivalence.',
    'Existing static retained-text observations are independently replayed and kept separate from unresolved interaction states.',
    'No canonical row, original scalar, renderer, fixture or reference is rewritten.',
    'This binding accepts only the reviewed static-stage sibling classification; any new competing classification requires fresh review.'] };
const output = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output, 'owner membership report is stale');
else writeFileSync(target, output);
console.log(JSON.stringify({ groups: result.groupCount, unresolvedOccurrences: result.unresolvedOccurrences,
  preservedStaticOccurrences: result.preservedStaticOccurrences, splitGroups: result.splitGroups, canonicalAttributionChanged: false }));
