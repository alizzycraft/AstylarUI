# Gap review: four groups retain a demonstrated scalar-layer capture defect

The [machine evidence](material-gap-scalar-rule-loss.json) binds the four
remaining scalar-rule-gap groups to all their original observations: **25
bottom-sheet and 34 snackbar cases**, each contributing `rowGap` and `columnGap`,
for **118 property observations**. This is a separately verified classification
supplement, not canonical integration or a renderer fix.

## Demonstrated boundary

Every original paired tree is hash-checked. The existing generated-owner proof
identifies the correct overlay wrapper, verifies all 89 reference scalar
properties and all three candidate style stages, and retains exactly one
missing scalar authored rule:

```css
.cdk-global-overlay-wrapper { z-index: 1000; }
```

The reference full tree retains that rule inside `@layer cdk-overlay`, while
the scalar authored-rule list omits it. The original scalar collector's
`matchedAuthoredStyles` in `tests/material-parity/run-material-parity.mjs:1404`
recurses through media and supports rules, but not CSS layer blocks. The
full-tree collector in `tests/material-parity/input-tree-evidence.mjs:18`
recurses through nested rule containers. The exact source files are fingerprinted
in the new report.

This is an already isolated **harness/instrumentation defect**, not a newly
inferred core gap defect. The real-browser test `captured Material scalar
collector skips layer rules that full-tree capture retains` passed as test 506
in the complete 91-file/854-test run. Its source and both collectors are
unchanged since that run's `52ec632` starting revision. The prior
[generated mapping investigation](material-input-audit-investigation.md#generated-mappings-expose-omitted-scalar-css-layer-evidence)
records the reduction, affected population and introduction history.

The new result is a complete join of these **four gap groups** to that known
failure. It does not replace the broader browser proof with a source regex or
assume the first witness represents every state. Each group's complete
case/proof digest exactly matches the earlier source-bound gap survey.

## What this does not establish

The missing declaration is about stacking, not gap. The captured gap comparison
is still browser-computed `normal` versus omitted candidate local longhands.
Neither omission supplies a candidate computed value or proves a used gap of
zero. No historical scalar record is repaired. Reference/candidate structure,
external ancestry, layer precedence, stacking behavior and final rendering
remain separate obligations.

The bounded classification is therefore **capture evidence loss with unequal
observation stages**, not equivalent representation, a demonstrated gap-layout
failure, or proof that adding the missing z-index fixes an overlay symptom.

## Owning-boundary plan

1. Correct shared scalar rule collection to preserve grouping-rule context,
   including layer identity/order and condition activity. Do not simply copy a
   missing rule from the paired tree into a historical scalar record.
2. Preserve the original failing capture and generate separately versioned
   corrected evidence. Keep ordinary, media, supports, layer and inactive-rule
   controls in the regression; unknown grouping semantics must remain explicit.
3. Re-evaluate the original overlay inputs with that trustworthy evidence.
   Candidate computed/default consumption, equal-input layout and overlay
   ownership still need independent proof.

## Verification

```powershell
node scripts/audit-material-gap-scalar-rule-loss.mjs
node scripts/audit-material-gap-scalar-rule-loss.mjs --check
```

Both commands exit **0** in session **63042**, each reopening all original
evidence and reproducing all four proof digests. Both run **17 negative
controls** that reject other issue types, altered scalars, incomplete mapping,
changed/missing/additional rules, broken owner identity, explicit requests,
changed candidate stages and unsupported equivalence claims. The original
canonical manifest, compressed payload and human-report hashes remain unchanged.

This standalone verifier was added after the current 95-file harness started;
it is separately executed evidence, not an addition to that running inventory.
Canonical attribution remains at 2,330 unresolved groups until a later tested
integration. No core, plugin, canonical fixture or running-test source changed.
