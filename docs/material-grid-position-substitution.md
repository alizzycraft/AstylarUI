# Grid-list: authored positioning substitution

The complete positioning census now has a source-backed disposition for its
three grid-list groups: **156 scalar observations across 52 captured states**.
Classification: **application/plugin authoring defect**, owned by the showcase
translation. This is a classification of non-equivalent layout inputs, not a
new claim about the cause of a renderer failure.

Every authenticated pair has these requests:

| Owner | HTML reference | AstylarUI |
| --- | --- | --- |
| List | Relative block containing positioned tiles | Two-track grid, zero gap, position omitted |
| Tile one | Absolute; width `calc(50% - 0.5px)`, left `0px` | Relative flex item; height `80px` |
| Tile two | Absolute; width `calc(50% - 0.5px)`, left `calc(50% + 0.5px)` | Relative flex item; height `80px` |

The substitution is present before core layout and Babylon projection. An
omitted list position is retained as omitted, not relabeled as computed static.
The reference's one-pixel gutter is absent from the candidate's authored grid
request. This is not justified merely by two similarly arranged tiles.

## History distinguishes the original substitution from later compensation

- Initial showcase `2f440115` already used the zero-gap grid and flex tiles.
  Thus the outer substitution was not introduced by a later parity repair.
- The actual `d3ff236` patch, titled `fix(example): align Material grid list`,
  added relative positioning to the tile, replaced its flex centering with an
  absolutely positioned label, and added density/type-scale/mobile-specific
  label offsets (including fractional pixels). It also replaced direct text
  with a label span. This is direct evidence of fixture-side calibration.
- `2f63b523` removed the calibrated label offsets and restored tile flex
  centering, but retained relative tiles and the zero-gap grid. Removing one
  compensation did not restore the reference layout input.

Current sources: `examples/material-showcase/src/app/reference.component.ts:65`
and `examples/material-showcase/src/app/astylar.component.ts:683` (rules), `:842`
(structure). The JSON evidence retains historical whole-source hashes and exact
grid rules, original group hashes, complete case membership, and authenticated
tree receipts.

## Required implementation order

Do not fix this by adding an arbitrary gap or changing tile offsets. Reuse the
existing original-expression, literal-control and loaded-CSS public reductions
in `examples/material-showcase/src/app/input-equivalence-proof.spec.ts:168`.
Those investigations already separate direct-expression support from the inner
opposing-inset used-height defect; this source review does not rerun or expand
their rendering claims.

Resolve the owning expression/used-size behavior and prove the original
positioned composition first. Then remove the grid substitution as a coherent
translation change, preserving the reference's wrappers, clipping, sizing and
centering intent. Neither the old label offsets nor the newer grid/flex result
should become the renderer's acceptance target.

## Verification and remaining work

```powershell
node scripts/audit-material-grid-position-substitution.mjs
node --test tests/material-parity/grid-position-substitution.spec.mjs
```

The checker authenticates the original census and all 52 paired trees, checks
all three candidate style stages and reference inline expressions, verifies
tile ancestry, and rejects changed positions, gutters, stages, or owner
membership. The generated JSON hash is
`eface143a0232cbdc48eb9160ab0da250bc278f858344844b5fc983a97a2241c`.

Latest focused result: **2/2 passed**, no skips, **354.8641 ms**, including
whole-object equality between fresh replay and checked-in machine evidence.

Canonical attribution remains unchanged while the visibility regeneration is
running. A subsequent reviewed integration must conserve the three original
position rows and every other raw input. This finding does not establish full
geometry, raster, scrolling, or interaction equivalence.
