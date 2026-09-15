# Priority overlay reference ancestor survey

This source-bound supplement records **48 original static reference contexts
and 48 separately labelled real activations** across dialog, bottom sheet,
snackbar and tooltip. Each family has the original light, dark, contrast and
custom profiles at desktop, tablet and mobile viewports. These original static
profiles are DPR 1; the separate collector sensitivity tests cover DPR 1 and 2.
This is not full interaction-state coverage or a renderer correction.

## What the new capture establishes

All 48 post-activation overlays attach along the same actual DOM chain:
`.cdk-overlay-container → body → html`. Across these three nodes in every case,
the captured font size is 16px, font style and line height are normal,
`transform`, individual `translate`/`scale`/`rotate`, perspective and filter are
none, zoom is 1, containment is none and will-change is auto.

The reference frame's font size varies with profile: 16px for light/dark,
14.4px for contrast and 18.4px for custom. The frame is not an ancestor of the
body-attached overlay. Treating the overlay as inheriting from that frame would
therefore assume a relationship absent from these actual DOM captures.
This is evidence about the context, not proof of which component-level tokens
or candidate values ultimately control each popup's text.

All four popup types become visible after their normal reference trigger action.
The captured popup bounding rectangles are vertically inside the viewport in
these samples. That is a geometry observation only, not clipping, readable
pixel coverage, bottom-sheet item visibility or candidate snackbar proof.

**No external DOM-ancestor transform or zoom was present in these reference
activations.** The earlier synthetic transformed-body result remains a valid
sensitivity test, but is not demonstrated as the original overlay cause.
Candidate CSS-space layout, projection, plugin calculations, iframe/host setup
in the user's earlier manual screenshots and other interaction states remain
separate investigations. No canonical input classification changed.

## Provenance and independent replay

Capture command (requires a new output directory):

```powershell
node scripts/capture-material-overlay-ancestor-context.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/overlay-ancestor-context-current-ancestry-audit
```

The producer completed with exit code 0. It used Chrome 152.0.7977.76 and the
frozen showcase runtime. Every observed document, script, stylesheet and font
response is checked against the original checkpoint's byte digests. Every
original record and reference tree is reopened and hash-checked. Theme commands,
viewport, color scheme, reduced motion, font readiness, animation settlement
and the declared extra 250ms sample delay are recorded in the source/evidence.
No served fixture, style, renderer or plugin file is changed.

The original static root's full computed snapshot is checked in the producer
before collecting extra ancestors. Activation is then performed by a real
click (dialog/sheet/snackbar) or hover (tooltip), and is explicitly labelled a
fresh supplemental state, not falsely matched to the original static case.

The independent reader reopens the selected manifest, all 48 checkpoint records,
original trees, fresh sample records and source digests. It checks complete
case membership, record integrity, family/profile/viewport/route, original root
attributes, complete ordered ancestry, runtime asset provenance, stylesheet
availability, sample identities and explicit limits on claims.

It independently compares **4,656 original root computed properties** with the
new enumerated computed snapshots. Seven shorthand/alias names are absent from
that enumeration: flex, gap, gridColumn, gridRow, margin, padding and whiteSpace.
Those omissions are listed in the report, not synthesized or accepted as
equivalent. Full original snapshot equality for those fields is producer-
asserted; the independent reader does not claim to have replayed missing data.

The [machine-readable report](material-overlay-ancestor-context-survey.json)
includes all case identities, bindings, ancestor summaries and popup rectangles.
Raw CSSOM, attributes and complete computed ancestor snapshots remain in the
hash-bound artifact records; the checked-in report does not replace them.

## Verification and implementation implications

```powershell
node scripts/audit-material-overlay-ancestor-context.mjs
node --test tests/material-parity/overlay-ancestor-context-survey.spec.mjs
node scripts/audit-material-overlay-ancestor-context.mjs --check
```

Generation and no-write replay pass. The final focused run passed **4/4** tests
with zero failures, skips or cancellations in **1,968.4046 ms**. It includes
17 negative mutations. The focused suite verifies all records and
rejects missing/duplicated/substituted states, changed root values and authoring,
wrong viewport/route, broken ancestry, duplicate nodes, stale sources/digests,
missing or changed runtime evidence and fabricated cause/equivalence claims.
These standalone tests are not included in the already running 43-file harness.

Next, use actual original open-state evidence to connect external context to
mapped component owners and compare candidate ancestry and consumption. Keep
the root-cause order: equivalent authored/inherited inputs, CSS-space layout
and text metrics, then final projection/paint. Do not compensate by retuning
popup sizes or offsets, and do not close the historical snackbar/tooltip reports
based on reference-only geometry.
