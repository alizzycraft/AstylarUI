# Complete captured interactive line-box normalization census

This extends the single-case diagnosis in
`material-control-line-box-normalization-transition.md` to every measurement in
the pinned v3 interactive line-box report. It does not modify the production
reader, capture, canonical fixtures, or rendering code.

## Results

- 477 captured cases, 671 distinct measured owners.
- 623 checkpoint-property objects are unchanged.
- 48 differ only in their reference `color` normalization: 36 light-theme and
  12 dark-theme observations of `button-disabled`.
- Light: `rgba(29,27,32,0.38)` becomes
  `rgba(28.999875,26.99991,31.99995,0.38)`.
- Dark: `rgba(230,225,229,0.38)` becomes
  `rgba(230.000055,225.000015,228.999945,0.38)`.
- All other typography properties and candidate stages remain identical for
  every measurement. The original physical measurements are not edited.

The collector authenticates the original report and its indexed evidence,
checkpoint results, original paired trees, fresh reference trees, screenshots,
capture sources and measurement-source snapshots. It executes separately
authenticated historical and current normalization functions against the raw
reference styles, and rebuilds current targets through the production control
typography collector. Every original measurement is run through the production
measurement validator against its historical target. The 48 changed targets
are also required to fail live checkpoint equality; the 623 others must pass.

This proves a bounded normalization transition for the complete **captured
line-box population**, not complete Material parity or full reader acceptance.
It does not independently replace the reader's checks for action traces,
served assets, capture-run provenance, path containment or target completeness.
Those checks remain required before any canonical evidence can be restored.

Machine-readable evidence: `material-line-box-normalization-census.json`, with
generation SHA-256
`0e9ce6fa704e0716f4ccc683e7840d09a49d06ea69ab12a7e839ef4c5b3cf39b`.
Each observation retains exact case/owner identity, raw color, historical and
current values, complete-property digests, original measurement digest, source
receipt, and physical dimensions. No equivalence or renderer-cause claim is
made from this normalization evidence.

## Verification

```text
node --max-old-space-size=768 scripts/audit-material-line-box-normalization.mjs
node --max-old-space-size=768 --test --test-concurrency=1 tests/material-parity/line-box-normalization-census.spec.mjs tests/material-parity/control-line-box-normalization-transition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The focused suite verifies the regenerated census and rejects 12 diagnostic
join mutations spanning identities, both normalization contracts, candidate
stages and unrelated typography. The earlier single-case metric mutation also
continues to reject invalid height. Result: 7/7 passed, no skips or failures,
11,068.9543 ms total (complete census replay: 8,337.8865 ms).

Next: bind this bounded transition into a versioned evidence reconciliation
that retains both contracts, then run the full independent reader and verify
canonical old-to-new conservation. Do not restore observations by ignoring
color, rounding current values, or trusting this diagnostic join alone.
