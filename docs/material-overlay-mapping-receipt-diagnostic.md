# Overlay context replay: stale mapping receipt isolated

The unfiltered 110-file harness retains failures in the original-overlay-context
suite (tests 659, 661, 662 and 664 in this run). A read-only diagnostic identifies
one stale source fingerprint in `docs/material-overlay-owner-mapping-survey.json`.
This is **not** a passing production reader or a renderer fix.

`scripts/diagnose-material-overlay-mapping-receipt.mjs` first requires the
unchanged reader to fail at the audit-module source receipt. It then proposes
exactly this change **in memory only**:

- Source: `tests/material-parity/input-equivalence-audit.mjs`.
- Recorded SHA-256:
  `c57c725b10a0b94bf9c21ccf85e3764f47bccd9d629d004010429fd239c820c1`.
- Current SHA-256:
  `252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4`.

Every other field, including the complete mapping population, observation proofs,
group counts, parent-report digest and source inventory, is unchanged. The
complete mapping object excluding only `sourceFingerprints` has SHA-256
`196aee54e5b0d03ec39846635b177aa744b4f5a099e9c61fb5091bdce28f6df3`.
All other source receipts still match current files.

The unchanged reader runs against that proposal and verifies the historical
capture/module/mapping sources, then replays **91 cases / 200 original mapped
owners / 17,654 fresh root properties**. Original and fresh owner proofs match;
historical mapping data remains exact. This demonstrates that the single receipt
change is sufficient for this reader's complete replay, without changing the
recorded historical producer hash or any owner/style/context observation.

The original mapping file SHA-256 is
`c5acd99d242b0c59ec5121318fe30b83113b7a7b1efbdaf5a643d0a74232a9cc`.
The compactly serialized in-memory proposal SHA-256 is
`a34900cdf80c588f99e9f515fd7a3399fba4a9845ec672d65b45aea7695c173a`.
Those distinct identities are recorded; the proposal is never represented as
the on-disk file or original capture input.

## Historical diagnostic verification and follow-up

```powershell
node scripts/diagnose-material-overlay-mapping-receipt.mjs
```

The diagnostic completed and deliberately returned **exit 1** after emitting
the complete successful counterfactual replay summary, because the unchanged
on-disk reader still fails. Log:
`artifacts/material-parity/field-host-flow-input-audit/overlay-mapping-receipt-diagnostic.log`,
SHA-256 `c171033045fd3889a4318cc1efbdb7f035a2e0be64286f9e3006d67fb4003f55`.

No files were written by the diagnostic. The live harness was not restarted,
its assertions were not changed, and its dependencies remain unchanged.

After that run terminates, refresh the saved mapping's current-source receipt,
preserve all other fields and historical producer evidence, and rerun the
unchanged original-overlay-context suite including its negative controls. Then
regenerate dependent current-source reports in order and rerun the full current
harness. The fresh-only external-context limitation and candidate/rendering
equivalence flags must remain false.

## Current-source refresh and complete replay (2026-09-18)

The original generators now run successfully against on-disk evidence, followed
by their no-write checks:

```powershell
node scripts/audit-material-overlay-owner-mappings.mjs
node scripts/audit-material-overlay-owner-mappings.mjs --check
node scripts/audit-material-original-overlay-context.mjs
node scripts/audit-material-original-overlay-context.mjs --check
node scripts/audit-material-remaining-overlay-ancestry.mjs
node scripts/audit-material-remaining-overlay-ancestry.mjs --check
node --test --test-concurrency=1 tests/material-parity/original-overlay-context-survey.spec.mjs tests/material-parity/remaining-overlay-ancestry-review.spec.mjs
```

All six generator/check invocations exit **0**. The unchanged suites pass
**11/11**, exit **0**; TAP elapsed time is **25,333,631.1055 ms**, which is a
wall-clock result, not a renderer-performance measurement. The test log is
`artifacts/material-parity/field-host-flow-input-audit/caret-overlay-receipt-focused.log`,
SHA-256 `7b0c9a9f5964a056a99156a5de4ef4aedc8128fde73ed2c59927909d4879e888`.

Compared with committed baseline `5de7ce4`, exactly **seven hash fields** change
across the three JSON reports. Complete-object comparison after removing only
those seven paths proves every other field unchanged. Historical producer and
capture receipts are preserved. The conservation log is
`artifacts/material-parity/field-host-flow-input-audit/caret-overlay-receipt-conservation.log`,
SHA-256 `ad946c6c4907c1ed25176522944516c2cea75df6d9c6ddd529bd7f1c95bc1fdd`.

Preserved populations: 54 mapping groups, 91 cases, 200 owners, 600 identity
mutation controls, 17,654 external-root properties; and 48 remaining-ancestry
groups, 1,424 observations, 50 cases, 178 owners, 263 declaration patterns and
356 identity controls. All 18 missing tooltip context owners remain explicit.
This establishes current-source provenance and conservation, not candidate
replay, input equivalence, rendering parity, or canonical classification.

The earlier counterfactual diagnostic remains historical evidence and is not a
current acceptance command. Its use by the later overlay-caret collector must
be replaced with the now-valid production reader in a separately verified
instrumentation increment.
