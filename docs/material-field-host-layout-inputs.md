# Shared field hosts: original layout inputs are not equivalent

This standalone audit reopens the original capture and its paired, hash-checked
input trees for all **577** cases across form-field, input, autocomplete, select,
datepicker and timepicker. It binds **4,616** property observations into **72**
family/property/value groups. No canonical classification, renderer, plugin or
comparison authoring is changed.

## Earliest demonstrated divergence

The divergence is already present in the authored host layout. The reference's
generated `.mat-mdc-form-field` styles request an inline-flex column with
`min-width: 0`. The candidate `.field-shell` omits those requests and instead
authors a relative, fixed-height border-box with `align-self: flex-start`.
Its three captured local style stages all report block/row formatting.

| Property | Reference request / captured value | Candidate request / local value |
| --- | --- | --- |
| display | `inline-flex` / `inline-flex` | omitted / `block` |
| flex-direction | `column` / `column` | omitted / `row` |
| min-width | `0px` / `0px` | omitted / omitted |
| position | omitted / `static` | `relative` / `relative` |
| box-sizing | omitted / `content-box` | `border-box` / `border-box` |
| align-self | omitted / `auto` | `flex-start` / `flex-start` |
| height | omitted / 76, 56 or 68 px | fixed 78, 62 or 70 px |
| width | `100%` / 720, 638 or 260 px | `100%` / `100%` |

The **54 groups** for the first seven properties are classified in this
standalone receipt as application/plugin authoring defects: the comparison is
not exercising equivalent layout requests. That does not prove why the inputs
were originally chosen or demonstrate a defect in the renderer's handling of
the reference requests.

The remaining **18 width groups** are an observation-stage mismatch. Both sides
author `100%`; the scalar comparison puts the browser's computed pixels beside
the candidate's unresolved percentage. This is not proof of different width
authoring, nor permission to normalize them into equal inputs. Their containing
blocks and layout contexts remain independently unequal.

## Matching boxes conceal the input discrepancy

All **72 static** cases have equal measured host width and height on both sides.
The candidate's measured height is nevertheless 2 px below its authored request
for light/dark/custom profiles and 6 px below it for contrast. The **505
interaction** cases do not contain a host geometry measurement; the report
retains each gap rather than borrowing static geometry.

The reference host contains two in-flow, relatively positioned wrappers: a
text-field wrapper and a subscript wrapper. In every reviewed case, all direct
candidate host children are absolutely positioned. The record retains their
identities, classes, positions and height declarations, along with each side's
parent context and source-tree hashes.

The candidate parent is a fixed-height flex column, whereas the reference
section uses normal block layout and content-driven height. Its available
interior heights are consistent with the measured 76/56/68 px, and the candidate
host reports `flex-shrink: 1`. Flex shrink is a plausible explanation for the
smaller measured height, **not yet a demonstrated causal diagnosis**. Matching
boxes cannot validate this substituted parent/child formatting system.

Follow-up: the [12-case public shrink probe](material-field-host-shrink-public-proof.md)
now demonstrates this sufficient mechanism with identical paired inputs and
two interventions: disabling shrink and adding parent room. It does not supply
a complete original-case causal trace or establish Material input equivalence.
The frozen standalone survey's limits are retained rather than retroactively
claiming that its original scalar observations proved the mechanism.

## Source and historical origin

- `examples/material-showcase/src/app/astylar.component.ts:540`: shared host rule.
- Same source, line 480: fixed-height flex-column section authoring.
- Same source, line 1362: `materialReferenceHeight` and the following density
  tables provide section heights of 134, 114 and 126 px for these six families.
- Same source, lines 913, 941 and 1027: three field composition branches.
- `examples/material-showcase/src/app/reference.component.ts`: original Material
  templates; captured generated rules are linked per case in the JSON receipt.
- [Followed history](material-field-host-layout-history.md): all ten selected
  host-rule expressions are unchanged through 102 revisions, from `2f440115`
  through `9f713c09`. This is evidence of an original authoring divergence, not
  proof that a later attempted fix introduced it. The working source hash is
  checked against that receipt on generation.

## Ownership and next implementation investigation

1. Preserve the generated Material host and child layout semantics in a
   separate minimal public-API diagnostic, including the two in-flow wrappers,
   automatic height and identical typography/content. Do not rewrite the
   canonical comparison to conceal the current failures.
2. Exercise content changes, multi-line hints/errors, density and viewport
   changes. Follow authored requests through defaults/cascade, intrinsic and
   flex sizing, child flow and final CSS-space geometry to locate any renderer
   divergence. Static matching rectangles do not answer this.
3. Separately reproduce the current candidate parent/host inputs identically in
   HTML and AstylarUI. Vary the parent height and host `flex-shrink` in both
   diagnostic sides to test the shrink hypothesis. Do not use that reproduction
   to endorse the candidate inputs as equivalent to Material.
4. Correct confirmed general defects at their owning core boundary in the later
   implementation phase; then remove the fixed-height/absolute composition
   compensation and restore the reference layout requests together. A plugin
   must not recreate a second layout engine to achieve these boxes.
5. Integrate only source-bound findings into the canonical classifier, retaining
   the original property values, complete 577-case coverage, geometry gaps and
   false equivalence flags. Root-parent differences, descendant typography,
   clipping, overlay placement, hit testing and paint remain separate findings.

## Verification

```powershell
node scripts/audit-material-field-host-layout-inputs.mjs
node --test tests/material-parity/field-host-layout-input-evidence.spec.mjs
node scripts/audit-material-field-host-layout-inputs.mjs --check
```

The first test run exposed a report serialization defect: child height omission
was represented by JavaScript `undefined`, which disappeared in saved JSON.
The receipt now records `<omitted>` explicitly. The corrected run (session
41386) passed **2/2** tests, zero failures/skips/cancellations/todos,
**10,238.1347 ms**, and generation plus no-write replay succeeded. The final run
after adding the source-history binding check (session **14413**) also exits
**0**: generation succeeds, **2/2** tests pass with zero failures/skips/
cancellations/todos in **9,652.8119 ms**, and no-write replay succeeds.

The tests replay the entire report from original evidence; assert all static
matching dimensions without declaring input equivalence; and reject 20 mutated
declaration, identity and style-stage cases, duplicate/missing case coverage,
missing static geometry and incomplete measured boxes. No unsupported default
is synthesized and no observation-stage difference is silently normalized.

This focused evidence does not substitute for the current complete harness or
the final enforced parity matrix. The canonical audit still has **2,486**
unresolved groups. This receipt is not yet integrated into that count.
