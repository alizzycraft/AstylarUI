# Public compatible-update proof: semantic focus releases a held button

This is a confirmed core interaction defect in an isolated public reproduction,
not a renderer fix or a declaration of Material input/rendering equivalence.
The [machine record](material-button-held-update-root-cause.json) is generated
from captured browser evidence by `scripts/record-button-held-update-audit.mjs`.

## Contract and equivalent input

The public reconciliation contract promises compatible stable-ID owners retain
transient state. An identical replacement document or a change to an unrelated
sibling must not activate a held button before the user's release.

`examples/material-showcase/audit/button-held-update.mjs` mounts through package
root `Astylar` and Angular `createApplication`. It uses no Material plugin,
private renderer imports, scene mutation, synthetic pointer events, or corrective
candidate styles. Two enabled buttons have stable IDs and explicit matching
position, size, font, box, and hover/active declarations. The HTML stylesheet is
generated from the same ordered rules; the reference changes only the requested
sibling text/style and retains its native controls. The pressed owner's document
and styles never change. Every sampled authored document is checked for equality.

The host is 400 by 160 CSS pixels, browser viewport 640 by 360, font Arial 16px
with 20px line height. Native pointer move/down/up use the same CSS point (80,40).
Settlement awaits fonts, public surface settlement, and two animation frames.
Chrome 152.0.7977.76 runs Angular 20.3.29, AstylarUI 0.2.0 and Babylon 8.56.2.
Provenance hashes every bundled input and the actual served HTML/script bytes.

## Results

Each scenario runs twice at DPR 1 and DPR 2, both with passive stack recording
enabled and disabled: 40 cases, 240 paired state boundaries, 80 screenshots.

| Scenario during pointer hold | Candidate strategy | Result |
| --- | --- | --- |
| No update | initial | 8 passing controls |
| Identical replacement document | reuse | 8 premature releases/clicks |
| Change only sibling text | rebuild | 8 premature releases/clicks |
| Change only sibling background | rebuild | 8 premature releases/clicks |
| Update sibling only after native release | initial at held boundary | 8 passing controls |

All 24 failures lose `pressedElementId`, dispatch public pointer-up and click,
and resolve the hover background instead of active background while the native
pointer remains held. This produces 96 failed assertions. No native pointer-up,
click or pointer-cancel precedes the explicit release. The reference stays
`:active`; both sides retain the original native button identities. All 16
controls pass. Stack-on and stack-off runs agree on these observations.

An identical update failing on the **reuse** path rules out the claim that a
visual rebuild is necessary for this defect. It does not rule out additional
rebuild-specific defects in other controls.

## Demonstrated causal path and owner

All 12 stack-enabled failing cases capture this path in the public release and
click stacks:

1. Core semantic focus synchronization calls `node.focus({preventScroll:true})`.
2. Browser focus leaves the canvas for the retained semantic button.
3. Babylon's canvas `_pointerBlurEvent` resets its held mouse input and calls
   `_onInputChanged`, generating a device release.
4. Core `AstylarInteractionRuntime.handlePointer` handles it as pointer-up,
   clears active state, dispatches public pointer-up and activates/clicks the
   matching pressed owner.

The verifier binds stack frame line/column locations to the captured,
hash-checked JavaScript instructions rather than trusting function names alone.
Before the update native focus is the canvas; afterward it is the semantic
button, while logical focus still identifies `first`.

Current source navigation:

- `src/lib/astylar.ts:513` queues focus synchronization on visual reuse;
  `:598` queues it after rebuild. Neither uses the event wrapper's
  `pointerFocusTransaction` guard at `:670` and `:688`.
- `src/lib/astylar-semantic-bridge.ts:204` schedules synchronization;
  `:343` focuses the semantic node.
- `src/lib/astylar-interaction-runtime.ts:579` handles release; `:588` dispatches
  pointer-up and `:595` invokes activation/click.
- Installed Babylon `DeviceInput/webDeviceInputSystem.js:593` owns the canvas
  blur handler that resets pressed mouse inputs and produces device events.

This belongs to core semantic-focus, reconciliation and device-input integration.
It is not a missing Material active-color declaration or a reason for a plugin
to implement its own gesture lifetime. The source navigation agrees with the
captured installed bundle; source-map filenames alone are not provenance proof.

## History and implementation priority

`dbe4d8ed1becde19f8036bed8479c971b1e95c58` introduced semantic-focus synchronization
with a pointer transaction guard in the event wrapper but an unguarded rebuild
synchronization path. `d48028f89cdec094d57d392e6f8d470d9e6bbfbe` later introduced
the reuse path with its own unguarded focus synchronization. These are inspected
source-history facts, not browser bisect results; neither historical checkout
was executed by this reproduction.

Prioritize this shared interaction invariant before component active-paint
tuning: a compatible update must not synthesize activation or terminate a live
gesture merely to synchronize native semantic focus. The future core correction
must cover both reuse and rebuild paths while preserving keyboard/assistive
focus, real blur/cancel behavior, removal/disable/replacement, dragging outside,
pointer capture, and surface isolation. Do not globally suppress real releases
or disable the semantic bridge to make the test pass.

First retain this failing public regression and add the missing lifecycle/input
variants; then implement the core correction and replay the 57 Material held
cases plus slider and popup interactions. Address the independently proven
opaque-host versus translucent-child paint authoring difference separately.
No paint override or Material fixture rewrite is justified by this proof.

## Verification and limits

```powershell
node scripts/audit-button-held-update.mjs
node scripts/record-button-held-update-audit.mjs
node --test tests/material-parity/button-held-update-evidence.spec.mjs
node scripts/record-button-held-update-audit.mjs --check
```

The browser producer requires a new output directory to preserve existing
evidence (`--output=...`); its default saved run exits **1** honestly for the 24
failing cases, with zero invalid cases and zero page exceptions. Generation and
no-write replay exit **0**. The latest focused verifier run passes **2/2** tests
in **1772.8954 ms**, no skips/cancellations/todos, including 14 altered-case
controls, missing-case rejection, runtime-error rejection and corrupt-bundle
rejection. A strengthened check was added after an altered update-kind control
initially escaped detection; stage inputs and update records are now validated
against the precise scenario, not just final-state equality.

The normal Angular consumer build also exits **0**, prerendering two routes in
32.649 seconds with isolated output at
`artifacts/material-parity/button-held-update-angular-build`. It did not replace
the frozen Material build. Logs are in
`artifacts/material-parity/field-host-flow-input-audit/` with prefixes
`button-held-update-public`, `button-held-update-focused` and
`button-held-update-angular-build`.

The screenshots also expose unrelated candidate raster differences (red root
background, duplicate-looking button text and rounded corners); this proof does
not classify or correct those differences and does not claim full pixel/input
equivalence of implicit defaults. Its demonstrated contract is held interaction
continuity under unchanged explicit button inputs and stable identity.
Console error messages are not collected by this producer; page exceptions and
structured diagnostic errors are checked. Disposal is observed, but resource
plateau/zero-resource cleanup is not proved here.

The earlier [Material temporal replay](material-button-held-temporal-audit.md)
observed consistent symptoms, but did not capture these historical call stacks.
The cause is proved in this public reduction, not retroactively in every
Material case. Canonical classification is unchanged: **2,330 unresolved groups**
remain. This and the temporal spec were added after the running 95-file harness
took its inventory; they are not included retroactively. Full current harness,
enforced parity matrix, and remaining audit classifications are still required.
