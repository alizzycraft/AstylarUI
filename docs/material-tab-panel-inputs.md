# Tab-panel private typography input audit

## Finding and coverage

The candidate's `tab-panel` is not an ordinary text leaf with an omitted local
font-size declaration. All **70 original tab cases** replace the reference's
styled text span with a childless `showcase.material:tab-panel` plugin carrying
private content-selection, font-size, ink and baseline data. The reference
span inherits its font size through the Material tab-body wrappers from the
page's 16px, 14.4px or 18.4px request.

All 70 private `font-size` numbers match the corresponding reference computed
size. That numerical match does **not** establish CSS input equivalence: the
plugin consumes the private value and draws the glyphs itself. There are 52
Overview and 18 Activity observations; 17 custom-profile cases also carry the
private `baseline-offset: -0.2` adjustment. Other cases use zero. All captured
plugin phases are 1. These are the captured states, not coverage of transition
paint at intermediate phases.

Classification: **application/plugin authoring and text-ownership defect**.
This must not be cleared by the non-own-text container font-stage explanation.
It also is not a demonstrated core renderer failure under equivalent text
inputs, because the candidate bypasses that input/consumer path.

## Evidence

[Machine-readable evidence](material-tab-panel-inputs.json) scans all 2,311
original entries and authenticates both full input trees for each selected
case. It records the exact scalar input digest, case/state/profile/viewport,
reference text and ancestor declarations/computed sizes, candidate ancestry,
all three local-style stages, absence of retained core/control text, and the
actual private plugin data. Ambiguous or cyclic ownership, unexpected size
requests and potentially applicable unknown selectors are rejected.

Original capture:
`artifacts/material-parity/current-ancestry-audit/latest-report.json`, SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

Proof SHA-256:
`b292f0669f5a28810a3d9068bcea55575a51a410dcaac258a9ec13d05ae02832`.

Current source locations:

- `examples/material-showcase/src/app/astylar.component.ts:738`: fixed panel
  height, followed by the custom-profile height override.
- The same file, line 974: childless plugin, private size/color/selection and
  custom-only baseline offset.
- `examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts:338`:
  private renderer and 2x backing texture.
- The same plugin file, lines 365–380: data-derived ink/font, hardcoded font
  family, baseline coefficient and manual `fillText` calls.

The report binds current source digests and before/after excerpts for the full
revisions resolved from `4e58f58a` and `593f81b0`. They record the data-driven
font-size and later baseline-offset changes. Source history establishes what
changed, not developer intent or the quality of the entire commits.

### Existing independent runtime proof, not rerun here

`examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts`
already mounts the public packed API with the actual plugin and inspects the
texture bound to the content plane. Its recorded result is in
`docs/material-input-audit-investigation.md`, section **Private tab text paint
observed independently of CSS (2026-09-12)**.

That three-mount characterization holds private size 16 constant while CSS
size changes from 24 to 30, and observes unchanged 32px backing-texture font
instructions. Changing private size to 20 with CSS still 24 changes those
instructions to 40px. Private ink wins over CSS ink. This supplies a separate
consumer proof for the source finding; it does not provide per-case raster,
physical font, sharpness or final baseline equivalence for the 70 captures.
The historical run's font-asset and Zone.js warnings remain documented there.
This collector records that the runtime characterization was **not rerun**.

## Implementation recommendation — not implemented

Move ordinary tab text content and CSS typography back through core text
layout/paint. Keep plugin-owned transition orchestration only where it extends
the shared core rather than creating a competing text renderer. Remove the
private font/ink/baseline compensation after an equivalent-input reproduction
and the general owning-layer correction prove it unnecessary.

Required regression proof must vary CSS font size/family/weight, ink, tracking,
line height, selected content, theme scale and DPR, and verify actual text
ownership and local raster output. A test of a matching private `font-size`
number alone cannot establish this contract. Preserve separate transition and
resource-disposal checks. Do not replace the reference span with a matching
private canvas path.

## Verification and limits

```text
node scripts/audit-material-tab-panel-inputs.mjs
node scripts/audit-material-tab-panel-inputs.mjs --check
node --test tests/material-parity/tab-panel-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and independent no-write replay pass. Focused/inventory verification
passes **6/6**, exit **0**, **4,210.4053ms**, no skips, cancellations or TODOs.
Twenty-seven negative controls run for both contents in every profile, totaling
**216 rejection executions**. The suite is discovered in the current 126-file
harness inventory (118 Material, four general and four TTS).

No canonical attribution, fixture or renderer was changed. The canonical
2,160 unresolved groups remain. The original 120-file full run remains live
and is not replaced by this focused verification. Complete current harness and
the separate enforced output-parity matrix are still required.
