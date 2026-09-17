# Caret source binding: explicit filtered-capture coverage

The strict [complete-source collector](material-owner-caret-source-binding.md)
remains unchanged. `tests/material-parity/owner-caret-audit-source-binding.mjs`
adds the boundary needed by focused canonical tests: an authenticated subset of
the original capture can be reviewed without claiming complete coverage.

## Membership and evidence boundary

The supplied capture is read from within the Material artifact directory. Its
case/viewport/state metadata, tree descriptors and scalar inputs must match the
caller. Its members must then match the pinned original capture exactly. Cases
and measured owners may be omitted, but cannot be invented, duplicated, reordered
or changed. This includes authored and resolved input fields, not merely the
caret-color scalar.

The complete collector independently authenticates the pinned reports and source
receipts, reopens original trees, and replays all 4,050 original caret proofs and
classifications. Only afterward are contexts projected to the supplied members.
Both the supplied capture digest and complete-source binding remain visible.
The projection retains original ordering and records all missing cases, measured
inputs and caret observations explicitly.

Output groups are reconstructed from the selected original observations. Their
occurrence count, complete case list, first-12 display sample and state list are
recomputed for that subset. The first selected observation supplies its actual
review evidence; the full report's first witness is not copied into a subset
where that witness is absent. Reviewed and unresolved groups remain separate.

`validateOwnerCaretAuditInputs` defaults to `requireComplete: true`. It rejects
any missing case, measured input or caret observation. Explicit diagnostic mode
(`requireComplete: false`) still replays the complete source binding and the
subset projection; it does not waive provenance, membership or value checks.
Changing a saved `complete` flag or deleting missing-member lists cannot bypass
this replay.

## Verification

```powershell
node scripts/check-material-owner-caret-subset-binding.mjs
node --check scripts/check-material-owner-caret-subset-binding.mjs
node --check tests/material-parity/owner-caret-audit-source-binding.mjs
git diff --check
```

The checker passes with exit **0** and **15 rejection controls**. The original
population is **2,311 cases / 6,946 measured inputs / 4,050 caret observations**.
The diagnostic subset contains four cases and four measured inputs: two reviewed
caret observations and two unresolved observations (range and tooltip). It
explicitly reports **2,307 missing cases / 6,942 missing inputs / 4,046 missing
caret observations**.

Controls reject unknown metadata and owners, changed viewport/tree/scalar/local
stage/authored evidence, duplicated or reordered membership, an altered persisted
capture with self-consistent caller data, default full-coverage acceptance of a
subset, and forged completeness metadata. A local observation beyond index 12
verifies first-selected-evidence ownership. Empty and further-reduced subsets
remain incomplete. A full projection preserves every original observation and
the independent 118-group / 3,154-observation planned classification population.
Temporary generated diagnostic captures are removed after verification; original
captures and canonical audit artifacts are unchanged.

- Subset coverage SHA-256:
  `d9cf4790209847c20794d92e098cf8ec7a834757c93895bef5b595671a7cf14e`.
- Full coverage SHA-256:
  `1cf2e58cf4a339941ebab878b6f4da0707b988726a2f0b129e4c6270cba1fb8f`.
- Log: `artifacts/material-parity/field-host-flow-input-audit/owner-caret-subset-binding-check.log`,
  SHA-256 `03b3831977c6fdbe5ec3826fd3bcbf05a32ba98de91d00bbb5dcdc58b36d5ec3`.

The default complete-validation path also passes with exit **0**, independently
recollecting and validating all 2,311 cases / 6,946 inputs / 4,050 observations:

```powershell
node --input-type=module -e "import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{collectOwnerCaretAuditInputs,validateOwnerCaretAuditInputs,ownerCaretOriginalCapture}from'./tests/material-parity/owner-caret-audit-source-binding.mjs';const raw=JSON.parse(readFileSync(ownerCaretOriginalCapture));const evidence=collectOwnerCaretAuditInputs(raw,{parityPath:ownerCaretOriginalCapture});assert.equal(evidence.binding.status,'bound',evidence.binding.error);assert.deepEqual(validateOwnerCaretAuditInputs(evidence),[]);console.log(JSON.stringify({completeDefaultValidation:true,cases:evidence.coverage.suppliedCases,inputs:evidence.coverage.suppliedInputs,observations:evidence.coverage.suppliedObservations,canonicalIntegration:false}));"
```

Log: `owner-caret-complete-binding-validation.log` in the same folder, SHA-256
`f841965f5fca8cb870238133fb060bdc394318bbd009b83940eeb088fc46d943`.

## Remaining scope

This adds tested audit-source handling, not renderer behavior or canonical
attributions. The live unfiltered harness is not modified underneath its run.
Canonical integration must consume these source-bound contexts and independently
validate every output row; all original scalars, authored examples and unrelated
classifications must survive the prior/current conservation check. Register the
new focused tests once the live harness terminates, regenerate and no-write replay
the canonical report, and run the complete current harness and enforced parity
matrix. The canonical unresolved count remains **2,278**.
