# Empty transition longhands are not absent authored input

The [browser proof](../scripts/verify-material-motion-cssom-capture.mjs) identifies
a concrete capture-stage limitation, not a renderer bug. The maintained
`captureBrowserInputTree` function is exercised unchanged in Chrome
**152.0.7977.76**. [Machine evidence](material-motion-cssom-capture-proof.json)
includes six isolated browser cases and all **32** original dialog-panel cases
underlying the two remaining motion-review groups / **64** observations.

## Original evidence

In every one of those 32 cases, the mapped dialog surface's original rule has
five empty enumerated transition longhands, but its captured `cssText` retains:

```css
transition: transform var(--mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1);
```

The scalar `referenceAuthored` entry contains the same longhand declarations but
does not retain `cssText`. The paired full tree does retain it. The verifier
replays existing component-owner/scalar proofs, checks each original tree hash,
and reproduces both complete group proof hashes before making this observation.
It does not select the first similar-looking dialog label.

The capture code's boundary is explicit:

- `tests/material-parity/input-tree-evidence.mjs:14` enumerates declarations using
  `CSSStyleDeclaration`; line 21 additionally retains the rule's `cssText`.
- `tests/material-parity/run-material-parity.mjs:1423` uses the same declaration
  enumeration for scalar authored rules; that scalar projection omits `cssText`.

## Browser controls

| Input | Enumerated transition longhands | Browser-computed transition property |
| --- | --- | --- |
| Literal `transform 200ms ease` | Nonempty | `transform` |
| `transform var(--duration, 0ms) ease`, no variable | Empty | `transform` |
| Same shorthand, variable `240ms` | Empty | `transform` |
| `gap var(--duration, 0ms) ease` | Empty | `gap` |
| Transform shorthand, variable `0ms, gap 10s` | Empty | `transform, gap` |
| Previous case plus later `transition: none !important` | Original rule remains empty | `none` |

The two variable-transform controls demonstrate that a duration fallback and a
real variable value have identical empty authored longhands but different
computed durations. The additional-target control proves that a variable named
"duration" does not constrain substitution to a duration token: reading just the
leading `transform` word is insufficient to exclude a gap transition. The final
case confirms that declarations and the resolved cascade are different stages.

This does **not** assert that the original dialog variable contains an extra gap
transition. Its original computed motion/variable values have not been recovered
by this proof. The two original groups remain review cases; the browser controls
explain why guessing from their empty values would be unsound.

## Ownership and follow-up

This limitation belongs to audit capture/interpretation. Preserve complete rule
text and distinguish pending shorthand substitution from omission. Use the
browser's computed motion and custom-property context when establishing the
actual targets; do not replace this with an independent partial CSS parser or
silently fill the original scalar snapshots. If instrumentation is expanded,
test it separately and bind any fresh evidence to the original source/state.
No core, plugin or canonical fixture change follows from this finding alone.

## Verification

```powershell
node scripts/verify-material-motion-cssom-capture.mjs
node scripts/verify-material-motion-cssom-capture.mjs --check
```

Both commands exit **0**. Each launches a fresh browser, verifies all six cases
and computed durations, closes the browser in `finally`, and checks all 32
original dialog captures. No-write replay exactly matches the saved machine
receipt. This proof was added after the full 91-file harness began at `52ec632`;
its results are separate, not added to that run's totals. Renderer behavior,
canonical classifications and comparison inputs remain unchanged.
