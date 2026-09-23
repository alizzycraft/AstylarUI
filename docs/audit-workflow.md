# Efficient Material input-audit workflow

Preserve equal rendering inputs and root-cause investigation. Do not compensate
for renderer defects with different fixture styles. These workflow changes do not
approve existing findings, finish the audit, or authorize renderer fixes.

## Small working records; immutable original evidence

```powershell
npm run audit:findings:import
npm run audit:findings:query -- slider
npm run audit:findings:query -- slider --id <finding-id>
npm run audit:findings:evidence -- slider <finding-id>
npm run audit:findings:verify
```

Import once per canonical snapshot. Both compressed and decoded hashes are
authenticated. Repeated unchanged imports reuse the index without expanding the
2 GB report. Default queries show at most 20 compact entries; request one ID for
details, or explicit `--all`. Queries refuse stale canonical snapshots. Evidence
retrieval authenticates the preserved package and the exact requested row.
Missing candidate fields remain missing rather than becoming assumed defaults.

The current index preserves 8,483 scalar discrepancies, 132 source findings,
39,904 typography/control differences, 389,202 scalar occurrences and 1,668
unresolved scalar groups. Compact shards total 69,621,642 bytes versus
2,017,893,961 decoded canonical bytes. Every original section remains in the
preserved package; other sections are listed in the index, not discarded.
This is a derived working index, not a change in the report's acceptance status.

## One investigation per question

Record competing explanations, the first meaningful divergence, the next decisive
check, and the population to which the result actually applies. Similar symptoms
are not proof of a shared cause. Distinguish input mismatch, confirmed core defect,
measurement/harness defect, and unknown. Reopen settled work only when relevant
dependencies change or contradictory evidence appears.

Maintain one concise current ledger: conclusion, evidence IDs, remaining uncertainty,
next action. Reuse common schema and coverage checks; add semantic tests for genuinely
new claims, not a new survey/binding/conservation layer for every bookkeeping batch.
Commit coherent verified outcomes. Report questions answered, not files generated.

## Explicit verification tiers

```powershell
npm run audit:test:focused -- slider
npm run audit:test:focused -- position
npm run audit:test:focused -- workflow
npm run audit:test:integration -- position
npm run audit:test:integration -- slider
```

Focused suites do not invoke full aggregation. Integration is explicit; slider
integration still invokes the expensive legacy production builder. All original
assertions remain available after the split. Other legacy files can still mix
scopes: inspect their tests before execution and migrate when their area is next
touched. Do not imply every legacy test or collector is now cheap/cached.

`material-input-audit:check` validates the full canonical audit;
`material-input-audit` exports it; `material-parity:check` recaptures browser output.
These remain separate expensive milestone commands. Documentation-only work does
not justify recapture. Renderer, fixture or capture-environment changes invalidate
affected rendering evidence and still require the applicable final gates.

## Validated reuse

Composition and followup position reviews share an evidence session: collect once,
validate against immutable results, and rehash all actually read inputs at session
completion before publishing reusable evidence. The followup batch additionally
caches across processes, keyed by collector/parameters/root/Node version with
receipts for actual data reads, transitive local code and package configuration.
Changed/missing dependencies or corrupt envelopes invalidate reuse. Persistent
caching refuses graphs with untracked readers, dynamic imports or subprocess I/O.
Composition's historical Git reads therefore use session-only reuse.

```powershell
npm run audit:review -- position --cold
npm run audit:review -- position
```

These replay existing proofs into small proposals; they do not investigate new
cases or mark classifications canonical. Cold/warm proposal hashes must match.
Integration still requires existing full-predecessor and coverage checks. For a
full export/check with cold evidence, set `ASTYLAR_AUDIT_COLD=1`, then clear it.
Run independent cold replay at integration milestones. New collectors must route
reads through the session and pass invalidation tests before persistent-cache use.
Do not change evidence during a session; completion rejects changed inputs.

Track collectors executed, memory/disk hits, bytes read and elapsed time. Do not
rebuild the canonical package just to update review prose or status.

## Retention and measurements

Follow [artifact retention](audit-artifact-retention.md). Original and failed-case
evidence is immutable. Five formerly always-retained scratch producers now use
`withAuditScratch`: remove successful scratch, retain failures with a reported path,
and require an explicit option to retain successful diagnostics. Resolved boundaries
are checked and links refused before removal. Never apply this to original captures.
Unchanged imports/proposals do not create new generations. Cache entries replace
the same collector key. Removing superseded snapshots still requires reference checks.

Measured September 24:

- Position-focused checks: 21.98 s before reuse; 3.83 s warm, approximately 6 s
  after source changes invalidated cache. All three tests passed.
- Position integration: both tests passed, preserving all 8,362 raw rows and
  changing exactly six/fourteen intended metadata groups respectively.
- Slider focused suite: five checks, including all 156 original native owners,
  pass in approximately six seconds.
- Combined position review: cold 3.12 s, warm 1.96 s; identical proposal hashes.
- Slider lookup: 647 records in about 13 ms. One exact full scalar evidence row
  retrieved and authenticated in about 1.8 s.
- Mutation/invalidation, compact-store integrity, and scratch retention tests pass.
  Two migrated box-sizing negative-control tests passed. Expensive field-host,
  owner-gap and box-sizing canonical integration bodies were syntax-checked, not
  rerun in this workflow-only turn.

No renderer, reference fixtures, thresholds or canonical findings were changed.
The browser matrix and monolithic canonical rebuild were not rerun. Source
fingerprint/export reconciliation remains an explicit next integration milestone,
not silently waived or described as passing.
