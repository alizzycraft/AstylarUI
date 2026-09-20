# Prepared source-review integration batch

This is a read-only preparation, not a canonical update or parity acceptance.
It joins the existing independently reviewed source populations to the exact
alignment-candidate payload and checks that their classifications do not overlap.
The alignment candidate itself still requires a stable-input CLI freshness pass.

## Verified prepared membership

| Review | Groups | Property observations | Proposed classification |
| --- | ---: | ---: | --- |
| Initial-value observation with disjoint motion targets | 86 | 4,708 | Harness observation-stage defect |
| Self-alignment, content flex and badge whitespace authoring | 8 | 492 | Application/plugin authoring defect |
| Active shared-button paint composition | 32 | 135 | Application/plugin authoring defect |
| Inactive outlined/disabled base alpha | 8 | 120 | Application/plugin authoring defect |
| Same-owner delay and disjoint transition targets | 12 | 840 | Harness observation-stage defect |
| Total | 146 | 6,295 | — |

The two observation-stage classifications do not invent candidate computed
values, select a CSS cascade winner, or claim motion is inactive. The authoring
classifications do not establish a renderer defect or equivalent composited
pixels. Each source review retains its separate uncertainty and ownership limits.

## Binding and conservation

The collector freshly rebuilds and compares all seven source reports, including
the complete 600-owner button census and 121-group motion review. It uses the
independently bound production normalization functions; raw observations remain
in their source reports and their hashes/case membership remain in this batch.

The current candidate payload is pinned to compressed SHA-256
`c08d24e94671c18e0c640638ca234b9571720080474115cc2b8388a2883a810e`.
Every compressed and decoded byte is authenticated by the canonical reader.
Changing that payload requires explicit review before rebinding, not an automatic
hash refresh. The join requires a unique unresolved canonical row, exact occurrence
count, ordered case sample and complete state membership for every proposed group.
It refuses overlapping proposals and preserves prior classifications.

Complete original row hashes and the ordered digest of every unselected row are
retained. No canonical file is written. The **1,835 unresolved** candidate count
therefore remains unchanged. The proposed 146 groups must not be subtracted from
the published count until integration, independent source binding, complete-row
conservation and CLI freshness all pass.

## Next implementation boundary

After the earlier alignment integration is accepted, bind this batch at the main
audit classifier's unresolved-observation boundary. Do not add renderer or fixture
changes. Preserve the existing 134-, 66- and 125-group classifications, all raw
evidence, and every unselected complete row. Keep the 23 remaining motion-review
groups and modal/open-state button uncertainties pending. No previous primary-
button classification may be replaced by the broader shared-button review.

## Verification

```text
node --max-old-space-size=1536 scripts/prepare-material-reviewed-source-batch.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/reviewed-source-batch.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The first generation was rejected because the initial join assumed the five-part
family/element/property/value signature was globally unique. Existing canonical
classification can split identical signatures into separately reviewed and
unresolved case populations. The existing owning planners select the unresolved
population; the batch now uses the same identity boundary and still requires
exact membership and complete row hashes. It preserves already-reviewed sibling
populations in the other-row digest. Duplicate unresolved matches remain errors.
The rejection is retained in `reviewed-source-batch-generation-sep20.log`.

The corrected generation exits 0 and reproduces **146 groups / 6,295 observations**.
The other **8,193 complete rows** have ordered digest
`8c924d71e7da9ec5c7335f319fc395f27359b189dfbf55624e7d752184a7e18c`.
Prepared report SHA-256:
`6a9335ebb748681bc2d1b390464b64c558ed28c30104323e03899e23803fdbd3`.
Log: `reviewed-source-batch-generation-population-sep20.log`.

The complete focused/inventory run passes **9/9**, exit 0, **168,583.5682ms**,
with no failures, skips, cancellations or TODOs. Its 19 rejection controls cover
changed membership and inflated proof claims; a separate test preserves an
already-reviewed same-signature population in full. The owning tests cover complete membership,
non-overlap, preservation of prior classifications, raw row changes, input
immutability, inflation of proof claims, and full source/payload replay with
writes prohibited. The terminal log is `reviewed-source-batch-full-sep20.log`;
logs use the `reviewed-source-batch-` prefix under
`artifacts/material-parity/field-host-flow-input-audit/`.

Unfiltered discovery now contains 190 test files (182 Material, four general,
four TTS). The nine checks above are not a complete harness run or an enforced
rendering matrix result.
