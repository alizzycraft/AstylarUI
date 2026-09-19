# Public range paint: opaque owners and reversed child depth

This is a bounded root-cause finding, not a renderer correction or a claim that
the Material range slider now works. It supplements the separate
[drag/focus evidence](material-public-range-drag-audit.md) and
[native travel geometry finding](material-public-range-travel-audit.md).

## Evidence and first divergence

The unchanged public `range-drag.mjs` consumer authors two 160px by 40px ranges
with values 30 and 65, min/max 0/100 and step 5. Both sides use that same document
and declarations. No Material plugin participates. A separate, passive companion
reads the Babylon scene after the original public application has settled; it
does not modify meshes, materials, styles, state, events or layout.

Eight captures cover reference/Astylar, DPR 1/2, and surface origins (0,0) and
(64,40), at a 640 by 360 viewport in Chrome 152.0.7977.84. All sixteen before/after
inspection screenshots are retained. Inspection leaves each raster byte-for-byte
unchanged, together with authored data, control state and event history. Runtime
errors and candidate diagnostics are empty; all surfaces report disposal.

Across all eight candidate controls, the corresponding reference control crop
contains visible native paint, but the candidate crop contains **only opaque
white pixels**. These crops use the shared authored position, checked against
the browser box—not the hidden candidate semantic input's geometry.

The candidate scene nevertheless contains all nine expected active, enabled,
visible meshes: the root, two owners and six range presentation meshes. With
the camera on positive Z looking toward zero, the observed depths are:

| Layer | World Z, approximately | Consequence |
| --- | ---: | --- |
| Input owner | +0.001 | Opaque white, depth writes enabled |
| Unfilled track | +0.001 | Coplanar with its owner |
| Root background | 0 | Opaque, depth writes enabled |
| Active track | -0.019 | Behind both opaque ancestors |
| Thumb | -0.039 | Behind both opaque ancestors |

The active track and thumb bounds lie inside their owner in X/Y. Their missing
paint is not explained by absence of the meshes, opacity zero, control-value
loss, surface translation, DPR, or positioning outside the control rectangle.
The captured ordering is a **confirmed core paint-order defect in this public
reduction**. Coplanar unfilled-track disappearance needs further draw-order/depth
testing evidence; this audit does not claim its exact GPU mechanism is proven.

The owning source path, also located in the actually served bundle, is:

1. `src/app/services/dom/input/range.manager.ts:35` creates a nearly transparent
   hit material with `disableDepthWrite=true` and attaches the presentation parts.
2. `src/app/config/browser-defaults.ts:298` supplies generic input white background;
   public resolved-style inspection confirms `#ffffff` for both ranges. The
   consumer did not author a compensating background. Authored-input equality
   is not a claim that browser and Astylar default styles already match.
3. `src/app/services/dom/elements/element-creation.service.ts:493` subsequently
   applies the generic element material. `element-material.service.ts:62`
   creates and assigns the opaque background material. Final scene inspection
   shows `first-material`/`second-material`, alpha 1 and depth writes enabled,
   rather than the manager's hit material.
4. `range.manager.ts:161` and `:168` supply negative render depths for the active
   track and thumb. `css-babylon-projection.ts:48` passes supplied depth through;
   `babylon-camera.service.ts:31` puts the camera on positive Z. This is an
   inconsistent paint-layer convention, not evidence that CSS X/Y must be
   calculated in world space or patched by the plugin.

History provides useful bounds: `cd222388` already contains the hit-material
depth-write guard. `572cf637` moves range geometry calculations into retained
CSS space but preserves the pre-existing negative depth constants. `34a17b20`
adds presentation opacity handling. Neither later change by itself establishes
correct composed paint ownership. No regression-introducing commit is claimed
without a historical runtime reproduction.

## Implementation handoff

Keep CSS layout and hit-testing geometry authoritative. Define the core control
paint ownership and depth ordering so that a control's background cannot replace
an interaction-only material and occlude its presentation, and descendants paint
in front of their proper background at the final rendering boundary. Verify
that rule with opaque ancestors, transparent/opaque authored backgrounds,
opacity zero, updates, stacking, translation and DPR variations.

Do not repair the comparison by giving the range an Astylar-only transparent
background, moving the thumb in CSS, changing fixture dimensions, or teaching
the Material plugin an independent depth convention. A manager-only guard is
insufficient if downstream generic material application overrides it.

This finding does not explain the Material example's swapped handles or black
ring, prove native range paint parity, or replace the independent focus/release
and native-travel findings. No private state mutation or proposed correction
was tested, and no core, plugin or canonical fixture was edited.

## Reproduction and verification

Capture into a new directory (existing evidence is never overwritten):

```powershell
node scripts/capture-public-range-paint.mjs --output=artifacts/material-parity/public-range-paint-inspection-v1
node scripts/audit-public-range-paint.mjs --check
node --test --test-concurrency=1 tests/material-parity/public-range-paint.spec.mjs tests/material-parity/public-range-travel.spec.mjs tests/material-parity/public-range-drag-evidence.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The capture completed with eight cases and no runtime errors. The verifier
authenticates all bundle inputs, served assets and screenshots, checks that
every original public range consumer/package input is unchanged, and records
seven owner-scoped instructions from the actual served bundle. The machine
report is [material-public-range-paint-audit.json](material-public-range-paint-audit.json),
SHA-256 `d4ae3f98a669c694a88f23d6af9296b58cf0c02933fa90f6c488036a11013070`.

The final combined run passes **15/15**, exit 0, no skips/cancellations/TODOs,
in **11,623.4188ms**. It includes a write-prohibited independent replay, fifteen
changed-evidence rejection controls, and DPR 1/2 synthetic tests detecting even
one changed pixel. The log is
`artifacts/material-parity/field-host-flow-input-audit/public-range-paint-combined-final.log`.
An earlier run failed because an unscoped instruction matched two services;
the verifier now requires the owning class. A subsequent 12-test pass omitted
the original drag suite through a mistyped filename; the final command checked
all four paths exist and ran the correct suite. Neither earlier result is
represented as the complete combined proof.

The full audit harness and enforced parity matrix remain required.
