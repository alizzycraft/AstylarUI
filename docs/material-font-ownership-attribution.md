# Source-bound font ownership attribution proposal

## Scope

This proposal joins three independently replayed source investigations to the
unchanged canonical scalar population. It is **not a canonical promotion** and
does not modify renderer behavior or the comparison inputs.

| Source proof | Original observations | Proposed pending groups / observations | Preserved observations |
| --- | ---: | ---: | --- |
| [Toolbar/paginator font scope](material-font-scope-inputs.md) | 104 | 2 / 104 | Matching descendant sizes remain in the source evidence |
| [Expansion title font input](material-expansion-title-inputs.md) | 68 | 1 / 45 | 6 previously reviewed static omissions; 17 compact numeric matches |
| [Tab-panel private typography](material-tab-panel-inputs.md) | 70 | 3 / 70 | All private size numbers match but do not establish CSS text-input equivalence |

Total: **242 original owner observations**, **six proposed groups / 219
observations**, one preserved group / six observations, and 17 matching local
font-size observations. All proposals identify application/plugin input or
ownership defects, not renderer failures under equivalent inputs.

The six proposed rows are toolbar 22px (52), paginator 12px (52), tab panel
16px (36), 14.4px (17), 18.4px (17), and expansion title 16px (45), each compared
with an omitted candidate local size. The actual reference inheritance or
private drawing path is retained in the linked source proof; no missing
candidate declaration is synthesized from a descendant or private data value.

## Exact conservation and provenance

[Machine-readable plan](material-font-ownership-attribution-plan.json) binds
the three source report digests, the original capture digest, production style
normalization and the complete historical canonical payload at
`06e50dbcd3594c5987d63a4ec38e792b87b08dde`. All 8,339 complete canonical rows are
authenticated. Every selected group must reproduce its exact scalar values,
occurrence count, ordered case sample, states and previous attribution.

The **8,333 other complete rows** are preserved in original order. Their
ordered row-digest array SHA-256 is:
`afd281d25e77fd5d0136fc549dc6a4b15ba0ede2883b542824bdc670a4212023`.

Plan SHA-256:
`9f4b53f8e07db17df529e4d4572ecbe21fb6fdaf6ce7a02d15597f6108f3092e`.

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
3. Trace any remaining discrepancies from those equivalent inputs to the
   shared core owner. Keep font-relative layout, actual glyph/raster behavior,
   state transitions and resource lifetime as independently checked contracts.
4. Remove now-unnecessary comparison compensations only after general fixes and
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

The independent full-payload replay and focused/inventory suite pass **8/8**,
exit **0**, in **100,974.2431ms**, with no skips, cancellations or TODOs.
The suite includes **62 negative-control executions** against source witnesses,
original population membership, matching cases, canonical group membership and
prior review precedence. The saved log is
`artifacts/material-parity/field-host-flow-input-audit/font-ownership-attribution-focused.log`.
Current discovery contains 127 files: 119 Material, four general and four TTS,
retaining all 43 legacy files.

No canonical classification changed; the canonical unresolved count is still
2,160. Neither this proposal nor its focused tests replace the running original
120-file harness, the later complete inventory, or enforced output parity.
