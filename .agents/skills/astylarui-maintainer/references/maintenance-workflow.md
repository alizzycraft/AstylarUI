# Maintenance Workflow

Use this reference to move from a report to a bounded, defensible change.

## Contents

- Classify before editing
- Build a minimal reproduction
- Select the owning proof
- Implement a general correction
- Select proportional gates
- Review before commit

## Classify before editing

Ask what evidence would distinguish these outcomes:

| Classification | Maintainer response |
| --- | --- |
| Application-authoring error | Explain and prove the public correction; route to `astylarui-developer` |
| Intentional difference | Confirm the checked contract and document the supported Astylar pattern |
| Unsupported behavior | Keep the gap explicit; propose supported composition/plugin or scope a future core feature |
| Application-plugin opportunity | Use public plugin APIs; do not add a one-off core branch |
| Stale application guidance | Correct canonical evidence and synchronize the developer skill |
| Public API defect | Add package-root/consumer proof and make an explicit compatibility decision |
| Core defect | Add failing core/parity proof and fix the owning invariant |

Do not infer a renderer bug from visual surprise alone. Check the installed
version, catalog classification, public types, authored IDs, selector/value
support, host/canvas size, settlement, and diagnostics first.

For a packed local Angular consumer, the installed files are not sufficient
evidence that the running application uses them. A replacement tarball can keep
the same package version while Vite reuses an older optimized bundle. Stop the
consumer dev server, clear its `.angular/cache`, restart it, and confirm a
distinctive changed symbol exists in the served JavaScript before reproducing
or closing the report.

## Build a minimal reproduction

For browser parity, reduce to:

- one `ParityFixture` with a stable ID/category/expected behavior;
- minimal `reference.html` and `reference.css`;
- equivalent serializable `siteData` with the same content and material values;
- only measurement IDs needed to prove the discrepancy;
- named desktop/tablet/mobile viewports only when responsive behavior matters;
- dynamic or interaction steps only when state transitions are essential;
- semantic IDs only for an accessibility claim.

Application-scale evidence may precede that reduction when its source commit,
state adapter, assets, fonts, viewport/DPR, and settlement boundary are pinned
and deterministic. Use it to locate the failing category, then reduce the
discrepancy to the owning minimal fixture. Confirm the metric can detect the
claimed defect: geometry for position/size, explicit visibility and scroll
reachability for overflow, and focused edge-sensitive crops for blurry text or
one-pixel lines. Never describe a report-only diagnostic baseline as accepted
parity.

Register a new fixture in both `src/parity/fixtures/index.ts` and
`public/parity/fixtures.json`. Keep browser reference output authoritative and
never mask a meaningful region. For a public API/package problem, reduce in the
maintained Angular consumer using only `from 'astylarui'` imports.

Run a focused parity case with:

`$env:ASTYLAR_PARITY_FIXTURE='<fixture-id>'; npm run parity`

Remove the environment variable before the full run. A focused pass is not
release acceptance.

## Select the owning proof

Prefer the narrowest evidence that can fail for the right reason:

- pure calculation or validation: focused service/unit spec;
- Angular DI, component, injection, or SSR lifecycle: TestBed/component spec and
  production build or consumer SSR/prerender;
- Babylon allocation/cleanup without raster output: NullEngine-backed unit spec;
- real input, focus, semantic, font, canvas, or WebGL behavior: Chrome test or
  parity fixture;
- public types, exports, package contents, peer resolution, or clean install:
  `build:lib` and `consumer:check`;
- HTML/CSS compatibility claim: paired fixture or focused executable proof plus
  `capabilities:check` and `examples:check`;
- application-skill claim: canonical evidence, synchronized references, and
  both skill validators.

Confirm the existing check observes the changed behavior. A green test in an
adjacent subsystem is not evidence of the requested outcome.

## Implement a general correction

Before editing, state the invariant in one sentence and identify its owner. Keep
the patch narrow enough that every changed line supports that invariant.

- Extend typed authored data only when the feature is public and serializable.
- Keep parsing/cascade decisions in style services, used-size decisions in
  dimension/layout services, pixels/materials in paint services, and lifetime
  in session/resource owners.
- Preserve stable authored identity across compatible updates and replace
  incompatible owners.
- Stage asynchronous or visual ownership and commit only after success.
- Report invalid public input and lifecycle misuse through typed diagnostics.
- Keep browser-only work behind the existing Angular/browser lifecycle.
- Add an API only when the consumer cannot solve the requirement through the
  existing public contract.

If the smallest correct fix is large, split enabling refactors from behavior in
separate commits, preserving green proof after each increment.

## Select proportional gates

Use the affected-domain matrix:

| Change | Required focused evidence | Add before completion |
| --- | --- | --- |
| Document/diagnostic | owning unit specs | full unit suite |
| Style/default/selector/media | style spec plus focused fixture | catalog/example checks and full parity |
| Layout/position/table | calculation spec plus focused fixture | unit suite and full parity |
| Paint/text/assets/clipping | service spec plus real-browser fixture | unit suite, builds, full parity |
| Controls/interaction/semantics | manager/runtime spec plus interaction fixture | unit suite and full parity |
| Reconciliation/resources | session/resource spec plus lifecycle fixture | unit suite, consumer when public, full parity |
| Angular surface/SSR | component/isolation spec | builds and consumer check |
| Plugin system | registry/runtime/host/document specs | build:lib, consumer check, compatibility checks |
| Public API/package | declaration build and consumer case | all builds and consumer check |
| Compatibility/application guidance | canonical source and verified example | capability/example and both skill checks |
| Parity harness | harness self-consistency and representative focused fixtures | enforced full parity |

Run `npm test -- --watch=false`, `npm run build:lib`, `npm run build`,
`npm run consumer:check`, `npm run capabilities:check`,
`npm run examples:check`, both skill checks, and `npm run parity:check` for final
release acceptance. Do not run the full expensive matrix after every local edit.

## Review before commit

- Inspect `git status`, the complete diff, and `git diff --check`.
- Confirm no unrelated user changes were overwritten or included.
- Check that a new fixture is registered in both manifests.
- Check that new public types are exported only deliberately and compile from
  the package root.
- Search for unowned `new` resources, observers, listeners, timers, promises,
  and child injectors.
- Confirm failure paths dispose/cancel staged work and preserve original data.
- Update canonical compatibility and downstream skill evidence when observable
  behavior changed.
- Record commands, exact results, limitations, and any accepted warnings in the
  current scorecard.
- Commit one coherent outcome only after its focused proof passes.
