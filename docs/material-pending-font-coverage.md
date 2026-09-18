# Pending font-size proposal coverage

This index accounts for all **98 unresolved `fontSize` groups / 1,831
observations** in the frozen canonical audit at `06e50db`. It is a coverage
join, not a canonical promotion or a new rendering proof.

| Source proposal | Groups | Observations | Proposed classification |
| --- | ---: | ---: | --- |
| Container measurement stages (`f5285a4`) | 63 | 1,150 | Harness defect |
| Leaf measurement stages (`9933ac1`) | 15 | 152 | Harness defect |
| Authoring inputs (`8591649`, font-size only) | 8 | 128 | Application/plugin authoring defect |
| Component and overlay ownership (`eaf2a32`) | 12 | 401 | Application/plugin authoring defect |

The [machine-readable index](material-pending-font-coverage.json) records every
canonical group, original case/state membership, complete-row digest, proposal
digest and committed source revision. It authenticates the entire compressed
canonical payload independently before selecting the pending font rows. Each
working proposal must equal its pinned committed source. Gaps, cross-plan
overlaps, changed rows, changed membership and stronger claims are rejected.

The source proofs remain in their respective reports. Reading those committed
proposals is **not** a fresh replay of their underlying browser/source proofs;
the index explicitly records `underlyingProofsReplayedByThisIndex: false`.
The focused test's small synthetic fixtures exercise rejection logic only;
the separate CLI check authenticates and joins the actual full payload.

## Verification

```text
node --max-old-space-size=512 scripts/audit-material-pending-font-coverage.mjs
node --test tests/material-parity/pending-font-coverage.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation passed. The suite, including independent no-write CLI replay,
passed **9/9**, zero failures/skips/cancellations/TODOs, in **83,522.7056ms**.
It includes **42 negative controls** for missing/overlapping membership,
complete-row or evidence changes, classification changes and stronger claims.
Log: `artifacts/material-parity/field-host-flow-input-audit/pending-font-coverage-focused.log`.
Report SHA-256: `eafe2864f5b6589d45ec14d7c2ccd410f2fedbfb993d59264cc3e0de4b0eec10`.

Discovery now includes 129 files: 121 Material, four general and four TTS.
The original live full-harness run selected 120 files before this addition;
this focused pass does not retroactively extend that run.

## Remaining work

The canonical audit still has **2,160 unresolved groups**. These font proposals
must be independently integrated with prior-review precedence and unrelated-row
conservation before the canonical count changes. Other properties, the complete
current harness and enforced rendering matrix remain outstanding. This index
does not establish whole-element input equivalence, rendering equivalence, a
renderer cause, or completion of the overall audit. No renderer or comparison
input was changed.
