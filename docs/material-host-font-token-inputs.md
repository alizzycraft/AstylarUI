# Component hosts omit Material font tokens

The [captured input proof](material-host-font-token-inputs.json) covers every
original toolbar, paginator and stepper case: **172 owners / 380 property
observations**, selected by scanning all 2,311 original cases. This includes
light, dark, contrast and custom profiles and their captured static and
interactive states, not just the desktop initial screenshot.

| Host | Cases | Missing candidate host inputs | Captured reference values |
| --- | ---: | --- | --- |
| Toolbar | 52 | Font family, weight, tracking | Roboto, 400, normal |
| Paginator | 52 | Font family, weight, tracking | Roboto, 400, 0.4px |
| Stepper | 68 | Font family | Roboto |

Classification: **application/plugin authoring defect**. The first demonstrated
divergence is the omitted component-level request, before layout or projection.
The reference hosts explicitly request Material component tokens with system
token fallbacks. The candidate hosts omit the corresponding properties in
their authored rules and all three captured local style stages. Their page
instead supplies `Roboto, Arial, sans-serif`; it supplies no local weight or
tracking request. Matching currently loaded glyphs or a coincidental 400 weight
would not establish equivalent token dependencies or inheritance scope.

This is not a claim that the candidate computes a particular inherited value,
that the renderer ignores these properties, or that the omission causes an
observed visual mismatch. The proof keeps computed candidate values, token
definition origins, descendant consumers and final raster explicitly unverified.
The stepper's weight/tracking are not included merely because its family differs.

## Evidence and history

Each property observation retains the original input hash, paired tree hashes,
exact ancestor keys, matched reference declarations and computed values,
candidate ancestor declarations/stages, and relevant candidate rule inventory.
Identity guards reuse the existing size/scope proofs, but each new property is
independently inspected; a font-size conclusion is not reused as evidence for
font family, weight or tracking.

Current source locations are
`examples/material-showcase/src/app/astylar.component.ts:669` (toolbar host),
`:712` (paginator host), and `:740` / `:743` (stepper host).
The selected properties are absent both in initial showcase commit `2f44011`
and current host authoring. The machine report retains exact source hashes and
line excerpts. This establishes an original authoring omission still present
today, not that every intervening commit is identical or that developer intent
can be inferred from the history.

The existing [font-scope audit](material-font-scope-inputs.md) separately shows
the toolbar-title and paginator-container descendant substitutions. Their
current family/weight declarations do not restore the host's inheritance scope;
the paginator descendant's literal tracking likewise does not restore the
component token. Historical measured widths and offsets remain independent
findings, not proof that these particular omissions were introduced as fixes.

## Recommended implementation boundary

Restore the component typography requests at their corresponding host scope,
preserving token/fallback behavior rather than hard-coding the sampled values.
Then test core inheritance and typography with genuinely equivalent inputs,
including token and ancestor changes. Remove descendant compensations only
where their role is demonstrated and covered by regression tests. No renderer
or fixture behavior is changed by this audit increment.

## Verification

```text
node scripts/audit-material-host-font-token-inputs.mjs
node scripts/audit-material-host-font-token-inputs.mjs --check
node --test tests/material-parity/host-font-token-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and no-write replay exit **0**. The focused/inventory suite passes
**6/6**, zero skips/cancellations/TODOs, in **6,294.6377ms**, with **436** rejection
executions across all four profiles. These reject altered tokens, scalar/full
tree discrepancies, resets, unknown selectors, wrong ancestry/ownership,
untrusted inspection stages, added local requests, and fabricated measurements.
Report SHA-256: `3a24197631cfc3f44c8f917921f3f10631496941e617696ee1a94436e1660755`.
Log: `artifacts/material-parity/field-host-flow-input-audit/host-font-token-inputs-focused.log`.

Discovery now contains 130 files: 122 Material, four general and four TTS.
These findings are not yet joined into canonical classification; the current
canonical unresolved count remains 2,160. The original 120-file full harness
and subsequent current full/enforced runs remain distinct acceptance evidence.
