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

October14 fresh-divider-layout receipt review:retain the original direct test
failure `divider-fresh-layout-receipt-direct-20261014.log` (SHA
33e184fcb3be2eb243b78f87947ed374a12bac68a6341b1560a190ec1fa72cd7) separately
from `divider-fresh-layout-receipt-applicability-20261014.log` (SHA
e76be314d1ea9c16d9559cc5b0087d7b2d07bbbc9c4848eddb686a193d412943).
The latter replays every original assertion using only the authenticated Git
ad7133cd probe receipt;all other reads remain actual and two source forgeries
reject. It does not replace the failure or prove current browser acceptance.
No original capture or source was rewritten;both commands are terminal.

October14 divider semantic case-join headroom: six closed historical proposals
were transparently compressed in place,all complete before/after hashes equal:

- b10f406b6ae3fd7fbe948b3b1eafa3729350f99fe288f7fe9d213754fc38921b:
  fileSHA4591abc58c16c2f0441c1e7cc584fba236501bef3ccdbf4c527b657ff931a65a.
- 7235bd46a7857f9a9d4ce2b336e8f27cb0756382359b7d408d759e138c866d1e:
  fileSHA14dbe46c2298a41840d9bc7ee51ceb980c1a5514f9319ee3af9bd79baf3d8f4f.
- 001ff5aa79bff133e1ca24e2271be14807729e1811679aa74eb027620fa77d6b:
  fileSHA878aad8f4b8f9f22d7b8bf387bd535fb2310c5537087fb4ed155f4e6db6e67c0.
- ff6feb918dc14e15204f703429d98fb17a915e3648375d94fe084d0991f20f55:
  fileSHA90e49b398bf583f6e95ff39ffdaa8a9dc4786c600636dbd8263bacdbf5e6f72b.
- 143387182831d369523cd46aa152ee3ba576fa7cfd4d5d54368e53482bf1e546:
  fileSHAc144a1590e8f3c4f2737b272699364cc1d98f4d5e6ea440d147b317acd05696c.
- a9c9e0bcba22944e662c47aa23d010c6e2e51803e94a2e56003f3cd9f89dd5c5:
  fileSHA86f50a9c796584c1afdc48185f872f99f53ef156de8ba64edc6b516d50bd57bc.

462832132 logical bytes occupy253677568 physical bytes. First-three observed
D:free87306240→195592192;later-three56963072→157560832 during the live
integration. No originals,failures,paths or pointers removed. New f56f4ca7
proposal is immutable required evidence;85134492 logical/45539328 physical bytes,
fileSHA7c3364dd5a9048388ab630340e3fd2be98420943fda3ee65516714da9da1ecdd.
The existing loader validates all9807 dependencies/2311 records. Original
divider-semantic-case-join-integration-20261014.log is now closed successful
coherence evidence:1/1,zero skips,exit0,844532.0851ms;SHA
7429b147bbc145e486e57eca415dae5eae7483b4fd838d1e3c31afd7271b96de.
It reproduces exactf56f4ca7/2311 cases. Retain it with that proposal. The separate
divider-caret-canonical-export-20261014.log is now closed successful export
evidence:exit0,3189735.751ms,SHA
eb11e92653f9dbc30d11f356822507354addb6462e63c78b9fcefaf62aecb293.
Retain it with candidateb246c590;export alone is not independent acceptance.
divider-caret-canonical-cold-check-20261014.log and
divider-caret-package-row-delta-20261014.log are active verification output;
do not compress/delete or restart them. No cold/conservation result is inferred.
Observed D:free5117739008bytes before the row census;recheck before publication.

October14 divider companion AX capture is required new semantic evidence,not
successful scratch. Retain `divider-companion-ax-20261014/checkpoint/manifest.json`
(SHA380c529b8e5ced00aa45281b8956a6860a8c1a2163ff0192eb38f036d7f7925f),
the standard/comparison observation directories,and both top-level logs:
`divider-companion-ax-standard-20261014.log` (SHAf01e63a7285143b7f0f1f73de3979cca321575b5f32840f7e861d2fae8701901)
and `divider-companion-ax-comparison-20261014.log` (SHAffa9a7fc91f2ed11c57c63f249759b47d61dfbf7acf06d42951bc3e61f921505).
The fresh checkpoint records actual Chrome155/launch/served files and current
probe graph;it does not replace the historical target/ancestor checkpoints.
Initial graph preparation failed before creating a checkpoint;no failed capture
directory or original evidence was overwritten. Both capture jobs are terminal0.

October14 caret-classification proposal refresh:the first atomic save failed
ENOSPC and left a zero-byte
`working-audit/proposals/0c7da19a475c9c696bf50cac17ce5992c7d68822f06981e5af434a4f5bef1588.json.32380.tmp`.
It remains failure evidence,not a proposal. Setting directory compression did
not establish sufficient write headroom. Four closed historical proposal JSONs
were subsequently compressed in place;every complete before/after SHA256 agrees:

- cd40d24749d1de9a93cc5f99c48a57182f8f4df9caadd898305d621367129b45:
  fileSHA8801fd77d9c33f9ef1b6c1a0403bf61130d51c16b6469c106cee2d8d107a535e.
- 63b15bc76f1e99ecf1d9031d56ed4572dde5ee7095c4dfa673eec79359e8e6fd:
  fileSHAead09221c952846292a6fb2398c9a4ffa9e7193a80d15e983886182121364220.
- a1d7bff1ed19bfd90b32746d902586f92004961a64d17ef27d58702eeebcdf4d:
  fileSHA2ad97256e0b66049dda085f2a1f267815dddc7b3aa1a4a85217edb7c6b2abea7.
- 48cda88c8ed456b633d43b786f1b5f7d32d204ac62acc30b1a1a7952bc37211e:
  fileSHAc37ab5fc7483a16ce972623deec32e2f3835ce090d1039159c5d70fc7312d248.

322997731 logical bytes occupy174809088 physical bytes afterward.
D:free86016000→234196992bytes. No originals,failures,paths or pointers removed.
Retry through existing saveReviewProposal and loadCaseObligationReview succeeds:
new0c7da19a proposal authenticates9803 dependencies/2311 cases with all fields
conserved except528 policy/40 benchmark receipts. Complete file hash
3a6637e21ea631118c2dc76972278d2fe3a2100130862ed00c7988391bc17762;
83841274 bytes,compressed attribute set. Free104693760bytes after verification;
recheck before canonical publication or any browser capture.

October14 push headroom:closed predecessorcafd50205a10db91363ef8239a50a4d9471e0a1c65ae7b5e348d0702f82de8d4
index.json plus84 JSONL shards were transparently NTFS-compressed after existing
whole-index verification. Every85 individual before/after SHA256 agrees;complete
verification afterward preserves8483/157/39904/389202/0 counts and original index
b7453931108df2d21105c6782c6980fb98e106fc2f1dcac8c5c473c587d2e05e.
D:free71090176→151523328bytes. No old evidence,paths or current pointer changed.
The first package pushHTTP408 was a transport failure,not attributed to disk;
the unchanged retry later succeeded. No originals/failures deleted.

October14 progress/caret verified compact generation2e196c48d05935424c0726c6bb4df4086944fdd9f614eeb46f0a4f38f2d7f095:
after terminal cold comparison and import,its index.json and84 JSONL shards were
transparently NTFS-compressed. Every85 individual before/after SHA256 agrees;
existing whole-index verification passes before/after with8483 scalar groups,
157 source findings,39904 controls,389202 occurrences and0 unresolved groups.
Index SHA68371c51bf63c1b0e0d5b9011933aee410ae080f245bc390670d3a92794c0364
and pointer/evidence bytes remain unchanged. D:free50032640→130748416bytes.
No original capture,failure log,previous generation or path was removed/repointed.

October14 progress/caret export headroom: four closed proposal JSON files under
working-audit/proposals were transparently NTFS-compressed in place:6bfe953b,
2df59a35,ab27d795,ae1e75bd (full names remain their review digests). Every complete
file SHA256 agrees before/after;334625298 logical bytes occupy180154368 physical
bytes. Observed D:free173584384→327782400bytes. No captures,failure evidence,
paths,canonical package or working pointer were deleted/repointed. Existing
loader afterward authenticates ae1e75bd's2311 cases/9803 dependencies;its complete
file SHA256 remains919879f853c2cedb59914f73a4b0e52fdf8a5ee38c8b2ad1006a2bc5f3b4c23f.
Previous proposals retain historical proof-source receipts,not current applicability.
Recheck headroom before import/publication;this is storage conservation only.

October12 zero-space interruption: one regenerable EvidenceSession envelope
40711e0953a9d8f4e1535e838e76cb325b4e45d9b1280b16de93362b5d1df514.json
(228653 bytes) was removed after its envelope digest/key and all963 dependency
paths were checked. No original capture or failure evidence was removed.
Compression attempts against closed index/log files failed with insufficient
space; do not claim they recovered headroom. Per-log before/after hashes agreed.
Subsequent existing whole-index verification exits0 for generation2fef5644:
8483 scalar groups,157 findings,39904 controls,389202 occurrences,0 unresolved.
Observed free space later6090838016 bytes is an external volume change,not
attributed to this tiny eviction. The original export session/process disappeared
without a retained terminal log and canonical bytes remained unchanged; its
outcome is unverified,not a pass. A separately logged complete-baseline retry
uses coherent195-option-batch-export-retry-20261012.log and remains live.
Retain its result before independent cold comparison/import; do not restart a
live collector merely because its build phase is quiet. Scope/criteria unchanged.

October9 description-batch publication headroom: eight closed historical
working-index generations below each had84 JSONL shards transparently compressed.
Existing verifyFindings passed before/after for every complete index; all672
individual before/after SHA256 values agree and index bytes are unchanged.
Current eb90958e pointer/package was excluded; no capture, source evidence,
failure log or historical path was deleted or repointed. Observed D:free
38080512→307998720bytes. This enables the coherent description-batch export,
not new browser capture or audit acceptance. Generation IDs:

- 5c64ce52b07ac3e27e5405d66fede10c937adc3bb02dee8434bc3d126f08454c
- 65c72350ed907939fbbbdae030f4aebcb7e83f1039de66fb4b3cb2c747a30c56
- 6f0a4c1c3c214695abe87bb185f6c6c392acd5fa6452d2315891854f85cc9de9
- 6ffdc6e1dfc319c44235aa149d837c6558c8d7d7b60f8d2e827a884337d823fe
- 77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752
- 7793336da954e94fd2f03ff48a92a1d3a174f545532f631baf00df805b80216e
- 78ed94a2e6c8ff322a344cfdd583f3aa65a94cf94d3c2f944b1de0c0a6807161
- 7ee36a2c3716d39b0194e5c1e2dead7ef5ae3786f8724dd70814a38e37d6cc69

Their source finding/unresolved counts respectively remain historical
145/0,134/1507,134/180,138/0,134/1224,132/1654,133/1595,132/1668.
All retain8483 scalar groups,39904 controls and389202 occurrences.

October9 accepted standalone canonical import: new closed generation
eb90958ea9de87ed6c4c32d7ffc5b30c4d3251ce696d90782673b36047504382 had84
JSONL shards transparently compressed after successful independent cold check
and import. All84 before/after SHA256 values agree; whole-index verify passes
before/after with153 source findings,8483 scalar groups,39904 controls,389202
occurrences,0 unresolved. Pointer/index bytes unchanged by compression. Observed
free99581952bytes afterward; recheck before publication. Original/failure captures
and previous index generations remain retained; no acceptance criteria changed.

October9 independent-check/import headroom: three closed historical working-index
generations4880964fc1018a1fd6409f7c7af2ddaa5fc21a82e45dab3a0cc5fce5a6019156,
4ddf218eb8caa20408c06a300568e7a8a17dcc2bbe5ebbc0527030846127776d and
5998d72bd0310ff4ddd8d3a44954fa5ade6655abb506f2bb85baa4935c3792d0 had84
JSONL shards each transparently compressed. Every252 before/after SHA256 agrees;
existing verifyFindings passes before/after for each complete index (historical
134findings,unresolved286/1408/715 respectively,not current counts). Observed
D:free15196160→202432512bytes; volume change is not claimed solely attributable
to compression while another process runs. Current pointer,canonical data,
capture bytes,paths and acceptance remain unchanged. No evidence deleted.

October8 standalone canonical headroom recovery: five closed historical indexes
a9e92562d1cfd5f9f462f00cfd7bd969c65375ed2a3878ffe8691b029f26b092,
dfd8cd42de514899fbf8c87cf3debf7f4ed000be17305e219ae907e396f1afee,
fd341baa78ab8ffaf93e94d138c6654d45ff54566242fc4412e8f1c73ea41caf,
4845e414926218b5ada5d389b9a259f45369fb830f0f865b3a1af73ca4a8bf27 and
db0ba9f5591713e98b2a3e6328aab91d196ee57f923700745616ae5ff902008c
each had84 JSONL shards transparently compressed. All420 individual hashes
matched before/after; existing verifyFindings passed for each complete index
before/after (historical149/148/147/145/145 finding counts,not current counts).
D:free207405056 bytes after recovery. No evidence bytes,pointers or paths changed.

October8 standalone batch headroom: current closed working-index generation
e004d08df676fd23fe1f42d51ac63dd5b5f5e498b1e32f315c8ee54d8b3120a2
had84 JSONL shards transparently NTFS-compressed. Every SHA256 matched before/
after and existing whole-index verification passed twice (151 findings,8483
differences,39904 controls,389202 occurrences,zero unresolved scalar groups).
D:free rose1380352→36769792 bytes. No pointer,decoded bytes or evidence changed;
additional safe headroom is required before canonical publication.

October8 field-popup proof integration headroom: session47542 completed exit0.
Eight closed historical working-index generations (064777d7,0a30ca89,0a6c0f6d,
3ec576a3,4059599c,42d11fb8,4601de6a,462dddc7) each had84 JSONL shards
transparently compressed,with every SHA256 unchanged and complete existing
verifyFindings checks before/after. No pointer or evidence bytes changed.
Free space308789248 bytes after completion; recheck before canonical publication.

The recovered field-popup-bounds-recovered-20261008 capture completed exit0 and
passed the existing supplemental validator and exact80-case focused receipt/input
join. Keep its160 PNGs/160 trees and16462330-byte report,SHA256
4e4582308f9f76be4f663992e0e94ecf6c5bd6d7a1be1523bcb3c25a6d4b754d.
The closed report was compressed in place to8232960 physical bytes; before/after
SHA256 matches. Original failure directories remain separately retained. This is
bounded geometry evidence,not complete rendering/current-code acceptance.

October8 bounded field-popup capture publication failed with ENOSPC after all80
paired captures. Preserve field-popup-bounds-complete-20261008 (320 PNG/tree
files,zero-byte incomplete report,failure.txt); it is failure evidence,not a
validated complete capture. Earlier field-popup-bounds-20261008 records the
missing popupOptionBox producer-dependency failure. Do not delete either merely
because a retry exists. Historical working-index generations02f8a47b90b39a9b43afd79d59ec3ee68a336b05f651f658dde67735e1d4b420
and04ec615b0e97cdc75f44b817efca421d24a79cb04d7bc1f2f22969b99a4c4240
were transparently compressed in place (84 shards each),all168 SHA256 hashes
unchanged. Existing verifyFindings passed for both complete packages/indexes;
their134 source findings and unresolved1420/787 are historical,not current counts.
No pointer,evidence bytes,paths or acceptance status changed. Free space rose
16265216→82620416 bytes; successful retry used a new directory,not an overwrite.

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

The October13 observed-context reduction runner is required provenance,not
scratch. `docs/evidence/material-overlay-context-runner.mjs.b64` decodes to the
exact captured source SHA256
`8437ab812e876265a7ff8289aa778678dec64edf2276109489931374ba8c072e`.
Keep it with the divider-context-verified-angular-20261013-dpr1/dpr2 failures;
it preserves mixed source line endings independently of later checkout changes.
It is a historical receipt source,never a replacement runner for fresh capture.
It does not recover or supersede the older missing e01ef9dc runner bytes.

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
