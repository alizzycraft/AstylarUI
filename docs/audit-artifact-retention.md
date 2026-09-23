# Audit artifact retention

## Current versus historical evidence

The latest completed full Material output run is
`artifacts/material-parity/enforced-full-e26c6cb`. Keep it independent of archived
evidence. Passing output parity does not establish input equivalence.

Older captures referenced by findings are historical evidence, not alternative
current results. In particular, `current-ancestry-audit/latest-report.json` is
hash-pinned by the input-audit collectors. Do not replace its contents with a
newer run merely to reduce the number of directories.

## September 23 storage cleanup

The integration worktree's `artifacts` directory is a junction to
`D:/dev/github/AstylarUI-material/artifacts`. Changes affect both worktrees.

Byte-identical files in five historical full captures and repeated diagnostic
captures are consolidated into one physical object per SHA-256 under
`artifacts/material-parity/retained-evidence/objects`. Original paths remain
ordinary hard-linked files, not symbolic links. This preserves file contents,
hashes, real-path containment checks, checkpoint paths, and historical citations.
Different bytes are never combined, even when the filename or reported result
is the same. The current full run is excluded.

The retained `compaction-manifest.json` records each object's hash, byte length,
and every original path. Its aliases are read-only: **never overwrite archived
captures in place or clear their read-only attribute**. A new capture must use a
new run directory. To intentionally edit a historical copy, first copy it to a
separate file/inode; otherwise all hard links share the edit.

The compaction plan identifies 2,198,590,679 redundant bytes in 11,054 groups.
Compaction removes redundant physical copies; it does not remove findings,
historical paths, unique failures, or the ability to replay old evidence. An old
uncompressed pre-stream report and the five historical summary reports are also
transparently NTFS-compressed, without changing the bytes returned to readers.
Their combined 874,375,706 logical bytes occupy 279,498,752 bytes after compression.
The five summary-report hashes were checked before and after compression.

Verify the retained paths and hashes without rebuilding the audit:

```powershell
node scripts/compact-audit-evidence.mjs verify artifacts/material-parity/retained-evidence/compaction-manifest.json
```

The tool writes recovery metadata before replacement, checks source hashes
against its plan, and verifies aliases against the retained object. Interrupted
applications can be resumed with `apply` and the same plan. A stale or changed
source is rejected instead of silently replaced. This mechanism is for closed,
immutable evidence only, not active harness output, dependencies, or source code.

## Retention rules for subsequent work

- Keep one current complete output run, separately from the pinned input-audit
  baseline and unique supplemental/root-cause evidence that findings require.
- Do not repoint an old finding at newer evidence without proving that its
  required inputs, state, observations, and provenance remain equivalent.
- Preserve failed-case evidence and the relevant logs. Keep only the required
  case evidence from superseded runs once reference closure is established.
- The five box-sizing, field-host and owner-gap scratch producers that previously
  retained every successful capture now remove successful scratch and retain failures.
  Their historical copies remain deduplicated evidence, not independent findings.
  See [the audit working procedure](audit-workflow.md) for commands and limits.
- Before deleting a retained object, check its manifest aliases and all consumers
  across both worktrees. Age alone is not a deletion criterion.
- Size tools that sum every pathname will overcount hard links. Measure unique
  file IDs or volume free space to assess physical storage.

This cleanup does not change renderer behavior, classifications, thresholds,
reference input, or canonical audit conclusions. It does not assert that every
old run is unnecessary or that the input audit is complete.

## Verification outcome

- Compaction completed: 11,054 objects, 62,621 original paths verified against
  their planned SHA-256 and shared file identity. No captured bytes were lost.
- Storage/retention and checkpoint tests: 6/6 passed.
- Existing source replay: all original 156 slider native owners reproduced;
  the focused test passed in approximately seven seconds.
- The initial unfiltered slider binding test was stopped because its later
  tests rebuild the production audit. It is not reported as passing. The focused
  retained-source test above is the relevant check for this storage-only change.
  Its synthetic `slider-box-binding-FM6uK1` scratch directory remains (five files,
  7,521 bytes): the environment rejected the inspected, scoped deletion. It is
  regenerable test input, not original captured findings.
- D: free space increased from approximately 3.63 GiB to 6.30 GiB. This is a
  volume measurement, not a sum of hard-linked path sizes.
