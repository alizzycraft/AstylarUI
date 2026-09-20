# Remaining text-alignment contexts

This audit-only review covers five original scalar groups / **167 observations**
remaining outside the prepared 49-group alignment and four-group LTR reviews.
It independently replays the complete original ancestry survey, authenticates
the frozen membership proposal, and preserves each selected observation's
case, tree descriptors, scalar digest, proof digest and original canonical row
hash. No renderer, plugin, comparison input or canonical classification changes.

| Owner | Observations | Evidence disposition |
| --- | ---: | --- |
| Expansion title | 68 | Local inspection versus explicit ancestor request and retained text |
| Progress bar | 20 | Explicit reference alignment request omitted from candidate inputs |
| Progress spinner | 20 | Computed-versus-local alignment, with a separate direction omission |
| Bottom-sheet wrapper | 25 | Known layered-rule capture gap; alignment context remains unresolved |
| Snackbar wrapper | 34 | Same capture boundary; alignment context remains unresolved |

## Expansion: local omission is not missing applied alignment

Every title observation has omitted owner-local `textAlign` in all three
candidate inspection stages, but its immediate `expansion-primary` parent
explicitly requests `left`. Independently retained core-text data records
`left` on the title. The reference title and captured ancestors compute `start`
in LTR. The local scalar comparison therefore does not establish missing applied
alignment, much less a core inheritance failure.

This is classified as an observation-stage mismatch, **not** as whole-element
input equivalence. The proof does not establish how core text acquired `left`,
whether the substituted parent request is justified, or actual glyph placement.
The existing [LTR keyword review](material-ltr-alignment-review.md) must not be
expanded into a global start-to-left normalization. Parent structural/font
differences remain covered by the [expansion owner](material-expansion-owner-attribution.md)
and [title-font](material-expansion-title-inputs.md) investigations.

Current source locations are `astylar.component.ts:658` for the parent request,
`:663` for title styles and `:993` for the replacement structure, under
`examples/material-showcase/src/app/`. The new report fingerprints that source;
the per-case paths and declaration witnesses are retained in its proof patterns.

## Progress: do not erase explicit requests because there is no label

For all 20 progress-bar observations, the active unconditional
`.mat-mdc-progress-bar` rule requests `text-align: start`. The candidate's
`showcase.material:linear-progress` host and captured ancestors omit the request.
This is an application/plugin input-translation omission. The result does not
claim it changes the painted progress bar or is the cause of an output failure.
An apparently inert property is not evidence of equal authored inputs.

The spinner requires a different disposition. Its reference alignment is a
computed `start`, while the explicit relevant host request is `direction: ltr`,
not `text-align`. Candidate host-to-root inputs omit direction as well as local
alignment. The report classifies the scalar stage mismatch while retaining a
separate authoring difference for direction. It does not manufacture a candidate
computed direction or waive the plugin's private geometry.

The application creates these plugin elements at `astylar.component.ts:906–907`.
`material-plugin/material-showcase.plugin.ts:103` and `:143` contain their
renderers. They construct progress meshes from dimensions/data; this review
does not prove that adding a CSS declaration would affect those meshes, that
their rendering contract is equivalent to the generated Material structure, or
that their coordinate calculations are correct. Motion declarations remain in
the original proof patterns and are not equated with active animation.

## Overlays: classify the evidence defect without closing the visual issue

The existing generated-owner proof verifies 89 reference scalar properties but
records a missing `.cdk-global-overlay-wrapper` layered `z-index: 1000` rule.
That known capture discrepancy causes the alignment ancestry collector to stop
before producing its paths in all 59 observations. The report identifies the
instrumentation owner while keeping alignment inputs explicitly
`unresolved-context`.

The missing rule is **not** claimed to explain `textAlign`, popup placement,
clipping or the missing snackbar. It is not a newly discovered renderer defect.
The [overlay declaration review](material-overlay-owner-declaration-review.md)
already retains wrapper/backdrop/pane structural differences. Further alignment
attribution needs the original-owner context and layer evidence, not invented
defaults or a candidate offset. The shared tooltip/snackbar displacement cause
remains unproved.

## Verification and limitations

```text
node scripts/audit-remaining-text-alignment.mjs
node --test --test-concurrency=1 tests/material-parity/remaining-text-alignment.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. The full replay is write-prohibited and checks the canonical
manifest and compressed payload remain byte-identical. Rejection controls cover
parent/retained-text changes, explicit direction/alignment requests, conditional
rules, hidden inline resets, capture-gap changes and unsupported equivalence
claims. Final focused/inventory verification passes **9/9**, exit **0**, no
skips/cancellations/TODOs, in **45,910.7379ms**. The five review tests include
**52 rejection-control executions**. Full harness discovery includes the suite
(173 files now); the separately running 171-file launch does not include it.

The initial verification run passed 8/9 and rejected the full replay because a
direct-ID mapper retains `generatedIdentity: undefined` in memory, whereas JSON
omits that optional property. A separate bounded difference diagnostic confirmed
the serialized reports match exactly. The test now compares the complete emitted
JSON hash against the saved bytes, while retaining the per-observation and
mutation checks. No report, classification, original capture or renderer input
was changed to pass this assertion. The initial failure log is retained.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`remaining-text-alignment-generation-sep20.log`,
`remaining-text-alignment-verification-sep20.log`,
`remaining-text-alignment-replay-diagnostic-sep20.log` and
`remaining-text-alignment-verification-final-sep20.log`.
Machine report SHA-256:
`dea5e1d68c6d5fdb29ea4445729ef52b36fb5333691da7e439bf6c461cb864a7`.

Machine evidence: [material-remaining-text-alignment.json](material-remaining-text-alignment.json).
The original ancestry survey is replayed now; its earlier full canonical join is
reused through the pinned `e3bc804` proposal, not claimed as a new payload scan.
The report keeps all computed/used/rendering/core-cause equivalence flags false.
These are bounded audit dispositions, not fixes or full audit completion.
