# Plain-text inherited font size: measurement-stage evidence

## Finding

All **220 original observations** of the five owners below retain the same
font size as the browser computed value. Their candidate local declaration
snapshots omit `fontSize`; that omission is not a zero, missing glyph size, or
demonstrated renderer inheritance failure. Comparing those two stages produces
a misleading font-size discrepancy.

| Owner | Original observations |
| --- | ---: |
| `badge-label` | 52 |
| `card-copy` | 52 |
| `divider-above` | 24 |
| `divider-below` | 24 |
| `stepper-content` | 68 |

The collector scans all 2,311 original static/interaction cases and authenticates
each selected input tree against its original capture digest. It preserves the
exact case, theme, viewport, state, scalar-input digest, owner text, reference
ancestry, active font requests, candidate ancestry and three local style stages,
and the separately recorded core-text-registry style. The four themes retain
16px, 14.4px, or 18.4px according to the reference frame scale. No omitted local
declaration is rewritten into an invented computed value.

This is **measurement-stage evidence only**, not whole-element input equivalence,
layout correctness, typography raster acceptance, or proof that the renderer
has no other defects. For example, the card's reference `mat-card-content` and
candidate `p` remain different structures; the divider's existing authored
position offsets are not justified by a matching font size. The separate
[list/table finding](material-container-font-inputs.md) remains a genuine fixed
font authoring substitution and is not covered by this explanation.

## Ownership and source trace

- `src/lib/astylar.ts:910` (`inspectCurrentDocumentStyles`) records local
  normal/effective style snapshots separately from the text registry's retained
  style. It does not label the local snapshot as fully inherited computed CSS.
- `tests/material-parity/run-material-parity.mjs:1373` selects reference parity
  targets using visibility and nonzero bounds. Both stepper bodies share the
  parity marker; the reference component at
  `examples/material-showcase/src/app/reference.component.ts:89` authors both.
- Every stepper tree has two corresponding text owners: one `visible` and one
  `hidden`, with `Project details` and `Review changes` preserved. The proof
  requires these exact alternatives, a unique visible owner, and its text to
  match the captured scalar input and candidate own-text owner. It does not
  independently replay the browser bounding-box selection or claim visibility
  from text alone.
- The other four owners are unique leaf nodes in both captured trees. The proof
  rejects child nodes, text changes, interrupted reference font inheritance,
  candidate local font overrides, missing/changed retained styles, and changed
  source/evidence stages.

The first demonstrated divergence for the **font-size comparison** is the audit
measurement stage: browser computed inheritance versus a candidate local
declaration. The retained value already exists in the original evidence. No
production renderer, fixture, or canonical classification has been changed.

## Reproducible proof

```powershell
node scripts/audit-material-leaf-font-stages.mjs
node scripts/audit-material-leaf-font-stages.mjs --check
node --test --test-concurrency=1 tests/material-parity/leaf-font-stages.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and independent no-write replay both exit **0**. Focused verification
passes **6/6**, exit **0**, no skipped/cancelled/todo tests, duration
**3640.1127 ms**. Twenty-three rejection controls run independently for each of
the five owners (**115 executions**). The initial implementation correctly
rejected the stepper's duplicate marker; inspection established the explicit
hidden/visible ownership distinction above. An initial serialization test also
exposed optional undefined IDs; the report now records absent ancestry IDs as
null rather than comparing non-serializable objects to JSON.

Machine evidence: [material-leaf-font-stages.json](material-leaf-font-stages.json).
Generated UTF-8 SHA-256:
`9c835c4efc6a4e4f2c53eff2ce476a5dca035d85cf985ff7942e31f7d2bd80dc`.
Original capture SHA-256:
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

## Next integration and limits

Before promoting any canonical discrepancy, join this independent source
population to the exact canonical rows, distinguish already classified static
observations from pending interaction observations, and verify conservation of
every unrelated row. Do not blanket-waive `fontSize`, infer inherited values for
unmeasured elements, or use this own-text proof for container/control/overlay
owners. Canonical unresolved counts remain unchanged by this increment.

Implementation recommendation: preserve raw local snapshots and add explicit
measurement-stage attribution for verified retained text, rather than adding
fixture-local font sizes to make the audit green. Matching text input alone is
not sufficient to close the rendering audit. The complete current harness and
enforced parity matrix remain required.
