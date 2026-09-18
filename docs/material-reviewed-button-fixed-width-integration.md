# Button fixed-width historical conservation after reviewed metadata

The historical fixed-width integration guard independently replays the later
reviewed input proofs before reconstructing only their classification metadata
for its original unchanged-row comparison. No original scalar or authored input
is rewritten, and the test retains its previous assertions.

## Verified fixed-width result

- Baseline `30357b9f8c7b95da668914032557c5f7416c81db`.
- 480 original cases and 600 source-bound button owners.
- Nine width-authoring groups, including 52 scalar-matching core owners.
- Eight discrepant width groups / 548 observations.
- Nine later box-sizing groups and 18 later gap groups retained.
- 20 later caret groups / 600 observations source-authenticated.
- Exactly eight later state-layer preblend groups / 24 observations
  independently authenticated before historical metadata reconstruction.
- All 1,201 scalar rows unchanged; the other 1,146 complete rows retain digest
  `acf142b011155301b361b01109b4ed5164ada83bb1416eefdba6dcb47acf8101`.

```text
node --test --test-concurrency=1 tests/material-parity/button-fixed-width-canonical-integration.spec.mjs tests/material-parity/button-requests-canonical-integration.spec.mjs
```

The fixed-width test passed in **1,228,694.8176ms**. The combined run is terminal
with **one pass and one failure**, not 2/2 passing. Its request sibling failed
on a newly added count assertion: 12 observed versus 24 expected. The log is
`artifacts/material-parity/field-host-flow-input-audit/reviewed-input-button-historical-production.log`.

## Separate request-sibling correction, still pending

The request test's existing `selectStates` intentionally chooses one viewport
per family/profile/state. A separate replay of its actual selection function
and the independently authenticated source proposals confirms eight groups /
**12 observations**, not the full fixed-width population's 24. These are the
desktop-DPR1 hover, held and activation states across four themes. The source
projection covers 1,087 diagnostic cases and is recorded in
`reviewed-input-button-request-subset.log` in the same artifact directory.

The corrected request test now asserts these exact twelve case identities in
addition to the count. Its unchanged scalar and full-row checks still have to
pass in the production rerun; that rerun is live, not yet accepted.

This increment commits only the verified fixed-width guard. Neither result
establishes rendering parity, input equivalence or complete audit acceptance.
