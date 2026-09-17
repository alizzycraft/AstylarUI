# Gap classification: production integration verification

This is audit instrumentation. No renderer, plugin or comparison input is
changed. The [complete source ledger](material-owner-gap-observation-stage.md)
distinguishes browser-computed gap values from captured local declarations;
it does not supply missing candidate computed values or establish parity.

## Implemented boundary

The production builder collects `ownerGapInputs`, retains the full positive and
negative population, and invokes its classifier only after all earlier
classifications have kept precedence. Full reviewed-case membership is retained.
The validator runs both original-tree replay and independently reconstructed
classification coverage. Missing evidence and unjustified equivalence claims
are rejected. Normalization, generic classification and shared mappings remain
unchanged.

Historical integration tests retain their original assertions. Before treating
a later gap attribution as an explained change, they independently check its
original scalar coverage, exact earlier row, authored examples and false
computed/rendering-equivalence flags. They do not exempt a whole property or
component from conservation.

## Verified focused integration

Before integration, the new test failed on the absent production source binding
(`undefined` versus `bound`), and the full saved-report checker failed because
zero, rather than 108, groups had the new attribution. These are retained red
baselines, not renderer failures.

```powershell
node --test tests/material-parity/owner-gap-canonical-integration.spec.mjs
```

After integration, session **61763** exits **0**: **1/1 passing**, zero failures,
skips, cancellations or todos, **270,233.7009 ms**. It executes the actual
builder from `cab0cc3cc53b3728bb4022b89e0fe47168c18bae` and the current builder
against the same separately retained diagnostic capture:

- 36 static cases spanning every family and 113 interaction cases;
- 992 original gap observations, including negative/review cases;
- 108 attributed groups / 392 observations in this diagnostic population;
- all **6,605 scalar rows** unchanged;
- all **6,497 unrelated complete findings** unchanged, SHA-256
  `2e243975bd73a239dfec4d5c293e5b914a721492da7714cd6d07fe4d1467b412`;
- original input immutability, production source/coverage validation and
  rejection of missing bindings, dropped classifications and false equivalence.

The log is
`artifacts/material-parity/field-host-flow-input-audit/owner-gap-integration-after.log`,
961 bytes, SHA-256
`638e138212ff1bc512c257fff66152a19ac0c108c28ac58e51eef33b0639e4ba`.

## Full generation and saved-payload conservation

Full generation (session **64062**) completes in **1,463,427 ms**, exiting **1**
only for **2,330 unresolved** differences. It retains complete coverage:
436/436 static and 1,875/1,875 interaction cases, 8,339 difference groups,
386,891 occurrences and 132 source findings. Input equivalence remains false.
The command uses the original `current-ancestry-audit` report, normal line-box,
control line-box v3 and supplemental line-box reports, plus the original
supplemental root, without a partial-coverage option.

```powershell
node scripts/verify-material-gap-integration.mjs
```

The saved-payload checker (session **20349**) exits **0** in **103,416 ms**.
Against `cab0cc3`, it verifies all **8,339 scalar rows** unchanged and all
**8,231 unrelated complete findings** unchanged, SHA-256
`1ba25310b65abcac798be252add208bc1b14ff5dbadc642b27a688d7c146730e`.
Exactly **108 groups / 6,320 observations** receive the bounded attribution;
all **54 remaining gap groups / 2,934 observations** are retained. Coverage,
earlier bound ledgers and original authored examples are unchanged. Every
current source fingerprint matches disk; only the reviewed nine files are
added to the source inventory. Full original-tree gap replay and independently
reconstructed classified membership also pass, retaining all 2,311 cases,
13,876 gap observations and 7,556 negative/review observations.

The payload is 52,077,122 compressed bytes, SHA-256
`e875ef307997ce7e8f61783d120585f4d8536376acd6db1a1afb2b68b5809fd7`;
the manifest records 1,946,582,433 decoded bytes, SHA-256
`f01dee29e6d8d340c2585f8817c2f73f4b027eca1d3ab5d23164f1c7faefff9d`.
The human report changes only the unresolved count, gap paragraph/proof entry,
blank-line separation and shifted test-source line references.

Logs are `field-host-flow-input-audit/owner-gap-canonical-generation.log` and
`field-host-flow-input-audit/owner-gap-saved-conservation.log`, under
`artifacts/material-parity`. Full no-write generation/check is now running in
session **8635**, with log `owner-gap-full-no-write.log`; its result is not yet
known. Passing saved projections does not substitute for that complete replay.

## Dependent provenance

Dependent provenance receipts must be replayed against the updated audit
source. Fresh browser evidence must use a separate capture directory; historical
captures are not rewritten to pretend they observed current source.

The five dependent gap receipts now replay successfully: survey, exact canonical
join, motion review (21 negative controls), explicit composition (40 negative
controls) and six fresh CSSOM controls. Inspection confirms their only changes
are dependency digests. The [dialog motion provenance refresh](material-dialog-motion-context-survey.md#gap-integration-provenance-refresh)
also passes all 32 cases, 2,848 scalar checks and 21 negative controls, retaining
identical observations under new source descriptors and preserving the old
capture byte-for-byte. These do not replace the still-pending full canonical
checks or complete current harness.

### Historical integration checks

Session **33970** exits **0**, **5/5 passing**, no skips/cancellations/todos,
**1,062,022.9091 ms**. It replays the button box-sizing, field-host layout,
grid-observation and tooltip-wrapping integration suites with their original
precedence assertions intact. Their complete scalar projections remain
unchanged. The explained later gap rows are independently validated before
unrelated-record conservation. The log
`artifacts/material-parity/field-host-flow-input-audit/owner-gap-historical-integration.log`
is 3,144 bytes, SHA-256
`ecb1a2f51eba3dd12c2547c2ec6dfcba5479882b9faba5f7678d0f5fb1a83b06`.

The dependent original-overlay replay exposed a historical/current mapping
provenance mismatch. Its [bounded historical-source correction](material-original-overlay-context-survey.md#historical-mapping-identity-after-gap-integration)
passes six tests and retains all 91 states, 200 owner proofs and 17,654 root
properties without recapturing or rewriting the original browser evidence.

### Case-index regression replay

The initial three-file audit/CLI/codec run (session **93663**) exits **1**:
385 passing and ten failing out of 395 tests, no skips/cancellations/todos,
671,477.9421 ms. Nine failures identify the old audit-module fingerprint in
saved original-case indexes; one expects the earlier 209-file inventory rather
than 218. That failing record is retained. The inventory assertion now requires
all nine new entries and their exact hashes, not just the new count.

The older indexes have independent original-case/tree replay tests rather than
a single regeneration command. After updating their precise dependency
metadata, session **72338** passes **11/11**, exit **0**, no skips or
cancellations, **76,051.9838 ms**. This covers the ten formerly failing checks
and the root box-model companion. The log is
`artifacts/material-parity/field-host-flow-input-audit/owner-gap-case-index-replay.log`.
All captured cases are replayed; the hashes are not accepted merely because
they were refreshed. Comparison against `cab0cc3` additionally preserves every
non-fingerprint field in the nine indexes and the root-initial,
field-host-weight/tracking and field-host-initial-style reports.

The dependent field-host-initial generator and its no-write replay both exit
**0** (session **98711**), retaining 577 cases, 48 groups and 4,616 observations.
The root/field focused tests (session **16326**) now pass **14/14**, with zero
failures, skips, cancellations or todos, **215,496.7957 ms**. The log
`artifacts/material-parity/field-host-flow-input-audit/owner-gap-root-field-provenance.log`
is 66,369 bytes, SHA-256
`3ad059769641166c568d307302f9cdb25483e84fdbfb138cbd7eb49723f9a0b9`.
This covers root initial-style evidence, field-host weight/tracking and
field-host initial-style evidence, including rejection of altered proofs.

The remaining owner/overlay provenance regeneration also completes. A recursive
comparison against `cab0cc3` confirms that the field-host layout, owner
initial-style membership/mapping, overlay owner mapping and remaining overlay
ancestry reports change only source/dependency hashes. Their findings and
captured values are unchanged. The historical overlay reader separately proves
that the original captured mapping and its current successor have identical
non-provenance data; it does not rewrite the old capture's identity.

These focused passes do not substitute for the complete regression run or
current full harness.

The subsequent complete three-file audit/CLI/codec run (session **46465**) exits
**0**, **395/395 passing**, zero failures, skips, cancellations or todos,
**705,264.8365 ms**. The retained log is
`artifacts/material-parity/field-host-flow-input-audit/owner-gap-audit-regressions-after.log`.
It is 102,382 bytes, SHA-256
`c660c4fe69d98e5da57a9caf92fe4a96fb6e753c2dd1e39bcd3cccc4fedeba69`.
This closes the earlier ten regression failures; full canonical verification
and the current complete harness remain separate requirements.

The earlier 91-file / 854-test harness pass predates this integration. The
complete current harness is running in session **85570**, with log
`field-host-flow-input-audit/full-harness-gap-integration.log`. Its startup
inventory contains **95 files** (87 Material, four general parity and four TTS),
including all 43 legacy files. It includes the separately committed button
paint survey and the current gap integration; tested sources remain unchanged
during the run. No outcome is claimed yet. The enforced parity matrix also
remains required. Input and
rendering equivalence remain false; the public gap grammar/unit/axis failures
and other unresolved audit findings remain open.
