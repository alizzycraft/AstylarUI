# Remaining positioning inputs: complete source census

The authenticated pre-root-integration audit contains 58 unresolved `position`
groups / 2,950 observations. This census reconstructs every group's complete
membership from the original 436-static / 1,875-interaction capture, rather
than extrapolating from its twelve displayed case samples. It verifies the full
compressed and decoded baseline hashes before selecting rows.

| Reference → candidate | Groups | Observations |
| --- | ---: | ---: |
| static → omitted | 23 | 1,212 |
| relative → omitted | 19 | 875 |
| absolute → fixed | 2 | 59 |
| static → relative | 10 | 608 |
| static → absolute | 2 | 92 |
| absolute → relative | 2 | 104 |

There are 863 observations with explicit candidate position declarations,
1,038 with explicit reference position declarations, and 1,951 with different
mapped element types. These populations overlap. An absent candidate value is
recorded as absent, not rewritten as the browser's computed `static` value.

Machine-readable evidence: `material-position-input-population.json`, generation
SHA-256 `71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff`.
Each group retains its baseline row digest and every original case, input digest,
paired tree receipt, reference/candidate values, normal/interaction-stage values,
authored position declarations with rule digests, and mapped element types.

## Priority investigations

1. **Overlay anchoring:** bottom-sheet overlay (25 observations) and snackbar
   overlay (34) request reference `absolute` versus candidate `fixed`. The
   candidate has an explicit positioning declaration in every observation, and
   both mapped elements are divs. The input discrepancy is already present
   before world-space projection. It does not prove that this difference causes
   the missing/clipped presentation: compare containing blocks, full ancestry,
   anchor dimensions and projection separately. Do not attribute it to the
   renderer as though the positioning requests were equal.
2. **Structural replacements:** the two grid tiles use reference `absolute`
   versus candidate `relative` (104 observations). The divider and slide-toggle
   label use reference `static` versus candidate `absolute` (92 observations).
   Establish whether the alternative structure is a public-API necessity or a
   compensation; test the reference's original layout request through core.
3. **Explicit relative positioning:** 608 observations cover choice labels,
   radio/slide-toggle hosts, sort, stepper, tabs, toolbar and tooltip. Review the
   positioned descendants, focus/hover paint and owner mapping. Different
   element types or similar screenshots do not establish equivalence.
4. **Omissions:** 2,087 observations require default/used-position and containing-
   block evidence. In particular, a missing `relative` request cannot be waived
   just because the current screenshot contains no visibly displaced child.

## Historical lead: sort focus paint

Current authored rules are in
`examples/material-showcase/src/app/astylar.component.ts`: toolbar at line 669,
sort header at line 708. Both request `relative` while the corresponding captured
reference hosts are `static`. The toolbar declaration is attributed by git blame
to initial showcase commit `2f440115`, so it is not evidence of a later parity
repair by itself.

For sort, inspecting the actual diff of `994da86b` (not just line blame) confirms
that the change added `position: 'relative'` to `.sort-header` together with an
absolutely positioned `.sort-focus-line` and focus-visible state authoring.
The previous `.sort-header` did not request `position`. This establishes an
authored host/paint-structure change, not its intent or necessity. The follow-up
must compare the original Material focus-paint request and the general renderer
primitive before deciding whether this layer should be removed. Do not simply
remove the host position while leaving its dependent absolute child in place.

Read-only history checks:

```text
git blame -L 669,669 -- examples/material-showcase/src/app/astylar.component.ts
git blame -L 708,708 -- examples/material-showcase/src/app/astylar.component.ts
git show 994da86b -- examples/material-showcase/src/app/astylar.component.ts
```

## Verification and limits

```text
node --max-old-space-size=1536 scripts/audit-material-position-population.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 --test-reporter=tap --test-reporter-destination=artifacts/material-parity/position-input-population-198a888.tap tests/material-parity/position-input-population.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The census is a complete triage of this property, not a completed classification.
All 58 groups remain explicitly unresolved pending their owning proofs. No
renderer cause, used-position equivalence, canonical attribution, fixture change
or raster acceptance is claimed. The tests replay the source census and reject
dropped/duplicated/reordered members, changed families/states/values, and turning
an omitted declaration into a claimed default.

Result: **6/6 tests passed**, no failures, cancellations or skips;
85,416.4514 ms. Complete TAP output is retained at the named reporter destination.
