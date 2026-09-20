# Disabled label color-stage reconciliation

The precision correction changes eight foreground difference groups across 32
observations: eight checkbox labels, sixteen radio labels, and eight expansion
titles. Fresh replay of the existing typography reviews establishes that these
are still unequal authored disabled-state inputs. It does not establish a core
alpha or text-rendering failure.

An important distinction remains explicit: the 24 radio/expansion observations
omit their own color in local normal/effective styles, while retained text has an
inherited opaque color. The eight checkbox labels explicitly carry the opaque
color. The review must not fill the local omissions with inherited values merely
to make the evidence appear uniform.

## Evidence and ownership

`scripts/audit-material-disabled-label-color-stages.mjs` authenticates the
original capture, loads the exact 24 affected interaction cases, rebuilds their
complete tree inventory, and replays the production retained-typography
collector. It requires no inventory errors/gaps and exactly 32 matching ink
reviews. Each observation joins the precise reference value, original local
value or omission, actual retained color, case, element, source input hash,
original tree receipts and full retained-review hash.

The source proofs are `reviewedDisabledChoiceLabelInk` and
`reviewedDisabledComponentInk` in
`tests/material-parity/input-equivalence-audit.mjs` (lines 3562 and 3784 at this
increment). They inspect original token declarations, associated disabled native
controls, candidate ancestry, declarations and retained text. The responsible
authoring boundaries remain disabled checkbox/radio label token translation and
disabled expansion foreground translation. Their justifications remain attached
to each observation in `docs/material-disabled-label-color-stages.json`.

This is reconciliation of two evidence stages, not a new cascade, a rewritten
input, or canonical discrepancy promotion. The main discrepancy rows still need
explicit integration. Token fallback provenance, actual alpha compositing,
disabled interaction, and final rasters remain separate obligations.

## Verification

```text
node --max-old-space-size=1024 scripts/audit-material-disabled-label-color-stages.mjs
node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/disabled-label-color-stages.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Passed **6/6**, exit 0, in **4,820 ms**. The focused proof checks all 32
observations and preserves all 24 omissions. Twelve negative controls reject
changed owner/property identity, membership, classification, attribution and
precise or observation-stage values. The pure join is explicitly not an
authenticator; the collector must independently replay the original proof.

Report SHA-256:
`cd5ab3de48edf582f54abd8a7d8e56150baf720228baa6568f3cbfdac9fe8b31`.
No renderer or comparison fixture was changed.
