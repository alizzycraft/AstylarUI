# Field-host layout: exact canonical membership and a classification gap

The original source-backed field-host survey now has a checked join to the
canonical audit: **577 cases, 72 groups, 4,616 property observations**. No
canonical classification has been changed yet. The join reveals that promoting
only currently `unresolved` groups would miss six unjustified equivalence claims.

| Current canonical treatment | Groups | Source-backed disposition for integration |
| --- | ---: | --- |
| Unresolved harness discrepancy | 48 | Different host layout authoring |
| Generic equivalent representation (`minWidth`) | 6 | Explicit reference minimum-width request omitted on candidate |
| Generic used-value/expression harness discrepancy (`width`) | 18 | Same authored percentage, different observation stages |

## Why the minimum-width rows matter

All six reference families explicitly request `min-width: 0px` in the Material
host rule. Candidate field-shell rules omit that property, as do all three
captured local style stages. The canonical normalizer spells reference zero as
`0`; its generic `classifyStyleDifference` implicit-value branch currently calls
zero versus omission an equivalent representation without checking authored
rules or the differing formatting contexts.

The existing claim therefore lacks the technical justification required by this
audit. Zero is not merely a browser serialization inferred from omission here:
the captured reference explicitly requests it. This does not prove a visible
minimum-width bug in these screenshots, nor that every omitted minimum width
differs in used geometry. It does prove that the generic scalar shortcut cannot
serve as an authored-intent equivalence proof for these cases. The planned
classification preserves the omitted component request as an authoring difference;
any proposed semantic equivalence needs its own context-aware evidence.

Source boundary: `tests/material-parity/input-equivalence-audit.mjs`,
`classifyStyleDifference`, the `implicitReferenceValues` branch near line 1882.
The production source is unchanged while the 87-file harness snapshot is running.

## What the join verifies

- Validates the complete canonical compressed payload digest before streaming
  the discrepancy section; it does not load the 1.9 GB decoded report wholesale.
- Reopens the original 2,311-case capture and validates its digest. Selects all
  577 cases in the six field families with unique original case identities.
- Rechecks every stored survey source fingerprint and each selected case's
  identity, original tree descriptors, scalar values, three candidate stages,
  and authored requests from the original captured rules.
- Rebinds all 72 measured static host boxes and retains all 505 interaction
  geometry gaps, without borrowing another case's measurement.
- Matches all 72 canonical signatures, occurrence counts, sampled-case order,
  full state order and complete survey case membership against original inputs.
  Each group retains every case and an original-input digest, plus hashes of
  its complete canonical row and source survey group.
- Records the proposed classifications without editing the canonical report:
  54 application/plugin-authoring groups and 18 observation-stage harness groups.
  No candidate computed width, layout correctness or whole-input equivalence is
  inferred from the shared `100%` width request.

This join rechecks original scalar/rule/geometry associations, not all decoded
tree declarations. The existing field-host survey replay owns that complete
tree proof. Source digests and exact original tree descriptors connect the two
artifacts; neither a digest nor this membership join replaces the tree test.

## Integration plan

Preparation now exists in `tests/material-parity/field-host-layout-source-binding.mjs`:
the independent collector, classifier and classification-coverage validator
reopen the original capture and decoded trees. They preserve **2,311** capture
cases, **577** selected hosts, **1,734** negative cases, **72** groups and all
**4,616** property observations. Every complete selected proof digest matches
the earlier standalone survey. Static measurements and interaction geometry
gaps remain distinct. The core composition module is not yet wired to these
helpers in this preparation increment.

`node --test tests/material-parity/field-host-layout-source-binding.spec.mjs`
passes **3/3**, zero failures/skips/cancellations/todos, **41,499.6952 ms**, exit
**0** (session **95683**). Tests cover source replay, preserved input, complete
positive/negative population, all case/state/property coverage and mutation
rejection. The isolated classifier tests use only the eight-property scalar
contract; actual production normalization and precedence remain the next gate.

1. Add a source-bound production classifier using the reviewed declarations,
   owner identity, all state cases and source-tree proof. Preserve explicit false
   flags for whole-input equivalence and complete original renderer causality.
2. Give this classifier precedence over the generic implicit-value branch for
   these source-proven minimum-width omissions. Restrict it to its verified
   owners/properties; do not use unconditional scalar replacement or merely run
   it after `unresolved` classification.
3. Require the 72-row membership ledger to match exact canonical classification
   coverage, and test wrong owners, altered rules, missing cases, reordered
   states, geometry substitutions, and unsupported equivalence claims.
4. Generate the complete report and independently compare before/after. Preserve
   all original raw scalar observations and unrelated full rows. Expect **48**
   fewer unresolved groups if nothing else changes—not 72. Six additional rows
   must lose their unsupported generic equivalence label, while 18 retain harness
   classification with stronger authored-request provenance.
5. Re-run complete no-write verification and the final enforced comparison
   matrix. The separate [inline-flow defect](material-field-host-flow-public-proof.md)
   must not be substituted for a causal trace of differently authored originals.

## Verification

```powershell
node scripts/audit-material-field-host-layout-join.mjs
node --test tests/material-parity/field-host-layout-canonical-join.spec.mjs
node scripts/audit-material-field-host-layout-join.mjs --check
```

Generation, two tests and no-write replay exit 0. The latest focused test run
passes **2/2**, no failures/skips/cancellations/todos, **7010.066 ms**. The suite
checks the complete membership and rejects dropped/duplicated cases, changed
authored requests, reassigned tree descriptors, fabricated interaction geometry,
altered scalar values, incorrect occurrence counts, reordered samples/states,
and upgraded equivalence/core-cause claims. The machine artifact is
`docs/material-field-host-layout-canonical-join.json`.

The 87-file harness run began before this new test existed and does not include
it. It completed with **842/842 passing**, exit **0**, no failures/skips/
cancellations/todos, **4,162,034.7547 ms**. Its result remains labelled as that
snapshot, separate from this focused verification; the current discovered
inventory has 88 files. The original inventory includes all 43 legacy files,
79 Material files, four general parity files and four TTS files. No inventoried
test file changed between start commit `b059b4345b5d513b9eecf1b4a804498e31094d41`
and join commit `de9743963048ec57bf1eec1137d994b4874a4c8b`.

Command: `node scripts/run-material-audit-harness.mjs`, terminal session **6319**.
Log: `artifacts/material-parity/field-host-flow-input-audit/full-harness.log`,
**332,728 bytes**, SHA-256
`ee240b5398527fd1049bcd34c6074c2be6e9c4bcdc3520fd48e6c7f4effac0f9`.
This harness validates audit evidence, including retained failing browser logs;
it is not a renderer parity pass or the complete enforced comparison matrix.

The canonical report remains at its prior 2,486 unresolved groups. This increment
prepares an evidence-backed integration; it does not reduce that count, fix the
renderer, or establish complete comparison parity.
