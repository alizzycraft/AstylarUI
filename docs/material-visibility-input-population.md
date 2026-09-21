# Remaining visibility inputs and state-owner evidence

The accepted pre-disabled-ink audit contains 17 unresolved visibility groups,
covering 668 original observations. Every group compares browser `visible`
against an omitted candidate local value. None is accepted as equivalent.

| Family | Groups | Observations |
| --- | ---: | ---: |
| Bottom sheet | 4 | 100 |
| Chips | 2 | 152 |
| Dialog | 6 | 192 |
| Snackbar | 2 | 68 |
| Stepper | 1 | 68 |
| Tabs | 1 | 70 |
| Tooltip | 1 | 18 |

The collector authenticates the complete compressed and decoded baseline and
the original capture, reconstructs complete case membership, and checks original
order, states, occurrence counts and raw values. Each observation retains its
input hash, paired tree receipts, direct authored visibility declarations and
normal/interaction-stage values. No omitted value is filled with a default.

## Why local-node checks are insufficient

All 138 tab-panel and stepper-content observations additionally replay both
authenticated owner trees. Reference ancestors contain active rules declaring
both `visibility: hidden` and `visibility: visible`, with state classes selecting
the visible content. The paired text node itself has no direct visibility rule.
This establishes ancestor state-rule involvement, not a candidate computed
visibility value or equivalent hidden-state behavior.

The initial ancestry diagnostic rejected stepper captures containing multiple
nodes with the same parity ID. Transitions retain hidden copies. The corrected
diagnostic requires a unique node matching the explicitly captured visible
value; it does not select the first ID match. Multiple visible owners, missing
parents, cycles, missing styles and invalid rule references remain failures.
The candidate tree's exact empty synthetic document root has no style capture;
it is explicitly recorded as unavailable, never converted to computed visible.

The candidate chains and authored nodes are retained without synthesizing
inheritance. Conditional mounting, selected plugin data, and CSS visibility
are separate mechanisms. Their presence in this evidence is not a justification
for replacing the reference mechanism or a diagnosis of renderer failure.

## Next investigation

Review state propagation and owner mapping before classifying these differences.
For tabs and stepper, compare inactive and transitioning owners as well as the
captured visible owner. For overlays, trace connected/global overlay ancestors
and lifecycle separately. Missing local visibility cannot establish the cause
of an invisible snackbar or an offscreen tooltip.

Machine evidence: `docs/material-visibility-input-population.json`.
Generated SHA-256: `2ca5eb09c5ebdcd6236225ee8bd64cce4a9f7061f78a29bd54a5bd22bfa8fb18`.
Reproduce with `node --max-old-space-size=1024 scripts/audit-material-visibility-population.mjs`.
Regression checks: `node --max-old-space-size=1024 --test tests/material-parity/visibility-input-population.spec.mjs`.
The full replay and negative controls pass **3/3**, with no skips, in
**87,333.0085 ms**. Log: `artifacts/material-parity/visibility-population-tests-v2.log`.
The initial replay failed because the diagnostic returned explicit `undefined`
properties absent from serialized JSON. Omitting those properties in the
collector fixed the round-trip mismatch without changing generated JSON bytes
or captured values. The first failing log is retained separately.

The canonical classifications are unchanged. This is a complete census of this
remaining property population with bounded ancestry evidence, not completed
input equivalence or rendering acceptance.
