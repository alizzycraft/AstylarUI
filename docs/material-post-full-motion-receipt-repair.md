# Post-full-harness motion receipt correction

The original 120-file run finished with 924 passes and three failures. One
failure occurred before the pending-motion test cases could run: its saved
CSSOM receipt still named the old parent survey hash. The independently
preserved [diagnosis](material-motion-parent-receipt-diagnostic.md) established
that the survey's findings had not changed, only a source fingerprint.

After that full run became terminal, the unchanged browser verifier was run
normally in generate and check modes. It checks six browser controls and
authenticates all 32 original dialog cases. The refreshed CSSOM report differs
only in `parent.sha256` and the recorded installed browser version:
`152.0.7977.76` → `152.0.7977.84`. Original captured cases, computed browser
control results, declarations, conclusions and verifier fingerprints are
deeply unchanged.

The binding now permits that precisely bounded receipt difference from its
frozen baseline, **then still authenticates the current parent and performs a
fresh real-browser `--check`**. A syntactically valid browser string or hash is
not sufficient to pass the full loader. Other fields cannot change under this
allowance. This records the installed browser honestly rather than pretending
the fresh proof ran on the historical version.

The dependent binding was regenerated. Compared with revision `a8880c8`, only
its source receipt hashes and its own script fingerprint changed. Both complete
rows, all 64 original observations and every conclusion are unchanged:
`660d4829b07b2cd5ed681b65fcf1648d5636a284588d4e9c32b449409872d8b5`
is the SHA-256 of the serialized complete rows. The canonical report is not
modified by this correction. No renderer or fixture behavior changed.

## Verification

```text
node scripts/verify-material-motion-cssom-capture.mjs
node scripts/verify-material-motion-cssom-capture.mjs --check
node scripts/bind-material-pending-motion-capture.mjs
node scripts/bind-material-pending-motion-capture.mjs --check
node --test tests/material-parity/pending-motion-capture-binding.spec.mjs
```

All commands exit 0. The focused suite passes **3/3** in **25,140.2296ms**, no
failures/skips/cancellations/TODOs. Its loader replays source membership and the
real browser; it includes the original 17 mutation rejections and 14 new
receipt-conservation rejections. Log:
`artifacts/material-parity/field-host-flow-input-audit/post-full-motion-receipt-correction.log`.

This repairs one audit-infrastructure failure, not Material rendering. The
original resolved motion, candidate computed/used gaps, and renderer causality
remain unproven. The prior diagnostic script deliberately reproduces the old
stale-receipt situation and is historical evidence, not a current green gate.
The other two full-harness failures require their own corrections and replay;
the complete current harness and enforced rendering matrix remain outstanding.
