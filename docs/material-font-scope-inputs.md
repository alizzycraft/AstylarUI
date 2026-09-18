# Toolbar and paginator font declaration scope

## Finding

All **104 original observations** (52 toolbar and 52 paginator) contain a
component-level typography input difference. Material declares the component
font size on its outer host; the AstylarUI example leaves that host without a
font-size declaration and places the numerical size on a descendant instead.

| Owner | Reference input | AstylarUI input |
| --- | --- | --- |
| `toolbar-primary` | `mat-toolbar` requests `--mat-toolbar-title-text-size`, falling back to `--mat-sys-title-large-size`; computed size is 22px | `.toolbar` has no local size; its direct `.toolbar-title` child requests 22px |
| `paginator-primary` | `mat-paginator` requests `--mat-paginator-container-text-size`, falling back to `--mat-sys-body-small-size`; computed size is 12px | `.paginator` has no local size; its direct `.paginator-container` child requests 12px |

The selected reference descendants inherit those sizes without their own
font-size requests. Both reference component hosts are inside a section whose
font size follows the frame's 16px, 14.4px, or 18.4px request. Candidate host and
section inspection omit local sizes at all three captured stages, while the
candidate page requests the correctly scaled size. This differs from the
[non-own-text container measurement-stage proof](material-container-font-stages.md):
here the browser **does have an intervening component font-size declaration**,
and the candidate does not.

Classification: **application/plugin authoring defect**, specifically a
component font-size declaration moved to a descendant. This records unequal
inheritance scope, not a demonstrated visible consequence. Matching descendant
size scalars do not establish equivalent component inputs. The evidence does
not synthesize a candidate computed host size or prove a core inheritance bug.

## Scope and provenance

[Machine-readable evidence](material-font-scope-inputs.json) replays all 2,311
original capture entries and independently authenticates each selected full
input tree against its descriptor. It selects all 104 toolbar/paginator cases,
not a screenshot sample. These cover the captured light, dark, contrast and
custom profiles; desktop, tablet, mobile and desktop DPR profiles; and static,
focus, hover, held, activate and activate-leave states. These lists describe the
captured coverage, not a claim that every Cartesian combination exists.

Original capture:
`artifacts/material-parity/current-ancestry-audit/latest-report.json`, SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

Proof SHA-256:
`3acba3346e7e48ffffe6428e6604686896a4d9b76452881c00fa13768001a684`.

Each finding includes component/state/viewport identity, the original scalar
input digest, tree paths/digests, reference font request and computed ancestor
sizes, all three candidate local-style stages, candidate font-rule inventory,
and the descendant declaration and inherited reference path. Unknown possible
font selectors, resets, inline requests, nested rules, or changed ownership
are rejected rather than assumed harmless.

Current source locations in
`examples/material-showcase/src/app/astylar.component.ts`:

- Lines 669–673: toolbar host rules and the title's local 22px declaration.
- Lines 712–714: paginator host rules and the inner container's local 12px declaration.
- Line 840: toolbar host/title/action structure.
- Lines 883–886: paginator host and inner-container structure.

## Historical changes

The evidence records exact before/after source digests, line-numbered excerpts,
and these commits:

- `2f440115740ff76fa9e55b3f4a11568207b2af5a`: initial showcase. The toolbar
  already puts 20px on the title rather than the host. The paginator originally
  puts 12px on its host. The proof checks that this file did not exist in the
  parent revision instead of inventing a before-state.
- `92067a19c860881eb744326726f95a3031144b58`: toolbar title changes are recorded
  separately from the existing measured-width and button line-height findings.
- `7843582df4d46d1a3aaf99a84add49232623305f`: paginator conversion removes the
  then-current host 13px declaration and adds 12px on the new inner flex
  container and text leaves. It replaces earlier absolute positioning in the
  same change. The commit also modifies core flex behavior; this report does
  not label the entire mixed commit a workaround or infer developer intent.

The first demonstrated divergence is **comparison authoring scope**, before
renderer layout or Babylon projection. Whether a renderer limitation motivated
the scope substitution, and whether it changes current component geometry,
remain unproven. Existing general font-relative box failures are independent
evidence, not proof that this authoring change was caused by that core defect.

## Implementation recommendation — not implemented

Preserve Material's component-level typography declaration and inheritance
scope in the translated inputs before using these examples to evaluate core
typography. Resolve the captured tokens faithfully, retaining profile/state
behavior. Do not merely add another descendant override.

In a separate diagnostic equivalent-input fixture, verify container computed
size, descendant inheritance, font-relative dimensions, and visible text using
the same component-level request on both sides. If that fails, trace its first
core divergence and fix that shared owner. Do not remove descendant declarations
indiscriminately: keep genuine Material descendant overrides, such as toolbar
action typography, and review each redundant replacement independently.

Required regression coverage includes font scale/profile variation, an
inheriting descendant and a font-relative box, genuine overridden descendants,
and relevant interaction states. No matching glyph-size scalar may clear the
outer host's input discrepancy by itself.

## Verification and limits

Executed in this worktree:

```text
node scripts/audit-material-font-scope-inputs.mjs
node scripts/audit-material-font-scope-inputs.mjs --check
node --test tests/material-parity/font-scope-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and independent no-write replay pass. Focused/inventory verification
passes **6/6**, exit **0**, total **3,110.302ms**, with no skips, cancellations or
TODOs. Twenty-eight independent negative controls run against each family
(**56 rejection executions**) covering request scope, token changes, ancestry,
all local-style stages, provenance and scalar tampering. The test also verifies
full-harness discovery of the new suite.

An initial generation attempt failed because it tried to read this newly added
showcase file in its introduction commit's parent. The corrected history
collector verifies absence with `git ls-tree`; it does not ignore a failed
source read. No partial report from that attempt was accepted.

No renderer or canonical comparison was modified. No canonical classification
was promoted; the canonical audit still has **2,160 unresolved groups**. This
proof is not raster verification, whole-element equivalence, or current full
harness acceptance. The full harness launched earlier still uses its original
120-file selection; current discovery has 124 files. Its selected sources and
tests were not changed by this increment.
