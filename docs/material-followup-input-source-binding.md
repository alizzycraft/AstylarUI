# Follow-up findings: exact original-case binding

This adapter prepares the four source-proven finding sets for the live audit.
It is not yet wired into the production classifier and does not promote the
canonical report or change renderer/fixture behavior.

The adapter pins the complete binding to `11bd538` and its independently
verified metadata transition to `a30dfa3`. It executes the [fresh source
replay](material-followup-input-source-replay.md), authenticates the supplied
capture as an exact original subset, and uses the existing tested metadata
projection rather than a new interpretation of raw style values.

Every eligible property observation retains its exact case, owner, raw value,
input hash, source proof and original complete-row identity. A partial capture
lists every missing case/observation and cannot claim full coverage. A changed
caller, capture, scalar, membership, source proof or transition cannot acquire
the reviewed classification. Emitted-row checks derive expected membership
from authenticated source observations, not whichever rows remain in output.

The full population is **66 groups / 2,640 observations** across **2,311 original
cases**. These classifications explain measurement-stage or owner-mapping
errors and omitted authored inheritance. They do not prove equivalent inputs,
physical font selection, rendering parity, corrected expansion mapping, or a
renderer cause. The frozen full-payload join is explicitly not replayed by
this synchronous path; its previously verified provenance is retained.

## Verification

```text
node --test --test-concurrency=1 tests/material-parity/followup-input-audit-source-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Initial run: **8/9**, with a failed negative control that reversed a one-element
interaction list and therefore did not mutate it. The corrected fixture uses
two original observations per set and asserts that each negative control
actually changes its input. No production assertion was relaxed.

Corrected full run: **9/9**, exit 0, **47,469.5516ms**, zero failures, skips,
cancellations or TODOs. Actual complete source binding and independent
validation run with writes prohibited. There are 18 projection mutations,
14 emitted-row mutations, and exact classifier-argument rejection checks.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`followup-input-audit-source-binding-focused.log` (initial 8/9) and
`followup-input-audit-source-binding-corrected.log` (terminal 9/9).

## Remaining work

Wire this boundary into the live builder without overwriting existing reviews;
verify complete-row conservation and exact classification precedence before
canonical promotion. The actual canonical count remains **2,026 unresolved**;
the verified in-memory projection remains **1,960**. Other classifications,
role-correct expansion recapture, the full current harness and enforced parity
matrix remain outstanding. No completion or parity acceptance is claimed.
