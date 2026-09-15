# Owner integration: exact diagnosis of the two harness failures

The 43-file full run ended at 708/710 passing. This diagnosis does not relabel
that run green. It isolates the two failing expectations before editing them.

## Source inventory failure

The `sourceFingerprints` list at commit `02a62c0` contains 148 paths. The current
list contains 156 unique paths. No old path was removed. The eight added paths
are exactly the owner attribution module/spec, immutable baseline helper,
survey module/spec, membership module/spec and mapping spec introduced in
`a99cc87`. The test at `input-equivalence-audit.spec.mjs:1376` still expects 148.

The appropriate correction is to require the new 156 count **and** the actual
eight added paths/digests, retaining the older membership assertions. Merely
loosening the count or accepting any eight extra files would weaken the guard.

## Slider non-border conservation failure

The failing fixture contains the original static light/desktop slider and the
original light/desktop-DPR1 focus state. Of its 220 non-border rows, exactly
22 acquire the new source-bound owner observation-stage attribution:

- `slider-primary` and `slider-start`: overflowWrap, pointerEvents,
  textTransform, visibility, whiteSpace, wordBreak and wordSpacing.
- `slider-visual`: the same seven properties plus fontStyle.

Each group retains exactly those two case identities and two occurrences.
Classification is harness observation-stage mismatch, not equivalent rendering;
candidate computed-value verification and rendering equivalence remain false.
This two-case result does not imply every state of each component qualifies.

The diagnostic independently compares all bound/unbound scalar signatures,
requires exactly the above owner/property pairs and case memberships, and then
restores only those newly attributed rows from the previous unresolved-stage
representation. All other complete rows remain untouched. The reconstructed
220-row digest is exactly the original frozen expectation:

`4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee`

The current 220-row digest is the same value rejected by the full run:

`08822637348df515eecd57ef53bb9652a932a2b5e03e3b835ba14633948fc87d`

The appropriate test correction should retain the **original** frozen digest
as a historical conservation guard after this explicitly bounded projection,
and separately assert the exact 22 new attributions and their evidence. It must
not drop all non-border checks or blindly replace the expected hash.

## Executable evidence and status

```powershell
node scripts/diagnose-material-slider-attribution-conservation.mjs
```

This reads the original hash-bound capture and pinned historical source list,
creates only a disposable two-case diagnostic report, builds bound/unbound
audits and checks the stated conservation. It does not modify canonical
comparison inputs or production code. Temporary report cleanup uses exact-file
unlink and empty-directory removal, preserving original artifacts.

The original no-write audit replay is still running against the unchanged
fingerprinted test files. Their corrections are deliberately pending its
terminal result so that run is not invalidated by concurrent source edits.
Focused regression reruns and a new full harness result are required afterward.
