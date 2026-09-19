# Direction-scoped alignment: source-bound classification adapter

The adapter prepares the four previously reviewed text-alignment groups for
canonical integration: sort, stepper content and the two bottom-sheet options,
**178 original observations** in total. It does not change the main builder,
canonical report, examples, renderer, normalization rules or visual thresholds.

Its input is the [contextual keyword review](material-ltr-alignment-review.md),
pinned to commit `140ba41`. Each collection independently replays the original
owner/ancestor input trees, browser keyword control and source history, and
requires exact equality with that pinned review. Original capture bytes and
the production normalizer are authenticated separately. It does not stream the
frozen 2GB canonical join on every invocation; that join is pinned to the prior
verified membership plan and the receipt explicitly says
`frozenCanonicalJoinReplayedNow:false`.

## What is classified

Only the requested alignment edge in the captured horizontal LTR contexts is
an equivalent representation: browser `start` and candidate owner-local `left`.
Every observation retains the original writing direction, writing mode,
last-line context, source membership and raw values. The attribution is
`reviewed-captured-ltr-alignment-keyword-correspondence`.

This is not a claim about whole-element input equivalence, candidate computed
inheritance, actual placement, generic logical-keyword support or renderer
causality. Those evidence flags remain false. RTL and vertical writing cannot
inherit this classification; no global keyword normalization is introduced.
All six other retained groups remain outside the adapter, including the
separately reviewed expansion owner and known overlay capture gaps.

## Integration safeguards

- A supplied subset must contain unchanged original captures in original order.
  Missing observations are enumerated; a partial capture cannot claim complete
  coverage.
- Classifier lookup requires the exact case, element, property, normalized raw
  values and complete original input digest.
- A transition requires the complete original canonical-row digest and an
  unresolved prior attribution. It cannot overwrite earlier reviews.
- Only classification metadata and reviewed-case membership may change. Every
  raw field and every unrelated complete row survives unchanged.
- Output validation checks all expected groups and observations, not just those
  remaining after classification; missing and duplicate groups fail.
- Full-source validation is independent of the pure projection. Synthetic
  transition tests are mechanics tests, not full canonical conservation proof.

The module is
`tests/material-parity/ltr-alignment-audit-source-binding.mjs`; its focused
suite is `ltr-alignment-audit-source-binding.spec.mjs`.

## Verification

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/ltr-alignment-audit-source-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The initial focused run passes **8/8**, exit **0**, no failures, skips,
cancellations or TODOs, in **85,519.0151ms**. The source replay runs with file
writes prohibited and checks that both canonical files remain unchanged. Ten
proposal/input mutation controls, seven invalid transition controls, classifier
identity, scope flags, incomplete subsets and classification coverage pass.
The log is `artifacts/material-parity/field-host-flow-input-audit/ltr-alignment-adapter-verification.log`.

After adding the full-payload receipt assertion, the unchanged full focused
command passes **9/9**, exit **0**, no failures, skips, cancellations or TODOs,
in **82,303.7275ms**. Its log is
`artifacts/material-parity/field-host-flow-input-audit/ltr-alignment-adapter-receipt-final.log`.

## Full-current-payload dry run

The separate source-replayed dry run exits **0**. The streaming reader
authenticates every compressed and decoded byte, retains all 8,339 complete
canonical rows, and finds all four original rows still unresolved and eligible.
Only classification metadata would change. All **8,335 other complete rows**
retain their exact ordered digest:
`ad91488e749ca7f2455c2ca151b0c6b7659563b26d328346c9baa24ae5dfd44e`.

Both canonical-file hashes are unchanged before/after. The unresolved count
would move from 1,960 to 1,956; this is a projection, not the integrated count.
The [compact receipt](material-ltr-alignment-transition-dry-run.json) binds the
adapter, log and canonical payload. The log retains all four before/after row
digests. The actual program, run with
`node --max-old-space-size=1536 --input-type=module`, is:

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readCaretConservationRows } from './tests/material-parity/owner-caret-canonical-conservation.mjs';
import { collectLtrAlignmentAuditInputs, stageLtrAlignmentTransitions } from './tests/material-parity/ltr-alignment-audit-source-binding.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const files = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'];
const before = files.map(f => hash(readFileSync(f)));
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const evidence = collectLtrAlignmentAuditInputs(JSON.parse(readFileSync(originalFile)), { parityPath: originalFile });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
const canonical = await readCaretConservationRows(readFileSync);
const { rows, ...result } = stageLtrAlignmentTransitions(canonical.rows, evidence);
assert.deepEqual(files.map(f => hash(readFileSync(f))), before);
console.log(JSON.stringify({ kind: 'source-replayed-ltr-alignment-current-dry-run',
  canonical: canonical.manifest, canonicalRows: canonical.rows.length, ...result }));
```

Stdout was redirected to
`artifacts/material-parity/field-host-flow-input-audit/ltr-alignment-current-dry-run.log`.
Synthetic mechanics checks are not substituted for this full-payload proof.

The complete discovered harness now contains 169 files (161 Material, four
general, four TTS), preserving all 43 legacy tests. Neither this focused run
nor the prepared adapter completes that harness or the enforced parity matrix.
Main-builder integration, conservation of the actual generated transition and
final audit acceptance remain outstanding.
