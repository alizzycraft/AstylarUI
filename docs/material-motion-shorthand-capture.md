# Empty motion longhands: demonstrated observation-stage gap

The seven unresolved tab-panel initial-style groups contain 490 property
observations across 70 original cases. A focused source replay authenticates
each reference tree against the existing motion-review descriptors and verifies
the exact mapped node, rule index, stylesheet location and ancestry.

Every case preserves this raw CSS rule:

```css
transition: transform var(--mat-tab-animation-duration) 1ms cubic-bezier(0.35, 0, 0.25, 1);
```

The same captures contain an inline `--mat-tab-animation-duration: 500ms`
ancestor declaration and a separate `transition: none` rule. Nevertheless,
CSSOM serializes the variable-containing shorthand's five individual
transition longhands as empty strings. The collector preserves both those
empty strings and the original `cssText`; the input has not disappeared.

## First demonstrated divergence

The observation boundary in
`tests/material-parity/input-tree-evidence.mjs:14` enumerates CSSOM
declarations. The historical motion reviewer consumes the expanded longhand
dictionary, but does not interpret the retained shorthand. Computed transition
fields are not included in these original node-style snapshots. Thus empty
expanded values cannot establish a missing request, a resolved target, or an
inactive transition. This is a capture/interpretation gap, not a demonstrated
renderer defect or an authoring omission.

The minimal browser reproduction uses the actual capture function unchanged.
At both DPR 1 and 2, the same raw shorthand and empty longhand dictionary
coexist with three different computed states:

| State | Computed target | Duration | Delay |
| --- | --- | --- | --- |
| Inherited custom property `500ms` | transform | 0.5s | 0.001s |
| Custom property changed to `2s` | transform | 2s | 0.001s |
| Separate `transition: none` override | none | 0s | 0s |

This demonstrates the meaning of the empty CSSOM fields. It does **not**
retroactively supply missing computed motion values to the historical cases,
certify current cascade/animation state, establish candidate computed styles,
or attribute the reported visual symptoms. All seven groups remain pending
canonical classification. No production collector or canonical input changed.

## Verification and handoff

```text
node --test --test-concurrency=1 tests/material-parity/motion-shorthand-capture.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**6/6 pass**, exit 0, **2,794.3087ms**, with no skips, cancellations or TODOs.
Browser: Chromium **152.0.7977.84**. Log:
`artifacts/material-parity/field-host-flow-input-audit/motion-shorthand-capture-sep20.log`.
The ordered 70-case evidence digest is
`e06c97785ec4e2b1bde96de0897a2e1dcb5108c80345bb56dbb4baca18956c6f`.
The capture module's normalized source digest is
`06197edaf92b2296e3e0564771f307a1036ce7bc5eb13d8e242a5c420e7a7e3b`.

Next: either capture resolved motion context in a separately versioned
diagnostic, or prove the complete authored shorthand/cascade independently.
Preserve raw shorthand, empty longhands and source membership. Never normalize
the empty fields to `none`, infer inactivity from a `noopable` class, or silently
replace old evidence with values measured in a different state.
