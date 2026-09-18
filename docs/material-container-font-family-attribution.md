# Proposed attribution: container font-family measurement stages

The [canonical proposal](material-container-font-family-attribution-plan.json)
maps all **20 container groups / 1,082 original observations** from the
[source proof](material-container-font-family-stages.md) to unresolved rows in
the frozen canonical audit at `06e50db`.

Proposed classification: `parity-harness-defect`.
Proposed attribution: `reviewed-container-font-family-declaration-stage`.
This explains a computed-inheritance versus local-declaration comparison. It
does not promote a whole-element input-equivalence or rendering-equivalence
claim, and no canonical classification is changed by generating the proposal.

## Complete membership and conservation

The generator replays the original property/ancestor proof, authenticates the
original capture, and independently streams/authenticates the entire canonical
payload before selecting the proposed rows. It uses the actual production
normalizer, bound to the digest of its seven function definitions. The raw
`Roboto, Arial, sans-serif` stack remains in the source evidence; canonical
serialization to `roboto,arial,sans-serif` is not treated as a different input.

Every proposed row requires exact family/owner/property/scalars, occurrence
count, ordered case sample and state membership. Each original observation
retains input, tree and proof hashes; each row retains its complete canonical
digest. Duplicate owners, lost cases, altered values and previously classified
rows are rejected rather than silently replaced.

All **8,319 other complete canonical rows** are conserved outside the proposal.
Their ordered complete-row digest sequence is
`bc4b24c9c26652cc6eb7f34aeaa032345136daeb34f67baf54e5d6f4eb5504cb`.
Plan SHA-256:
`2470cb720d98721724cb94aac8f2fad1b18e491eb2c62b1b0493e56e357da125`.

Candidate computed typography, physical font selection, plugin drawing,
descendant consumers and final raster remain unverified by this classification.
The stepper token omission remains in its independent authoring proposal; it
cannot be absorbed into these inheritance-stage rows. The 60 literal progress
motion rules remain part of the source proof, not normalized away.

## Verification

```text
node --max-old-space-size=512 scripts/audit-material-container-font-family-stages.mjs --plan
node --test tests/material-parity/container-font-family-stages.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits **0** with 20 groups, 1,082 observations and 8,319 unrelated
rows. The expanded focused suite contains independent source/full-payload
no-write replay, 2,440 source mutation checks, a stepper exclusion guard, 26
join mutation checks and the harness inventory tests. The small synthetic join
witnesses exercise validation logic only; actual payload acceptance belongs to
the independent CLI replay.

The suite passes **9/9**, exit **0**, in **102,832.7768ms**, with no failures,
skips, cancellations or TODOs. It retains all 2,466 mutation checks and the
separate stepper exclusion check. Log:
`artifacts/material-parity/field-host-flow-input-audit/container-font-family-plan-focused.log`.

Canonical unresolved groups remain 2,160. Discovery remains 131 files; the
original 120-file full run and later current full/enforced runs are separate
acceptance evidence. No renderer or comparison input was changed.
