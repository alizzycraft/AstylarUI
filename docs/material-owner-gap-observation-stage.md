# Gap diagnostic stages: complete source binding and classification

This is audit instrumentation, not a renderer correction or an input-equivalence
claim. The original [gap survey](material-owner-gap-input-survey.md) and
[exact canonical join](material-owner-gap-canonical-join.md) remain unchanged.

## What the independent replay establishes

The new collector selects every original scalar observation with browser
`normal` and an omitted candidate local gap longhand. Selection does not depend
on fixture IDs or saved canonical classifications. It reopens the original
report and both hash-checked trees for each selected case, inside the Material
artifact boundary. The caller's complete selected population must match the
original source. The existing gap inspector supplies the declaration, identity,
formatting-context and three-stage evidence; no second CSS resolver is added.

The ledger contains **2,311 cases, 234 groups and 13,876 observations**:

- **108 groups / 6,320 observations** establish a browser-computed versus
  candidate-local-declaration observation-stage difference. They have no
  captured relevant local gap, reset or motion request. These are classified
  `parity-harness-defect` with attribution
  `reviewed-owner-gap-observation-stage`.
- **7,556 observations remain review cases** in the ledger. Explicit shorthand
  remains a request even when its longhands are locally absent. Motion,
  generated-owner scalar-rule gaps and existing root authoring are not silently
  accepted or normalized.
- The ledger reproduces all **162 groups / 9,254 observations** in the prior
  unresolved-gap survey, including every original ordered case, scalar digest
  and full per-group declaration-proof digest. Its additional **4,622**
  observations retain already-reviewed root requests rather than filtering
  them out of source coverage.

This does **not** infer candidate computed `normal` or `0`, prove used spacing,
equate different formatting structures, prove inherited reset context, or
establish rendering equivalence. All such flags stay false. The
[public grammar/unit/axis failures](material-gap-value-public-proof.md) remain
independent core findings; a diagnostic-stage classification does not waive
them.

## Regression protection and integration boundary

`owner-gap-source-binding.mjs` independently validates the complete source
ledger. `owner-gap-classification.mjs` joins only eligible exact scalar
observations. `owner-gap-coverage.mjs` reopens the original scalar source and
requires all expected classified rows, exact ordered state membership, counts,
sample cases, owning subsystem, justification and evidence.

Both source replay and classified coverage are required together. A coverage
check is not a substitute for original tree validation. Removing both a
problematic observation and its classification, dropping negative cases,
changing an attribution, or supplying a computed-value guess must not create
accepted evidence.

The focused tests exercise the complete positive/negative population and
mutation rejection for caller selection, tree descriptors, scalar stages,
requests, provenance, case identity, classification deletion, duplicates,
sample/state loss and forged equivalence claims. They also verify the three
canonical audit files are byte-identical before and after checking.

```powershell
node --test tests/material-parity/owner-gap-source-binding.spec.mjs
node --test tests/material-parity/owner-gap-coverage.spec.mjs
```

Source-binding session **25419** exits **0**: **6/6 passing**, zero failures,
skips, cancellations or todos, **266,665.9904 ms**. Coverage session **13252**
exits **0**: **3/3 passing**, zero failures, skips, cancellations or todos,
**89,117.6978 ms**. Logs under
`artifacts/material-parity/field-host-flow-input-audit/` are:

- `owner-gap-source-binding-tests.log`: 1,730 bytes, SHA-256
  `ac2c7d5fcdce492143bf80ee75f619eeff08b7f52237f93e1851f9b2f2018a55`.
- `owner-gap-coverage-tests.log`: 954 bytes, SHA-256
  `ad30b7730e9c6b741a3a2fe54281e62cf21d96ff906c18191d6f667c4332a36f`.

The [production integration](material-owner-gap-canonical-integration.md)
now passes focused prior/current-builder checks and full saved-payload
conservation. The production audit collects and validates this ledger, adds
the classifier only after earlier attribution retains precedence, preserves
full reviewed-case membership, and enforces the independent coverage check.
Saved-payload verification confirms that the remaining
54 unresolved gap groups and every unrelated canonical row are conserved.
The generated canonical count is now **2,330 unresolved**. Full no-write
replay remains pending; the reduced count is not an input-equivalence claim.

The earlier 91-file harness started before these two new spec files existed.
Its passing result and these focused results are separate evidence. The current
95-file harness is now running; no complete current-harness or enforced parity
acceptance is claimed yet.
