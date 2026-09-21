# Audit verification checkpoint — 2026-09-21

Worktree: `AstylarUI-audit-integration`, branch
`codex/material-audit-alignment-integration`. This checkpoint follows `0b192b4`;
it does not declare audit completion or rendering parity.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run examples:check` | 0 | 11 current pairs: 8 parity-backed, 3 focused inline |
| `npm run skill:developer:check` | 0 | 12 synchronized sources, 118 exports, 11 translations |
| `npm run skill:maintainer:check` | 0 | 7 references and repository paths verified |
| `npm run capabilities:check` | 1 | Existing element-creation source fingerprint mismatch |

The catalog expects element-creation digest
`2edeb33f4095e3d3bb2be889991473e153df96f6d9a46ec9af94bbc56fa87d24`;
the checker computes
`bf5fd5861c7d1b412520a41abf5bfa0aa1085d9a139a96f3d202dde6cbf8ea3a`.
The checker normalizes line endings and trailing whitespace. Git reports no
substantive worktree difference for that file. This same mismatch is recorded
in earlier audit investigation evidence. No catalog receipt was refreshed to
make this check pass.

## Current bounded progress

- `b452ed6`: integrated the exact 395-source legacy inventory assertion;
  whole-suite assertion conservation and the focused actual assertion pass.
- `df0458c`: 17 visibility groups / 668 observations, including 138 tab/stepper
  owner-ancestry replays; three focused tests pass.
- `0b192b4`: public-package visibility support gap, supported-property control,
  current/installed interface comparison and a passing focused test.

These checks do not close the remaining canonical classifications. In
particular, the visibility support gap is not a diagnosis of the missing
snackbar or tooltip placement.

The second disabled-ink canonical regeneration remains running at this
checkpoint (`disabled-ink-canonical-regeneration-v2.log`). Its pending result
must be followed by complete scalar/control conservation against the accepted
pre-disabled-ink payload. The rejected first generation remains preserved in
`artifacts/material-parity/rejected-disabled-ink-first-generation`.

A fresh full audit-test discovery/run, complete enforced parity matrix, builds,
unit suite and consumer verification remain required. Prior interrupted runs
and focused passes must not be presented as those completed gates.

## Regeneration and bounded conservation completed

The second generation is now terminal. Exit 1 reports only the retained 1,689
unattributed resolved-style groups, with no source-binding failure. The v3
scalar/control conservation replay passed: all 8,483 scalar records are intact,
60 disabled-ink classifications change, and 48 line-box records change only an
independently verified module receipt. See
[the full transition record](material-disabled-button-ink.md).

The fresh complete legacy audit test file has now finished with exit 0:
**388 tests, 388 passes, zero failures, cancellations or skips**, in
**2,022,686.3083 ms**. It used the explicit single-file command:

`node --max-old-space-size=1536 --test --test-concurrency=1 --test-reporter=tap --test-reporter-destination=artifacts/material-parity/legacy-full-1795d21.tap tests/material-parity/input-equivalence-audit.spec.mjs`

Full TAP SHA-256:
`b2ebe17e3c6920a6bbb760fd8aa8c05ca693110528faa5c6aa7210782c01757c`.
The canonical builder and this test file were not changed while it ran. New
visibility audit modules added during the run have separate focused verification;
they are not implicitly covered by this legacy single-file result.

This is not the full discovered audit-test suite or the complete enforced parity
matrix. Those, remaining classifications, builds and other final gates remain
outstanding. A future canonical integration requires fresh affected verification.

## Full core unit suite completed after visibility wiring

`npm test -- --watch=false --browsers=ChromeHeadless` finished with **exit 0**:
**462/462 tests passed**, Chrome Headless 152 on Windows. Angular bundle
generation took 606.440 seconds; Karma reported 8.331 seconds elapsed test time
(8.023 seconds execution). The run emitted the existing proxied-root warning.

Full output: `artifacts/material-parity/unit-suite-2c595d3.log`, SHA-256
`63f8fcc658e5bacf7b4b4740cefe52aa2afe13db8d06ee780b774e023510ec1d`.
Core and its unit-test sources were not edited while it ran. Separate new Node
audit tests are not covered by this Angular/Karma result.

The visibility canonical regeneration remains live at this checkpoint. The
full unit result does not close canonical conservation, remaining attribution,
the full discovered audit-test suite, builds/consumer, or enforced parity gates.

## Library build completed

`npm run build:lib` finished with **exit 0**, without warnings in the captured
output. The configured `dist/lib` output did not exist before this run; the
parent `dist` directory was verified to be a real directory inside this worktree,
not a junction to another checkout.

Log: `artifacts/material-parity/library-build-a34586e.log`, SHA-256
`70e3529b8807eb1864edcf3b50bcbe741661d55e49bc56cbfd8bf0e58c95ffe8`.
This proves library compilation only. The application build was started after
this command completed; packed-consumer runtime and enforced parity remain
separate pending gates.

## Application build completed

`npm run build` finished with **exit 0**, prerendering two static routes in
651.646 seconds. It reported two budget warnings: the initial bundle is 6.83 MB
against a 2.00 MB warning budget, and `src/app/app.scss` is 4.59 kB against a
4.00 kB warning budget (595 bytes over). Neither warning was suppressed.

Log: `artifacts/material-parity/application-build-a34586e.log`, SHA-256
`0fec02b0520270f6bc95e937227afa38301b7d4c82520473088d78ec4ff1c377`.
The original execution handle returned exit 0. This is compilation/prerender
evidence only; consumer runtime, canonical conservation, remaining input
classifications and the complete enforced parity matrix are still outstanding.

## Packed-consumer check completed

`npm run consumer:check` finished with **exit 0**, packaging 419 files and
installing the tarball in a fresh temporary consumer (not a workspace link).
The consumer build produced browser and SSR outputs and prerendered one route
in 89.108 seconds. Chrome Headless 152 ran **4/4 passing tests** in 17.003 seconds.

Log: `artifacts/material-parity/consumer-check-f85d40b.log`, SHA-256
`415d6f11630ff62659f20c7fb81aec5f4ed0826416feb21d86fc469fbce8e6d6`.
Installation emitted deprecation warnings for `inflight@1.0.6`, `rimraf@3.0.2`
and `glob@7.2.3`. The logged `surface-disposed` error is exercised deliberately
by `examples/angular-consumer/src/app/style-inspection.browser.spec.ts:70`, which
asserts that inspection after disposal throws. It is not silently omitted from
this record. The check verifies package boundaries and these consumer scenarios,
not complete Material input equivalence or the enforced parity matrix.

## General enforced run: startup failure retained

The unfiltered `npm run parity:check` attempt at `88367da` finished with **exit 1**
before fixture execution. The harness could not fetch
`http://127.0.0.1:4300/parity/fixtures.json` within its 120-second development-server
startup window. This is incomplete matrix execution, not a fixture parity result.

Log: `artifacts/material-parity/general-full-88367da.log`, SHA-256
`b026d7a06220876361f8667d7d4a424d75acb5637bfb8d52e277fad8bc2c0a26`.
Before this attempt, all 1,245 existing general-parity artifact files were copied
to `artifacts/parity-before-full-88367da` and each copy's SHA-256 was compared
with its source. The original evidence is preserved.

A separately logged invocation of the same development-server command is now
being observed at `artifacts/material-parity/general-server-88367da.log` to
distinguish slow startup from a build failure. No timeout, fixture, or rendering
threshold was changed. Its startup result and any subsequent enforced rerun are
still pending at this checkpoint.

## General enforced parity completed: failing evidence preserved

The separate general development server completed compilation in 437.957 seconds,
explaining why the earlier 120-second startup attempt could not fetch its manifest.
After verifying that the served manifest matched the local 167-fixture manifest,
the unfiltered `npm run parity:check` used that server through
`ASTYLAR_PARITY_BASE_URL=http://127.0.0.1:4300`. No thresholds changed.

The original execution handle completed with **exit 1**. The report contains:

- 167 fixtures, 562 renders, four viewport profiles.
- Median SSIM 0.9958078395790046; minimum SSIM 0.9254554638330224.
- Edges within 2 px: 0.996352860724869; maximum edge error 444 px.
- All text matches and local sharpness matches: true.
- Runtime-clean, focused-threshold and completion-threshold flags: false.
- 98 render results contain 212 entries in `runtimeErrors`. That harness field
  also includes interaction/ownership assertions, not only JavaScript exceptions.
  Examples include `semantic-naming` update texture counts exceeding fresh-render
  counts and `semantic-anchor-navigation` differing scroll states.

Report: `artifacts/parity/latest-report.json`, SHA-256
`fc74ea4834c3ee6c3f07164bd197ce72b28586a9ee707b7cfcb357d6516588c0`.
Log: `artifacts/material-parity/general-full-prestarted-e62e846.log`, SHA-256
`163b4fbaa18081f834d0be283dea4b73c12d5a41dd45cbeaafc9fd61a9be96a2`.
Prior artifacts remain in the separately verified backup documented above.
This run is failed output-parity evidence, not proof of Material input equivalence.

The next TTS gate required dependency preparation: this integration worktree had
neither `examples/ai-tts-demo/node_modules` nor its local `astylarui.tgz` dependency.
A fresh package was placed at the previously absent local package path without
overwriting an existing file (SHA-256
`e7719b709ab515e26a05587f6ada036c1effdc7c2234a225a4c8ca11b1ae7901`).
Dependency installation uses `--package-lock=false --ignore-scripts --no-audit
--no-fund`; its completion and the enforced TTS gate remain pending. No package
manifest or existing lockfile was intentionally changed.
