# Fresh reference context for retained chip/tab motion requests

The [machine survey](material-caret-motion-context-survey.json) records fresh
browser-resolved motion for all **10 groups / 362 observations / 146 original
cases** retained by the [original declaration review](material-owner-caret-motion-review.md).
It does not replace missing historical measurements, replay the candidate, or
change canonical classifications. The original 2,278 unresolved groups remain.

## Measured distinction

| Population | Cases / observations | Fresh result at the original request owner |
| --- | --- | --- |
| Two chip hosts | 76 / 152 | `transition-property: all`, duration `0.001s`; `animation-name: none`, duration `0.001s`. |
| Two tab labels | 70 / 140 | Both the tab-list and text-label ancestors resolve to `transition-property: none`, duration `0s`, and `animation-name: none`. |
| Tab panel | Same 70 / 70 | Both wrapper/content request ancestors resolve to `transition-property: none`, duration `0s`, and `animation-name: none`. |

Every measured leaf reports `transition-property: all`; tab leaves have duration
`0s`. Those leaf values are **not** substituted for the ancestors carrying the
original declarations. The report separately retains each request owner's node,
source rules, fresh motion, caret color and text color. There are 420 tab
request-owner entries (some shared ancestors repeat across observations).

No active animation targeting the measured leaf was present at any capture
boundary. This is not a claim that there were no animations elsewhere or between
boundaries. Nor does it make the chip `all` target unrelated to caret/color.
The chip requests remain broad; the tab result establishes fresh cascade outcome
for the frozen reference, not the historical value of unrecorded longhands.

## Reproduction and provenance

The capture reuses the original runner's eight interaction/theme/settlement
functions, extracted by TypeScript AST with exact source hashes. It uses the
original checkpoint's case, state, theme, viewport, DPR and held-release boundary.
Static cases await fonts, animations and two animation frames. Interaction cases
reuse the runner's settlement procedure, and held cases are captured before
releasing the pointer.

The 146-case population includes light, dark, contrast and custom profiles;
desktop 1440x1000 at DPR 1/2, tablet 768x1024 at DPR 1, and mobile 390x844 at DPR 2.
State coverage is the exact original retained population, not a newly invented
Cartesian product: static, selected, disabled, hover, held, focus, activate,
activate-alternate, activate-leave and open-dismiss, where present for each family.

Chrome **152.0.7977.76** matches the original checkpoint. Each case verifies the
served document, scripts, stylesheets and fonts against its pinned build and
rejects runtime errors. The frozen reference server was `http://127.0.0.1:4431`;
its build and original checkpoint were not overwritten.

For every observation, the independent reader authenticates the original scalar
input and both original tree digests, rederives its complete caret/declaration/
ancestry proof, and compares the fresh proof with the original. All **32,218
original scalar comparisons** (362 x 89) match. Nine newly captured motion
properties remain separate from those original scalars. Complete fresh DOM
ancestry through body/html is retained in raw evidence, and request-owner motion
is independently joined through the original ancestry path.

The first reader attempt exposed a JSON-boundary mismatch: the synthetic
candidate root has `type: undefined` in memory, which JSON omits. The reader now
compares saved proofs against the exact JSON representation while still comparing
the two live proofs directly. No input tree is rewritten. Negative controls
reject replacing that omission with either `null` or a fabricated type.

## Commands and results

Capture command (already completed; a repeat must use a new output directory):

```powershell
node scripts/capture-material-caret-motion-context.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/caret-motion-context-audit-v1
```

Completed with exit **0**, 146 cases and 362 observations. Raw manifest SHA-256:
`8a7f6470b9754572259cd2f59bc1653c88a6aad3c33aaeaf8ef80ce48a82a4a6`.
Its per-case descriptors bind complete fresh trees, original proofs and runtime
assets. The manifest also binds the capture script and eight supporting sources.

```powershell
node scripts/audit-material-caret-motion-context.mjs
node scripts/audit-material-caret-motion-context.mjs --check
node scripts/check-material-caret-motion-context.mjs
```

All three finish with exit **0**. The no-write replay matches the complete saved
report. **29 negative controls** reject altered membership, source/functions,
browser, original proof, owner mapping, original styles, motion/context mismatch,
ancestry, state/DPR, runtime assets/errors, held boundaries and fabricated claims.
**Two changed-observation controls** show that a consistently changed fresh motion
measurement or newly active owner animation remains reportable instead of being
normalized to the expected result. Controls modify only in-memory copies.

Machine report SHA-256:
`b5acf7517f2ed9840607b151af81ec6fc5c461761cafedb057e903efcb327c51`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-motion-context-capture-v1.log`:
  `b818016091f4b701a6c47bb5bbd0ddc824546c1fbc3b5a1834a5c5e61eb559fd`.
- `caret-motion-context-record.log` and `caret-motion-context-check.log`:
  `2a5a11c939b798e6c42fa63609cbe63c4aaa6c80c67e2a561d4dfa336a773b0b`.
- `caret-motion-context-controls.log`:
  `4610c3d9af39f144c31104965b7feb4f503246ea54b2b48e00fdec32d4cac58a`.

## Remaining work and claim boundary

These standalone checks do not join the already-running 110-file harness or
change its dependencies. Their later integration and the complete enforced
parity matrix remain outstanding. No renderer, plugin, canonical comparison,
canonical audit classification or reference input changed.

The next attribution step must retain both the original declaration uncertainty
and the distinct fresh reference context. In particular, do not mark chip `all`
transitions equivalent to omitted candidate motion. Candidate computed caret,
editable descendants, temporal paint and the reported missing empty-input caret
remain unproven by this non-editable-owner reference survey.
