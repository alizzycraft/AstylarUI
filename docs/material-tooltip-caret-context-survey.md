# Tooltip original-state reference context

The [machine survey](material-tooltip-caret-context-survey.json) covers all
**18 hover/held observations** in the tooltip population retained by the
[original caret survey](material-owner-caret-input-survey.md). It fills a fresh
reference-context evidence gap; it does not fix or explain the reported tooltip
displacement, excessive size, blur or text alignment.

## What the replay establishes

Every original owner identity, ancestry/declaration proof and **89 scalar
measurements** matches the fresh reference: **1,602 scalar comparisons** in total.
The reader separately checks **3,816 root computed properties** against the
fresh full-tree capture. It retains missing CSSOM aliases explicitly (`flex`,
`gap`, `gridColumn`, `gridRow`, `margin`, `padding`, `whiteSpace`) rather than
inventing values for them.

All six nodes along each tooltip owner-to-overlay-root path resolve to
`transition-property: all`, `transition-duration: 0s`, `animation-name: none`
and `animation-duration: 0s` at the captured boundary. This includes the tooltip
ancestor bearing both the show-animation and animation-noop classes, not just
the leaf surface. The nine captured motion longhands remain distinct from the
89 original measurements. Active animation objects were not captured, so these
values are not a separate animation-activity or between-boundaries proof.

For every case, the fresh overlay root, body and html resolve to no transform,
translate, scale or rotate, zoom `1`, font size `16px` and line height `normal`.
The full raw context retains ordered stylesheet rules and the external DOM
ancestor chain. This does not establish the candidate's coordinate conversion,
nor prove what unrecorded ancestors did in the original historical capture.

The exact retained population covers light, dark, contrast and custom profiles;
desktop 1440x1000 at DPR 1/2 and the 609x844 comparison viewport at DPR 1.
These are the original 18 cases, not a claim to cover every possible tooltip
state. In particular, the separate open-state population is not relabeled as
hover/held evidence.

## Provenance and reproduction

Chrome **152.0.7977.76** matches the original checkpoint. The capture verifies
served documents, scripts, stylesheets and fonts against the frozen build and
rejects runtime errors. It reuses the original runner's eight theme, interaction
and settlement functions, extracted by TypeScript AST with exact source hashes.
Held cases are captured before pointer release. The original checkpoint, build,
input trees and canonical comparisons are not rewritten.

Completed capture command (repeat into a new output directory):

```powershell
node scripts/capture-material-tooltip-caret-context.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/tooltip-caret-context-audit-v1
```

Raw manifest SHA-256:
`9e4ded2820106f4b7f92ba8d6e8a3c5e998efe097f669f661ddd47d04da9c7fd`.
Its per-case digests bind the complete fresh trees, original proofs, runtime
assets and external context; producer dependencies are source-bound separately.

```powershell
node scripts/audit-material-tooltip-caret-context.mjs
node scripts/audit-material-tooltip-caret-context.mjs --check
node scripts/check-material-tooltip-caret-context.mjs
```

Generation and both checks pass. The checks were rerun together with exit **0**
before this increment was committed. The reader reproduces the whole saved
report. **34 negative controls** reject changed membership, browser, source,
interaction function, original scalar/proof, owner identity, state, DPR, runtime
assets/errors, root mapping/ancestry and fabricated equivalence/history claims.
**Two changed-observation controls** retain changed fresh motion and external
caret measurements rather than forcing the observed values back to expectations.
Controls mutate in-memory copies only.

Machine report SHA-256:
`8b72c00cfc1a6dcd5cd95a4ee4427f53d016d1d0b08b2189e5c76fb239f2b069`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `tooltip-caret-context-capture-v1.log`:
  `1e15c31d5c1a7ada398d08e639a31d13213386cd5517e9c138b709537c666c34`.
- `tooltip-caret-context-generation.log` and `tooltip-caret-context-check.log`:
  `ea933e72942a20112acf54e1982f799827d755c5f787ff6eb24e435ee9d605ef`.
- `tooltip-caret-context-controls.log`:
  `a1b6321f1e43824baa1d1e6a8b8b5df4d632342e2f46fb1ca6ae5686f7d3df40`.

## Remaining investigation

Update (2026-09-18): the source-provenance boundary and complete replay have now
been reverified, and this checker is registered in automatic harness discovery.
All 18 observations, 1,602 scalar checks and 3,816 root properties are unchanged.
The new check separately rejects forged/replaced historical source hashes,
changed current normalization and changed complete dependencies. See
[the current reader conservation and command results](material-overlay-caret-context-survey.md#current-reader-verification-2026-09-18).
The remaining text below records the original investigation boundary, not a
claim that the later registration is still missing.

This evidence can now join the separate 91-case dialog/bottom-sheet/snackbar
reference context when reviewing the 13 retained overlay caret groups / 378
observations. That join must rederive every original owner proof, preserve the
59 observations with scalar/full-tree authored-rule gaps, and keep fresh context
separate from historical evidence.

All canonical classifications and the **2,278 unresolved groups** remain
unchanged. No candidate replay, candidate computed caret value, visible caret,
input equivalence, tooltip raster equivalence or renderer root cause is claimed.
Standalone checks do not join or alter the currently running 110-file harness;
their later registration and the complete enforced parity matrix remain pending.
