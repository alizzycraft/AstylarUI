# Source-bound font ownership attribution proposal

## Scope

This proposal joins four independently replayed source investigations to the
unchanged canonical scalar population. It is **not a canonical promotion** and
does not modify renderer behavior or the comparison inputs.

| Source proof | Original observations | Proposed pending groups / observations | Preserved observations |
| --- | ---: | ---: | --- |
| [Toolbar/paginator font scope](material-font-scope-inputs.md) | 104 | 2 / 104 | Matching descendant sizes remain in the source evidence |
| [Expansion title font input](material-expansion-title-inputs.md) | 68 | 1 / 45 | 6 previously reviewed static omissions; 17 compact numeric matches |
| [Tab-panel private typography](material-tab-panel-inputs.md) | 70 | 3 / 70 | All private size numbers match but do not establish CSS text-input equivalence |
| [Overlay inheritance context](material-overlay-font-inputs.md) | 182 | 6 / 182 | 94 page-size matches, 88 differences and 59 scalar rule gaps remain explicit |

Total: **424 original owner observations**, **12 proposed groups / 401
observations**, one preserved group / six observations, and 17 matching local
font-size observations. All proposals identify application/plugin input or
ownership defects, not renderer failures under equivalent inputs.

The first six proposed rows are toolbar 22px (52), paginator 12px (52), tab panel
16px (36), 14.4px (17), 18.4px (17), and expansion title 16px (45), each compared
with an omitted candidate local size. The actual reference inheritance or
private drawing path is retained in the linked source proof; no missing
candidate declaration is synthesized from a descendant or private data value.
The additional six rows are the bottom-sheet wrapper/panel (25 each), dialog
panel/actions (32 each), and snackbar wrapper/surface (34 each), each with
reference 16px versus omitted local candidate size. Their ancestry and token
differences are separately proved, not classified as generic omission.

## Exact conservation and provenance

[Machine-readable plan](material-font-ownership-attribution-plan.json) binds
the four source report digests, the original capture digest, production style
normalization and the complete historical canonical payload at
`06e50dbcd3594c5987d63a4ec38e792b87b08dde`. All 8,339 complete canonical rows are
authenticated. Every selected group must reproduce its exact scalar values,
occurrence count, ordered case sample, states and previous attribution.

The **8,327 other complete rows** are preserved in original order. Their
ordered row-digest array SHA-256 is:
`befdccf6eb8486eff1a65e0ece6b3bfb23b3a7b823913df911b1e0835778e4b3`.

Plan SHA-256:
`4373804d480f8e90337ca74d39503d51638398084e97e54008aa593cd5179631`.

The extension deep-compares every earlier complete proposal, preserved review,
matching observation and source-report descriptor with committed plan
`25ae772`. The earlier plan remains historical evidence (six groups / 219
observations), not an expectation silently rewritten to accept extra groups.

The source proofs independently reopen all 2,311 original cases and each
selected full tree. The join checks original input digests, identity,
profile/state/viewport, all local-style size stages and classification scope.
It rejects missing original owners even when the remaining rows look complete.
The 17 compact numerical matches are retained as witnesses rather than being
silently removed from coverage.

### Failed initial join retained as a diagnostic

The first generation failed `incomplete canonical occurrences`, reporting
**6 versus 9**. It had incorrectly grouped every static expansion omission
under the existing stage review. Only the six light/dark static cases have
matching retained size and that prior review. The three custom static cases
remain unresolved, together with 42 interactive cases. The corrected join uses
the independently captured retained-size distinction and preserves the exact
six earlier cases. The canonical expectation was not changed to accept nine.

## Implementation order

1. Restore component-level font token/inheritance scope for toolbar, paginator
   and expansion in separate equivalent-input diagnostic fixtures. Do not
   replace one descendant override with another.
2. Replace the tab plugin's competing ordinary-text paint path with core text
   input/paint while retaining legitimate transition orchestration. The existing
   runtime characterization demonstrates the private consumer; it is not a
   passing equivalent-input regression test.
3. Preserve the external overlay font context and bottom-sheet container token
   in equivalent-input reductions. Keep surface-local modal/event containment
   and clipping assertions separate from CSS inheritance scope. No position or
   visibility fix follows solely from this font evidence.
4. Trace any remaining discrepancies from those equivalent inputs to the
   shared core owner. Keep font-relative layout, actual glyph/raster behavior,
   state transitions and resource lifetime as independently checked contracts.
5. Remove now-unnecessary comparison compensations only after general fixes and
   same-input regression evidence establish that they are unnecessary.

The source-specific reports provide exact source locations and history. This
plan does not approve the six earlier stage classifications as whole-element
equivalence; it preserves their scope and complete prior records.

## Verification

Generation with the complete historical payload passes:

```text
node --max-old-space-size=512 scripts/audit-material-font-ownership-attribution.mjs
```

Independent replay and focused join controls are run with:

```text
node --test tests/material-parity/font-ownership-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The **previous six-group version** independently replayed the full payload and
passed its focused/inventory suite **8/8**,
exit **0**, in **100,974.2431ms**, with no skips, cancellations or TODOs.
The suite includes **62 negative-control executions** against source witnesses,
original population membership, matching cases, canonical group membership and
prior review precedence. The saved log is
`artifacts/material-parity/field-host-flow-input-audit/font-ownership-attribution-focused.log`.
At that revision discovery contained 127 files: 119 Material, four general and
four TTS, retaining all 43 legacy files. This result is not evidence for the
subsequent overlay extension.

The overlay extension's 12-group generation passes. Its independent replay,
join mutation tests, earlier-proposal conservation and inventory verification
pass **9/9**, exit **0**, in **100,111.9275ms**, with no skips, cancellations or
TODOs. There are **84 rejection-control executions**. The test deep-compares
all six previous proposal entries, the preserved review, 17 matching witnesses
and three previous source descriptors with `25ae772`.
Log: `artifacts/material-parity/field-host-flow-input-audit/font-ownership-overlay-extension-focused.log`.
Current discovery remains 128 files (120 Material plus eight general/TTS).

No canonical classification changed; the canonical unresolved count is still
2,160. Neither this proposal nor its focused tests replace the running original
120-file harness, the later complete inventory, or enforced output parity.
