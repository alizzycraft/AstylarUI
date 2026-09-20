# Public cursor defaults and effective-cursor audit

Audit only: no renderer, plugin or canonical comparison inputs changed.
The [machine evidence](material-public-cursor-defaults-audit.json) separates a
documented legacy default difference from an independently confirmed core
interaction defect. It supplements the
[19-group Material cursor census](material-explicit-cursor-inputs.md); it does
not classify all of those owners or reduce the canonical 1,960 unresolved groups.

## Equal-input public reproduction

One shared input generator supplies the native HTML/CSS and package-root
`Astylar.mount()` application. There is no Material plugin, loaded stylesheet,
private inspection or renderer mutation in the application. It varies buttons,
labels and a div control with omitted, explicit default, explicit pointer,
hover-only pointer and parent pointer declarations where relevant.

The nine variants run at DPR 1 and 2, each at surface origins (0,0) and (64,40):
**36 pairs, 180 paired state boundaries, 72 hover screenshots, zero runtime
errors**. Real mouse actions capture initial, hover, held, release and leave.
The interior point is (172,84) relative to the surface: four pixels inside the
target's bottom-right corner. Native text ranges verify it is blank; native
elementFromPoint and the public candidate hover diagnostic verify the exact
target on all three interior boundaries.

Actual served HTML and JavaScript hashes, all 2,517 bundle-input hashes, package
versions, capture provenance, state, disposal and screenshot hashes/dimensions
are replayed. Chrome is 152.0.7977.84, Angular 20.3.29, AstylarUI 0.2.0,
Babylon 8.56.2. Source commit is `9d9bdc1511fa72ad63cefabe4b695b2ee91e049f`;
the then-uncommitted diagnostic sources are independently fingerprinted.

## First divergence and ownership

| Input | Browser / Astylar resolved cursor | Actual candidate cursor on blank target area | Classification |
| --- | --- | --- | --- |
| Omitted button/label cursor, including parent pointer variants | default / pointer | pointer | Documented core default difference |
| Button hover-only pointer, before hover and after leaving | default / pointer | Outside target; not interpreted as target cursor | Same default difference; matching hover alone hides it |
| Explicit label default | default / default | text | Confirmed core interaction defect |
| Explicit button default or pointer; div inheriting pointer | Matching values | Matching value | Controls pass within this cursor-only scope |

There are **88 owner-style differences** and **60 effective interior-cursor
differences**. These count different stages, not 148 distinct bugs. The latter
comprise 48 omitted-default differences and 12 explicit-label-default failures.

### Legacy type defaults

`src/app/config/browser-defaults.ts:266` gives labels a pointer cursor;
`:319` does the same for buttons. `StyleDefaultsService.getElementTypeDefaults`
merges those values over the global default before author rules. The captured
resolved styles already differ at that point, before geometry or Babylon
projection. Explicit button default is a passing differential control.

This is not a newly invented compatibility promise: the defaults file's opening
comment already acknowledges deliberate legacy styling, and catalog entry
`inherited-typography` permits element defaults to override the baseline.
Record the gap as a documented core default difference requiring a deliberate
browser-parity policy correction, not an exact-UA guarantee that already exists.
Do not add local default resets to every Material fixture to conceal it.

### Explicit default is replaced during pointer resolution

For `label-default`, author input and public resolved style both say default.
`PointerInteractionService.resolvePreferredMesh` at
`src/app/services/dom/interaction/pointer-interaction.service.ts:136` prefers
an owner's registered text mesh even when its box was the direct pick.
`updateCursor` at `:89` then treats default like auto: its text-mesh branch sets
the canvas cursor to text. `TextInteractionRegistryService.register` at
`src/app/services/dom/interaction/text-interaction-registry.service.ts:67`
retains the cursor and marks the owned mesh as text.

The evidence extracts and transpiles the unchanged relevant methods and default
initializers, verifies equality with the actual bundled package sources, then
evaluates owner-box picks with and without text ownership. Default becomes text
only with the owned text; pointer and crosshair remain intact. This demonstrates
the responsible rule independently of the browser reproduction, without
patching or mocking the public app into a desired result.

The current owned-text preference and non-default-cursor guard are present in
commit `bb483c589db81fc18645ce66432b3abe5da678c0` (`test(parity): enforce interactive
visual state`). This is source-history attribution, not a browser bisect proving
the first introduction of every cursor symptom.

## Implementation handoff

1. Preserve explicit resolved cursor values through core pointer resolution.
   Automatic text inference must not override an explicit default. Reuse this
   failing public reduction and add text/gap, ancestor inheritance, pseudo-state,
   disabled, nested-child, movement, update and multiple-surface coverage.
2. Separately decide and implement browser-compatible button/label defaults at
   the owning defaults boundary. Keep authored Material hover/disabled rules
   faithful to their source; do not replace them with unconditional pointer.
3. Revisit actual Material owner probes. The existing case-level hover check
   cannot prove sibling, label, held or non-hover cursor behavior. Test every
   affected target; do not attribute all missing hand cursors to this reduction.

No coordinate adjustment or plugin-local cursor system is justified by either
finding. The current evidence confirms only cursor behavior. It does not prove
overall visual parity: the retained screenshots also differ in surface paint
and text placement. A canvas style retained after pointer leave is not proof of
the actual cursor outside the canvas, so that value is recorded but not counted
as an effective target-cursor failure.

## Verification and retained failed attempts

```text
node scripts/audit-public-cursor-defaults.mjs --output=artifacts/material-parity/public-cursor-defaults-audit-v2
node scripts/bind-public-cursor-defaults.mjs --check
node --test --test-concurrency=1 tests/material-parity/public-cursor-defaults.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Capture exits **1**, intentionally preserving the 148 observed differences;
evidence is valid. Binding/check exits **0**. Final focused and discovery tests
pass **11/11**, exit **0**, **7,220.5192ms**, no skips/cancellations/TODOs.
The tests cover corruption rejection, source/package drift, public authoring,
exact effective-cursor failures and write-prohibited replay. Passing these audit
tests does not mean the renderer passes the reproduction.

The earlier v1 capture remains retained, exit 2: its top-left test point touched
label/div text and failed the blank-point guard. Only the diagnostic pointer
location was corrected for v2; no input style was changed.

Initial verifier attempts exhausted memory. Isolating the retained-report
corruption test exposed an enormous assertion-diff construction when replacing
the multi-megabyte report with `{}`. The verifier now uses `isDeepStrictEqual`
with a concise assertion message: identical equality semantics, no weakened
predicate. The unchanged full test set then completes in seven seconds. An
additional parent-process memory failure also occurred; its cause was not
independently established. Do not attribute unrelated readiness timeouts to
this diagnosis.

Capture artifacts: `artifacts/material-parity/public-cursor-defaults-audit-v2/`.
Logs: `artifacts/material-parity/field-host-flow-input-audit/`, including
`public-cursor-defaults-v1.log`, `public-cursor-defaults-v2.log`, initial/retry
verification logs and `public-cursor-defaults-verification-final-sep20.log`.
Raw report SHA-256:
`c68a5e4448457667413a8c2902bf8ad5c80e3741b1f9dbebe2336d3efa65250b`.
