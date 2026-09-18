# Historical conservation after reviewed-input integration

The seven reviewed input sets advance only classification metadata. Older
integration tests must recognize that exact transition without exempting whole
properties or dropping their complete-row conservation assertions.

The new `later-reviewed-input-conservation.mjs` helper independently replays
the twelve source proofs through the existing reviewed-input binding and
validates every emitted group against its exact original subset. It then
reconstructs only those verified metadata fields from the historical rows.
Every raw field must already match. Historical membership must be unique and
previously unresolved; a prior reviewed classification cannot be overwritten.

Unrelated current rows are returned unchanged, including unexplained changes.
Consequently the historical test's existing full-row equality and digest can
still reject them. This is not a broader attribution exemption, a change to the
canonical report, or evidence of rendering equivalence.

## Focused verification

```text
node --test --test-concurrency=1 tests/material-parity/later-reviewed-input-conservation.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**8/8 pass**, exit 0, no skipped/cancelled/TODO tests, in **152,382.643ms**.
The live source replay runs with filesystem writes prohibited and authenticates
all **134 groups / 3,325 observations** before reconstruction. It also rejects
an altered source projection. Twenty pure rejection controls cover missing or
duplicated membership, previously reviewed rows, changed raw/authored evidence,
changed cases, unsupported metadata and inflated source counts. An additional
test rejects self-consistent but unauthenticated evidence.

The first run exposed shared mutable arrays in the test oracle: removing a
current reviewed case also changed the expected case list. Independent cloning
corrects the test fixture; the failure and corrected pass remain in
`later-reviewed-input-conservation-focused.log` and
`later-reviewed-input-conservation-focused-corrected.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.

## Integration targets still pending

Read-only projection against the original populations identifies:

- Explicit-gap historical test: 296 cases, **13 later groups / 424 observations**.
- Gap-review historical test: 676 cases, **19 later groups / 195 observations**.

The original gap/caret checks, unrelated-row counts and hashes should remain
unchanged after reconstructing these authenticated metadata transitions. The
helper's focused pass does not establish that those production-builder tests
pass; their wiring and complete executions remain outstanding. Other historical
integration tests need the same evidence-based review, not blanket exemption.
