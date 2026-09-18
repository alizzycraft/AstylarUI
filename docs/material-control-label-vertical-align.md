# Control labels: historical vertical-alignment substitution

All **272 original observations** for four control labels contain unequal
alignment inputs: reference spans compute `vertical-align: baseline` with no
local declarations, while AstylarUI's label rules explicitly request `middle`.

| Label | Original observations |
| --- | ---: |
| Checkbox `checkbox-label` | 68 |
| Radio `radio-solo-label` | 68 |
| Radio `radio-team-label` | 68 |
| Switch `slide-toggle-label` | 68 |

The [machine evidence](material-control-label-vertical-align.json) binds every
case/state/profile/viewport to the original capture and tree hashes. It checks
unique span identity, exact text, all 89 reference scalar properties, all three
candidate style stages, the applicable authored rule, competing requests, and
the separately retained core text style. No state is inferred from a sample.
Other structural, positioning and typography differences are not waived.

## History and first divergence

Commit `354084ea1f1a6abb3e010222062e3cea9f945b61`, whose subject is
`fix(example): center Material control labels`, added `verticalAlign: 'middle'`
to `.checkbox-label`, `.radio-label` and `.switch-label`. The collector reads
both committed source versions and verifies that this exact addition is the
only change to each of those three rule lines. It records their full original
lines and source hashes. This proves the historical substitution and the
commit's stated aim; it is not a browser bisect or proof of a concealed core
cause.

The first demonstrated divergence is **comparison authoring**, before core
style resolution. Candidate normal/effective/comparison stages and retained
text all preserve `middle`; the evidence does not establish the resulting
used alignment or current glyph placement.

Current source navigation is `examples/material-showcase/src/app/astylar.component.ts`
at the `.radio-label`, `.switch-label` and `.checkbox-label` rules (503, 511 and
777 at this checkpoint). For the later equal-input investigation, core parsing
is in `src/app/services/text/text-style-parser.service.ts`, and
`MultiLineTextRendererService.calculateLinePositions` in
`src/app/services/text/multi-line-text-renderer.service.ts` consumes vertical
alignment when placing text within the supplied container height. That source
path is an investigation lead, not a demonstrated explanation of these Material
labels. The reference and candidate parent compositions also differ.

## Required next proof

Keep canonical fixtures unchanged during this audit. Isolate equivalent inline
label/parent inputs, preserving reference typography and containing structure,
and compare baseline/line-box placement across normal and middle requests.
Include flex-item and absolutely positioned controls to distinguish layout
applicability from internal text placement. Attribute a core failure only
after the equal-input reduction reproduces it. Remove the comparison-only
alignment substitutions in the subsequent implementation phase after their
general dependencies are understood, not as a blind visual adjustment.

## Verification

```text
node scripts/audit-material-control-label-vertical-align.mjs
node --test --test-concurrency=1 tests/material-parity/control-label-vertical-align.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. Focused verification passes **7/7**, exit 0, zero failures,
skips, cancellations or TODOs, in **7,078.8166ms**. It includes individual replay
of all 272 observations, 32 evidence-changing rejection controls, independent
source/history replay with writes prohibited, and four harness inventory checks.
Logs under `artifacts/material-parity/field-host-flow-input-audit/` are
`control-label-vertical-align-generation.log` and
`control-label-vertical-align-focused.log`.

Report SHA-256:
`b610258d486e3556040b58859dd1d4b47f5a7c339f96cd196f168b8c2e39d827`.

This is a separate source finding, not canonical classification promotion.
No renderer, plugin, comparison input, reference truth or threshold changed.
Full audit acceptance and the complete enforced parity matrix remain pending.
