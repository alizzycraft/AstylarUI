# Tabs and stepper: state-owner substitutions

Complete replay of the 138 relevant captured cases confirms unequal input
structure, even though each candidate's selected text matches the reference.
The machine report classifies this narrowly as an **application/plugin authoring
defect** under this audit's equal-rendering-input contract. It does not classify
all local style differences or establish an accessibility failure.

| Comparison | HTML reference | AstylarUI |
| --- | --- | --- |
| Stepper, 68 cases | Two linked tabpanel owners and two text spans; inactive panel is inert, visibility hidden, height zero; inactive text inherits hidden | One tabpanel span; selected text replaces the other content |
| Tabs, 70 cases | Two linked tabpanel owners; inactive panel is inert and aria-hidden, with no text mounted; active text is a native span | One custom `showcase.material:tab-panel` owner with selected text conveyed as data/accessible label and painted privately |

Every captured tabpanel header is checked through both `aria-labelledby` and
`aria-controls`, with exactly one selected header. Both panel owners and all
content instances are inspected; no active-only shortcut is used. Candidate
panel ownership must be unique. Each observation retains exact source-tree
receipts, owner keys, attributes, text, computed visibility and panel height.

An important distinction: both tab **outer panels** compute visible, including
the inactive one. Tabs' ancestor visibility rules and lazy text mounting are not
the same mechanism as stepper's retained hidden text. Neither should be reduced
to a generic 'missing visibility field caused the screenshot' explanation.

## First divergence and ownership

The first demonstrated divergence is authored structure/state representation,
before CSS layout or Babylon projection:

- `reference.component.ts:88–89` authors two Material tabs/steps.
- `astylar.component.ts:974–975` substitutes the single custom tab panel and
  single stepper content span.
- `material-plugin/material-showcase.plugin.ts:338` owns the tab texture renderer.
  It manually sizes a 2× texture, chooses strings, uses its own font/baseline
  calculation (`.328125` plus an authored offset), and paints animation frames.
  This is competing text paint, not a public structural translation alone.

History checks identify `2f44011` as introducing the stepper text substitution
with the original showcase. It is not evidence of a later regression fix.
`7159b1d` (`fix(showcase): tighten Material component parity`) introduced
`MaterialTabPanelRenderer`. Later coordinate and texture-orientation changes
did not remove that custom text-paint ownership. Do not infer an undocumented
original renderer cause from those commit messages alone.

## Implementation order

1. Preserve these paired state-owner cases as failing input-equivalence evidence.
2. Implement and verify general missing core visibility/inert/state semantics
   required by equivalent structures. The separate public visibility reduction
   proves hidden paint/hit-test support is currently missing; inert support is
   not diagnosed by this report.
3. Exercise equivalent reference structures through the public renderer, including
   inactive owners and transitions. Diagnose any remaining general layout/text
   defects before changing the canonical examples.
4. Replace the single-owner substitutions and remove the tab-specific texture,
   baseline/typography compensation only after those general proofs exist.

All 70 tab captures explicitly carry benchmark `phase: 1`. Therefore this evidence
does **not** verify live intermediate animation, outgoing text positions, focus
transitions, or whether custom painting is necessary to reproduce a particular
renderer failure. Those remain distinct proof obligations.

Reproduce: `node scripts/audit-material-panel-state-ownership.mjs`.
Verify: `node --test tests/material-parity/panel-state-ownership.spec.mjs`.
No renderer, plugin, canonical fixture, or canonical scalar attribution changed.
