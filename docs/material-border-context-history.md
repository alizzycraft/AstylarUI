# Border contextual-color history: a pre-showcase core boundary

## Finding

The context-free border-color parsing boundary already exists in ancestor
`19d01be551aca2dab9e75e5ed79f2c819d099e8d`, before showcase revision
`2f440115740ff76fa9e55b3f4a11568207b2af5a`. The executable check verifies Git
ancestry, not chronological ordering of commit dates. The former revision adds
the inspected border-service file; it is **not** established as the first
renderer implementation or the first revision with this defect.

This closes a historical question for the [existing public border-color
reproduction](material-input-audit-investigation.md#border-colors-documented-default-divergence-and-two-independent-core-paint-gaps-2026-09-12):
the demonstrated absence of contextual color at this method boundary predates
the Material comparisons. It should not be attributed to a later Material
fixture adjustment. It does not prove that every later color mismatch has this
cause or that any particular fixture literal was introduced to conceal it.

## Exact method replay

`scripts/audit-material-border-context-history.mjs` extracts the original
TypeScript method bodies from the pinned Git objects, checks the AST, and
transpiles them without rewriting their logic:

- `ElementBorderService.parseBorderProperties`, historical line 18.
- `StyleService.parseBackgroundColor`, historical line 380.
- Its literal helpers `parseHexColor` and `parseRgbColor`, lines 611 and 595.

Full source and individual method hashes, inputs, parser arguments and results
are preserved in [the machine-readable record](material-border-context-history.json).
The caller supplies only the border-color string. Two different element colors
do not reach the parser as context.

| Element color | Border color | Returned RGB |
| --- | --- | --- |
| `#123456` | `currentColor` / `CURRENTCOLOR` | `(0.2, 0.2, 0.3)` in both cases |
| `#c04a20` | `currentColor` / `CURRENTCOLOR` | `(0.2, 0.2, 0.3)` in both cases |
| `#123456` | matching literal `#123456` | `(18, 52, 86) / 255` |
| `#c04a20` | matching literal `#c04a20` | `(192, 74, 32) / 255` |

All six inputs remain unchanged. The two literal controls show that the replay
does not simply force every value to the fallback. The four keyword controls
retain the incorrect result; passing this audit check means reproducing and
accounting for that result, not passing CSS rendering parity.

## Boundary and ownership

The RGB constructor is replaced only with a transparent data carrier, and
historical logging is captured. There is no Babylon engine, material, camera,
surface, cascade or raster simulation. Border width is intentionally absent so
the parsing proof does not execute the historical coordinate-conversion path.
This is source/method evidence, **not a historical public-API reproduction**.
Current browser/material evidence remains the separately recorded public test;
that browser test was not rerun for this historical increment.

The proposed correction belongs to core contextual style resolution and its
paint consumer. A plugin or comparison should not resolve this by replacing
`currentColor` with a sampled literal. The CSS initial border-color difference
and dropped alpha are separate findings; this replay does not merge them into
the contextual-color issue.

No renderer, plugin, canonical fixture, reference, classification or threshold
is changed. The 2,160 unresolved canonical signatures remain unresolved by this
increment. Future implementation must retain equivalent keyword inputs in a
public regression and establish current real-browser output, not merely change
this historical record.

## Verification

Run from the repository root:

```powershell
node scripts/audit-material-border-context-history.mjs
node --test --test-concurrency=1 tests/material-parity/border-context-history.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The first command has been executed successfully: six source-method controls,
exit 0. The registered test compares the entire replay with the checked-in
record; the inventory test requires its inclusion in the complete harness.
The combined registered replay and inventory controls pass **5/5**, exit **0**,
in **1,364.3841 ms**, with no failures, skips, cancellations or todos.
Log: `artifacts/material-parity/field-host-flow-input-audit/border-context-history-registered.log`,
SHA-256 `3e6ac8eed9c2f289f35f0f56d8cdc181c56d5cdd7e94647a4b859503cd5df72c`.
Discovery now includes 116 files (108 Material, four general parity and four
TTS). This focused pass does not replace the outstanding complete current
harness run or the enforced rendering matrix.
