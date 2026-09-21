# Divider and switch: flow replaced by coordinates

The full authenticated positioning population supports an authoring-defect
classification for three additional groups, covering **160 scalar observations**:
24 divider states, 68 switch-label states and 68 switch-host states.

| Owner | Reference request | Candidate request |
| --- | --- | --- |
| Divider | Static zero-height block, one-pixel solid top border | Absolute one-pixel background strip, fixed top coordinate and side insets |
| Switch label | Static span inside a label in a centered inline-flex field | Absolute span, top `6px`, left `60px` |
| Switch host | Static inline-block Material host | Relative fixed-height `32px` host containing positioned presentation |

These are differences in authored composition before core layout or projection,
not equivalent representations inferred from similar output. In the divider
case both the flow role and paint primitive change. For the switch, the shared
flex alignment relation is replaced by a label coordinate.

The collector authenticates every original tree receipt, verifies the owners and
their ancestry, checks all three candidate style stages, and preserves each
original scalar input hash and case identity. Machine evidence is
`docs/material-flow-position-substitutions.json`, SHA-256
`ae18da9453f68f2c5ed68bac464db6bd465cc6b74c3d5a5304f80dd60477403f`.

## Source and history

Current authoring is in `examples/material-showcase/src/app/astylar.component.ts`:
switch host at line 504, label at 511, divider at 759, and nearby paragraph
coordinate rules at 760–769. This review does not automatically classify those
paragraph properties or other switch presentation children.

Inspecting `2f440115` confirms the initial showcase already contained the switch
host dimensions, absolute label at `(60px, 6px)`, and an absolute divider with
density-dependent top coordinates. The original divider also specified separate
720/638/260px widths. Later edits changed the divider to side insets and refined
its vertical coordinates. Therefore, the earlier history finding about later
divider calibration should not be read as the introduction of absolute
positioning itself.

Read-only reproduction:

```powershell
git log --format="%h %s" -S "selector: '.switch-label', position: 'absolute'" -- examples/material-showcase/src/app/astylar.component.ts
git log --format="%h %s" -S "selector: '.divider', position: 'absolute'" -- examples/material-showcase/src/app/astylar.component.ts
git show 2f440115:examples/material-showcase/src/app/astylar.component.ts
```

## Ownership and next implementation

The showcase owns restoring equivalent inputs. Before doing so, retain and use
the existing equal-input divider reduction, which exposes the core empty-block
used-height defect. Fix that rule in core; do not compensate with another
absolute line or a measured parent height.

For the switch, reproduce the reference label/field composition through the
public API and evaluate its formatting context before removing coordinates.
The separately demonstrated core vertical-align defect is relevant to investigate
but is **not established here as the cause of the original switch symptoms**.
In particular, this review neither diagnoses the minus-icon alignment nor proves
cursor, hit-target, accessibility, or pressed-state equivalence.

The canonical audit has not yet incorporated these three classifications.
Integration must preserve the raw rows and must not label missing inputs or
structural substitutions as renderer equivalence.

## Verification

```powershell
node scripts/audit-material-flow-position-substitutions.mjs
node --test tests/material-parity/flow-position-substitutions.spec.mjs
```

**2/2 passed**, no skips, **597.1092 ms**. Fresh replay equals the entire checked-in
machine report. Negative controls reject changed positioning, reference label
context, divider height/border model, and the candidate label offset. No renderer
or canonical example was changed.
