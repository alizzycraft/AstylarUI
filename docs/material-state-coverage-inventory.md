# Material comparison/state coverage inventory

## Evidence boundary

This is a **reviewed/pending checklist**, not acceptance. The last complete
enforced output capture is
`artifacts/material-parity/enforced-full-2b6cddc/latest-report.json`
(SHA-256 `a6f832635e896809661dcbb35eb2447e9e6ce3fb8c718ee7d7d969e3f051892c`),
Chrome 153.0.8010.53. It reports 436/436 static and 1,875/1,875 interaction
cases passing its output gates. Its checkpoint's `benchmark.config.mjs` and
`run-material-parity.mjs` hashes still equal the current files
(`a55e95ab…` and `d0ded55f…` respectively). This validates the *configured
action inventory* against current source, not current-browser pixels or input
equivalence. The later Chrome 154 caret checkpoint uses the identical 1,887
served build-file hashes and installed-dependency receipt, but is only a
form-field/light/desktop diagnostic.

All 36 families have twelve static cases (four profiles × desktop/tablet/mobile),
except divider's four extra comparison-pane cases (16). The common active
interaction states are `focus`, `hover`, `held`, `activate`, and
`activate-leave` at four profiles × desktop DPR 1/2. Passive families have
`inspect` instead. The `focus` action calls `HTMLElement.focus()` for all
families except timepicker, which is clicked; it does **not** prove real Tab
navigation. `edit-empty-blur` records the state after blur, not the focused
empty caret. Mobile `open-dismiss` exists only for nine families in light/dark
at 390×844 DPR 2; it performs three Escape cycles and records a final state,
not every intermediate open state. Pointer hover/held and the named slider
drags, timepicker wheel and outside/canvas dismissal are real actions in the
runner, but a passing output gate does not prove equal authored inputs.

In the table, counts are **static / interaction** cases from that complete
capture. “Extra states” are in addition to the common five active states or
passive `inspect`; `M` means the mobile flow above. Every pending item needs
source-derived applicability review before it can be closed as inapplicable.

| Family | Cases | Extra configured states | Reviewed evidence and next state gap |
| --- | ---: | --- | --- |
| Core | 12 / 40 | — | Common pointer states captured; verify whether keyboard focus/activation is applicable to its actual controls. |
| Toolbar | 12 / 40 | — | Common states captured; review child-control focus order and authored input equality. |
| Sidenav | 12 / 50 | open, M | Mobile final Escape state captured; real Tab/focus containment and intermediate open/dismiss boundaries remain. |
| Grid-list | 12 / 40 | — | Common states captured; review whether any grid tile has an applicable keyboard action. |
| Divider | 16 / 8 | passive inspect | Static/inspect captured; confirm passive semantics and input/style correspondence. |
| Badge | 12 / 40 | — | Common states captured; confirm whether pointer/focus actions are meaningful rather than treating their green results as behavior proof. |
| Card | 12 / 40 | — | Common states captured; review interactive descendants and keyboard applicability. |
| Chips | 12 / 64 | alternate activation, disabled, selected | Chrome 154 light desktop DPR 1 real Tab/Space proof: Material chip 0 changes selected, while role-only candidate receives keydown but stays selected. Focus paint, other keys/profiles and full input mapping remain. |
| Icon | 12 / 8 | passive inspect | Static/inspect captured; confirm passive icon/semantic applicability. |
| List | 12 / 40 | — | Common states captured; verify list-item keyboard/focus behavior and child ownership. |
| Table | 12 / 40 | — | Common states captured; distinguish table cells from the separate sort interaction and review keyboard applicability. |
| Sort | 12 / 48 | activate-twice | Two pointer activations captured. Current Chrome 154 light desktop DPR 1 real Tab/Enter/Space proof finds an authored keyboard activation gap: both sides focus and receive keys, but only Material changes direction. Focus paint, other profiles/DPRs and complete sort input mapping remain. |
| Paginator | 12 / 40 | — | Common states captured; page-size/next/previous keyboard and selected-page transitions need source review. |
| Tree | 12 / 40 | — | Common states captured; node expansion/collapse by keyboard and focus order remain. |
| Form-field | 12 / 64 | edit-empty-blur, disabled, error | Light desktop DPR 1/2 input boundaries include real Tab, edit and selection; Chrome 154 DPR 1 caret-visible proof covers empty focus. Dark/responsive caret and selection paint remain. |
| Input | 12 / 64 | edit-empty-blur, disabled, error | Light desktop DPR 1/2 input boundaries exist; native email exposes null selection endpoints, so edit outcome/pixels must be checked without inventing indices. Dark/responsive caret paint remains. |
| Autocomplete | 12 / 98 | commit/reopen, hover content, outside/canvas dismissal, disabled, error, open, M | Light desktop input boundaries and mobile final Escape states exist; real open-popup keyboard routing, caret/selection paint and responsive focused states remain. |
| Checkbox | 12 / 56 | disabled, selected | Pointer, hover and selected states captured. Current Chrome 154 light desktop DPR 1 real Tab/Space proof finds native HTML `input:checkbox` versus candidate `div role=checkbox`: both focus and candidate receives keydown, but only HTML toggles. Focus-ring paint, event order, and other profiles/DPRs remain. |
| Radio | 12 / 56 | disabled, selected | Pointer/selected states captured. Current Chrome 154 light desktop DPR 1 Tab/ArrowLeft/ArrowRight proof finds Material native radio focus/selection follows team → solo → team; candidate role-only `div` receives both keys but remains on team. Focus paint, Space, event ordering and other profiles/DPRs remain. |
| Select | 12 / 82 | commit/reopen, hover content, disabled, selected, open, M | Pointer commit and mobile final Escape captured; native expanded-option pixels are uninspectable, so keyboard focus/value/index/events/dismissal and candidate popup cleanup remain. |
| Slider | 12 / 66 | drag-start/end, disabled, comparison-pane drags | Chrome 154 light desktop DPR 1 Tab/Arrow proof: reference uses 0–100/step 5 and peer limits; candidate uses fixed 0–50/50–100/step 1 while the store rounds to 5, producing delayed jumps. Paired pointer proof: default 30/65 thumb centers target correctly; at 60/80 the visible start thumb hits `slider-primary`, and at 20/40 the visible end thumb hits `slider-start`, because half-width hit owners disagree with full-domain visuals. Other states/profiles, general travel geometry, capture cleanup and local paint remain. |
| Slide-toggle | 12 / 56 | disabled, selected | Chrome 154 light desktop DPR 1 real Tab/Space proof: Material switch changes checked, while role-only candidate receives keydown but stays checked. Focus/hover, inactive minus paint, other profiles remain. |
| Datepicker | 12 / 99 | secondary view, hover content, outside/canvas dismissal, disabled, error, open, short viewport, M | Light desktop input boundaries and collision/mobile cases exist; real calendar keyboard/day/year navigation, caret paint and dark/responsive focus remain. Preserve its distinct focus contract. |
| Timepicker | 12 / 98 | wheel scroll, hover content, outside/canvas dismissal, disabled, error, open, M | Wheel and light desktop input boundaries exist; real focus-to-popup/key routing, scrollbar reachability, caret paint and dark/responsive focus remain. |
| Button | 12 / 48 | disabled | Pointer/held/disabled captured; real Tab/Enter/Space activation and focus paint remain. |
| Button-toggle | 12 / 56 | disabled, selected | Chrome 154 light desktop DPR 1 Tab/ArrowLeft/Enter/ArrowRight proof: Material focus and selection move Grid → List → Grid; candidate receives keys but stays on Grid. Edge/hover paint and other profiles remain. |
| Menu | 12 / 82 | hover content, outside/canvas dismissal, disabled, open, M | Retained light 900×700 DPR 1 ArrowDown/Escape capture exists; dark/responsive keyboard and repeated focus/cleanup remain. |
| Tabs | 12 / 58 | disabled, selected, M | Chrome 154 light desktop DPR 1 Tab/ArrowLeft/Enter/ArrowRight proof: Material Arrow moves focus to Activity, Enter selects it, Arrow returns focus; candidate receives keys but stays on Overview. Panel paint/visibility and other profiles remain. |
| Stepper | 12 / 56 | disabled, selected | Chrome 154 light desktop DPR 1 Tab/ArrowLeft/Enter/ArrowRight proof: Material Arrow moves focus to Review, Enter selects it, Arrow returns focus; candidate receives keys but stays on Details. Content visibility and other profiles remain. |
| Expansion | 12 / 56 | disabled, open | Chrome 154 light desktop DPR 1 Tab/Space/Enter proof: Material header toggles `aria-expanded` false → true → false internally; role-only candidate receives both keys but stays false. Focus/arrow paint and other profiles remain. |
| Bottom-sheet | 12 / 51 | open, comparison-pane, M | Retained light 900×700 DPR 1 Tab/Escape capture exists; surface-local modality, dark/responsive intermediate open geometry and cleanup remain. |
| Dialog | 12 / 66 | hover content, outside dismissal, open, M | Retained light 900×700 DPR 1 Tab/Escape capture exists; dark/responsive focus restoration, panel paint and repeated cleanup remain. |
| Snack-bar | 12 / 59 | activate-twice, open, auto-dismiss, comparison-pane | Reopen and one timed expiry case captured; confirm visible action/position during lifetime and keyboard action/dismissal across applicable profiles. |
| Tooltip | 12 / 50 | open, comparison-pane hover/held | Retained light desktop DPR 1/2 real Tab capture exists; it proves reference/candidate opening-state authoring differs, not popup-position parity. Dark/responsive focus/hover paint remains. |
| Progress-bar | 12 / 8 | passive inspect | Static/inspect captured; confirm passive state/semantics and relevant progress values. |
| Progress-spinner | 12 / 8 | passive inspect | Static/inspect captured; confirm passive state/semantics and animation phase applicability. |

## Priority and ownership of the remaining checks

1. Text inputs: same authored caret/selection intent, focused-empty and
   forward/backward selection paint at real action boundaries. The existing
   light capture used Playwright's default hidden native caret; the Chrome 154
   form-field proof isolates that harness gap and an unequal caret-color
   request. Do not infer the other four families or dark/mobile from it.
2. Shared overlays and focus: distinguish authored open-state differences from
   core placement, clipping, dismissal, focus containment and resource cleanup.
   Reuse the authenticated light keyboard captures before adding only missing
   profile/DPR/intermediate states.
3. Keyboard-operable selection controls: the current light desktop key probes
   classify sort, checkbox, radio, chips, slide-toggle, button-toggle, tabs,
   stepper, expansion and slider at their first state/focus divergence. Select,
   other keys, profiles, focus paint and complete input mapping remain. The
   candidate callback receives composite keys; its Escape-only handler does
   not implement the reference components' activation/navigation. Slider has
   a distinct authored range/step versus store-normalization conflict, not a
   missing-keydown result. Programmatic `focus()` and final pointer activation
   do not cover these paths.
4. Source-derived applicability for passive/composite families, then complete
   canonical source/finding integration, the current 302-file audit harness,
   and unfiltered enforced browser/release gates. Keep input-equivalence
   classifications separate from the historical output-pass counts.

This inventory is intentionally pending. It neither changes comparison input
nor declares any family fully input-equivalent.
