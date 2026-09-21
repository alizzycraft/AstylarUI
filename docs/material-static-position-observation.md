# Static position: distinguish the observation stages

Seven same-element-type populations (340 observations) compare browser-computed
`position: static` with an omitted candidate position property: badge label,
divider labels above/below, both step labels, table host, and toolbar title.
The pinned population contains no captured explicit position declarations on
either owner in these cases. Fresh authenticated full-tree review confirms no
reference inline/matched active position/reset declaration and no candidate
position at normal, interaction, or resolved style-inspection stages.

The focused classification is **parity-harness-defect**, limited to the mixed
observation stages of this scalar comparison. It does not assert that the
candidate has computed `static`, that owner ancestry is equivalent, or that the
renderer implements correct containing-block/layout behavior. All such claims
remain explicitly false/unproven in the machine evidence. Other material input
differences on these elements are unaffected.

`material-static-position-observation.json` retains all 340 case identities,
input digests, authenticated paired tree receipts, prior row digests and proofs.
Different element types, generated-owner aliases and custom renderers were not
included in this bounded review. They need their own correspondence evidence.
The remaining omitted-relative population cannot use this classification: its
explicit reference containing-block request is materially different.

## Verification and remaining work

`node tests/material-parity/static-position-observation.mjs` generated the report.
`node --test tests/material-parity/static-position-observation.spec.mjs` passed
2/2, exit 0, 1513.119 ms. Fresh collection equals the checked report; eight
negative controls reject explicit requests, resets, missing style stages,
changed element types, different reference position and an untrusted style source.

Canonical integration is pending and no unresolved count is reduced by this
standalone evidence. No core, plugin, fixture, or reference change was made.
Used-position and containing-block behavior still require public equivalent-input
proof rather than changing omitted values into invented computed defaults.
