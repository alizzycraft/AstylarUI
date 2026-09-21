# Stepper header layout substitution

All 68 captured stepper-position cases use different header layout requests.
The reference has a flex header row containing two relative, in-flow headers and
a static, flex-growing connector. The connector has zero content height and a
one-pixel solid top border.

The candidate uses a relative block header area, two absolute 130-pixel headers
with left/right offsets of -24 pixels, and an absolute one-pixel background strip.
The strip's width is 73.2%, 69.5%, or 15.1% according to viewport rules. These
are alternative layout and paint inputs, not an equivalent serialization of the
reference flex/border request.

Current source: `examples/material-showcase/src/app/astylar.component.ts`, lines
740–758 and 975. The diff of `dff55e5` replaces the earlier flex header row with
a relative header container, changes step tabs from relative to absolute, and
changes the connector to absolute positioning. That directly demonstrates the
historical structural substitution; the “distribute navigation headers” commit
title alone is not the evidence. Later rules retain absolute placement and add
the current viewport-specific widths.

Classification: **application/plugin authoring defect**, first divergence in
authored header/connector layout. The outer static/relative scalar is reviewed
in the context of its descendants, not used as standalone proof. This does not
diagnose the core cause of previous overlap or assert that equivalent flex
inputs currently work. State/panel/icon differences are separate audit findings.

`material-stepper-position-substitution.json` retains every case and authenticated
paired tree receipt, original row digest, layout proof, and explicit unproven
renderer-cause/equivalence flags. No canonical classification is changed yet.

Verification: `node scripts/audit-material-stepper-position-substitution.mjs`
and `node --test tests/material-parity/stepper-position-substitution.spec.mjs`.
Both tests passed, exit 0, 747.0068 ms; six negative controls reject changed flex,
border, header, positioning and connector evidence. The full 58-group integration
queue includes this finding without dropping any original case.

Next implementation proof: reproduce two intrinsic headers with a growing bordered
connector using the same public CSS-space inputs on both sides. Diagnose any core
flex/measurement divergence before removing the entire compensating absolute
layout, including fixed widths and offsets. Do not merely recalibrate its values.
