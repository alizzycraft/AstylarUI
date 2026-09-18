# Original range-input caret observations

The [machine survey](material-range-caret-input-survey.json) reviews all **four
range-input caret groups / 156 observations / 78 original cases** retained by
the [parent caret survey](material-owner-caret-input-survey.md). It scans every
one of the 2,311 original cases to establish exact membership, reopens both input
trees and replays the complete original caret proof for every selected owner.
All **13,884 original scalar checks** match. No input or canonical classification
is changed.

## What is now established

Both mapped owners are unique, childless `input` elements of type `range`, not
text inputs or contenteditable owners. The original frame/page ancestor proofs
have no captured caret/reset/motion requests on either side. The parent survey's
two explicit input-owner exclusions are retained and examined, not deleted.

For every observation the browser records a computed `caretColor`, while all
three candidate local style stages omit it. This is an observation-stage
difference; it is not evidence that a candidate computed color is equal, missing,
or visibly painted. No candidate value is synthesized from the browser's text
color. Range identity does not close the separately reported empty-text-input
caret bug.

The current source also routes ranges separately:

- `src/app/services/dom/input/input-element.service.ts`, `createInputElement`,
  dispatches `InputType.Range` to `RangeManager.createRange`, separately from
  `TextInputManager.createTextInput`.
- `src/app/config/browser-defaults.ts`, `elementDefaults.input`, declares
  `color: #2c3e50`, matching the captured local range text color.
- `src/app/services/text/text-selection.service.ts`, `updateTextCursorColor`,
  resolves omitted/auto caret color from text style when that text-cursor path
  is used. It must not be assumed to execute for ranges merely because their
  captured styles contain a caret-related observation.

These are source ownership references, not a new runtime execution proof or a
user-agent-default equivalence claim. The observed browser caret/text values and
candidate local color remain distinct in every machine record.

## Preserve the other slider input discrepancies

The same complete owner replay independently records the control attributes:

| Field | Observations with different inputs |
| --- | ---: |
| Minimum | 78 |
| Maximum | 78 |
| Step | 156 |
| Value | 0 |
| Disabled state | 0 |

The reference step is `5`, whereas the candidate step is `1`. The paired candidate
controls divide their domains at `50`; the reference bounds depend on the peer
thumb. These differences are preserved per owner/state, including the original
attributes, rather than being excused by equal starting values or common range
type. The associated layout/hit-region and peer behavior remain covered by the
[slider peer survey](material-slider-peer-pointer-survey.md) and
[public range interaction proof](material-public-range-drag-audit.md).

This evidence does not prove that those authored differences explain swapped
thumb targeting or the entire jerky/restricted-drag symptom. The public proof's
premature-release defect, native thumb-travel question and original Material
input differences remain distinct investigations.

## Verification and provenance

The parent report is pinned to `f70c6b92f1135a7a5196e1393e8767345892de7f` and its
supporting sources are checked. Production normalization functions are extracted
by AST with exact hashes; they are not rewritten for this subset. Every original
case, input/tree digest, ordered group membership and full proof digest is
verified, including disabled versus enabled color groups.

```powershell
node scripts/audit-material-range-caret-inputs.mjs
node scripts/audit-material-range-caret-inputs.mjs --check
node scripts/check-material-range-caret-inputs.mjs
```

Generation, complete no-write replay and the final checker pass with exit **0**.
The checker verifies **18 negative controls**, **six changed-evidence controls**
and **14 conservation controls**. These reject wrong control kinds, editable
owners/children, missing fields or provenance, explicit caret/reset/motion
requests, altered memberships/receipts and fabricated equivalence. Changed
control bounds, step, value, disabled state and consistently changed reference
caret measurements remain visible rather than being forced back to the baseline.

The initial checker exposed the JSON boundary of the synthetic root's
`type: undefined`: JSON omits that property. The checker now compares the exact
wire representation after the collector has verified complete live proof
digests. Two controls reject substituting `null` or a fabricated root type.
No original input or proof was rewritten to pass the check.

Machine report SHA-256:
`0417d962d33690ee0a509d57b36800ac0507fe1fe2aa4fc3e5020d969b20c87d`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `range-caret-input-generation.log` and `range-caret-input-check.log`:
  `007e3a2aa8bc0673f45c31a5de7dd598cde1dc3a8c83dbea3a415bd32797367e`.
- Initial failed `range-caret-input-controls.log`:
  `82ff0006ece529e46c351d01fee3b2eb0a439b81b17bc10a5756673d4f569d42`.
- Passing `range-caret-input-controls-retry.log`:
  `4be1d94e14beea0a5150079bf88379be1710a036e33e57407d79709d5e818780`.

All equivalence, candidate-computed, descendant-caret, renderer-cause and canonical
change claims remain false. The full harness is still running with unchanged
dependencies; registration of these standalone checks, bounded canonical
attribution and the complete enforced parity matrix remain outstanding. The
canonical unresolved count stays **2,278**.

## Current-source replay and registration (2026-09-18)

The historical whole-module source hash no longer matches the canonical audit
builder after its caret-classification integration. The range collector retains
the original parent's bytes and digest and now distinguishes that historical
receipt from the exact seven normalization functions it executes. Their existing
AST digest check remains mandatory; every other dependency still requires a
complete-source match. The report records both old and current source digests.

Generation and `--check` both exit **0**. Whole-object comparison against
`f7e8d2a`, excluding only the new provenance array and source fingerprints,
preserves every other field: **four groups / 156 observations / 78 cases /
13,884 scalar checks**. Non-provenance SHA-256:
`fb941e4a906f9e9b0c0b99a28668821fe79f58395c8ae58cb97f07a571c4f546`.
The unequal control inputs remain explicit: **78 min**, **78 max**, and **156
step** differences. This does not establish slider interaction or input parity.

The original range checker is now registered alongside the tooltip and overlay
commands. All **18 rejection**, **six changed-evidence**, and **14 conservation**
controls are retained. Running the three command tests and four inventory tests
passes **7/7**, exit **0**, **26,007.1205 ms**:

```powershell
node scripts/audit-material-range-caret-inputs.mjs
node scripts/audit-material-range-caret-inputs.mjs --check
node --test --test-concurrency=1 tests/material-parity/pending-caret-context-commands.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-range-reader-refresh.log`: SHA-256 `adcede5f5c93ba75a6fc89f922fdb829feef59cc932ed3f0a9ba848308fb39af`.
- `caret-range-reader-conservation.log`: SHA-256 `f7d04a74386526594c3779b0f495754cbf9fb25f5fc31c21c96f9cb66d6bb7a8`.
- `caret-all-context-command-registration.log`: SHA-256 `7fd75d43688ed51a14ddd9b4bcf0465cc8e072db5dc032707e5a8792e3f4ffb4`.

The preceding section records the original investigation status. Registration
is now complete; canonical promotion, complete current harness acceptance and
the full enforced parity matrix are still outstanding.
