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

The fresh complete legacy audit test file is still running in
`legacy-full-1795d21.tap`; partial output is not a full-suite pass.
