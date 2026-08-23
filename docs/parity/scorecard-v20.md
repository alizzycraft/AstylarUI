# Phase 20 scorecard: interactive visual-state parity

Starting commit: `406e68a`

## Outcome

Phase 20 extends paired browser/Astylar interaction evidence to the visual state
that exists between static screenshots. The parity harness now records effective
pointer cursors, rendered control carets and selection highlights, and ordinary
document-text selection. Focused fixtures explicitly enforce the state they own,
while unrelated workflows retain the new diagnostics without acquiring accidental
cursor or caret acceptance criteria.

The renderer now makes ordinary text meshes selectable, resolves text hits through
their owning element, uses the scene pointer coordinates for text hit testing, and
propagates authored hover/active cursor changes to the canvas. Hover and active
fixtures also enforce background, all four border widths/colors/styles, radius,
and cursor after each real Playwright action.

No OpenAI credential file was read and no OpenAI API request was made.

## Coverage added or strengthened

| Interaction | Evidence |
| --- | --- |
| Hover | Real pointer enter/leave, event order, exact paint/border/radius/cursor |
| Active press | Pointer down/up boundaries, click order, exact paint/border/radius/cursor |
| Text-input caret | Three pointer placements, logical selection, visible caret ownership, cursor |
| Input selection | Forward/backward drags, direction, visible highlight, replacement editing |
| Textarea selection | Keyboard range, visible highlight, replacement/newline/edit/blur behavior |
| Document text | Forward/backward drags, selected text, endpoints, direction, visible highlight, clearing |
| Dropdowns | Existing pointer/keyboard/click-away/placement/stacking/cancel/cleanup evidence remained green |

Native expanded-select popup pixels remain an operating-system boundary. The
contract verifies focus, expanded state, value/index, event order, dismissal,
placement, stacking/targeting, and Astylar popup observer/resource ownership
without replacing the native reference popup with artificial DOM.

## Release evidence

- `npm run parity:check`: passed with 165 fixtures, 538 renders, and 3 viewport
  profiles. Median SSIM was `0.9916`, minimum SSIM was `0.9547`, 100% of measured
  edges were within 2px, maximum edge error was `3.99209364194121px`, text matched
  exactly, runtime was clean, and completion thresholds passed.
- Focused paired runs passed for hover, active, pointer-caret, input drag
  selection, textarea selection, and document-text selection. The new document
  selection fixture produced 5 clean captures with median SSIM `1.0000`, minimum
  SSIM `0.9828`, and maximum edge error `0.000269px`.
- `npm run tts-parity:check`: passed 10/10 mock scenarios with minimum SSIM
  `0.967522`, maximum geometry edge error `1.978px`, 10/10 visibility, scroll
  ownership, scroll reachability, and visible-text matches, plus 36/36 sharpness
  regions.

The Phase 20 TTS result above covered only the static `initial` and `generated`
application states. It did not exercise the application's hover, active, focus,
caret, selection, or dropdown sequences; Phase 21 adds that distinct evidence.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 322/322 tests passed.
- Focused element-manager and pointer-interaction unit tests: 2/2 passed.
- `npm run parity:harness:check`: 12/12 tests passed.
- `npm run capabilities:check`: current at 91 elements, 84 style fields, 62 DOM
  fields, and 83 evidence references.
- `npm run examples:check`: 10 translation pairs current.
- Developer and maintainer skill validation passed; developer reference sync is
  current.
- `npm run build:lib` and `npm run build`: passed. The application build retained
  only the existing initial-bundle and `src/app/app.scss` budget warnings.
- `npm run consumer:check`: package build passed, but the browser proof hit the
  known external plugin-preparation timing race (5-second timeout followed by an
  unavailable settlement handle). This is not caused by the interaction changes
  and is recorded rather than hidden.

## Harness contract

Interaction reports capture cursor and caret/highlight diagnostics for every
fixture. A fixture opts into exact pointer-cursor enforcement with
`enforcePointerCursor`, opts controls into selection direction and rendered
caret/highlight enforcement with `controlVisualStateIds`, requests ordinary text
selection evidence with `textSelectionIds`, and lists exact computed paint fields
under `enforcedStyleProperties`. This keeps failures attributable to the behavior
the fixture claims while preserving richer evidence for investigation.

## Phase 20 commits

- `bb483c5` - `test(parity): enforce interactive visual state`
- `cc56795` - `docs(parity): require interaction state evidence`
- `f12e059` - `test(parity): scope interactive visual enforcement`

This scorecard is finalized in the Phase 20 handoff commit.
