# Phase 16 independent forward tests

Twelve fresh agents evaluated the committed `astylarui-maintainer` skill at
`d54545a` in detached worktrees under `D:\dev\AstylarUI-phase16-evals`. Each
received only the skill path, its isolated checkout, and the raw request below.
They did not receive the intended classification, suspected cause, expected
patch, or another evaluator's findings.

The source mutations used to create FT-02, FT-04, FT-05, FT-09, and FT-10 were
committed only in their disposable worktrees. All evaluator implementation
patches were discarded. The one durable finding was the FT-01/FT-11 guidance
clarification, which was reapplied canonical-first on the Phase 16 branch and
then regenerated into the developer skill.

## FT-01: public report caused by application authoring

Raw request:

> After an Astylar surface mounts, my Angular app receives a WebSocket update
> and mutates a nested `textContent` field. It calls `surface.update()` with the
> same object, but the old label remains; cloning redraws it. Find and fix the
> renderer update bug.

Result: pass after evidence-led guidance correction. The evaluator used the
developer skill, added a temporary same-reference reconciliation proof, ran the
focused Chrome suite, and ran the `reactive-text-update` parity fixture. Direct
reconciliation rebuilt correctly and parity produced exact text, clean runtime,
SSIM `0.9894`, 100% edges within 2 px, and maximum edge error `0.0276 px`. No
core edit was made and the temporary proof was removed.

The report could not be reproduced as written: an explicit direct update
rereads the object, while the Angular wrapper needs a replacement input
identity. FT-11 independently re-established that distinction. Canonical and
developer guidance now state it precisely instead of treating same-reference
behavior as universal.

## FT-02: layout or responsive parity defect

Raw request:

> A Flex column with only `rowGap: '18px'` has no gap, while equivalent CSS and
> a general Astylar `gap` work. Reproduce, fix, and verify it.

Result: pass. The evaluator classified a core Flex layout defect, found that
`parseGapProperties()` tested `columnGap` before reading `rowGap`, restored the
correct condition, and added a narrow regression test. Focused tests passed
`21/21` and the full isolated suite passed `283/283`. The paired browser fixture
improved from SSIM `0.9810`, 83.3% edges, and `14.0175 px` maximum error to SSIM
`0.9955`, 100% edges, and `0.0318 px`; text and runtime were exact/clean.

## FT-03: typography or paint discrepancy

Raw request:

> Inter 500 at 18px looks heavier and wider in Chrome than Astylar, but Inter is
> referenced only by the normal site's CSS. Fix it by adding 1px to all glyph
> advances and mapping weight 500 to 600.

Result: pass with no edit. The evaluator classified unequal font provisioning,
traced canvas measurement and paint, and rejected the global metric/weight hack
as a violation of authored intent. Ten focused text tests passed. A Windows
Chrome probe showed the authored canvas font remained weight 500 and DOM/canvas
widths agreed within about `0.002 px` when the same Inter font was available.
The `text-inheritance` fixture produced SSIM `0.9965`, 100% edges, `0.0436 px`
maximum error, exact text, and clean runtime.

## FT-04: interaction, focus, control, or accessibility regression

Raw request:

> Accepted Escape dismissal restores Astylar's internal modal focus snapshot,
> but native semantic focus remains on the closed dialog. Reproduce and fix it
> without weakening modal semantics.

Result: pass. The evaluator found the missing semantic-adapter restoration,
restored the single general call after validated invoker focus, and added a
real-Chrome test for initial focus, dismissal, internal and native restoration,
closure, and inertness release. Before the fix the focused suite had two
failures; after it, `26/26` passed. The ten-transition modal lifecycle parity run
had median SSIM `0.9905`, minimum `0.9876`, 100% edges, exact text, and clean
runtime.

## FT-05: reconciliation, settlement, or resource leak

Raw request:

> A plugin's abort-aware delayed texture is tracked by its generation owner.
> Replacement/disposal clears owner counts, but its signal never aborts and the
> work continues. Fix cancellation, stale completion, and settlement.

Result: pass. The evaluator restored abort-controller cancellation during owner
disposal and added proof for replacement abort, prompt settlement, stale
late-result disposal without `onReady`, a stable replacement plateau, surface
destruction abort, final-zero counts, and absence of false async-failure
diagnostics. The focused Chrome suite passed `7/7`; only the owner and its test
changed.

## FT-06: plugin registry, isolation, or renderer lifecycle

Raw request:

> A plugin lifecycle service marked `providedIn: 'root'` appears shared by two
> surfaces. Fix plugin injector isolation and prove independent destruction.

Result: pass with no production edit. Inspection showed renderer/lifecycle
contribution classes are explicitly registered in every surface child injector,
overriding their root factory. A strengthened test used the exact root marker:
two surfaces received distinct instances and counters, updates remained
isolated, and each instance was destroyed with its own surface. The focused
plugin runtime suite passed `12/12`. The evaluator correctly identified that an
arbitrary mutable transitive dependency must be listed in plugin `providers`;
Astylar cannot infer its ownership.

## FT-07: narrow public API change

Raw request:

> Add a package-root `isAstylarDiagnosticError(value: unknown)` type guard for
> installed consumers and prove the additive API from the packed Angular
> consumer, including SSR.

Result: pass. In isolation the evaluator made an explicit additive compatibility
decision, added the type predicate, root export, focused tests, installed-
consumer usage, docs, and synchronized public-API evidence. Diagnostics tests
passed `8/8`; library declarations/JavaScript contained the root export; the
pack remained boundary-clean; and `consumer:check` built browser/server output,
prerendered a route, and passed `4/4` Chrome tests from a real packed install.
Both skills passed with the isolated public export count at 106. This evaluation
API was intentionally discarded rather than added to Phase 16 scope.

## FT-08: promote unsupported or partial behavior

Raw request:

> Promote inherited `visibility: visible | hidden`: hidden content retains
> layout but does not paint, pick, or appear in semantics, while a descendant
> may explicitly restore visible. Synchronize catalog, translation, and
> application guidance.

Result: pass. The isolated vertical slice covered the public type, default and
cascade, element paint/picking, semantic omission/restoration, diagnostics,
unit/semantic tests, a three-render parity fixture, catalog/prose, verified
translation, and developer reference regeneration. Thirty focused Chrome tests
passed. Parity produced median/minimum SSIM `0.9953`, 100% edges, maximum error
`0.040905485019493426 px`, exact text, and clean runtime/semantics. The isolated
catalog reached 85 style fields and 83 evidence references; both skill checks
passed. The feature patch was discarded because forward evaluation does not
expand the Phase 16 product scope.

## FT-09: parity failure

Raw request:

> Full parity now fails `block-flow`. Isolate and correct the cause without
> weakening thresholds, removing coverage, or changing browser reference truth.

Result: pass. The evaluator found that only Astylar's fixture child width had
changed from the reference's `280px` to `300px`; this was unequal authored input,
not a renderer defect. Restoring equivalence improved SSIM from `0.9811` to
`0.9910`, edges from 83.3% to 100%, and maximum error from `20.0000077 px` to
`0.0005697 px`, with exact text and clean runtime. It also correctly noted that
a filtered diagnostic run cannot satisfy the aggregate completion count.

## FT-10: Phase 15 minimal reproduction

Raw request:

> In equivalent inputs, `#summary { color: red }` precedes `.card { color:
> blue }`. Chrome keeps the ID rule but Astylar applies the later class rule.
> Carry the public reproduction through core diagnosis and fix it if warranted.

Result: pass. The evaluator classified a cascade core defect, traced ID
specificity from the public style rules, restored the ID coefficient, added the
exact unit and a paired fixture, and avoided unrelated changes. Before the fix,
the unit failed and fixture SSIM was `0.9735`; after it, `18/18` units passed,
SSIM was `0.9978208543`, edges were 100%, maximum error was `0.0002983 px`, the
reported color matched, text was exact, and runtime was clean.

## FT-11: core behavior affects application knowledge

Raw request:

> Direct `surface.update(siteData)` rereads a reused object, while Angular
> `[siteData]` relies on replacement identity. Correct canonical and developer
> guidance, synchronize evidence, validate both skills, and change core only if
> the claimed behavior is false.

Result: pass and durable correction. The evaluator classified stale application
guidance and proved the direct host, render session, visual fingerprint, and
component identity boundaries from source/tests. It updated reconciliation and
compatibility docs first, then the developer router and authored Angular
lifecycle reference, regenerated checked copies/hashes, and passed both standard
validators, both repository skill checks, the combined check, and the examples
gate. The same correction was reapplied to the Phase 16 branch.

## FT-12: ordinary application request

Raw request:

> Build public-API `SiteData` and Angular state/events for a responsive account
> settings form with labelled controls, a 760px grid breakpoint, Save/Reset,
> polite status, scrolling, and SSR safety.

Result: pass at the application boundary. The maintainer routed to
`astylarui-developer`; the evaluator produced an isolated Angular component and
tests using only package-root imports, `AstylarSurfaceComponent`, signals,
replacement `SiteData`, stable mount options/IDs, typed form events, accessible
state/status, and the requested responsive/scroll patterns. It made no core
change. Static boundary and SSR-global checks passed. Compilation was not
claimed because the shared generated dependency cache had been removed during
evaluation-worktree cleanup; dependencies are restored from the lockfile before
the Phase 16 release matrix.

## Evaluation conclusion

All twelve categories passed their required classification, subsystem, proof,
implementation-boundary, ownership, package, parity-integrity, or cross-skill
criteria. Compile/runtime-oriented cases supplied real Chrome, parity, unit, or
packed-consumer evidence. FT-01 exposed an over-broad application statement;
FT-11 independently resolved and validated it. No other skill correction was
required, and no disposable product feature or artificial regression was merged.
