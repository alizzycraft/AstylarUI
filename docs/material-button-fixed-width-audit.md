# Shared Material button width authoring

[Machine evidence](material-button-fixed-width-audit.json) retains all **600**
original shared-button owners in **480** cases, seven families and nine owner
groups. Complete candidate class selection is checked against all **2,311**
original cases. This is an authoring audit, not a candidate used-width or
intrinsic-layout diagnosis.

## First divergence

Every reviewed reference button has **no authored width request** in its active
matched rules or inline style. Each candidate has an explicit pixel width from
the shared rule and, for eight owners, an ID-specific override. The browser's
computed width is an observed result, not the reference's authored input.

| Owner | Browser computed width | Candidate authored width | Observations |
| --- | ---: | ---: | ---: |
| core-primary | 212.234px | 212.234375px | 52 |
| button-primary | 140.781px | 141px | 60 |
| button-secondary | 117.25px | 117px | 60 |
| button-disabled | 103.062px | 103px | 60 |
| menu-primary | 120.438px | 120px | 94 |
| bottom-sheet-primary | 169.156px | 169px | 63 |
| dialog-primary | 123.797px | 124px | 78 |
| snack-bar-primary | 144.844px | 145px | 71 |
| tooltip-primary | 137.938px | 138px | 62 |

The core value normalizes to the same three-decimal scalar as the browser
measurement in the current audit, so it does not produce a scalar discrepancy
row. Its **52 authoring differences are still retained here**. This is why the
input audit cannot be limited to nonmatching computed-value rows. Close or
matching dimensions do not turn an omitted width request into a fixed width.

Classification: **application/plugin authoring defect**, owned by shared and
ID-specific showcase button width authoring. Exact tree identity, all 89
reference scalar values, matching label/value text and all three candidate
local style stages are joined before checking width declarations. The proof
rejects competing width/inline-size/all requests, including state and unknown
selectors, and preserves the complete applicable candidate rule declarations.
Native-value versus label-span composition remains unproven, not equivalent.

## History

Current width expressions are at
`examples/material-showcase/src/app/astylar.component.ts:487–490` and
`:522,529–532`. AST inspection proves the nine selector/width expressions match
the initial showcase at `2f440115740ff76fa9e55b3f4a11568207b2af5a` exactly,
including the conditional secondary/disabled expressions. It does not claim
that every other property in those rules is unchanged, that no intermediate
edit occurred, or that the original constants were obtained by measurement.
These fixed requests already existed at the initial endpoint; they cannot be
attributed solely to a subsequent parity fix.

## Implementation boundary and remaining uncertainty

When fixes are authorized, restore content-dependent width authoring together
with the original flex/label composition, minimum-width and padding constraints
in a separate paired public-API reproduction. Exercise short and long text,
narrow containers, font changes, density and inline siblings before editing
canonical comparisons. Trace any remaining divergence through core intrinsic
measurement, flex sizing, minimum-size clamping and control text ownership.
Do not replace these constants with more accurate measured widths or offsets.

The scalar differences above are not proof of the candidate's used-width error,
nor proof that a specific core subsystem caused the original screenshots.
The separately observed missing boxSizing values also need their own analysis:
the current dimension service treats omitted boxSizing as border-box on its
declared-dimension path
(`src/app/services/dom/elements/element-dimension.service.ts:312–323`). That source
fallback alone does not prove the complete native-button path or justify
inventing a captured computed value. This survey does not classify box sizing.

## Verification

```powershell
node scripts/audit-material-button-fixed-widths.mjs
node --test tests/material-parity/button-fixed-width-evidence.spec.mjs
node scripts/audit-material-button-fixed-widths.mjs --check
```

Generation and no-write replay exit **0**. Tests: **2/2 pass**, zero failures,
skips or cancellations, **4,885.7267 ms**. Thirteen negative controls reject
changed identity, fabricated reference authoring, altered computed/stage values,
source loss, competing candidate requests, inline substitutions, changed text
and modified core width. An unrelated selector remains a positive control.
All original tree digests, owner/case coverage, grouped observations and source
fingerprints are independently replayed. No renderer, canonical comparison,
canonical classifier or frozen regeneration dependency changed.

Main-report integration is pending. It must retain all nine authored-input
groups, including the core group absent from the scalar-difference list, rather
than changing normalization or manufacturing a numerical discrepancy.
