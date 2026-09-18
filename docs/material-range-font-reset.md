# Range controls omit part of the reference font reset

The original reference stylesheet requests `button, input, select { font: inherit; }`.
Each captured range input has an active matching expanded `font-size: inherit`
declaration. Its full reference ancestor chain retains the frame-scaled size.
The candidate translates this reset to a literal **font family only**; it does
not supply the corresponding inherited font-size request.

The [machine evidence](material-range-font-reset.json) scans all 2,311 original
cases and reviews both inputs in all 78 slider cases: **156 observations**.
Of these, **76** retain candidate 16px against reference 14.4px or 18.4px;
**80** have matching 16px scalars but the same missing inheritance request.
The latter are not declared input-equivalent merely because the numbers match.

Classification: **application/plugin authoring defect**, specifically an
incomplete translation of the shared control font reset. The first demonstrated
input divergence is before core rendering. This is distinct from the
[plain-text diagnostic-stage explanation](material-leaf-font-stages.md): these
range controls have a concrete local 16px value, not an omitted font-size scalar
with a separately matching retained text style.

## Exact evidence and history

- `examples/material-showcase/src/styles.scss:22` authors the reference shorthand.
- `examples/material-showcase/src/app/astylar.component.ts:472` says the candidate
  rule mirrors that reset, but line 476 supplies only
  `fontFamily: 'Roboto, Arial, sans-serif'`.
- Commit `af04845d01e8e65ee2e88a67e41dac9ede4c7f3e` introduces this rule and comment.
  The machine receipt authenticates its complete before/after source snapshots
  and confirms that the family-only rule was absent from the parent.
- `examples/material-showcase/src/app/astylar.component.spec.ts:31` tests the
  family property, not complete font shorthand equivalence. That assertion is
  not evidence that size, weight, style or line-height inheritance is restored.
- `src/app/config/browser-defaults.ts:294` supplies input defaults including 16px;
  `src/app/services/dom/style-defaults.service.ts` merges element defaults. This
  is source context consistent with the captured local value, not a claim that
  the control default is browser-correct or that a fresh runtime trace was made.

Every observation preserves its original scalar digest and both authenticated
input-tree descriptors. The proof checks exact input identity, type, class,
reference/input ancestry, active reference inheritance requests, candidate page
scale and all three candidate local style stages. It retains and excludes every
candidate font-size/reset declaration. Unknown potentially applicable selectors
prevent attribution; the only separately handled captured descendant selectors
are `.material-table th` and `.material-table td`, whose terminal types cannot
match an input. No new cascade or inheritance engine computes a replacement
candidate value.

The controls have no retained own-text or current control-texture entry in these
captures. The proof rejects unexpected entries rather than turning an invisible
range control's font scalar into a visible-label or raster claim. It does not
explain the swapped thumbs, black ring, range value mapping or premature release.

## Verification

```powershell
node scripts/audit-material-range-font-reset.mjs
node scripts/audit-material-range-font-reset.mjs --check
node --test tests/material-parity/range-font-reset.spec.mjs
```

Generation and full original-source no-write replay succeed. The focused suite
passes **2/2**, exit **0**, no skips/cancellations/todos, **2,820.1475 ms**.
Twenty-three rejection controls run independently for both input owners
(**46 executions**). They reject inactive/changed reference inheritance,
competing candidate state/universal/attribute/reset rules, false table-cell
exclusions, inline requests, owner/type changes, altered stages, fabricated
retained text and changed scalar values. Original objects are not mutated.

Report SHA-256:
`e2e141eed4c95eae9ab95c37fff6340a9c2104eb3946636dc70ea5283c63a927`.
The source report remains
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

## Required follow-up and limits

Restore the semantic intent of the original reset through the shared authored
style path. First prove the public API/core handles the equivalent inherited
declarations; if shorthand or inherited-value support is missing, expose and
fix that general support gap instead of writing theme-specific pixel sizes.
Keep component-specific overrides and other unequal inputs separate.

This is a standalone finding; canonical promotion still requires exact row
membership and unrelated-row conservation. No renderer or comparison input is
changed, and the 2,160 canonical unresolved signatures are not reduced here.

The test is automatically discovered by the unfiltered harness, bringing the
next inventory to **121 files**. The live run started at `9933ac1` captured 120
files before this addition; its selected source files have not changed. That
run cannot be described as covering this newly added test or as final acceptance
of the later 121-file worktree. This focused result is recorded separately.
