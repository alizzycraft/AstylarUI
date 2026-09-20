# Inactive button base paint: unequal transparency inputs

This [source-bound review](material-button-base-alpha.json) separately examines
the outlined and disabled buttons retained by the
[shared-button paint proposal](material-button-paint-attribution.md). It freshly
replays the complete 600-owner source census, then reviews all **120 observations**
for these two owners: four themes, 15 cases per owner/theme, eight populations.
No canonical classification is changed by this review.

## First demonstrated divergence

| Owner | HTML captured request | AstylarUI authored/resolved request |
| --- | --- | --- |
| Outlined secondary | Transparent base background; inactive pseudo-layer | Opaque theme surface-container background |
| Disabled | On-surface color with alpha 0.12; inactive pseudo-layer | Opaque six-digit hex background with element opacity 1 |

The reference owner, applicable captured background declaration, computed base
color, and pseudo-layer opacity are retained. The candidate author rule and
normal/interaction/effective resolution stages agree on the opaque background.
Both owners have element opacity 1. This is an application-authoring difference
before projection, not proof of a core compositing defect. A similar screenshot
over a particular backdrop would not establish equivalent paint inputs.

All seven captured state labels are represented: static, focus, hover, held,
activate, activate-leave and disabled. These are capture-state labels; the review
does not infer that the secondary or disabled owner itself was hovered merely
because the case has that label. Their reference pseudo-layer is inactive in
every selected observation. The other 480 census observations are not classified
by this review, including modal/open-state uncertainty.

## Source and history

The authored values are in
`examples/material-showcase/src/app/astylar.component.ts`:

- Line 538: `.outlined` uses `theme.surfaceContainer` as its background.
- Line 490: the disabled background uses `mixHex(theme.surfaceContainer,
  theme.onSurface, .12)`, except density -2, which uses `#ccd8d8` explicitly.

`git blame` traces both statements to
`2f440115740ff76fa9e55b3f4a11568207b2af5a` (`feat(example): add Material component
showcase`, 2026-08-23). These are initial authoring mismatches, not evidence that
a later parity fix introduced them. Their intent is not inferred from blame.
The existing source census authenticates the captured input trees and current
author-source receipts; this review retains original observation/tree/proof
identities rather than replacing raw colors with normalized expectations.

## Implementation handoff

In the later implementation task, restore the reference transparency requests
and test them through the shared core paint path. Exercise at least two different
backdrops, ancestor opacity, theme changes and state transitions. If equivalent
inputs then diverge, reduce and fix the core compositing rule. Do not replace the
opaque fills with newly tuned opaque colors or change the reference backdrop.
This audit makes no assertion about final composited pixels, general alpha
support, hover correctness or modal-state lifecycle causes.

Before canonical promotion, bind these complete populations to the current
canonical rows and preserve every unrelated row. The eight source populations
are not yet a reduction of the current unresolved canonical count.

## Verification

```text
node --max-old-space-size=1536 scripts/audit-material-button-base-alpha.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/button-base-alpha.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0; report SHA-256:
`340b875a4cf1ced5c42f736a6041538f834fad04f5929c9a6a2fb96d0cf923df`.
The complete focused/inventory run passes **7/7**, exit 0, **11,029.3032ms**,
with no failures, skips, cancellations or TODOs. It verifies full ordered source
membership, 13 corrupt-input rejection controls, input immutability, and fresh
parent-census/report replay with writes prohibited. Logs:
`button-base-alpha-generation-sep20.log` and `button-base-alpha-full-sep20.log`
under `artifacts/material-parity/field-host-flow-input-audit/`.
