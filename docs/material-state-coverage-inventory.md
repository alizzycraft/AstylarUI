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
| Core | 12 / 40 | — | Chrome 154 light desktop DPR 1 real Tab/Enter/Space focuses `core-primary` and delivers two activations on both sides. Exact event ordering, focus/ripple paint and other profiles remain pending. |
| Toolbar | 12 / 40 | — | Real Tab/Enter/Space focuses and activates child button `toolbar-action` on both sides; the toolbar itself has no activation. Exact event ordering, child focus paint and input/style equality remain. |
| Sidenav | 12 / 50 | open, M | Initially open side-mode panel, static text, no toggle or focusable content. Paired Tab finds no controls; real panel click/Escape leaves HTML open and neither unchanged panel accepts `focus()`. Material's inherited Escape listener has no focus-origin path in this authored example. Modal containment, toggle activation and real-key drawer dismissal are inapplicable here, not general sidenav limitations. Layout/style/semantics across profiles remain. |
| Grid-list | 12 / 40 | — | Two static text tiles, no authored interactive descendants; paired Tab finds none. Tile keyboard activation is inapplicable. Grid layout/style/semantic correspondence remains. |
| Divider | 16 / 8 | passive inspect | Static separator between two text paragraphs; paired Tab finds no controls. Keyboard activation is inapplicable. Separator semantics and input/style correspondence remain. |
| Badge | 12 / 40 | — | Static Notifications text/count with no control; paired Tab finds none. Focus/activate actions are inapplicable to this authored example. Badge placement, generated content and semantic/style correspondence remain. |
| Card | 12 / 40 | — | Real Tab/Enter/Space focuses and activates child button `card-open` on both sides; the card body is passive. Exact event ordering, focus paint and full input mapping remain. |
| Chips | 12 / 64 | alternate activation, disabled, selected | Chrome 154 light desktop DPR 1 real Tab/Space proof: Material chip 0 changes selected, while role-only candidate receives keydown but stays selected. Focus paint, other keys/profiles and full input mapping remain. |
| Icon | 12 / 8 | passive inspect | Static favorite image/icon; paired Tab finds no controls. Keyboard activation is inapplicable. Vector/image representation, naming and local paint remain. |
| List | 12 / 40 | — | Plain `mat-list`/text rows, not a nav or selection list; paired Tab finds no controls. List-item keyboard activation is inapplicable. Structure/semantics/style correspondence remains. |
| Table | 12 / 40 | — | Plain header/data cells without sort headers or controls; paired Tab finds none. Keyboard activation is inapplicable; sort remains a separate comparison. Table layout/style/semantics remain. |
| Sort | 12 / 48 | activate-twice | Two pointer activations captured. Current Chrome 154 light desktop DPR 1 real Tab/Enter/Space proof finds an authored keyboard activation gap: both sides focus and receive keys, but only Material changes direction. Focus paint, other profiles/DPRs and complete sort input mapping remain. |
| Paginator | 12 / 40 | — | Common states captured; page-size/next/previous keyboard and selected-page transitions need source review. |
| Tree | 12 / 40 | — | Three leaf nodes, no children/toggle: expansion is inapplicable. Real Tab/ArrowDown/ArrowDown/Home/End gives HTML focus 0→1→2→0→2; candidate stays at 0 despite four delivered application keydowns. Candidate authors fixed tabindex 0/-1 and no tree navigation handler: interaction-authoring gap, not proven key-delivery defect. Role/style/focus paint and other profiles remain pending. |
| Form-field | 12 / 64 | edit-empty-blur, disabled, error | Light desktop DPR 1/2 input boundaries include real Tab, edit and selection; Chrome 154 DPR 1 caret-visible proof covers empty focus. Dark/responsive caret and selection paint remain. |
| Input | 12 / 64 | edit-empty-blur, disabled, error | Light desktop DPR 1/2 input boundaries exist; native email exposes null selection endpoints, so edit outcome/pixels must be checked without inventing indices. Dark/responsive caret paint remains. |
| Autocomplete | 12 / 98 | commit/reopen, hover content, outside/canvas dismissal, disabled, error, open, M | Chrome 154 light desktop DPR 1 real Tab opens both lists; Material ArrowDown activates Cape Town and Enter writes it/closes, while candidate receives keys but retains empty value/open popup. Escape removes candidate options and preserves focus. Other navigation/edit keys, caret/selection paint, dark/responsive states and resource cleanup remain. |
| Checkbox | 12 / 56 | disabled, selected | Pointer, hover and selected states captured. Current Chrome 154 light desktop DPR 1 real Tab/Space proof finds native HTML `input:checkbox` versus candidate `div role=checkbox`: both focus and candidate receives keydown, but only HTML toggles. Focus-ring paint, event order, and other profiles/DPRs remain. |
| Radio | 12 / 56 | disabled, selected | Pointer/selected states captured. Current Chrome 154 light desktop DPR 1 Tab/ArrowLeft/ArrowRight proof finds Material native radio focus/selection follows team → solo → team; candidate role-only `div` receives both keys but remains on team. Focus paint, Space, event ordering and other profiles/DPRs remain. |
| Select | 12 / 82 | commit/reopen, hover content, disabled, selected, open, M | Chrome 154 light desktop DPR 1 real Tab/Enter/ArrowUp proof: Material custom `mat-select` opens, changes active option Team → Solo and commits Solo; candidate readonly input receives all keys but stays closed/Team. Pointer-open candidate likewise ignores ArrowUp/Enter; Escape removes its options and retains trigger focus. Material option DOM is inspectable; the former native-popup limitation did not apply here. Other keys/profiles, focus/popup paint and repeated resource cleanup remain. |
| Slider | 12 / 66 | drag-start/end, disabled, comparison-pane drags | Chrome 154 light desktop DPR 1 Tab/Arrow proof: reference uses 0–100/step 5 and peer limits; candidate uses fixed 0–50/50–100/step 1 while the store rounds to 5, producing delayed jumps. Paired pointer proof: default 30/65 thumb centers target correctly; at 60/80 the visible start thumb hits `slider-primary`, and at 20/40 the visible end thumb hits `slider-start`, because half-width hit owners disagree with full-domain visuals. Other states/profiles, general travel geometry, capture cleanup and local paint remain. |
| Slide-toggle | 12 / 56 | disabled, selected | Chrome 154 light desktop DPR 1 real Tab/Space proof: Material switch changes checked, while role-only candidate receives keydown but stays checked. Focus/hover, inactive minus paint, other profiles remain. |
| Datepicker | 12 / 99 | secondary view, hover content, outside/canvas dismissal, disabled, error, open, short viewport, M | Chrome 154 light desktop DPR 1: Tab stays closed on both; Alt+Down opens only Material. Pointer-open Material focuses the calendar and Home/Right moves active day 1 → 2; candidate keeps icon focus. Candidate receives Next/day-1 clicks but month/value/open state stay unchanged; Material advances, writes the date and closes. Secondary year/month navigation, disabled/dark/responsive states, local caret/calendar paint and resource cleanup remain. |
| Timepicker | 12 / 98 | wheel scroll, hover content, outside/canvas dismissal, disabled, error, open, M | Chrome 154 light desktop DPR 1 real Tab leaves Material closed but candidate opens; Material ArrowDown opens and Enter writes 12:00 AM/closes, while candidate receives keys but stays empty/open. Candidate always marks option 0 selected; empty Material input has none selected. Escape removes candidate options; closed Material Escape clears its committed value. Datepicker Tab negative control stays closed on both. Pointer-origin scope, other keys, scrollbar reachability, caret paint, dark/responsive states and resource cleanup remain. |
| Button | 12 / 48 | disabled | Pointer/held/disabled captured; real Tab/Enter/Space activation and focus paint remain. |
| Button-toggle | 12 / 56 | disabled, selected | Chrome 154 light desktop DPR 1 Tab/ArrowLeft/Enter/ArrowRight proof: Material focus and selection move Grid → List → Grid; candidate receives keys but stays on Grid. Edge/hover paint and other profiles remain. |
| Menu | 12 / 82 | hover content, outside/canvas dismissal, disabled, open, M | Retained light 900×700 DPR 1 ArrowDown/Escape capture exists. Chrome 154 dark/mobile 390×844 DPR 2 three pointer-open/Escape cycles: HTML focuses Rename, candidate remains on trigger; both restore trigger and remove popup controls each cycle. Dark Arrow/navigation, local paint and internal resource cleanup remain. |
| Tabs | 12 / 58 | disabled, selected, M | Chrome 154 light desktop DPR 1 Tab/ArrowLeft/Enter/ArrowRight proof: Material Arrow moves focus to Activity, Enter selects it, Arrow returns focus; candidate receives keys but stays on Overview. Panel paint/visibility and other profiles remain. |
| Stepper | 12 / 56 | disabled, selected | Chrome 154 light desktop DPR 1 Tab/ArrowLeft/Enter/ArrowRight proof: Material Arrow moves focus to Review, Enter selects it, Arrow returns focus; candidate receives keys but stays on Details. Content visibility and other profiles remain. |
| Expansion | 12 / 56 | disabled, open | Chrome 154 light desktop DPR 1 Tab/Space/Enter proof: Material header toggles `aria-expanded` false → true → false internally; role-only candidate receives both keys but stays false. Focus/arrow paint and other profiles remain. |
| Bottom-sheet | 12 / 51 | open, comparison-pane, M | Retained light 900×700 DPR 1 Tab/Escape capture exists. Dark/mobile DPR 2 three pointer-open/Escape cycles: HTML focuses Share, candidate stays on trigger; both restore trigger and remove popup controls. Surface-local modality, dark Tab containment, intermediate geometry/paint and internal resource cleanup remain. |
| Dialog | 12 / 66 | hover content, outside dismissal, open, M | Retained light 900×700 DPR 1 Tab/Escape capture exists. Dark/mobile DPR 2 three pointer-open/Escape cycles: both focus Cancel; HTML restores trigger, candidate ends at BODY. Popup controls disappear and canvas count is stable each cycle. Dark Tab containment, panel paint and internal resource cleanup remain. |
| Snack-bar | 12 / 59 | activate-twice, open, auto-dismiss, comparison-pane | Reopen and one timed expiry case captured; confirm visible action/position during lifetime and keyboard action/dismissal across applicable profiles. |
| Tooltip | 12 / 50 | open, comparison-pane hover/held | Retained light desktop DPR 1/2 real Tab capture exists; it proves reference/candidate opening-state authoring differs, not popup-position parity. Dark/responsive focus/hover paint remains. |
| Progress-bar | 12 / 8 | passive inspect | Authored determinate 64/100 (`.64` candidate ratio); paired Tab finds no controls and both semantic progressbars expose min=0/max=100/now=64. Keyboard actions and indeterminate phase are inapplicable. Geometry/paint/plugin ownership remain. |
| Progress-spinner | 12 / 8 | passive inspect | Authored determinate 64/100 (`.64` candidate ratio); paired Tab finds no controls and min/max/now match 0/100/64. Keyboard actions and indeterminate phase are inapplicable. Arc geometry/paint/plugin ownership remain. |

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
   stepper, expansion, slider and select at their first state/focus divergence.
   Other keys, profiles, focus paint and complete input mapping remain. The
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
