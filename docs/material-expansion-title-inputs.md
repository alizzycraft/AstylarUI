# Expansion title component font input

## Finding

All **68 original expansion-title observations** have a component font-size
declaration-scope difference. Material requests its header font-size token on
`mat-expansion-panel-header`, and the title inherits the computed 16px value.
The replacement `.expansion-trigger` omits that request. Its title normally
inherits the page size, with a compact-only 16px override on the title itself.

| Captured profiles | Observations | Candidate title input | Retained title size |
| --- | ---: | --- | --- |
| Light and dark | 34 | No local font size; header also omits the component token | 16px, numerically matching |
| Contrast/compact | 17 | Title-only 16px override; header still omits the token | 16px, numerically matching |
| Custom | 17 | No local font size; header also omits the component token | 18.4px, versus reference 16px |

Thus 51 observations omit the local title size, 17 override it, 51 retained sizes
match numerically and 17 differ. A matching descendant scalar does not establish
equivalent inheritance scope or font-relative header layout. The first proven
difference is **application/plugin authoring**, not a core failure under equal
inputs. This extends the existing expansion token-omission investigation to
every original title observation, including numerical matches; it is not a new
diagnosis of the expansion body.

## Evidence and history

[Machine-readable evidence](material-expansion-title-inputs.json) scans all
2,311 original capture entries, selects all 68 expansion cases, authenticates
their full tree files and preserves state, profile, viewport, scalar digest,
ancestor paths, font requests, all three candidate local-style stages and the
independent retained core-text style. Cycles, ambiguous nodes, unexpected
font/reset rules, unknown potentially applicable selectors, nested rules and
changed capture provenance are rejected.

Original capture:
`artifacts/material-parity/current-ancestry-audit/latest-report.json`, SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

Evidence SHA-256:
`a37dfde3e9303af74ccffe3a43451dd2a41774a3925ce3c53896880135672442`.

Current `examples/material-showcase/src/app/astylar.component.ts` locations:

- Line 658: replacement header style, without the component font-size token.
- Lines 663–664: title style and compact-only 16px override.
- Line 993: replacement header/title and separate body structure.

The report binds the full revision resolved from `25e1893`, before/after source
digests and line-numbered excerpts. That commit introduced a compact-only title
16px override together with `translate(0, -0.5px)`. The current override retains
16px but has zero padding instead of that transform. The evidence preserves
this distinction; it does not claim the historical and current declarations
are identical or infer the developer's intent.

An initial collector assertion incorrectly expected the complete historical
and current override lines to match. It failed on this real difference. The
collector now checks the historical transform and current padding separately;
no failed output was accepted as evidence.

## Proposed correction and regression boundary

In a separate implementation task, preserve the reference header-level token
and inheritance scope. Review the compact descendant override against that
input, rather than adding more title positioning/size compensation. Use an
isolated equivalent-input fixture to exercise header inheritance, a
font-relative descendant box, title text, expanded/collapsed and disabled
states, and all captured scale profiles. Trace any remaining divergence through
core style, layout and text ownership before changing the renderer.

The current proof does not establish candidate computed header size, whole
element equivalence, glyph raster quality, the need for the historical offset,
or a core inheritance defect. The existing general font-relative box proof
remains independent and must not be conflated with this authoring difference.

## Verification

```text
node scripts/audit-material-expansion-title-inputs.mjs --check
node --test tests/material-parity/expansion-title-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Independent no-write replay passes. Focused/inventory verification passes
**6/6**, exit **0**, **3,254.0323ms**, no skips, cancellations or TODOs.
Twenty-seven mutations run independently for each of four profiles, giving
**108 rejection-control executions**. Full-harness discovery includes the new
suite: 125 files, consisting of 117 Material, four general and four TTS suites.

No renderer, canonical fixture or canonical classification changed. The
canonical 2,160 unresolved groups remain unchanged. The original 120-file full
harness is still running separately and has two diagnosed historical
conservation failures; this focused pass is not complete harness acceptance or
the required enforced output-parity matrix.
