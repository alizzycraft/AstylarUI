# Border classifications after the color-precision correction

## Result

All **40 previously reviewed changed-value border groups / 368 observations**
retain their classifications when the owning source proofs are rebuilt with
precise color values. These observations span **84 captured cases**.

| Existing finding | Groups | Observations | Disposition |
| --- | ---: | ---: | --- |
| Omitted border-color resolves to transparent in core versus CSS currentColor | 32 | 128 | Existing documented-limitation classification retained |
| Material button border reset translated as width only | 8 | 240 | Existing application/plugin-authoring-defect classification retained |

The reference values really changed; for example,
`rgba(29,27,32,0.38)` becomes
`rgba(28.999875,26.99991,31.99995,0.38)` under the exact captured decimal
serialization. The candidate border value remains transparent. Both the
reference text color and all four border colors agree under the precise
normalizer, so the declaration-based source attribution remains supported.
This is not a tolerance or a return to rounded comparison values.

The machine report is `docs/material-border-normalization-transition.json`.
Every observation records its input hash, original tree receipts, old and
current source proofs, classification metadata, and proof hashes. Every group
retains the complete historical canonical-row hash and all case identities.

## Evidence boundary

The collector authenticates the complete original capture and independently
replays the scalar transition. It streams and authenticates every byte of the
frozen canonical payload at `4650791a7208b841dd29f1ced015f98234949623`, retaining
all 8,339 complete discrepancy rows for the exact old-value join. It then
rebuilds the inventory from the original trees for every affected case and
requires no tree, style-stage, or reference-context gaps.

The border classifier module must be byte-identical to that historical revision
after line-ending normalization. `collectFullTreeInventory`,
`collectReferenceContextGaps`, and `caseKey` must also retain their exact function
source. Historical and current normalizers are authenticated and executed
separately. No classifier is changed to obtain these retained results.

Old classifications must replay against the exact historical values and row
metadata. The current classifier receives current values and freshly rebuilt
current proofs. If it rejects an observation, the report records
`current-classification-not-proven`; it cannot silently inherit the old result.

This establishes source-attribution continuity, not rendering parity, full
builder integration, CSS currentColor support, final border pixels, or approval
of the unequal comparison inputs. Historical receipts and the canonical audit
payload are not rewritten. No renderer, plugin, or canonical example changes
are part of this increment.

## Verification

```powershell
node --max-old-space-size=1536 scripts/audit-material-border-normalization-transition.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/border-normalization-transition.spec.mjs tests/material-parity/color-normalization-precision.spec.mjs
```

The initial complete replay returned 40 groups / 368 retained observations.
Its focused run passed **7/7**, exit 0, in **73,759.7789 ms**, with no failures,
skips, cancellations, or TODOs. Log:
`artifacts/material-parity/field-host-flow-input-audit/border-normalization-tests-sep20.log`.

The final run adds the inventory-function provenance guard and
`tests/parity/material-audit-harness-inventory.spec.mjs` to that command:
**12/12 passed**, exit 0, in **75,917.4063 ms**, with no failures, skips,
cancellations, or TODOs. It covers all 368 current-value calls, altered source
mapping, 20 altered-input/normalizer rejection checks, and four explicit
lost-current-proof checks. Log:
`artifacts/material-parity/field-host-flow-input-audit/border-normalization-final-tests-sep20.log`.

The final report SHA-256 is
`40f272eda14b27b6c081633348d5320b7492cc542b996ec57808fcfc595bd3de`.
Generation log:
`artifacts/material-parity/field-host-flow-input-audit/border-normalization-source-bound-sep20.log`.
The scoped staged diff passes `git diff --cached --check`. The whole-worktree
check still flags the two intentionally preserved mixed-line-ending files;
their raw hashes are unchanged and they are not included in this commit.

## Remaining color work

The earlier caret transition separately revalidated the ten changed-value caret
groups. This border result accounts for the remaining 40 previously classified
groups in the 66-group changed-value census. **The 16 previously unresolved
groups / 152 observations remain unresolved by this increment.** They concern
disabled button text/background and disabled checkbox, radio, and expansion
text colors. Existing alpha/source reviews may cover part of that population,
but need exact current-value membership checks before integration.

The 144 newly exposed root-background groups already have source-authoring
evidence but still require canonical integration. Do not infer that the complete
color audit is accepted from these focused results. Full classification,
canonical regeneration, and the complete enforced parity matrix remain required.

The push of preceding commit `93e0cba` failed with HTTP 408. A fresh remote query
still returned `d9b374fb6cd744d9e792f4ed30b00f2415ff7f52` for
`codex/material-audit-alignment-integration`; pending local commits are not
claimed as published.
