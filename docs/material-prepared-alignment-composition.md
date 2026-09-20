# Prepared alignment classifications: combined conservation proof

This is a read-only audit integration proof, not an integrated classification
count or a renderer correction. It composes the previously reviewed
[alignment/font](material-alignment-font-source-adapter.md),
[text-alignment](material-text-align-source-adapter.md), and
[direction-scoped alignment](material-ltr-alignment-source-adapter.md) adapters.

The [machine receipt](material-prepared-alignment-composition.json) authenticates
the complete original capture, replays all three source adapters and reads every
compressed and decoded byte of the current canonical payload. It then applies
the proposed classifications in sequence to all **8,339 complete rows**.

| Batch | Groups | Original observations | Projected unresolved after batch |
| --- | --- | --- | --- |
| Alignment and control font style | 72 | 4,016 | 1,888 |
| Text-alignment observation stages and tooltip omission | 49 | 2,677 | 1,839 |
| Captured horizontal-LTR edge correspondence | 4 | 178 | 1,835 |
| Combined | 125 | 6,871 | 1,835 |

The canonical unresolved count remains **1,960**. No canonical manifest,
compressed payload or Markdown changes during the operation. Before/after
hashes of all three files are retained and asserted equal.

## Conservation and limits

- All 125 proposed rows are disjoint and still unresolved in the current ledger.
- Only classification, justification, ownership and review metadata would change.
- Raw values, authored examples, membership, state order and all other row fields
  remain equal, not merely normalized into matching values.
- All **8,214 unrelated complete rows** preserve their exact ordered digest:
  `410260b606883a8c1691cdc9c80a39cdc1d289cfacb05ba25817a4a7a87af399`.
- The combined proof rejects overlap, missing/reordered rows, unexpected changes,
  altered occurrence/identity receipts, and inflated rendering or cause claims.

Of these groups, 101 describe observation-stage mismatches, not verified
candidate computed styles. Nineteen describe omitted or substituted requests.
One retains the tooltip's scalar text-alignment omission. Four establish only
the requested alignment edge in the captured horizontal-LTR context. These
classifications do not assert equivalent structures, used text placement,
renderer causality or screenshot parity.

The stage-mismatch, authoring and directional distinctions remain intact. In
particular, this proof does not normalize start to left globally, replace
omitted values with defaults, or accept a candidate middle declaration as
equivalent to a reference baseline.

## Commands

```text
node --max-old-space-size=2048 scripts/audit-prepared-alignment-composition.mjs
node --max-old-space-size=2048 scripts/audit-prepared-alignment-composition.mjs --check
node --test --test-concurrency=1 tests/material-parity/prepared-alignment-composition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation completed with exit 0. The initial focused composition/receipt and
inventory tests pass **7/7**, exit 0, **1,774.9159ms**, with no skips,
cancellations or TODOs. Thirteen corruption controls accompany the synthetic
mechanics test. The saved full-payload result is checked separately; synthetic
rows are not substituted for full canonical conservation.

The independent full replay with `fs.writeFileSync` prohibited and the normal
`--check` path also completed, **exit 0**. It replays the original source
collectors, authenticates the complete payload again, and reproduces the saved
receipt exactly. Both full-payload passes preserve the canonical files.
The final focused rerun also passes 7/7, exit 0, in **1,661.6479ms**.

Logs are under `artifacts/material-parity/field-host-flow-input-audit/`:
`prepared-alignment-composition-sep20.log`,
`prepared-alignment-composition-check-sep20.log`, and
`prepared-alignment-composition-tests-sep20.log`, and
`prepared-alignment-composition-tests-final-sep20.log`.

## Next integration boundary

The main builder still does not call these three adapters. Its integration must
preserve earlier classifier precedence, bind exact source provenance, generate
the full report, and prove that the actual generated transition matches this
projection without changing unrelated rows. Existing collectors include the
main module in their source fingerprints, so an orchestration change requires
an explicit, tested provenance-conservation proof—not removal of hash checks or
rewriting historical receipts as if they described current code.

The running full audit harness began with 171 files, before this new test existed.
Current discovery contains 172 files (164 Material, four general, four TTS),
retaining all 43 legacy suites. Report the new focused run separately; do not
retroactively claim the 171-file process executed it. Complete audit acceptance,
remaining input classifications and complete enforced parity remain outstanding.
