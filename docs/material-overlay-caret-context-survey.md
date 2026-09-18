# Complete retained overlay caret declaration/context survey

The [machine report](material-overlay-caret-context-survey.json) joins all
**13 retained groups / 378 observations / 109 original cases** from the
[original caret survey](material-owner-caret-input-survey.md) to source-bound
fresh reference ancestry. All **33,642 original scalar comparisons** and original
caret/identity proofs are replayed. This is a declaration/context investigation,
not a canonical attribution change or a visible-caret/renderer proof.

## Original declaration findings

| Population | Groups | Observations | Retained owner-path requests |
| --- | ---: | ---: | --- |
| Bottom-sheet copy, dismiss, overlay and panel | 4 | 100 | No captured caret/reset/motion declarations. |
| Dialog actions, cancel, copy, panel, save and title | 6 | 192 | Original transition declarations remain, including empty enumerated longhands on surface/inner-container ancestors and separate noop rules. Button ancestors additionally retain their motion rules. |
| Snackbar overlay and surface | 2 | 68 | No captured caret/reset/motion declarations. |
| Tooltip popup | 1 | 18 | Both the named 150 ms show-animation rule and animation-noop rule remain. |

No reviewed original owner path contains a direct `caret*` or `all` reset
declaration. No candidate owner-path declaration/stage requests caret/reset/motion.
That statement concerns captured declarations, **not** equivalent computed values
or an absent visible caret. No reviewed path contains an input/textarea or
contenteditable owner; editable descendants are outside this proof.

Every raw style attribute is retained. Reference rule selectors, active flags,
conditions, original CSS text and even empty declaration values survive. Candidate
selector matching is conservative: unknown selectors remain possible, not silently
excluded. Candidate authored, normal-resolved and interaction-resolved stages are
reviewed independently. The style-less synthetic candidate root is identified
explicitly rather than being fabricated as a styled DOM ancestor.

The **59 scalar/full-tree authored-rule gaps** on bottom-sheet and snackbar overlay
wrappers remain explicit, together with their missing/extra-rule evidence. They
are not removed by matching owner measurements or by observing fresh ancestry.

## Evidence joins and limitations

The parent survey is pinned to commit
`42fd47312ed6acc093d55eeced5e86b595a4d364`, with current supporting-source checks.
Every original input and both trees are hash-bound; each full caret proof is
rederived rather than accepting a sample or precomputed reason label. The fresh
tree must reproduce both its original owner mapping and complete original caret
proof. Each observation retains exact original membership and its checkpoint,
input trees, fresh capture descriptor and external stylesheet digest.

The 91-case original overlay context capture covers dialog, bottom-sheet and
snackbar. The original survey used a documented in-memory proposal while its
on-disk mapping receipt was stale. Following the separately verified
[current-source refresh](material-overlay-mapping-receipt-diagnostic.md), the
collector now invokes the production reader directly and records
`originalOverlayContextVerification.onDiskReaderPasses: true`. It no longer
depends on a diagnostic that requires the on-disk reader to fail. Historical
capture receipts remain unchanged; this does not establish candidate replay.

The remaining 18 tooltip cases use the
[fresh hover/held context replay](material-tooltip-caret-context-survey.md).
The fresh external overlay-root/body/html paths retain computed caret, color,
motion and inline requests; their full CSSOM remains in hash-bound raw evidence.
No new cascade engine tries to infer matching external rules or historical
unrecorded values. The tooltip's fresh zero-duration/no-animation measurements
do not erase the original named-animation declaration.

All input-equivalence, candidate-computed, descendant-caret, historical-context,
candidate-replay, rendering-equivalence and renderer-cause claims stay false.
The original **2,278 unresolved canonical groups** remain unchanged.

## Verification

### Current reader verification (2026-09-18)

The original historical-parent whole-module receipt stopped replay after the
canonical builder gained caret classifications. The collector now verifies the
same seven executed normalization functions with the existing AST-bound helper,
and still checks every other dependency in full. Recorded and current source
digests are both retained; the immutable parent is not refreshed. Tooltip
capture provenance additionally verifies the historical whole-module bytes at
`42fd47312ed6acc093d55eeced5e86b595a4d364`, separately from current normalization.

Full-object comparison against `874d1a5`, excluding only the explicitly changed
provenance fields, preserves every observation, declaration, raw value, context,
count and limitation. Overlay non-provenance digest:
`34fca00a8854a725ec041e0df0b9850a60fcd451267d1c2d59af0263fda08cc6`.
Tooltip non-provenance digest:
`04c235155f11f4a14b00e8e7ba65fe887ec616f9fb7cf5e2ed9bf9de5849bd6a`.
Conservation log: `artifacts/material-parity/field-host-flow-input-audit/caret-context-reader-conservation.log`,
SHA-256 `1d4105ca1acccabf7fc687c8fad21472f3525bc274c9214ff6f690e8ea15da3e`.

Both generators and no-write checks exit **0**. The complete overlay checker
retains **15 negative**, **13 changed-evidence**, and **12 conservation**
controls. Its generation/check/control log is
`artifacts/material-parity/field-host-flow-input-audit/caret-overlay-reader-refresh-v2.log`,
SHA-256 `2b9856cbb667f52fd4b1b09b182d4c2986e8dfd81112d560345583503598af32`.

The actual tooltip and overlay checker commands are now registered in automatic
harness discovery via `pending-caret-context-commands.spec.mjs`; this is not a
mock summary. Together with the inventory guard they pass **6/6**, exit **0**,
**20,670.8545 ms**. Tooltip retains all **34 original rejection controls**, two
changed-observation controls and four additional historical/current source
rejections. No canonical caret promotion or complete rendering acceptance is
claimed. Full current harness and enforced parity matrix remain outstanding.

Command: `node --test --test-concurrency=1 tests/material-parity/pending-caret-context-commands.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs`.
Log: `artifacts/material-parity/field-host-flow-input-audit/caret-context-command-registration.log`,
SHA-256 `2daf0c7ed6e4e8f492d6087aff20da445ea53a5534d0fe87008c03481913908b`.

### Original investigation commands

```powershell
node scripts/audit-material-overlay-caret-context.mjs
node scripts/audit-material-overlay-caret-context.mjs --check
node scripts/check-material-overlay-caret-context.mjs
```

Generation and complete no-write replay finish with exit **0**. The final checker
also finishes with exit **0**, independently compares the full saved report and
exact ordered parent membership, and verifies:

- **15 negative controls:** corrupt mapping/path topology, duplicate nodes,
  missing computed/declaration/stage evidence, fabricated synthetic-root styles,
  invalid selectors and missing original CSS text are rejected.
- **13 changed-evidence controls:** camel/kebab caret declarations, resets,
  candidate motion, inactive/empty-valued motion rules, unknown selectors, raw
  style attributes and editable-owner evidence remain visible.
- **12 conservation controls:** removed/duplicated groups or cases, changed
  original/fresh receipts, external values, counts and inflated claims fail a
  full-object comparison.

The first sensitivity run failed with an out-of-memory `DataCloneError` and a
PowerShell out-of-memory exit. Its log is preserved. Intentional mismatch checks
now use the same complete object comparison with bounded assertion messages,
avoiding construction of a multi-megabyte formatted diff. The retry passes;
no fields, comparisons or sensitivity cases were removed.

During this period a separate child of the still-running full harness reported
`Committing semi space failed` / exit 134 in
`owner-grid-initial-source-binding.spec.mjs`. That result remains a failure,
requires investigation/rerun, and is not covered by this checker's successful
retry. The full harness and its live dependencies were not restarted or edited.

Machine report SHA-256:
`4c641cd2c70842d90bb514db71786d966b166c07c0bbc41e059aec43b2cb4442`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `overlay-caret-context-generation.log` and `overlay-caret-context-check.log`:
  `85ba23d6c00b9f10477b3957ac021f5f37473aaa43cbe992fd06d851057f8b82`.
- Initial failed `overlay-caret-context-controls.log`:
  `d18198ace0094cacd0d1fc878eb79e26d25d1cf79fa3bee219a9f2228dc8c3bb`.
- Passing `overlay-caret-context-controls-retry.log`:
  `56bdbf0e880add6e3eb531d84ea029d6e06ed9a4f5a0c5ee4919baf87b82b4e8`.

## Next work

Repair the proven stale current-source receipt only after the full harness
terminates; rerun the unchanged original suite and negative controls, then
regenerate this survey against the direct reader instead of its explicit
counterfactual diagnostic. Integrate standalone checks into the next complete
harness inventory. Any later bounded attribution must preserve the declaration
uncertainty, external-context boundary and 59 authored-rule gaps.

This does not resolve tooltip placement/blur, missing snackbar, empty-input
caret behavior, the 2,278-group canonical attribution backlog or the complete
enforced parity matrix. Those remain separate required work.
