# Source inventory assertion integration

The completed legacy run at `0a50c92` passed 387 of 388 tests in
1,933,488.1386 ms. Its only failure was the inventory assertion's stale 356-file
expectation (392 actual at that run). The later disabled-ink source correction
adds three entries, making the current inventory 395. No previous source entry
is removed.

The actual legacy assertion now independently enumerates the 39 additions to
the previously tested 356. It preserves the original 308-file ordering, the
38 follow-up and 10 alignment memberships, and exact current normalized source
hash checks. Its pre-existing additional assertions are unchanged.

The whole-suite migration verifier authenticates the exact additions declaration,
restores only five count/membership expressions and their diagnostic, and then
performs its existing nine receipt-assertion restoration and complete historical
AST comparison. It does not waive the inventory test or unrelated assertions.
Negative controls reject table changes, wrong counts, a dropped membership
filter, unrelated assertions and substituted receipt identities. The prepared
assertion tests also reject missing, duplicate, reordered and forged receipts.

Verification commands:

```text
node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/case-index-assertion-migration.spec.mjs tests/material-parity/source-inventory-assertion-preparation.spec.mjs
node --max-old-space-size=1024 --test --test-name-pattern="^records source fingerprints and actual visual acceptance fields$" tests/material-parity/input-equivalence-audit.spec.mjs
```

The first run passed 4/4 in 11,002.0481 ms; the actual targeted legacy assertion
passed 1/1 in 2,698.5735 ms. These are focused results, not a fresh full-suite
pass or evidence of rendering equivalence. The rejected canonical regeneration
remains unaccepted and requires regeneration plus conservation verification.
