# Text alignment: prepared source-bound classification adapter

The [49-group canonical proposal](material-text-align-canonical-plan.md) now has
a source-replayed adapter ready for subsequent main-builder integration. It
covers 2,677 original observations: 48 observation-stage groups / 2,659
observations and the tooltip missing-center group / 18 observations.

This does not promote canonical classifications, invent candidate computed
alignment, or establish rendering equivalence. The first category compares
browser computed alignment with omitted local declarations; it does not prove
that the candidate inherits or uses the browser value. The tooltip category
binds an explicit original center request omitted from candidate authoring and
retained as left. It does not diagnose displacement, blur or final paint.

## Binding and preservation contract

`tests/material-parity/text-align-audit-source-binding.mjs`:

- Pins the complete reviewed membership proposal to `e3bc804` and its prior
  frozen canonical join. It independently replays the original ancestry
  collector, all referenced input trees and their hashes; it does not trust
  whichever current canonical rows happen to remain.
- Requires the original 2,311-case capture digest and unchanged production
  normalization. Every proposed member binds case, family, owner, property,
  original scalar input, tree descriptors and the exact deduplicated ancestry
  proof. Each source proof is reviewed again with the same bounded attribution
  criteria.
- Reuses the existing exact observation-context classifier instead of building
  another inheritance/cascade evaluator. Partial supplied captures keep explicit
  missing-observation coverage and cannot claim completeness.
- Keeps all 42 previously reviewed groups and all 10 retained groups outside
  this proposal. In particular, inherited expansion-title requests, explicit
  left/start questions and known overlay scalar-capture gaps are not promoted.
- Validates exact emitted membership and classification metadata against the
  independently replayed source. It refuses missing/duplicate groups, altered
  raw inputs, missing cases and inflated equivalence/causality claims.
- Provides a pure metadata-transition dry run. Complete original row hashes
  prevent replacement of earlier/intervening reviews; all non-classification
  fields and every unrelated row remain unchanged.

The synchronous adapter does **not** replay the historical 2GB canonical join on
every invocation. That join was independently verified by the separate proposal
tests and is pinned by revision. Its receipt explicitly says
`frozenCanonicalJoinReplayedNow:false`. Current-payload compatibility and actual
production precedence must be verified separately before integration.

## Full-current-payload dry run

The adapter independently replayed the original source, then the existing
streaming reader authenticated every byte of the current compressed and decoded
canonical report and retained all 8,339 complete rows. All 49 proposed rows
matched their original complete-row hashes and remained unresolved. The pure
transition changes only their classification metadata; all other **8,290 rows**
retain their exact ordered digest:
`f1a073d29cf5b2aa0690e4f29c9c92835a46efb78c132013b8f214d765c3097f`.

The projected unresolved count is **1,911**, versus the current **1,960**.
Both canonical-file hashes were checked before and after and are unchanged.
The run exits **0**. The [compact receipt](material-text-align-transition-dry-run.json)
binds the source adapter, exact log and canonical payload digests; the log
retains all 49 before/after row digests and individual membership counts.
The earlier frozen proposal's unrelated-row digest differs because later
reviewed classifications exist in the current report; no raw-input difference
is inferred from that expected metadata change.

The exact Node program used by the dry run is shown below (run with
`node --max-old-space-size=1536 --input-type=module`; shell stdout was redirected
to the log named in the receipt):

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readCaretConservationRows } from './tests/material-parity/owner-caret-canonical-conservation.mjs';
import { collectTextAlignAuditInputs, stageTextAlignTransitions } from './tests/material-parity/text-align-audit-source-binding.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const files = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'];
const before = files.map(f => hash(readFileSync(f)));
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const evidence = collectTextAlignAuditInputs(JSON.parse(readFileSync(originalFile)), { parityPath: originalFile });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
const canonical = await readCaretConservationRows(readFileSync);
const { rows, ...result } = stageTextAlignTransitions(canonical.rows, evidence);
assert.deepEqual(files.map(f => hash(readFileSync(f))), before);
console.log(JSON.stringify({ kind: 'source-replayed-text-alignment-current-dry-run',
  canonical: canonical.manifest, canonicalRows: canonical.rows.length, ...result }));
```

Do not substitute the synthetic transition test for this full-payload check or
call a projected count an integrated classification result.

## Focused verification

```text
node --max-old-space-size=2048 --test --test-concurrency=1 tests/material-parity/text-align-audit-source-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The initial run passes **8/8**, exit **0**, in **86,955.5919ms**. The final run,
including the full-payload dry-run receipt check, passes **9/9**, exit **0**,
no failures/skips/cancellations/TODOs, in **92,166.0688ms**.
The full source replay and revalidation run with file writes
prohibited. Ten changed-input/proof/ordering controls and seven invalid metadata
transitions are rejected, alongside classifier identity, missing/duplicate
classification, incomplete subset and out-of-bound capture checks. Synthetic
transition rows test mechanics only; they are not canonical conservation proof.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`text-align-source-adapter-verification.log` and
`text-align-source-adapter-receipt-final.log`.
The automatic unfiltered harness inventory now contains 167 files: 159 Material,
four general and four TTS, retaining all 43 legacy tests. This focused run is not
execution of that complete inventory or the enforced parity matrix.

No main-builder, canonical report, comparison, plugin, renderer, reference input
or visual threshold is changed by preparing this adapter. Full canonical
integration and audit acceptance remain outstanding.
