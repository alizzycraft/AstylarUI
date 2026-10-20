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

Batch evidence retrieval pre-indexes requested section/ordinal pairs once instead
of splitting/scanning every requested finding at every JSON value. Existing
payload authentication,complete-row hashes,missing-row rejection and requested
return order are unchanged. The49-row mixed-section regression records49 section
splits versus429595 before the change,and rejects forged complete-row hashes,
missing ordinals and corrupted payloads. One read of49 actual button rows from
the preserved0dd7 package completes in70792.6091ms;this is not a like-for-like
timing comparison with the earlier TWO-package extraction. Old reader-file source
receipts remain historical and need explicit applicability reconciliation before
broader retained-proof verification;do not replace capture receipts in place.

The September 24 index preserved 8,483 scalar discrepancies, 132 source findings,
39,904 typography/control differences, 389,202 scalar occurrences and 1,668
unresolved scalar groups. Compact shards total 69,621,642 bytes versus
2,017,893,961 decoded canonical bytes. Every original section remains in the
preserved package; other sections are listed in the index, not discarded.
This is a derived working index, not a change in the report's acceptance status.
These measurements are historical. Use the current handoff and authenticated
index for current counts and pending integration work, not the figures above.

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
For an unresolved interaction settlement boundary, the existing runner supports
`ASTYLAR_MATERIAL_SETTLEMENT_TRACE=1` with the existing exact family/profile/state/
interaction-viewport filters. It retains bounded public-method and frame-session
observations in the case report and fingerprints the option in capture provenance.
It changes no actions,waits or acceptance checks. Wrappers restore original methods
and preserve promise identity; observation can affect timing and does not capture
every internal invalidation. Use a new run directory and preserve original failures;
an instrumented pass cannot replace a historical failure or prove its exact cause.
Fresh report-mode Material captures run the existing installed-component catalog
and enforced-matrix configuration assertions only. Historical evidence replay
belongs to audit verification, not fresh capture preflight: installing a current
package legitimately invalidates old installed-file receipts. `--enforce` still
runs the complete benchmark-config suite, and the full audit harness remains
unfiltered. No historical assertion or fingerprint is waived or rewritten;
capture success does not imply that retained evidence remains current.
For the demonstrated missing opposite-item pointer boundaries, use
`ASTYLAR_MATERIAL_SELECTION_REPLAY=1` with interaction-only activate cases for
radio,button-toggle,tabs,stepper. It retains actual paired control state,input
trees and screenshots after the standard action,opposite-item click and return.
This is diagnostic-only and rejects --enforce; use a new run directory. It does
not prove equal inputs,local paint,complete event ordering or resource plateau
(the standard resource samples precede the additional actions).
The complete unfiltered audit harness is `node scripts/run-material-audit-harness.mjs`.
It explicitly enables `ASTYLAR_AUDIT_RECEIPT_COMPARE=1` for its child so the two
existing opt-in receipt-conservation assertions cannot silently skip final
acceptance. Focused Node commands retain their original opt-in behavior. The
October4 full-run skips are historical omissions,not passing or inapplicable
evidence; those original assertions still require execution at the final gate.
The exporter now reports validation errors before package comparison or publication;
an invalid audit cannot overwrite the checked-in canonical package. A stale-package
error alone does not establish that the new audit passed validation.

For the retained **current-ancestry** baseline, use the named launcher instead of
passing only `--parity-report` to the general exporter:

```powershell
node scripts/export-material-input-audit-current-ancestry.mjs --dry-run
node scripts/export-material-input-audit-current-ancestry.mjs
```

It checks that all five required paths exist and supplies the original capture,
three line-box reports, and supplemental root together. `--check` selects the
existing canonical check instead of export. Cold/progress environment settings
are forwarded unchanged. The dry run only checks invocation/path completeness;
the existing collectors and validators still authenticate evidence. Do not use
this historical baseline launcher for a different capture. A partial invocation
has repeatedly produced expensive, incomplete reports; such output must never
be imported as accepted evidence.

The named launcher also supplies the reviewed passive case-obligation proposal
and its pinned review digest. Its existence preflight is separate from the export
reader's exact-case and dependency authentication. The general exporter accepts
`--case-obligation-review=WORKSPACE_RELATIVE_PATH` together with
`--case-obligation-review-sha256=REVIEW_DIGEST`; neither option is valid alone.
This adds partial inspection evidence to existing coverage without changing the
matrix completeness or rendering acceptance flags. Unjoined cases remain explicit.
Synthetic/focused builder calls do not implicitly load this historical proposal.
Source conservation and coherent export/cold/import remain required before the
new coverage records are described as canonical; a launcher dry run is not proof
of publication or successful audit validation.

The October20 launcher selects exacte837c58e chip-graphic successor of868daaec,
which succeeds accepted f471932b (and bfc2b6d5/be99cd38). The existing reader authenticates five historical source
transitions,including bounded benchmark replay support. Old reviews remain
explicitly supported;unknown digests do not select this boundary. Full review
loading and complete predecessor recovery (only76 graphic children to recover
868d,then100 paint children to recover f471) are separate from launcher dry-run
preflight. Selection is not canonical publication,current rendering or case
closure;all original final gates remain required.

The implicit schema-1 proposal remains partial-only and byte-compatible. An
explicit `inspectionSchemaVersion: 2` proposal may record `inspection: complete`
only with a receipt-bound requirement review and conclusions/evidence for every
existing obligation, including any extra keyboard obligation. Applicability must
be reviewed, applicable obligations must be inspected, exclusions must be
justified, and no obligation may retain outstanding work. An inspected failure
must retain classified, receipt-backed findings; it counts as inspected, not as
a rendering pass. Do not clear remaining work or invent conclusions just to pass
the validator. Review records must actually establish the original audit's input,
root-cause/history/ownership, regression and handoff requirements.

The loader validates structure, exact membership, review digest and every evidence
receipt; it cannot independently establish the truth of a reviewer conclusion.
For the exact retained33a0bd8b review,the export runner selects
text-backing-case-review-source.mjs explicitly and records sourceApplicability.
It authenticates three current files through the session reader,then restores
only the reviewed additive policy/test/helper transitions to their original
receipts. Normal loader reads remain strict;other review IDs cannot select this
boundary. Historical receipt validity does not imply current rendering or
inspection closure. The named launcher selects this newer review;its dry run
checks paths/arguments only. The accepted package is not updated until actual
export,conservation and independent verification/import complete.
Schema-2 inspection completion is derived from all configured cases being joined
and closed. Current rendering remains unverified and its acceptance flag stays
false. Final canonical/browser/release gates and the original acceptance criteria
are unchanged. No production case is promoted by synthetic schema tests.
Closure findings preserve the existing canonical source labels,including
confirmed/suspected-core-renderer-defect,parity-harness-defect and
intentional-documented-limitation. Both short and canonical core labels require
the same receipt-bound public reproduction;aliases do not permit an equivalent
pass for a core failure or clear remaining inspection work.
Use review key order `kind`, `status`, `inspectionSchemaVersion`, `scope`, `groups`
for the existing JSON digest contract. Schema 1 omits the version opt-in.

## Validated reuse

The October20 control-input successor736e685c retains the completee837 review
and adds116 bounded children to108 exact checkbox/select cases. The named launcher
selects it through the same explicit five-transition source reader;unknown review
digests remain rejected. Old review support and original receipts remain intact.
Source selection and focused green checks are not canonical publication,current
rendering or case closure. Export/conservation/independent cold/import remain.

For the pre-semantic-text-transform assertions in benchmark-config.spec.mjs,
the suite now has an explicit historical population/read boundary. It removes
only the authenticated additive160th finding,214th proof and associated source
registration,then checks complete prior policy/producer/helper/suite hashes.
The current-registration suite semantic-text-transform-input.spec.mjs separately
reads the actual163 definitions/217 proofs and tests conservation/drift rejection.
The additive attribute-focus registration reverses exactly to162/216 before the
inline/border/semantic stages. Full current/prior source hashes,all162 retained
definitions,five added evidence paths and rejection controls are authenticated;
this does not mutate production definitions or replace captured receipt bytes.
The additive inline-image line-box registration reverses exactly to161/215 before
the border and semantic stages below. Its full policy/producer hashes,complete
prior definitions and rejection controls are checked by the same existing suite.
The additive border-contact registration has its own exact reversal to the
previous160/214 sources before the semantic reversal to159/213. Complete source
hashes,predecessor inventories and rejection controls bind both stages. These
are explicit historical populations,not an alteration of the production registry
or a waiver of the new public border failure. A changed registration identifier
or proof description cannot silently bypass its restoration guard.
Historical reads are limited to four exact workspace paths and change no disk
files,production collection or capture. Do not present historical replay as
current renderer acceptance. The root-focus runner584cdfc8 versus current86ece08b
now has its own explicit applicability boundary:pin raw current bytes,execute the
existing metadata-only reversal to normalized082d6d7b,and check all six captured
editing methods. Captured raw bytes are not claimed recovered;reports are unchanged.
Original root behavioral assertions execute after this boundary. Font-box strict
default still rejects155.0.8059.40 versus available.80. Its explicit
`node scripts/check-retained-paragraph-font-box.mjs --compare-current-browser`
mode instead makes fresh measurements with both identities/launch evidence and
every original numeric comparison unchanged. Eight observations agree;this is
bounded metric stability,not replay in the old executable or general browser
equivalence. The standalone-batch suite explicitly requests and checks that mode.

For the original **synthetic ImageResourceService unit assertions only**, the
test-only `audit-service` configuration avoids compiling the application's
Tailwind stylesheet and the existing native-module Karma loader avoids bundling
Babylon. Use:

```powershell
node node_modules/@angular/cli/bin/ng.js test --configuration=audit-service --watch=false --browsers=ChromeHeadless --include=src/app/services/dom/elements/image-resource.service.spec.ts --external-dependencies=@babylonjs/core --karma-config=karma.overlay-audit.cjs
```

All three original assertions run. This is not a styled/DOM/WebGL parity gate,
standard full-unit acceptance, or native image-race proof. Default styles and all
standard final commands remain unchanged. Two memory-pressure cancellations and
the original loader-registration failure are retained in the coverage ledger.

For the six retained progress/compact-input/keyboard/applied-theme/selection/
tooltip assertions and all original fixed-width, flex, host-request and
box-sizing assertions, run
`node scripts/check-historical-component-proofs.mjs`.
It preserves the original test bodies and receipts. Exact Git sorter bytes and
preserved component bytes are authenticated before complete source conservation
reverses only the two launch-path additions and the existing read-only diagnostic
blocks. Unexpected source drift fails; writes are prohibited. This historical
preload is not applicable to current capture or canonical production commands.
The button suites additionally use the existing authenticated border-source
transition. Box-sizing uses the existing exact historical capture-runner
restoration; browser-launch changes are not treated as provenance-only changes
or evidence of equivalent current rendering. Original source receipts, complete
600-owner populations, geometry gaps and negative-control assertions remain
checked by the original suites. The launcher runs retained and button suites
separately so the retained-test name selection cannot omit button tests; either
failure makes the launcher fail. No installed source or report is changed by
this read-only boundary.

The launcher also covers the complete button box-sizing source-binding assertion.
Its retained test-source receipt is restored only after reversing the exact
scratch-cleanup migration and proving whole-source equality with the authenticated
Git original. The original positive assertion runs read-only; the original
eight source / 15 receipt negative controls run separately against current code
without the historical preload so their synthetic scratch can be created and
cleaned through `withAuditScratch`. Neither original test body is modified.

For the retained public cursor, range drag/paint/travel and vertical-alignment
evidence, run `node scripts/check-historical-public-proofs.mjs`. It runs all six
original suites and their nested check commands with writes prohibited. The
explicit historical dependency read boundary leaves the current installation
unchanged; original validators still authenticate every captured dependency.
Five historical raw source receipts use preserved Material-worktree bytes only
after exact SHA-256 authentication and complete LF-normalized equality with
current sources. Missing originals or semantic source drift fail replay. This
proves historical evidence conservation, not current browser acceptance. Do not
use its preload for current capture or canonical production commands.

The canonical cursor collector separately supports the exact October11 installed
inspector transition through `restoreCursorInspectorCaptureSource`: current and
restored whole-file hashes authenticate removal of only the two read-only
retained-layout additions. All other captured dependencies still require exact
receipts and owning cursor source/package proofs remain current. This does not
use the historical preload,replace captured bytes,or establish current browser
parity. Unreviewed source changes fail and require a new applicability review.

The sixth suite is the original range default-box proof, including all 18 source
and installed-runtime fingerprints. Its exact original 6,349-byte package metadata
was recovered from an integrity-authenticated project tarball in npm's cache.
`docs/evidence/material-range-default-package.json.b64` preserves its mixed line
endings byte-for-byte; decoding must match the original SHA-256
`4e1038f17f7d51879a3e513db3ddf4b92a3521369645e7378affe6038f71441d`.
The preload authenticates the range proof's eight raw-source encoding restorations
against preserved originals and complete current LF-normalized source equality. Neither
the installed package nor the original dependency receipt is replaced. This is
historical replay only; the fresh range diagnostic remains honestly failing.

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
Before scheduling an export, check whether changed files are actually consumed
by the producer's source/proof inventory or dependency graph. A new standalone
focused proof can be current independently without changing the canonical report.
Integrate such findings through the existing inventory/classification mechanisms
in a coherent batch; exporting an unchanged producer does not integrate them.

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
