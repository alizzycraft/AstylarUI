# Motion proof after reviewed-input integration

The reviewed-input integration independently regenerated the original gap
survey. The downstream CSSOM proof still named its earlier survey hash:
`2575edb57305d009386dd20864a1de56f36e6e49a709859e128a393e6121a7d3`
instead of the actual
`2e990e6c15b959d396770ce8012bc62c61e0a32926fc67020e4a34ba43ee28f8`.
This was a stale evidence dependency, not a newly discovered rendering defect.

Both existing generators were replayed unchanged. Against commit `b901678`,
the two complete JSON reports differ in exactly three dependency hashes:
the CSSOM parent and the binding's two source reports. Independent deep-object
comparison preserves every other field, including all original source/tree
records, six browser controls, conclusions and browser version 152.0.7977.84.
Both generator sources are byte-identical after line-ending normalization.

All **32 original dialog cases / 64 observations** remain intact. The complete
binding rows retain SHA-256
`660d4829b07b2cd5ed681b65fcf1648d5636a284588d4e9c32b449409872d8b5`.
No resolved original motion or candidate computed/used gap is invented, and
canonical attribution is unchanged.

## Verification

```text
node scripts/verify-material-motion-cssom-capture.mjs
node scripts/bind-material-pending-motion-capture.mjs
node scripts/bind-material-pending-motion-capture.mjs --check
node --test tests/material-parity/pending-motion-capture-binding.spec.mjs
```

All commands exit 0. The binding loader invokes the real-browser verifier's
`--check` and authenticates the actual current parent before accepting its
receipt. The focused suite passes **3/3**, no skipped/cancelled/TODO tests, in
**26,799.7585ms**, including the existing 31 mutation rejections.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`reviewed-motion-receipt-refresh.log` and
`reviewed-motion-receipt-conservation.log`. This bounded correction does not
establish complete current-harness or enforced rendering acceptance.
