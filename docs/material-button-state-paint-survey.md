# Shared button state paint: unequal composition inputs

The [machine survey](material-button-state-paint-survey.json) reopens and
hash-checks the original hover/held capture and its paired trees. It inventories
all shared `material-button` hosts in those states: **146 owners in 114 cases**,
across core, button, menu, bottom-sheet, dialog, snack-bar and tooltip examples.
It retains 32 inactive secondary/disabled controls rather than filtering them
out of the evidence. This is a bounded input audit, not renderer parity or
canonical classification integration.

## First demonstrated divergence

For the **114 active-layer owners**, the reference retains the button's base
background and uses a child persistent-ripple `::before` with a separate
background color and opacity (0.08 on hover, 0.12 when held). The candidate
authors opaque replacement backgrounds on `.material-button:hover` and
`.material-button:active`. Each captured button is a leaf rather than the same
host/child/pseudo-element paint composition.

For example, the light desktop-DPR1 hovered primary button retains reference
host `rgb(103, 80, 164)` and a white layer at opacity 0.08. Candidate normal
background is `#6750a4` and interaction/effective background is `#735eab`.
The recorded screenshot similarity is about 0.99977; that does not make these
paint requests equivalent. Matching flattened colors cannot establish matching
layer geometry, clipping, transitions, opacity composition or interaction.

This is an **application/plugin authoring difference** before rendering, not
evidence that the core cannot render a translucent layer. The first owning
source is `examples/material-showcase/src/app/astylar.component.ts:533` and
`:535`; channel preblending is implemented by `mixHex` in `theme.ts`. The
reader retains the exact candidate state rules and original reference pseudo
rules, not merely the resulting colors.

## Separate held-state observation

In **17 held cases**, reference layer opacity is 0.12 while the captured
candidate host interaction/effective color equals its declared hover color,
not its declared active color: eight core and nine tooltip cases. The other
40 active held owners have the declared active background. This contrast is a
lead for tracing pointer state and rebuild/settlement, not a demonstrated
interaction-runtime root cause or a claim about final pixel color.

The core example also authors a sibling `showcase.material:state-layer` plugin
node. All such sibling plugin nodes are retained in the report. Its additional
paint is not measured by this host-style survey, so the 17 cases must not be
described as necessarily lacking held paint altogether. The tooltip's relevant
overlay/interaction context likewise requires a separate lifecycle trace.

## History

Initial showcase commit `2f440115` already authors the preblended hover and
combined active/focus backgrounds. Commit
`1dde7be9b1cf98eaabf2ae7f2bdb2dd63445124c` ("correct Material button pointer
states") separates active from focus; it does **not** introduce the preblending
technique. The history therefore establishes unequal initial authoring and a
later state-selector change, not proof that preblending was introduced to hide
a particular renderer defect.

## Recommended investigation and implementation boundary

1. Keep the canonical examples unchanged during this audit. Reduce an equivalent
   base-plus-translucent-layer structure through the public API, retaining the
   reference clipping, positioning, opacity and state transitions.
2. Compare base, layer and final paint separately in hover, held and keyboard
   focus states, including nested opacity and different backgrounds. A flattened
   color comparison alone cannot test this contract.
3. Trace the 17 held host-style observations through actual pressed identity,
   render generation and settlement, preserving the core sibling plugin layer
   as a separate paint owner. Do not infer the cause from the state label alone.
4. If equivalent requests fail, fix shared paint/interaction behavior at its
   owning boundary. Then remove opaque preblending from the example/plugin
   alongside its equivalent-input regression. Do not replace it with another
   tuned color or component-specific runtime paint path.

## Verification

```powershell
node scripts/audit-material-button-state-paint.mjs
node --test tests/material-parity/button-state-paint-survey.spec.mjs
node scripts/audit-material-button-state-paint.mjs --check
```

Generation and complete no-write replay exit **0**. Both tests pass, with zero
skips/cancellations/todos, **3,295.3851 ms**. Fourteen altered identity, scalar,
style-stage, structure and pseudo-element controls are rejected, along with
corrupt source capture bytes. Every original owner style agrees with its scalar
record, and all paired tree hashes are checked. An initial test failed because
it looked for state rules in the captured normal-match list; the reader now
retains those rules from the original full candidate stylesheet. It does not
invent matched declarations or alter the original evidence.

Canonical attribution and input/rendering equivalence remain unchanged. This
new focused suite is not retroactively included in an earlier complete harness
run. Public equal-input paint reduction, held-state cause and full current
verification remain pending.
