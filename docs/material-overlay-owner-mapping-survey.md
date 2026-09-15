# Shared initial-style survey: overlay owner identity

This increment joins the **54 owner-mapping groups** in the remaining shared
initial-style survey to existing, source-reviewed origin alias evidence. It
does not change the core inspector, canonical attribution, fixture authoring
or any renderer behavior.

The population contains 91 original interaction cases and 200 unique
case/owner pairs: 25 bottom-sheet cases with four owners each, 32 dialog-panel
cases, and 34 snackbar cases with two owners each. The cases include activate,
activate-leave, activate-twice, open and open-hover-content states as declared
in the original captures. Every group's complete case list is preserved.

## Evidence reused, not inferred from screenshots

The executable survey verifies its source fingerprints and original capture,
reopens both hash-bound trees for every selected case, and reuses
`resolveOriginAliasPair`. That existing resolver checks generated component
ownership, all 89 reference scalar property names/values, candidate type and
all three style stages, actual owner paths and scalar-versus-tree authored
rules. It does not assign synthetic IDs or change captured structure.

Every resulting owner proof exactly matches the corresponding complete record
in `material-transform-origin-alias-survey.json`, including both input-tree
digests and any rule gaps. Thus these 200 identities were already established;
the new result is their explicit connection to the 54 shared-style groups,
not a newly discovered renderer defect.

- **141 owner observations** have matching scalar/tree rule evidence.
- **59 owner observations** retain the known layer-rule gap: 25 bottom-sheet
  overlay wrappers and 34 snackbar overlay wrappers omit the layered
  `.cdk-global-overlay-wrapper { z-index: 1000 }` declaration from the scalar
  authored-rule capture while the full tree retains it.

The existing real-browser test `captured Material scalar collector skips layer
rules that full-tree capture retains` in `input-tree-evidence.spec.mjs` proves
the capture mechanism. The scalar walker descends into media/supports rules
but skips `CSSLayerBlockRule`; the full-tree walker descends into generic
rule containers. This existing finding remains explicit and is not normalized
away by mapping success.

## Verification

```powershell
node scripts/audit-material-overlay-owner-mappings.mjs
node scripts/audit-material-overlay-owner-mappings.mjs --check
```

Generation and no-write replay exit 0. Both reopen all selected original
evidence, match all 200 earlier alias proofs exactly, and perform **600 negative
checks**: changed reference scalar, duplicated candidate identity, and a direct
reference ID shadowing the alias, for every owner pair. All are rejected.
The machine-readable companion preserves all 54 groups, complete case lists,
91 paired-tree references, 200 proofs and their scalar-rule gaps.

## What remains unresolved

Measurement identity does not establish equivalent authoring, inherited values,
CSS support, layout, hit testing, stacking or raster output. These owner paths
still end at a captured overlay root rather than the actual body/html ancestry.
The newer 48-case reference ancestor supplement includes separately labelled
fresh activations, not exact replay of all 91 original interaction states.
Do not substitute it for missing state-specific external context.

The next integration must keep identity, external context, explicit declarations
and computed/used-value consumption as separate checks. In particular, it must
not waive the non-main-root guard merely because an alias now resolves. The
canonical unresolved count remains 2,812; this standalone join grants no new
initial-style or rendering-equivalence attribution.

The subsequent [original-state context replay](material-original-overlay-context-survey.md)
now supplies fresh reference external context for all 91 original cases, using
the harness's exact action functions and matching all 200 original owner proofs.
That closes the state-replay evidence gap above, but not the candidate
inherited/used-value or rendering-equivalence obligations.
