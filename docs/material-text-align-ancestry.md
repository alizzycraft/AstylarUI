# Text alignment: original owner and ancestry evidence

This read-only survey scans all **2,311 original comparison cases** and retains
all **101 scalar-difference groups / 5,978 observations** for `textAlign`.
It also counts 960 equal scalar observations and preserves eight one-sided
tooltip observations. These are original-population totals, including earlier
reviews, **not 101 new canonical findings**.

The [machine report](material-text-align-ancestry.json) binds the original capture,
both original input trees, all 89 reference scalar values, all three candidate
local style stages and the existing generated-owner identity proofs. Every
observation records its complete case/owner membership, input digest and one of
755 deduplicated ancestry patterns. No canonical classification, renderer,
plugin, fixture, normalizer or reference truth is changed.

## Why the ancestry matters

Unlike vertical alignment, text alignment inherits. An omitted candidate local
declaration cannot safely be substituted with an initial value, even when the
browser reports `start`. The evidence is partitioned as follows:

| Candidate observation | Groups | Observations |
| --- | ---: | ---: |
| Local omission, no captured candidate ancestor alignment/reset/direction request | 93 | 5,605 |
| Explicit local value versus browser computed value | 5 | 246 |
| Local omission with a captured ancestor request | 1 | 68 |
| Existing generated-owner scalar-rule capture gap | 2 | 59 |

The first row says nothing about absence of **reference** requests. For example,
the tooltip remains in this row: its reference surface explicitly requests
`text-align: center`, its candidate path omits it, and its retained core text
records `left`. That is consistent with the existing tooltip authoring finding;
the new census neither fixes nor explains its displacement or blur.

The 68 ancestor-request observations belong to `expansion-title`. Its parent
`expansion-primary` requests `left`; the child omits a local declaration.
The census preserves that request and the child's retained text separately.
It does not synthesize a candidate computed value or claim correct inheritance.

The five explicit-value groups are `sort-primary`, `stepper-content`,
`expansion-primary`, `bottom-sheet-dismiss` and `bottom-sheet-copy`.
All contrast reference `start` with candidate `left`. Their physical equivalence
requires direction, formatting-context and used-value proof; their different
serialization alone does not establish a rendering defect. Reference computed
direction and candidate direction/reset requests are retained rather than
normalizing `start` into `left`.

## Boundaries retained

- Candidate possible-rule matching is deliberately conservative. Unknown
  selectors, media limits, inline attributes, resets and motion declarations
  remain visible; no competing cascade evaluator assigns winners.
- Original reference paths end at their captured surface/overlay root.
  Document-external ancestry and motion activity are not inferred.
- Retained text, painted-control presence and private element ownership are
  distinct from a final pixel/used-value measurement.
- The 25 bottom-sheet and 34 snackbar wrapper observations with the known
  layered-rule capture gap remain unresolved. Alias identity does not erase it.
- The eight one-sided tooltip captures remain missing-counterpart observations,
  not fabricated reference styles.

Next, join this population to exact still-unresolved canonical membership,
preserve earlier classifications, and review inherited/used values or explicit
authoring differences at their owning boundary. No blanket initial-value
attribution is justified by this census.

## Verification

```powershell
node scripts/audit-material-text-align-ancestry.mjs
node scripts/audit-material-text-align-ancestry.mjs --check
node --test --test-concurrency=1 tests/material-parity/text-align-ancestry.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. The focused source-replay and inventory run passes **8/8**,
exit 0, no failures/skips/cancellations/TODOs, in **36,946.388ms**. It rederives
the entire saved report without writing, enumerates every original differing
owner independently, rejects seven identity/provenance/ancestry mutations and
retains a changed ancestor request and an unknown conditional selector without
inventing computed values. Original source objects remain unchanged.

Report SHA-256:
`58c80629c140b855f4848672d8d16114b2090be2549cfd305e8a4c1a650a8495`.
Logs are `text-align-ancestry-generation.log` and
`text-align-ancestry-verification.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.
The standalone `--check` command is available; the result above is the complete
in-process no-write replay in the test, not a claim it was separately executed.

Automatic harness discovery now includes this suite (165 files total).
The complete current harness and enforced parity matrix remain outstanding.
