# Chip motion: duration is not runtime-state evidence

The remaining **16 chip groups / 1,216 property observations** cover both chip
owners across **76 cases / 152 owner contexts**. The focused proof authenticates
every original reference tree and its exact matched motion rule against the
existing owner-motion report. All eight initial-style properties are included.
No historical observation is replaced with newly measured values.

The matched rule supplies only:

```css
transition-duration: 1ms;
animation-duration: 1ms;
```

Every captured ancestor lacks computed transition targets and animation-name,
duration and play-state fields. The capture does not inventory live animations.
The rule's `_mat-animation-noopable` class name is not a behavioral guarantee.

## Executable counterexample

The real-browser proof uses the unchanged production input-tree capture at
DPR 1 and 2. With the same two declarations, the computed transition target is
`all`, not `none`. A one-millisecond Web Animation of `word-spacing` can be
paused at its start without changing any captured input or sampled style:
the entire captured tree equals the idle tree, while `getAnimations()` proves
the runtime states differ. At the animation midpoint, word spacing is 10px.
Cancelling the animation restores the original capture and runtime state.

This demonstrates a limitation of the observation boundary; it does **not**
claim that any historical Material chip was running that animation. It also
does not establish candidate computed values, equivalent inputs, renderer
causality, or visual parity. The sixteen canonical groups remain unresolved.

## Required next evidence

Capture resolved transition/animation context and live effects at the actual
paired interaction checkpoints in a separately versioned diagnostic. Include
targets/keyframes, timing, play state and settlement; keep capture-time absence
separate from a guarantee that motion cannot occur during interaction. Preserve
the original duration-only requests and raw candidate omissions. Do not infer
inactivity from short duration, a class name, a single initial-valued style
snapshot, or the absence of a CSS animation name.

## Verification

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/chip-motion-context.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**6/6 pass**, exit 0, **2,844.9185ms**, no skips, cancellations or TODOs.
Browser: Chromium **152.0.7977.84**. Log:
`artifacts/material-parity/field-host-flow-input-audit/chip-motion-context-sep20.log`.

- Ordered 152-owner evidence digest:
  `aebc8f166bb8b2bd2dcdf26f1d53ed18a2b11b697044ce6ec7babc285854c822`.
- Unchanged capture-module normalized digest:
  `06197edaf92b2296e3e0564771f307a1036ce7bc5eb13d8e242a5c420e7a7e3b`.

These are scoped diagnostic tests, not a complete harness or enforced parity
matrix result. No renderer, plugin, canonical comparison, collector or saved
classification was changed.
