# List/table containers replace inherited font scale with a constant

The [machine evidence](material-container-font-inputs.json) accounts for every
original list and table comparison: **104 observations**, 52 per family, selected
by scanning all **2,311 original cases**. No scalar-matching owner is dropped.

The HTML frame requests `font-size: calc(16px * var(--scale))`. Its container
section and the `mat-list`/`table` host have no captured local font-size, font
shorthand or reset request. Their computed sizes retain the frame scale:
16px in light/dark, 14.4px in contrast, and 18.4px in custom. The candidate page
requests the same scaled size, but `.material-list` and `.material-table` each
add an explicit `fontSize: '16px'`. That constant is retained at candidate
normal, effective and comparison stages.

| Family | Original owners | Different font-size scalars | Matching scalars, unequal authoring |
| --- | ---: | ---: | ---: |
| List | 52 | 26 | 26 |
| Table | 52 | 26 | 26 |

Classification: **application/plugin authoring defect**. The first demonstrated
divergence is an added container font-size request, not a coordinate conversion
or proven core inheritance failure. At scale 1, matching numbers conceal the
different inheritance dependency; the other captured scales expose it. This
does not establish equivalent container structure, descendant text, glyph raster,
or layout. The list's `mat-list`/`div` types remain explicitly different.

Current source locations are
`examples/material-showcase/src/app/astylar.component.ts:651` (table) and `:705`
(list), with the reference frame rule in
`examples/material-showcase/src/app/reference.component.ts:106`. The proof retains
original reference ancestry, inline tokens and matched rules, paired candidate
ancestry/stages, original scalar hashes and full input-tree digests.

## History: keep fixture changes separate from legitimate renderer work

Initial showcase commit `2f44011` already fixed the list at 16px, but fixed the
table at **14px**. Commit `f980edc6826f4cd140c7af18f8afe5963d2447da`, titled
`fix(renderer): honor Material table row sizing`, changed the table host to
**16px** while also changing table row sizing and text code. Its fixture diff
also changed cell font sizes/heights and removed several cell offsets. The
machine evidence pins the before/after sources and exact host declarations.

This is evidence of a mixed renderer/fixture change that retained a fixed host
size instead of the reference inheritance. It is not evidence that the entire
commit was a workaround, that every cell change was wrong, or that a particular
remaining renderer bug motivated the font change. An initial audit assertion
incorrectly assumed both initial constants were 16px; inspection of the actual
commits disproved it. The resulting proof records list 16px and table 14px→16px
separately rather than rewriting history to match current authoring.

Future implementation should restore the reference inheritance dependency,
then test renderer inheritance/layout with equivalent inputs at all profiles.
Do not simply revert the renderer commit, replace the constants with sampled
per-profile values, or count an unchanged scale-1 screenshot as proof of parity.

## Verification

```powershell
node scripts/audit-material-container-font-inputs.mjs
node scripts/audit-material-container-font-inputs.mjs --check
node --test --test-concurrency=1 tests/material-parity/container-font-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and no-write replay pass. Machine report SHA-256:
`9ddaff1f1585e1abde771cca7e62447e7cb015c8189c89e07fbfc6fa39e08613`.
The two proof tests plus four inventory tests pass **6/6**, exit **0**, with no
skips/cancellations/todos, **3,416.5279 ms** total. Eighteen rejection controls
run independently for each family (**36 executions**), covering inline/reset
requests, frame scale/rules, computed and local stages, candidate declarations,
owner/ancestry identity and changed comparison inputs. Inputs remain unchanged.

Discovery now includes **119 files** (111 Material, four general, four TTS; all
43 legacy files), with this test explicitly required. No canonical attribution,
fixture or renderer was changed. These are source-bound authoring findings;
canonical integration and full current harness/rendering acceptance remain open.
