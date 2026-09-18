# Canonical membership of the omitted control font-style reset

The [source/history proof](material-control-font-style-reset.md) now has an exact
join to the complete canonical audit at `957774a`. This is an attribution
proposal, not a canonical rewrite or an implementation fix.

## Membership and first divergence

All **756 original observations** join exactly **11 unresolved groups**:
nine shared Material button owners (600 observations), plus the two slider
range-input owners (156). Static and interaction observations belong to the
same unresolved groups; the join does not silently drop static cases or split
them into a more convenient population.

The difference is an omitted authored request: reference `font: inherit`
includes `font-style: inherit`, but the candidate shared reset only specifies
a fixed font-family stack. The proposal classifies that authoring omission,
not the merely absent local resolved scalar. The underlying proof checks the
paired owner identities, active reference reset and candidate ancestry before
making this distinction.

Captured button textures already report `normal`, and range inputs have no
captured text owner. Neither a visible normal/italic mismatch nor a renderer
inheritance defect is proven. The proposal retains these limitations and does
not fill in candidate computed values or claim input/rendering equivalence.

## Conservation and regression protection

The collector independently replays the source proof and its history, verifies
the complete original capture, authenticates the production normalization
functions, and reads every compressed and decoded byte of the frozen canonical
payload. Each group must have unique membership, an unresolved prior
classification, unchanged occurrence count, ordered case sample and states.
Each observation retains its original input, paired-tree and proof digests.

All **8,328 other complete rows** remain outside the proposed transition. Their
ordered row-digest hash is
`d6495f135be4ef033dc770a0b306fcc1aa550b73d22aba11dc03e6d33c17333c`.
No renderer, plugin, canonical fixture or canonical audit file is changed.

## Verification checkpoint

```text
node --max-old-space-size=1024 scripts/audit-material-control-font-style-attribution.mjs
node --test --test-concurrency=1 tests/material-parity/control-font-style-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation passed (exit 0). The focused suite passed **7/7**, exit 0, with no
skips, cancellations or TODOs, in **108,611.3541ms**. Its write-prohibited
independent source/full-payload replay took 91,943.8953ms. All 41 mutation
controls passed; the separate pure subset also passed 2/2 in 16,999.3913ms.
All canonical audit files remained byte-identical. Generated machine evidence is
`docs/material-control-font-style-attribution-plan.json`, SHA-256
`bb50baf5c7545312bee9503caf849561ba7dde805dd2226fe092d80d98e42e15`.
Logs are `control-font-style-attribution-generation.log` and
`control-font-style-attribution-focused.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.

## Implementation order, when authorized

First exercise genuinely equivalent `font: inherit` inputs through the public
API, including normal, italic and oblique ancestors and the other shorthand
reset properties. Correct any general parsing, cascade or control inheritance
failure at its owning core boundary. Then replace the family-only translation
with equivalent inheritance semantics. Do not author explicit `normal` or
measured typography values to reproduce these screenshots.

Canonical integration of this proposal remains separate. The current canonical
unresolved count is still 2,026; complete harness and enforced rendering matrix
verification remain outstanding.
