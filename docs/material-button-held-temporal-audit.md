# Held buttons: release and click before native release

The [machine audit](material-button-held-temporal-audit.json) records a fresh,
frozen-build temporal replay of **all 57 primary held-button cases** from the
[paint-input survey](material-button-state-paint-survey.md). It retains seven
families, four profiles, both desktop DPRs and the additional tooltip comparison
viewport. This is an audit increment, not a renderer fix or parity acceptance.

## Demonstrated sequence

All 57 cases initially receive the expected native pointer-down and acquire
the correct renderer pressed-element ID. The HTML button is `:active` and its
state-layer opacity is 0.12.

By settlement, **17 cases lose pressed state**: eight core and nine tooltip
cases. Sixteen first show the loss between the held command and settlement;
core/custom/desktop-DPR1 already shows it in the post-command observation while
rendering is in progress. They record one public Astylar pointer-up and one
public click while there has been **no native pointer-up, click or cancel**.
They also record two canvas blurs and a higher render-session revision.
Their host paint has reverted to the authored hover background. The reference
button remains active at opacity 0.12. The other **40 cases retain pressed
state**, active paint and no public release/click until the explicit release.

These observations persist through authored-style measurement and screenshot
capture. All settled normal, interaction and effective candidate styles match
their original capture exactly. After the explicit mouse release, both sides
have one native pointer-up and click and no candidate pressed ID; the candidate
public click count is one, not two. The original captures are unchanged.

The reader checks all eight boundaries and cumulative native/public event
prefixes. It preserves raw native targets: some reference events hit anonymous
label spans, with the independently measured expected button still `:active`.
No synthetic pointer action is injected by this trace.

## Root-cause lead, not yet a proved code path

The evidence moves the next investigation from missing `:active` styling to
**focus/rebuild interaction lifetime**. The installed Babylon 8.56.2 code in
`node_modules/@babylonjs/core/DeviceInput/webDeviceInputSystem.js:593` handles
canvas blur by zeroing pressed pointer buttons and generating device events.
`src/lib/astylar-interaction-runtime.ts:579` handles a scene pointer-up by
clearing active state, dispatching pointer-up, and potentially activating and
clicking the pressed target. `src/lib/astylar.ts:594` queues semantic focus sync
after rebuild, and `src/lib/astylar-semantic-bridge.ts:343` can focus the native
semantic node, moving focus away from canvas.

This is a plausible causal chain supported by local source and the temporal
trace, but the exact triggering call stack has **not** yet been captured.
Do not label it a confirmed source-level cause. The core example changes its
sibling state-layer data with benchmark phase; tooltip hover changes application
open state. Those update triggers must remain distinguishable from the shared
renderer lifetime behavior.

This finding is separate from the already demonstrated static public button
focus discrepancy: that earlier no-update reproduction retained logical pressed
identity while native focus remained on canvas. It does not by itself explain
the new pre-release loss.

## Next proof and owning boundary

1. Capture focus/blur and public release call stacks without modifying behavior.
2. Reduce to ordinary public-API buttons with a compatible, stable-ID visual
   update while held; apply the equivalent DOM update to the HTML reference.
   Keep no-update and update-after-release controls, plus DPR and repeat runs.
3. Distinguish genuine cancellation/loss of focus from internal focus transfer.
   Verify the exact release/click sequence, target identity, native and logical
   focus, and retained active paint across update/settlement.
4. If confirmed, the correction belongs in shared core focus, reconciliation
   and device-input integration. Do not add a Material-only active-color override
   or a plugin-owned pointer-state substitute. The separate unequal paint-layer
   authoring still needs its own equivalent-input correction after core proof.

## Provenance and verification

The capture uses the original runner's function declarations, original paired
page context/actions, identical browser version, and checkpoint-hashed served
HTML, scripts, stylesheets and fonts. Both original input trees and all 114
fresh screenshots are hash-checked. Boundary sampling introduces additional
read-only round trips; historical timing and observation neutrality are not
proved. No original capture, canonical fixture or renderer source was changed.

```powershell
node scripts/capture-material-button-held-trace.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/button-held-temporal-audit
node scripts/audit-material-button-held-trace.mjs
node --test tests/material-parity/button-held-temporal-audit.spec.mjs
node scripts/audit-material-button-held-trace.mjs --check
```

Capture session **17458** exits **0**, all 57 cases. Generation and no-write
reader replay exit **0**. Both focused tests pass, zero skipped/cancelled/todo,
including 20 altered-trace controls and rejection of corrupt original capture
bytes. The initial verifier failed because it assumed the reference native hit
target must be the button itself rather than its label span; that assumption
was corrected without rewriting any event or accepting an inactive owner.
A stronger timing assertion also exposed the one earlier loss boundary above;
the report preserves that timing difference rather than forcing all 17 into
the same sample interval.

This new test file was added after the running **95-file harness** took its
inventory; it is not retroactively included in that run. Canonical attribution
remains unchanged, with **2,330 unresolved groups**. Full current harness,
enforced rendering matrix and the rest of the audit remain required.
