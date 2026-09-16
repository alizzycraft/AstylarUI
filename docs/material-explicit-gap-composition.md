# Explicit gap requests: original composition audit

The [machine evidence](material-explicit-gap-composition.json) reviews all
**16** explicit-gap groups: **8** mapped owners, **296** distinct original
cases, **516** owner observations and **1,032** property observations.
All original paired trees are reopened and hash-checked. Both gap properties'
complete local declaration proofs reproduce the parent survey's digests, and
their ordered membership matches the [canonical join](material-owner-gap-canonical-join.md).

These are **application/plugin authoring differences**, not equivalent CSS
serializations. Their first demonstrated divergence is the requested composition
before layout. This does not prove a renderer defect, historical motivation or
the cause of a particular screenshot symptom. The canonical report is unchanged;
the classifications below are a separately verified supplement pending integration.

## Findings across every original applicable state

| Owners | Cases per owner | Reference composition | Candidate composition |
| --- | ---: | --- | --- |
| Both button-toggle options | 68 | Block host, nested inline button, absolutely positioned indicator and padded label | Direct flex items with `gap: 8px`; indicator inserted/removed according to selection |
| Checkbox | 68 | Inline-block host, inline-flex wrapper, padded checkbox box and label with 4px left padding | Direct flex layout, `gap: 14px`, host padding `0 11px`, separate absolute state layer |
| Both chips | 76 | Retained cell/action/graphic wrappers; graphic has 6px horizontal padding, action has 12px right padding | Direct label and conditionally inserted mark, `gap: 8px`, host padding `0 12px` |
| Chip set | 76 | Wrapping child wrapper with `min-width: 100%` and -8px left margin; chips have 8px left and 4px vertical margins | Direct wrapping flex items with `gap: 8px`, zero chip margins |
| Dialog actions | 32 | Wrapping flex actions, second button has 8px left margin | Nonwrapping flex actions with `gap: 8px`, zero button margins |
| Grid list | 52 | Relative block host, wrapper and absolute tiles sized with `calc(50% - 0.5px)` and offset to provide a gutter | Two equal grid tracks, relative tile items, `gap: 0` |

The chip graphic remains in the reference when unchecked; its captured width can
be zero while its padding remains explicit. The candidate removes its mark node.
That is relevant to the reported unchecked-label alignment, but neither this
input proof nor a matching width proves the final text-position cause.

The two dialog spacing techniques may produce the same separation in a single
row. They do not request the same wrapping or item box model. Do not interpret
`normal` versus an omitted longhand as absence of spacing on either side: the
reference may place that spacing in a descendant's margin or padding, and the
candidate may author a shorthand.

## History and implementation boundary

`c47d589ac2cf1967cc321df38339cb64dabb3732` introduces the toggle/chip flex-gap
composition and checkbox `gap: 14px`; the same change replaces the native
candidate checkbox with a composed role-checkbox `div`. Grid-list zero gap and
dialog-actions 8px gap already exist in `2f44011`, so they are not attributed to
that later change. The separate [chip history proof](material-chip-spacing-input-history.md)
binds the chip-set's later 10px-to-8px adjustment and all 76 original structures.
These histories demonstrate changed requests, not that a specific core bug
necessitated them.

Recommended repair order after the audit:

1. Restore equivalent requested structure and spacing in isolated diagnostic
   variants, preserving the reference indicator, wrapping and gutter rules.
   Do not rewrite canonical examples yet or substitute another tuned gap.
2. Exercise intrinsic widths, constrained widths, selection changes and density
   changes. Trace any equal-input failure to shared CSS-space layout, positioned
   descendants, margin/padding handling or text measurement.
3. Fix a demonstrated general core rule at its owning boundary. Plugins should
   describe component structure using that rule, not implement their own layout.
4. Remove the corresponding comparison compensation only after an equal-input
   regression proves the core behavior. Recheck cursor/hit regions and clipping
   independently; this spacing audit does not certify those behaviors.

## Verification and limitations

```powershell
node scripts/audit-material-explicit-gap-composition.mjs
node scripts/audit-material-explicit-gap-composition.mjs --check
```

Generation and complete no-write replay both exit **0**. Each run executes
**40 negative controls**, five per owner, including altered owner scalar/stage
values, duplicate identity, detached children and a changed descendant layout
property. The descendant controls specifically reach composition assertions,
rather than only testing scalar/tree consistency. All 16 original declaration
proof digests agree. Hashes of the canonical manifest, compressed payload and
human report remain unchanged.

The machine report retains every case and its original tree/input/composition
hashes, plus a full first-case witness with relevant computed fields, original
rules and all three candidate stages. The reader recomputes every case's proof;
the witness is illustrative, not a substitute for full coverage.

No renderer, comparison, runtime state or reference was modified. These are
standalone checks added after the running 91-file harness began; they are not
claimed as part of that run. Canonical integration, equal-input used-layout
proofs, the remaining audit classifications and enforced parity remain pending.
