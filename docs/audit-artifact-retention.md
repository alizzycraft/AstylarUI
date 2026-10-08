# Audit artifact retention

## Current versus historical evidence

The latest completed full Material output run is
`artifacts/material-parity/current-full-20261005`: all 436 static cases pass,
but five of 1,875 interaction cases fail. Retain this current failure evidence
independently of the pinned historical input baseline. The previously passing
`artifacts/material-parity/enforced-full-2b6cddc` remains historical evidence;
do not delete it without checking its consumers. Passing output parity does not
establish input equivalence.

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

October8 publication headroom was recovered without deleting original evidence:
nine closed docs JSON records and closed Menu diagnostic JSON files were
transparently NTFS-compressed with individual before/after SHA256 equality.
One exact228653-byte regenerable EvidenceSession cache envelope was evicted;
no capture was removed. Five historical working-index generations (62c0d373,
3074b9bf,a02593c0,12a3cc97,31cb7dad) then had84 shards each compressed and
their complete packages/indexes verified by existing verifyFindings. After
successful cold canonical check/import,current0ed2f027 and historical401b79a1
were similarly compressed/verified. Current pointer whole-index verification
also passed after compression. Full generation IDs,commands/results and
headroom measurements are in material-state-coverage-inventory.md. All paths,
decoded bytes,hashes and original/failure evidence remain unchanged; this is
storage conservation,not whole-audit acceptance or permission to overwrite
archived aliases. Recheck free space before each publication/capture.

October7 canonical publication headroom: eight closed docs JSON evidence files
larger than10MB were transparently NTFS-compressed, with individual SHA256
equality checked before/after: owner-grid-initial-survey,owner-initial-motion-
review,vertical-align-population,container-font-stages,transform-origin-stage-
survey,container-font-family-stages,owner-caret-attribution,text-align-ancestry
(all material-prefixed). D: free increased from approximately88MB to183566336
bytes. New divider compact generation JSONL shards were likewise compressed;
the existing whole-index verifier passed before and after, authenticating every
shard against its unchanged receipt. Free after import/compression91348992 bytes.
No evidence was deleted, repointed or changed; old generations remain retained.

October7 publication-headroom recovery: the closed current-full-20261005
`latest-report.json` was transparently NTFS-compressed in place. SHA256 before
and after was identical:
`ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62`.
Its127,722,972 logical bytes occupy39,755,776 physical bytes; observed D: free
space rose from38,273,024 to125,976,576 bytes. No content, paths, references,
original/failure evidence or current/historical status changed. This is not
scratch deletion or proof of sufficient space for a new full capture. The
subsequent read-only Icon report replay authenticated the same report hash.

October 6 disk-exhaustion recovery: two existing top-level logs were NTFS
compressed in place, without deletion, path changes or content substitution:
`audit-harness-5028979e.log` (SHA256
`38ee7c9d8c5085d9b4b740602f12df0b23089ca3cbc59c37f8e3567f2c053c2c`)
and `full-audit-harness-834258e.log` (SHA256
`2558acd41287a0d8d1bf087839eef58970fa15a9b556d7f0fbe50fa115253fa2`).
Both hashes matched before/after. Their116,900,879 logical bytes now occupy
36,388,864 bytes; observed D: free space rose from3,047,424 to83,079,168 bytes.
This is a small operational recovery, not sufficient headroom for full capture
or canonical publication. No original or failure evidence was removed.

The range-default original installed package metadata is required provenance,
not disposable scratch. Its exact bytes are retained at
`artifacts/material-parity/retained-evidence/range-default-package-source/package.json`
and preserved portably in `docs/evidence/material-range-default-package.json.b64`.
Both decode/read to the original SHA-256
`4e1038f17f7d51879a3e513db3ddf4b92a3521369645e7378affe6038f71441d`;
do not normalize its mixed line endings or overwrite it with current metadata.
The historical launcher uses the checked-in encoding, so replay does not depend
on the continued availability of npm's cache or a dangling cache reference.

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
