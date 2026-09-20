# Motion-review source conservation

This audit-only increment verifies why the prepared source batch no longer
replays after the precise-color instrumentation correction. It does not change
renderer code, plugins, comparison inputs, historical reports, or classifications.

## Observed failure and cause

The seven-source diagnostic replay found unchanged alignment, flex, whitespace,
button-paint, and base-alpha reports. The motion report differed only in its
`sourceFingerprints` entry for `input-equivalence-audit.mjs`. The delay report
stopped at its exact historical-parent comparison because it consumes that
motion report. This is not evidence that delay classifications themselves are
current; their complete replay remains outstanding.

The historical motion review records the whole audit module even though its
style survey imports only `reviewedTemplateTextMappings`. That mapping has a
12-declaration dependency closure. All 12 declarations remain byte-identical
after checkout line-ending normalization. The other three source receipts
remain exact. Fresh execution conserves every non-receipt field, including all
121 groups, 7,254 observations, pattern proofs, ordered membership, limits,
and explicit non-equivalence flags.

## Proof boundary

`tests/material-parity/motion-source-conservation.mjs` authenticates the saved
report and complete historical module at
`4650791a7208b841dd29f1ced015f98234949623`. It checks mapping dependency
membership and declaration text against current source, authenticates the
current receipts against current files, and compares the entire remaining
fresh report. The dependency scan conservatively includes matching top-level
names; TypeScript symbol resolution distinguishes actual imports from local
variables such as `path`. Reachable imports require separate review.

`material-motion-source-conservation.json` records both historical and current
hashes and the unchanged declarations. It does not rewrite a historical receipt
to pretend it describes current execution. It is a conservation prerequisite,
not a replacement for the prepared batch's current-value classification checks.

## Verification

- `node --max-old-space-size=1536 --test tests/material-parity/motion-source-conservation.spec.mjs`
  passed: one full-replay test, including 16 negative checks (each of the 12
  mapping declarations, observation count, findings membership, stale audit
  module receipt, and another invalid source receipt). Duration: 38,429 ms.
- `node --test tests/parity/material-audit-harness-inventory.spec.mjs`
  passed all four tests; the discovery-based harness includes the new test.
- `node --max-old-space-size=1536 scripts/audit-material-motion-source-conservation.mjs`
  generates the machine-readable conservation evidence.

The initial test correctly stopped on an overly conservative import-name check:
a local variable named `path` was mistaken for the module import. The check now
uses resolved symbol identity for imports and the full replay passes. No
historical evidence or acceptance threshold was changed to accommodate it.

## Remaining work

Integrate this explicit conservation boundary into historical motion/delay
source replay without relabeling old receipts as current. Rebind the prepared
batch's historical normalization to its pinned source, then classify current
values with the precise normalizer. In particular, the four disabled-button
background groups (60 observations) must not inherit rounded historical scalar
values. The prepared 146-group batch is still not integrated into the canonical
audit. This increment does not claim complete audit coverage or full parity.
