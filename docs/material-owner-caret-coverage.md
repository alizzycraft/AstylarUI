# Caret attribution: independent planned-output coverage

This adds the coverage boundary needed before integrating the
[caret-attribution candidate](material-owner-caret-attribution.md). It does not
change canonical classifications or repair the renderer.

`scripts/check-material-owner-caret-coverage.mjs` uses the complete source binder
to authenticate the candidate and parent against their immutable committed
records and independently replay every original scalar/tree classification.
All proof dependencies retain whole-source checks, except the canonical builder:
only its seven executed normalization functions are pinned, with both historical
and current whole-file digests recorded. The check then
extracts and verifies the original production normalization functions by AST;
it does not implement substitute color normalization.

`tests/material-parity/owner-caret-attribution-coverage.mjs` separately enumerates
all **2,311 original cases**, deriving membership from their original scalar
inputs against the pinned parent's group identities. It checks both parent and
candidate ordered membership, raw values, scalar/tree/proof digests, actual
candidate omission, classification boundaries and false equivalence flags.
These are prerequisites for preparing output rows, not facts inferred from a
filtered list of rows that happened to receive a classification.

The result accounts for **118 reviewed groups / 3,154 observations**, preserving
**27 pending groups / 896 observations**. Every planned row has its complete
ordered case list, its first-12 display sample, original state population and
occurrence count. First-observation review evidence follows the existing
canonical representation; the complete candidate report and full original replay
retain every observation, rather than extrapolating from that first witness.

The validator accepts a complete discrepancy population and compares all rows
carrying either proposed caret attribution with the independently prepared rows.
Removing or relabeling a row therefore fails, as does adding an unreviewed owner.
Undefined candidate values may be absent after JSON serialization, but explicit
`auto` or the display marker `<omitted>` cannot replace actual omission.

The coverage module is not independently a source-authentication boundary: its
caller must authenticate the parent and replay the original attribution report.
The standalone checker does both. A future canonical caller must preserve that
requirement and separately conserve every unrelated canonical row.

## Verification

```powershell
node scripts/check-material-owner-caret-coverage.mjs
node --check scripts/check-material-owner-caret-coverage.mjs
node --check tests/material-parity/owner-caret-attribution-coverage.mjs
git diff --check
```

All commands pass with exit **0**. The complete source replay is followed by
**17 rejection controls**: missing, duplicated, reordered and relabeled rows;
wrong classification; fabricated candidate values; changed reference values or
counts; dropped/reordered/duplicated case membership (including index 13, beyond
the display sample); missing states; fabricated equivalence; changed proof
receipts; and promotion of a pending owner. Three positive controls preserve the
complete population, JSON omission semantics and unrelated discrepancy rows.

The three canonical audit artifacts are digest-checked before and after and
remain unchanged. The canonical unresolved count is still **2,278**.

- Planned rows SHA-256:
  `ad1d3cfb4bf185a75ef072d56102f5634d4ae66ff828f0ed105a5901185095e8`.
- Complete pending membership SHA-256:
  `d09d29777c00a52462e7d94b04ca9a464e8e633a6851095fb8f2b7eaa9c981d7`.
- Log: `artifacts/material-parity/field-host-flow-input-audit/owner-caret-coverage-check.log`,
  SHA-256 `dbb65fede2ea39764c25404baa549a7f7e36bbde16b04c5771945b9b780fed7c`.

## Remaining integration obligations

The previous full harness is terminal. All three complete caret commands are now
registered in automatic discovery. After the coverage command adopted the
authenticated executed-function boundary, their unchanged full test file passed
3/3 (exit 0; 222,938.5748 ms), retaining the 17 coverage, 13 source and 15 subset
rejection controls. The original proof reports and canonical audit were unchanged.
Log: `artifacts/material-parity/field-host-flow-input-audit/caret-proof-executed-boundary-recheck.log`.

The canonical builder now imports the authenticated source join and invokes
complete coverage validation. The [focused production integration
proof](material-owner-caret-canonical-integration.md) passes. Remaining work:
Compare previous/current canonical reports to preserve every raw scalar,
property-presence distinction, authored example and unrelated complete row.
Regenerate and no-write replay the canonical audit, then run the complete current
audit harness and enforced parity matrix. Pending chip/tab, overlay and range
reviews must not be silently promoted by this bounded classification rule.
