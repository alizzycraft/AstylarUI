export const inputDifferenceClassifications = Object.freeze([
  'equivalent-representation',
  'legitimate-public-api-structure',
  // Observed support gaps need not be intentional design decisions.
  'documented-limitation',
  'intentional-documented-limitation',
  'application-plugin-authoring-defect',
  'stale-fixture-or-reference-input',
  'parity-harness-defect',
  'suspected-core-renderer-defect',
  'confirmed-core-renderer-defect',
]);

export const propertyGroups = Object.freeze({
  layout: Object.freeze([
    'position', 'display', 'boxSizing', 'width', 'height', 'minWidth', 'maxWidth',
    'minHeight', 'maxHeight', 'top', 'right', 'bottom', 'left', 'paddingTop',
    'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight',
    'marginBottom', 'marginLeft', 'flexDirection', 'flexWrap', 'flexGrow',
    'flexShrink', 'flexBasis', 'alignSelf', 'alignItems', 'alignContent',
    'justifyContent', 'rowGap', 'columnGap', 'order', 'gridTemplateColumns',
    'gridTemplateRows', 'gridColumn', 'gridRow', 'overflowX', 'overflowY',
  ]),
  typography: Object.freeze([
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
    'letterSpacing', 'wordSpacing', 'textAlign', 'verticalAlign', 'textTransform',
    'whiteSpace', 'overflowWrap', 'wordBreak', 'textOverflow', 'textDecoration',
    'color', 'caretColor',
  ]),
  paint: Object.freeze([
    'backgroundColor', 'opacity', 'borderTopWidth', 'borderRightWidth',
    'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderRightStyle',
    'borderBottomStyle', 'borderLeftStyle', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'borderTopLeftRadius',
    'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
    'boxShadow', 'clipPath',
  ]),
  interaction: Object.freeze(['cursor', 'pointerEvents', 'appearance']),
  transform: Object.freeze(['transform', 'transformOrigin', 'perspective', 'zIndex']),
});

// Browser used values that are equivalent to an omitted Astylar declaration.
// These are representation rules, not screenshot-based waivers.
// Inherited properties require authored-request and ancestry evidence; a local
// omission cannot be replaced with an initial value by this scalar fallback.
export const implicitReferenceValues = Object.freeze({
  minWidth: Object.freeze(['0']),
  minHeight: Object.freeze(['0']),
  maxWidth: Object.freeze(['none']),
  maxHeight: Object.freeze(['none']),
  top: Object.freeze(['auto']),
  right: Object.freeze(['auto']),
  bottom: Object.freeze(['auto']),
  left: Object.freeze(['auto']),
  textOverflow: Object.freeze(['clip']),
  textDecoration: Object.freeze(['none']),
  clipPath: Object.freeze(['none']),
  // Identity geometry still establishes a containing block and stacking
  // context. It is not the initial/omitted transform request.
  transform: Object.freeze(['none']),
  perspective: Object.freeze(['none']),
  zIndex: Object.freeze(['auto']),
  objectFit: Object.freeze(['fill']),
  boxShadow: Object.freeze(['none']),
  gridColumn: Object.freeze(['auto']),
  gridRow: Object.freeze(['auto']),
});

export const implicitReferenceJustifications = Object.freeze({
  boxShadow: 'An omitted Astylar boxShadow and explicit CSS none both request no shadow layers. Core parseBoxShadow returns the same empty layer list for these two inputs; this does not waive a nonempty shadow or plugin-authored paint.',
  gridColumn: 'An omitted Astylar gridColumn and explicit CSS auto both request automatic one-track column placement. GridService.parseGridAxisPlacement takes the same span:1 branch for both. This accepts only omitted versus auto, not a changed span/line or grid template.',
  gridRow: 'An omitted Astylar gridRow and explicit CSS auto both request automatic one-track row placement. GridService.parseGridAxisPlacement takes the same span:1 branch for both. This accepts only omitted versus auto, not a changed span/line or grid template.',
});

export const reviewedValueNormalizations = Object.freeze([
  {
    property: 'overflowX/overflowY',
    aliases: { 'visible/visible': 'omitted/omitted only with captured paired-axis proof' },
    classification: 'equivalent-representation',
    justification: 'CSS Overflow 3 section 3.1 gives both axes the non-inherited initial visible value. Core ordinary element defaults omit overflow; clipping and scroll registration treat omission and visible identically. The audit requires unique ordinary-node correspondence and all captured declaration stages, rejects explicit candidate overflow/reset inputs, controls, plugins and viewport nodes, and independently replays inventory evidence. Missing or mixed-axis observations are not normalized. This is a property-input representation, not proof of equivalent layout, ancestor clipping, reachability or final raster.',
    evidence: [
      'https://www.w3.org/TR/2025/WD-css-overflow-3-20251007/#overflow-properties',
      'tests/material-parity/input-tree-evidence.spec.mjs: browser omitted overflow equals visible only when both axes retain their initial values',
      'src/app/services/dom/elements/overflow-clip.service.spec.ts: omitted and visible overflow take the same unclipped branch without projecting geometry',
      'src/lib/astylar-scroll-runtime.spec.ts: omitted and visible overflow do not create or consume a scroll container',
    ],
  },
  {
    property: 'letterSpacing',
    aliases: { normal: '0' },
    classification: 'equivalent-representation',
    justification: 'CSS Text 3 section 7.2 defines normal as computed zero and specifies that getComputedStyle serializes zero as normal. Core TextStyleParserService.parseSpacing maps normal and explicit zero to the same numeric tracking input. This accepts only that explicit property representation, not an omitted inherited declaration, font choice, shaping, line-height, alignment, inherited token resolution, missing paint provenance or final raster. Raw pooled reference/core styles remain unchanged; no missing declaration, retained or painted value is synthesized.',
    evidence: [
      'https://www.w3.org/TR/2026/CRD-css-text-3-20260814/#letter-spacing-property',
      'src/app/services/text/text-style-parser.service.ts: parseSpacing and DEFAULT_TEXT_STYLE.letterSpacing',
      'examples/material-showcase/src/app/normal-letter-spacing-audit.spec.ts: normal/zero browser widths and bound texture bytes, with nonzero sensitivity controls',
    ],
  },
  {
    property: 'fontWeight',
    aliases: { normal: '400', bold: '700' },
    classification: 'equivalent-representation',
    justification: 'Explicit CSS normal and bold are exact aliases for 400 and 700. Core TextStyleParserService preserves named or numeric weights and TextCanvasRendererService supplies them to the browser canvas font property. Browser computed-style and core canvas-paint tests establish both aliases. This does not supply an omitted/inherited weight or resolve ancestry-dependent bolder/lighter, and it does not accept different font families.',
    evidence: [
      'tests/material-parity/input-tree-evidence.spec.mjs: browser font-weight keywords resolve to exact numeric aliases but relative weights depend on ancestry',
      'src/app/services/text/text-canvas-renderer.service.spec.ts: renders explicit normal/400 and bold/700 aliases identically through core parsing and canvas paint',
    ],
  },
]);

export const sourceAuditDefinitions = Object.freeze([
  Object.freeze({
  "id": "fixture-sort-hover-arrow-omitted",
  "classification": "application-plugin-authoring-defect",
  "owner": "showcase Sort arrow presence/state translation",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "pattern": "\\.\\.\\.\\(state\\.open \\|\\| focused \\? \\[\\{\\s+type: 'showcase\\.material:sort-arrow'",
  "introducedBy": "705cf584 first authors an activated-only text arrow;75fe617b adds focused presence but not hover;5b74d1b3 preserves that gate for the plugin arrow. Source history only,not first-bad runtime or historical reference equivalence.",
  "history": {
    "initialArrow": "705cf584b749caaf59149bba4b017567ca794c23",
    "focusGate": "75fe617bf947eabf8c4353322a1b97ca5b3bc7d7",
    "pluginArrow": "5b74d1b3e79016a1ba402090d66c60a123718e71"
  },
  "observation": {
    "property": "arrow node presence versus native opacity",
    "cases": 60,
    "hoverFailures": 8,
    "hiddenControls": 12,
    "presentControls": 40,
    "reference": "All eight hover owners have arrow opacity0.54.",
    "astylar": "All eight hover trees omit sort-arrow entirely.",
    "firstDivergence": "Candidate conditional authoring before plugin rendering or projection."
  },
  "evidence": {
    "report": {
      "file": "artifacts/material-parity/current-full-20261005/latest-report.json",
      "sha256": "ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62"
    }
  },
  "focusedProof": "tests/material-parity/sort-arrow-geometry.spec.mjs",
  "action": "Match native hover/focus/activation arrow presence through authored state;do not add renderer offsets or duplicate input routing.",
  "boundary": "Retained input presence and current source/history only;not raw hover timing,animation,paint,current served build or whole-case closure.",
  "justification": "Candidate conditional authoring before plugin rendering or projection. Retained input presence and current source/history only;not raw hover timing,animation,paint,current served build or whole-case closure."
}),
  Object.freeze({
  "id": "fixture-sort-arrow-triangulation-fills-notch-and-overdraws",
  "classification": "application-plugin-authoring-defect",
  "owner": "Material sort-arrow CSS-space vector paint geometry",
  "file": "examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts",
  "pattern": "export function materialSortArrowTriangles\\(direction: 'asc' \\| 'desc'\\)",
  "introducedBy": "5b74d1b3 replaces the text glyph with the five-triangle function. Initial unit-scale vertices equal current CSS vertices;e4ca3db4 changes coordinate API but preserves topology. Not historical browser or first-bad-runtime proof.",
  "history": {
    "introduction": "5b74d1b3e79016a1ba402090d66c60a123718e71",
    "parent": "6a43034a5f42a03f96f413c9301b136afff776a6",
    "cssBoundary": "e4ca3db4070b1aaac0c1a43dda67bc135f18900a"
  },
  "observation": {
    "property": "vector fill coverage before projection",
    "nativePolygonArea": 49.08,
    "summedTriangleArea": 64.48,
    "witnesses": [
      {
        "point": {
          "x": 2,
          "y": -1.5
        },
        "nativeFilled": false,
        "candidateTriangles": 1
      },
      {
        "point": {
          "x": 0,
          "y": -2
        },
        "nativeFilled": true,
        "candidateTriangles": 2
      }
    ],
    "firstDivergence": "Current plugin triangles differ from the retained native SVG path despite equal bounds."
  },
  "evidence": {
    "report": {
      "file": "artifacts/material-parity/current-full-20261005/latest-report.json",
      "sha256": "ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62"
    },
    "currentPluginSha256": "dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e"
  },
  "retainedPaint": {
    "states": [
      "focus",
      "activate"
    ],
    "profile": "light",
    "dpr": 1,
    "metricReplay": "Exact complete original focused-raster metrics on existing PNGs;zero phase shift.",
    "focusStem": {
      "reference": [
        129,
        126,
        131
      ],
      "astylar": [
        75,
        72,
        78
      ]
    },
    "opaqueStem": {
      "reference": [
        29,
        27,
        32
      ],
      "astylar": [
        29,
        27,
        32
      ]
    },
    "attribution": "Consistent with extra fill/double alpha coverage;not proof of capture-time plugin identity or historical GPU cause."
  },
  "focusedProof": "tests/material-parity/sort-arrow-geometry.spec.mjs",
  "action": "Preserve native path and dimensions with faithful nonoverlapping vector geometry;do not retune scale,offset,color or opacity to hide the mismatch.",
  "boundary": "Current geometry and source history plus two retained local observations. Captured-plugin linkage and fresh current raster remain unverified;not all-context paint or case closure.",
  "justification": "Current plugin triangles differ from the retained native SVG path despite equal bounds. Current geometry and source history plus two retained local observations. Captured-plugin linkage and fresh current raster remain unverified;not all-context paint or case closure."
}),
  Object.freeze({
  "id": "fixture-tree-tabstop-remains-first-after-pointer-focus",
  "classification": "application-plugin-authoring-defect",
  "owner": "showcase tree composite focus/tab-stop state translation",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "introducedBy": "2f440115 already authors tabindex:index===0?0:-1 independently of focused leaf. Source introduction only,not a historical runtime bisect.",
  "observation": {
    "property": "tabindex",
    "cases": 52,
    "differingPointerCases": 24,
    "matchingControls": 28,
    "reference": "After pointer activation,Projects has tabindex=0;Documents and Archive have -1.",
    "astylar": "Documents remains tabindex=0 even while Projects has focused class and actual native focus.",
    "firstDivergence": "Authored candidate tab-stop input,not projection or a mirror dropping the requested values."
  },
  "evidence": {
    "original": {
      "file": "artifacts/material-parity/current-full-20261005/latest-report.json",
      "sha256": "ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62"
    },
    "oneActualDOMContext": {
      "file": "artifacts/material-parity/tree-pointer-tabstop-20261025/latest-report.json",
      "sha256": "117f3f9e1813a5b83bc1d545eb3e5dc69262cc58eaafac9d116402fe00f722a9"
    }
  },
  "focusedProof": "tests/material-parity/tree-tabstop-inputs.spec.mjs",
  "action": "Restore equivalent roving tab-stop inputs through public semantics;do not compensate in layout or implement a plugin input engine.",
  "boundary": "52 retained input properties,one actual native-DOM context. Not complete keyboard,paint,current-source or case acceptance.",
  "pattern": "tabindex: index === 0 \\? 0 : -1",
  "justification": "Authored candidate tab-stop input,not projection or a mirror dropping the requested values. 52 retained input properties,one actual native-DOM context. Not complete keyboard,paint,current-source or case acceptance."
}),
  Object.freeze({
  "id": "core-pointer-move-restores-canvas-tabstop-and-recaptures-backward-exit",
  "classification": "confirmed-core-renderer-defect",
  "owner": "core semantic focus and Babylon native-input canvas ownership",
  "file": "src/lib/astylar-semantic-bridge.ts",
  "introducedBy": "Historical introduction not yet established;do not infer first-bad revision from the current/installed sources.",
  "observation": {
    "property": "sequential focus exit after real pointer activation",
    "pairs": 1,
    "dpr": 1,
    "reference": "Projects -> Tab Documents -> Shift+Tab BODY.",
    "astylar": "Projects -> Tab Documents -> Shift+Tab CANVAS -> semantic Documents.",
    "firstDivergence": "Semantic connect excludes canvas with tabindex=-1;Babylon pointer move overwrites tabindex to engine value1.",
    "consequence": "Browser backward navigation reaches implementation canvas;semantic syncFocus calls native focus on the still-logical Documents owner."
  },
  "publicReproduction": {
    "file": "artifacts/material-parity/public-tree-fixed-tabstop-corrected-20261025/latest-report.json",
    "sha256": "ca76ab4262dbca4cac62ff4d21cbca7fd5ddbd4d5af33d51f824bba66e3163e6"
  },
  "causalTrace": {
    "file": "artifacts/material-parity/public-tree-tab-exit-trace-20261025/latest-report.json",
    "sha256": "6ec16965fabd291c2bda981beaecdab35beeb31e060b5ec82648d1dba8a0500f"
  },
  "focusedProof": "tests/material-parity/tree-tabstop-inputs.spec.mjs: one equal-input Tab-exit trace binds pointer-move canvas tab restoration and semantic refocus",
  "action": "Coordinate core/Babylon canvas tab ownership while preserving pointer/selection focus and genuine modal containment;verify forward/backward exit without replacing native Tab navigation.",
  "boundary": "Equal-input public installed-package reproduction and corroborating instrumented pair,not all Material cases,current-source equivalence,history bisect,paint or final acceptance.",
  "pattern": "this\\.canvas\\.tabIndex = -1",
  "justification": "Semantic connect excludes canvas with tabindex=-1;Babylon pointer move overwrites tabindex to engine value1. Equal-input public installed-package reproduction and corroborating instrumented pair,not all Material cases,current-source equivalence,history bisect,paint or final acceptance."
}),
  Object.freeze({
  "id": "core-block-align-content-omission-resolves-to-stretch",
  "classification": "confirmed-core-renderer-defect",
  "owner": "core CSS initial alignment value resolution",
  "file": "src/app/config/browser-defaults.ts",
  "publicReproduction": {
    "file": "artifacts/material-parity/public-block-align-content-20261025/latest-report.json",
    "sha256": "e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5"
  },
  "sourceBinding": {
    "file": "artifacts/material-parity/public-block-align-content-source-binding-20261025.log",
    "sha256": "f73feaad5ace77057428591b21500e83bd19326fca1bd82dbc2d8fb0a8cfe019"
  },
  "observation": {
    "property": "alignContent",
    "element": "parent",
    "state": "fresh omitted-value block",
    "dpr": [
      1,
      2
    ],
    "reference": "normal",
    "astylar": "stretch"
  },
  "firstDivergence": "Omitted equal authored request resolves to different alignment keywords before layout. Shared globalDefaultStyle supplies stretch through element-default merging.",
  "history": {
    "sourceChange": "75bb2430d46e2035ee107c343dfaf319cf69e4aa",
    "laterExtraction": "2c16e148c3f7870c9906ce2a024661b164886e46",
    "evidence": {
      "file": "artifacts/material-parity/block-align-content-default-history-20261025.log",
      "sha256": "c7998a58cff837cb77130764e4c42fa0c12712c1c8af5f443b7ea3ce48499e3b"
    },
    "boundary": "Source changed invalid left to stretch;parent was not a correct normal baseline. No first-bad runtime revision or author motive inferred."
  },
  "justification": "Both DPR omissions resolve differently while explicit normal/stretch controls retain their supplied keywords and equal20px geometry. Native margin-collapse control separately demonstrates normal/stretch are not generally interchangeable;it is not candidate collapse evidence.",
  "nextAction": "Correct general CSS initial-value semantics only after checking flex/grid/block consumers;do not change Material authoring or globally normalize normal/stretch.",
  "boundary": "Confirmed resolved-value defect for tested public blocks,not a demonstrated omission-driven geometry failure in this positioned-parent control or all formatting contexts.",
  "pattern": "alignContent: \"stretch\"",
  "focusedProof": "tests/material-parity/public-block-align-content.spec.mjs: Public block alignment reduction preserves wrong default separately from explicit center failure",
  "evidence": [
    {
      "file": "artifacts/material-parity/public-block-align-content-20261025/latest-report.json",
      "sha256": "e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5"
    },
    {
      "file": "artifacts/material-parity/public-block-align-content-source-binding-20261025.log",
      "sha256": "f73feaad5ace77057428591b21500e83bd19326fca1bd82dbc2d8fb0a8cfe019"
    },
    {
      "file": "artifacts/material-parity/block-align-content-default-history-20261025.log",
      "sha256": "c7998a58cff837cb77130764e4c42fa0c12712c1c8af5f443b7ea3ce48499e3b"
    }
  ]
}),
  Object.freeze({
  "id": "core-block-align-content-center-does-not-align-contents",
  "classification": "confirmed-core-renderer-defect",
  "owner": "core block content alignment and child placement",
  "file": "src/app/services/dom/elements/element-creation.service.ts",
  "publicReproduction": {
    "file": "artifacts/material-parity/public-block-align-content-20261025/latest-report.json",
    "sha256": "e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5"
  },
  "sourceBinding": {
    "file": "artifacts/material-parity/public-block-align-content-source-binding-20261025.log",
    "sha256": "f73feaad5ace77057428591b21500e83bd19326fca1bd82dbc2d8fb0a8cfe019"
  },
  "observation": {
    "property": "child top relative to parent",
    "element": "child",
    "state": "fresh explicit center block",
    "dpr": [
      1,
      2
    ],
    "reference": "55 CSSpx",
    "astylar": "20 CSSpx"
  },
  "firstDivergence": "Explicit center survives candidate resolved style but the rendered child does not move from the normal/stretch control offset. The35px divergence is after style resolution,not omission/default serialization.",
  "causalExecution": {
    "evidence": {
      "file": "artifacts/material-parity/public-block-alignment-causal-execution-20261025.log",
      "sha256": "fcc1734eff58748a456a996fcfc69fff43f6de7df6798738589254b01193c269"
    },
    "observation": "Actual current and captured-installed layoutBlockChildren plus ten complete real helpers pass y20 to positionRenderedCssBox for normal,stretch,center without reading parent alignContent. Other parent height/position reads are observed.",
    "boundary": "Creation returns the recorded fixed10x10 child;projection records CSS boxes and unexpected resize/paint branches throw. Not whole browser call tracing,nested/auto-height behavior or proof of every downstream renderer path."
  },
  "history": {
    "boundary": "First-bad runtime revision not established. Current/installed six-method equivalence does not date the behavior or prove every internal call path."
  },
  "justification": "Eight equal-input package-root pairs separate omitted/normal/stretch/center atDPR1/2. Both center cases fail by35px despite equal center declarations;normal/stretch controls agree. Absolute block parent excludes parent-child margin collapse in this reduction. Layout/default source methods match captured installed bundle inputs.",
  "nextAction": "Trace and implement general block content alignment at the owning CSS layout boundary,with explicit normal/stretch/center and margin-collapse controls. Do not substitute flex or tune offsets.",
  "boundary": "Confirmed projected geometry failure with missing block content-alignment offset before projection in the bounded actual-method execution. Not local raster,all block alignment values,Material symptom causality or historical runtime.",
  "pattern": "private layoutBlockChildren\\(",
  "focusedProof": "tests/material-parity/public-block-align-content.spec.mjs: Actual block placement omits alignment before the CSS projection boundary",
  "evidence": [
    {
      "file": "artifacts/material-parity/public-block-align-content-20261025/latest-report.json",
      "sha256": "e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5"
    },
    {
      "file": "artifacts/material-parity/public-block-align-content-source-binding-20261025.log",
      "sha256": "f73feaad5ace77057428591b21500e83bd19326fca1bd82dbc2d8fb0a8cfe019"
    },
    {
      "file": "artifacts/material-parity/public-block-alignment-causal-execution-20261025.log",
      "sha256": "fcc1734eff58748a456a996fcfc69fff43f6de7df6798738589254b01193c269"
    }
  ]
}),
  Object.freeze({
  "id": "fixture-menu-popup-programmatic-focusability-omitted",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "classification": "application-plugin-authoring-defect",
  "owner": "showcase menu popup semantic authoring",
  "introducedBy": "Initial2f440115 and current popup object omit tabindex;intermediate history and motive unproven.",
  "focusedProof": "tests/material-parity/menu-popup-ax.spec.mjs",
  "evidence": [
    {
      "file": "artifacts/material-parity/menu-popup-ax-contexts-retry-20261024/latest-report.json",
      "sha256": "819932e79b0bae14534f399643ac01a05942d581a2c28239d1ce88f39e49c9a1"
    },
    {
      "file": "artifacts/material-parity/menu-mobile-ax-retry-20261024/latest-report.json",
      "sha256": "04ab953a6db5773212b85c9bc09c20d01708d065c38704a36ce1f58038620ba0"
    }
  ],
  "observation": {
    "component": "menu",
    "element": "menu-popup",
    "states": [
      "open"
    ],
    "profiles": [
      "light",
      "dark",
      "contrast",
      "custom"
    ],
    "dpr": [
      1,
      2
    ],
    "property": "authored tabindex and actual AX focusability",
    "reference": "tabindex=-1;AX focusable=true",
    "astylar": "tabindex omitted;AX focusable absent",
    "stage": "authored popup object before semantic DOM projection"
  },
  "justification": "Actual popup/menuitem roles,names and exact controls backend associations match across eight retained desktop contexts. Popup focusability differs with unequal authored tabindex. Initial/current AST and retained trees show the omission. This is not evidence that core loses a supplied tabindex or that matching numeric DOM tabIndex properties imply equivalent attributes. Existing opening-focus/navigation failure remains under its original finding.",
  "mobileEvidence": "Light/dark390x844 DPR2;three open/Escape cycles with actual AX at all boundaries,not touch emulation or original-e01 replay.",
  "boundary": "Retained desktop/mobile cohorts only;not initial runtime,all history,AT speech,equal-input core proof,current rendering or case closure.",
  "implementationOrder": "Later restore reference-equivalent tabindex intent through the public lowercase tabindex field;verify shared core support with equal inputs rather than adding custom focus/layout behavior.",
  "pattern": "id: 'menu-popup', role: 'menu'"
}),
  Object.freeze({
  "id": "fixture-menu-controls-association-outlives-popup",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "classification": "application-plugin-authoring-defect",
  "owner": "showcase menu trigger/popup relationship lifecycle",
  "introducedBy": "Initial2f440115 and current trigger object author literal ariaControls=menu-popup independent of conditional popup existence.",
  "focusedProof": "tests/material-parity/menu-popup-ax.spec.mjs",
  "evidence": [
    {
      "file": "artifacts/material-parity/menu-dismissal-ax-retry-20261024/latest-report.json",
      "sha256": "6cca3cbb686397037da63b543ad3544039fa26356e60fb5d62ac5643d3997b86"
    },
    {
      "file": "artifacts/material-parity/menu-mobile-ax-retry-20261024/latest-report.json",
      "sha256": "04ab953a6db5773212b85c9bc09c20d01708d065c38704a36ce1f58038620ba0"
    }
  ],
  "observation": {
    "component": "menu",
    "element": "menu-primary/menu-popup",
    "states": [
      "supplementary Escape after maintained open"
    ],
    "profiles": [
      "light",
      "dark",
      "contrast",
      "custom"
    ],
    "dpr": [
      1,
      2
    ],
    "property": "aria-controls after popup removal",
    "reference": "controls absent",
    "astylar": "controls retains removed popup ID",
    "stage": "unconditional authored trigger association versus conditional popup object"
  },
  "justification": "All eight paired contexts remove the menu DOM/AX owner,mark trigger expanded=false and return focus to the trigger. Candidate DOM retains a dangling popup ID while native clears it;Chrome omits controls from both closed trigger AX nodes. This is not stale popup AX retention or failure to clear an omitted renderer input:the candidate still authors the relationship. Existing Escape success does not establish complete lifetime or current-renderer acceptance.",
  "mobileEvidence": "Initial closed plus three real open/Escape cycles in light/dark390x844 DPR2;both initial and later closed candidate controls references remain dangling.",
  "boundary": "Desktop supplementary Escape and retained mobile three-cycle producer only;not original-e01 replay,other dismissal paths,AT speech,current rendering or whole-case closure.",
  "implementationOrder": "Later make relationship lifecycle match popup lifecycle at the authoring boundary;retain exact AX IDREF and no-stale-owner checks without coordinate/style compensation.",
  "pattern": "ariaControls: 'menu-popup'"
}),
  Object.freeze({
  "id": "core-public-focus-does-not-synchronize-native-semantic-owner",
  "classification": "confirmed-core-renderer-defect",
  "owner": "core public focus request to scene/semantic DOM synchronization",
  "file": "src/lib/astylar.ts",
  "introducedBy": "cd222388 introduces the public renderer focus API with the exact current delegating method;it inherits the focus-event exclusion already present from dbe4d8ed. Source introduction only,not historical runtime bisect.",
  "history": {
    "APIRevision": "cd222388",
    "priorGateRevision": "dbe4d8ed",
    "evidence": {
      "file": "artifacts/material-parity/public-focus-initial-api-history-retry-20261024.log",
      "sha256": "cf320ba25889189c46c2a9fb535a0a3d3763eddf1c40dbe65250679878cf7a7a"
    },
    "boundary": "Parent lacks public focus method;exact initial/current method bytes and ancestry checked. Historical runtime,motivation and every intermediate behavior remain unproven."
  },
  "focusedProof": "tests/material-parity/menu-popup-ax.spec.mjs: public negative-tabindex failure remains unfocused after settlement until an unrelated update",
  "publicReproduction": {
    "file": "artifacts/material-parity/public-menu-negative-tabindex-settled-20261024/latest-report.json",
    "sha256": "a75f974f1b8570c4a8dadde51f65115e93703d3ea796a5993f4deadf7f4d889c"
  },
  "controls": {
    "file": "artifacts/material-parity/public-programmatic-focus-controls-20261024/latest-report.json",
    "sha256": "4696d253fbd95a1504b7de4d067c3eb92904bf595e5dfd8bad8aab32fb9144ab",
    "pairs": 12,
    "kinds": [
      "div",
      "span",
      "button"
    ],
    "tabindex": [
      -1,
      0
    ],
    "role": "menu",
    "conclusion": "Failure is not specific to negative tabindex. Button element retains menu role;default button semantics are not certified."
  },
  "observation": {
    "component": "plugin-free public div/span menu-role reduction",
    "element": "focus-control",
    "states": [
      "public focus request",
      "settled before update",
      "unchanged update"
    ],
    "dpr": [
      1,
      2
    ],
    "property": "scene request acceptance versus actual native semantic focus",
    "reference": "native focus succeeds and stays focused",
    "astylar": "surface.focus=true but immediate and settled native focus=false;unchanged update then focuses",
    "stage": "public renderer focus delegates to interaction state without scheduling semantic focus synchronization"
  },
  "sourceApplicability": {
    "currentMethodSha256": "3814563ee560c51ef0974a3d97aa2ae384828669e91914960dc293a548290737",
    "installedMethodSha256": "ee9a015e976d288f47177c2264057f02d83e6a046ecb81d88fa2d84f4df7f3fa",
    "comparison": "Complete current typed method transpiles to the installed method after whitespace-only comparison;installed file hash is a captured bundle input."
  },
  "causalSource": {
    "currentEventCallbackSha256": "c92afd2d70afdf17e82cb619f723ab1e9ab0e171168f74ba2865de774bc654a2",
    "installedEventCallbackSha256": "4896b71296450ee0f09fc0cab9ac5cbcefdda6e7fd6c0e808298d8fa47a4c2a4",
    "evidence": {
      "file": "artifacts/material-parity/public-focus-event-gate-full-path-proof-20261024.log",
      "sha256": "3d3c03b253a8603f5d7dae31c575b574c3d6a5d9ea91d66cd246d516b2f55c99"
    },
    "chain": "Public renderer delegates to focusElement;actual runtime setFocus emits focus;actual event callback excludes focus from queueFocusSync. No pointer transaction or text selection is active. Keydown/click controls queue sync.",
    "proof": "tests/material-parity/menu-popup-ax.spec.mjs: actual renderer event callback excludes public focus events from semantic synchronization"
  },
  "methodNegativeControl": {
    "action": "blurElement",
    "observation": "Complete current/installed runtime blur clears logical owner and actual event callback queues semantic focus synchronization for undefined owner.",
    "conclusion": "The tested callback is not generally dead;focus exclusion is specific. This is isolated scheduling evidence,not public browser blur acceptance."
  },
  "justification": "All four equal-input package-root pairs author tabindex=-1. Request returns true yet semantic DOM remains unfocused after surface.whenSettled and two animation frames,before any update. An unchanged-document update moves focus. Current/installed renderer focus methods delegate directly to interaction.focusElement;the update path separately queues semantic focus synchronization. This is not the showcase omitted-tabindex input defect. The inherited pass verifier still fails;focused audit assertions preserve the failure rather than weaken it.",
  "boundary": "Confirmed in the tested public menu-role request path;not all control kinds,public blur,modal/pointer/selection/lifetime or whole current rendering. Both failed original/settled probes and twelve-pair controls are retained.",
  "applicationAttribution": {
    "source": "examples/material-showcase/src/app/astylar.component.ts",
    "sourceSha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd",
    "focusCallSites": 7,
    "menuOpening": "No focus request;core synchronization correction alone cannot supply missing item-focus intent.",
    "dialogOpening": "Requests nonexistent dialog-dismiss while authored autofocus target is dialog-cancel;keep application target mismatch separate.",
    "bottomSheetOpening": "Requests existing bottom-sheet-dismiss after settlement;the same target is already autofocus.",
    "restoration": "Most requests accompany state changes;an update may synchronize semantic focus and mask the standalone API gap. Not seven proven runtime failures."
  },
  "configuredActionApplicability": {
    "family": "menu",
    "state": "focus",
    "originalRunner": "e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0",
    "action": "Both original/current runner focus branches call native HTMLElement.focus on the semantic target,not public surface.focus.",
    "proof": "tests/material-parity/menu-popup-ax.spec.mjs: original and current configured Menu focus actions target native semantic DOM rather than public surface focus",
    "boundary": "Do not attach this public-request failure to configured native-focus cases or count native-focus results as public API coverage."
  },
  "nextChecks": [
    "Compare ordinary default-role button public-focus controls;tabindex=0 menu-role controls already reproduce the gap.",
    "General correction should distinguish programmatic scene-origin focus from native DOM-origin focus;do not simply remove focus/pointer/selection guards.",
    "Keep directional selection,held pointer and modal ownership constraints in the eventual general fix;do not add Menu-specific focus workarounds."
  ],
  "pattern": "focus\\(elementId: string, options: AstylarFocusOptions \\| undefined, scene: Scene\\): boolean",
  "evidence": [
    {
      "file": "artifacts/material-parity/public-menu-negative-tabindex-settled-20261024/latest-report.json",
      "sha256": "a75f974f1b8570c4a8dadde51f65115e93703d3ea796a5993f4deadf7f4d889c"
    },
    {
      "file": "artifacts/material-parity/public-programmatic-focus-controls-20261024/latest-report.json",
      "sha256": "4696d253fbd95a1504b7de4d067c3eb92904bf595e5dfd8bad8aab32fb9144ab"
    },
    {
      "file": "artifacts/material-parity/public-focus-event-gate-full-path-proof-20261024.log",
      "sha256": "3d3c03b253a8603f5d7dae31c575b574c3d6a5d9ea91d66cd246d516b2f55c99"
    },
    {
      "file": "artifacts/material-parity/public-focus-initial-api-history-retry-20261024.log",
      "sha256": "cf320ba25889189c46c2a9fb535a0a3d3763eddf1c40dbe65250679878cf7a7a"
    }
  ]
}),
  Object.freeze({
    "id": "core-readonly-text-keyboard-defaults-mutate-value",
    "introducedBy": "Six current/installed method bodies agree;first-bad revision and historical runtime not established",
    "file": "src/app/services/dom/input/keyboard-input.handler.ts",
    "pattern": "private handleTextInput\\(",
    "classification": "confirmed-core-renderer-defect",
    "owner": "shared core text-control keyboard default and readonly mutation boundary",
    "focusedProof": "tests/material-parity/input-boundary-evidence.spec.mjs: public readonly keyboard mutation preserves equal inputs and binds current default owners",
    "observation": {
      "component": "public package-root plugin-free text input",
      "element": "control",
      "dpr": [
        1,
        2
      ],
      "states": [
        "writable",
        "readonly",
        "disabled"
      ],
      "actionBoundaries": [
        "Home",
        "x",
        "Delete",
        "Backspace"
      ],
      "reference": "Readonly value remains Atlas while focused and readOnly=true",
      "astylar": "Readonly value becomes xAtlas then xtlas then tlas while focused and readOnly=true",
      "stage": "focused core keyboard defaults reach text insertion/deletion without enforcing authored readonly"
    },
    "justification": "Identical public SiteData and styles produce a readonly semantic input on both sides. Trusted keyboard actions mutate the candidate despite readOnly=true before any Material callback can normalize state. Four writable controls match the mutation sequence and four disabled controls remain unchanged/unfocused. Six complete compiled-current/installed owning methods agree. The public reproduction has no Material plugin,application callback,document update or compensating authoring. This is a core control-default defect,not missing semantic readonly or a fixture text mismatch.",
    "evidence": [
      {
        "file": "scripts/audit-public-readonly-editing.mjs",
        "sha256": "60fcf3d822f15a7ccfefddc8590c0acfda4af914661c6897a06b2f4e39a5384f"
      },
      {
        "file": "artifacts/material-parity/public-readonly-editing-recovered-20261020/latest-report.json",
        "sha256": "8a54156092f7f25fd64c546175ce5e7682636966c794f893209d1b10c5baedb0"
      },
      {
        "file": "artifacts/material-parity/public-readonly-owning-methods-20261020.log",
        "sha256": "4d4dd8440ab6c2a3c9c357b24fa6f6d00110f67b288284a86466b8d73500b81a"
      },
      {
        "file": "artifacts/material-parity/public-readonly-editing-independent-20261020.log",
        "sha256": "9642dda3ecba5be6f85b6df7f6f5813e6963f615f0f24cb48d48db86f3a6daa4"
      },
      {
        "file": "artifacts/material-parity/public-readonly-owning-proof-20261020.log",
        "sha256": "d3c960a1df20680f0ac8ce4adcb8323b0eb2c5bf52482b5157091c23214f77d5"
      }
    ],
    "publicReproduction": {
      "command": "node scripts/audit-public-readonly-editing.mjs --verify artifacts/material-parity/public-readonly-editing-recovered-20261020",
      "pairs": 6,
      "readonlyFailures": 2,
      "writableControls": 4,
      "disabledControls": 4,
      "negativeControls": 6,
      "currentRenderingAccepted": false
    },
    "recommendation": "Enforce readonly for mutating defaults at the shared core control boundary. Preserve keyboard event delivery,focus,allowed programmatic value changes and independently verified native navigation/selection behavior. Do not patch the Material select or add application callbacks to undo edits.",
    "boundary": "Only demonstrated Home/x/Delete/Backspace value mutation at DPR1/2. Clipboard,paste/cut,textarea,dynamic readonly updates,other types/browsers,readonly navigation semantics and selection/caret raster remain unproved. Does not close all94 Material readonly cases or any whole comparison."
  }),
  Object.freeze({
    id: 'core-text-backing-ceil-rescales-logical-line-height',
    introducedBy: 'current installed and captured owner agreement; first-bad revision not established',
    file: 'src/app/services/text/text-canvas-renderer.service.ts',
    pattern: String.raw`canvas\.height = Math\.ceil\(dimensions\.height \* devicePixelRatio\);`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'text logical-size, backing allocation and texture UV sampling boundary',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: equal explicit line height isolates text backing allocation from authored geometry',
    evidence: [
      { file: 'artifacts/material-parity/public-explicit-line-backing-20261019.log', sha256: '6a480999fe86e2d1ae7b19b79b7949ad79f13d83cf2a2b1a5a3fbe55d2463d74' },
      { file: 'artifacts/material-parity/divider-backing-owners-bound-20261019.log', sha256: '3089be882519251bfda7c660ad1c050edbce7421f3cda67de0c84dd8e26bf13a' },
    ],
    observation: { component: 'public plugin-free paragraph/span', property: 'allocated versus logical text height',
      states: ['explicit 22px line-height at 16px and 18.4px Arial'], dpr: [1],
      reference: 'both CSS paragraph heights22px', astylar: 'both logical heights22px; backing22px control versus23px fractional-font case with full UV range',
      stage: 'line-height multiplier roundtrip, integer backing allocation, then logical-size texture mapping' },
    publicReproduction: { pairs: 2, matchedGeometryControls: 2, backingMismatchCases: 1, currentRenderingAccepted: false },
    justification: 'Both sides retain identical public SiteData/CSS intent and 22px container geometry without Material offsets. 18.4*(22/18.4) produces22.000000000000004 before ceil allocates23px;16px control allocates22px. Full UV range maps the backing onto logical22px text. Five complete installed/captured methods agree under explicit syntax-only normalization. Native local baseline and raw draw y agree;this does not prove projected glyph equality or quantify blur/antialiasing. Preserve CSS fractional dimensions;fix at allocation/sampling boundary rather than round layout or retune fixtures. Separate existing transparent-backing/local-phase mechanisms and independent normal-strut mismatch. DPR2,other fonts and pixel-level impact remain open.',
  }),
  Object.freeze({
    "id": "core-legacy-css-clip-not-translated",
    "introducedBy": "current public support observation and complete resolver-owner agreement;first-bad runtime revision not established",
    "file": "src/lib/astylar-document-style-resolver.ts",
    "pattern": "function createPropertyFamilies\\(",
    "classification": "documented-limitation",
    "owner": "core public style schema,loaded-document CSS translation and CSS-space clipping support",
    "observation": {
      "component": "public package-root loaded CSS",
      "element": "absolutely positioned20x20 red target",
      "dpr": [
        1,
        2
      ],
      "states": [
        "unclipped control",
        "clip:rect(0px,0px,0px,0px)"
      ],
      "reference": "clipped targets paint0 red pixels;unclipped controls400/1600",
      "astylar": "clipped and unclipped targets paint400/1600 red pixels;clip declaration produces exact unsupported-property diagnostic",
      "stage": "missing legacy clip translation before layout/paint,not an equal-input supported-feature regression"
    },
    "justification": "Four public paired cases use identical trees and loaded CSS. Two unclipped controls agree;both legacy rect clipping cases differ and report unsupported clip. Source schema/diagnostic property set/loaded translation omit legacy clip,while overflow clipping remains a separate supported property/value. All12 complete resolver methods and five top-level owners match current emission to captured installed JS. This documents a core support limitation without asserting intentional design,all clip forms,physical focus-anchor behavior or a newly broken claimed feature. Native124 clipped-anchor requests across62 sidenav cases remain explicit inputs;their omission is not equivalent merely because this feature is unsupported.",
    "evidence": [
      {
        "file": "scripts/audit-public-legacy-clip.mjs",
        "sha256": "ccd38945a6e7652ed1d5e6ff8dea8677c7642033d1f10b1ffb5c48da0c25043a"
      },
      {
        "file": "artifacts/material-parity/public-legacy-clip-valid-input-20261018/latest-report.json",
        "sha256": "c40009cf090eafbaf7db830287fed18c970fa90aa9792e8fd1245698ccbb0169"
      },
      {
        "file": "artifacts/material-parity/public-legacy-clip-valid-input-verify-boundary-20261018.log",
        "sha256": "b95993ad7fbea968882fd157399af8c026f5f3678c42e87ff8e493164df082c9"
      },
      {
        "file": "artifacts/material-parity/public-legacy-clip-current-owner-trim-20261018.log",
        "sha256": "ca5d93399fb05221241c942b39150fb152fad6b4ad58c32b9504c8fa59fb2e19"
      },
      {
        "file": "artifacts/material-parity/legacy-clip-core-contract-20261018.log",
        "sha256": "a7b14ec49bc5f2523092f2866937637e9f98ba3defc940ad599db5b47b3fbd95"
      }
    ],
    "focusedProof": "tests/material-parity/legacy-clip-support-input.spec.mjs: public legacy clip support limitation preserves controls and exact diagnostics",
    "publicReproduction": {
      "command": "node scripts/audit-public-legacy-clip.mjs --verify artifacts/material-parity/public-legacy-clip-valid-input-20261018",
      "pairs": 4,
      "unclippedControls": 2,
      "unsupportedClipFailures": 2,
      "negativeControls": 4
    },
    "recommendation": "Keep legacy clip support work at the shared typed/loaded CSS and clipping boundary. Do not substitute overflow,clip-path,offsets or removed focus anchors to imitate output. A future implementation must preserve CSS-space rect semantics and validate supported forms before projection.",
    "boundary": "Bounded zero-rect legacy clip support result and current resolver applicability. No all-rect/dynamic/inherited/AT/focus semantics,full package acceptance or Material anchor impact. No renderer/fixture fix."
  }),
  Object.freeze({
    id: 'core-semantic-attribute-refresh-removes-focusability',
    introducedBy: '0175a0bdc introduces clear-and-restore attribute loop;historical first-bad runtime not established',
    file: 'src/lib/astylar-semantic-bridge.ts',
    pattern: String.raw`node\.removeAttribute\(attribute\.name\);`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core semantic attribute reconciliation and retained focusability',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: public role focus refresh separates attribute-first and root-first failures with unchanged input',
    observation: { component: 'public package-root unchanged-document controls',
      element: 'unique retained DIV/SPAN with explicit tabindex0', dpr: [1, 2],
      state: 'two no-op surface.update calls per paired context',
      reference: '16 native side updates retain focus with no focus events',
      astylar: '8 role-control updates first blur in removeAttribute(tabindex);8 native input/button updates instead first blur at root replaceChildren;all16 restore final focus',
      stage: 'semantic attribute refresh before root replacement,not CSS layout or Babylon projection' },
    justification: 'Equal authored public SiteData and native DOM controls retain unique IDs,roles,tabindex,content and styles. DIV/SPAN focusability is temporarily removed by clear-and-restore applyAttributes during unchanged updates. Actual public first-loss stacks and complete current/emitted/installed method equality bind this cause. Native input/button controls distinguish the later root defect;native no-op controls preserve focus. Final focus and identity recovery do not make the extra blur/refocus sequence equivalent. Do not compensate through application refocus or suppress events.',
    evidence: [
      { file: 'artifacts/material-parity/public-role-focus-refresh-20261017/latest-report.json', sha256: 'd921c9a64118a4996bd0e3bd7d10101378f44303575729e43883828417492840' },
      { file: 'artifacts/material-parity/public-role-focus-refresh-owner-20261017.log', sha256: 'cfd2278b15d92b3bc1594c6956d119a9ed65aa887b9d2692d76fde371d855196' },
      { file: 'scripts/audit-public-role-focus-refresh.mjs', sha256: 'b0ffd7893972731130156efec261b44fb9e322b7b9f031891cdbdb18f2525ba6' },
      { file: 'artifacts/material-parity/public-role-focus-refresh-verify-20261017.log', sha256: '5e8a588da772ec1a1a9a157589f6a4c9e6691ea7d897c0faf6ef3cd9b9888bb4' },
      { file: 'artifacts/material-parity/role-control-attribute-focus-boundary-20261017.log', sha256: 'bcd8a0dcb6bd2c6a20125fc8a10ed0993c5702f1007a4c2f64f615642f33cf92' },
    ],
    publicReproduction: { command: 'node scripts/audit-public-role-focus-refresh.mjs --verify artifacts/material-parity/public-role-focus-refresh-20261017',
      negativeControls: 3, attributeFirstFailures: 8, rootFirstControls: 8, nativeNoopControls: 16 },
    recommendation: 'Preserve unchanged focus-critical attributes through general attribute reconciliation;also preserve focused descendants across the separate root/child replacement boundary. No fixture refocus,custom event suppression or coordinate compensation.',
    boundary: 'Bounded public focus-event continuity and actual first-loss owner only. Not every Material activation first-blur owner,other attributes,keyboard/AT/selection/paint or full current package acceptance.',
  }),
  Object.freeze({
    id: 'core-inline-replaced-row-omits-parent-line-box',
    introducedBy: 'public equal-input reduction and current CSS row owner; first-bad runtime revision not established',
    file: 'src/app/services/dom/elements/element-creation.service.ts',
    pattern: String.raw`currentLineHeight = Math\.max\(\s*currentLineHeight,\s*marginBox\.top \+ childHeight \+ marginBox\.bottom,`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core CSS inline formatting row height and parent font/line-box contribution before projection',
    focusedProof: 'tests/material-parity/icon-asset-input.spec.mjs: public inline image line boxes retain eight failures and eight block controls; inline image line height divergence occurs in current CSS row sizing before projection',
    evidence: [{ file: 'artifacts/material-parity/public-inline-image-linebox-20261017/latest-report.json', sha256: 'f7120e8e0aba684a3d0ea5cebf47ea37b9f79158ebd58e5eff2d193e11d22bc1' }],
    observation: { component: 'public auto-height div containing one24px PNG', states: ['inline-block image', 'block image control'], dpr: [1, 2],
      property: 'parent used height', reference: 'inline28/29/30/31px;block24px', astylar: '24px in every case', stage: 'CSS inline row sizing before world projection' },
    justification: 'Sixteen paired public cases preserve identical authored structure,styles and PNG,Arial16/24 and normal/explicit1.25x line height atDPR1/2. Eight inline-block cases fail by-4/-5/-6/-7CSSpx while all eight block controls match;image top positions agree. Four complete current/emitted/installed methods agree. Actual layoutInlineChildren execution with inert projection/paint adapters computes24px without reading parent fontSize or lineHeight:row height is maximum child margin-box height,omitting the parent line-box contribution before projection. Explicit line-height failures separate this from the normal Mg-probe finding. Fix general inline formatting/strut sizing,not Material root heights or offsets. Other replaced elements,wrapping,vertical-align variants,exact replacement font metrics and contribution to unequal Material SVG/flex inputs remain unproved. Broad40ac6f4fc blame is not established first-bad runtime history.',
  }),
  Object.freeze({
    id: 'core-fractional-border-edge-paint-disagrees-with-native',
    introducedBy: 'public equal-input reduction and current owning methods; first-bad revision not established',
    file: 'src/app/services/babylon-mesh.service.ts',
    pattern: String.raw`const vertexData = this\.createPolygonFrameVertexData\(`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core border final edge coverage/compositing after correct projected geometry',
    focusedProof: 'tests/material-parity/icon-asset-input.spec.mjs: public border live frame preserves fractional geometry and all original raster bytes; public border contact capture binds complete current border construction and placement owners; public border contact reduction isolates fractional edge mismatch without shadows',
    evidence: [{ file: 'artifacts/material-parity/public-border-contact-20261017/latest-report.json', sha256: '89e5abb3b94d0b1aadbd3d2e8e7818c760f34fe54675946c5d4a284003640aab' },
      { file: 'artifacts/material-parity/public-border-contact-geometry-20261017/latest-report.json', sha256: '6d9dd5c43393d686cdebb7b3c014f08b2cc97d1908298860c161e2e2fe98a952' }],
    observation: { component: 'public plugin-free bordered div', property: 'fractional bottom border pixels', states: ['shadow-off', 'shadow-on'], dpr: [1, 2],
      reference: 'integer shadow-free controls match; fractional border occupies native solid row',
      astylar: 'fractional shadow-free maximum channel errors22/44 despite correct1px live frame', stage: 'edge paint after projected geometry' },
    justification: 'Eight equal-input public pairs preserve1px border ink,width,radius,fill and shadow-off/on requests. Integer shadow-free controls match exactly;fractional shadow-free cases fail22/44RGB atDPR1/2. Live132-vertex frames retain exact outer/inner edges166.546875/165.546875 CSSpx;all16 original screenshots reproduce byte-for-byte after read-only instrumentation. Fifteen complete current/emitted/installed construction/material/placement methods agree;changed subtraction/sign controls reject. This confirms a bounded core paint discrepancy,not displaced frame geometry or solely Material shadow-alpha authoring. Exact GPU/browser coverage algorithms,all phases/edges/colors and contribution to unequal Material inputs remain unproved. Fix the general final border-paint contract,not fixture offsets or CSS layout rounding;retain separate shadow failures and original pixels.',
  }),
  Object.freeze({
    id: 'core-semantic-text-transform-not-projected',
    introducedBy: 'public equal-input reduction and complete owning-method comparison; first-bad revision not established',
    file: 'src/lib/astylar-semantic-bridge.ts',
    pattern: String.raw`const semanticText = element\.textContent \?\?`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core resolved typography to browser semantic DOM projection',
    focusedProof: 'tests/material-parity/semantic-text-transform-input.spec.mjs: public semantic text transform preserves controls and current owner evidence',
    evidence: [{ file: 'artifacts/material-parity/public-text-transform-ax-20261017/latest-report.json', sha256: '9f6b365fe93fe01b8a3e375247aaceb5d43bd5791273570da74efc75c06556f6' },
      { file: 'artifacts/material-parity/icon-heading-ax-20261017/latest-report.json', sha256: '1e2136092c03bab263e22e45ef6d548eceae2ce91783f158dad2c3584eb3e46f' }],
    observation: { component: 'public h1 without Material plugins', element: 'title', states: ['none', 'capitalize', 'uppercase'], dpr: [1, 2],
      property: 'AX heading name and child text', reference: ['project atlas', 'Project Atlas', 'PROJECT ATLAS'],
      astylar: ['project atlas', 'project atlas', 'project atlas'], stage: 'resolved style omitted from semantic text projection' },
    justification: 'Six public package-root pairs preserve equal authored text and resolved textTransform. Both none controls match; all four transformed names fail while heading role/level1 agree. Complete current emitted reconcileElement/applyAttributes/semanticTagName methods equal captured installed owners: authored text is copied without computed textTransform projection. Sixteen actual-theme Material physical contexts separately expose the same title/eyebrow difference. Fix the authoritative resolved-style semantic boundary,not fixture content or plugin text. Inheritance,locale,updates,explicit naming precedence and AT speech behavior remain unverified; no whole-case or current full-package acceptance.',
  }),
  Object.freeze({
    id: 'core-public-semantic-subset-omits-accessibility-only-hiding',
    introducedBy: 'current public type/bridge and checkpoint AX evidence; first-bad revision not established',
    file: 'src/app/types/dom-element.ts',
    pattern: String.raw`ariaLabel\?: string;`,
    classification: 'documented-limitation',
    owner: 'public semantic input contract and core semantic bridge attribute projection',
    focusedProof: 'tests/material-parity/sort-focus-structure.spec.mjs: current badge and icon accessibility nodes expose hiding differences omitted by target semantics',
    evidence: [{ file: 'artifacts/material-parity/passive-descendant-semantics-20261006.log', sha256: 'aa5932cda3140e3f15fa661316c9da38a7e8b274fe6dce24eccb63602233147d' },
      { file: 'artifacts/material-parity/passive-badge-icon-ax-verified-20261006.log', sha256: 'be9aab6af9e9033e6d81efaee354bdb1aa5b4b237d4074edacda499f241a2516' }],
    observation: { component: 'badge/icon', element: 'badge-count/icon-primary', states: ['static'], profiles: ['light'], dpr: [1],
      property: 'accessibility-only hiding', reference: 'badge count/icon ignored through ariaHiddenElement',
      astylar: 'count StaticText4 and image Favorite exposed', stage: 'missing supported authored semantic input and browser semantic mirror' },
    justification: 'Public DOMElement has no ariaHidden property and bridge applyAttributes has no per-element ARIA-hidden projection. The visual hidden property excludes content and is not an equivalent replacement. Authenticated descendant inputs cover354 passive cases; actual partial AX evidence covers light desktop DPR1 badge/icon only. Existing target name/role comparisons omit hiding and therefore pass despite exposure differences. This is a demonstrated support gap and unequal input contract,not an equal-input final-rendering failure or all-profile AX claim. Add supported accessibility-only intent at the owning core/public boundary before restoring comparison input; never hide visible graphics through fixture offsets or visual hidden. Other relationships and complete accessibility remain open.',
  }),
  Object.freeze({
    id: 'fixture-list-content-wrappers-and-row-sizing-substituted',
    introducedBy: '2f440115 initial Material showcase already has flattened flex rows and density constants',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.list-item', width: '100%'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase list component structure, clipping and density token translation',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: current list wrapper inputs retain clipping and row-height divergence for all configured cases',
    evidence: [{ file: 'artifacts/material-parity/list-wrapper-layout-inputs-20261006.log', sha256: '37a6756edd30de888c92a918927cc9349ab22f96824559c19467d0d1269bda24' }],
    observation: { component: 'list', element: 'list-inbox/list-archive label ancestry', states: ['all52 configured cases'],
      property: 'wrapper layout and row-height inputs', reference: 'growing clipped nowrap/ellipsis wrappers; heights48/24/40px',
      astylar: 'flattened label/item/list chain; heights56/40/48px', stage: 'authored structure and resolved requests before projection' },
    justification: 'All52 current-full cases/104 labels authenticate native growing content and primary-text wrappers versus candidate flattened ancestry. Native clipping,nowrap and ellipsis are not layout-neutral; generic centered flex rows and16px label margin do not preserve those inputs. Exact height populations48/56,24/40,40/48 and Git introduction separate initial authoring substitution from a recent renderer regression. Root scalar observation-stage classifications cannot certify omitted descendant behavior. Restore component structure and tokens before assigning residual equal-input flex/text faults to core. Long-text runtime clipping and complete paint are not established by this input proof; do not tune candidate offsets to reproduce current short labels.',
  }),
  Object.freeze({
    id: 'core-scroll-client-area-does-not-reserve-native-gutter',
    introducedBy: 'current public equal-input reduction; first-bad revision and original Material output attribution not established',
    file: 'src/lib/astylar-scroll-runtime.ts',
    pattern: String.raw`const clientWidth = Math\.max\(0, dimensions\.width - borderBoxAdjustment\);`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core CSS scroll client-area calculation before projection',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: public equal-input overflow isolates scrollbar gutter before projection',
    evidence: [{ file: 'artifacts/material-parity/public-scrollbar-gutter-395d497-final.log', sha256: '81147bef048755edebab10b4724583c661f0f8aa7b2534dc483b53788f9fe6f6' }],
    observation: { component: 'public div overflow reduction', element: 'box', states: ['auto', 'scroll'], dpr: [1, 2],
      property: 'clientWidth', reference: 245, astylar: 260, stage: 'CSS client geometry before Babylon projection' },
    justification: 'Equal 260x128px zero-border/padding boxes with a 400px child expose native clientWidth245 versus candidate260 at Chrome154 DPR1/2. The installed createContainer method matches current source and subtracts borders only, locating divergence before final projection. Hidden overflow is a separate control with no candidate public scroll-container entry. The observed15px gutter is platform-specific, not a new constant. Native-control styling exclusions do not justify silently shrinking fixture inputs: reconcile the core client-geometry contract and catalog explicitly. Native scrollbar paint, mousewheel/thumb behavior, other platforms and original unequal Material popup boxes remain separate.',
  }),
  Object.freeze({
    id: 'core-caret-focus-allocation-escapes-render-owner',
    introducedBy: 'current public lifecycle reduction and complete installed/current method comparison; first-bad revision not established',
    file: 'src/app/services/dom/input/text-cursor.renderer.ts',
    pattern: String.raw`textInput\.cursorMesh\.dispose\(\);`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core interaction resource adoption and caret material lifetime',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: public input lifecycle isolates caret material retention without Material plugins; tests/material-parity/sort-focus-structure.spec.mjs: dark mobile field popup cycles diagnose retained cursor materials',
    evidence: [{ file: 'artifacts/material-parity/public-caret-ownership-e1a737f-final.log', sha256: '931e1c04fd561d11fc810ca01e4b3544af63474bfc944f24edd2e6fc3b580a52' },
      { file: 'artifacts/material-parity/field-popup-cursor-retention-8c2f911-verified.log', sha256: '937d29cc8c215465bb9aeb547fd18ab6390da341b7fbf46cf442598b176433a3' }],
    observation: { component: 'public input without Material plugins', element: 'lifetime-input',
      states: ['focus', 'blur', 'same-ID update', 'remove/recreate', 'surface disposal'], dpr: [2],
      property: 'unbound caret materials after removal', reference: 'zero owned resources for removed input',
      astylar: [1, 2, 3], stage: 'post-render focus allocation and control disposal' },
    justification: 'Chrome154 public input focus creates caret mesh/material outside the synchronous replace transaction: live resource counts increase while tracked counts remain unchanged. remove/recreate leaves1/2/3 unbound cursor materials; disposeCursor disposes its mesh but not the separate material. Complete installed/current methods bind allocation, replace/adoption and cleanup. Focus restoration inside replacement adopts later caret materials, explaining same-ID plateau without contradicting removal accumulation. Whole-surface disposal clears the scene, not the violated control-lifetime invariant. Frozen dark/mobile autocomplete/timepicker cycles independently retain matching cursor materials, but their teardown is not runtime-instrumented at every call. Own interaction-created resources and release caret material at its actual lifetime boundary; do not force popup rebuilds. This is not GPU retention, user-lag attribution or full multi-surface/late-async acceptance.',
  }),
  Object.freeze({
    id: 'core-text-transparent-backing-and-local-raster-phase',
    introducedBy: 'current public equal-input raster reduction; no original historical blur attribution or first-bad revision',
    file: 'src/app/services/text/text-canvas-renderer.service.ts',
    pattern: String.raw`const ctx = canvas\.getContext\('2d'\);`,
    classification: 'suspected-core-renderer-defect',
    owner: 'core text raster backing, local glyph sampling and compositing fidelity contract',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: public equal-input text separates fractional origins from texture raster phase',
    evidence: [{ file: 'artifacts/material-parity/public-text-backing-phase-a9591d1-final.log', sha256: 'a82e6f9540ac774e4f5c784622153e933ba1002d54c827823a79aeec37f7b27c' }],
    observation: { component: 'public equal-input text reduction', element: 'four ordinary text divs',
      states: ['origins 80/80.25/80.5/80.75 CSS px'], dpr: [1, 2], property: 'glyph raster',
      reference: 'native CSS text and direct opaque canvas content crops match in eight cases',
      astylar: 'transparent local glyph raster differs; nearest sampling preserves local rather than global fractional phase',
      stage: 'text backing rasterization, then final texture sampling' },
    justification: 'Pinned Roboto12/16 with .4px tracking and four fractional origins isolates two effects. Transparent browser canvas already differs from native opaque-background glyph raster before Babylon; direct opaque canvas crops match native in all eight DPR/origin cases. Local textures are identical across origins while native glyph raster responds to global fractional origin. Correct projected plane positions and line-box metrics rule out coordinate/baseline displacement in this reduction. Owning methods match current installed source. The mechanisms are demonstrated, but compatibility-qualified canvas text fidelity requires an explicit contract decision before a blanket defect claim or implementation. Other fonts/backgrounds, transparency/compositing and historical tooltip blur remain open. Never make every atlas opaque, offset candidate text or use registered SSIM as acceptance.',
  }),
  Object.freeze({
    id: 'core-rounded-radius-sampling-uses-unclamped-request',
    introducedBy: 'current source and installed-package browser proof; no first-bad revision or original-capture runtime attribution',
    file: 'src/app/services/babylon-mesh.service.ts',
    pattern: String.raw`const segmentLength = Math\.max\(0\.001, radius / 10\);`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core rounded geometry normalization and curve sampling before final projection',
    justification: 'Public-package div and button reductions at DPR1 and DPR2 preserve equal 480x48px boxes and radius9999px declarations but render square-ended four-vertex rectangles instead of native capsules; 24px and 36px controls pass the bounded shape-mask check. The polygon library normalizes all three requests to24px arcs, while core derives segment length from the unnormalized request, producing68/44/4 vertices. Source-extracted methods reproduce the same counts at scale1 and0.01. Normalize used corner geometry before choosing sampling density; do not substitute a fixture-specific small radius to hide this defect. Evidence is current public rendering and the owning kernel, not original capture-bundle behavior, historical compensation intent, complete antialiasing parity or all shape types.',
    focusedProof: 'src/parity/rounded-radius.audit.spec.ts; tests/material-parity/modal-position-inspection.spec.mjs: current rounded rectangle kernel',
  }),
  Object.freeze({
    id: 'fixture-dialog-action-font-tracking-tokens-omitted',
    introducedBy: '2f44011 introduces independent dialog-action controls without Material font/tracking tokens; af04845 subsequently supplies the document control font reset',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.dialog-action', width:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase dialog action Material button token translation',
    justification: 'Cancel and Save inherit separate text/filled button font and tracking tokens in the original dialog. The replacement dialog-action omits them, uses the document control font stack and supplies zero tracking. Complete overlay/action identity, ordered reference rules and candidate reset/omission chains distinguish unequal authoring from a core font or spacing defect. Preserve original tokens and nested structure; fixed sampled button widths are not a valid substitute for intrinsic text layout.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: dialog action typography retains distinct text and filled tokens without accepting equal inputs',
  }),
  Object.freeze({
    id: 'fixture-outlined-button-literal-replaces-outline-token',
    introducedBy: '2f44011 authors the outlined button border as #79747e; the literal persists',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.outlined'[^\n]*borderColor: '#79747e'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material outlined-button color-token input translation',
    justification: 'The unchanged reference explicitly authors border-color:var(--mat-button-outlined-outline-color, var(--mat-sys-outline)). In all four captured profiles the component override is absent, the fallback remains light-dark(#7b757f, #958e99), and the browser computes RGB 123,117,127. Candidate .outlined instead authors #79747e (RGB 121,116,126), retained by normal/effective/interaction inspection. This is a different authored color input, not a renderer color-parser failure or acceptable near-color alias. The border shorthand is preserved in captured cssText even though variable-containing expanded longhands serialize empty. Restore the equivalent theme/token path rather than sample the currently used reference color. No active/disabled border paint or whole-component equivalence claim is made.',
    focusedProof: 'scripts/audit-material-outline-inputs.mjs: unchanged four-profile paired capture; browser outline-token controls in input-equivalence-audit.spec.mjs',
  }),
  Object.freeze({
    id: 'fixture-toggle-group-literal-replaces-divider-token',
    introducedBy: 'c47d589 adds the toggle group border with literal #79747e',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#button-toggle-primary'[^\n]*borderColor: '#79747e'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material toggle-group border token input translation',
    justification: 'The reference group authors a solid 1px border using var(--mat-button-toggle-divider-color, var(--mat-sys-outline)), not the candidate literal #79747e. The checkpoint-bound four-profile capture observes the same live token fallback and RGB 123,117,127 on every reference border, versus candidate RGB 121,116,126 at all three core style stages. An inactive forced-colors rule shares the reference selector but declares only outline:0; it is recorded separately and cannot be mistaken for the active border rule. This identifies unequal color authoring, independently of the group sizing, clipping and native-button structure findings. It does not establish an intentional historical workaround or a core equal-input paint defect.',
    focusedProof: 'scripts/audit-material-outline-inputs.mjs: toggle-group border token and complete paired input trees',
  }),
  Object.freeze({
    id: 'fixture-toggle-divider-literal-replaces-divider-token',
    introducedBy: 'c47d589 adds the second toggle border with literal #79747e',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#button-toggle-two'[^\n]*borderColor: '#79747e'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material toggle divider side-specific color-token input translation',
    justification: 'The reference second toggle authors only border-left:solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline)); the candidate sets borderWidth:0 0 0 1px with a four-side literal color #79747e. The four-profile capture proves the painted-side input differs: browser left-border RGB 123,117,127 versus candidate RGB 121,116,126 at every inspected stage. Other reference sides retain their own initial color/style semantics and are not covered by this token attribution. Restore the side-specific authored border intent, not a sampled global color, custom border mesh or rounded overlay. Shape, clipping and actual final border raster remain separate.',
    focusedProof: 'scripts/audit-material-outline-inputs.mjs: left-divider-only token witness; no other-side equivalence inference',
  }),
  Object.freeze({
    id: 'fixture-button-border-reset-reduced-to-width',
    introducedBy: '2f44011 authors only zero border width in the initial material-button rule; the omission persists',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.material-button'[^\n]*borderWidth: '0'[^\n]*background: theme\.primary`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material button border-reset input translation and core contextual color support',
    justification: 'The captured reference .mdc-button border:none expands to medium width, none style and currentColor on all four sides. The candidate material-button, text-button and toolbar-action rules set only borderWidth:0 and retain the core transparent color default. Browser controls show that width-only does not reset preexisting style or color, even though both cases currently have zero used border width. This is incomplete translation of authored reset semantics, not equivalent inputs or proof of equal-input renderer failure. Preserve the existing separate core currentColor and alpha-paint findings; do not replace the keyword with a sampled color or hide this difference because no border currently paints.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: browser border reset and capture-backed Material button attribution',
  }),
  Object.freeze({
    id: 'fixture-material-button-appearance-reset-omitted',
    introducedBy: '2f44011 initial material-button and dialog-action authoring omit the original appearance reset; source history only',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.material-button'(?:(?!appearance:)[^\r\n])*borderWidth: '0'(?:(?!appearance:)[^\r\n])*background: theme\.primary`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase original Material button appearance-reset input translation',
    justification: 'Installed Material .mdc-button CSS authors -webkit-appearance:none, exposed by the browser CSSOM as appearance:none. The mapped material-button, text-button, toolbar-action and dialog-action candidates omit that request across complete applicable rules, inline inputs and normal/effective declarations. Preserve the omitted reset as unequal authored intent rather than waiving it from similar custom-button pixels. Initial source omission is not evidence of a later workaround; core native-widget appearance support and final rendering remain separate questions.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: button appearance ownership, exclusion and replay tests',
  }),
  Object.freeze({
    id: 'core-border-initial-color-differs-from-css',
    introducedBy: '2c16e14 extracts the already-existing transparent default; not established as a Material workaround',
    file: 'src/app/config/browser-defaults.ts',
    pattern: String.raw`export const globalDefaultStyle:[\s\S]*?borderColor: "transparent"`,
    classification: 'intentional-documented-limitation',
    owner: 'core browser-compatible border initial-value contract and style defaults',
    justification: 'CSS Backgrounds 3 section 3.1 gives border colors the initial currentColor value. The catalog instead documents transparent background/border defaults, and public equal-input reductions resolve omitted candidate borderColor to transparent while the browser uses its authored color. This is a documented input-contract difference, not an equivalent representation or a new fixture compensation. The separate border-paint defect turns that transparent input into opaque black. Explicit-color controls pass for two colors. Reconcile the default contract at core before claiming equal omitted-input behavior; do not insert fixture-only border colors or waive differences because current border width is zero.',
    focusedProof: 'examples/material-showcase/src/app/border-color-input-audit.spec.ts: omitted and explicit border colors in two independent colors',
  }),
  Object.freeze({
    id: 'core-border-paint-discards-color-alpha',
    introducedBy: '36f44de already parses only RGB; a83ead8 assigns border material alpha from element opacity',
    file: 'src/app/services/dom/elements/element-border.service.ts',
    pattern: String.raw`const colorData = render\.actions\.style\.parseBackgroundColor\(style\.borderColor\);[\s\S]*?color = colorData\.color;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'ElementBorderService color parsing and ElementCreationService border material alpha',
    justification: 'Identical transparent and rgba(...,0.5) border inputs survive normal/effective inspection but the actually bound border material has alpha 1. Transparent parses null and falls back to black; RGBA parses alpha but parseBorderProperties returns only color. Creation assigns only element opacity to the material. Both colors produce 1376 opaque incorrect framebuffer pixels; explicit opaque-color controls pass. Preserve color alpha through core border paint and compose it correctly with element/ancestor opacity and state updates. This is actual equal-input paint failure, not evidence that a plugin or fixture must manufacture a replacement border.',
    focusedProof: 'examples/material-showcase/src/app/border-color-input-audit.spec.ts: transparent and half-alpha borders retain browser expectations and framebuffer evidence',
  }),
  Object.freeze({
    id: 'core-border-currentcolor-has-no-color-context',
    file: 'src/app/services/dom/elements/element-border.service.ts',
    pattern: String.raw`parseBackgroundColor\(style\.borderColor\)`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core contextual CSS color resolution before border paint',
    justification: 'The equal-input currentColor reductions preserve that keyword in normal/effective styles, but border parsing calls the background parser without the element color. Its unrecognized-value fallback paints RGB 51,51,77 for both authored colors instead of RGB 18,52,86 or 192,74,32. Bound material and framebuffer agree, while explicit-color controls pass. This confirms a CSS color-resolution capability gap; the catalog does not explicitly promise currentColor support, so this is not a claim that all CSS color syntax was previously supported. Implement contextual color resolution in core with inheritance and state/update tests, not fixture-side keyword substitution or a changed default fallback color.',
    focusedProof: 'examples/material-showcase/src/app/border-color-input-audit.spec.ts: currentColor versus explicit opaque color controls',
  }),
  Object.freeze({
    id: 'fixture-select-arrow-vector-to-glyph-substitution',
    introducedBy: '2f44011 substitutes a glyph; 3d0d5ce7 changes its shape/offset/size; 6647a875 retunes compact offset/size',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.select-caret', position: 'absolute'[^\n]*top:[^\n]*theme\.density[^\n]*right: '15px'[^\n]*fontSize:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase select arrow content, Material wrapper layout and vector input translation',
    justification: 'The reference authors a 24px SVG with path M7 10l5 5 5-5z inside flex/relative arrow wrappers. The candidate authors U+25BC as font-dependent text, absolutely positions it, and branches its size/offset by density. The initial implementation used U+25BE; 3d0d5ce7 changed the glyph and adjusted top/right/font size, and 6647a875 retuned compact top 14px to 8px and size 12px to 14px. Capture-backed correspondence preserves original vector and candidate text/style inputs without comparing SVG font properties as if they were glyph inputs. This is unequal authoring, not proof of core vector failure. Restore equivalent vector/composition inputs before diagnosing rendering.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: select arrow substitution preserves SVG and glyph inputs without inventing text correspondence',
  }),
  Object.freeze({
    id: 'fixture-expansion-font-size-token-omitted',
    introducedBy: '25e1893 adds compact-only size override; current omission persists outside that branch',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`family === 'expansion' && theme\.density <= -5 \? \[\{ selector: '\.expansion-title'[^\n]*fontSize: '16px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase expansion header font-size token and inheritance',
    justification: 'The reference header has an explicit Material font-size token that computes 16px independently of the page scale. Candidate title/trigger/panel omit that token and inherit the page size unless the compact-only fixture branch inserts 16px. Exact three-node reference inheritance and complete candidate normal/effective ancestry attribute the observed 18.4px custom title to unequal inputs. Preserve the component token for all equivalent states rather than treating the compact patch, fixed panel geometry or screenshot agreement as renderer proof.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: expansion font omission preserves component token and scaled page inheritance',
  }),
  Object.freeze({
    id: 'fixture-expansion-body-font-size-token-omitted',
    introducedBy: '2f44011 omits component body size; a0f3328 adds replacement content label; ac06193 retunes its inset without restoring the size token',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.expansion-content-label', position: 'absolute'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase expansion body font-size token and inheritance',
    justification: 'The reference paragraph inherits the expansion container text-size/body-large token through body and content wrappers, computing 16px independently of page scaling. The candidate replacement content label and its ancestors omit that component size and retain 14.4px or 18.4px from the page. Exact reference cascade, complete candidate normal/effective ancestry and absence of competing authored size rules distinguish omission from a renderer ignoring a supplied token. Restore original component typography and flow; offsets or inverse-scale adjustments do not repair equal-input rendering.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: expansion body size preserves its own component token and complete omission chain',
  }),
  Object.freeze({
    id: 'fixture-expansion-disabled-ink-preblended',
    introducedBy: 'bc4d442 adds surface-preblended disabled trigger ink',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.expansion-trigger\.disabled', color: mixHex\(theme\.surface, theme\.onSurface, \.38\)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase expansion disabled text token and transparency semantics',
    justification: 'The reference disabled header supplies a translucent component token and overrides title color to inherit it. The candidate preblends theme.onSurface into theme.surface and inherits that opaque literal from its disabled trigger. Exact disabled state, ordered token/inherit rules, candidate base/disabled rules and normal/effective/retained agreement expose unequal inputs; a color sampled against one surface is not a replacement for transparency. Restore token and alpha semantics before diagnosing core compositing, and retain disabled hit behavior and final raster as independent obligations.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: disabled component ink preserves translucent tokens and opaque candidate cascade',
  }),
  Object.freeze({
    id: 'fixture-sort-typography-substitution',
    introducedBy: '705cf58 adds fixed 17px; 5b74d1b changes it to 16px; 994da86b changes contrast ink to black',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.sort-trigger'[^\n]*color: theme\.density <= -5 \? '#000000'[^\n]*fontSize: '16px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase sort typography inheritance and contrast styling',
    justification: 'The browser sort text inherits frame font-size calc(16px * var(--scale)) and frame color. Candidate .sort-trigger explicitly supplies 16px and, in contrast, #000000. Captured complete reference ancestry and candidate leaf/trigger stages preserve the unequal inputs. Commit 705cf58 introduced fixed 17px, 5b74d1b changed it to 16px, and 994da86b, titled fix(material): complete shared control parity, introduced the black contrast branch. Restore inherited reference intent before assigning any core scaling/color defect. No screenshot-derived correction is implemented by this audit.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: sort typography attribution preserves inherited frame inputs and explicit trigger substitutions',
  }),
  Object.freeze({
    id: 'fixture-sidenav-color-token-substitution',
    introducedBy: '2f440115',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.sidenav(?:-content)?'[^\n]*color: theme\.mode === 'dark'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase sidenav component color-token translation',
    justification: 'The reference drawer and content inherit distinct Material component tokens: container-text-color/on-surface-variant and content-text-color/on-background. Candidate aside and main instead declare dark-mode literals or theme.onSurface. Captured reference token inheritance and candidate normal/effective/retained stages prove these unequal inputs independently of the previously recorded padding and positioned-flow substitutions. History places both declarations in the initial showcase implementation, not a later renderer repair. Restore component semantics before testing core color behavior; do not normalize small channel differences away.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: sidenav color tokens preserve distinct reference inheritance and literal substitutions',
  }),
  Object.freeze({
    id: 'fixture-field-label-color-substitution',
    introducedBy: '4d56f862 base/empty colors; f286fb17 timepicker shell; d973f847 datepicker shell',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '(?:\.field-label(?:\.empty-field-label)?|\.(?:timepicker|datepicker)-shell \.field-label)',[^\n]*color:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase filled-label color tokens and state-rule translation',
    justification: 'Reference mat-label inherits base/focus/hover/disabled/error color tokens from the native floating-label wrapper. Candidate base/empty/picker rules author literal colors, including #49454f, #1d1b20 and theme.onSurface. The earlier dark disabled #79747e rule is overridden by the later base rule; picker-shell rules also override base/empty error ink. Captured source order and parent classes distinguish base and equal-specificity empty/picker overrides; state attribution additionally requires the exact reference token declarations, filled-field ancestor state and v2 inspection provenance. The selected candidate declaration must agree with normal/effective/retained stages, so stale inspection or unexplained state disagreements are not waived. These unequal inputs must be restored before evaluating a core color/raster defect; no fixture tuning is performed by the audit.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: field color token and candidate cascade provenance',
  }),
  Object.freeze({
    id: 'core-inspection-reuse-detaches-authored-ancestry',
    introducedBy: 'b6dc672 inspection walks session.siteData; d48028f visual reuse retains renderer ancestry',
    file: 'src/lib/astylar.ts',
    pattern: String.raw`this\.ancestry\.withTree\(\{ id: 'root-body', type: 'div', children: session\.siteData\.root\.children \}`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core resolved-style inspection and reconciliation identity/ancestry',
    focusedProof: 'examples/material-showcase/src/app/label-cascade-input-audit.spec.ts: descendant rule last after equivalent-update',
    justification: 'The a1968ed equal-input label/span proof exposed update-only inspection failures: Session.update replaced authored objects while visual reuse retained WeakMap ancestry for older objects. Normal/effective inspection lost the later descendant color rule, but retained paint remained browser-correct. The core query now scopes the existing resolver to current-document ancestry and maps live pseudo-state IDs into that same tree; try/finally restores live ancestry and invalidates selector caches. This is an instrumentation correctness repair, not a fixture compensation or fresh text-paint fix. Preserve the original failing captures and recapture affected evidence with the verified corrected build before accepting input equivalence.',
  }),
  Object.freeze({
    id: 'core-anonymous-flex-text-excluded-from-item-flow',
    introducedBy: '4620654 filters element children for flex flow; 59883a0 later aligns direct text independently without adding it to the item sequence',
    file: 'src/app/services/dom/elements/flex.service.ts',
    pattern: String.raw`const childItems: FlexItem\[\] = flowChildren\.map\(child =>`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core flex item generation, intrinsic sizing and shared text placement',
    justification: 'Equal-input browser reductions with direct Documents text followed by a 20x10px marker, 20px line-height and 8px gap fail in row/column and start/center layouts. Core marker starts at x0 instead of x88.921875 (row/start), x150 instead of x194.453125 (row/center), y0 instead of y28 (column/start), and y43 instead of y57 (column/center). Four otherwise equivalent explicit-span controls pass, as do four single-direct-text centering controls. ElementCreationService paints parent text separately; FlexService creates its item list only from element children. RendererService anonymous alignment positions that separate text but cannot allocate its intrinsic size or gap in the shared sequence. This is a core composed-layout defect, not proof that the tree needs its fixed-height wrapper or that all direct text placement fails. Generate anonymous text items in core CSS-space layout and use their boxes for paint; do not rewrite authored content into application spans or add marker offsets. The direct centering controls make no claim about normal used height or glyph raster.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: anonymous/explicit row and column text-flow reductions and single-direct-text centering controls',
  }),
  Object.freeze({
    id: 'core-canvas-default-shaping-differs-from-css-text',
    introducedBy: '2ec3152 establishes the canvas font/default-context styling path; the present browser reduction exposes its remaining shaping discrepancy',
    file: 'src/app/services/text/text-canvas-renderer.service.ts',
    pattern: String.raw`private applyTextStylingToContext\((?!(?:(?!\n  \})[\s\S])*ctx\.fontKerning)(?:(?!\n  \})[\s\S])*ctx\.font =`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core CSS text shaping and measurement-to-canvas default resolution',
    justification: 'Identical Arial, sans-serif 16px/24px inputs and office AV content yield DOM Range width 61.671875px but actual bound control texture CSS width 62.5547px. The mismatch repeats under normal and explicit zero tracking while each normal/zero pair has identical DOM widths and identical core texture bytes. The independently configured browser canvas gives 62.5546875px with fontKerning:auto, 61.671875px with normal, and 64.03125px with none. Core assigns the font but leaves canvas kerning at its default. This confirms a core equal-input advance discrepancy and localizes the shaping/default-context boundary; it does not prove that forcing normal globally is correct or that all Material typography failures have this cause. Preserve original fixture font/tracking; extend explicit kerning, font/size, retained text and wrapping evidence before fixing the general rule.',
    focusedProof: 'examples/material-showcase/src/app/normal-letter-spacing-audit.spec.ts: Arial office AV remains a failing equal-input advance assertion',
  }),
  Object.freeze({
    id: 'core-transform-list-loses-order-and-repeated-functions',
    introducedBy: '662c179 extracts the shared transform parser with one mutable translation/rotation/scale tuple',
    file: 'src/app/services/dom/elements/css-transform.ts',
    pattern: String.raw`case 'translatex':\s*result\.translate\.x = parseFloat\(values\[0\]\) \|\| 0;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core ordered CSS transform composition before final projection',
    justification: 'For already parsed translateX/scale functions, the parser overwrites one tuple instead of composing the ordered CSS list. Browser reductions with default origin and pixel units isolate this from unsupported percentages/origins: translateX(10px) scale(.5) passes, but the reversed list is displaced by 5px; translateX(4px) translateX(6px) retains only 6px and is displaced by 4px. These are confirmed mismatches in composition of accepted functions, not a claim that the catalog supports all CSS transform grammar. Preserve the ordered CSS-space affine transform, including repeated functions, until final rendering conversion; do not reorder or precompute fixture-specific inputs.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: translate-then-scale, scale-then-translate and repeated-translation composition controls',
  }),
  Object.freeze({
    id: 'fixture-floating-label-transform-replaced-by-font-size',
    introducedBy: '2f44011 initial 12px substitution; 87bc351 adds tracking and alignment overrides',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.field-label', position: 'absolute', top: '8px', left: '16px'[^\n]*fontSize: '12px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'Material field-label structure and typography translation',
    justification: 'All six filled-field families can retain 16px reference type inside a floating wrapper with translateY(-106%) scale(0.75) and top-left origin. Candidate base and active-empty rules substitute absolute 12px labels at fixed insets. Similar apparent glyph size is not equivalent input. Attribution requires complete ordered origin/base-transform/font-token/floating-transform rules, captured wrapper scale, unique text identity, the selected base/empty candidate rule, normal/effective/retained size and untransformed candidate ancestry through the page. Independent replay rejects altered or removed claims. Compact, hidden, untransformed, font-selection and final raster remain separate obligations. Original-input reductions expose core percentage-translation, origin and transform-order gaps; repair those rules before restoring the original wrapper structure, rather than retaining smaller type or tuning world coordinates.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: floating label preserves child typography',
  }),
  Object.freeze({
    id: 'fixture-error-label-forced-floating-size',
    introducedBy: '87bc351 adds state.error to empty-label size/position activation; 7159b1d and f3c8254 revise the predicate',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`const emptyFieldActive = state\.error`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase error-state label sizing and dense-label visibility translation',
    justification: 'The candidate treats validation error as sufficient to author the active-empty 12px label at top 8px. Empty invalid reference fields do not acquire float-above solely from error state: their wrapper keeps the base 16px token and base translation, or is hidden by the dense theme. Attribute only with exact invalid ancestor/input state, empty native and candidate values, label/control and candidate input-region linkage, complete base font/transform rules, selected candidate size and retained stages. Preserve hidden-wrapper evidence without claiming visible glyph parity. Error color is independent: later picker-shell literals override candidate base/empty error colors. Repair state and token authoring rather than core transform arithmetic or sampled font sizes.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: unfloated error label size distinguishes error-state shrink from scaled and hidden reference paint',
  }),
  Object.freeze({
    id: 'fixture-datepicker-dense-label-visibility-omitted',
    introducedBy: '88d1090 adds a compact-filled-label hide rule and applies it to filled fields, but picker labels retain the fixed empty-label class',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`class: 'field-label empty-field-label', for:[^\n]*textContent: family === 'datepicker'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase dense field-label display token and wrapper translation',
    justification: 'The original density-2/density-5 frame supplies --mat-form-field-filled-label-display:none, inherited by the original floating wrapper display declaration. Candidate picker labels keep field-label empty-field-label, so the existing compact-filled-label hide rule does not match. Captured focused empty inputs, complete density-token ancestry, hidden wrapper geometry, selected font rules and candidate stages distinguish this from a visible font-size or core display:none defect. Preserve hidden computed typography without claiming a visible reference glyph. Restore original density and wrapper semantics rather than tuning text size or hiding a fixture by sampled state.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: hidden dense datepicker label preserves display-token inheritance and unmatched candidate rule',
  }),
  Object.freeze({
    id: 'fixture-field-label-tracking-substitution',
    introducedBy: '87bc351 adds base .4px tracking; 354084e adds empty-field .4/.65px split',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.field-label(?:\.empty-field-label)?'[^\n]*letterSpacing:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'Material field-label typography and transform input translation',
    justification: 'The captured filled floating-label token computes .496px on both the reference wrapper and its mat-label. The candidate explicitly substitutes .4px for its base label and .4/.65px for its higher-specificity empty-state label. Commit 87bc351 adds the base tracking alongside field-layout changes; 354084e introduces the state split and 7159b1d later changes the state predicate. Attribution requires exact label identity, active token evidence, captured wrapper context, selected candidate declaration and matching normal/effective/retained tracking. It does not multiply tracking by the reference wrapper scale or declare smaller untransformed type equivalent. Restore the reference typography and transform structure, then test the separately confirmed core transform and shaping defects with equal inputs.',
  }),
  Object.freeze({
    id: 'core-transform-translation-discards-css-units',
    introducedBy: 'existing CSS transform subset; confirmed by original floating-label reduction',
    file: 'src/app/services/dom/elements/css-transform.ts',
    pattern: String.raw`result\.translate\.y = parseFloat\(values\[0\]\) \|\| 0;`,
    classification: 'intentional-documented-limitation',
    owner: 'core CSS transform parsing and reference-box resolution',
    justification: 'The capability catalog declares an incomplete transform grammar. The parser currently strips translation units with parseFloat and accepts no reference-box dimensions. A 24px-high label translated by -50% moves -50px rather than -12px; the otherwise identical -12px and untransformed controls pass. This is a confirmed unsupported CSS semantics gap, not evidence that final Babylon axis projection is wrong. Preserve units until core resolves them against the CSS transform reference box; do not resolve them in a Material plugin.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: floating label percentage and literal translation controls',
  }),
  Object.freeze({
    id: 'core-transform-origin-not-authored-or-applied',
    introducedBy: 'existing incomplete transform contract and center-based mesh scaling',
    file: 'src/app/services/dom/elements/element-material.service.ts',
    pattern: String.raw`applyTransforms\(mesh: Mesh, transform: TransformData, projection: CameraActions\): void`,
    classification: 'intentional-documented-limitation',
    owner: 'core transform public contract and CSS transform-origin composition',
    justification: 'StyleRule has no transformOrigin field and the material transform application receives only translation/rotation/scale plus projection. The original CSS top-left-origin reduction is explicitly diagnostic input outside that public subset. Scaling a 160x24 label by .75 leaves its center fixed, shifting its left/top by 20px/3px instead of preserving the authored top-left. Add origin/reference-box semantics in core and project the finished CSS transform only at the rendering boundary. This is not a reason for fixture pixel offsets or font-size replacement.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: floating label scale-only control',
  }),
  Object.freeze({
    id: 'audit-style-snapshot-precedes-typography-inheritance',
    introducedBy: 'b6dc672 feat(diagnostics): inspect hidden-node core style declarations',
    file: 'src/lib/astylar.ts',
    pattern: String.raw`const styles = this\.getElementInteractionStyles\(element\.id \?\? '', session\.siteData, element,`,
    classification: 'parity-harness-defect',
    owner: 'core diagnostic style-stage provenance and Material input evidence collector',
    justification: 'Normal/effective snapshot declarations precede some typography resolution. A minimal parent with fontSize:24px and lineHeight:32px gives its child those browser computed values while the earlier candidate fields remain omitted. The added retainedText stage now observes these inherited values from the existing core registry and the reduction passes without changing inputs. It does not cover hidden/anonymous text without retained entries or guarantee later pseudo-state glyph textures. Renderer, dimension and flex services separately resolve inherited typography. Preserve these stage boundaries and complete authoritative coverage; do not reconstruct inheritance in the showcase or blanket-waive missing declarations.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: inherited typography remains observable in pre-projection style evidence',
  }),
  Object.freeze({
    id: 'audit-control-value-label-typography-unobserved',
    introducedBy: '7de0f26 retained-text inspection reads the ordinary text registry only',
    file: 'src/lib/astylar.ts',
    pattern: String.raw`this\.textInteractionRegistry\.getByElementId\(element\.id\)\?\.style`,
    classification: 'parity-harness-defect',
    owner: 'core control/text paint inspection and Material input evidence collector',
    justification: 'The ordinary retainedText registry does not observe the button label texture created from value:Action. TextContent labels may have an ordinary registry entry but that does not prove current control paint. The reduced proof exposed this gap; 50ad72c added separate core-owned paintedControlText evidence, 902087b preserved it in captures, and 432d0ab compares its parsed typography independently. Older captures remain explicitly incomplete. ButtonManager creates its label texture through TextRenderingService, while ordinary text registration is conditional on textContent. Never substitute declarations, infer inputs from projected meshes, or change fixture value to textContent to satisfy the audit.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: rendered button labels authored with value / textContent',
  }),
  Object.freeze({
    id: 'core-explicit-font-list-appends-default-fallbacks',
    introducedBy: '2ec3152 start if text implementation',
    file: 'src/app/services/text/text-style-parser.service.ts',
    pattern: String.raw`processedFonts\.push\(\.\.\.this\.DEFAULT_FONT_FAMILIES\)`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'TextStyleParserService explicit font-family parsing and fallback semantics',
    justification: 'A fresh toolbar capture has Roboto in both browser computed and candidate normal/effective declarations, but actual control paint receives Roboto, Arial, Helvetica, sans-serif. resolveFontFamily appends the default list whenever no recognized generic is present. Equal-input package-root proofs isolate both mutation and observable fallback text advance: Arial becomes Arial, Arial, Helvetica, sans-serif; an unavailable single family yields a bound control texture CSS width of 226.562px versus browser Range width 230.296875px for WWWWiiiiMMMMmmmm at 20px. The same unavailable-family case with explicit serif or sans-serif passes, as does the earlier Arial, sans-serif control. This confirms a core fallback-semantics defect, not only an unequal diagnostic string. It does not identify the exact selected font or establish a final glyph-raster difference for the installed Roboto showcase case. Do not add a generic to fixture inputs to hide it.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: control texture preserves the authored font-family list / text advance matches browser fallback',
  }),
  Object.freeze({
    id: 'core-normal-line-height-samples-mg-font-box',
    introducedBy: '8870fc5 resolves normal line-height using fontBoundingBox metrics for Mg',
    file: 'src/app/services/text/text-style-parser.service.ts',
    pattern: String.raw`const metrics = context\.measureText\('Mg'\);\s*const height = metrics\.fontBoundingBoxAscent \+ metrics\.fontBoundingBoxDescent`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core normal line-box metrics and fallback-run typography',
    justification: 'resolveNormalLineHeight uses the ascent plus descent of a fixed Mg probe. The equal-typography package-root browser proof confirms this is not universally the natural CSS normal line box: Arial 16px yields 17px current paint/texture versus 18px DOM, serif 20px yields 22px versus 23px, and locally loaded Roboto 14px with emoji or CJK fallback text yields 17px versus 19px. Plain Roboto 14px/17.5px and explicit 21px/1.5 line-height controls pass. Both current paint inputs and the currently bound texture logical height are observed without projecting geometry. Preserve browser normal semantics, including font line metrics and actual fallback runs, in core; do not insert a constant pixel correction or hard-code 17px in Material. These reductions do not prove every Material normal-versus-numeric occurrence is faulty, and final glyph raster remains separate.',
    focusedProof: 'examples/material-showcase/src/app/normal-line-height-audit.spec.ts',
  }),
  Object.freeze({
    id: 'fixture-button-document-font-replaces-component-token',
    introducedBy: 'af04845 fix controls to use document font; material-button token omission dates to 2f44011; text-button omission persists through 1d74a0f',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.(?:material|text)-button',(?![^\n]*fontFamily:)[^\n]*fontWeight: '500'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material button component font-token translation',
    justification: 'The reference filled/outlined/text button overrides the document font reset with its Material component font token, computing Roboto. Commit af04845 added a candidate button,input,select reset to Roboto, Arial, sans-serif, but material-button and text-button lack the component font override. The card flow correction in 1d74a0f retained that omission. The production control texture captures the longer stack unchanged. Similar glyphs do not make different fallback inputs equivalent; attribute only with the captured active reference token for the corresponding button kind, candidate reset and missing component override plus matching normal/effective/current paint stages. This does not demonstrate a renderer font-selection defect.',
  }),
  Object.freeze({
    id: 'fixture-retained-component-font-tokens-omitted',
    introducedBy: '2f44011 initial showcase page font stack and component token omissions; later component layout rewrites preserve omissions',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.(?:chip|card-title)',(?![^\n]*fontFamily:)[^\n]*fontSize:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material component font-family token translation',
    justification: 'The page reset to Roboto, Arial, sans-serif is legitimate and matches the reference frame; individual Material components then override it with component font-family tokens. Representative chip and card-title rules copy sizes but omit that override. Attribute each retained text occurrence only when its actual reference ancestor chain reaches a reviewed winning Material font token computing Roboto, while every candidate normal/effective declaration up to main#page omits font-family and core retains the authored page stack unchanged. Preserve nested table fallbacks and MDC label tokens. The standard/legacy button-toggle pair needs explicit same-sheet, top-level, equal-specificity, non-important source-order evidence; layered, important, unknown or reversed precedence is not guessed. Do not infer missing tokens from equal glyphs, component names or source-pattern matches alone. Different fallback lists are unequal inputs even when installed Roboto supplies the current characters. This differs from the separately confirmed core parser bug that appends fallback families to an explicit single-family input. Preserve component font intent and nested structure before testing font fallback, shaping or placement.',
  }),
  Object.freeze({
    id: 'fixture-retained-component-text-metrics-omitted',
    introducedBy: '2f44011 feat(example): add Material component showcase; original radio and switch label rules omit both metrics',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.(?:radio-label|switch-label|checkbox-label)',(?![^\n]*(?:lineHeight|letterSpacing):)[^\n]*fontSize:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase component line-height/tracking token translation and inherited text structure',
    justification: 'Reference Material internal form-field labels declare body-medium line-height and tracking tokens; radio, switch and checkbox candidate labels copy font size but omit those metrics. The original radio/switch omissions persist alongside later positional and vertical-align changes. Occurrence attribution must independently trace an active reference token, computed inheritance and a complete candidate normal/effective omission chain, with core retaining normal line-height or zero tracking. This also identifies the same proven omission mechanism in other component text paths, without assuming their source-history date. Fixed container heights, padding and label offsets are not equivalent text-metric inputs. Restore the actual token and structure before testing core line boxes, wrapping and shaping; do not equate CSS normal with a guessed numeric height or claim current glyph paint from retained text.',
  }),
  Object.freeze({
    id: 'fixture-material-button-tracking-token-omitted',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.material-button',(?![^\n]*letterSpacing:)[^\n]*fontWeight: '500'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase filled/outlined button typography input translation',
    justification: 'The original and current material-button rule copies 14px size and weight 500 but omits the Material label tracking token. A digest-checked production button/light/desktop capture shows active filled/outlined reference rules declaring letter-spacing through their label-text-tracking token, reference labels computing .096px, candidate normal/effective declarations omitting tracking, and actual core control texture paint receiving zero. This is unequal authoring, not evidence that core misrenders a shared spacing value. Restore equivalent component tokens before evaluating the renderer; fixed widths or moved text do not supply the missing input. Other families/states require their own captured attribution.',
  }),
  Object.freeze({
    id: 'fixture-disabled-button-ink-precomposited',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`color: mixHex\(theme\.surfaceContainer, theme\.onSurface, \.38\)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase disabled-button paint inputs and core alpha-compositing verification',
    justification: 'The reference disabled filled-button rule keeps on-surface ink at 38% alpha against transparent; the candidate replaces it with an opaque mix against surfaceContainer. All twelve current static button captures confirm the reference alpha and explicit opaque candidate declarations/current paint: light #a4a0a7, dark #706c72, contrast #a09fa1 and custom #99a0a2. Occurrence attribution requires the active Material token rule, both disabled states, identical reference button/label ink, and the explicit candidate rule matching normal/effective/current paint; it does not assume a theme RGB table. History traces the substitution to initial showcase commit 2f44011. Precompositing against a presumed background is not equal input: overlapping layers, background changes and glyph-edge coverage may differ. Preserve the reference alpha input and test core compositing separately; this finding alone does not prove a core alpha bug.',
  }),
  Object.freeze({
    id: 'fixture-demo-block-flow-replaced',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: \x60#\$\{rootId\}\x60, position: 'relative'[^\n]*display: 'flex'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase demo-section block-flow translation',
    justification: 'Every reference .demo section is an ordinary static block. The shared candidate root rule instead makes it a relatively positioned column flex container, with a fixed height and16px gap. This changes margin collapsing, child sizing and containing-block behavior. Captured mapped section types and explicit authored position/display declarations allow those particular signatures to be attributed to the fixture. Direction and gap attribution additionally requires the exact root rule, no competing flex/gap/reset declarations and agreement across all three candidate style stages. A browser sensitivity proof at DPR1/2 shows that one child can conceal the input mismatch while a second child exposes16px extra separation; this is unequal-authoring evidence, not a core-defect proof. Width/typography/paint differences still need their own evidence; the maximum border-box width alone can be an equivalent720px content box plus58px of fixed insets.',
    referenceEvidence: { file: 'examples/material-showcase/src/app/reference.component.ts', selector: '.demo', computed: { display: 'block', position: 'static' } },
  }),
  Object.freeze({
    id: 'core-empty-block-retains-parent-content-height',
    introducedBy: '93ba2e7 fix root padding; current empty-block flow path reproduced independently',
    file: 'src/app/services/dom/elements/element-dimension.service.ts',
    pattern: String.raw`let height = contentHeight;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'ElementDimensionService empty non-replaced auto height and ElementCreationService block flow',
    justification: 'The identical-input paragraph/divider browser reduction fails twice: an empty block with only a1px top border has a302px candidate border box instead of1px, moving the next paragraph down301px. Dimension calculation initializes height from parent content height and only substitutes an intrinsic auto height for inline/text/textarea elements. Block-flow recursion handles children only when present, so this empty block retains the provisional parent-height value. CSS used height must be zero content plus its own insets; final Babylon projection is not the source of this arithmetic. Keep the failing proof and fix the general empty-block rule before removing fixture divider coordinates.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: paragraph flow places a divider without absolute text or separator offsets',
  }),
  Object.freeze({
    id: 'core-inline-parent-ignores-descendant-intrinsic-width',
    introducedBy: 'current inline dimension/child-flow path; first bad revision not established',
    file: 'src/app/services/dom/elements/element-dimension.service.ts',
    pattern: String.raw`let measuredWidth = textMetrics\?\.width \?\? 0;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'ElementDimensionService intrinsic sizing and ElementCreationService inline child layout',
    justification: 'Identical-input inline and inline-block reductions have a nested Notifications label with matching horizontal edges, but the content-sized parent has width0 instead of87.15625px. Removing the absolute badge child reproduces the same parent-width error. measureTextContent reads own text only, calculateIntrinsicWidth falls back to zero, and layoutInlineChildren resizes height while retaining parentDims.width. Descendant in-flow intrinsic contribution must establish the CSS parent width and downstream containing block before projection. Do not replace it with the badge theme width table. Inline fragment vertical bounds are not compared to core text-plane bounds in this proof; positioned badge border boxes are checked on all edges and remain independently failing.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: content-sized inline / inline-block host',
  }),
  Object.freeze({
    id: 'core-absolute-insets-ignore-margin-box',
    introducedBy: 'current positioned offset calculation; first bad revision not established',
    file: 'src/app/services/dom/elements/element-dimension.service.ts',
    pattern: String.raw`top = parentHeight - parentBorder\.bottom - bottomPixels - height;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'ElementDimensionService absolute/fixed CSS inset-to-border-box positioning',
    justification: 'A fixed16x16 absolute child in a180x100 parent with left40/bottom20 remains at(40,64) for both margin12 and margin-12. The browser places its border box at(52,52) and(28,76), respectively. Width/height match. The offset branches parse margins but do not incorporate them into left/bottom-derived border-box coordinates before final projection. This independent non-text, non-inline proof isolates the margin-box rule used by the reference badge; retain positive/negative controls and extend right/top, auto margins and over-constrained cases before a general fix.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: absolute left and bottom insets position the margin box',
  }),
  Object.freeze({
    id: 'fixture-sidenav-text-padding-offset',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.sidenav(?:-content)?'[^\n]*padding: '17px 20px 20px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase sidenav CSS input translation; core typography only after equal-padding proof',
    justification: 'ReferenceComponent explicitly authors padding:20px for mat-sidenav and mat-sidenav-content. Fresh light/desktop full-tree captures confirm20px on both; the candidate explicitly changes only the top to17px. This is an unequal authored input, not a browser used-value serialization difference. Restore equivalent padding before attributing any resulting text offset to core. The candidate flex composition also needs separate structural review against the reference absolute drawer and offset content.',
    referenceEvidence: { file: 'examples/material-showcase/src/app/reference.component.ts', selectors: ['mat-sidenav', 'mat-sidenav-content'], declarations: { padding: '20px' } },
  }),
  Object.freeze({
    id: 'fixture-sidenav-positioned-flow-replaced',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.sidenav-container'[^\n]*display: 'flex'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase drawer containing block, content offset, and independent scrolling',
    justification: 'Fresh captured .mat-drawer-container rules explicitly specify position:relative, display:block and overflow:hidden. The reference drawer is absolute with top/bottom:0, a160px border-box width and20px padding; its inner scroll wrapper is100% of the content box. The content remains a relatively positioned block with margin-left:160px and content-box height:100% plus padding. Candidate replaces this with a flex row, a fixed220px drawer and a flex-grow content sibling, both with17px top padding, and omits the reference scroll wrapper. This changes containing-block, used-size and scroll ownership rules even when the screenshot matches. Attribute the container display signature only when both captured declaration witnesses and node mappings agree; other signatures and core behavior require separate proof.',
    referenceEvidence: { file: 'examples/material-showcase/src/app/reference.component.ts', element: "@case ('sidenav')", selector: '.mat-drawer-container', declarations: { position: 'relative', display: 'block', overflow: 'hidden' } },
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: side drawer uses containing-block insets and content margin without a flex replacement',
  }),
  Object.freeze({
    id: 'fixture-divider-replaces-paragraph-flow-with-coordinates',
    introducedBy: 'fcde1b7 fix(example): align Material divider; refined by1f2f2aa and662c179',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.divider(?:-copy|-above|-below)?'[^\n]*(?:position: 'absolute'|top:)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase block-flow inputs; core paragraph/inline metrics and margin layout if equal-input proof fails',
    justification: 'The reference contains ordinary p/span, mat-divider, p/span block flow. Captured paragraph margins are16px top/bottom, positions arestatic, and the separator is a1px top border. Candidate paragraphs and separator are absolutely positioned with fixed heights and theme/mobile/DPR-adjusted top values. Historyfcde1b7 explicitly replaced flowing paragraphs with positioned wrappers; later label/coordinate commits retuned their positions. Equal-input paragraph-flow evidence must decide any core fault; these coordinates cannot be accepted as equivalent CSS intent.',
    referenceEvidence: { file: 'examples/material-showcase/src/app/reference.component.ts', element: "@case ('divider')", structure: 'p > span, mat-divider, p > span' },
  }),
  Object.freeze({
    id: 'fixture-table-borders-detached-from-cells',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.table-rule(?:-one|-two)?'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase table cell border/typography translation; core table paint only after equivalent cell-border proof',
    justification: 'Reference header and first data cell own1px solid bottom borders, while the final row has no bottom border. Candidate clears cell borders and appends two absolute sibling div rules positioned from density-specific row-height sums. The1px lines thus do not belong to their cells and cannot follow intrinsic row growth. Fresh light/desktop reference evidence also resolves14px/20px typography where candidate source declares16px. Candidate table mesh-style records contain layout-generated cell declarations, so those records alone must not be used to infer missing authored padding or fonts.',
    referenceEvidence: { file: 'examples/material-showcase/src/app/reference.component.ts', element: "@case ('table')", selectors: ['.mat-mdc-header-cell', '.mat-mdc-cell'], declarations: { borderBottomWidth: '1px', borderBottomStyle: 'solid' }, exception: 'final body row has no bottom border' },
  }),
  Object.freeze({
    id: 'fixture-toggle-native-button-substitution',
    introducedBy: 'c47d589 button-toggle label composition',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`type: 'div', id: 'button-toggle-one', class:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase native-button structure; core defaults and inline layout verification',
    justification: 'The reference has native inline-block buttons with inline-block labels, while the candidate replaces them with centered flex divs and ordinary spans. Captured reference center versus candidate omitted normal/effective alignment and retained left is unequal structure/default-style input. A separate read-only CDP probe confirms user-agent button centering in the light reference, with eight browser controls separating tag defaults, inheritance, role and explicit override. Per-occurrence attribution requires exact structure and complete captured ancestry; it does not assume the UA rule across other states, equate center/left, or infer a core defect from unequal inputs. Restore the original mechanism before assessing core defaults or inline layout.',
    focusedProof: 'scripts/audit-material-button-defaults.mjs',
  }),
  Object.freeze({
    id: 'fixture-chip-label-ink-substitution',
    introducedBy: '2f44011 initial chip styling',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.chip',[^\n]*color: theme\.onSurface`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase chip label color-token translation and inheritance',
    justification: 'The reference enabled unselected chip text span explicitly owns the label-text-color/on-surface-variant token. Candidate chip labels omit color and inherit the parent .chip literal authored from theme.onSurface, already present in the initial showcase. This is an original input substitution, not evidence of a later color workaround or core conversion failure. Exact component/action/label paths, enabled/unselected state, token declarations, complete candidate rule exclusions and normal/effective/retained inheritance are required per occurrence. Selected/disabled chips, generated outline composition, token fallback origin and final raster are not certified. Restore the original component color semantics before investigating core with equal inputs.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: unselected chip ink preserves direct reference token and candidate host inheritance',
  }),
  Object.freeze({
    id: 'fixture-disabled-choice-label-ink-omitted',
    introducedBy: '2f44011 initial radio option color; c47d589 replacement checkbox label',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.(?:checkbox-label|radio-option)',[^\n]*color: theme\.onSurface`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase disabled checkbox/radio label token translation',
    justification: 'Material applies component disabled-label-color tokens to the native associated label, with an on-surface 38% transparent fallback. The candidate custom controls expose ariaDisabled but retain opaque theme.onSurface on checkbox text or the radio option parent. These source substitutions predate subsequent label-position adjustments. Attribute captured occurrences only with exact native disabled input/label association, disabled host state, candidate disabled owner, active token and excluded competing color declarations. Alpha paint conversion, compositing, cursor/event suppression and final raster are independent obligations. Restore disabled-state token intent before assessing core with equivalent inputs.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: disabled choice label ink retains native disabled token and opaque candidate owner',
  }),
  Object.freeze({
    id: 'fixture-control-label-typography-omitted',
    introducedBy: '2f44011 initial chip styling; c47d589 button-toggle label composition',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.(?:chip|button-toggle-option)',[^\n]*fontSize: '14px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase chip/button-toggle component label typography translation',
    justification: 'Material chip labels explicitly request label-large weight/tracking; standard button-toggle hosts request weight and their button inherits it. Captured labels compute 500 while the candidate leaf-to-page declarations omit weight and retained core text is normal/400. Chip labels additionally compute .096px tracking versus retained zero. These are omitted component inputs, not a core weight-scaling defect. Attribute occurrences only through exact active token rules, reviewed text paths and complete candidate ancestry. Do not copy button-toggle host tracking onto its label: its intervening button resets tracking to normal. Existing fixed widths and offsets are not substitutes for the missing typography.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: control label token provenance and contradictory-ancestry controls',
  }),
  Object.freeze({
    id: 'fixture-chip-label-typography-promoted-to-host',
    introducedBy: 'c47d589 adds host fontSize 14px; 88d1090 adds host lineHeight 20px',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.chip',[^\n]*fontSize: '14px', lineHeight: '20px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase chip host versus nested label typography authoring',
    justification: 'Material retains frame-scaled font-size and normal line-height through the chip host and action, then applies 14px/20px component tokens on the nested text label. The replacement .chip instead sets 14px/20px on the host while .chip-label omits those declarations. Current normal/comparison/effective host inputs and independently retained label text prove changed input ownership, not a visible label-size defect or a confirmed core inheritance failure. The historical commits introduce the explicit host declarations; their purpose cannot be inferred as concealment of a particular core bug. Preserve the separate missing font/weight/tracking tokens, generated outline, fixed widths and earlier label-offset findings. Restore equivalent owner-specific inputs before evaluating geometry or paint; do not raise the host font to the frame size without also restoring the nested label token.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: chip host typography preserves nested label ownership across inherited scales and states',
  }),
  Object.freeze({
    id: 'fixture-select-value-typography-substitution',
    introducedBy: 'f286fb1 fix(material): align field popup parity',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.select-value', position: 'absolute'[^\n]*color: state\.disabled \? '#79747e' : '#1d1b20'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase select value composition and Material trigger typography translation',
    justification: 'Commit f286fb1 hides native select-control text and adds an absolutely positioned select-value span with a fixed 24px height, 16px font size and hard-coded enabled/disabled ink. The reference value inherits Material trigger font, line-height, tracking and theme ink tokens. Current static candidate labels omit those font/line-height/tracking overrides and retain the page font stack, normal line-height and zero tracking; dark theme also retains the fixed light-theme ink. Disabled captures additionally preserve the ordered enabled/disabled reference token cascade, native/candidate disabled flags and fixed opaque #79747e replacing translucent component ink. These are unequal authored inputs before rendering. Occurrence attribution requires the unique select text-owner path, inherited active reference token rule, candidate declarations and retained-stage agreement. Restore component inputs and investigate equal-input control rendering before retaining a replacement label or adjusting its offsets.',
  }),
  Object.freeze({
    id: 'fixture-tree-component-typography-omitted',
    introducedBy: '2f44011 omits component typography; 7159b1d adds fixed-height label wrapper',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.tree-label', height: '20px', lineHeight: '20px', verticalAlign: 'middle'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material tree component typography input translation',
    justification: 'Material tree nodes explicitly use their component font-size token and compute 16px across the captured themes. Candidate tree labels instead inherit the theme-scaled page size: 14.4px in contrast and 18.4px in custom. Initial showcase code omitted the component typography; 7159b1d moved direct flex text into fixed-20px-height/line-height spans without adding it. Font-size attribution requires the active reference token rule and every candidate normal/effective ancestor up to the authored page font. Separate line-box attribution requires complete normal reference ancestry through the frame, original direct text ownership, the unique candidate wrapper rule, centered flex parent, and normal/effective/retained agreement. Restore original text ownership and component typography before assessing core anonymous flex-item or line-metric behavior; do not inverse-scale rendered text, equate normal to 20px, or infer a measured natural height from the computed keyword.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: tree token/complete inheritance and fixed-wrapper attribution, contradictory-input and report-tampering controls',
  }),
  Object.freeze({
    id: 'fixture-table-font-increased-during-renderer-fix',
    introducedBy: 'f980edc fix(renderer): honor Material table row sizing',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.material-table(?: th| td)?'[^\n]*fontSize: '16px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material table typography input translation',
    justification: 'The initial showcase authored 14px table/cell text. Commit f980edc changed the table, th and td declarations to 16px while modifying core row sizing and text code. Current reference rows/cells compute 14px through Material row typography tokens, while core retains the candidate 16px input. This is an unequal fixture input introduced alongside a renderer change, not proof that core needs a two-pixel font compensation. Preserve the reference 14px/20px intent; the existing equal-input cell proof now also checks retained font size and line height.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: table cells retain authored padding and bottom borders without sibling rules',
  }),
  Object.freeze({
    id: 'harness-mesh-only-resolved-style-capture',
    introducedBy: '341f549 audit resolved-style capture and a06ef61 full authored-tree collection',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`collectMaterialCoreResolvedStyles\(surface\.inspectResolvedStyles\(\)\)`,
    classification: 'equivalent-representation',
    owner: 'audit capture at the authoritative pre-projection style-resolution boundary',
    justification: 'The collector now consumes the public on-demand core style snapshot, including hidden descendants and anonymous paths. The earlier436 static captures lacked42 non-envelope resolved styles because they relied on mesh existence. Those legacy gaps remain until recapture; no values are manufactured by the report, and no new layout/style resolver exists in the showcase.',
  }),
  Object.freeze({
    id: 'harness-normal-versus-interaction-style-capture',
    introducedBy: '341f549 audit resolved-style capture',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`resolvedStyleEvidenceVersion: 2`,
    classification: 'equivalent-representation',
    owner: 'audit effective pseudo-state style capture',
    justification: 'The corrected collector overlays the existing core astylarResolvedInteractionStyle on normal metadata, preserving both snapshots and evidence version2. This observes core pseudo-state resolution without duplicating its computation or altering fixture inputs. Legacy normal-only captures remain harness gaps; source correction alone does not upgrade their evidence.',
  }),
  Object.freeze({
    id: 'fixture-bottom-sheet-fixed-constraints',
    introducedBy: '8505c3b fix(material): match bottom sheet overlay geometry',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.bottom-sheet-panel', width: '512px', height: '128px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase bottom-sheet responsive constraints and content flow',
    justification: 'The reference uses content height, max-height:80vh, and responsive minimum widths (full viewport, medium 384px, large 512px), not a fixed 512x128px box. Candidate has only a max-960px full-width override. A settled 1024px browser proof measures reference width384 and candidate width512, while 900/1440px match. Preserve the reference constraints rather than adding another measured-size patch.',
  }),
  Object.freeze({
    id: 'fixture-bottom-sheet-list-structure-and-token-substitution',
    introducedBy: '2f44011 feat(example): add Material component showcase; af04845 adds generic control font reset',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.bottom-sheet-option', width: '100%'[^\n]*color: theme\.onSurface, textAlign: 'left', fontSize: '16px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase bottom-sheet navigation-list structure, behavior and Material text tokens',
    justification: 'Reference sheetContent supplies two href="#" anchors inside mat-nav-list with generated content/primary-label spans. Candidate flattens them to Share/Copy link value buttons and replaces the inner label font/24px line-height/.496px tracking/on-surface tokens with a generic control font stack, omitted line-height/tracking and page theme.onSurface. The nested nowrap/ellipsis/overflow rules are also absent. Share is authored as a -dismiss button handled by the generic close branch rather than reference anchor navigation; mapping corresponding text does not certify equal semantics or behavior. Preserve the original structures and declarations before diagnosing renderer failures, rather than tuning normal metrics, colors or fixed dimensions.',
  }),
  Object.freeze({
    id: 'fixture-paginator-tooltip-omitted',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'paginator-next', class: 'paginator-button'[^\n]*ariaLabel: 'Next page', value: '›'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase paginator tooltip content, trigger state and shared overlay composition',
    justification: 'The reference MatPaginator supplies navigation tooltips from its internationalized labels, disabled state and above-positioned MatTooltip directive. The candidate paginator authors only navigation buttons and page labels, omitting tooltip functionality. Captures retain the shown Next page connected overlay but no candidate popup counterpart. This omission exists before core creates any tooltip and must not be explained as missing renderer text, equivalent hidden state or a coordinate defect. Restore equivalent tooltip authoring through shared core APIs before assessing rendering or dismissal behavior.',
  }),
  Object.freeze({
    id: 'fixture-paginator-native-disabled-replaces-disabled-interactive',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'paginator-previous'[^\n]*disabled: state\.pageIndex === 0`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase paginator disabled-interactive control contract through core APIs',
    justification: 'The 104-boundary light/dark DPR 1/2 navigation capture preserves 48 cases with unequal native disabled inputs. Material keeps the native navigation button enabled while exposing aria-disabled and tabIndex:-1, and explicitly guards its click handler. Candidate authors native disabled at the first/last boundaries. Correct range guards do not establish equivalent focus retention or event behavior. Restore equivalent inputs through public APIs, then reduce any unsupported disabled-interactive semantics; do not force focus with a paginator-specific workaround. Forty of 44 focus mismatches coincide with unequal native-disabled inputs, while the enabled held mismatch has a separate minimal core proof.',
  }),
  Object.freeze({
    id: 'fixture-field-host-typography-tokens-omitted',
    introducedBy: '2f44011 introduced the shared field-shell without component typography tokens; source history only',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.field-shell', position: 'relative', width: '100%', height:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase form-field host typography token authoring',
    justification: 'The reference mat-form-field applies container font, size and line-height tokens at the host. The shared candidate field-shell omits them while its page declares a fallback stack and profile-scaled size and child controls/labels receive independent styles. Complete frame/section/host ancestry and original token rules identify this authoring omission before core consumption. Preserve original token ownership instead of forcing fonts or offsets on descendants. A light/dark inherited page size of 16px is not itself a visible size failure; contrast/custom inheritance differs. Local declaration inspection is not a synthesized computed font, and the independent core em sizing defect must remain separate.',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs',
  }),
  Object.freeze({
    id: 'core-em-box-size-uses-uncomputed-font',
    introducedBy: '21bdab9e930783efb5cf34ab031fd04f2656155b introduced raw local font parsing for em dimensions; source history only, no historical runtime bisect',
    file: 'src/app/services/dom/elements/element-dimension.service.ts',
    pattern: String.raw`const elementFontSize = Math\.max\(0, parseFloat`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core computed typography and CSS font-relative used-size resolution',
    justification: 'Two public-package browser runs each retain six equal-input em box failures and four passing explicit-font/pixel-box controls. With inherited 24/32px fonts, 2em by 1em boxes become 32 by 16px. With fontSize 1.5em they become 3 by 1.5px; with 150% they become 300 by 150px, although independent retained text correctly resolves to 36/48px. ElementDimensionService parses the local font declaration or substitutes 16px before em multiplication, separately from its inherited computed text path. Existing font-relative-units coverage supplies explicit pixel font sizes and cannot detect this gap. Share computed CSS font values before resolving lengths; do not insert pixel fonts, replace em dimensions, or repair projection in a plugin. This reduction does not attribute unrelated captured Material omissions or prove other relative-length properties, update behavior or final raster.',
    focusedProof: 'examples/material-showcase/src/app/font-relative-box-audit.spec.ts',
    inheritedBlockMargin: {
      classification: 'confirmed-core-renderer-defect',
      owner: 'core authoritative computed CSS font before block-margin used-length resolution',
      file: 'src/app/services/dom/elements/element-creation.service.ts',
      methods: ['layoutBlockChildren', 'parseMarginBox', 'parseFontSize', 'parseLengthValue'],
      firstDivergence: 'parseMarginBox resolves em with local style.fontSize only; omitted child font falls back to16 instead of inherited24 CSSpx before layout/projection',
      observations: { runs: 2, pairedCasesPerRun: 16, failedInherited24pxCasesPerRun: 2, errorCSSpx: -8,
        ownFontEmControlsPerRun: 4, pixelControlsPerRun: 8, PNGReceipts: 64 },
      history: '096c8a86228811003da0b05b5daf7f4ddbdb1bdb source/helper conservation; not historical runtime bisect',
      evidence: [
        { file: 'artifacts/material-parity/public-inherited-margin-owner-binding-20261015.log', sha256: 'd34d2b7f1cf151ae2e8227292d05caf3278acc54d2269db12e5f9ddea1c60ca5' },
        { file: 'artifacts/material-parity/public-inherited-margin-source-history-20261015.log', sha256: '46185108d0413106a92065a781b1bc507cd5282d7c4e66f6512cda19ba4754a5' },
        { file: 'scripts/audit-public-inherited-margins.mjs', sha256: '198743169f2b8f91cd846b56faa1f8bca98477982bbb79443a081e062dbcb4de' },
        { file: 'artifacts/material-parity/public-inherited-margin-20261015/latest-report.json', sha256: '0961cd9b3f4b09b66fdff1698fa9a05902c43b7457d2e5b601b8f5bdfdba882f' },
        { file: 'artifacts/material-parity/public-inherited-margin-repeat-20261015/latest-report.json', sha256: '0961cd9b3f4b09b66fdff1698fa9a05902c43b7457d2e5b601b8f5bdfdba882f' },
      ],
      boundary: 'Distinct block-margin call site of computed-font omission; not flex unit loss,positioned Material paragraph attribution,all units,updates,lifetime or full raster acceptance',
    },
  }),
  Object.freeze({
    id: 'core-fixed-descendant-ignores-transformed-containing-block',
    introducedBy: 'd3ef6dc3e9c6c27003b59315fe5c5d86cf7c5ce8 introduced unconditional viewport parenting; source history only, no historical runtime bisect',
    file: 'src/app/services/dom/elements/element-dimension.service.ts',
    pattern: String.raw`return dom\.context\.elements\.get\('root-body'\) \?\? parent;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core CSS containing-block selection before used-size calculation and final projection',
    justification: 'Two public-package equal-input runs each preserve five fixed-child failures and nine passing controls at DPR1. Under identity matrix, translateZ(0px), translate(0px), scale(1) or rotate(0deg), HTML places the fixed child at 85,67 while Astylar leaves it at 5,7; both host boxes remain 80,60/100x100. Omitted/none fixed-child controls pass. All seven independent stacking controls pass geometry and final interior color checks, so this is not a general stacking failure. ElementDimensionService.resolveLayoutParent unconditionally selects root-body for fixed elements before ElementCreationService calculates CSS dimensions and retains parent identity. Supported 2D identities also fail, excluding unsupported matrix/translateZ parsing as the sole cause. Select the correct CSS containing block in core; do not insert fixture offsets, infer layout from mesh projection, or duplicate placement in a plugin. This minimal proof does not attribute the 140 captured Material identity omissions, establish DPR2/update/scroll behavior, or broaden documented transform support.',
    focusedProof: 'examples/material-showcase/src/app/identity-transform-context-audit.spec.ts',
  }),
  Object.freeze({
    id: 'core-enabled-held-focus-delays-native-mirror',
    introducedBy: 'dbe4d8ed introduced transaction suppression; no historical runtime bisect performed',
    file: 'src/lib/astylar.ts',
    pattern: String.raw`!pointerFocusTransaction && !selectedTextClick`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core interaction-to-semantic focus synchronization',
    justification: 'The isolated public-package two-button real-browser proof repeats eight held-pointer failures at DPR 1/2: correct logical focus and pressed target coexist with native canvas focus, while 32 keyboard, hover and release controls pass. No Material/plugin, programmatic focus, application update or corrective styles are used. The runtime canvas-focus default and facade transaction-wide suppression postpone native semantic synchronization until accepted click. Keep text-selection, cancellation and pointer-capture safeguards in the owning core layer; do not repair it in paginator handlers or infer that logical focus itself is delayed. This does not establish all pointer types or raster equivalence.',
    focusedProof: 'examples/material-showcase/audit/button-pointer-focus.mjs',
  }),
  Object.freeze({
    id: 'fixture-stepper-edit-state-replaced-by-checkmark',
    introducedBy: 'fc45b58 fix(interaction): focus nested interactive owners',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`this\.selectionMark\('step-details-complete', 'step-complete-mark'\)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase step-state, editable description and icon-content translation',
    justification: 'When Review is selected, the reference Details header uses edit state, a clipped Editable description and create font-icon input. Candidate replaced its number with a completed-class badge and custom completion checkmark in fc45b58. A presentation checkmark is neither the editable icon input nor its description. Restore state/content intent before assigning residual shape, font or semantic behavior to core. The recorded reference font remains authoritative; successful material-icon glyph selection is not inferred from the class name.',
  }),
  Object.freeze({
    id: 'fixture-stepper-inactive-panel-omitted',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'stepper-content', role: 'tabpanel', textContent: state\.selected \? 'Project details' : 'Review changes'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase stepper panel structure, state retention and transition translation',
    justification: 'The initial candidate renders only one panel and replaces its text according to selected state. The reference instantiates both step panels, retaining the inactive panel as inert, visibility:hidden, zero-height and horizontally translated. Matching the current panel text cannot establish equivalent inputs for hidden layout, panel identity, preserved content state or transitions. The missing inactive text is an authored structural omission before core creates any element, not a renderer failure to paint the current text. Preserve the reference panel structure and state styles in an equal-input proof; do not add spacing or position compensation.',
  }),
  Object.freeze({
    id: 'fixture-expansion-flow-and-collapse-substitution',
    introducedBy: '6e1c156 replaces expansion flow with absolute content; a0f3328 adds a -1px nested text offset',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#expansion-content', position: 'absolute', display: state\.open \? 'block' : 'none'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase expansion content flow, collapse structure, and typography translation',
    justification: 'The reference paragraph remains in normal flow inside a padded body, flex content region and grid collapse wrapper. Closed-state captures retain its block display and margins while visibility is hidden and the wrapper uses grid-template-rows:0fr. Candidate substitutes absolute content, display:none when closed, density-specific open top offsets, zero paragraph margin, and a nested absolutely positioned label at top:-1px/left:24px. History traces the flow substitution to 6e1c156 and the compensating text wrapper to a0f3328. Absence of a retained text entry below candidate display:none is not evidence of missing renderer text. Nor does both sides being unpainted establish equivalent collapse/layout inputs. Restore the reference structure and declarations in a minimal proof before assigning any remaining discrepancy to core grid, intrinsic layout or typography; do not add another offset.',
  }),
  Object.freeze({
    id: 'fixture-field-error-subscript-substitution',
    introducedBy: '87bc351 fix(renderer): align Material filled field text',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.field-error'[^\n]*position: 'absolute'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase form-field subscript flow, generated error description and live-region composition',
    justification: 'The reference error is described by the invalid input and appears in an atomic polite live wrapper under the subscript owner, retaining generated baseline spacers. Candidate replaces that composition with a field-shell span at density-dependent top 58px/50px and left 16px, with no describedby or live wrapper. This authoring was introduced with filled-field retuning, not required by equal-input rendering. Restore equivalent field/subscript/description intent before attributing remaining layout, typography or semantic defects to core.',
  }),
  Object.freeze({
    id: 'fixture-dialog-text-flow-substitution',
    introducedBy: 'd102828 adds flex-aligned title span; 5b02171 retunes title/content padding',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'dialog-title-label', textContent: 'Confirm action'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase dialog title pseudo-spacer, content flow and labelled overlay composition',
    justification: 'Material authors direct heading text beside a generated 40px inline baseline spacer and a mat-dialog-content owner. Candidate authors a nested span inside a fixed-height flex-end heading plus a fixed-height flex paragraph; later padding tweaks move the text without preserving original constraints. The original labelled dialog and focus-trap/backdrop owners also differ from the candidate modal overlay labelled Open dialog. Preserve text identity and all structure independently, then reproduce original layout/semantics through core APIs before attributing residual defects to core.',
  }),
  Object.freeze({
    id: 'fixture-dialog-sampled-panel-and-action-geometry',
    introducedBy: 'bc0e449 fixes panel dimensions and replaces action top-border space with bottom padding',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.dialog-(?:panel|actions)'[^\n]*height: '(?:161|73)px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase dialog surface sizing, inherited constraints and action box authoring',
    justification: 'Across all 32 original open dialog states, equal 280px/161px sampled surface dimensions conceal native width/height 100% with inherited min/max constraints versus literal candidate dimensions and omitted constraints. The action row also replaces a transparent 1px top border plus 16px vertical padding with no border and 16px top/17px bottom padding: both imply 40px content height, but CSS-contract content intervals differ by 1px. Candidate wrap, shrink and minimum-height inputs differ separately. Focused modal inspection proves original owner mappings, declarations, all candidate stages and complete six-group/192-occurrence action population. This does not measure candidate used layout or prove renderer causality. Reuse the existing public percentage-intrinsic-sizing and explicit-inheritance reductions; correct those general rules before restoring reference sizing and removing sampled dimensions, not by further fixture retuning.',
  }),
  Object.freeze({
    id: 'fixture-dialog-text-metric-tokens-omitted',
    introducedBy: '2f44011 initial dialog typography omits component family and tracking',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.dialog-copy'[^\n]*fontSize: '14px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase dialog title/content font-family and tracking-token translation',
    justification: 'The original dialog title/content applies explicit component-family tokens; content also applies supporting-text tracking. Candidate title/content typography has omitted these declarations since the initial showcase, inheriting a broader page font stack and retaining zero tracking. Fixed boxes, flex alignment and later padding retunes do not supply those missing inputs. Preserve complete ancestor omission and explicit page-font evidence before attributing typography discrepancies to core; fallback selection and raster remain independent.',
  }),
  Object.freeze({
    id: 'fixture-dialog-text-ink-substitution',
    introducedBy: 'bc0e449 fix(material): match dialog content geometry',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.dialog-(?:title|copy)'[^\n]*color: '#(?:1d1b20|49454f)'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase dialog title/content color-token translation',
    justification: 'The geometry retuning commit also introduced literal title #1d1b20 and supporting-text #49454f colors. Material applies direct dialog subhead/supporting-text color tokens, computing different colors in captured overlays. Candidate core normal/effective and retained stages preserve the literals, with nested title inheritance introduced later. Keep the unequal inputs explicit; matching or nearly matching light-theme pixels cannot establish token, dark-theme or core color-conversion parity.',
  }),
  Object.freeze({
    id: 'fixture-dialog-fixed-content-boxes',
    introducedBy: 'bc0e449 fix(material): match dialog content geometry',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.dialog-(?:panel|title|copy|actions)'[^\n]*height: '(?:161|67|20|73)px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase dialog flow, generated title spacer, and action wrapping',
    justification: 'Candidate fixes panel/title/content/actions to the reference used heights161/67/20/73px. Material derives these from title padding6px24px13px plus a40px inline pseudo-element, content flow, and wrapping actions with min-height52px, padding16px24px and a1px transparent top border. Candidate title padding7px24px12px, flex-end alignment and action padding16px24px17px reproduce current geometry through different rules. Equal used heights do not establish equivalent inputs.',
  }),
  Object.freeze({
    id: 'fixture-snackbar-message-composition-substitution',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`type: 'span' as const, id: .\$\{family\}-title., textContent: 'Project saved'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase snackbar message flex composition, live-region ownership and component typography',
    justification: 'The initial showcase replaces the simple-snack-bar message div and separate action composition with a span and value button. The reference nested live region and flexing padded message are flattened into a status surface with fixed width and shared padding. Exact overlay/action/message context maps the text, not equivalent wrapper behavior, intrinsic sizing, typography, announcement behavior or placement. Preserve original message/action rendering inputs before equal-input core investigation; do not treat a missing shared text ID as a missing snackbar or compensate its label position.',
  }),
  Object.freeze({
    id: 'fixture-snackbar-message-token-substitution',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '.snack-surface'.*color: '#ffffff'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase snackbar supporting-text size and inverse-text color tokens',
    justification: 'The initial snackbar surface fixes literal white and omits the Material supporting-text size token. Current message text inherits the scaled page size and surface white through core normal/effective/retained stages. The reference message directly declares its supporting-text size token and separately inherits the inverse-on-surface text token through original live-region wrappers. These are unequal authored inputs, not equal-input scaling/color defects; preserve the original component tokens rather than replacing them with sampled sizes or RGB.',
  }),
  Object.freeze({
    id: 'fixture-snackbar-fixed-width',
    introducedBy: '899c741 fix(material): anchor snackbar and tooltip overlays',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.snack-surface', width: '344px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase snackbar intrinsic sizing and label/action flex composition',
    justification: 'Reference surface uses min-width344px and max-width672px with a flexing label and separate action padding. Candidate fixes width344px with padding0 18px and space-between. Matching this short label does not prove the same intrinsic sizing or wrapping constraints; no core defect follows from these unequal authored inputs.',
  }),
  Object.freeze({
    id: 'fixture-snackbar-action-typography-substitution',
    introducedBy: '2f44011 feat(example): add Material component showcase; af04845 adds generic control font reset',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.overlay-dismiss', width: '88px'[^\n]*color: theme\.primary, fontWeight: '500'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase snackbar Material text-button tokens and action composition',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: snackbar action size retains omitted component token and prepaint default independently of page scale',
    justification: 'The snackbar value button uses a shared overlay-dismiss rule that supplies theme.primary and omits Material text-button font, size and tracking tokens. Captured reference action text uses the component Roboto/14px/.096px inputs and the snackbar inverse-primary ink; candidate current texture receives the generic control font stack,16px,zero tracking and primary ink. The exact overlay/action/message mapping separates these observed unequal inputs from unresolved line-box metrics and geometry. Restore original component declarations and wrapper intent before diagnosing core; do not calibrate text size, baseline or ink to a screenshot.',
  }),
  Object.freeze({
    id: 'fixture-calendar-navigation-frozen-to-current-date',
    introducedBy: 'd1fc52a fix(material): refine picker icons and calendar alignment',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`function materialCurrent(?:Day|Month|Year)\(`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar displayed-month/selected-date state',
    justification: 'Calendar labels/cells derive from new Date() and handleClick has no previous/next month transition. Real previous/next clicks reach their targets but leave SEP 2026 unchanged while the reference changes to AUG/OCT 2026. Keyboard selection likewise leaves candidate value empty. These failures precede renderer layout or paint.',
  }),
  Object.freeze({
    id: 'fixture-calendar-period-vector-flattened-into-text',
    introducedBy: 'd973f84 fix(material): complete picker and range interactions',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'datepicker-month', class: [^\n]*value: this\.datepickerView\(\) === 'month'[^\n]*▾[^\n]*▴`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar period text/vector composition, tokens and accessible description',
    justification: 'The reference period control contains a text span beside a 10x5 SVG triangle, inverted with a CSS transform in year view, and describes itself through the calendar live-period label. Candidate replaces the composition with one value string ending in a triangle font glyph and omits the description relationship. The full candidate string is not equivalent to the original text/vector input. The header rule also omits component font/tracking tokens and fixes ink instead of using the Material period text-color token chain. Keep these unequal inputs explicit; restore original geometry, structure and declarations through core rather than tuning glyphs, offsets or baseline metrics.',
  }),
  Object.freeze({
    id: 'fixture-calendar-close-control-omitted',
    introducedBy: '87f7f83 fix(example): render Material picker overlays',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`family === 'datepicker' && state\.open \? \[\{ type: 'div' as const, id: 'datepicker-popup'(?:(?!Close calendar|datepicker-close)[\s\S])*?\n      \] \}\] : \[\]\),`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar close control, focus reveal and dismissal semantics',
    justification: 'The authored popup branch contains header, day/year grids and a selection marker but no close control. The captured reference dialog retains a raised Close calendar button and its label in both views. The pinned Material datepicker template applies cdk-visually-hidden until focus, toggles that state on focus/blur, and calls datepicker.close() on click. That authored control and transition are missing before core layout or paint. Captured rules retain clip:rect(0px,0px,0px,0px), but computed clip and live focus behavior are not captured here; the button must not be declared harmless, non-rendered or equivalent to Escape/outside dismissal. Restore equivalent structure and declarations before evaluating core behavior.',
  }),
  Object.freeze({
    id: 'fixture-calendar-accessibility-labels-omitted',
    introducedBy: '87f7f83 fix(example): render Material picker overlays',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`family === 'datepicker' && state\.open \? \[\{ type: 'div' as const, id: 'datepicker-popup'(?:(?!ariaLive|ariaDescribedBy|Comparison range|mat-calendar-body-comparison)[\s\S])*?\n      \] \}\] : \[\]\),`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar live-period and range-description authoring',
    justification: 'The pinned Material calendar header authors a clipped aria-live=polite period label and references it from the period button with aria-describedby. The calendar body authors four range-description spans, including two nonempty Comparison range labels hidden by display:none in this single-date example. The candidate popup omits those nodes and description relationships rather than submitting equivalent input to core. Per-case full-tree evidence must verify the date/year context, original rule and computed clipping/display, and absence of candidate counterparts. Hidden or currently unreferenced labels are not accepted as equivalent structure, missing core paint or proven accessibility parity.',
  }),
  Object.freeze({
    id: 'fixture-calendar-month-marker-table-grid-substitution',
    introducedBy: '87f7f83 introduces the table-to-grid replacement; c64397c adds unconditional full-span marker and a fixed extra row in selected-day calculation',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.datepicker-month-marker', gridColumn: '1 / -1', justifyContent: 'flex-start', paddingLeft: '12px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar conditional label/week table structure and CSS input translation',
    justification: 'Material month view supplies labelMinRequiredCells=3. Its body creates a full seven-column label row only when the first-week offset is less than three; otherwise the label occupies that offset in the first week. Candidate always authors a month span followed by individual leading blanks and gives the span a full grid row. Its cell width/height40px, padding-left12px and flex alignment also replace the original zero-height/zero-line-height table cell with percentage padding. SEP 2026 has offset2 and does not expose the conditional row-count difference; a same-looking September screenshot cannot establish all-month equivalence. Captured full rows and typography remain independently reviewed. The existing equal-input core full-span browser proof passes, so this substitution is not evidence of a core span failure and must not be defended as a renderer workaround.',
  }),
  Object.freeze({
    id: 'fixture-calendar-month-marker-typography-substitution',
    introducedBy: '87f7f83 introduces fixed calendar cell ink and omits label line-height; 4a330e2 adds generic centered cell text alignment',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.datepicker-cell',(?![^\n]*lineHeight:)[^\n]*color: '#1d1b20'[^\n]*textAlign: 'center'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar month-label typography declarations and table-cell structure',
    justification: 'The original mat-calendar-body-label rule explicitly supplies line-height:0, text-align:start and the calendar-body-label color token. Candidate uses the generic date-cell center alignment and fixed #1d1b20 ink, while omitting line-height through the captured leaf-to-page chain. Those unequal inputs survive into retained text; flex-start justification and a fixed cell height do not replace the original declarations. Per-case attribution requires the actual active reference rule, complete candidate rule exclusions and normal/effective/retained witnesses, without claiming equal-input core failure or glyph raster parity.',
  }),
  Object.freeze({
    id: 'fixture-calendar-weekday-structure-and-token-substitution',
    introducedBy: '87f7f83 fix(example): render Material picker overlays',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: .datepicker-weekday-\$\{index\}., class: 'datepicker-cell datepicker-weekday', textContent: label`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar weekday table-header structure, full names and typography tokens',
    justification: 'The reference month-view template has seven th scope=col cells, each containing a full weekday name in a cdk-visually-hidden span and a separate aria-hidden narrow label; its header also contains a spanning divider row. Candidate replaces the header with seven single-letter spans in the date grid, omitting full names and column-header semantics. Those spans inherit the generic page font stack instead of the calendar font token and use the fixed cell ink instead of the header on-surface-variant token. The complete ordered header and matching date context establish narrow-label correspondence, not equivalent text, semantics, clipping or table/grid layout. Restore original structure and CSS inputs before investigating core; do not tune single letters or offsets.',
  }),
  Object.freeze({
    id: 'fixture-material-option-ink-substitution',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.select-option',[^\n]*color: '#1d1b20'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase autocomplete/select base and selected-label color-token translation',
    justification: 'The option literal #1d1b20 is present in the initial showcase and still feeds replacement label text. Original unselected labels inherit the Material option token; selected primary-text spans receive their own selected-state-label token. The candidate selected rule changes background only. Per-case attribution requires complete linked option mapping, original active token rules, direct inheritance/selected ownership, candidate rule exclusions, explicit owner normal/effective ink, absent own leaf color and agreeing retained ink. Preserve raw omitted stages and unequal colors; this is authoring provenance, not a core conversion defect, variable-fallback origin or final-raster equivalence.',
  }),
  Object.freeze({
    id: 'fixture-autocomplete-option-composition-substitution',
    introducedBy: '4d56f86 fix(material): restore field and popup interaction state',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`type: 'span', id: .autocomplete-option-\$\{slug\}-label., textContent: label`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase autocomplete option composition and inherited Material inputs',
    justification: 'The interaction-state change introduced div/span options and conditional plugin checks instead of preserving Material option/primary-text/ripple/minimal-pseudo-checkbox composition. The complete input-linked two-city value domain identifies matching text owners before and after commit/reopen, but does not equate wrapper defaults, state paint, indicator geometry, token inheritance or interactions. Restore the original rendering inputs before investigating residual equal-input defects; do not tune text offsets or sampled colors.',
  }),
  Object.freeze({
    id: 'fixture-select-option-composition-substitution',
    introducedBy: '6647a87 fix(material): align select popup state',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`type: 'span' as const, id: 'select-solo-label', textContent: 'Solo'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase select option composition and inherited Material inputs',
    justification: 'The popup-state fix introduced label spans and conditional plugin checkmarks in replacement div options. Material has direct primary-text, a distinct ripple owner and a conditional minimal pseudo-checkbox. The linked complete solo/team value domain establishes text correspondence with each side selected/active inputs retained independently. This is unequal composition, not a legitimate public-API requirement, equivalent custom paint or a core label-layout defect. Original component structure and declarations must precede equivalent-input core investigation.',
  }),
  Object.freeze({
    id: 'fixture-timepicker-option-ink-substitution',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.picker-option',[^\n]*color: '#1d1b20'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase option color-token translation and label ownership',
    justification: 'The Material time option label inherits its parent option color token; candidate direct text instead receives fixed #1d1b20 from picker-option. The source literal predates later alignment changes. Per-case attribution requires the unique complete list mapping, original active reference token, direct inheritance, candidate rule exclusions and agreeing normal/effective/retained color. The captured RGB mismatch is unequal authoring, not an equal-input core paint defect or accepted approximate color. Preserve original tokens and theme scope before assessing rendering.',
  }),
  Object.freeze({
    id: 'fixture-timepicker-option-structure-and-selection-substitution',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`role: 'option', ariaSelected: index === 0, textContent: label`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase timepicker option structure, active/selected state and token declarations',
    justification: 'The complete captured input-linked half-hour list maps Material option/primary-text/ripple nodes to direct-text div options. The candidate always selects the first option although the empty reference input has an active descendant and no selected value. This source substitution dates to the initial showcase, not a core selection failure. Captured owner/label styles and selected states remain unequal inputs; restore reference composition and distinguish keyboard activity from committed selection before investigating rendering or interaction defects with equivalent inputs.',
  }),
  Object.freeze({
    id: 'fixture-picker-commit-not-implemented',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`value: '', disabled: state\.disabled, role: family === 'timepicker'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase picker value/selection state and component interaction logic',
    justification: 'Both picker inputs are always authored empty; handleClick has no day/time option commit path. Supplemental real-pointer checks deliver the correct option click but leave the candidate input empty and popup open; the reference commits the date/time and closes. This is a fixture state defect before renderer layout or paint.',
  }),
  Object.freeze({
    id: 'harness-picker-commit-coverage-gap',
    introducedBy: '4d56f86 fix(material): restore field and popup interaction state',
    file: 'tests/material-parity/benchmark.config.mjs',
    pattern: String.raw`if \(family === 'autocomplete' \|\| family === 'select'\) states\.push\('open-commit-reopen'\)`,
    classification: 'parity-harness-defect',
    owner: 'Material interaction matrix and exact committed-value assertions',
    justification: 'The maintained matrix has commit/reopen only for autocomplete/select, not datepicker/timepicker. Existing picker opening, hover, scrolling, and dismissal cases do not cover selection commit. The supplemental audit-material-picker-commits script exposes both failures; configured-matrix completeness is not complete behavioral coverage.',
  }),
  Object.freeze({
    id: 'fixture-menu-label-composition-substitution',
    introducedBy: '2f44011 initial fixed popup; 994da86 replaces menu button values with nested label spans',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'menu-rename', role: 'menuitem', ariaLabel: 'Rename', children:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase menu connected-overlay composition and original label CSS inputs',
    justification: 'The reference has a connected overlay/backdrop, menu content wrapper, ordered Material buttons and direct text/ripple children. The candidate has a fixed-size absolute popup with two aria-labelled buttons and named label spans. The spans improve direct text ownership compared with the earlier button values, but do not restore the content wrapper, label flex:1 or component typography tokens. Map the complete paired item domain before comparing inputs; do not mistake corresponding text for equivalent layout, state, accessibility or paint.',
  }),
  Object.freeze({
    id: 'fixture-menu-label-font-token-omission',
    introducedBy: 'af04845 adds generic control-family rule; 994da86 adds menu label spans without restoring the component font token',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase menu label component-font token translation',
    justification: 'The generic control font rule is not inherently a workaround. The menu label omits the original direct Material font token, so it inherits the generic control stack instead. Raw reference token, candidate declarations and normal/effective/retained stages prove unequal fallback lists; this is distinct from a core renderer appending fallback fonts to equivalent explicit single-family input.',
  }),
  Object.freeze({
    id: 'fixture-menu-label-ink-substitution',
    introducedBy: '0d67d46 replaces theme.onSurface with #1d1b20; retained by subsequent parity fixes',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#menu-rename, #menu-delete'.*color: '#1d1b20'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase menu item color-token translation and label inheritance',
    justification: 'The original menu item color token overrides its earlier inherit declaration, and its direct text span inherits that computed color. The candidate supplies literal #1d1b20 on its replacement item. Retain both ordered reference declarations, the candidate declaration and all resolved/retained stages; do not normalize the two near colors or infer a core conversion defect from unequal inputs.',
  }),
  Object.freeze({
    id: 'fixture-menu-label-density-offset',
    introducedBy: '994da86 fix(material): complete shared control parity',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.menu-option-label', marginBottom:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase menu label layout input translation; core flex/line-box investigation only with an equal-input proof',
    justification: 'The parity fix added a 4px bottom margin only for the most compact density. The original Material label uses zero margin and flex:1, while the candidate label keeps its inline/default flex inputs and is positioned by its parent plus this margin. This is an authored density-specific compensation, not proof of a core baseline defect. Retain it as evidence, restore the original flex/text inputs in a minimal paired diagnostic before assigning any residual failure to core, and do not tune another offset.',
  }),
  Object.freeze({
    id: 'fixture-tooltip-replaces-connected-overlay-with-flow',
    introducedBy: 'f3c8254 fix(material): complete showcase interaction parity',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.tooltip-anchor', width: '138px', height: '72px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase overlay composition and core CSS-space connected placement',
    justification: 'The reference matTooltip creates a connected CDK overlay outside normal flow. The candidate puts the popup in a fixed-size 138x72px flex column below the trigger. It may align in the current screenshot but does not exercise equivalent containing-block, collision, clipping, or scroll behavior.',
  }),
  Object.freeze({
    id: 'fixture-tooltip-text-alignment-omission',
    introducedBy: '7159b1d introduced tooltip-popup styling without text alignment; subsequent flow/flex rewrites retain the omission',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#tooltip-popup',(?![^\n]*textAlign:)[^\n]*display: 'flex'[^\n]*justifyContent: 'center'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase tooltip original surface typography and layout input translation',
    justification: 'The original Material surface declares text-align:center. The candidate popup uses flex centering but omits text alignment throughout its popup-to-page ancestry, leaving retained core text at the left fallback. Flex centering and text alignment are distinct inputs; neither matching pixels nor setting a compensating glyph offset establishes equivalence. Preserve the original surface declaration and structure before diagnosing any remaining equal-input alignment defect.',
  }),
  Object.freeze({
    id: 'fixture-tooltip-benchmark-hover-suppression',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`event\.targetId === 'tooltip-primary' && \(!this\.benchmarkMode \|\| \['hover', 'held'\]\.includes`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase tooltip state authoring and benchmark adapter neutrality',
    justification: 'Candidate pointer entry opens the tooltip only outside benchmark mode or for named hover/held benchmark states. The original Material directive is not gated by those scenario names. The checkpoint-bound tooltip-state audit shows reference hover/press content absent on the candidate in the benchmark-open cohort, while benchmark-hover and ordinary cohorts open both. Test labels must not change component behavior.',
  }),
  Object.freeze({
    id: 'fixture-tooltip-benchmark-click-forces-open',
    introducedBy: '7159b1d fix(showcase): tighten Material component parity',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`if \(id === 'tooltip-primary' && this\.benchmarkMode && this\.benchmarkInteraction === 'open'\)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase tooltip click/dismissal state and core surface event contract',
    justification: 'The benchmark-open candidate click forces open:true. Material instead routes outside overlay pointer interaction to tooltip hide(0). The live action-boundary proof observes a reference tooltip before release and its removal afterward, while candidate content appears on release. Ordinary and benchmark-hover candidate tooltips also remain after release: removing this special branch alone will not supply the missing ordinary dismissal behavior. This is unequal state authoring, not an equal-input coordinate failure.',
  }),
  Object.freeze({
    id: 'harness-tooltip-open-popup-checks-omitted',
    introducedBy: 'f324bd1 limited tooltip interaction text targets to hover/held; current placement and focused-raster checks also omit open',
    file: 'tests/material-parity/run-material-parity.mjs',
    pattern: String.raw`if \(family === 'tooltip' && !\['hover', 'held'\]\.includes\(state\)\) return \[\]`,
    classification: 'parity-harness-defect',
    owner: 'Material interaction state, popup presence, placement and focused-raster assertions',
    justification: 'The matrix includes tooltip open, but its popup text target is excluded and placement returns matches:true outside hover/held. Generic interaction-state comparison likewise does not compare tooltip presence, and focused raster has no open target. All eight frozen open cases report acceptance despite candidate-only popup trees. Require paired presence/absence and then appropriate placement/raster checks after each real action; do not delete the scenario or force either fixture state to make it pass.',
  }),
  Object.freeze({
    id: 'fixture-tab-label-typography-flattened',
    introducedBy: '2f44011 omitted tab font/tracking tokens; bc4d442 retains the 20px control-label line-height and adjusts density padding',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.tab',(?![^\n]*fontFamily:)(?![^\n]*letterSpacing:)[^\n]*lineHeight: '20px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material tab content/label structure and typography input translation',
    justification: 'The reference tab control supplies Material font and tracking tokens, while its nested mdc-tab__text-label sets line-height:1. Captured label text computes Roboto, .096px tracking and 14px line-height, independently of the 20px content/control line-height. The candidate collapses this into a button value with a 20px line-height, omits the font/tracking overrides and paints the document font stack with zero tracking. The current 1px density padding is not proof that these inputs are equivalent. Restore the original component tokens and distinct content/label line-box intent; if the core control API cannot express it, reduce that core gap rather than offsetting glyphs.',
  }),
  Object.freeze({
    id: 'fixture-paginator-svg-icons-replaced-by-text-glyphs',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'paginator-(?:previous|next)'[^\n]*value: '[‹›]'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase paginator icon geometry inputs through core vector/image rendering',
    justification: 'The reference paginator navigation controls contain a 24x24-viewBox SVG with explicit directional path geometry. Candidate controls instead author the font glyphs ‹ and ›, currently painted at 20px through core control text. These are different rendering inputs, not legitimate text-owner mappings or a renderer failure to reproduce the supplied SVG. Restore the same vector geometry and its CSS sizing/state paint through core rendering; do not calibrate font size or glyph position to imitate it. Both substitutions are present in the initial showcase commit.',
  }),
  Object.freeze({
    id: 'fixture-toolbar-button-height-replaces-inherited-line-height',
    introducedBy: '3bf5b4d toolbar typography and density alignment',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.toolbar-action'[^\n]*lineHeight:`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase toolbar button inherited typography inputs',
    justification: 'The browser toolbar action inherits its line-height from the Material toolbar title token, computing 28px independently of the button container height. The candidate toolbar-action rule instead assigns lineHeight from the same density branch as height (40, 24 or 28px), introduced in 3bf5b4d. Captured normal/effective/current-paint stages retain that explicit substitution. Restore the inherited typography intent rather than using container height as a text alignment correction; equivalent input must precede any core baseline investigation.',
  }),
  Object.freeze({
    id: 'fixture-toolbar-measured-intrinsic-widths',
    introducedBy: '92067a1 fix(example): align Material toolbar states',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.toolbar-(?:title|action)'[^\n]*width: '(?:192\.15625|65\.140625)px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase intrinsic sizing inputs; core flex and typography if equal-input proof fails',
    justification: 'The reference title has no authored width and its action uses a 64px minimum plus content/padding. The candidate substitutes measured 192.15625px/65.140625px widths and disables shrinking. Equal output at the current label does not establish equivalent intrinsic sizing.',
  }),
  Object.freeze({
    id: 'fixture-badge-theme-measured-widths',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#badge-primary'[^\n]*81\.859375px[^\n]*104\.65625px[^\n]*90\.953125px`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase inline sizing inputs; core inline layout and text metrics',
    justification: 'The reference badge host is an inline span with auto width, not a theme-indexed width table. The candidate encodes measured text widths for density/typography variants before positioning its badge. New inline and inline-block equivalent-input reductions, with and without a positioned badge child, expose a core descendant-intrinsic-width defect: the nested label measures correctly but its parent stays zero-width. Fix that core rule before removing the table; the compound badge placement also has separately reproduced margin-box and still-open composition concerns.',
  }),
  Object.freeze({
    id: 'fixture-badge-primary-instead-of-error-token',
    introducedBy: 'current native badge rule retained by 48c994e; original token-choice introduction not yet established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.badge-bubble'[^\n]*background: theme\.primary, color: theme\.onPrimary`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase badge theme-token translation',
    justification: 'All twelve fresh static badge captures show reference error-token versus candidate primary-token backgrounds: light #b3261e/#6750a4, dark #f2b8b5/#d0bcff, contrast #8b0000/#000000, custom #ba1a1a/#006a6a. Reference .mat-badge-content authors var(--mat-badge-background-color, var(--mat-sys-error)); candidate .badge-bubble authors theme.primary. This is unequal color input, not a demonstrated core paint defect. Review on-error text color separately rather than assuming theme.onPrimary is equivalent.',
  }),
  Object.freeze({
    id: 'fixture-chip-state-measured-widths',
    introducedBy: '00de46c fix(material): align chip labels and spacing',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#chip-[01]'[^\n]*width: state\.chipSelections`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase chip composition; core intrinsic flex sizing',
    justification: 'Reference chip widths derive from label, graphic, padding, and selected-state structure. Candidate IDs select fixed 97/68px and 93/64px widths. This substitutes outcomes for content-dependent inputs and cannot validate other labels or typography.',
  }),
  Object.freeze({
    id: 'fixture-chip-outline-pseudo-replaced-by-host-border',
    introducedBy: '2f44011 initial showcase .chip host border; current selected-state removal retained separately',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.chip'[^\n]*borderWidth: '1px', borderStyle: 'solid', borderColor: '#79747e'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase chip outline ownership and token translation; core generated-box support if independently reproduced',
    justification: 'All 76 checkpoint-bound chip cases (152 hosts) retain a zero-width reference host border and an absolutely positioned descendant-button ::before outline. The candidate moves that outline onto the chip host and authors literal #79747e. Thirty-two unselected observations have a 1px reference pseudo outline versus 1px candidate host border; 120 selected observations have zero widths. Reference pseudo colors include RGB 123,117,127 and 73,69,78, not the candidate literal. Browser controls show that moving a 1px outline onto a fixed border-box host shrinks its content width by 2px and moves content 1px, despite equal outer geometry. This is unequal input, not a renderer border-placement defect or a reason to subtract padding/add label offsets. Host and pseudo styles, token declarations, state and hit ownership must be preserved separately; no final raster or whole-chip equivalence is claimed.',
    focusedProof: 'scripts/audit-material-chip-inputs.mjs; browser pseudo outline controls in input-equivalence-audit.spec.mjs',
  }),
  Object.freeze({
    id: 'fixture-stepper-breakpoint-connector',
    introducedBy: '4e58f58 fix(material): align compact navigation surfaces',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.step-connector'[^\n]*width: '(?:73\.2|69\.5|15\.1)%'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase stepper composition; core flex layout',
    justification: 'Material uses a flex header row and a flex:auto connector with min-width:32px and horizontal negative margins. The candidate uses absolute headers and a connector with hand-selected breakpoint widths/offsets. Translate the actual flex constraints before diagnosing any remaining core defect.',
  }),
  Object.freeze({
    id: 'fixture-stepper-number-wrapper-substitution',
    introducedBy: '2f44011 initial fixed centered badge; 2f14e60 later stepper row styling',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.step-badge',[^\n]*width: '24px', height: '24px'[^\n]*textAlign: 'center'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase stepper numeric-icon structure; core CSS percentage transforms',
    justification: 'Reference numeric icons keep start-aligned text inside a separate absolutely positioned mat-step-icon-content wrapper, with top/left 50% and translate(-50%, -50%). Candidate step-badge spans combine the circle and number into a fixed 24px square with textAlign:center. Attribute alignment occurrences only when the exact text mapping, complete horizontal-LTR reference ancestry, active positioning rule and candidate normal/effective/retained inputs agree. This substitutes a different layout mechanism, not equivalent inputs or proof of a core text-alignment defect. The independently failing percentage-transform reduction explains why retaining a centered-span workaround would conceal the unsupported/incorrect original path; restore the original wrapper after the owning core fix, without compensating offsets.',
  }),
  Object.freeze({
    id: 'fixture-stepper-number-font-substitution',
    introducedBy: '2f44011 initial fixed 14px step badge; 2f14e60 later badge styling',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.step-badge',[^\n]*fontSize: '14px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase stepper numeral font inheritance',
    justification: 'Reference numeral font size inherits through the complete icon/header path from the frame calc(16px * var(--scale)) declaration. Candidate explicitly authors 14px on step-badge; normal/effective/retained sizes agree. In the captured themes reference sizes are 16px, 14.4px and 18.4px. This fixed input overrides original inheritance and is not a core scale or raster defect. Restore the inherited font with the original percentage-positioned wrapper, without calibrating the text against the selection circle.',
  }),
  Object.freeze({
    id: 'fixture-stepper-label-color-omitted',
    introducedBy: '2f44011 initial step-text typography; 354084e later vertical alignment',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.step-text',(?![^\n]*color:)[^\n]*fontSize: '14px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase stepper Material label-color tokens',
    justification: 'Reference inner text inherits Material step-label active-state color, ultimately using on-surface-variant. Candidate omits color along the full normal/effective text-to-page path and retains the page on-surface color. Require exact shared text IDs, original inner wrapper/header structure, active token rules and candidate ancestry before attributing each occurrence. Preserve captured dark/reference values rather than modifying reference truth or tuning a theme to hide the unequal inputs. Actual state glyph paint remains separate from retained color.',
  }),
  Object.freeze({
    id: 'fixture-grid-list-missing-reference-gutter',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.grid-list'[^\n]*gridTemplateColumns: '1fr 1fr', gap: '0'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase grid-list component translation',
    justification: 'The reference Material grid list emits absolute tiles of calc(50% - 0.5px), with the second at calc(50% + 0.5px): a 1px gutter. Candidate equal grid tracks use gap:0. Fresh twelve-case static capture witnesses explicitly authored block versus grid container display. Equivalent-input reductions separate the documented direct-StyleRule calc limitation from a confirmed opposing-vertical-inset auto-height defect in text-bearing content. Neither permits substituting a gapless grid and calling it renderer parity.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: positioned grid-list tiles preserve a one-pixel gutter',
  }),
  Object.freeze({
    id: 'core-grid-none-template-becomes-zero-track',
    introducedBy: 'a6bd57c extracted the current tokenizer; first bad revision has not been established',
    file: 'src/app/services/dom/elements/grid-track-sizing.ts',
    pattern: String.raw`const trackTokens = tokens\.length \? tokens : Array\.from`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'GridService explicit/implicit template semantics and grid-track-sizing tokenization',
    justification: 'The public-API equal-input browser reduction repeats four failures: explicit grid-template-columns:none or grid-template-rows:none collapses the stretched item dimension to0 instead of120/240px. Twelve omitted,1fr and fixed-pixel controls pass. The original none declaration survives normal/effective style resolution; the parent geometry remains correct and the assigned CSS item size is already zero before projection. The tokenizer retains none as a track token, the intrinsic-row path rejects it, and the numeric fallback turns it into a zero-length explicit track. Omission instead generates implicit tracks. Preserve the failing none input and repair the core explicit/implicit-track rule; do not author1fr, pixels or explicit cells in fixtures to avoid it. This bounded geometry proof is DPR1 and does not establish arbitrary implicit tracks, text/min-content behavior, final raster, or attribution of non-grid template snapshots.',
    focusedProof: 'examples/material-showcase/src/app/grid-template-initial-audit.spec.ts',
  }),
  Object.freeze({
    id: 'direct-style-calc-resolution-limit',
    introducedBy: 'documented direct StyleRule boundary; loaded-document-style resolution is a separate supported path',
    file: 'docs/compatibility/html-css.md',
    pattern: String.raw`Direct \x60StyleRule\x60 authoring does not accept`,
    classification: 'intentional-documented-limitation',
    owner: 'core CSS value-resolution boundary and loaded document style integration',
    justification: 'The unchanged calc(80px) and calc(50% +/- 0.5px) grid-list reductions fail through direct StyleRule: dimensions retain parent sizes and the second tile left resolves to zero. That function evaluation is explicitly outside the direct contract. The same original declarations through provideAstylar({css:{useDocumentStyles:true}} resolve width/height/left correctly at 280px and 480px; public pre-projection style assertions and outer geometry agree with the browser. Inner auto-height content still fails separately. The proof uses identical scoped CSS in both realms and empty SiteData.styles, not fixture arithmetic or measured-value copying. Full Material integration and other expressions remain unproven; neither these bounded passes nor literal controls justify a substituted grid.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: original calc expressions',
  }),
  Object.freeze({
    id: 'core-opposing-vertical-insets-ignore-auto-height',
    introducedBy: 'current dimension path; the audit has not established a first bad revision',
    file: 'src/app/services/dom/elements/element-dimension.service.ts',
    pattern: String.raw`heightSource = isInlineLevel`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'ElementDimensionService positioned auto-height constraints, then intrinsic block/flex resize ownership',
    justification: 'A plain text-bearing absolute block or flex box with top:10px,bottom:15px in a100px parent is20px high instead of75px; its top and both horizontal edges match. Literal grid-list controls reproduce20px instead of80px content height after outer tile geometry and the1px gutter match. Core resolves left/right auto width from opposing insets, but the height path chooses intrinsic text height and lacks the corresponding vertical constraint. Flex standalone auto-height resizing also protects only explicit or flex/grid-assigned heights, so a complete fix must preserve positioned used-height ownership through later layout. This is a CSS-space used-size defect, not a Babylon projection mismatch or the separate calc limitation.',
    focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts: opposing absolute insets determine auto size',
  }),
  Object.freeze({
    id: 'fixture-fixed-reference-heights',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`const MATERIAL_(?:REFERENCE|COMPACT_REFERENCE|CONTRAST_REFERENCE)_HEIGHTS`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase fixture; remove after core auto-layout proof',
    justification: 'Per-family measured height tables encode reference outcomes instead of supplying the reference layout inputs.',
  }),
  Object.freeze({
    id: 'fixture-heading-position-compensation',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#(?:eyebrow|title)'[^\n]*\btop:`,
    classification: 'equivalent-representation',
    owner: 'showcase fixture and core block-flow/typography verification',
    justification: 'Both fixtures author the same relative heading offsets: top:-2px and top:-6.5px, with corresponding density corrections. The existing heading-flow component spec asserts these values. Accept the shared offsets as reference input; any additional unequal responsive values remain separately reported.',
  }),
  Object.freeze({
    id: 'harness-reference-headings-hidden',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/reference.component.ts',
    pattern: String.raw`\.benchmark>\.eyebrow,\.benchmark>h1\{opacity:0\}`,
    classification: 'parity-harness-defect',
    owner: 'showcase benchmark paint coverage',
    justification: 'Benchmark mode hides the reference headings with opacity:0 even though the manual showcase displays them. Candidate benchmark mode instead uses surface-colored glyphs at opacity:1. The full-tree audit maps both headings and records these unequal paint inputs. Shared relative offsets do not justify hiding the text, and the green benchmark cannot establish visible heading raster parity. Preserve this baseline evidence; restore unmasked equivalent inputs and test visible headings in follow-up work, not another compensation.',
  }),
  Object.freeze({
    id: 'harness-candidate-headings-surface-colored',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#(?:eyebrow|title)'[^\n]*color: this\.benchmarkMode \? theme\.surface`,
    classification: 'parity-harness-defect',
    owner: 'showcase benchmark paint coverage',
    justification: 'The candidate changes the authored heading ink to the page surface color in benchmark mode, while the reference sets opacity:0. The original showcase commit already contains both masking paths; ee42cb3 changed flow but retained them. These are unequal inputs, not a proven equivalent representation or evidence of a core text-paint defect. Record and remove the masking through an honest visible-input benchmark in follow-up work.',
  }),
  Object.freeze({
    id: 'fixture-responsive-height-compensation',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`family === '(?:toolbar|paginator|button)'[^\n]*mediaMaxWidth[^\n]*height`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase fixture and core responsive auto-layout verification',
    justification: 'Breakpoint-specific fixed heights duplicate measured reference results rather than the reference content-flow rules.',
  }),
  Object.freeze({
    id: 'fixture-core-button-absolute-compensation',
    introducedBy: '2f44011 feat(example): add Material component showcase',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '#core-primary'[^\n]*position: 'absolute'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase fixture',
    justification: 'The reference button is an inline-flex flow item; the Astylar fixture pins the measured result with absolute coordinates.',
  }),
  Object.freeze({
    id: 'fixture-dpr-position-compensation',
    introducedBy: '662c179 fix(renderer): normalize css transform coordinates; later extended by visual-parity fixes',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`devicePixelRatio`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase fixture and core text rasterization verification',
    justification: 'Authored CSS geometry must not change by DPR merely to move text into screenshot parity.',
  }),
  Object.freeze({
    id: 'fixture-manual-overlay-placement',
    introducedBy: 'c64397c fix(material): align datepicker overlay and controls',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`connectedOverlayTop`,
    classification: 'application-plugin-authoring-defect',
    owner: 'core generic connected-overlay positioning API',
    justification: 'The consuming fixture reimplements anchor measurement and viewport collision handling that belongs in a reusable core overlay primitive.',
  }),
  Object.freeze({
    id: 'fixture-hardcoded-ripple-bounds',
    introducedBy: '7945a42 fix(example): audit Material text and card',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`width: event\.targetId === 'card-open'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'core event geometry and Material ripple adapter',
    justification: 'Ripple bounds are copied per target instead of using resolved CSS-space hit geometry supplied by core.',
  }),
  Object.freeze({
    id: 'fixture-rendered-geometry-feeds-layout',
    introducedBy: 'c64397c connected-overlay placement; audit measurement cycle isolated in d6a3158',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`this\.measure\(this\.surface, \[anchorId\], false\)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'core CSS layout-box query API and showcase overlay authoring',
    justification: 'connectedOverlayTop calls measure, which projects mesh vectorsWorld through Vector3.Project. It then feeds the resulting anchor.top into new authored CSS top. Diagnostic projection is valid for measuring output, but using it to compute the next layout creates a rendered-output-to-input dependency contrary to the CSS-first contract.',
  }),
  Object.freeze({
    id: 'fixture-slider-fixed-half-domains',
    introducedBy: 'range interaction parity changes; current min/max/step declarations are the direct evidence',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'slider-(?:start|primary)'[^\n]*min: '(?:0|50)'[^\n]*step: '1'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase range authoring and core two-thumb control composition',
    justification: 'The reference mat-slider declares min=0, max=100, step=5; Astylar gives the start input 0..50 and end input 50..100 with step=1, and clamps their authored values at 50. This changes reachable values and quantization regardless of pointer rendering. A start value above 50 or end below 50 cannot be represented by the current Astylar inputs.',
  }),
  Object.freeze({
    id: 'harness-slider-drag-stays-in-half-domains',
    introducedBy: 'existing sliderDragCoordinates diagnostic action contract',
    file: 'tests/material-parity/run-material-parity.mjs',
    pattern: String.raw`const targetRatio = thumb === 'start' \? \.4 : \.75`,
    classification: 'parity-harness-defect',
    owner: 'Material slider interaction matrix',
    justification: 'The start drag ends at 40 and the end drag at 75. Both remain inside the incorrectly restricted Astylar half-domains, so these tests cannot expose the missing ability to move start above 50 or end below 50. Add full-domain and keyboard-step evidence; retain the existing cases.',
  }),
  Object.freeze({
    id: 'fixture-calendar-selection-ring-coordinates',
    introducedBy: '87f7f83 fix(example): render Material picker overlays',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.datepicker-selected'[^\n]*position: 'absolute'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase fixture; use the same grid-cell structure as the reference',
    justification: 'A separate ring is positioned from duplicated row/column arithmetic instead of being centered by the selected grid cell.',
  }),
  Object.freeze({
    id: 'fixture-calendar-day-typography-substitution',
    introducedBy: '87f7f83 fixed cell ink/omitted typography; c64397c flattened day span into control',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.datepicker-cell'[^\n]*color: '#1d1b20'[^\n]*fontSize: '14px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar component token translation and inner text structure',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: calendar day typography declaration witnesses and contradictory-input controls',
    justification: 'The reference day label has an inner line-height:1 box, calendar font token and date-text color token. The candidate flat day control inherits the longer document font stack, omits the inner line-height and fixes #1d1b20. Full-date/context mapping exposes these unequal normal/effective/current texture inputs without claiming a core defect or compensating baseline fix.',
  }),
  Object.freeze({
    id: 'fixture-calendar-navigation-svg-icons-replaced-by-text-glyphs',
    introducedBy: '87f7f83 fix(example): render Material picker overlays',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'datepicker-(?:previous|next)'[^\n]*value: '[‹›]'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar vector icon inputs and navigation accessible state',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: calendar navigation SVG-to-glyph substitution witnesses',
    justification: 'Calendar navigation replaces the reference explicit SVG chevrons with font glyphs. The candidate also retains Previous/Next month accessible names in year view, where the reference names a 24-year range. Preserve both the geometry and naming inequality; do not tune glyph position/size to compensate for using different icon input.',
  }),
  Object.freeze({
    id: 'fixture-calendar-year-typography-substitution',
    introducedBy: 'd973f84 fix(material): complete picker and range interactions',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.datepicker-year'[^\n]*color: '#1d1b20'[^\n]*fontSize: '14px'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase calendar year token translation and inner text structure',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: calendar year typography declaration witnesses',
    justification: 'The reference multi-year cells use the calendar font token and an inner line-height:1/date-text-token label. The replacement year buttons omit that font/line box and fix #1d1b20. Range/ancestry correspondence does not make these typography inputs equivalent or prove a core defect.',
  }),
  Object.freeze({
    id: 'fixture-tab-breakpoint-raster-compensation',
    introducedBy: '4e58f58/25e1893 compact navigation and interaction parity fixes',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.tab-(?:indicator|baseline)'[^\n]*mediaMaxWidth: '500px'[^\n]*(?:\.67px|\.33px|51\.9%)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase fixture and core line/percentage layout verification',
    justification: 'Theme- and breakpoint-specific fractional offsets tune pixels rather than preserving a single equivalent tab layout input.',
  }),
  Object.freeze({
    id: 'plugin-circular-progress-start-angle',
    introducedBy: '7159b1d fix(showcase): tighten Material component parity',
    file: 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    pattern: String.raw`const materialStartAngle =`,
    classification: 'application-plugin-authoring-defect',
    owner: 'Material plugin circular-progress paint',
    justification: 'The unexplained 52-degree offset (PI * 13 / 45 radians) is output calibration; Material-specific arc paint is legitimate, but its CSS-space start angle should follow the reference geometry.',
  }),
  Object.freeze({
    id: 'plugin-tab-panel-competing-text-renderer',
    focusedProof: 'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts: actual bound-texture fillText observations with independent CSS/data changes',
    introducedBy: '7159b1d fix(showcase): tighten Material component parity',
    file: 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    pattern: String.raw`class MaterialTabPanelRenderer(?:(?!\r?\n\})[\s\S])*?new DynamicTexture(?:(?!\r?\n\})[\s\S])*?canvas\.font\s*=(?:(?!\r?\n\})[\s\S])*?canvas\.fillText\(`,
    classification: 'application-plugin-authoring-defect',
    owner: 'core text paint plus plugin-owned transition orchestration',
    justification: 'The plugin creates a DynamicTexture and draws glyphs/baselines itself, duplicating core text paint instead of composing core-rendered content. Captured active-panel/header linkage maps the reference ordinary text span to a childless custom element with selected/font/color/baseline data and no core text entry. That correspondence explains a stage absence, not actual per-case private paint: the separate bound-texture diagnostic proves CSS-independent font and ink ownership. A matching ariaLabel is not painted-text evidence. Preserve the distinction and replace private text rendering with core composition.',
  }),
  Object.freeze({
    id: 'plugin-tab-panel-baseline-offset',
    focusedProof: 'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts: observed private baseline with baseline-offset zero',
    introducedBy: '593f81b fix(material): align custom tab typography',
    file: 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    pattern: String.raw`\['baseline-offset'\]`,
    classification: 'application-plugin-authoring-defect',
    owner: 'core typography and plugin tab transition',
    justification: 'A plugin data knob manually moves a text baseline and is direct evidence of an Astylar-only typography compensation.',
  }),
  Object.freeze({
    id: 'fixture-icon-svg-replaced-by-fixed-raster',
    introducedBy: '48825c4 fix(example): render Material icon asset',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`src: theme\.mode === 'dark' \? MATERIAL_FAVORITE_ICON_DARK : MATERIAL_FAVORITE_ICON_LIGHT`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase icon asset/currentColor inputs and core SVG/image texture loading',
    focusedProof: 'tests/material-parity/icon-asset-input.spec.mjs: all 20 original SVG/PNG owners and asset/dimension negative controls',
    justification: 'The reference renders an inline currentColor SVG inside mat-icon. The candidate replaces its original SVG URL with fixed 24px light/dark PNGs; the historical asset comment cites transparent-pixel stability in the Babylon texture loader. All 20 captured owners bind the same SVG path, xMidYMid meet viewport and exact raster assets. Native wrapper objectFit fill versus candidate image contain is not a like-for-like image-fit comparison. Fixed raster resolution and baked theme ink do not preserve vector/currentColor inputs across DPR, size or color changes. Restore equivalent asset and paint inputs only after reducing SVG loading/alpha behavior through public APIs; this proof establishes historical input substitution, not a confirmed remaining core texture defect or raster equivalence.',
  }),
  Object.freeze({
    id: 'core-pointer-state-material-allocation-escapes-render-owner',
    introducedBy: 'current public pointer lifecycle reduction; first-bad revision and historical performance attribution not established',
    file: 'src/lib/astylar.ts',
    pattern: String.raw`mesh\.metadata\[materialKey\] = this\.babylonMeshService\.createMaterial\(`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core interaction-created material adoption and replacement lifetime',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: public button pointer states diagnose materials outside render ownership; tests/material-parity/sort-focus-structure.spec.mjs: dark mobile overlay cycles retain focus and semantic cleanup boundaries',
    evidence: [{ file: 'artifacts/material-parity/public-pseudo-material-ownership-61b4fc9-strict.log', sha256: '7e4b76703625c171e7d1dfeb595759f0bd75b1a65e3545a267e57f9a8cf02cd2' },
      { file: 'artifacts/material-parity/overlay-live-resources-08bc98c.log', sha256: '766b0a29f109c408dcc45b534aa0497f8a02619965e24fec094979a5feb15cf6' },
      { file: 'artifacts/material-parity/tooltip-live-ownership-cycles-verified-20261005.log', sha256: 'caface4e738b983984d97660263a44c9d116e0b78b94df203e9b96e4d4b5f8fc' }],
    observation: { component: 'plugin-free public button', element: 'probe', dpr: [1, 2],
      states: ['no-interaction remove/recreate', 'hover', 'held', 'click', 'blur', 'remove/recreate', 'surface disposal'],
      property: 'live-minus-tracked materials after removal', reference: 'zero retained materials for removed control',
      astylar: [5, 10, 15], stage: 'post-render pointer-state allocation outside synchronous resource ownership' },
    justification: 'Plugin-free package-root Chrome154 reproduction at DPR1/2 retains no orphans across three no-interaction replacements, but pointer-state cycles leave5/10/15 unbound materials after removal. Complete installed/current typed pseudo-state, label-material, resource replace, legacy pointer setup/material and mesh allocation methods match. Typed state materials and legacy solid-background replacement are allocated outside synchronous replace without adoption; label-state textures/materials explicitly adopt. Menu/sheet/dialog live counts grow19/20/21,18/19/20,17/20/23 while tracked counts plateau, with corresponding trigger state identities. Unbound alone does not mean unowned: combine tracked/live counts, stable identities and the public removal control. Whole-surface disposal clears resources but does not satisfy element replacement lifetime. This is a separate allocation subtype from the caret finding; no plugin compensation, GPU usage, lag attribution, gradient/border generalization or all-profile/late-async acceptance follows.',
  }),
  Object.freeze({
    id: 'plugin-linear-progress-right-origin-and-track-input-mismatch',
    introducedBy: 'e4ca3db4 CSS adapter migration retains predecessor positive displacement; historical first-bad runtime not established',
    file: 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    pattern: String.raw`let centerCss = mode === 'determinate' \|\| mode === 'buffer'\s*\? widthCss \* \(1 - amount\) / 2`,
    classification: 'application-plugin-authoring-defect',
    owner: 'Material plugin CSS-space linear-progress geometry and application track-color inputs',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: retained progress paint binds plugin geometry and unequal track inputs',
    evidence: [{ file: 'artifacts/material-parity/progress-paint-input-boundary-711eec2.log',
      sha256: '69a8310dc9bbce45185d4014525b1f4c161f8672745ce66073ecba4f4599dae1' }],
    observation: { component: 'progress-bar', element: 'progress-bar-primary', dpr: [2],
      profiles: ['light', 'dark', 'contrast', 'custom'], viewport: { width: 390, height: 844 },
      states: ['determinate 64/100'], property: 'indicator CSS center and track color',
      reference: { fillOrigin: 'left', width: 166.4, track: 'rgb(232, 224, 235)' },
      astylar: { centerCss: 46.8, fillOrigin: 'right', track: ['#e7e0ec', '#49454f', '#e7e0ec', '#e7e0ec'] },
      stage: 'plugin CSS geometry and authored data before final projection' },
    justification: 'Four actual-theme mobile DPR2 paired captures bind native left-origin scale .64 to a 166.4px fill in a 260px track, while the candidate requests positive46.8 CSS px displacement and projected/raster observations fill the right64%. The source center formula is the first unequal input, not unexpected core projection. Native track rgb(232,224,235) differs from candidate authored light/contrast/custom #e7e0ec and dark #49454f, with exact foreground/track samples agreeing with those inputs. The same capture strengthens the existing spinner start-angle finding: native SVG rotation -90degrees versus plugin -38degrees and decreasing CSS angles. No whole-arc/cap raster, other value/viewport, used-height, lifetime or historical first-bad runtime acceptance follows. Restore equivalent plugin geometry/data, never compensate core layout or final projection.',
  }),
  Object.freeze({
    id: 'fixture-compact-input-inset-conditioned-on-nonempty-value',
    introducedBy: 'current compactFilled density/nonempty gate; historical first-bad runtime not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`const compactFilled = theme\.density < 0 && !empty;`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase field input-region class and density-token translation',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: retained compact empty and filled inputs bind authored inset before projection',
    evidence: [{ file: 'artifacts/material-parity/empty-filled-input-ancestor-boundary-128fdec.log',
      sha256: '4105695c856d6962b6701c47d6052b462725ff93e5c132a58bdfdf7005831e3d' }],
    observation: { component: 'form-field', element: 'form-field-input-region', dpr: [2],
      profiles: ['contrast', 'custom'], viewport: { width: 390, height: 844 },
      states: ['focused empty', 'focused filled'], property: 'input inset from field top',
      reference: { contrast: [6, 6], custom: [12, 12] },
      astylar: { contrast: [16, 6], custom: [16, 10] },
      stage: 'state-conditioned authored class and resolved top before final projection' },
    justification: 'Eight retained pages bind native infix padding6/12px in both empty and filled states to candidate authored/resolved/used top16px when empty and6/10px when filled. The application compactFilled gate excludes the compact input-region class for empty values. Exact geometry decomposition accounts for contrast empty+10px and custom empty+4px/filled-2px separately from field-origin residuals .0131225586/.0181274414px. This proves an application input mismatch for these four form-field states, not a core projection defect, all-family equivalence, residual-origin attribution or historical first-bad runtime. Restore reference density/input semantics rather than moving rendered glyphs or adding a corrective offset.',
  }),
  Object.freeze({
    id: 'fixture-composite-keyboard-handler-omits-activation-and-navigation',
    introducedBy: 'current Escape-only showcase key handler; historical first-bad runtime not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`private handleKeydown\(id: string, event: AstylarEvent\): void \{\s*if \(event\.key !== 'Escape' \|\| !this\.store\.state\(\)\.open\) return;`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase custom-control semantics, activation and composite keyboard state routing',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: retained keyboard profiles replay original assertions and bind the Escape-only handler',
    evidence: [{ file: 'artifacts/material-parity/keyboard-mobile-profiles-09e2287.log',
      sha256: 'abf20370156f5f3d163bfb8d1f9366257edef61193c5be06b31954ce8983293b' },
      { file: 'artifacts/material-parity/keyboard-selection-mobile-profiles-207c5a8-verified.log',
        sha256: '9b27a26ffcd960060b6eb56d39ce91d9df20b8a001e8649b3a4b88a360440ae3' }],
    observation: { component: 'nine custom control families', element: 'focused semantic target', dpr: [2],
      profiles: ['light', 'dark', 'contrast', 'custom'], viewport: { width: 390, height: 844 },
      states: ['real Tab focus', 'Space/Enter activation where tested', 'ArrowLeft/ArrowRight composite navigation where tested'],
      families: ['checkbox', 'chips', 'slide-toggle', 'expansion', 'sort', 'radio', 'button-toggle', 'tabs', 'stepper'],
      property: 'keyboard-induced state transition', reference: 'tested activation/navigation changes state',
      astylar: 'keydown reaches application callback without corresponding activation/navigation; tabs Enter still clicks focused item',
      stage: 'custom-control authoring and Escape-only application state handler' },
    justification: 'The retained36 paired all-theme mobile DPR2 cases preserve20 original assertion checks. Keydown arrives at candidate callbacks, while native controls change activation/selection or composite focus and candidate state remains unchanged. Current source routes keydown to a handler accepting only Escape while an overlay is open. This is evidence of unequal application/custom-control behavior, not lost core key delivery or a claim that every key is inert: tabs Enter clicks its already-focused item. Restore reference-equivalent control semantics/state routing at the responsible boundary; separately reduce any missing public core keyboard contract before assigning core ownership. Additional keys, tablet/disabled/error states, focus paint and all-profile lifetime remain open.',
  }),
  Object.freeze({
    id: 'core-engine-antialias-option-overridden-by-hardcoded-argument',
    introducedBy: 'current hardcoded Engine argument; historical first-bad runtime not established',
    file: 'src/lib/astylar.ts',
    pattern: String.raw`new Engine\(\s*canvas,\s*true,`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core public render option translation at Babylon Engine construction',
    focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: public antialias option evidence binds original core arguments and Babylon override',
    evidence: [{ file: 'artifacts/material-parity/selection-public-context-antialias-20261008.log',
      sha256: '2e4e9b530e172f2664b2434e9058976f4c077304face727980825facd7b68b35' },
      { file: 'artifacts/material-parity/selection-antialias-option-owner-20261008.log',
        sha256: '197a51ba808542baa7a5417094cd1c784669e2332773d5d86b6602836b6e39b3' }],
    observation: { component: 'public surface mount', element: 'WebGL Engine context',
      property: 'antialias option', reference: 'public omitted/false requests resolve false',
      astylar: 'hardcoded true constructor argument overwrites false options; actual context four samples',
      stage: 'core option translation and Babylon constructor assignment', dpr: [1, 2] },
    justification: 'Six package-root browser contexts for omitted,false,true atDPR1/2 report antialias true and four samples. Complete current/installed createScene methods match. Executing original constructor arguments and original installed Babylon assignment demonstrates why false is overridden. Honor the public option at the core construction boundary with default/false/true context controls; do not compensate through fixture colors or geometry. This proves option-policy divergence,not that MSAA causes every selection fringe,blurry glyph or performance symptom. Full current-runtime and Material case closure remain separate.',
  }),
  Object.freeze({
    id: 'core-selected-caret-blink-ignores-noncollapsed-selection',
    introducedBy: 'current selection-blind cursor visibility owner; historical first-bad runtime not established',
    file: 'src/app/services/dom/input/text-cursor.renderer.ts',
    pattern: String.raw`textInput\.cursorMesh\.isVisible = visible && textInput\.focused;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core TextCursorRenderer focus/blink visibility before projection',
    focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: selected caret blink owner conserves shipped methods and exposes selection-blind visibility',
    evidence: [{ file: 'artifacts/material-parity/selection-caret-visibility-owner-20261008.log',
      sha256: '86680a3ef66f41624966903bae42ca49a6b5186894d53afcb475a91dc6a57cf4' },
      { file: 'artifacts/material-parity/selection-material-actual-caret-20261008/latest-report.json',
        sha256: 'b5d48440a777884b18c9f410ecc7956173642e916bd5f27c8af4e3f95b9117ce' }],
    observation: { component: 'text cursor visibility owner; corroborated form-field cohort',
      element: 'focused input with noncollapsed selection', property: 'caret visibility and blink',
      reference: 'selected native caret absent; collapsed controls blink',
      astylar: 'selection-blind visibility and530ms timer; selected caret visibly blinks',
      stage: 'core focus/timer visibility before mesh paint/projection' },
    justification: 'Complete current and installed owner methods agree. Executing original startBlinking,stopBlinking and updateCursorVisibility with forward,backward and collapsed inputs reproduces selected visibility/toggling while blur and stop controls hide. Independent public equal-input evidence and actual Material temporal captures corroborate the selection-aware policy gap. Material typography and caret-color inputs remain unequal; do not tune glyph offsets,highlight width or screenshot hiding to compensate. Repair the core focus/selection/blink policy with collapsed,blur,update and disposal controls before assessing all callers. No all-input,lifetime or whole-case acceptance is inferred.',
  }),
  Object.freeze({
    id: 'fixture-text-input-primary-caret-color-omitted',
    introducedBy: 'current fixed field text color and omitted caretColor; historical first-bad runtime not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`selector: '\.field-control'[^\n]*color: '#1d1b20'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase input caret-color token translation; stroke geometry remains core-owned',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: retained empty caret rasters preserve visibility and unequal ink inputs',
    evidence: [{ file: 'artifacts/material-parity/empty-caret-missing-profiles-128fdec.log',
      sha256: '826b30d54c6be9d21250c02c9d5ff81338dc3a3d8b0a480de7f15760b8255498' },
      { file: 'artifacts/material-parity/empty-caret-missing-profiles-128fdec-local-replay.log',
        sha256: 'f8c664f73e3eac49e7a3881c7ffb63d2f5d874fd36ff86433bd5376ac6c7a3f4' }],
    observation: { component: 'five text-input families', element: 'focused empty input', dpr: [2],
      profiles: ['light', 'dark', 'contrast', 'custom'], viewport: { width: 390, height: 844 },
      states: ['real Tab, select-all, delete', 'six timed empty-focus samples'],
      families: ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'],
      population: '18 missing mobile profile/family pairs; dark form-field/email remain separate prior evidence',
      property: 'caretColor and visible stroke', reference: 'profile primary ink',
      astylar: 'caretColor omitted; fixed text ink #1d1b20; visible sampled strokes',
      stage: 'unequal effective caret-color inputs before text/caret paint' },
    justification: 'Explicit initial/hide screenshot capture and localized replay authenticate432 rasters over18 missing mobile DPR2 profile/family pairs. Both sides expose contiguous caret strokes with empty values and focus; native ink follows primary while candidate omits caretColor and paints fixed text ink. Fourteen pairs retain original geometry diagnostic failures. Autocomplete animation contaminates whole-crop differences, so only localized stroke evidence supports caret existence. This closes bounded absence, not matched stroke width/position, all-state sharpness, tablet/disabled/error, or current full-browser acceptance. The existing independent public stroke-width defect remains separate; restore equivalent color inputs before evaluating core paint.',
  }),
  Object.freeze({
    id: 'fixture-tooltip-timepicker-focus-popup-state-mismatch',
    introducedBy: 'current generic focus callback; historical first-bad runtime not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`if \(event\.targetId === 'autocomplete-control' \|\| event\.targetId === 'timepicker-control'\) \{\s*this\.store\.patchState\(\{ open: true \}\);`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase action-specific focus/pointer popup state authoring',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: retained applied-theme popup focus states preserve action boundaries',
    evidence: [{ file: 'artifacts/material-parity/tooltip-profile-paint-0a0b5d6-applied.log',
      sha256: 'bc159c1992d928af4ab62df5618f3e81de67d0311d316bb879377dc44df9288f' },
      { file: 'artifacts/material-parity/timepicker-applied-theme-f423ff5.log',
        sha256: '2fb3d0afc48983c7762fa324362355c78d2682c7d41bb046d4602b82419dfe10' }],
    observation: { component: 'tooltip and timepicker', element: 'focused trigger/input', dpr: [1, 2],
      profiles: ['light', 'dark', 'contrast', 'custom'],
      states: ['real Tab', 'pointer hover or field click', 'leave or outside dismissal'],
      property: 'popup presence after Tab', reference: { tooltip: true, timepicker: false },
      astylar: { tooltip: false, timepicker: true },
      population: '12 tooltip desktop/tablet/mobile pairs and8 timepicker desktop/mobile pairs',
      stage: 'application focus callback state before popup layout/paint' },
    justification: 'Applied-theme frozen captures verify actual runtime fields before each action. Tab opens only the native tooltip and only the candidate timepicker; subsequent pointer interactions open both and leave/outside actions dismiss both. Current focus callback opens autocomplete/timepicker without a tooltip focus transition; source-extracted execution preserves datepicker non-opening as a separate control. This is action-specific input/state inequality, not a common displaced-overlay diagnosis or authorization to change datepicker behavior. Hover tooltip anchoring is centered8px below at24px height, but profile raster phases/sharpness remain diagnostic failures. Timepicker inner-input/panel geometry, scrollbar gutter, option selection/padding and thumb-drag limitations remain separate. No all-state paint, current runtime or final parity acceptance follows.',
  }),
  Object.freeze({
    id: 'core-selection-contrast-palette-differs-from-native-default',
    introducedBy: 'current contrast-based highlight policy; historical first-bad runtime and compatibility decision not established',
    file: 'src/app/services/dom/interaction/text-highlight-mesh.factory.ts',
    pattern: String.raw`const DARK_SELECTION = Color3\.FromHexString\('#173f6b'\);`,
    classification: 'suspected-core-renderer-defect',
    owner: 'core selection paint policy and native-platform compatibility contract',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: retained selection states preserve palettes and original geometry failures',
    evidence: [{ file: 'artifacts/material-parity/selection-mobile-profiles-fb18f7b-palette-bound.log',
      sha256: 'f185f3c1c4748e5b2e9d622c80b2d91913014d1ab5a0cac890477ba22e1acc2c' },
      { file: 'artifacts/material-parity/selection-mobile-profiles-fb18f7b-custom.log',
        sha256: 'cbf651ccc0e21e1ac02be4eb54e9f58dba3e6a972a40cf56db2af2f4435776d8' }],
    observation: { component: 'form-field', element: 'form-field-control', dpr: [2],
      profiles: ['light', 'contrast', 'custom'], viewport: { width: 390, height: 844 },
      states: ['typed Atlas', 'forward selection', 'collapsed End', 'backward selection'],
      property: 'selection highlight palette', reference: '46,97,205 with white selected glyphs',
      astylar: '23,63,107 with white selected glyphs',
      stage: 'core contrast-based palette choice; geometry remains separately attributed' },
    justification: 'Retained real-key mobile observations agree on [5,5], [0,3], [5,5], [2,5] endpoints but expose different native/candidate highlight palettes. Seven dependencies per capture include the current core highlight source. Its fixed dark palette and contrast-based choice explain candidate ink policy, not a coordinate error. Existing contrast/custom .01px geometry assertions fail and remain retained; custom inset mismatch is separately application-owned. Classification stays suspected pending the native-platform selection compatibility decision and isolated equal-input paint acceptance; accessibility-driven palette selection may require an explicit documented difference. Observed palette summaries are not retained crop-byte sharpness proof. Other families, native email endpoint limits and full selection/editing behavior remain open. Do not compensate fixture background or weaken geometry thresholds.',
  }),
  Object.freeze({
    id: 'core-svg-dimensionless-image-upload-not-adapted',
    introducedBy: 'current public-package Chrome154 reduction; historical first-bad revision not established',
    file: 'src/app/services/dom/elements/image-resource.service.ts',
    pattern: String.raw`const texture = new Texture\(`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core decoded image GPU-upload adaptation and image readiness/error reporting',
    focusedProof: 'tests/material-parity/icon-asset-input.spec.mjs: retained original SVG upload failure binds public runtime and matched alpha controls',
    evidence: [
      { file: 'artifacts/material-parity/icon-svg-runtime-upload-20261007.log', sha256: '9cba551e122dc41ca7cb01fe80d201ba18799e26f8c628d7f1b22cd34ffd9f53' },
      { file: 'artifacts/material-parity/icon-svg-alpha-controls-20261007.log', sha256: '764a2dfba3828497e65b13bae2fad600fb091aba12f8e40f910ef74c0c0d1231' },
      { file: 'artifacts/material-parity/icon-svg-native-upload-boundary-20261007.log', sha256: 'd08a6efff4c16dcd148ba1b4f5430bcfdb2eccbda8da5fcfe62c95648edb3aac' },
      { file: 'artifacts/material-parity/icon-svg-owner-binding-20261007.log', sha256: '3fad20ad2f518a13036ebd10a3d6197ca9bd4faa53235039ec3d4121e9b17ba2' },
    ],
    observation: { component: 'plugin-free public external SVG image', element: 'original favorite.svg image',
      dpr: [1, 2], states: ['settled 24px and48px image', 'surface disposal'],
      property: 'GPU image upload and transparent corners',
      reference: 'native decoded SVG retains transparent corners',
      astylar: 'texImage2D INVALID_VALUE1281,ready callbacks,empty texture and black image rectangles',
      stage: 'decoded HTMLImageElement to GPU texture upload; before general alpha material paint' },
    justification: 'Matched public-package external SVG inputs at24/48CSSpx andDPR1/2 reproduce black candidate rectangles. Actual runtime HTMLImageElement texImage2D returns1281 through Babylon _prepareWebGLTexture while textures report ready and diagnostics stay empty. Dimensioned SVG and native PNG controls upload and retain alpha; assigning decoded dimensions to the native Image object also makes upload succeed without changing SVG bytes. Complete core loading/alpha methods match current source. This establishes a bounded GPU-boundary adaptation/error-reporting defect,not a general alpha,layout,currentColor or all-SVG claim. Inline SVG remains a separately documented support limitation; the Material fixed-PNG substitution remains unequal authoring. Do not add canonical SVG dimensions or replace vector inputs as a workaround; preserve CSS intrinsic sizing independently of upload adaptation.',
  }),
  Object.freeze({
    id: 'fixture-progress-host-focusability-input-omitted',
    introducedBy: 'current configured source and retained Chrome154 cohort evidence; historical first-bad revision not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`if \(family === 'progress-(?:bar|spinner)'\) return \[\{[^\n]*role: 'progressbar'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase progress host semantic input authoring',
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: retained progress focus caps and update disposal preserve complete configured cohort evidence',
    evidence: [
      { file: 'artifacts/material-parity/progress-configured-input-membership-20261006.log', sha256: 'd64d73bea9a8e7d6ad2640bea3bc6a59c072ae9465f1aa3ca8577c5111fb6684' },
      { file: 'artifacts/material-parity/progress-actual-ax-cohorts-20261007.log', sha256: '88c9b67f0d0dc8267bf7b51d77839e15df74e5a118d3414b6db868813f323d31' },
      { file: 'artifacts/material-parity/progress-programmatic-focus-20261007.log', sha256: 'f896402a1d31e9e14fb6e4382854a140c51f146f1323835e48669fe1ca5176f9' },
    ],
    observation: { component: 'progress-bar/progress-spinner', element: 'progress-bar-primary/progress-spinner-primary',
      states: ['determinate64', 'programmatic focus'], profiles: ['light', 'dark', 'contrast', 'custom'], dpr: [1, 2],
      property: 'host tabindex and programmatic focusability', reference: { tabindex: -1, focusable: true, focusMovesToHost: true },
      astylar: { tabindex: null, focusable: null, focusMovesToHost: false }, stage: 'authored semantic host input before bridge projection' },
    justification: 'All40 configured cases join32 unique physical cohorts. Both sides expose role progressbar,value64,range0-100,empty name/value text and no AX children, but native hosts have tabindex=-1 and focusable=true while candidate entries omit tabindex. Actual focus() moves BODY to the native host and leaves BODY active on every candidate cohort. Current candidate source bytes and semantic bridge bytes authenticate in the registered replay; the bridge explicitly transfers element.tabindex. The first divergence is unequal authored host intent,not missing core focus support or a world-space issue. Restore the reference-equivalent semantic input at the application boundary in later implementation; do not offset graphics or change role to conceal it. Negative tabindex permits programmatic focus but does not imply sequential Tab or keyboard activation. Focus paint,complete AX relationships,remount/isolation and fresh final rendering acceptance remain separate obligations.',
  }),
  Object.freeze({
    id: 'fixture-disabled-radio-tabindex-ignores-disabled-state',
    introducedBy: 'current authored source and retained Chrome154 disabled keyboard evidence; historical first-bad revision not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'radio-team', class: 'radio-option', role: 'radio', tabindex: state\.selected \? 0 : -1`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase radio disabled-state semantic input authoring',
    focusedProof: 'tests/material-parity/input-equivalence-audit.spec.mjs: retained disabled composite focus binds exact current authoring and radio-only Tab divergence',
    evidence: [
      { file: 'artifacts/material-parity/disabled-composite-keyboard-20261007.log', sha256: 'f84ac81c83ee22865d21ef844cf61c153c5ec5d1c916f22108bacc64b13a7f11' },
      { file: 'artifacts/material-parity/disabled-radio-source-applicability-20261007-retry.log', sha256: '3559a0a9640ac38b9cd26476ea52b165a4dae718c0f04d77742dde3dcccb25f1' },
    ],
    observation: { component: 'radio', element: 'radio-team', states: ['disabled selected', 'real Tab', 'Space', 'ArrowLeft'],
      contexts: [{ profile: 'light', viewport: { width: 1440, height: 1000 }, dpr: 1 },
        { profile: 'dark', viewport: { width: 390, height: 844 }, dpr: 2 }],
      property: 'disabled sequential focus contract', reference: 'disabled native radios skip Tab',
      astylar: 'aria-disabled=true with selected radio tabindex=0 receives Tab focus',
      stage: 'authored semantic tabindex before core bridge projection' },
    justification: 'Both full authored component sources exactly match the frozen served source-map contents. In the two retained radio contexts, real Tab focuses radio-team despite aria-disabled=true; native disabled inputs skip Tab. Both sides retain disabled=true and selected=true through Tab/Space/ArrowLeft. Checkbox and slide-toggle negative controls skip Tab in the same contexts and author disabled-aware tabindex=-1. Candidate radio declarations derive tabindex only from selection. This is an unequal authored focus contract,not evidence that core must suppress focus on every aria-disabled widget or a coordinate defect. Later implementation must restore reference-equivalent disabled focus intent at the authoring boundary. Programmatic focus,pointer blocking,enabled activation,other profiles and disabled paint remain separate obligations; no six-context result certifies full radio acceptance.',
  }),
  Object.freeze({
    id: 'fixture-menu-item-dismissal-focus-navigation-and-typeahead-omitted',
    introducedBy: 'current menu actions and Escape-only handler; historical first-bad revision not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`private handleKeydown\(id: string, event: AstylarEvent\): void \{\s*if \(event\.key !== 'Escape' \|\| !this\.store\.state\(\)\.open\) return;`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase menu semantic activation, opening focus, composite navigation and dismissal contract',
    focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: matched menu item keys bind real focus activation and delayed typeahead across eight contexts',
    evidence: [
  {
    "file": "artifacts/material-parity/menu-actions-reset-20261008/latest-report.json",
    "sha256": "6b93af93ca14dedca2e1b64c37d2b1ffac6e203ea37d8265c681b6ffc0acd828"
  },
  {
    "file": "artifacts/material-parity/menu-actions-remaining-20261008/latest-report.json",
    "sha256": "f41bcce117e913caaf956b43848b8b2eedeafd3d4c6792a1da23b0bbb8e33811"
  },
  {
    "file": "artifacts/material-parity/menu-keyboard-remainder-20261008/latest-report.json",
    "sha256": "07f9faa186bbb1e8fa585d7dcc3f30f003f816537ab5a8888bd8cd1310256700"
  },
  {
    "file": "artifacts/material-parity/menu-item-keys-20261008/latest-report.json",
    "sha256": "1d1e7a95abaded574e1fce4bb46ae315bc3e36c935331469407c54f77cf68cba"
  }
],
    observation: { component: 'menu', element: 'menu-primary/menu-rename/menu-delete',
      profiles: ['light', 'dark', 'contrast', 'custom'], dpr: [1, 2],
      viewport: { width: 1440, height: 1000 },
      states: ['pointer item release', 'opening focus', 'ArrowDown/ArrowUp/Home/End', 'Tab dismissal', 'matched-item Enter/Space', 'delayed r typeahead', 'outside reset', 'Escape'],
      property: 'menu focus and item activation/dismissal state transitions',
      reference: 'opening Rename focus, item navigation, item activation and Tab dismissal; delayed label typeahead',
      astylar: 'opening trigger focus, missing navigation and item dismissal, Tab traverses open items, delayed typeahead retains Delete',
      stage: 'unequal application event/state-routing contract before equivalent renderer attribution' },
    justification: 'Checkpoint-bound real pointer and trusted key captures cover eight desktop profile/DPR contexts. Verified outside resets and open preconditions exclude stale state; matched Rename focus excludes trigger activation, and matched Delete focus plus >=500ms real wait exceeds the authenticated CDK200ms default debounce. Native item pointer release/Enter/Space dismisses and restores the trigger while candidate stays open; native navigation/typeahead moves between items and Tab dismisses while candidate does not. Current complete application source and captured handler reductions agree; no direct state mutation, proxy click or tuned layout input was used. Escape and outside reset close both, retained as negative controls. Different preparatory real traversal to reach the same item is disclosed, not normalized away. This extends the interaction-authoring diagnosis to Menu without expanding the older nine-family finding. Restore the reference-equivalent semantic contract through shared supported owners in later implementation; missing supported functionality must remain a core/public-API issue, not a competing plugin system. No mobile, full paint/ripple, collision/root context, lifecycle, historical first-bad or whole-case acceptance claim follows.',
  }),
  Object.freeze({
    id: 'fixture-form-field-hint-description-association-omitted',
    introducedBy: 'current non-error hint authoring; historical first-bad revision not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`family === 'form-field' && !state\.error \? \[\{ type: 'span' as const, id: 'form-field-hint'`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase form-field persistent hint association and semantic comparison coverage',
    focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: configured field hint descriptions preserve sixty-eight omissions and eight error controls',
    evidence: [{ file: 'artifacts/material-parity/form-field-description-input-census-20261009.log',
      sha256: '53e126e1144df19f385adbe97d50fddeb58d997a0a88097430973d27bacb96bb' },
      { file: 'artifacts/material-parity/field-description-cohorts-20261009.log',
        sha256: '51def316df13aae88491126e9003f3d3f934ca2fe971572353ad7cbe26ceee93' }],
    observation: { component: 'form-field', element: 'form-field-control/form-field-hint',
      property: 'authored helper-description association', states: ['static', 'focus', 'hover', 'held', 'activate', 'activate-leave', 'edit-empty-blur', 'disabled'],
      configuredCases: 68, reference: 'aria-describedby resolves to Public label',
      astylar: 'visible Public label without ariaDescribedby on its input',
      actualAx: { observations: 64, contexts: 16, states: ['hint', 'error'],
        profiles: ['light', 'dark', 'contrast', 'custom'],
        viewports: ['desktop DPR1', 'tablet DPR1', 'mobile DPR2', 'desktop DPR2'],
        reference: 'Public label or Project name is required', astylar: 'null',
        producerCommit: '58678793', scope: 'Initial hint/error descriptions only; no editing, live announcements or whole-case acceptance' },
      stage: 'authored semantic relationship before core projection' },
    justification: 'All76 configured form-field pairs and152 original tree receipts authenticate against the unchanged case inventory. In68 non-error cases the reference input describes itself through the captured Public label hint while the candidate renders that hint but omits the control association. Eight error cases remain owned by fixture-field-error-subscript-substitution, not duplicated here. Complete current authored source matches the captured source; the core bridge maps supplied ariaDescribedby, corroborated by the separately observed open-tooltip AX control. First divergence is application input, not a demonstrated core ID-reference defect or coordinate failure. Role/name-only comparisons do not establish description parity. Restore equivalent hint association in later implementation; actual field AX/assistive-technology behavior, live error announcements, paint and whole-case acceptance remain separate.',
  }),
  Object.freeze({
    id: 'fixture-tooltip-persistent-description-association-conditioned-on-popup',
    introducedBy: 'current tooltip ariaDescribedby conditional; historical first-bad revision not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`id: 'tooltip-primary'[^\n]*ariaDescribedby: state\.open \? 'tooltip-popup' : undefined`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase tooltip persistent accessible help association and semantic comparison coverage',
    focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: configured tooltip descriptions preserve closed input omissions and actual AX open controls',
    evidence: [{ file: 'artifacts/material-parity/tooltip-description-physical-20261009.log',
      sha256: 'be63952fe78a6041d1bdf29e7518003ddc86d9b8428279cf81a47a9bf89d437f' },
      { file: 'artifacts/material-parity/tooltip-description-theme-verified-20261009.log',
        sha256: 'ca977ea5a951fdd8300f65c733464b20915de8b9275bc3ed9289300b96e02626' }],
    observation: { component: 'tooltip', element: 'tooltip-primary', property: 'persistent accessible description',
      configuredCases: 62, closedInputOmissions: 36, openInputControls: 26,
      physicalContexts: ['light desktop DPR1', 'default-light mobile DPR2 (requested dark)'], states: ['closed', 'hover', 'leave'],
      themeVerifiedAx: { observations: 12, contexts: ['light desktop DPR1', 'dark mobile DPR2'],
        states: ['closed', 'hover', 'leave'], setup: 'Explicit existing showcase:theme command with actual theme/background verification',
        scope: 'Ordinary-mode accessible descriptions only; original default-light evidence retained, not upgraded to dark paint/lifetime acceptance' },
      reference: 'Create a project description persists independently of visible popup',
      astylar: 'description is null/Create a project/null across closed/hover/leave',
      stage: 'conditional authored relationship before core ID-reference projection' },
    justification: 'Exact62 configured IDs and124 original tree receipts preserve native described-by in every state versus candidate association only in26 popup-present states and absence in36 closed states. Original visible trees exclude native hidden description targets; their omission alone is not a dangling-reference diagnosis. Twelve actual CDP observations in two checkpoint-bound physical contexts establish persistent native Create a project help versus candidate null/open/null, with matching button name/role. Successful candidate open association is a positive control for supplied core ID-reference mapping. Current application source conditions both relationship and description node on popup visibility, the first divergence before projection. This is distinct from tooltip focus-opening, connected placement, blur and lifecycle findings. Restore equivalent persistent help intent in later implementation through shared supported owners; no all-profile AX, assistive-technology, current paint or whole-case acceptance follows.',
  }),
  Object.freeze({
    id: 'core-box-sizing-omission-violates-content-box-default',
    introducedBy: 'fb1553ff adds explicit content-box support while preserving the preexisting border-box omission behavior; not demonstrated as a recent Material compensation',
    file: 'src/app/services/dom/elements/element-dimension.service.ts',
    pattern: String.raw`if \(style\?\.boxSizing === 'content-box'\)`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core CSS initial-value resolution and declared box dimension calculation',
    focusedProof: 'scripts/audit-public-box-sizing-default.mjs --verify artifacts/material-parity/public-box-sizing-default-20261011',
    evidence: [{ file: 'artifacts/material-parity/public-box-sizing-default-20261011/latest-report.json', sha256: '80902a405169922298f4b7edfc6b59b3b3cee4d07e552b2be95f1db011aac215' }],
    observation: { component: 'public div reduction', element: 'box0', states: ['fresh mount'],
      contexts: [{ viewport: { width: 400, height: 400 }, dpr: 1 }, { viewport: { width: 400, height: 400 }, dpr: 2 }],
      property: 'boxSizing initial value and painted border-box extent',
      reference: 'omitted and explicit content-box:166x76; explicit border-box:140x50',
      astylar: 'omitted:140x50; explicit content-box:166x76; explicit border-box:140x50',
      stage: 'omitted initial value reaches CSS-space sizing before final projection' },
    justification: 'The capability manifests document content-box as default, but global/type defaults omit boxSizing and calculateDimensions adds padding/border outside declared dimensions only for explicit content-box. Package-root WebGL reduction with identical width140/height50/padding10/border3 inputs exposes the omission difference at DPR1/2; exact authored-color pixels and native boxes agree for both explicit controls. Installed sizing/default/style-resolution methods match current source. The retained verifier authenticates dependency/PNG receipts, paired inputs and missing-DPR/altered-input rejection controls. This is a bounded core default-contract defect, not a projection-scale diagnosis or whole-Material acceptance. Native Material parent explicit border-box versus candidate omission remains a separate unequal author request. Correct the general default rule before reassessing inputs; do not retune fixture dimensions to preserve legacy pixels.',
  }),
  Object.freeze({
    id: 'core-semantic-descendant-replacement-loses-retained-focus',
    introducedBy: 'current light mobile runtime provenance; first-bad revision not established',
    file: 'src/lib/astylar-semantic-bridge.ts',
    pattern: String.raw`if \(childrenChanged\) node\.replaceChildren\(\.\.\.childNodes\);`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core semantic descendant reconciliation and retained focus continuity',
    rootReconciliation: {
      classification: 'confirmed-core-renderer-defect',
      owner: 'core semantic root reconciliation and retained focus continuity',
      focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: retained public unchanged-root updates preserve semantic focus failure at both DPRs',
      evidence: [
        { file: 'artifacts/material-parity/public-semantic-root-noop-20261015/latest-report.json', sha256: '841cf391e108c943dce2593da5b6ff7fb5430f307da1be9229252723c9ac5a48' },
        { file: 'artifacts/material-parity/configured-input-editing-focus-owner-20261015.log', sha256: '5e057771a6a88ac246ff7d51fcd25e6fbf76a4205ba0c5267398c1a22b8ee004' },
        { file: 'artifacts/material-parity/configured-input-editing-focus-owner-binding-20261015.log', sha256: '3c7b72f5a3b62b06a26c18c5b5f53e0fe7305061463fffea087782b45a122607' },
        { file: 'artifacts/material-parity/semantic-root-focus-source-history-20261015.log', sha256: '4082833c6b3082b3fcfc62d56e0074eb49336d979bdf649900b296ac032e5ab4' },
      ],
      observation: 'Four public candidate no-op updates at DPR1/2 blur/refocus the same connected input inside root reconcile; four native no-op controls preserve focus without events. Root child identities/order and input value remain unchanged.',
      configuredScope: 'Root first-blur attribution is independently measured only for light desktop DPR1 form-field/input deletion; the other fourteen configured editing contexts establish transient focus loss but not its precise owner.',
      firstDivergence: 'unconditional semantic root replaceChildren before syncFocus, not Babylon projection or Material plugin authoring',
      sourceHistory: '0175a0bd introduces the root call; 547fd6d8 adds the unchanged-child guard only to descendant reconciliation. These are source-history receipts, not first-bad runtime executions.',
      recommendation: 'Preserve focus continuity at both root and descendant reconciliation boundaries; do not suppress events or add application refocus workarounds.',
      boundary: 'Focus continuity only; no synchronized selection-loss, paint, all-profile, lifetime, historical runtime or whole-case acceptance claim.',
    },
    focusedProof: 'tests/material-parity/input-boundary-evidence.spec.mjs: semantic descendant replacement focus evidence retains exact current case and source applicability',
    evidence: [
      { file: 'artifacts/material-parity/timepicker-focus-provenance-20261011.log', sha256: '55c6babc6e23292c9cf05983fb78c22daf312ff841d60966dfb55b5ff74fe6ae' },
      { file: 'artifacts/material-parity/public-semantic-focus-keyboard-selection-verified-20261011.log', sha256: '7db45603d4764a63001700012f045a30658be86c5a3a12082129e0ccb7a7b594' },
    ],
    observation: { component: 'timepicker', element: 'timepicker-control',
      case: { kind: 'interaction', family: 'timepicker', profile: 'light', viewport: { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 }, state: 'open-dismiss' },
      states: ['opened', 'Escape-closed'], cycles: 3,
      property: 'retained semantic input focus event continuity', reference: 'Escape keydown/keyup without focus transitions',
      astylar: 'focusout inside descendant replaceChildren, then focusin through syncFocus',
      stage: 'semantic reconciliation before focus restoration' },
    justification: 'Six current light mobile DPR2 opening/closed boundaries locate the first blur synchronously inside semantic reconcileElement.replaceChildren; the input remains connected. Root replacement occurs later with focus already lost, and syncFocus restores it. Exact served/current owning methods agree. State callbacks trigger reflow but do not directly cause the observed blur. The independent package-root sibling add/remove reduction confirms the same first blur without Material plugins: four native updates preserve focus without events; four candidate updates blur inside descendant replacement and restore focus. A real-keyboard selection control preserves synchronized endpoints1/3 on both sides, while candidate focusout ends on CANVAS under the existing keepCanvasFocus policy. Direct-DOM selection reset is not a demonstrated synchronized-selection-loss defect. Preserve focused descendants through changed child lists rather than suppressing events or patching application focus. This is a bounded confirmed core focus continuity defect, distinct from caret material lifetime. Other profiles, real Tab/assistive-technology continuity, historical first-bad revision and whole-case parity remain unproven.',
  }),
  Object.freeze({
    id: 'core-caret-height-rule-is-font-insensitive',
    introducedBy: 'current and installed owning method plus retained October14 equal-input font contrast; first-bad revision not established',
    file: 'src/app/services/text/text-selection.service.ts',
    pattern: String.raw`projection\.projectCssSize\(\{ width: 2, height: style\.fontSize \* 1\.2 \}\)`,
    classification: 'suspected-core-renderer-defect',
    owner: 'core CSS-space caret sizing in TextSelectionService.createTextCursor before final projection',
    focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: equal-input caret font contrast preserves bounded source and recorded paint failure',
    evidence: [
      { file: 'artifacts/material-parity/public-caret-full-stage-color-isolated-diagnostic-20261014.log', sha256: '62b92fca4f21f4b9b5456499efb0a3c454792d27808c2dde0e7ed714ffc8e67a' },
      { file: 'artifacts/material-parity/public-caret-font-family-height-contrast-20261014-retry.log', sha256: 'a2b89a2486a88bfc1c6d8d6f4c81591901e7ec57ec20132217b3f631f81bec4e' },
    ],
    observation: { component: 'public equal-input text input reduction', element: 'audit-empty', variant: 'placeholder-keyboard',
      states: ['focused-empty', 'typed-then-deleted-empty'], fontFamilies: ['Arial', 'monospace'], dpr: [1, 2],
      property: 'font response of requested CSS caret height and exact-RGB stroke band',
      reference: 'retained full-stage exact-RGB band height:Arial17CSSpx versus monospace19CSSpx at both DPRs',
      astylar: 'fontsize16 requests19.2CSSpx for either family; recorded candidate bands remain identical across fonts,18CSSpx atDPR1/19CSSpx atDPR2',
      stage: 'candidate sizing rule before projectCssSize; native logical metrics and complete raster footprint remain unproved' },
    justification: 'Both public diagnostic variants preserve original SiteData equality,actions and assertions; only shared font-family and full-native-stage output reporting differ. Original source/executed hashes,distinct bundle hashes,2515 dependency aggregate and complete current/emitted/installed cursor method are authenticated by the retained regression. Native exact-RGB height responds to the font contrast while candidate bounds do not; candidate sizing reads only fontsize and multiplies by1.2 before projection. This identifies a bounded paint mismatch and a plausible font-insensitive sizing owner,not a confirmed universal height law or the exact native logical caret geometry. Original pixels were in-memory and are not independently replayable PNGs;native chosen font,full AA footprint,clipping/blending contribution and correct replacement metrics remain explicit uncertainties. Resolve those at the general caret owner before implementing a metric rule;do not add font/profile/DPR-specific fixture offsets or retune Material labels. Other Material inputs,font stacks,caret colour,selection blink,placement and lifetime remain separate findings and final acceptance obligations.',
  }),
  Object.freeze({
    id: 'core-flex-margin-font-relative-units-parse-as-pixels',
    introducedBy: 'current and installed owner binding plus two fresh public equal-input runs; first-bad revision not established',
    file: 'src/app/services/dom/elements/flex.service.ts',
    pattern: String.raw`const margin = this\.parseMargin\(style\?\.margin\)`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'core FlexService CSS-space font-relative margin used-length resolution',
    focusedProof: 'tests/material-parity/benchmark-config.spec.mjs: public equal-input flex em margins preserve exact failure and block pixel controls',
    evidence: [
      { file: 'artifacts/material-parity/public-relative-margin-20261015/latest-report.json', sha256: 'ac83b117088eaa09117d9ddead286d77a913b6c1201830e445af06a75d8e81da' },
      { file: 'artifacts/material-parity/public-relative-margin-repeat-20261015/latest-report.json', sha256: 'ac83b117088eaa09117d9ddead286d77a913b6c1201830e445af06a75d8e81da' },
      { file: 'artifacts/material-parity/public-relative-margin-owner-binding-20261015.log', sha256: 'ac2b356d74062bfd7e06d9ca8ee1062e3ff2660b601ec45aa1eae9e51d358012' },
    ],
    observation: { component: 'public equal-input non-text flex/block reduction', element: 'child',
      states: ['initial-settled'], fontSizes: [16, 24], requestedDpr: [1, 2], property: 'margin:1em 0 used vertical offset',
      reference: 'padded-parent child offset36/44CSSpx for16/24px own font',
      astylar: 'flex child offset21CSSpx for either font;block-em and all explicit-pixel controls agree',
      stage: 'FlexService.parseMarginBox/parseMargin drops units before final projection;retained PNG bounds corroborate projected geometry' },
    justification: 'Two fresh public-package runs each preserve16 paired identical-input trials and32 screenshot receipts. Four block-em and eight explicit-pixel controls agree;all four flex-em trials are15/23CSSpx too high,consistent with margin1 instead of16/24. Relevant complete emitted method bodies and parameter names bind current source to the installed bundle inputs. Flex flow passes the raw resolved margin to parseFloat-based helpers;ordinary block creation uses a separate own-font-aware helper and passes. Share computed CSS length/font resolution at the owning layout boundary rather than replacing fixture em margins with pixels. This does not establish inherited-font,percent,positioned,update or lifetime behavior,or attribute Material absolute paragraph wrappers to this flex-flow reduction. The dimension parser also drops units in isolation,but that alone does not prove every caller fails.',
  }),
  Object.freeze({
    "id": "fixture-checkbox-checkmark-path-substitution",
    "introducedBy": "db8f7432 fixed-path predecessor;5b74d1b3 coefficient/polarity rework;e4ca3db4 CSS-point helper boundary;first-bad runtime not established",
    "file": "examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts",
    "pattern": "export function materialCheckMarkPath\\(",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material showcase checkmark plugin authored SVG/path request boundary",
    "focusedProof": "tests/material-parity/input-boundary-evidence.spec.mjs: retained checkbox checkmark requests bind SVG units and disabled ink before projection",
    "observation": {
      "component": "checkbox",
      "cases": 68,
      "selectedMarks": 52,
      "reference": {
        "viewBox": "0 0 24 24",
        "viewportCss": "14px",
        "path": "M1.73,12.91 8.1,19.28 22.79,4.59",
        "strokeUserUnits": 3.12,
        "strokeCss": 1.82
      },
      "astylar": {
        "viewportCss": "14px",
        "fixedCssPoints": [
          [
            -5.5,
            0.4
          ],
          [
            -1.8,
            3.2
          ],
          [
            5.5,
            -4.2
          ]
        ],
        "strokeCss": 1.8
      },
      "stage": "Different authored path/viewport interpretation before final CSS-to-render projection"
    },
    "justification": "All68 retained checkbox pairs authenticate,with52 selected marks and matching selection flags. Both mark boxes are14CSSpx. The native24-unit SVG maps its3.12-unit stroke to1.82CSSpx,not3.12CSSpx. Its centerline differs from the current fixed plugin points,including a1.149CSSpx bend delta. Current plugin geometry therefore does not preserve the original SVG request. The helper returns CSS points and current rendering uses the shared final conversion;these unequal inputs do not demonstrate a current core coordinate defect.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts",
        "sha256": "dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e"
      },
      {
        "file": "tests/material-parity/input-boundary-evidence.spec.mjs",
        "sha256": "58fe244dc56a251e144dcc6eab2c36cb18f017291da968e1d002dc36404d60ea"
      },
      {
        "file": "artifacts/material-parity/checkbox-checkmark-retained-inputs-20261020.log",
        "sha256": "30ff029a6f116c88e63027b960391e6e08bbaf6ddf3a89c305506cb43a18b8c4"
      },
      {
        "file": "artifacts/material-parity/queued-control-source-history-20261020.log",
        "sha256": "57f539672cfb6f82ed05f8c3141d866d0a7518fda7b6bb5756dbea60e41093a3"
      },
      {
        "file": "artifacts/material-parity/queued-control-owning-20261020.log",
        "sha256": "aac72a08875827648bb454200a4ee1a30ff082fa703f2edd55c72f6c9addbaf4"
      }
    ],
    "recommendation": "Preserve the original SVG path,viewBox,stroke and visibility inputs through a legitimate generic paint/plugin boundary before testing residual equal-input renderer behavior. Do not tune a new set of checkmark points to imitate a screenshot or move layout into Babylon space.",
    "boundary": "Retained requests and current source-only centerlines. Not captured historical mesh points,cap/join raster,current output parity,world-conversion failure,all symbol consumers or whole-case acceptance."
  }),
  Object.freeze({
    "id": "fixture-checkbox-disabled-checkmark-ink-substitution",
    "introducedBy": "7159b1d5 already chooses checkbox onPrimary;fc45b58b extends the color branch to step completion;first-bad runtime not established",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "const color = extraClass === 'checkbox-mark'",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material showcase disabled checkbox checkmark token authoring",
    "focusedProof": "tests/material-parity/input-boundary-evidence.spec.mjs: retained checkbox checkmark requests bind SVG units and disabled ink before projection",
    "observation": {
      "component": "checkbox",
      "selectedDisabledCases": 8,
      "unequalRgbRequests": 6,
      "reference": "Active --mat-checkbox-disabled-selected-checkmark-color with surface fallback",
      "astylar": "Unconditional theme.onPrimary in selectionMark",
      "stage": "Authored token selection before compositing or projection"
    },
    "justification": "All eight selected disabled retained contexts bind active native disabled-checkmark declarations to computed ink and candidate authored mark data. Six RGB requests differ across light,dark and custom profiles;the two contrast requests agree. The helper never tests disabled state and chooses onPrimary for checkbox marks. Inactive forced-colors rules are retained and explicitly excluded from this active-rule comparison,not changed or claimed tested. This is a state-token input substitution,not evidence that core alpha conversion or compositing is wrong.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "tests/material-parity/input-boundary-evidence.spec.mjs",
        "sha256": "58fe244dc56a251e144dcc6eab2c36cb18f017291da968e1d002dc36404d60ea"
      },
      {
        "file": "artifacts/material-parity/checkbox-checkmark-retained-inputs-20261020.log",
        "sha256": "30ff029a6f116c88e63027b960391e6e08bbaf6ddf3a89c305506cb43a18b8c4"
      },
      {
        "file": "artifacts/material-parity/checkbox-disabled-checkmark-token-20261020.log",
        "sha256": "1750461e2aafd8b9b6100799d3c81267e04be242d70f14cdf02d92f389a2b41f"
      },
      {
        "file": "artifacts/material-parity/queued-control-source-history-20261020.log",
        "sha256": "57f539672cfb6f82ed05f8c3141d866d0a7518fda7b6bb5756dbea60e41093a3"
      },
      {
        "file": "artifacts/material-parity/queued-control-owning-20261020.log",
        "sha256": "aac72a08875827648bb454200a4ee1a30ff082fa703f2edd55c72f6c9addbaf4"
      }
    ],
    "recommendation": "Restore the actual disabled-selected checkmark token intent for the original Material composition. Then investigate residual equal-input paint without sampled-color overrides,opacity compensation or a global core theme special case.",
    "boundary": "Eight retained selected-disabled input requests and active declarations only. Not forced-colors runtime,composited/current pixels,cap/join behavior,other checkbox states or whole-case acceptance."
  }),
  Object.freeze({
    "id": "fixture-checkbox-disabled-native-primitive-substitution",
    "introducedBy": "c47d589a explicit role-DIV checkbox branch;first-bad runtime not established",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "type: 'div', id: 'checkbox-primary', role: 'checkbox'",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material showcase checkbox authored native-disabled control contract",
    "focusedProof": "tests/material-parity/input-boundary-evidence.spec.mjs: disabled checkbox native role control isolates focusability from the renderer",
    "observation": {
      "component": "checkbox",
      "runtimePairs": 1,
      "context": "Frozen light desktop DPR1 disabled selected state",
      "reference": "Native disabled INPUT with tabindex -1 rejects programmatic focus",
      "astylar": "Role checkbox DIV with aria-disabled true and tabindex -1 accepts focus",
      "nativeControl": "Ordinary HTML with candidate role-DIV attributes reproduces the candidate projection and focus",
      "stage": "Unequal authored primitive and disabled contract before renderer focus handling"
    },
    "justification": "The exact browser AX/focus pair reports disabled on both sides but different focusability. A separate ordinary HTML DIV with the same role,tabindex,name,checked and aria-disabled attributes reproduces the candidate logical projection and focus without Astylar. Thus the observed disabled-focus mismatch is already explained by the custom role-DIV contract versus a native disabled input;it is not evidence of a core focus defect. The factory currently authors that role-DIV branch.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "tests/material-parity/input-boundary-evidence.spec.mjs",
        "sha256": "58fe244dc56a251e144dcc6eab2c36cb18f017291da968e1d002dc36404d60ea"
      },
      {
        "file": "artifacts/material-parity/checkbox-disabled-ax-focus-probe-20261020.log",
        "sha256": "a0ca85fd1d76dbff03b293bf2a914b42120ca3a08d6d5f6da07fb17159135438"
      },
      {
        "file": "artifacts/material-parity/checkbox-disabled-native-role-control-20261020.log",
        "sha256": "8bae9a4ee17b7ad676aabe98ebc91169fe7af9671c435b9dde6b471c1ad791e8"
      },
      {
        "file": "artifacts/material-parity/queued-control-source-history-20261020.log",
        "sha256": "57f539672cfb6f82ed05f8c3141d866d0a7518fda7b6bb5756dbea60e41093a3"
      },
      {
        "file": "artifacts/material-parity/queued-control-owning-20261020.log",
        "sha256": "aac72a08875827648bb454200a4ee1a30ff082fa703f2edd55c72f6c9addbaf4"
      }
    ],
    "recommendation": "Preserve the original native-disabled checkbox control intent and composition in authoring. If public API support is missing,reduce that as a support/public-API gap. Do not globally suppress programmatic focus for every aria-disabled DIV or treat tabindex -1 as equivalent to native disabled.",
    "boundary": "One pinned browser AX/programmatic-focus pair and native role-DIV control. Not all disabled profiles,pointer/keyboard activation,full AX relationships,form serialization,AT,paint,current full-runtime or case acceptance."
  }),
  Object.freeze({
    "id": "fixture-select-listbox-name-omission",
    "introducedBy": "2f440115 unnamed select-options listbox branch already present;first-bad runtime not established",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "id: 'select-options', class: 'select-popup', role: 'listbox'",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material showcase select overlay authored accessible-name contract",
    "focusedProof": "tests/material-parity/input-boundary-evidence.spec.mjs: retained select listbox naming omission precedes the queried browser AX targets",
    "observation": {
      "component": "select",
      "retainedInputCases": 40,
      "actualAxPairs": 1,
      "reference": "Native controlled listbox explicitly requests aria-label Plan",
      "astylar": "select-options role listbox omits ariaLabel/ariaLabelledby and corresponding aliases",
      "stage": "Accessible-name input omitted before semantic bridge/AX name computation"
    },
    "justification": "All40 retained active-option select contexts bind an explicitly named native Plan listbox to a candidate authored listbox with no naming property. The current factory likewise omits it. One frozen pointer-open actual AX pair resolves both controls and active-descendant relations to their actual backend targets and confirms Plan versus an empty controlled-listbox name. That rules out a namespace-target explanation in this pair and locates the first naming divergence in authoring,not an invented core naming failure.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "tests/material-parity/input-boundary-evidence.spec.mjs",
        "sha256": "58fe244dc56a251e144dcc6eab2c36cb18f017291da968e1d002dc36404d60ea"
      },
      {
        "file": "artifacts/material-parity/select-listbox-name-inputs-20261020.log",
        "sha256": "7351677374f8515257904ee3620484ed84fa0d30880b46299204eafb19cf4833"
      },
      {
        "file": "artifacts/material-parity/retained-active-option-input-targets-20261020.log",
        "sha256": "162a3754ad10427a6341b9d2fd7144f7c9164424d7389101e2a3ade1ace1042b"
      },
      {
        "file": "artifacts/material-parity/select-open-ax-target-resolution-20261020.log",
        "sha256": "a673c563a91f47eca0e5687cb499bb84cfc0ece693f43eef715b5017bfecd27d"
      },
      {
        "file": "artifacts/material-parity/queued-control-source-history-20261020.log",
        "sha256": "57f539672cfb6f82ed05f8c3141d866d0a7518fda7b6bb5756dbea60e41093a3"
      },
      {
        "file": "artifacts/material-parity/queued-control-owning-20261020.log",
        "sha256": "aac72a08875827648bb454200a4ee1a30ff082fa703f2edd55c72f6c9addbaf4"
      }
    ],
    "recommendation": "Preserve the original listbox naming inputs through the public authoring API,then retest actual AX relationships. Do not make core invent a label from the parent combobox or claim complete AX equivalence from matching queried targets.",
    "boundary": "40 retained authored input pairs and one queried actual AX relation pair only. Not all94 select cases,all generated/exposed AX nodes,AT,full role behavior,focus lifetime,current all-profile rendering or case acceptance."
  }),
  Object.freeze({
    "id": "fixture-shared-button-touch-descendant-omission",
    "introducedBy": "2f440115740ff76fa9e55b3f4a11568207b2af5a and current source each retain nine childless shared button constructors;no intermediate-history or compensation-motive claim",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "class: 'material-button', value: label \\}",
    "classification": "application-plugin-authoring-defect",
    "owner": "showcase shared Material button descendant and hit-target authoring",
    "justification": "Exactly600 retained owners in480 cases across core,button,menu,bottom-sheet,dialog,snack-bar and tooltip have a native48px touch-span descendant but no authored candidate child. Preserve suppression:276 visible pointer-enabled requests,294 display-none and30 pointer-events-none;these are not600 live activation tests. Native matched rules retain top50% and translateY(-50%). One fresh primary-button pair shows native outside-host activation versus candidate container clicks. Package-root equal-input controls support descendant hit testing,but the actual centered percentage transform exposes the existing documented unit-loss limitation;literal-pixel controls pass across DPR1/2 and translated surfaces. First input divergence is authored descendant omission;repair the shared core percentage-reference semantics before restoring native structure/CSS. Never ship the diagnostic fixed-position or literal-pixel variants as fixture compensation. Initial/current constructors and36 factory outputs bind current authoring;this does not prove every historical revision,motive,all controls or full current rendering.",
    "focusedProof": "scripts/audit-material-button-touch-inputs.mjs:600 exact native/candidate owners and1200 rejection controls; scripts/audit-public-button-touch-target.mjs:full failing centered-percentage matrix and passing plain/literal controls"
  }),
  Object.freeze({
    "id": "core-native-checkable-form-value-synthesizes-visible-label",
    "introducedBy": "Present in current source and both authenticated installed-package captures; introduction revision and compensation motive not established",
    "file": "src/app/services/dom/input/checkbox.manager.ts",
    "pattern": "const textContent = input\\.value \\|\\| 'Option';",
    "classification": "confirmed-core-renderer-defect",
    "owner": "CheckboxManager native checkbox/radio label construction before text rasterization and projection",
    "focusedProof": "node scripts/check-public-native-checkable-value.mjs",
    "observation": {
      "component": [
        "checkbox",
        "radio"
      ],
      "state": "unchecked,enabled,appearance:none,no textContent",
      "property": "value",
      "reference": "Form value changes no rendered pixels",
      "astylar": "value:VALUEONLY creates a visible label_target mesh and text pixels",
      "stage": "createCheckbox/createRadioButton request createLabelMesh;createLabelMesh substitutes input.value for visible text"
    },
    "justification": "Two package-root equal-input runs independently verify16 captures each atDPR1/2. Changing only omitted value to VALUEONLY changes zero reference pixels but580/1903 candidate pixels for both kinds in each run. Current TS,installed JS and both actual bundles bind all three complete owning methods after explicit compiler-only transformations. Label metadata corroborates the pixels;all2517 bundle dependencies per run authenticate. This is not a cursor,coordinate or text-measurement diagnosis and does not depend on replacing Material role-DIV authoring.",
    "publicReproduction": {
      "verificationCommand": "node scripts/check-public-native-checkable-value.mjs",
      "captureCommand": "node scripts/audit-public-native-checkable-value.mjs --output=artifacts/material-parity/NEW-UNUSED-DIRECTORY",
      "expectedCaptureExit": 1,
      "runs": 2,
      "capturesPerRun": 16,
      "renderingFailuresPerRun": 4,
      "semanticDriftControls": 4,
      "currentRenderingAccepted": false
    },
    "evidence": [
      {
        "file": "src/app/services/dom/input/checkbox.manager.ts",
        "sha256": "e12976121d07bd5cd622b055352d981dd0ee4dd2874590bd85fde10219ec81f9"
      },
      {
        "file": "scripts/audit-public-native-checkable-value.mjs",
        "sha256": "ef9ca206889593a6c09b81c6221c565ad8058c98f957512db21d3899fc703950"
      },
      {
        "file": "scripts/check-public-native-checkable-value.mjs",
        "sha256": "7f3ff2c868ce9dc6c5eb52ce28f1e5f66db2fcd96e1bfb29bc743c72eb6998fc"
      },
      {
        "file": "scripts/review-native-checkable-value.mjs",
        "sha256": "4f12176d582b88649b42e78ec2711307290f797657b43068e39712916108cced"
      },
      {
        "file": "examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/input/checkbox.manager.js",
        "sha256": "f093316c5d621522710a4fc21bad7265eee731bf454ab354750fade0126e0f1f"
      },
      {
        "file": "artifacts/material-parity/native-checkable-value-independent-20261021.log",
        "sha256": "c4063322fca0929612e744fa43ff35f316a669b4e7c5b8b5828a4802b450c46d"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-20261021/latest-report.json",
        "sha256": "46df9f4b9b515cf2e4b043d526af98e4aeedf85c18791735d0adfc3082dc738b"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-20261021/provenance.json",
        "sha256": "9826d50da26bb9b022cd4bc134ca7f63dbac2e551bce162942d88131f0334c08"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-20261021/audit.js",
        "sha256": "6416f9e90da4c7127cef7f8f8f69c71da3718cd3481bac9cbec84760f73eeaa1"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-20261021/producer.mjs",
        "sha256": "ef9ca206889593a6c09b81c6221c565ad8058c98f957512db21d3899fc703950"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-20261021/failure.json",
        "sha256": "15bdb2ba906a0ee168b723cc02a4847840f6bc39eb60175458cf1acb468341bf"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-repeat-20261021/latest-report.json",
        "sha256": "46df9f4b9b515cf2e4b043d526af98e4aeedf85c18791735d0adfc3082dc738b"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-repeat-20261021/provenance.json",
        "sha256": "9826d50da26bb9b022cd4bc134ca7f63dbac2e551bce162942d88131f0334c08"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-repeat-20261021/audit.js",
        "sha256": "6416f9e90da4c7127cef7f8f8f69c71da3718cd3481bac9cbec84760f73eeaa1"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-repeat-20261021/producer.mjs",
        "sha256": "ef9ca206889593a6c09b81c6221c565ad8058c98f957512db21d3899fc703950"
      },
      {
        "file": "artifacts/material-parity/public-native-checkable-value-repeat-20261021/failure.json",
        "sha256": "15bdb2ba906a0ee168b723cc02a4847840f6bc39eb60175458cf1acb468341bf"
      }
    ],
    "recommendation": "Separate native checkbox/radio form value from explicit associated label content at the core construction boundary. Preserve submitted value and label/AX contracts;then prove explicit label and no-label controls. Do not remove values or replace native controls with role-DIV composites to hide this defect.",
    "boundary": "Unchecked enabled minimal public inputs only. Does not establish full native/Material paint,checked/disabled behavior,AX associations,activation,event order,animation,all case closure or historical compensation motive. Existing button value-label typography instrumentation and showcase radio Space/structure findings remain distinct."
  }),
  Object.freeze({
    "id": "fixture-radio-ring-state-paint-token-substitution",
    "introducedBy": "Initial2f440115 and laterf3c8254c both retain the base/selected token substitution;not every revision or compensation motive",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "selector: '\\.radio-ring',",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material showcase radio state/theme border-color and disabled circle-opacity authoring",
    "focusedProof": "node scripts/check-radio-ring-inputs.mjs; node scripts/review-radio-ring-inputs.mjs",
    "observation": {
      "component": "radio",
      "owners": 136,
      "cases": 68,
      "colorDifferences": 60,
      "opacityDifferences": 16,
      "enabledUnselectedColorDifferences": 52,
      "disabledSelectedColorDifferences": 8,
      "stage": "Original native matched component rules and computed paint requests differ before candidate rendering"
    },
    "justification": "All136 rings map four native border sides to the candidate ring.52 enabled-unselected and8 disabled-selected color inputs differ;all16 disabled own-opacity inputs differ(.38 versus1).60 enabled-selected colors agree. Native active rules distinguish component unselected,hover,focus,selected and disabled tokens;current candidate uses onSurface base and primary selected without disabled ring opacity. Existing complete current-authoring applicability binds all68 source subtrees/styles. Two exact historical files preserve these color choices despite dot/layout changes. This is unequal requested paint,not proof that core misrenders equal color/opacity inputs.",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "rules": [
          "{ selector: '.radio-ring', position: 'relative', width: '20px', height: '20px', boxSizing: 'border-box', borderWidth: '2px', borderStyle: 'solid', borderColor: theme.onSurface, borderRadius: '10px' },",
          "{ selector: '.radio-ring.selected', borderColor: theme.primary },",
          "{ selector: '.radio-dot', position: 'absolute', top: '3px', left: '3px', width: '10px', height: '10px', borderRadius: '5px', background: theme.primary },"
        ]
      },
      {
        "revision": "f3c8254c2aa63197c03e0fb2bd43cc98c0e57fed",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "944417c135e7f917f88ff9772096d2b527b47c1c9911369bcecef71ed540d94c",
        "rules": [
          "{ selector: '.radio-ring', position: 'relative', zIndex: '2', width: '20px', height: '20px', boxSizing: 'border-box', borderWidth: '2px', borderStyle: 'solid', borderColor: theme.onSurface, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },",
          "{ selector: '.radio-ring.selected', borderColor: theme.primary },",
          "{ selector: '.radio-dot', width: '10px', height: '10px', flexShrink: '0', borderRadius: '5px', background: theme.primary },"
        ]
      }
    ],
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "scripts/check-radio-ring-inputs.mjs",
        "sha256": "fae0f09d82707a929e24ee424fbbaf7fd5bf53ddb0f38d91a823e6832330fba2"
      },
      {
        "file": "scripts/review-radio-ring-inputs.mjs",
        "sha256": "fc25c9dd753358e7243f35ad883a3eb77e7d64044f32ff33985de73248a83968"
      },
      {
        "file": "artifacts/material-parity/radio-ring-inputs-20261021.log",
        "sha256": "213e5605f47fe813e0bd029ecf9372e2ffc08ec4de71d61d4d4ea6f0d42bc84b"
      },
      {
        "file": "artifacts/material-parity/radio-descendant-inputs-20261021.log",
        "sha256": "aa8c59ff5c9e751bb0ff0b2f391e43d57409ef6bf0d32bd7f2daa4fcd3e0b355"
      },
      {
        "file": "artifacts/material-parity/radio-authoring-applicability-20261021.log",
        "sha256": "a88213f0b0b55320e75b092d2eed3596fdfae36148b16a2fb3c9b3f0385ac2eb"
      },
      {
        "file": "artifacts/material-parity/working-audit/proposals/22dfe00b8db5f815fb460847c2bdc39e8d60d8e54222266b5d7dc85cadaeb7b7.json",
        "sha256": "d72fda1fb78957bb1d1dfe832312fa25dffe75933825fb33e3b7443ed0a23a24"
      }
    ],
    "recommendation": "Restore original component state/theme paint requests with original structure/CSS before evaluating core paint. Preserve disabled circle opacity separately from label opacity and selected/unselected/hover/focus tokens. Do not tune sampled colors or opacity to imitate a screenshot.",
    "boundary": "Four-side requested color and own opacity only. Ancestor compositing,inner-dot scale equivalence,animated ripple paint,actual pixels,AX,activation and complete current case rendering remain open. Distinct from disabled-label ink and native form-value label synthesis. Historical source snapshots do not establish motive or a first-bad runtime revision."
  }),
  Object.freeze({
    "id": "fixture-showcase-outer-and-semantic-page-duplicate-main-landmarks",
    "introducedBy": "Initial2f440115 authors both MAIN inputs;actual duplicate AX exposure verified only in pinned October20 build,not initial runtime",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "type: 'main', id: 'page'",
    "classification": "application-plugin-authoring-defect",
    "owner": "showcase host wrapper versus SiteData page landmark ownership",
    "focusedProof": "node scripts/check-list-static-ax.mjs",
    "observation": {
      "component": "shared showcase frame;48 static list/sidenav/grid-list/table cases",
      "reference": "one exposed outer MAIN frame",
      "astylar": "outer MAIN frame plus nested SiteData MAIN page,each exposed",
      "stage": "two authored landmark inputs before semantic bridge projection",
      "pairedStaticCases": 48,
      "captures": 96
    },
    "justification": "Full actual AX trees and referenced backend DOM IDs identify two distinct candidate MAIN elements versus one reference MAIN in all12 static list profile/viewport contexts. Candidate inner page is an AX descendant of the outer frame;list component meaningful descendants independently agree on Inbox/Archive text. Both served component source maps equal current source modulo line endings. Current and exact initial source each explicitly author both MAINs. Core is preserving requested roles,not inventing a duplicate. Shared-source applicability does not imply runtime verification of every family/state. A separate retained72-capture actual-AX supplement verifies the same outer-frame/inner-page ancestor relationship in all36 static sidenav/grid-list/table cases. Sidenav has a third, separately authored content MAIN;do not conflate its local owner with the shared page owner.",
    "history": {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
      "lines": [
        "<main class=\"frame\" [class.dark]=\"store.theme().mode === 'dark'\" [style.background]=\"store.theme().surface\">",
        "type: 'main', id: 'page', children: ["
      ]
    },
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "examples/material-showcase/src/app/reference.component.ts",
        "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
      },
      {
        "file": "scripts/capture-list-static-ax.mjs",
        "sha256": "c6bb3437e776ae7cc49e1eab16e10af13286705b6f30a526b8038ce2c495d8fc"
      },
      {
        "file": "scripts/check-list-static-ax.mjs",
        "sha256": "c0420b487c6ce8ea6c6a751d11ffa9eed6ffbd18d17bf2ae4a6b0a7d9e199f30"
      },
      {
        "file": "artifacts/material-parity/list-static-ax-current-checkpoint-20261021/latest-report.json",
        "sha256": "bedbf72390784c5731fc594c0076507746581e466e0dd7701fb996ae3a6c5f32"
      },
      {
        "file": "artifacts/material-parity/list-static-ax-current-checkpoint-20261021/provenance.json",
        "sha256": "72315b01576a2d7175f287b6fcae204d77be864dc8d2be7c3b15ced2567fcda7"
      },
      {
        "file": "artifacts/material-parity/list-static-ax-review-20261021.log",
        "sha256": "a5ebaffa495e23a3b35362fee84cf2348dba54771533564d2b1f4bbff8a99473"
      },
      {
        "file": "examples/material-showcase/dist/material-showcase/browser/chunk-PCHQTLJM.js.map",
        "sha256": "55fedcbf88e93c3e0ca413d6458495aeb36087e947314dd4f0671358af8727b8"
      },
      {
        "file": "examples/material-showcase/dist/material-showcase/browser/chunk-7SL66K3U.js.map",
        "sha256": "67e956a6f4b3b0325fc51b7b45688a27d5e9307095f8b4a20391a96f68244df4"
      },
      {
        "file": "scripts/capture-passive-static-ax.mjs",
        "sha256": "8cbbb5d1b64a879bd0e47bb123c23d8979bc10bbfeecee7158c008b363a2e1b0"
      },
      {
        "file": "scripts/check-passive-static-ax.mjs",
        "sha256": "87dfdd40238896a1c5ffe9aa51442ca701e8edb0266592f02128001d6fcde46a"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-review-20261021.log",
        "sha256": "fb6769405b639d04da5f0e3908374225ab86da5012de6579c2d8c8fe44dbfc02"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/latest-report.json",
        "sha256": "f4c570cd0db7742a1da8b3a49d45fdf3cfc00b99d5695adc5554ce2ad1717912"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-light-1440x1000-dpr1-reference.json",
        "sha256": "9c1fe20b6603936a94b3fae470ac471fc0cd476a7b33dec3b519816653be3650"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-light-1440x1000-dpr1-astylar.json",
        "sha256": "40c087ee9bfb1ea7af8a444f67475998d3e586aed939a2c047bcf1fd20431ce2"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-light-768x1024-dpr1-reference.json",
        "sha256": "b09ccb1dc5abd516bb3eb2f65d822340d2aedfa4720dab77b71a4a20ed983222"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-light-768x1024-dpr1-astylar.json",
        "sha256": "603de9e9a38f18cf8c2b9b2a6940dde07a988cbe9806ded89223a5780f1ae181"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-light-390x844-dpr2-reference.json",
        "sha256": "a4ed1a01ca9ae7676d71c748df86e0e4ae87a345a9bec96758fa3dca2abd2397"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-light-390x844-dpr2-astylar.json",
        "sha256": "6fd63a2070f29cf2af35b862b4b7f3bcba74a07ff99bea9f02043f52771f2c8f"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-dark-1440x1000-dpr1-reference.json",
        "sha256": "976364d01cb4eda84dc63def3198ea12cd489cb8a392d13d33009e0cecd7baed"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-dark-1440x1000-dpr1-astylar.json",
        "sha256": "29ac5f6cc89864f6b0541400308d49d158398bde79e5cd6e79bf59cf1f6edaea"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-dark-768x1024-dpr1-reference.json",
        "sha256": "cefd10e1798d7b5dad417eafae1d56193b36f015a249af2b907da7a11564ca74"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-dark-768x1024-dpr1-astylar.json",
        "sha256": "f333993082395cb670042ee2750c7e76244a14b5e585dac67b696448d6038b0c"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-dark-390x844-dpr2-reference.json",
        "sha256": "720013b5a045f2300c8ebfe9706b1e1738b7f66534e3be49627a504091527b18"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-dark-390x844-dpr2-astylar.json",
        "sha256": "41049a654b63829eb42d56abee68d7cf9d67be9e3ef6b089cf355a2364f72202"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-contrast-1440x1000-dpr1-reference.json",
        "sha256": "92fd862b3bff59c8b72f5f9fa5174f856ada5225273f7c14f657b7570124a2de"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "7547d91510b85ad920fde700d3cac8582823723730c6c374a835f2eb3b0e4772"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-contrast-768x1024-dpr1-reference.json",
        "sha256": "2b90c6686a9e1fdee0c4b424c3c55b235e4ec22f6f8470a510673c765f75667f"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-contrast-768x1024-dpr1-astylar.json",
        "sha256": "ebb1dc60d0fc978ff3906ba1dfcb533ac2a1f874ecb7a940e7383130cea70c34"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-contrast-390x844-dpr2-reference.json",
        "sha256": "cfdd0b2b5884fa9057fd0c7393a5121aeaf0afe6611987974af7ddb279a2de02"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-contrast-390x844-dpr2-astylar.json",
        "sha256": "9e7228ee6531b12e00852669435fecfb4bd434d50de4b618f3105e6f7baf414e"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-custom-1440x1000-dpr1-reference.json",
        "sha256": "d4d1e1ff1e2649c6ca523617d4ec015cb22dd2f9fb3d747f97f3f9d89d073d50"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-custom-1440x1000-dpr1-astylar.json",
        "sha256": "27b1ee7e549a7cadbeebcc61de82d89898536618e331b4384f7d6e10e5eb44e9"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-custom-768x1024-dpr1-reference.json",
        "sha256": "a4deb3fb6d885f98c22b7786a85eab9381bdf8eb72912fd9cc94f0a2e75977ca"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-custom-768x1024-dpr1-astylar.json",
        "sha256": "f2dd1016395503c085b968ccb7ee119225b7c1ff42c52abb2713331fca561c04"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-custom-390x844-dpr2-reference.json",
        "sha256": "1d6ad35d9370444aa8b6f2d4c56d6c720ce080a17cf427e9f0d98839d71e7e09"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/sidenav-custom-390x844-dpr2-astylar.json",
        "sha256": "626b14dc4547ad12dd5e23359876871c8a74c9850af0d03feb6aaf9ed3d6a395"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-light-1440x1000-dpr1-reference.json",
        "sha256": "074a3c3dd14d926178bbe27dd79007b199e5af2a1abea1d34565e5d091615846"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-light-1440x1000-dpr1-astylar.json",
        "sha256": "5c238ca15890a5aa176fd9148f6a070d4b98158fec3b8a4d9ffd28aac87e0b59"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-light-768x1024-dpr1-reference.json",
        "sha256": "f402338b1e5f592f6e4ee47cd40e8b16121c3e9b38cebeef018cd30c2f3698a4"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-light-768x1024-dpr1-astylar.json",
        "sha256": "92c9e7a3e15799bd6856ef68a8d8e82258c74446577c7f4b11a31bc4c7b388bf"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-light-390x844-dpr2-reference.json",
        "sha256": "c32627e784f95af75199d990fee0f7f1eba8fa739408e1863a13e8f1fbc34f35"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-light-390x844-dpr2-astylar.json",
        "sha256": "1499c638b0cc19a9374e1b2828a1d6ff4eb1c8f4c36fb7c9cd180e33095bd8f7"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-dark-1440x1000-dpr1-reference.json",
        "sha256": "dc0080e008b7be0516a1ce45509821df52b8963185e3dd86ffb07134802f3265"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-dark-1440x1000-dpr1-astylar.json",
        "sha256": "4361feba6beed2dcc343d1968e8439f3e58726c1c24d8cac6fcb98f5320a4bd3"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-dark-768x1024-dpr1-reference.json",
        "sha256": "9f3078b24d29ca486a50017cb79c97404c414a04d48c34435ea48a6a2be07ad0"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-dark-768x1024-dpr1-astylar.json",
        "sha256": "e3e404b5d542245b411ce761b8ae7723273d9f19b66f61b337fdb39333e810b1"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-dark-390x844-dpr2-reference.json",
        "sha256": "c0a40871caa6faafe0da26acde856d7515840267975d53172d32ad23e053ac51"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-dark-390x844-dpr2-astylar.json",
        "sha256": "0c1f8c15c4c25c66fb5b23fbbd93977c025fb6a420b9916740ca94e366fd537b"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-contrast-1440x1000-dpr1-reference.json",
        "sha256": "7b075f919963a043d35b61cec76f3211ce1e4991494ac0223e96db7d77389b2b"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "7cc5ce87858212afd98c507a7bc874ff6dbe9d3ebd873cb16859a2ed887c7cdb"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-contrast-768x1024-dpr1-reference.json",
        "sha256": "878241d1504b2b87517ea8895c925818f0380c6fa98e38983cadafaf2e4ebc7f"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-contrast-768x1024-dpr1-astylar.json",
        "sha256": "f4850303204ff0670dee6edbe4fdb1e6cb6f7aab883ef4e3f26cc2072b46f270"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-contrast-390x844-dpr2-reference.json",
        "sha256": "a29063d92b309a36e70c303ecbc59ea39f2712077173591ac50adef8e631c5dd"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-contrast-390x844-dpr2-astylar.json",
        "sha256": "9925f23579e5a8b8da5629cdf1a7146257791df2ac64afdbaad5a5337e2ccb63"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-custom-1440x1000-dpr1-reference.json",
        "sha256": "72a7401ac0b8aa55d8654a14d9646b23bf49f0efd4d6c154874abe0f5b67ae56"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-custom-1440x1000-dpr1-astylar.json",
        "sha256": "7babe861ec774f89e1db3e8c3f3c91ed9ede56b8b0a40634b5b481292f3f5aa4"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-custom-768x1024-dpr1-reference.json",
        "sha256": "75e0e3de52677869e5c5e9a329859ccc190c579220c32ad5ae6122095be530c7"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-custom-768x1024-dpr1-astylar.json",
        "sha256": "a75ec71f96115cb8b51ed995b1a54a94a909415ff471ca553b0e8ea8ce85d7b9"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-custom-390x844-dpr2-reference.json",
        "sha256": "672b34c0a317fc82e2b95a799b3b495068e9dccf99264fd50d00aa1f06a8ef1f"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/grid-list-custom-390x844-dpr2-astylar.json",
        "sha256": "8b6cc9b0157a859c370fc2b5736f6f5e2916783f07fc0947496a69b68847d7f2"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-light-1440x1000-dpr1-reference.json",
        "sha256": "ded954fd4354b755f0b1cd938ab6d9603a6afdaecea3eb35621417969ee7dad2"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-light-1440x1000-dpr1-astylar.json",
        "sha256": "db50739e0d6f9920eaecdb7e5670aec21b72ae20eb8728be7fb4029715d6f1f0"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-light-768x1024-dpr1-reference.json",
        "sha256": "2a77f528226fb0354a90a10a5b5d7d023096107515cf9e68460ec3e696572509"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-light-768x1024-dpr1-astylar.json",
        "sha256": "e9ecea77e914e482a11649508bf1345309cce9ba45edbe6227db5f4df955db5f"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-light-390x844-dpr2-reference.json",
        "sha256": "a9f64c7cb4b04fc28690861309315c7a35bdb7ffd8d0562913bd626ab8c0c236"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-light-390x844-dpr2-astylar.json",
        "sha256": "46088799a76cf6c7cba0550abf978f10362849ceb66656cc3497782a91ffb303"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-dark-1440x1000-dpr1-reference.json",
        "sha256": "355210d9dd83d92f44210ab555d9ff8f81fda5d2e8dd5d63d345c7823924d407"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-dark-1440x1000-dpr1-astylar.json",
        "sha256": "b289fde98f25ae5baf85dc13a82929c3dad431da11e0a99431bdc42f6f2e2db6"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-dark-768x1024-dpr1-reference.json",
        "sha256": "34e449980f76f61b9ba324f6a2131eebbd83b1c475f4570edd4c1630d89dd9bd"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-dark-768x1024-dpr1-astylar.json",
        "sha256": "a79d7273ff9f234d5fc3571feca2a219f06310274918aa07d3b7c8d3a411e057"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-dark-390x844-dpr2-reference.json",
        "sha256": "2b59e4e515b2bf2b7125c244baf5f7f1634101c71118390efd37bad72639945a"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-dark-390x844-dpr2-astylar.json",
        "sha256": "de6f756f96732d68e2f46e4950cad441c260124f057563edbfbef80f63bb2ac4"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-contrast-1440x1000-dpr1-reference.json",
        "sha256": "cf35fd3f300942aabf7b44fe0e4b2ef90ca624de494a78068c9f233bd5b65685"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "de136bf794101a548ac46a7bbf04b2f017f0c1f01633c6a3ba254f17dad01a1e"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-contrast-768x1024-dpr1-reference.json",
        "sha256": "e47c7c1d6477793cf00d1c3746751e430976c2efc7c05cc981c691b3d6165249"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-contrast-768x1024-dpr1-astylar.json",
        "sha256": "5bccd0a445dcf4be428cfc1855953c6c04b85aa23c4a9c24d0f55ec6cc9b5096"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-contrast-390x844-dpr2-reference.json",
        "sha256": "322d582eaf092079869bca799340b49105e8a815e9a97c7937d724a7fda81fba"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-contrast-390x844-dpr2-astylar.json",
        "sha256": "15856ebe65cc788f772bb41a5dd496d764919379438172b3008562dfc7d2d17a"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-custom-1440x1000-dpr1-reference.json",
        "sha256": "e8ec0b33e1b4e4f2b320dbc0ee81e4e1f4d26668076ad637d0568de9860ad207"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-custom-1440x1000-dpr1-astylar.json",
        "sha256": "8d5f96945a653ee1c5f888e5ff0eca0e3194914cdd5c56ba9370d2761f8506ac"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-custom-768x1024-dpr1-reference.json",
        "sha256": "bc5975bee42fad879fdbe4fa0d9d4581cc517ebbefe9ef8481a85cfbbfabe89d"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-custom-768x1024-dpr1-astylar.json",
        "sha256": "bd4d14f242a5d1e40b6b4ded8c35ccd1e4d08ea69f37ff40480b5e5f0f90cf70"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-custom-390x844-dpr2-reference.json",
        "sha256": "baab07f57643a9958a87ddfe433fbc97a12011f111997250268daeccc875146f"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/table-custom-390x844-dpr2-astylar.json",
        "sha256": "2f4d738522babc21a58f23c7405f23c61bd024b5060fe01f721684e00bf67bb9"
      }
    ],
    "recommendation": "Give the intended page MAIN one authoring owner across host wrapper and SiteData. Preserve the native page landmark contract with a neutral extra host wrapper where necessary;do not make the renderer silently discard MAIN roles or hide an ancestor containing intended accessible content.",
    "boundary": "Actual duplicate page exposure verified for48 static pairs/96 captures only;not interaction states,all36 families,AT behavior,all AX associations,paint,first-bad runtime or compensation motive. Keep the original12-case proposal and checkpoint rejection."
  }),
  Object.freeze({
    "id": "fixture-sidenav-content-promoted-to-main-landmark",
    "introducedBy": "Initial2f440115 candidate authors MAIN for sidenav-content versus reference MAT-SIDENAV-CONTENT;initial runtime and motive unproven",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "type: 'main', id: 'sidenav-content'",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material showcase sidenav content semantic element authoring",
    "focusedProof": "node scripts/check-passive-static-ax.mjs",
    "observation": {
      "component": "sidenav-content",
      "pairedStaticCases": 12,
      "captures": 24,
      "reference": "MAT-SIDENAV-CONTENT exposed as generic with Main content text",
      "astylar": "MAIN exposed as main with Main content text",
      "stage": "authored content element before semantic bridge projection"
    },
    "justification": "All12 static pairs retain actual AX nodes resolved by backend DOM identity. Reference content is generic;candidate content is main. Current served component source maps bind to current authoring;candidate explicitly requests MAIN. Initial whole Git source bytes already retain this input mismatch. The renderer preserves the requested role;this is separate from the shared outer/page duplicate MAIN and not evidence that core invented a landmark.",
    "history": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "excerpt": "type: 'main', id: 'sidenav-content', class: 'sidenav-content', textContent: 'Main content'"
      },
      {
        "file": "examples/material-showcase/src/app/reference.component.ts",
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "sha256": "2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e",
        "excerpt": "<mat-sidenav-content>Main content</mat-sidenav-content>"
      }
    ],
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "examples/material-showcase/src/app/reference.component.ts",
        "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
      },
      {
        "file": "scripts/check-passive-static-ax.mjs",
        "sha256": "87dfdd40238896a1c5ffe9aa51442ca701e8edb0266592f02128001d6fcde46a"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-review-20261021.log",
        "sha256": "fb6769405b639d04da5f0e3908374225ab86da5012de6579c2d8c8fe44dbfc02"
      },
      {
        "file": "artifacts/material-parity/sidenav-main-authoring-history-20261021.log",
        "sha256": "151b73db6a3c75623f15e055f4264267fa8c0d1c0186844a1f2469a84b0169b0"
      },
      {
        "file": "artifacts/material-parity/passive-static-ax-20261021/latest-report.json",
        "sha256": "f4c570cd0db7742a1da8b3a49d45fdf3cfc00b99d5695adc5554ce2ad1717912"
      }
    ],
    "recommendation": "Author sidenav content with the reference generic semantic contract while retaining its content and layout intent. Do not suppress MAIN roles in core or hide intended content to compensate.",
    "boundary": "Twelve static pairs only;not dynamic sidenav behavior,AT traversal,all header/description associations,layout/paint equivalence,initial runtime or compensation intent."
  }),
  Object.freeze({
  "id": "fixture-card-title-promoted-to-heading",
  "introducedBy": "Initial2f440115 candidate authors H2 versus native MAT-CARD-TITLE;initial runtime and motive unproven",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "pattern": "type: 'h2', id: 'card-title'",
  "classification": "application-plugin-authoring-defect",
  "owner": "Material showcase card title semantic element authoring",
  "focusedProof": "node scripts/check-card-static-ax.mjs",
  "observation": {
    "component": "card-title",
    "pairedStaticCases": 12,
    "captures": 24,
    "reference": "MAT-CARD-TITLE generic container with StaticText Project Atlas",
    "astylar": "H2 heading level2 named Project Atlas with the same StaticText",
    "stage": "authored title tag before semantic bridge projection"
  },
  "justification": "All12 pinned static pairs resolve actual AX nodes through backend DOM identity and preserve the same title text. Candidate explicitly authors H2;the reference custom element exposes generic. Complete current component/source-map bindings and initial Git source authenticate. This is a semantic authoring substitution,not a renderer-invented heading. Native header-text wrapper omission is separately observed and does not prove a core flex defect;the already-classified normal/nowrap and font-family inputs are not duplicate findings.",
  "history": [
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
      "excerpt": "type: 'h2', id: 'card-title'"
    },
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e",
      "excerpt": "<mat-card-title>Project Atlas</mat-card-title>"
    }
  ],
  "evidence": [
    {
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
    },
    {
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
    },
    {
      "file": "scripts/capture-card-static-ax.mjs",
      "sha256": "1c8042d5f0de8bf078a3a7197d9accdefbb01c7a70f1031edf5d0138702749ad"
    },
    {
      "file": "scripts/check-card-static-ax.mjs",
      "sha256": "dcfccbe84e46ac5e3cb3e632c479b9deb3c955b8a1e141a0ec0652eb05e23503"
    },
    {
      "file": "scripts/check-card-recorded-nodes.mjs",
      "sha256": "8905a8f74be4e40680c2a7d42bce99f8b1a36f89cc94cf48b1654305f352ce36"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-review-20261021.log",
      "sha256": "624b2201a997a6a978ecc526c31e14b10b748415d699da297be081cc2b039fcb"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/latest-report.json",
      "sha256": "1cef2e23c59a7d472bf949b68ff229e36c1a44b26e7018cd0723cfef5e87e3aa"
    },
    {
      "file": "artifacts/material-parity/card-recorded-node-accounting-20261021.log",
      "sha256": "205a8c88b98649fbf6c9ffd3916d1c4cf4cf15d5ebad2ccc5aa7720687dae431"
    },
    {
      "file": "artifacts/material-parity/card-header-formatting-boundary-20261021.log",
      "sha256": "61bcc1d37bd75e4a96cc8488102c57eb2844f2e145bd3c8886a94e634c56e1f2"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-light-1440x1000-dpr1-reference.json",
      "sha256": "e775ebe61e61feca8b47dfd91f01576151f947f86e39193e19c0675c6d9ee5cb"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-light-1440x1000-dpr1-astylar.json",
      "sha256": "2c357196bc596c17953f584f6001423d8a624147a561125076f6b749598d4142"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-light-768x1024-dpr1-reference.json",
      "sha256": "20ac1cb9245dcb7c4f1dc912f9843299969af313042a986485704d9ac93670b0"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-light-768x1024-dpr1-astylar.json",
      "sha256": "b30e832f5d651b6025759c84f8109fabaaf8aa302e212f9b365ff723eb9efd8c"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-light-390x844-dpr2-reference.json",
      "sha256": "8eb888c884a008499f80267925caa19922fa33836b34c455dd875279bf805001"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-light-390x844-dpr2-astylar.json",
      "sha256": "b3b72f2e0ae52ccfa5d4961e6b0c2b5a31c770dc9aab879157602c0e12a97da6"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-dark-1440x1000-dpr1-reference.json",
      "sha256": "0e156d57fa35b0fd3a60c23178f5deda86e951bd00060732eeb95ed7d7a2b2a7"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-dark-1440x1000-dpr1-astylar.json",
      "sha256": "dd46d881dffc64ce1318dc53632fa5e2d3ddee7767b8c00dd72067c57f2a9e63"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-dark-768x1024-dpr1-reference.json",
      "sha256": "38fa7ea21f27cbdf06a1375d71bd8a3ca6c38587a19498feaffcd95ffce0d504"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-dark-768x1024-dpr1-astylar.json",
      "sha256": "b6393454af6baa4931ad4eefd5d8b5babebfd105ae0cf3310534a5ab4b350ad5"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-dark-390x844-dpr2-reference.json",
      "sha256": "ba8b943f39b6849f3ee550ae2ad59283b72968dd9ed1fb263930e03fd5b8a2d0"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-dark-390x844-dpr2-astylar.json",
      "sha256": "7d54c8fa2ccf17d92fce9b73bb4dd6c87afb9286dc95b84395c34c18cd86ef9d"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-contrast-1440x1000-dpr1-reference.json",
      "sha256": "53408255f644732bfcaa98b8a420b9ca6dd0071a23a82028a255e7aa0487d8e3"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-contrast-1440x1000-dpr1-astylar.json",
      "sha256": "8229edf55a19f16ede157afecaaa09d4f6ae679138f3f3b136fa88970f124977"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-contrast-768x1024-dpr1-reference.json",
      "sha256": "137eca13681b3147381049535dea0ad2724c2f752eec76d85ad1980cdc3f1d9c"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-contrast-768x1024-dpr1-astylar.json",
      "sha256": "20b8c717a5ea3f045aaf8a7a9adce665cc53bc565d0a2a7daeee767dd2c9de79"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-contrast-390x844-dpr2-reference.json",
      "sha256": "b9f6fa878b66e1104c3f71faa74d021fb1b236a7230b190635d583079710603f"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-contrast-390x844-dpr2-astylar.json",
      "sha256": "24163255cf555788a9beee93bf75a8694e95307167e863bb51cfaa99fdff97c3"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-custom-1440x1000-dpr1-reference.json",
      "sha256": "dee86cf8e25abab66342dea1208ded84274f97165ecab9f7aa80b4275d4f82e1"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-custom-1440x1000-dpr1-astylar.json",
      "sha256": "b0ee8b57d045478e6741219496f097db153d45d1566867e1c3aa71db5f0756ae"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-custom-768x1024-dpr1-reference.json",
      "sha256": "b228d82b55d8bfc7041cf5b0d8e9b30849d7a3c09b7684e965c06438c2990f51"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-custom-768x1024-dpr1-astylar.json",
      "sha256": "6e2bb5a85551f48a792e06e560eb83dc592c98c185ffc73768ec0fef4a994860"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-custom-390x844-dpr2-reference.json",
      "sha256": "cf44920608beb459a678096892c6541288d483be3b706a2c04fb310e656f98b7"
    },
    {
      "file": "artifacts/material-parity/card-static-ax-20261021/card-custom-390x844-dpr2-astylar.json",
      "sha256": "ff1d5e59b755948950a6a2c57fe36b6be994e5e236eae1f5d8d8a8d82253279a"
    }
  ],
  "recommendation": "Preserve the reference title semantic contract and formatting ancestry in comparison authoring. Do not suppress correctly requested heading roles in core or tune title offsets to conceal unequal inputs.",
  "boundary": "Actual AX for12 static contexts only;not interaction AX,AT traversal,all descriptions/associations,anonymous formatting,constrained wrapping,current paint,initial runtime or compensation motive."
}),
Object.freeze({
  "id": "core-semantic-css-visibility-not-projected",
  "file": "src/lib/astylar-semantic-bridge.ts",
  "pattern": "filter\\(\\(element\\) => !element\\.hidden\\)",
  "introducedBy": "Initial0175a0bd bridge source filters authored hidden without CSS visibility;first-bad runtime unproven.6e1c156 changes Material collapsed content from omission to CSS hiding.",
  "classification": "confirmed-core-renderer-defect",
  "owner": "core resolved CSS visibility to semantic DOM reconciliation",
  "focusedProof": "node scripts/check-public-semantic-css-hidden.mjs",
  "history": [
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
      "excerpt": "    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'button', id: 'expansion-primary', class: 'expansion-trigger', disabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', value: 'Advanced settings' }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron', textContent: state.open ? '⌃' : '⌄' }, ...(state.open ? [{ type: 'p' as const, id: 'expansion-content', textContent: 'Additional options.' }] : [])] }];"
    },
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e",
      "excerpt": "          @case ('expansion') { <mat-expansion-panel id=\"expansion-primary\" [expanded]=\"store.state().open\" [disabled]=\"store.state().disabled\"><mat-expansion-panel-header><mat-panel-title>Advanced settings</mat-panel-title></mat-expansion-panel-header><p>Additional options.</p></mat-expansion-panel> }"
    },
    {
      "revision": "354084ea1f1a6abb3e010222062e3cea9f945b61",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "28b5df6d99ef888d5ac0858de77f1e5e7ece572c976aed8660d9427d59beef64",
      "excerpt": "    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'div', id: 'expansion-primary', class: 'expansion-trigger', role: 'button', tabindex: state.disabled ? -1 : 0, ariaDisabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', children: [{ type: 'span', id: 'expansion-title', class: 'expansion-title', textContent: 'Advanced settings' }] }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron', textContent: state.open ? '⌃' : '⌄' }, ...(state.open ? [{ type: 'p' as const, id: 'expansion-content', textContent: 'Additional options.' }] : [])] }];"
    },
    {
      "revision": "6e1c15666fa0c488a1accd1f4df3a6da7fe37aa7",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "c149f84a682413e8ed94709c0e6fc0e8c3ee50653f482adf120525c770ed1338",
      "excerpt": {
        "line": "    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'div', id: 'expansion-primary', class: 'expansion-trigger', role: 'button', tabindex: state.disabled ? -1 : 0, ariaDisabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', children: [{ type: 'span', id: 'expansion-title', class: 'expansion-title', textContent: 'Advanced settings' }] }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron', textContent: state.open ? '⌃' : '⌄' }, { type: 'p' as const, id: 'expansion-content', textContent: 'Additional options.' }] }];",
        "style": "        { selector: '#expansion-content', position: 'absolute', display: state.open ? 'block' : 'none', top: `${state.open ? theme.density === 0 ? 80 : theme.density <= -5 ? 60 : 68 : 0}px`, left: '24px', margin: '0', verticalAlign: 'middle' },"
      }
    },
    {
      "revision": "0175a0bdcab41e6767ec26a83f587c7aba3b1d47",
      "file": "src/lib/astylar-semantic-bridge.ts",
      "sha256": "a8ab51086c1f0b2396583c2b86fc126df9e239dcd90d19457ab25f48d7d88f82",
      "excerpt": [
        ".filter((element) => !element.hidden)",
        "if (child.hidden) continue;"
      ]
    }
  ],
  "observation": {
    "component": "expansion and minimal public text",
    "property": "CSS-hidden actual AX exposure",
    "reference": "CSS display:none/visibility:hidden text absent from actual AX",
    "astylar": "same resolved requests but Hidden content StaticText remains exposed",
    "publicCaptures": 32,
    "publicFailures": 8,
    "materialStaticPairs": 12,
    "stage": "semantic reconciliation consumes authored hidden only"
  },
  "justification": "Two package-root runs use identical paired SiteData and resolve both hidden CSS values correctly. Visible/authored-hidden controls pass;CSS-hidden text is exposed atDPR1/2. Complete current/installed/public-bundle methods and pinned Material served methods/compiler helper bind. Distinct from unsupported ariaHidden accessibility-only intent:these are supported visual CSS hiding requests,not unequal authored semantics. The region-target mismatch is separately classified.",
  "evidence": [
    {
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
    },
    {
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
    },
    {
      "file": "src/lib/astylar-semantic-bridge.ts",
      "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
    },
    {
      "file": "src/lib/astylar.ts",
      "sha256": "5742ba6c19debd5c18ad7d407f1a10e14271cbcd38bf99889d4b4e2474f17451"
    },
    {
      "file": "scripts/check-expansion-static-ax.mjs",
      "sha256": "529a6354f8e137c8a1581d36615b41e22c9ad95a94ada185b1d35fd8d3d3912d"
    },
    {
      "file": "scripts/check-material-semantic-visibility-binding.mjs",
      "sha256": "a320c97ece4ac0191ff102b473029cc8d2800d5979216658c02eea61ffb0ac23"
    },
    {
      "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
      "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-review-20261021.log",
      "sha256": "3541b52e5b5b641f45f57a1eb7c7474241a759f127d7e30fd62588f0c62dbf17"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/latest-report.json",
      "sha256": "c1ababf7c391ba769c5a25f41da09d5ed72d46445b95ee6caf73dd4687d6e597"
    },
    {
      "file": "artifacts/material-parity/expansion-controls-retained-boundary-20261021.log",
      "sha256": "560ce34b790c74ea493a6d8b3373f1d6691e147133a1c3e03378dd7a9be3d2b8"
    },
    {
      "file": "artifacts/material-parity/expansion-hidden-style-boundary-20261021.log",
      "sha256": "683a42abffee90605c5ed5ec03c8a245f5b9335cef2e1cd0ac3d6b1ae616697f"
    },
    {
      "file": "scripts/audit-public-semantic-css-hidden.mjs",
      "sha256": "54d86b62291e69492752bdb0ddb6df269f13f95d691d34d3d7437f5be58317bc"
    },
    {
      "file": "scripts/check-public-semantic-css-hidden.mjs",
      "sha256": "8a5679624d560cd1950032c0a956d42847a3d7e1dfa67c4633ce5e296c81437d"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-verification-final-20261021.log",
      "sha256": "d51d8c17338f3421999237913340082bee0fe7776abb6aa574e2f49ac0d1577a"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/latest-report.json",
      "sha256": "2763edde9fddb8007b2cd6e19864c56e57f4da529bd4513ee24c920033baf92e"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/provenance.json",
      "sha256": "7678eb2f4ed383f8f9e599ee1b3c6a49bb7ebdd28ea24a86d205a815a035743c"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/failure.json",
      "sha256": "8d804482e8275c41b22216adb3db421830bf08f6e1d6fbd10580744baba4ec02"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/producer.mjs",
      "sha256": "54d86b62291e69492752bdb0ddb6df269f13f95d691d34d3d7437f5be58317bc"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/audit.js",
      "sha256": "6ea91416683659b54d54bd937c02374db4b3a3e365f69a7843566e01a957c727"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visible-reference-dpr1.json",
      "sha256": "e577035c40805ab3dca7c99b3fe18a8d31a1b443acc3ae91ac24a21f7bf247b4"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visible-astylar-dpr1.json",
      "sha256": "39d45d7b735150d24da6000c125cec4e9030f6138023347a17c1a36db387870b"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/display-none-reference-dpr1.json",
      "sha256": "47b872143009898bdf5837a3c4f1974c3800a50167dec81298464b018cb5c3d2"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/display-none-astylar-dpr1.json",
      "sha256": "dd5f571edd5c89d4595cf92de03ad0dc11884159eff798edc9adbb3c248d9673"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visibility-hidden-reference-dpr1.json",
      "sha256": "c384551dbcbc04a7fd2bb6b842dd741e245a6685e3bb80a13f4259077197366e"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visibility-hidden-astylar-dpr1.json",
      "sha256": "435f88d190724dd4014037f85f41b1b98cce280c9f08d9b0b0c0bdceae373377"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/authored-hidden-reference-dpr1.json",
      "sha256": "757991eb37f45eb4dc6c869c3118b592a9403048bdf7d2657815faec7fa958ad"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/authored-hidden-astylar-dpr1.json",
      "sha256": "78a7012eb4906d4a6989cf8cfb6866b69a1066b24bb20a161462c97eb7667a34"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visible-reference-dpr2.json",
      "sha256": "8fcffac2b5378ffea09690e6741065e56c583c44ac4b360b3db7023b3a4caf97"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visible-astylar-dpr2.json",
      "sha256": "8362f49029f1d6f268545ba48b27e270f8437a037a17ee7d555f1429b8f6bb79"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/display-none-reference-dpr2.json",
      "sha256": "5ca29c02aa4c7452185da382153f712f0523999109a776ecc073275f840745dc"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/display-none-astylar-dpr2.json",
      "sha256": "3d7e8c82dc1046f53b09e798d917e4fcfd62b58eebadee738384740e04f97aec"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visibility-hidden-reference-dpr2.json",
      "sha256": "da788498486abb5a722fe326f00f28e72edf2d2dd86775ec6954b4b62bd179bb"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/visibility-hidden-astylar-dpr2.json",
      "sha256": "383db52365d7b24b7706f0ac760ec100ec360c8f2069bb89070374f6b637a7cf"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/authored-hidden-reference-dpr2.json",
      "sha256": "74f3b5c6966b78cf8125f534c4169cbd43d44107599f8145ca1c579d9e310a18"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-20261021/authored-hidden-astylar-dpr2.json",
      "sha256": "c2b6cb89e0b760bd8fa48b0d6037e7045b1788291493382320a9c11a989312ed"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/latest-report.json",
      "sha256": "951e279fea120fa4876c477106f2c106e68bb18abd0882a5f14b1bc7ad8ace63"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/provenance.json",
      "sha256": "7678eb2f4ed383f8f9e599ee1b3c6a49bb7ebdd28ea24a86d205a815a035743c"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/failure.json",
      "sha256": "c276b4fcb80ad120692a44eedeccbcba5f0af49aed102e3fa2459636cb67173f"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/producer.mjs",
      "sha256": "54d86b62291e69492752bdb0ddb6df269f13f95d691d34d3d7437f5be58317bc"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/audit.js",
      "sha256": "6ea91416683659b54d54bd937c02374db4b3a3e365f69a7843566e01a957c727"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visible-reference-dpr1.json",
      "sha256": "8b1de28211f82521e03f1807371180f7ca49ce706ce6b6cced52999c20025c06"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visible-astylar-dpr1.json",
      "sha256": "a0bacdb133e31438520109b33574d7d04409cd28a035263cfd064ac00cc0529e"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/display-none-reference-dpr1.json",
      "sha256": "5410329fdd5b86abba5d1da0da086a8ee265447496055552c23d445cead10805"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/display-none-astylar-dpr1.json",
      "sha256": "81332f8f03eff771802d78721e50a61cc60b6ea8d695ff1d15c9396cabd22507"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visibility-hidden-reference-dpr1.json",
      "sha256": "7633dc25d1f6b7d5f089cd72f769d45da3fad93a75f243ac52e78e2f83e44c9f"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visibility-hidden-astylar-dpr1.json",
      "sha256": "c42e716d933801f1a7f46a3839d486628f4f5a24a01b647feb273a80fe27d203"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/authored-hidden-reference-dpr1.json",
      "sha256": "745963a41113df3dcf4a1878dd5ba0683016dc83ef578266d1e8ee9cc44e89ad"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/authored-hidden-astylar-dpr1.json",
      "sha256": "6d9a92861167f8791f71b67b270ea2916077cb95fa575f5c7959d436ac25bf2b"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visible-reference-dpr2.json",
      "sha256": "1bcd54fc9678d33907d3b995cc58179e8cdac696aef16a1cec6e940798e2ed76"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visible-astylar-dpr2.json",
      "sha256": "d9ad5303575aa01ad096d4844dd3e5ed4e2ec411ba55c4da6711ed2954a5d50a"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/display-none-reference-dpr2.json",
      "sha256": "e0faabdb3cd29f46d795169f950f1b4accbb7b5ff16168dbf257a7a279885875"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/display-none-astylar-dpr2.json",
      "sha256": "48b71aea18928e1a79410add3683d0b7bbcedf696503b7bdc5c938dc4920865c"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visibility-hidden-reference-dpr2.json",
      "sha256": "5a062cbe134be33f0cd05062fa7ec0bdbe5870b0a76c2667e79056f52c1ad059"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/visibility-hidden-astylar-dpr2.json",
      "sha256": "79a55e38dc5c8a627cf278847553310320a223c50773f9b20b3421b93857df85"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/authored-hidden-reference-dpr2.json",
      "sha256": "5cf96a2b26234149236f25d78fe21797458569b850cf8955112ee3f56fe9ece6"
    },
    {
      "file": "artifacts/material-parity/public-semantic-css-hidden-repeat-20261021/authored-hidden-astylar-dpr2.json",
      "sha256": "b2c2c2d43a8dc8542e4723d83e6c65fad26f390727795df941efa5e73cb5da16"
    }
  ],
  "recommendation": "At the core semantic reconciliation boundary,derive semantic inclusion from authoritative resolved CSS visibility including ancestry and updates. Do not patch Material by conditionally deleting content or adding accessibility-only fixture flags to conceal supported CSS hiding failures.",
  "boundary": "Static text/AX visibility atDPR1/2 and12 Material collapsed contexts;not inherited visibility override semantics,updates,AT traversal,all core methods or complete rendering acceptance."
}),
Object.freeze({
  "id": "fixture-expansion-controlled-region-replaced-with-paragraph",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "pattern": "ariaControls: 'expansion-content'",
  "introducedBy": "Initial2f440115 already controls a plain paragraph versus Material custom panel;initial runtime/region projection and motive unproven.",
  "classification": "application-plugin-authoring-defect",
  "owner": "Material expansion header-to-labelled-content-region authoring",
  "focusedProof": "node scripts/check-expansion-static-ax.mjs",
  "history": [
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
      "excerpt": "    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'button', id: 'expansion-primary', class: 'expansion-trigger', disabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', value: 'Advanced settings' }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron', textContent: state.open ? '⌃' : '⌄' }, ...(state.open ? [{ type: 'p' as const, id: 'expansion-content', textContent: 'Additional options.' }] : [])] }];"
    },
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e",
      "excerpt": "          @case ('expansion') { <mat-expansion-panel id=\"expansion-primary\" [expanded]=\"store.state().open\" [disabled]=\"store.state().disabled\"><mat-expansion-panel-header><mat-panel-title>Advanced settings</mat-panel-title></mat-expansion-panel-header><p>Additional options.</p></mat-expansion-panel> }"
    },
    {
      "revision": "354084ea1f1a6abb3e010222062e3cea9f945b61",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "28b5df6d99ef888d5ac0858de77f1e5e7ece572c976aed8660d9427d59beef64",
      "excerpt": "    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'div', id: 'expansion-primary', class: 'expansion-trigger', role: 'button', tabindex: state.disabled ? -1 : 0, ariaDisabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', children: [{ type: 'span', id: 'expansion-title', class: 'expansion-title', textContent: 'Advanced settings' }] }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron', textContent: state.open ? '⌃' : '⌄' }, ...(state.open ? [{ type: 'p' as const, id: 'expansion-content', textContent: 'Additional options.' }] : [])] }];"
    },
    {
      "revision": "6e1c15666fa0c488a1accd1f4df3a6da7fe37aa7",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "c149f84a682413e8ed94709c0e6fc0e8c3ee50653f482adf120525c770ed1338",
      "excerpt": {
        "line": "    if (family === 'expansion') return [{ type: 'article', id: 'expansion-shell', class: 'expansion-panel', children: [{ type: 'div', id: 'expansion-primary', class: 'expansion-trigger', role: 'button', tabindex: state.disabled ? -1 : 0, ariaDisabled: state.disabled, ariaExpanded: state.open, ariaControls: 'expansion-content', children: [{ type: 'span', id: 'expansion-title', class: 'expansion-title', textContent: 'Advanced settings' }] }, { type: 'span', id: 'expansion-chevron', class: 'expansion-chevron', textContent: state.open ? '⌃' : '⌄' }, { type: 'p' as const, id: 'expansion-content', textContent: 'Additional options.' }] }];",
        "style": "        { selector: '#expansion-content', position: 'absolute', display: state.open ? 'block' : 'none', top: `${state.open ? theme.density === 0 ? 80 : theme.density <= -5 ? 60 : 68 : 0}px`, left: '24px', margin: '0', verticalAlign: 'middle' },"
      }
    },
    {
      "revision": "0175a0bdcab41e6767ec26a83f587c7aba3b1d47",
      "file": "src/lib/astylar-semantic-bridge.ts",
      "sha256": "a8ab51086c1f0b2396583c2b86fc126df9e239dcd90d19457ab25f48d7d88f82",
      "excerpt": [
        ".filter((element) => !element.hidden)",
        "if (child.hidden) continue;"
      ]
    }
  ],
  "observation": {
    "component": "expansion",
    "retainedCases": 68,
    "actualStaticPairs": 12,
    "reference": "header controls wrapper role=region labelled by header",
    "astylar": "header controls unlabelled P expansion-content",
    "stage": "authored relationship-target structure before semantic bridge"
  },
  "justification": "All68 original authenticated target chains expose unequal DOM/SiteData inputs. Pinned collapsed AX binds candidate controls to its paragraph. Native hidden target is absent from collapsed actual AX;no open-state actual region behavior is inferred. This names the semantic role/label/relationship substitution,not a duplicate finding about already-classified absolute flow/top/paragraph-spacing changes.",
  "evidence": [
    {
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
    },
    {
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
    },
    {
      "file": "src/lib/astylar-semantic-bridge.ts",
      "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
    },
    {
      "file": "src/lib/astylar.ts",
      "sha256": "5742ba6c19debd5c18ad7d407f1a10e14271cbcd38bf99889d4b4e2474f17451"
    },
    {
      "file": "scripts/check-expansion-static-ax.mjs",
      "sha256": "529a6354f8e137c8a1581d36615b41e22c9ad95a94ada185b1d35fd8d3d3912d"
    },
    {
      "file": "scripts/check-material-semantic-visibility-binding.mjs",
      "sha256": "a320c97ece4ac0191ff102b473029cc8d2800d5979216658c02eea61ffb0ac23"
    },
    {
      "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
      "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-review-20261021.log",
      "sha256": "3541b52e5b5b641f45f57a1eb7c7474241a759f127d7e30fd62588f0c62dbf17"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/latest-report.json",
      "sha256": "c1ababf7c391ba769c5a25f41da09d5ed72d46445b95ee6caf73dd4687d6e597"
    },
    {
      "file": "artifacts/material-parity/expansion-controls-retained-boundary-20261021.log",
      "sha256": "560ce34b790c74ea493a6d8b3373f1d6691e147133a1c3e03378dd7a9be3d2b8"
    },
    {
      "file": "artifacts/material-parity/expansion-hidden-style-boundary-20261021.log",
      "sha256": "683a42abffee90605c5ed5ec03c8a245f5b9335cef2e1cd0ac3d6b1ae616697f"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-light-1440x1000-dpr1-reference.json",
      "sha256": "1f225ba1fea8f1345ece15908e3bf75417057a51849337f65505154667d52e81"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-light-1440x1000-dpr1-astylar.json",
      "sha256": "3d32168853f0693110efe94c152a733c2a6d794aac55f34b480fb3df1e465f8e"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-light-768x1024-dpr1-reference.json",
      "sha256": "8d3d57de86a412d8c95e9479ffc4ecac9983b29df2640e31aea0a01a5420da54"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-light-768x1024-dpr1-astylar.json",
      "sha256": "492a8e090f80bf8f44e121bad066929a5f652376b5b0cdc34e10c321f1542f6d"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-light-390x844-dpr2-reference.json",
      "sha256": "5c02f0d9b92a0232755d76ee8057c7b078be59bdb7eec3951e23ff2d5669a74c"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-light-390x844-dpr2-astylar.json",
      "sha256": "30036cb8be1c903463c1786d3deba49df05ede06bbc6bcfa4a62c8888445332b"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-dark-1440x1000-dpr1-reference.json",
      "sha256": "d6903616e0abca1a95d4701e79d0f6256cdcab2d9bbd4944dd99d4c0d1efca5c"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-dark-1440x1000-dpr1-astylar.json",
      "sha256": "1758f4550068e3477f7208b83784d9526c7d7fab2978a148d2a6adf8939f661b"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-dark-768x1024-dpr1-reference.json",
      "sha256": "81f8d14fd50073883848fbdaba634c9f3790e479d2d01e5f37d7d8559e25580a"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-dark-768x1024-dpr1-astylar.json",
      "sha256": "4074083bb3c066e4d6bbae3fb551258e0380db36c46e7f29edbb6dff71b55432"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-dark-390x844-dpr2-reference.json",
      "sha256": "47c193c2ff1dc27c560ba1a1e2e63f5b627fd792c0a8b042b8b3756f284c1f78"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-dark-390x844-dpr2-astylar.json",
      "sha256": "0c619dbaa8e00dd980324de473eddfbd930022e058a33c8e368d43330564c5c5"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-contrast-1440x1000-dpr1-reference.json",
      "sha256": "eb4bccb21efe0a0f225b1b4b75056c89a416b613013ee149f9f5e6ce8acbe30e"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-contrast-1440x1000-dpr1-astylar.json",
      "sha256": "10492d8663dc3401b17cf423c59c541a8cb7bcc1da2564288b3c75d76885e282"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-contrast-768x1024-dpr1-reference.json",
      "sha256": "b8367aa8d61f4d3b7f1e66eb38483190e6b233f6abff0ebca295e24a708a568a"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-contrast-768x1024-dpr1-astylar.json",
      "sha256": "6254e9ab187171a1cbcb5ebd9c39083b7fd05ced0c248a4a9c7938a651335717"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-contrast-390x844-dpr2-reference.json",
      "sha256": "ab13ca65bcaab4dba568db52b3a8538b869184a269b7e9547173a212a03020df"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-contrast-390x844-dpr2-astylar.json",
      "sha256": "ce234e32170216711829811165fde9e9dc043fd1c421117a5f1280bb9df7aa19"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-custom-1440x1000-dpr1-reference.json",
      "sha256": "5d9a92100a3f93ea916e2da0f0a317f3c264d2d8f7d0b66c981df6e0dbe48b9d"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-custom-1440x1000-dpr1-astylar.json",
      "sha256": "6090c106b3b8b6b189db223b3f3bbb249cd3a6bb9d0776cd8a452a877582d21f"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-custom-768x1024-dpr1-reference.json",
      "sha256": "165fac90acf3f6e6616ac2a9db23aea9313048db47fbd6a4d8fe199796471f86"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-custom-768x1024-dpr1-astylar.json",
      "sha256": "3e457bb811b6a063ec07c6a62aea45859ddef5afaf5d271e3d6fe63eef345e7f"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-custom-390x844-dpr2-reference.json",
      "sha256": "ebfb37b7dad9c21afbaba55fd2b409393a07da1fd799341e9b1fdcbaed4d1a8f"
    },
    {
      "file": "artifacts/material-parity/expansion-static-ax-20261021/expansion-custom-390x844-dpr2-astylar.json",
      "sha256": "5abf9e2ad68c918d4eaec56a6c9189b4aaf92ed378f341ef1be7a5f7a32a04c8"
    }
  ],
  "recommendation": "Restore equivalent header/labelled-region relationship intent in future comparison inputs,then evaluate core behavior. Keep the generic CSS visibility defect separate;do not make core invent a region for an authored paragraph.",
  "boundary": "Retained target attributes68 cases and actual collapsed AX12 pairs;not open-state region AX,AT navigation,initial runtime or whole-case acceptance."
}),
  Object.freeze({
  "id": "fixture-stepper-tab-panel-relationships-omitted",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "pattern": "id: 'stepper-content', role: 'tabpanel'",
  "introducedBy": "Initial2f440115 already omits tab ariaControls and panel ariaLabelledby;initial runtime/motive unproven.",
  "classification": "application-plugin-authoring-defect",
  "owner": "Material stepper tab-to-labelled-panel relationship authoring",
  "focusedProof": "node scripts/check-stepper-static-ax.mjs",
  "history": [
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
      "excerpt": "    if (family === 'stepper') return [{ type: 'div', id: 'stepper-primary', class: 'stepper', role: 'tablist', ariaLabel: state.selected ? '1Details2ReviewProject detailsReview changes' : 'EditablecreateDetails2ReviewProject detailsReview changes', children: [{ type: 'div', id: 'stepper-head', class: 'stepper-head', children: [{ type: 'div', id: 'step-details', class: 'step-tab', role: 'tab', tabindex: state.selected ? 0 : -1, ariaSelected: state.selected, children: [{ type: 'span', id: 'step-details-badge', class: `step-badge${state.selected ? ' selected' : ''}`, textContent: '1' }, { type: 'span', id: 'step-details-text', class: 'step-text', textContent: 'Details' }] }, { type: 'span', id: 'step-connector', class: 'step-connector' }, { type: 'div', id: 'step-review', class: 'step-tab', role: 'tab', tabindex: state.selected ? -1 : 0, ariaSelected: !state.selected, children: [{ type: 'span', id: 'step-review-badge', class: `step-badge${state.selected ? '' : ' selected'}`, textContent: '2' }, { type: 'span', id: 'step-review-text', class: 'step-text', textContent: 'Review' }] }] }, { type: 'div', id: 'stepper-content', role: 'tabpanel', textContent: state.selected ? 'Project details' : 'Review changes' }] }];"
    },
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e",
      "excerpt": "          @case ('stepper') { <mat-stepper id=\"stepper-primary\"><mat-step label=\"Details\">Project details</mat-step><mat-step label=\"Review\">Review changes</mat-step></mat-stepper> }"
    }
  ],
  "observation": {
    "component": "stepper",
    "staticPairs": 12,
    "property": "active tab controls and panel labelledby",
    "reference": "native active tab controls panel whose labelledby resolves back to that header",
    "astylar": "authored tab and single panel omit both supported relationships;actual DOM/AX agree with omissions",
    "stage": "SiteData relationship authoring before supported semantic attribute projection"
  },
  "justification": "All12 pinned static pairs preserve tablist name and selected states but candidate active panel is unnamed and has no labelledby,while its tabs have no controls. Whole served component/source-map bindings authenticate. Public DOMElement supports both relationship fields and current/installed/served applyAttributes methods bind exactly;current and initial candidate branches omit them. This is distinct from already-classified inactive-panel omission. Numeric accessible names1Details/2Review remain separate evidence of missing accessibility-only hiding intent and the existing public ariaHidden support limitation,not another core finding or a reason to visually hide badges.",
  "evidence": [
    {
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
    },
    {
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
    },
    {
      "file": "src/app/types/dom-element.ts",
      "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
    },
    {
      "file": "src/lib/astylar-semantic-bridge.ts",
      "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
    },
    {
      "file": "scripts/check-stepper-static-ax.mjs",
      "sha256": "9ad62e0881c0e610c1e5585a10240ed4df92f2e689aa8f7c03c86be63a41c689"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-review-20261022.log",
      "sha256": "198584a432478f4e2c3a490b27883a01acf40bf73f0d7278f6fa47859b2e16ff"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/latest-report.json",
      "sha256": "8db8555f87894a01ede3f71efd37209e9d651bdc92fdd0ec7aaed06f1cc925cf"
    },
    {
      "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
      "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
    },
    {
      "file": "scripts/check-material-semantic-visibility-binding.mjs",
      "sha256": "a320c97ece4ac0191ff102b473029cc8d2800d5979216658c02eea61ffb0ac23"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-light-1440x1000-dpr1-reference.json",
      "sha256": "da12aef1c2ae05ff870dc2cf6dc941c3e9ea15759bd263caf547dd327a3101e6"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-light-1440x1000-dpr1-astylar.json",
      "sha256": "eeef28e96a152bb875320fe8e800f5f056d1736ab65ee2028c124c2ae641e638"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-light-768x1024-dpr1-reference.json",
      "sha256": "48add3de068006814d70f274285aed4897e16b4bd9c54472150b1e940d1a0444"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-light-768x1024-dpr1-astylar.json",
      "sha256": "c47266f5e204ca2b2e757529521faaa1ae2cba343cbe6a7bb262a9d72476e6cc"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-light-390x844-dpr2-reference.json",
      "sha256": "b9fb1a5f63e321ee31159f75508da7ebc699871dac2bc968dc81d0e1b837ba65"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-light-390x844-dpr2-astylar.json",
      "sha256": "30b5fc76d95a107af1dbcd8cb9e55b4564e90b3dd936e4f7c10239b7130b0931"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-dark-1440x1000-dpr1-reference.json",
      "sha256": "a0fac64a6c026af6ef92527323b00556db2017cfd0b3602250983e99f175b2f2"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-dark-1440x1000-dpr1-astylar.json",
      "sha256": "969cb89720599387370e0dca3d3e0381eced2df83060c0bcf1fa5f0261750d99"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-dark-768x1024-dpr1-reference.json",
      "sha256": "60f9237b3b1d990e817088da040880c180c0dd559e004ac3a62685f68fb8a20f"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-dark-768x1024-dpr1-astylar.json",
      "sha256": "1499b5d67d1cbcb42afe303e60a87824274c2d8bfa75ba0bd9bc7d5d8ce6a8bb"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-dark-390x844-dpr2-reference.json",
      "sha256": "e6167de1a75f94832fea8c837d5a2164e767a5daf6b14c39eea388d268591dc0"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-dark-390x844-dpr2-astylar.json",
      "sha256": "0af04eb2ef2233d87ec896fea711acf3aa0767d78cd7a292713c71101c27f989"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-contrast-1440x1000-dpr1-reference.json",
      "sha256": "6352195bd4d0a0250866df0332d8deef6c57b903f0c626167fb2b6efc8bdd468"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-contrast-1440x1000-dpr1-astylar.json",
      "sha256": "eaf236156280e9fee239c36b0e52bc5a52e6404e7c536f9e6fd79a232af27264"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-contrast-768x1024-dpr1-reference.json",
      "sha256": "d5e288c62046cbb3b4cfb4f690aacbe70d6871926c22138824d39b6971ffb37c"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-contrast-768x1024-dpr1-astylar.json",
      "sha256": "6f6696cedb65bb609374dbe5a2df78c39ae27019ee9914debc689c8632f726ec"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-contrast-390x844-dpr2-reference.json",
      "sha256": "3e5159052a85f71c570df3e8e173296936d5428841e9265378073ccf22de75dc"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-contrast-390x844-dpr2-astylar.json",
      "sha256": "90e4c6fc843d669086f213cd747d212bc3b94e1a6059e931b3d3c9c81ae28172"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-custom-1440x1000-dpr1-reference.json",
      "sha256": "f92454e2553a82d2a2126fb5712a9fa1cfd2b1103effe6c5ce8ef31e161f7ee6"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-custom-1440x1000-dpr1-astylar.json",
      "sha256": "ad0b76866a9528c303434e0869323818885b45d6409728ae213b965117407f55"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-custom-768x1024-dpr1-reference.json",
      "sha256": "a4b363e339bf8fd81f1d38da6ffe2c2aa37ae8bba6e898092002ed1106a77629"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-custom-768x1024-dpr1-astylar.json",
      "sha256": "7217c4fee30ea6a22aeead62b9381ff30efa6079806b9b78cf0255aba6453674"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-custom-390x844-dpr2-reference.json",
      "sha256": "e994aa9f4dec3076769fb53828676e76ea1c044b35222fbb2927ba999da4d25f"
    },
    {
      "file": "artifacts/material-parity/stepper-static-ax-20261022/stepper-custom-390x844-dpr2-astylar.json",
      "sha256": "81a1e2da4e12c37a7915ae95b9ad010668e6dd56eb94ca1d070ccb0bf7e1fc4f"
    }
  ],
  "recommendation": "Restore equivalent stable tab/panel identities and supported controls/labelledby authoring in future comparison inputs,including both native panels. Address accessibility-only hiding at the existing core/public boundary;do not hide visible numbers or override tab names solely to imitate output.",
  "boundary": "Actual static relationships12 pairs and initial authored omission,not initial runtime,all revisions,interactive relation updates,AT navigation or complete rendering/case acceptance."
}),
Object.freeze({
  "id": "fixture-tab-panel-accessible-name-substitution",
  "file": "examples/material-showcase/src/app/astylar.component.ts",
  "pattern": "ariaLabel: state\\.selected \\? 'Overview content' : 'Activity content'",
  "introducedBy": "a0f3328b introduces explicit content-as-name; initial2f440115 already omits labelledby and reuses one panel. Initial runtime and motive unproven.",
  "classification": "application-plugin-authoring-defect",
  "owner": "Material tab panel semantic identity and relationship authoring",
  "focusedProof": "node scripts/check-tabs-static-ax.mjs",
  "history": [
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
      "excerpt": "    if (family === 'tabs') return [{ type: 'div', id: 'tabs-primary', class: 'tabs', children: [{ type: 'div', id: 'tabs-list', class: 'tab-list', role: 'tablist', children: [{ type: 'button', id: 'tab-overview', class: 'tab', role: 'tab', ariaSelected: state.selected, tabindex: state.selected ? 0 : -1, ariaControls: 'tab-panel', value: 'Overview' }, { type: 'button', id: 'tab-activity', class: 'tab', role: 'tab', ariaSelected: !state.selected, tabindex: state.selected ? -1 : 0, ariaControls: 'tab-panel', value: 'Activity' }] }, { type: 'div', id: 'tab-indicator', class: 'tab-indicator' }, { type: 'div', id: 'tab-panel', class: 'tab-panel', role: 'tabpanel', textContent: state.selected ? 'Overview content' : 'Activity content' }] }];"
    },
    {
      "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e",
      "excerpt": "          @case ('tabs') { <mat-tab-group id=\"tabs-primary\"><mat-tab label=\"Overview\">Overview content</mat-tab><mat-tab label=\"Activity\">Activity content</mat-tab></mat-tab-group> }"
    },
    {
      "revision": "a0f3328b^",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "4da994cecc57446a5d49d78fe9fecbaa9eedd83519cd7831edda10ecd10e9e40",
      "excerpt": "    if (family === 'tabs') return [{ type: 'div', id: 'tabs-primary', class: 'tabs', children: [{ type: 'div', id: 'tabs-list', class: 'tab-list', role: 'tablist', children: [{ type: 'button', id: 'tab-overview', class: 'tab', role: 'tab', ariaSelected: state.selected, tabindex: state.selected ? 0 : -1, ariaControls: 'tab-panel', value: 'Overview' }, { type: 'button', id: 'tab-activity', class: 'tab', role: 'tab', ariaSelected: !state.selected, tabindex: state.selected ? -1 : 0, ariaControls: 'tab-panel', value: 'Activity' }] }, { type: 'div', id: 'tab-indicator', class: 'tab-indicator' }, { type: 'showcase.material:tab-panel', id: 'tab-panel', class: 'tab-panel', role: 'tabpanel', textContent: state.selected ? 'Overview content' : 'Activity content', data: { selected: state.selected, phase: this.benchmarkMode ? 1 : undefined, 'text-color': theme.onSurface } }] }];"
    },
    {
      "revision": "a0f3328b",
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "40d208cd5d28f2858af29b6fc13e40e500aa7349b6aae17b6ff7eb6cfa1425c4",
      "excerpt": "    if (family === 'tabs') return [{ type: 'div', id: 'tabs-primary', class: 'tabs', ariaLabel: `OverviewActivity${state.selected ? 'Overview content' : 'Activity content'}`, children: [{ type: 'div', id: 'tabs-list', class: 'tab-list', role: 'tablist', children: [{ type: 'button', id: 'tab-overview', class: 'tab', role: 'tab', ariaSelected: state.selected, tabindex: state.selected ? 0 : -1, ariaControls: 'tab-panel', value: 'Overview' }, { type: 'button', id: 'tab-activity', class: 'tab', role: 'tab', ariaSelected: !state.selected, tabindex: state.selected ? -1 : 0, ariaControls: 'tab-panel', value: 'Activity' }] }, { type: 'div', id: 'tab-indicator', class: 'tab-indicator' }, { type: 'showcase.material:tab-panel', id: 'tab-panel', class: 'tab-panel', role: 'tabpanel', ariaLabel: state.selected ? 'Overview content' : 'Activity content', data: { selected: state.selected, phase: this.benchmarkMode ? 1 : undefined, 'text-color': theme.onSurface } }] }];"
    }
  ],
  "observation": {
    "component": "tabs",
    "staticPairs": 12,
    "property": "panel accessible name and labelledby relationship",
    "reference": "active panel named Overview through labelledby resolving to Overview tab; distinct authored panel targets",
    "astylar": "single reused panel explicitly named Overview content, no labelledby; both tabs control same panel",
    "stage": "SiteData semantic authoring before supported attribute projection"
  },
  "justification": "All12 pinned static AX pairs bind DOM/backend identities and preserve tab names/selection but disagree on the panel name and naming relationship. Current public fields support ariaLabel/ariaControls/ariaLabelledby; existing full current/installed/pinned bridge binding replays exactly. The candidate explicitly supplies the observed content name rather than the reference tab relationship. Initial source already omitted labelledby; the checked a0f3328b parent/child transition introduces the explicit name. This is unequal authored semantic intent, not evidence that core loses a supplied relationship. Existing private glyph-paint/baseline and accessibility-only-hiding findings remain separate.",
  "evidence": [
    {
      "file": "examples/material-showcase/src/app/astylar.component.ts",
      "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
    },
    {
      "file": "examples/material-showcase/src/app/reference.component.ts",
      "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
    },
    {
      "file": "src/app/types/dom-element.ts",
      "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
    },
    {
      "file": "src/lib/astylar-semantic-bridge.ts",
      "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
    },
    {
      "file": "scripts/check-tabs-static-ax.mjs",
      "sha256": "84c72dce8667ca1e0745a7b8cc0ca03c18c7e4a73305245868e0f99b66fb82c1"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-review-20261022.log",
      "sha256": "54e7876b46747b34bacc5d2da16d98b5ec51678cca51cb9d29f56da17cc19093"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/latest-report.json",
      "sha256": "78c59cedbd0200b86abbdc0d78ab573ef9e1431b619ad0ea6f1a99c3cb40a434"
    },
    {
      "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
      "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
    },
    {
      "file": "scripts/check-material-semantic-visibility-binding.mjs",
      "sha256": "a320c97ece4ac0191ff102b473029cc8d2800d5979216658c02eea61ffb0ac23"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-light-1440x1000-dpr1-reference.json",
      "sha256": "3eec664a4441e72c2f026fcd6c187bba16873ee3591992d2990d0807806e69b7"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-light-1440x1000-dpr1-astylar.json",
      "sha256": "bc1ad886115145b427f674fc1be3fb460172e58a5005696aa89187c2fe6880a8"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-light-768x1024-dpr1-reference.json",
      "sha256": "dfe3c92de53820332ad0d40d766bc9d41391b8a96e517fa96ac77812b49d5417"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-light-768x1024-dpr1-astylar.json",
      "sha256": "4c589f7e17de5896e7548d25b3841f549291fc162b2415db4a69994703819e4b"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-light-390x844-dpr2-reference.json",
      "sha256": "9362c12ce136411094102676cca22140f20f8a01df4cae9cdb8314c21682fd1a"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-light-390x844-dpr2-astylar.json",
      "sha256": "528b4bbf3b220f002eff9691553ec9794ddd40efed8afbd542224dc9ef89c705"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-dark-1440x1000-dpr1-reference.json",
      "sha256": "edd6643e7a5547d62d68fe3b38c93d515fbad28fe902ae140443d6fda3fb543d"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-dark-1440x1000-dpr1-astylar.json",
      "sha256": "4335dd1b7c285473b0c977ad199dad8a093a8be26eafddade2dbc154bc800b18"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-dark-768x1024-dpr1-reference.json",
      "sha256": "291a2c8109cc614afa5fbf3b285fe074e13f47959a244a21083cac92e5910487"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-dark-768x1024-dpr1-astylar.json",
      "sha256": "f3f662814616dcadd01b29a3003ff15e5d12dbcb87d670495453778640db4dd2"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-dark-390x844-dpr2-reference.json",
      "sha256": "f882ee7f441992e74ba87393f6f4c51f7152d0fdb27b228a51fb715e8afa1406"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-dark-390x844-dpr2-astylar.json",
      "sha256": "9ef90fb7d29cfc3a593b68c59bf2880c393492d5ac9a9d198b8d6b5795a40b6e"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-contrast-1440x1000-dpr1-reference.json",
      "sha256": "ac9ab9200a0a48dcf4a5f1e82ff0f8cf5330524056b75daf29099094ee562479"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-contrast-1440x1000-dpr1-astylar.json",
      "sha256": "d0f97bfee3035861a572c0f6cb5d64407ea262029cd1ebf41043d85b07e4821c"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-contrast-768x1024-dpr1-reference.json",
      "sha256": "0bafff7b62f530d69e94e924d4dc2583f22baa82e61b887f384302a5d773b8d4"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-contrast-768x1024-dpr1-astylar.json",
      "sha256": "896d35759f37ad98724edc063fa6c12d03b65932ce49c7c5ca06f50f90ada0fc"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-contrast-390x844-dpr2-reference.json",
      "sha256": "d66dd095dab19c4ec7fb1ed9365bcf42ca78e737512533b3e791cf8689a1cf90"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-contrast-390x844-dpr2-astylar.json",
      "sha256": "3da8dbc6ce81b60a88c9df2004bc4bb9ad18c7d88c338e3830205b88a8f0ffce"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-custom-1440x1000-dpr1-reference.json",
      "sha256": "82e6f93407d55324588efeacbb0dd4de8c532bc261b478847902483330e43d6b"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-custom-1440x1000-dpr1-astylar.json",
      "sha256": "75a70841b73b7449698e4ec511027ff237f5e6444c34d768f216cab29e961570"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-custom-768x1024-dpr1-reference.json",
      "sha256": "4acd92b30f77f177d7381e23e50d5e77e64a2054c83e7ff15ad289531c9ad13d"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-custom-768x1024-dpr1-astylar.json",
      "sha256": "0d30670354c222f448faac865a3b03774342393c7393de44c473d8e43371aed5"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-custom-390x844-dpr2-reference.json",
      "sha256": "9662c206bb1596aa39d8f745c5ac41ba0068ad3b03725cfa39f69523f22ca3f6"
    },
    {
      "file": "artifacts/material-parity/tabs-static-ax-20261022/tabs-custom-390x844-dpr2-astylar.json",
      "sha256": "00147d6f96c9feabe30455f463b43cecc1ac344829cbb2477a3d7b57d0d57b18"
    }
  ],
  "recommendation": "In future comparison input work preserve stable tab/panel identities and supported labelledby relationships rather than hardcoding content as the panel name. Do not change visible text, private paint or CSS hiding to imitate accessibility output; investigate those at their already-recorded owning boundaries.",
  "boundary": "Twelve pinned initial-state static pairs and exact source transitions only; not historical runtime, every intervening revision, interactive updates, AT behavior, current rendering or case closure."
}),
  Object.freeze({
    "id": "fixture-bottom-sheet-dialog-name-substitution",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "const label = family === 'dialog' \\? 'Open dialog' : family === 'bottom-sheet' \\? 'Open bottom sheet' : 'Show snackbar'",
    "introducedBy": "Initial2f440115 already supplies Open bottom sheet while native opening options supply Sharing options;initial runtime/motive unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material bottom-sheet dialog accessible-name authoring",
    "focusedProof": "node scripts/review-bottom-sheet-name-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "name": "Open bottom sheet",
          "type": "dialog",
          "excerpt": "      const label = family === 'dialog' ? 'Open dialog' : family === 'bottom-sheet' ? 'Open bottom sheet' : 'Show snackbar';"
        }
      },
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/reference.component.ts",
        "sha256": "2e070cc31b08750e07f6a8c5c3103607e5399291930b91d590140203be719c8e",
        "observation": {
          "name": "Sharing options",
          "excerpt": "protected openBottomSheet(): void { const content = this.sheetContent(); if (content) this.bottomSheet.open(content, { ariaLabel: 'Sharing options' }); }"
        }
      }
    ],
    "observation": {
      "component": "bottom-sheet",
      "configuredActivatePairs": 9,
      "property": "dialog accessible name",
      "reference": "Sharing options",
      "astylar": "Open bottom sheet",
      "stage": "application options/SiteData ariaLabel before semantic projection"
    },
    "justification": "Actual AX/backend DOM in all9 configured activate pairs exposes the unequal names. Executing the complete authored opening/familyElements methods resolves those exact differing inputs;two forged-name controls reject. Initial whole sources preserve the same difference. Existing current/installed/pinned semantic projection binding replays exactly and ariaLabel is supported. This is not a core naming failure or proof of equal semantics. Keep the existing list/link substitution,local/modal lifecycle and request-before-input focus scheduling separate.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "examples/material-showcase/src/app/reference.component.ts",
        "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "scripts/check-bottom-sheet-activate-ax.mjs",
        "sha256": "c4db8c3d0f34c2aec2f4c39f1bfe847d4f830cbcda82810b5ca191dd661bf65d"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-review-20261022.log",
        "sha256": "0156e32ad25c8381b17da64bbda6c79de9e0299dc7de361fb3d434e97e8dfdec"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/latest-report.json",
        "sha256": "15d911d3e067f64f7f37b0d820f20f2099f71b62923f3b37ffafa0afad0b7f77"
      },
      {
        "file": "scripts/check-material-semantic-visibility-binding.mjs",
        "sha256": "a320c97ece4ac0191ff102b473029cc8d2800d5979216658c02eea61ffb0ac23"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-light-1440x1000-dpr1-reference.json",
        "sha256": "20005b98964a748327b0aa7c8d11338389edd962809827c373c1f2dab9cd9ec3"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-light-1440x1000-dpr1-astylar.json",
        "sha256": "871afd0c1b7e3210bdc49da707f5b646163f547dd3f32d6ce8f71fd8981a1675"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-light-1440x1000-dpr2-reference.json",
        "sha256": "1e3bce1ff01eb7d55ca98048056c4afe658583b94bd168297a102040f588a533"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-light-1440x1000-dpr2-astylar.json",
        "sha256": "c6fd3a57133bcbe1fc483ca2044e540150c8c6767b4290a6ae9abf7f48336256"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-dark-1440x1000-dpr1-reference.json",
        "sha256": "a35b95f8d29a0d7e77e7b210d54ccaf7e1eb5f0cfc6264b539edd4b407e439bc"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-dark-1440x1000-dpr1-astylar.json",
        "sha256": "7dd779e283e437af8e95e11282f5e09c279946234f46452d8c3f85645ec0c4dd"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-dark-1440x1000-dpr2-reference.json",
        "sha256": "63801490be9e54cce524fe16ac48249637fac4dc113ed6f18753bca86d0feaa8"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-dark-1440x1000-dpr2-astylar.json",
        "sha256": "5699f0598688dec92f3961810e90f341027e9d9b54b3d14787640903598d92e0"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-contrast-1440x1000-dpr1-reference.json",
        "sha256": "ad3e53ad731ace62a52b6e1c48e78fd9144c2189329dc99a08740d44d973dfb8"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "a7ccd0ebee560b0672b451ba806c05c84681f83f132daf7970e4dce33c425d51"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-contrast-1440x1000-dpr2-reference.json",
        "sha256": "a0f0a91e9d348e11b40c33db8e12b89dde16061aa81c33628862d27677092bfa"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-contrast-1440x1000-dpr2-astylar.json",
        "sha256": "7f95d4d4f59e82cbeeee2b3800f34be67a4b7ded94ba6aa1ac539d2423faf559"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-custom-1440x1000-dpr1-reference.json",
        "sha256": "d95f8a65f20da817e3a807385f3c5bfb38a04e5a7025db73df204f76165e2741"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-custom-1440x1000-dpr1-astylar.json",
        "sha256": "3b9072ea3da6d8cda212ef1df8ebca365925b071ee83d99acb235089a66a2841"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-custom-1440x1000-dpr2-reference.json",
        "sha256": "5d0eba113c65b26a9e664677e7cbc5e2b3bd29f1926238c94ffad7e2ae914f20"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-custom-1440x1000-dpr2-astylar.json",
        "sha256": "a7955835aa702945768d81f710d268993506d1c3508b31aa44588bdca045c7e9"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-light-900x800-dpr1-reference.json",
        "sha256": "2ae6da3c4db7bf2a37e83f18b531260756051d919d0b689d91f6927992e39705"
      },
      {
        "file": "artifacts/material-parity/bottom-sheet-activate-ax-20261022/bottom-sheet-light-900x800-dpr1-astylar.json",
        "sha256": "3c0c79d90e009093038063af9088eda9f0ae36a26b2010178cc09c482595c565"
      }
    ],
    "recommendation": "Preserve the reference dialog-name input independently from its opener text in future fixture correction. Do not change visible labels,force focus,convert the local sheet into a global modal or tune geometry to conceal this semantic input mismatch.",
    "boundary": "Nine pinned configured activate endpoints and initial/current executed authored names,not historical runtime,all revisions,AT navigation,paint,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "fixture-chip-listbox-orientation-input-omitted",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "    if \\(family === 'chips'\\) return \\[\\{ type: 'div', id: 'chips-primary', class: 'row', role: 'listbox', ariaLabel: 'Tags', ariaDisabled: false, ariaMultiselectable: true, children: state\\.chips\\.map\\(\\(chip, index\\) => \\(\\{",
    "introducedBy": "Initial2f440115 already omits orientation on its authored listbox;initial runtime and API support/motive at that revision unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material chip-listbox semantic orientation authoring",
    "focusedProof": "node scripts/review-chip-orientation-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "authored": {
            "type": "div",
            "id": "chips-primary",
            "class": "row",
            "role": "listbox",
            "ariaLabel": "Tags",
            "ariaDisabled": false,
            "ariaMultiselectable": true
          },
          "excerpt": "    if (family === 'chips') return [{ type: 'div', id: 'chips-primary', class: 'row', role: 'listbox', ariaLabel: 'Tags', ariaDisabled: false, ariaMultiselectable: true, children: state.chips.map((chip, index) => ({ type: 'button' as const, id: `chip-${index}`, class: 'chip', role: 'option', ariaSelected: state.selected, value: chip })) }];",
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728"
        }
      }
    ],
    "observation": {
      "component": "chips",
      "staticPairs": 12,
      "property": "aria-orientation/AX orientation",
      "reference": "horizontal",
      "astylar": "omitted input;actual AX vertical",
      "stage": "authored listbox SiteData before semantic projection"
    },
    "justification": "All12 pinned static pairs expose horizontal native versus vertical candidate listboxes. Backend DOM has explicit native aria-orientation=horizontal and no candidate attribute. Complete current/initial authored methods omit ariaOrientation;current public type and fully bound current/installed/pinned projection support it. This is unequal fixture input,not a demonstrated semantic bridge failure. Focusability,chip descriptions,keyboard behavior and paint remain separate.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-1440x1000-dpr1-reference.json",
        "sha256": "063c078c95490d32a8aac4ace8a053c02de7f2d52def0e0733e09a877bdc74e5"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-1440x1000-dpr1-astylar.json",
        "sha256": "c703ab326e9daaed7d75f74b5de5b37257358ea31eeb7af224e7d0cf4ed76669"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-768x1024-dpr1-reference.json",
        "sha256": "ef9e0eea18668a6988178e6b3bab42e0fe2653188b51af564309d02d272f4419"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-768x1024-dpr1-astylar.json",
        "sha256": "bb5e93400d1200a967680c8cd18ca1fc63194fe4417016f94156952d0d2b2276"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-390x844-dpr2-reference.json",
        "sha256": "572800228929fcb9351e342bb364c6d7b2d3854237039edd464bccc79e442610"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-390x844-dpr2-astylar.json",
        "sha256": "6d5a9c547ffd49af994f2be8b730361412480395e296d467183c2c475b473632"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-1440x1000-dpr1-reference.json",
        "sha256": "d96cf58f15d6a519b3424b05d19ac9c1218845a85cda64c9a8555c6b659f662a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-1440x1000-dpr1-astylar.json",
        "sha256": "bde335faed78f089d1b36cdaf7b1fbe8938a4e48ac1d650f756905af2ac92b5f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-768x1024-dpr1-reference.json",
        "sha256": "7e857ea9fb562eecd94578c51da1eeb8c6d4a9d96101484489d0be76780ceb19"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-768x1024-dpr1-astylar.json",
        "sha256": "492b1494ddc74d70818bb72e40c2579e1b5fd7565a074b2a7494070433d91176"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-390x844-dpr2-reference.json",
        "sha256": "c1bc90718f571dbc1277e8914c222f336eae9317f63d2005a8ed95df7528eec7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-390x844-dpr2-astylar.json",
        "sha256": "fd99753e615a262b775772313709b6ab633dad8c4896f2c16cf6f5682188146e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-1440x1000-dpr1-reference.json",
        "sha256": "f7b6e174d126846091fc7ccd772a1184c77a4ddad07b14f197a1c95683a7b83f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "3808eb20488e90cd6a37e4808c91bdf9af5587e74dc19bfb53f39f25a3d56442"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-768x1024-dpr1-reference.json",
        "sha256": "a600df999cead07ef1a263aa7d5b5aa4e825b64926d734092ee1db2dfbf85f44"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-768x1024-dpr1-astylar.json",
        "sha256": "1c54475a50a07f1479774c51305423d697e277fd7834ea274790e8f79a0b1d97"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-390x844-dpr2-reference.json",
        "sha256": "e0626dfc97e81eabdfd80711619051ca70b6a7caccb4fd3b74518d9e954d9052"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-390x844-dpr2-astylar.json",
        "sha256": "e97b1432a135f2aad1e8e32b1de75a9571e42f6c0cafbd4d46a174ab5d8f0901"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-1440x1000-dpr1-reference.json",
        "sha256": "bd22bae279b76fe56801dfb078ca08c650e37b40f682e6a26f88b83730e08649"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-1440x1000-dpr1-astylar.json",
        "sha256": "3d39f7b44f83b58db0f34783344f97c7bc305f7089a72115e6545029db7a787f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-768x1024-dpr1-reference.json",
        "sha256": "d259b2b238bd7355cb5500265ae4904ef0174f2daf022a42c1bc504c0b20de92"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-768x1024-dpr1-astylar.json",
        "sha256": "789e59233991afc7432dcf0c958e39bed43cf5f748910280bfe5ad0e4f48cfdc"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-390x844-dpr2-reference.json",
        "sha256": "cb3b96e95d2a7f808b9a2f1b4ec9ae0a1fcd712e7546bed01d109645de62a05f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-390x844-dpr2-astylar.json",
        "sha256": "16923170e1cb56d3200a41fb8c41a5d7d6ab0b3a2a5861e3c71e02124c5f1376"
      }
    ],
    "recommendation": "Preserve the reference semantic orientation input in a future fixture correction;do not infer orientation from screenshot layout,change core listbox defaults or tune chip geometry to hide the omission.",
    "boundary": "Twelve static AX/backend DOM pairs and executed initial/current authoring,not historical runtime,all interaction states,AT traversal,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "fixture-chip-listbox-tabstop-input-omitted",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "    if \\(family === 'chips'\\) return \\[\\{ type: 'div', id: 'chips-primary', class: 'row', role: 'listbox', ariaLabel: 'Tags', ariaDisabled: false, ariaMultiselectable: true, children: state\\.chips\\.map\\(\\(chip, index\\) => \\(\\{",
    "introducedBy": "Initial2f440115 already contains the differing root metadata;initial runtime and API support/motive at that revision unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material chip-listbox container focusability authoring",
    "focusedProof": "node scripts/review-group-semantic-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "chips": {
            "type": "div",
            "id": "chips-primary",
            "class": "row",
            "role": "listbox",
            "ariaLabel": "Tags",
            "ariaDisabled": false,
            "ariaMultiselectable": true
          },
          "paginator": {
            "type": "div",
            "id": "paginator-primary",
            "class": "paginator",
            "role": "group",
            "ariaLabel": "Items per page: 10 1 – 10 of 100"
          },
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
          "excerpts": {
            "chips": "    if (family === 'chips') return [{ type: 'div', id: 'chips-primary', class: 'row', role: 'listbox', ariaLabel: 'Tags', ariaDisabled: false, ariaMultiselectable: true, children: state.chips.map((chip, index) => ({ type: 'button' as const, id: `chip-${index}`, class: 'chip', role: 'option', ariaSelected: state.selected, value: chip })) }];",
            "paginator": "    if (family === 'paginator') return [{ type: 'div', id: 'paginator-primary', class: 'paginator', role: 'group', ariaLabel: `Items per page: 10 ${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100`, children: [{ type: 'span', id: 'paginator-size', textContent: 'Items per page: 10' }, { type: 'span', id: 'paginator-range', textContent: `${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100` }, { type: 'button', id: 'paginator-previous', class: 'paginator-button', disabled: state.pageIndex === 0, ariaLabel: 'Previous page', value: '‹' }, { type: 'button', id: 'paginator-next', class: 'paginator-button', disabled: state.pageIndex === 9, ariaLabel: 'Next page', value: '›' }] }];"
          }
        }
      }
    ],
    "observation": {
      "component": "chips",
      "staticPairs": 12,
      "property": "container tabindex/AX focusable",
      "reference": "tabindex0;AX focusable true",
      "astylar": "tabindex omitted;AX focusable absent",
      "stage": "authored SiteData before semantic projection"
    },
    "justification": "Complete current/initial root authoring omits supported tabindex while all12 native backend DOM roots have tabindex0 and all12 candidate roots omit it. Bound current/installed/pinned projection supports the public input. Keep child focusability,keyboard navigation,orientation,descriptions and focus runtime ordering separate.",
    "recommendation": "Preserve the native container focusability input in future fixture correction. Do not force focus,change default listbox semantics or alter child hit regions to conceal the omission.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-1440x1000-dpr1-reference.json",
        "sha256": "063c078c95490d32a8aac4ace8a053c02de7f2d52def0e0733e09a877bdc74e5"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-1440x1000-dpr1-astylar.json",
        "sha256": "c703ab326e9daaed7d75f74b5de5b37257358ea31eeb7af224e7d0cf4ed76669"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-768x1024-dpr1-reference.json",
        "sha256": "ef9e0eea18668a6988178e6b3bab42e0fe2653188b51af564309d02d272f4419"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-768x1024-dpr1-astylar.json",
        "sha256": "bb5e93400d1200a967680c8cd18ca1fc63194fe4417016f94156952d0d2b2276"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-390x844-dpr2-reference.json",
        "sha256": "572800228929fcb9351e342bb364c6d7b2d3854237039edd464bccc79e442610"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-light-390x844-dpr2-astylar.json",
        "sha256": "6d5a9c547ffd49af994f2be8b730361412480395e296d467183c2c475b473632"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-1440x1000-dpr1-reference.json",
        "sha256": "d96cf58f15d6a519b3424b05d19ac9c1218845a85cda64c9a8555c6b659f662a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-1440x1000-dpr1-astylar.json",
        "sha256": "bde335faed78f089d1b36cdaf7b1fbe8938a4e48ac1d650f756905af2ac92b5f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-768x1024-dpr1-reference.json",
        "sha256": "7e857ea9fb562eecd94578c51da1eeb8c6d4a9d96101484489d0be76780ceb19"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-768x1024-dpr1-astylar.json",
        "sha256": "492b1494ddc74d70818bb72e40c2579e1b5fd7565a074b2a7494070433d91176"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-390x844-dpr2-reference.json",
        "sha256": "c1bc90718f571dbc1277e8914c222f336eae9317f63d2005a8ed95df7528eec7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-dark-390x844-dpr2-astylar.json",
        "sha256": "fd99753e615a262b775772313709b6ab633dad8c4896f2c16cf6f5682188146e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-1440x1000-dpr1-reference.json",
        "sha256": "f7b6e174d126846091fc7ccd772a1184c77a4ddad07b14f197a1c95683a7b83f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "3808eb20488e90cd6a37e4808c91bdf9af5587e74dc19bfb53f39f25a3d56442"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-768x1024-dpr1-reference.json",
        "sha256": "a600df999cead07ef1a263aa7d5b5aa4e825b64926d734092ee1db2dfbf85f44"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-768x1024-dpr1-astylar.json",
        "sha256": "1c54475a50a07f1479774c51305423d697e277fd7834ea274790e8f79a0b1d97"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-390x844-dpr2-reference.json",
        "sha256": "e0626dfc97e81eabdfd80711619051ca70b6a7caccb4fd3b74518d9e954d9052"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-contrast-390x844-dpr2-astylar.json",
        "sha256": "e97b1432a135f2aad1e8e32b1de75a9571e42f6c0cafbd4d46a174ab5d8f0901"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-1440x1000-dpr1-reference.json",
        "sha256": "bd22bae279b76fe56801dfb078ca08c650e37b40f682e6a26f88b83730e08649"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-1440x1000-dpr1-astylar.json",
        "sha256": "3d39f7b44f83b58db0f34783344f97c7bc305f7089a72115e6545029db7a787f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-768x1024-dpr1-reference.json",
        "sha256": "d259b2b238bd7355cb5500265ae4904ef0174f2daf022a42c1bc504c0b20de92"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-768x1024-dpr1-astylar.json",
        "sha256": "789e59233991afc7432dcf0c958e39bed43cf5f748910280bfe5ad0e4f48cfdc"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-390x844-dpr2-reference.json",
        "sha256": "cb3b96e95d2a7f808b9a2f1b4ec9ae0a1fcd712e7546bed01d109645de62a05f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/chips-custom-390x844-dpr2-astylar.json",
        "sha256": "16923170e1cb56d3200a41fb8c41a5d7d6ab0b3a2a5861e3c71e02124c5f1376"
      }
    ],
    "boundary": "Twelve static pairs per family and initial/current executed authoring. Not all AX properties,keyboard/event behavior,AT traversal,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "fixture-paginator-group-accessible-name-substitution",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "      ariaLabel: `Items per page: 10 \\$\\{state\\.pageIndex \\* 10 \\+ 1\\} – \\$\\{Math\\.min\\(100, state\\.pageIndex \\* 10 \\+ 10\\)\\} of 100`,",
    "introducedBy": "Initial2f440115 already contains the differing root metadata;initial runtime and API support/motive at that revision unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material paginator group accessible-name authoring",
    "focusedProof": "node scripts/review-group-semantic-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "chips": {
            "type": "div",
            "id": "chips-primary",
            "class": "row",
            "role": "listbox",
            "ariaLabel": "Tags",
            "ariaDisabled": false,
            "ariaMultiselectable": true
          },
          "paginator": {
            "type": "div",
            "id": "paginator-primary",
            "class": "paginator",
            "role": "group",
            "ariaLabel": "Items per page: 10 1 – 10 of 100"
          },
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
          "excerpts": {
            "chips": "    if (family === 'chips') return [{ type: 'div', id: 'chips-primary', class: 'row', role: 'listbox', ariaLabel: 'Tags', ariaDisabled: false, ariaMultiselectable: true, children: state.chips.map((chip, index) => ({ type: 'button' as const, id: `chip-${index}`, class: 'chip', role: 'option', ariaSelected: state.selected, value: chip })) }];",
            "paginator": "    if (family === 'paginator') return [{ type: 'div', id: 'paginator-primary', class: 'paginator', role: 'group', ariaLabel: `Items per page: 10 ${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100`, children: [{ type: 'span', id: 'paginator-size', textContent: 'Items per page: 10' }, { type: 'span', id: 'paginator-range', textContent: `${state.pageIndex * 10 + 1} – ${Math.min(100, state.pageIndex * 10 + 10)} of 100` }, { type: 'button', id: 'paginator-previous', class: 'paginator-button', disabled: state.pageIndex === 0, ariaLabel: 'Previous page', value: '‹' }, { type: 'button', id: 'paginator-next', class: 'paginator-button', disabled: state.pageIndex === 9, ariaLabel: 'Next page', value: '›' }] }];"
          }
        }
      }
    ],
    "observation": {
      "component": "paginator",
      "staticPairs": 12,
      "property": "group aria-label/AX name",
      "reference": "no aria-label;empty AX group name",
      "astylar": "Items per page: 10 1 – 10 of 100",
      "stage": "authored SiteData before semantic projection"
    },
    "justification": "Complete current/initial root authoring supplies a content-derived ariaLabel absent from the reference. All12 paired backend DOM/AX roots expose precisely that input difference. Supported name projection is fully bound;this is not a bridge naming failure. Reference accessibility design may merit separate review,but reference truth is not changed by this audit.",
    "recommendation": "Resolve shared semantic intent explicitly in a future fixture review;do not silently rename the reference or change visible text/core accessible-name rules to manufacture parity.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-light-1440x1000-dpr1-reference.json",
        "sha256": "1c80ff12e72707e91025095b2e9fcb6b4ece6e264a34c64ca1dd783edb170d9b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-light-1440x1000-dpr1-astylar.json",
        "sha256": "243e04def64af2b070d4c29fbf9425b83f49b16dff71373e801c3df74e48a549"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-light-768x1024-dpr1-reference.json",
        "sha256": "6c9935b53e316f6c2656ef93044d2ff1d1b06dc7e3ba0867122c76a34363fc73"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-light-768x1024-dpr1-astylar.json",
        "sha256": "46b0da3712a16111344a7c643bf67d854e4d1de73b5fc59028f7523bdce4e25a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-light-390x844-dpr2-reference.json",
        "sha256": "57f339b8d93be555683c486c039e447744e11358567e09aaf14450838df9ed90"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-light-390x844-dpr2-astylar.json",
        "sha256": "004b1e78e8eda79ebfb5ab6bc6a1580269da84f2b02c1a240044236424dc2198"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-dark-1440x1000-dpr1-reference.json",
        "sha256": "3718afe4ecf65298b449a0187d1aec3d8ec466fdad33b023240456cdbf763cdb"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-dark-1440x1000-dpr1-astylar.json",
        "sha256": "58a45671a286238684a4c6b6fd283dca14661338a87c0e2a18187482ac4f9896"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-dark-768x1024-dpr1-reference.json",
        "sha256": "6724e23a56f200d165752385d7ab334d2eefe23142dbe555192f6b1738b958ce"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-dark-768x1024-dpr1-astylar.json",
        "sha256": "6261ad2cdbfdb111bb19f13d13bc9eef74c095e1f2fef3d04ecedc3a216d0f8a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-dark-390x844-dpr2-reference.json",
        "sha256": "92cc93c060711d64531e9a10117c593f9f603865603858bdc48abf6ff03554a1"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-dark-390x844-dpr2-astylar.json",
        "sha256": "576744589c821c1b0afd98161d521745270d54c2133e7ef1bc46c700ccec344b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-contrast-1440x1000-dpr1-reference.json",
        "sha256": "bd93a88af926ee653190e749fac95645ee49c70dd7c17fee7c6a1f2b797990f3"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "6a5ef5f0a8a1b713bc3a55f55f67227eecfa14c96424cbef97266025f2586fd1"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-contrast-768x1024-dpr1-reference.json",
        "sha256": "686c06c8433d3cc053030a5fcec2793056621345fd5a44d75291a8346aeabf1d"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-contrast-768x1024-dpr1-astylar.json",
        "sha256": "45d1ce150e5b74dee49b42907a66db27924a1ba060ec52eeb290a206fa8218a4"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-contrast-390x844-dpr2-reference.json",
        "sha256": "6d12e11622df7387a38ceee5e1f7719485ed1dbeb7ac54042be9b96072c59ebc"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-contrast-390x844-dpr2-astylar.json",
        "sha256": "d7e46b20111d0f205906740c96ae56991fc47c52e992fc0a622fc8e962956391"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-custom-1440x1000-dpr1-reference.json",
        "sha256": "5fd2f23e8090accc8f98fdc9f7b3c374b3ac2e3ecfb51f3b7fd6e52892c733c8"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-custom-1440x1000-dpr1-astylar.json",
        "sha256": "f71d26852cd6131f2badbbb1a12f7295b8a5ecac9c5df77bd797c245a3e21cfe"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-custom-768x1024-dpr1-reference.json",
        "sha256": "7e96c539d0fc71aeb6ff75f54caa1d5bccf48a7abbf16958d5189b777534f51e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-custom-768x1024-dpr1-astylar.json",
        "sha256": "2a263082e47e7f53e8ccc058c1d39cd3d7fdcac53e8dc8d5ddaa621b490cf35e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-custom-390x844-dpr2-reference.json",
        "sha256": "3fb29701aa653dc8ab1a8a3929f78e986215a39aadb7ebbe10b78e6d7675efda"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/paginator-custom-390x844-dpr2-astylar.json",
        "sha256": "4b6e89cfd6fa997a81bbae8285a84dd5fb4236a62ec1458da6ad8b087da6bc7d"
      }
    ],
    "boundary": "Twelve static pairs per family and initial/current executed authoring. Not all AX properties,keyboard/event behavior,AT traversal,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "fixture-timepicker-trigger-popup-metadata-substitution",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "      \\{ type: 'div', id: `\\$\\{family\\}-input-region`, class: 'field-input-region', children: \\[\\{ type: 'input', inputType: 'text', id: `\\$\\{family\\}-control`, class: `field-control\\$\\{family === 'timepicker' \\? ' picker-control' : ''\\}\\$\\{family === 'timepicker' && state\\.open \\? ' open' : ''\\}`, value: '', disabled: state\\.disabled, role: family === 'timepicker' \\? 'combobox' : undefined, ariaLabel: family === 'datepicker' \\? 'Due date' : 'Meeting time', ariaInvalid: state\\.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' \\? state\\.open : undefined, ariaControls: family === 'timepicker' \\? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state\\.open \\? 'timepicker-option-0' : undefined \\}\\] \\},",
    "introducedBy": "Initial2f440115 already authors dialog popup;7159b1d5 replaces presentation icon with the current differently named button lacking popup/expanded metadata. Historical runtime/motive unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material timepicker combobox and toggle semantic metadata authoring",
    "focusedProof": "node scripts/review-picker-semantic-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "select": {
            "type": "input",
            "inputType": "text",
            "id": "select-control",
            "class": "field-control select-control",
            "value": "Team",
            "readonly": true,
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Plan",
            "ariaInvalid": false,
            "ariaExpanded": false,
            "ariaControls": "select-options"
          },
          "timeInput": {
            "type": "input",
            "inputType": "text",
            "id": "timepicker-control",
            "class": "field-control picker-control",
            "value": "",
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Meeting time",
            "ariaInvalid": false,
            "ariaHaspopup": "dialog",
            "ariaExpanded": false,
            "ariaControls": "timepicker-options"
          },
          "timeIcon": {
            "type": "span",
            "id": "timepicker-icon",
            "class": "picker-clock",
            "role": "presentation",
            "textContent": "◷"
          },
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
          "excerpts": {
            "select": "        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',",
            "time": "      { type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined },"
          }
        }
      },
      {
        "revision": "3c9306001df98a1423876f122057c5db56b63e2c",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "8ec3cf91ea249914b31112f6c249d7cff70f2ad13873a754b51cd45e396f2aaa",
        "observation": {
          "select": {
            "type": "input",
            "inputType": "text",
            "id": "select-control",
            "class": "field-control select-control",
            "value": "Team",
            "readonly": true,
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Plan",
            "ariaInvalid": false,
            "ariaExpanded": false,
            "ariaControls": "select-options"
          },
          "timeInput": {
            "type": "input",
            "inputType": "text",
            "id": "timepicker-control",
            "class": "field-control picker-control",
            "value": "",
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Meeting time",
            "ariaInvalid": false,
            "ariaHaspopup": "dialog",
            "ariaExpanded": false,
            "ariaControls": "timepicker-options"
          },
          "timeIcon": {
            "type": "span",
            "id": "timepicker-icon",
            "class": "picker-clock",
            "role": "presentation",
            "textContent": "◷"
          },
          "wholeMethodSha256": "90a6f2bb1c3b94e73a615a2bf3b01693e395cc537b1c4c5c4ca64e97204a2b46",
          "excerpts": {
            "select": "        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',",
            "time": "      { type: 'div', id: `${family}-input-region`, class: 'field-input-region', children: [{ type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined }] },"
          }
        }
      },
      {
        "revision": "7159b1d5266ed4bc03b56581b8034526abae892b",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "8835dc9714940ff55cb5d926a72df4dd6af5c3bf1683dec360926440c5120e0e",
        "observation": {
          "select": {
            "type": "input",
            "inputType": "text",
            "id": "select-control",
            "class": "field-control select-control",
            "value": "Team",
            "readonly": true,
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Plan",
            "ariaInvalid": false,
            "ariaExpanded": false,
            "ariaControls": "select-options"
          },
          "timeInput": {
            "type": "input",
            "inputType": "text",
            "id": "timepicker-control",
            "class": "field-control picker-control",
            "value": "",
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Meeting time",
            "ariaInvalid": false,
            "ariaHaspopup": "dialog",
            "ariaExpanded": false,
            "ariaControls": "timepicker-options"
          },
          "timeIcon": {
            "type": "button",
            "id": "timepicker-icon",
            "class": "picker-clock",
            "ariaLabel": "Open time options",
            "value": "◷"
          },
          "wholeMethodSha256": "7bf8a0426b0b1a2dbf86720553306d1419ff987357fababeac6a483d9d156005",
          "excerpts": {
            "select": "        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',",
            "time": "      { type: 'div', id: `${family}-input-region`, class: 'field-input-region', children: [{ type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined }] },"
          }
        }
      }
    ],
    "observation": {
      "component": "timepicker",
      "staticPairs": 12,
      "property": "semantic control kind/popup metadata",
      "reference": "input/listbox popup;toggle Open timepicker options+hasPopup listbox+expanded false",
      "astylar": "input/dialog popup;toggle Open time options without popup/expanded metadata",
      "stage": "authored SiteData before semantic projection"
    },
    "justification": "All12 actual static pairs expose metadata matching the unequal authored inputs. Complete current/initial and exact icon-introduction parent/child methods execute with these values. Public fields are supported by the fully bound current/installed/pinned bridge. This is not a reason to change datepicker metadata or merge time/date focus behavior.",
    "recommendation": "Preserve native timepicker-specific popup kind and toggle metadata in future fixture correction,without changing datepicker behavior or tuning popup coordinates.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-light-1440x1000-dpr1-reference.json",
        "sha256": "a39bb8ee9467ded400de5311a7526a49cb1dd1d265ebcc1763e48443c686f431"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-light-1440x1000-dpr1-astylar.json",
        "sha256": "2e02586f4c2526906ed2f693f57f8f7dc9ba580e91b6f1ab8a5b7c8112a06f1f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-light-768x1024-dpr1-reference.json",
        "sha256": "e1d984b90215ea3ad741dc6734752868a7100d41384147e977e308b6a1411d6b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-light-768x1024-dpr1-astylar.json",
        "sha256": "975421c8c20e14041e17c27f591dbaf75ea35b7f7c1b0f361245503ed1029743"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-light-390x844-dpr2-reference.json",
        "sha256": "d69a14cc3f2d1810417403e29167754fff4847aa4d815a1ac74320e600a85272"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-light-390x844-dpr2-astylar.json",
        "sha256": "e4e9d77982046d4827221b386a5890d5efee81b04716d84865b368929676da7f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-dark-1440x1000-dpr1-reference.json",
        "sha256": "3cd18dca7bf45a4cfdc430d7b8b59687553c79865e9cc37e07364cd81aae067b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-dark-1440x1000-dpr1-astylar.json",
        "sha256": "8d525ee98e8e341b85a41224ecf40be263eae566a0ae103096bbfea848c5b682"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-dark-768x1024-dpr1-reference.json",
        "sha256": "4c7e7ec33385591401c1454cfce4df6dbf5d2cab45387ebf2c34256049a164ab"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-dark-768x1024-dpr1-astylar.json",
        "sha256": "6c3e8e603c52e332e5e82a2d6f69909da2072276ded5a3ba31ec094c395921b6"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-dark-390x844-dpr2-reference.json",
        "sha256": "78e747ec32d63f165488a64352819a9480e15fa022b05f7bbaac9263e34daf2b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-dark-390x844-dpr2-astylar.json",
        "sha256": "f3e07e293eed69803d1a7f5668689241b4d2ba9a8f215ab949921dca6fe2f91d"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-contrast-1440x1000-dpr1-reference.json",
        "sha256": "fdaf3578ac7c835036fcae84c4f10a1a5e80701be2739b6fb08cab4168fce053"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "c5df51735dfe50ec88b2c753cfe1583c2e0b3c7d1d9c694a1035db2e1d5fc802"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-contrast-768x1024-dpr1-reference.json",
        "sha256": "bbc93847e31e913b92008f8fab7c28d76d3ca36bff874431f1baa2e01420dd45"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-contrast-768x1024-dpr1-astylar.json",
        "sha256": "21e97ee8268909f9aeb29b6fe16bb3711f53577ff6a01b06afa7aba72d07012b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-contrast-390x844-dpr2-reference.json",
        "sha256": "c744f66bd224f81c7443c9c27e3d27319263bc58b5c8918385b2f77a597f2b88"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-contrast-390x844-dpr2-astylar.json",
        "sha256": "2e744575010181963150ea7dfc9e8e12f18431b4e05817de7a5d5dcfddf5abe8"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-custom-1440x1000-dpr1-reference.json",
        "sha256": "9e371cbe8545eea80cd23e1fa202fde54835cea3ae5838a9c876f5da15e49be5"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-custom-1440x1000-dpr1-astylar.json",
        "sha256": "dadc5356615b8d380c119167e80ae908e8152ddba64d5a607de42dcec4775789"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-custom-768x1024-dpr1-reference.json",
        "sha256": "e6287563b5523adb4059a0723c3e36dab3cd543da2c709cd4fffd8fdbb7785fe"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-custom-768x1024-dpr1-astylar.json",
        "sha256": "c35d5aa01a12ffbce270bf1a6fbd6c005b7bd932f91e6681c0472156cca423b7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-custom-390x844-dpr2-reference.json",
        "sha256": "7c8ceaf29cb7477af7d3216aa9be9e1e0ac50ad2cdeee5409fef5e3552845af6"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/timepicker-custom-390x844-dpr2-astylar.json",
        "sha256": "6781b9cbceecc7e6b2625e9719da9cb358659386299958e090bfa8321005b00b"
      }
    ],
    "boundary": "Twelve static pairs per family,whole authored methods and bounded native Chromium diagnostic. Not all AX relationships,interaction/AT behavior,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "fixture-select-readonly-text-input-replaces-noneditable-host",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',",
    "introducedBy": "Initial2f440115 already uses readonly text input;historical runtime/motive unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material select control semantic element authoring",
    "focusedProof": "node scripts/review-picker-semantic-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "select": {
            "type": "input",
            "inputType": "text",
            "id": "select-control",
            "class": "field-control select-control",
            "value": "Team",
            "readonly": true,
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Plan",
            "ariaInvalid": false,
            "ariaExpanded": false,
            "ariaControls": "select-options"
          },
          "timeInput": {
            "type": "input",
            "inputType": "text",
            "id": "timepicker-control",
            "class": "field-control picker-control",
            "value": "",
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Meeting time",
            "ariaInvalid": false,
            "ariaHaspopup": "dialog",
            "ariaExpanded": false,
            "ariaControls": "timepicker-options"
          },
          "timeIcon": {
            "type": "span",
            "id": "timepicker-icon",
            "class": "picker-clock",
            "role": "presentation",
            "textContent": "◷"
          },
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
          "excerpts": {
            "select": "        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',",
            "time": "      { type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined },"
          }
        }
      },
      {
        "revision": "3c9306001df98a1423876f122057c5db56b63e2c",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "8ec3cf91ea249914b31112f6c249d7cff70f2ad13873a754b51cd45e396f2aaa",
        "observation": {
          "select": {
            "type": "input",
            "inputType": "text",
            "id": "select-control",
            "class": "field-control select-control",
            "value": "Team",
            "readonly": true,
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Plan",
            "ariaInvalid": false,
            "ariaExpanded": false,
            "ariaControls": "select-options"
          },
          "timeInput": {
            "type": "input",
            "inputType": "text",
            "id": "timepicker-control",
            "class": "field-control picker-control",
            "value": "",
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Meeting time",
            "ariaInvalid": false,
            "ariaHaspopup": "dialog",
            "ariaExpanded": false,
            "ariaControls": "timepicker-options"
          },
          "timeIcon": {
            "type": "span",
            "id": "timepicker-icon",
            "class": "picker-clock",
            "role": "presentation",
            "textContent": "◷"
          },
          "wholeMethodSha256": "90a6f2bb1c3b94e73a615a2bf3b01693e395cc537b1c4c5c4ca64e97204a2b46",
          "excerpts": {
            "select": "        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',",
            "time": "      { type: 'div', id: `${family}-input-region`, class: 'field-input-region', children: [{ type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined }] },"
          }
        }
      },
      {
        "revision": "7159b1d5266ed4bc03b56581b8034526abae892b",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "8835dc9714940ff55cb5d926a72df4dd6af5c3bf1683dec360926440c5120e0e",
        "observation": {
          "select": {
            "type": "input",
            "inputType": "text",
            "id": "select-control",
            "class": "field-control select-control",
            "value": "Team",
            "readonly": true,
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Plan",
            "ariaInvalid": false,
            "ariaExpanded": false,
            "ariaControls": "select-options"
          },
          "timeInput": {
            "type": "input",
            "inputType": "text",
            "id": "timepicker-control",
            "class": "field-control picker-control",
            "value": "",
            "disabled": false,
            "role": "combobox",
            "ariaLabel": "Meeting time",
            "ariaInvalid": false,
            "ariaHaspopup": "dialog",
            "ariaExpanded": false,
            "ariaControls": "timepicker-options"
          },
          "timeIcon": {
            "type": "button",
            "id": "timepicker-icon",
            "class": "picker-clock",
            "ariaLabel": "Open time options",
            "value": "◷"
          },
          "wholeMethodSha256": "7bf8a0426b0b1a2dbf86720553306d1419ff987357fababeac6a483d9d156005",
          "excerpts": {
            "select": "        type: 'input', inputType: 'text', id: 'select-control', class: 'field-control select-control',",
            "time": "      { type: 'div', id: `${family}-input-region`, class: 'field-input-region', children: [{ type: 'input', inputType: 'text', id: `${family}-control`, class: `field-control${family === 'timepicker' ? ' picker-control' : ''}${family === 'timepicker' && state.open ? ' open' : ''}`, value: '', disabled: state.disabled, role: family === 'timepicker' ? 'combobox' : undefined, ariaLabel: family === 'datepicker' ? 'Due date' : 'Meeting time', ariaInvalid: state.error, ariaHaspopup: 'dialog', ariaExpanded: family === 'timepicker' ? state.open : undefined, ariaControls: family === 'timepicker' ? 'timepicker-options' : undefined, ariaActivedescendant: family === 'timepicker' && state.open ? 'timepicker-option-0' : undefined }] },"
          }
        }
      }
    ],
    "observation": {
      "component": "select",
      "staticPairs": 12,
      "property": "semantic control kind/popup metadata",
      "reference": "non-text MAT-SELECT combobox host;no AX editable property",
      "astylar": "readonly text INPUT combobox;AX editable plaintext",
      "stage": "authored SiteData before semantic projection"
    },
    "justification": "All12 paired backend controls have different semantic element kinds before projection. Candidate readonly is present in actual DOM,not dropped. A native same-Chromium control reproduces editable=plaintext on readonly text input while typed X does not change its value;generic non-text combobox has no editable property. Do not infer a readonly bridge failure from this AX token. Known core readonly-keyboard defaults remain a distinct finding;this probe does not test AstylarUI keyboard behavior.",
    "recommendation": "Review reference-equivalent noneditable semantic control composition at the fixture boundary in future implementation. Do not remove readonly,normalize away AX differences or change core editable reporting to mimic a different authored element.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/readonly-combobox-native-probe-20261022.log",
        "sha256": "a17e34c1af636aa40c829e805dbee0d4b04cebb1cbe8cdd02484710bef3c73b7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-light-1440x1000-dpr1-reference.json",
        "sha256": "b1a3a2bc9720ac31f02d8f64fb20487075e5466f3fe51016cb22401773de8164"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-light-1440x1000-dpr1-astylar.json",
        "sha256": "8e9a714397e93251c11f4f6dae40640bfb3d58278e941d4787014d7de2469721"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-light-768x1024-dpr1-reference.json",
        "sha256": "0b1aa6508d736fbe55f1e743e5bab311a2fc65b4e5c4561d3ae7adf31157f007"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-light-768x1024-dpr1-astylar.json",
        "sha256": "dd27151a65a3dd22b767f27d0545269645ee26a68ab98d911490763aea74b66b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-light-390x844-dpr2-reference.json",
        "sha256": "8e4a6b763ffdc2f1ba2ddb3b698a516f9c9ebbcf2d0827ca4ebfc195eded5723"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-light-390x844-dpr2-astylar.json",
        "sha256": "5d85da9d2a43ab1ac5fe07f7362708b551c5dd4f91af5bef8fa723b06e9d65cc"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-dark-1440x1000-dpr1-reference.json",
        "sha256": "5bc316bc12d8abcdf99d5c7e2bdb14665977134090caabddb348dcc8834fa1db"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-dark-1440x1000-dpr1-astylar.json",
        "sha256": "718c2d9f63d6491f4861829d65d0a524a0ba44b73754582f039f59a7127f3081"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-dark-768x1024-dpr1-reference.json",
        "sha256": "f286dc888013d4c21eca7ca70cae722a4e1267d745164e70c191477b562305a2"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-dark-768x1024-dpr1-astylar.json",
        "sha256": "0b5c564d1587b6d0a6401c5f561e053589fa57fc7d5bfcbeee367443466bafef"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-dark-390x844-dpr2-reference.json",
        "sha256": "46d943fb5d44d55e5c0b841db029fdeefee1720fe0308a651dfb3f0311142cb7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-dark-390x844-dpr2-astylar.json",
        "sha256": "842d33a32253fb8651ada4641abf1a5e3fcff3308ae0b85ab6540dc2f86eaf91"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-contrast-1440x1000-dpr1-reference.json",
        "sha256": "8e9b0b6bab273c5cf2d5029b1879bd36e96d5be8b8e721f88d41c22270e56834"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "cf3443bed26f8c1426a738eeaa17b801519da2047dcf0d1c4a65b4784b7d122e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-contrast-768x1024-dpr1-reference.json",
        "sha256": "e5799dad7e828b6f0fbe3280751759b2f1330b2e77ca7cfcacb95b76d461aca8"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-contrast-768x1024-dpr1-astylar.json",
        "sha256": "f252a7725aeb1fd0dd11620f6034cdd3f5c44c82c3a4ff8c6fb530236cbe8559"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-contrast-390x844-dpr2-reference.json",
        "sha256": "27f59e7b73ce14cbb5e7bd0754d38279c072aa6a7c1478693f91a58aac54f327"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-contrast-390x844-dpr2-astylar.json",
        "sha256": "ea43049ea914401215ce09a3b3d465aeb461626e69f17778be4b01c5f87bddb6"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-custom-1440x1000-dpr1-reference.json",
        "sha256": "5bf295a163b5c92da9dcebe611b01be15aec8a8bf8f019402eaeaf36f99fbc6e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-custom-1440x1000-dpr1-astylar.json",
        "sha256": "5d01a08293f644573302c901317642dec4e1f812f38fbcbb9e78a3ed8e289f48"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-custom-768x1024-dpr1-reference.json",
        "sha256": "251501fb4395e4e5b2e17cd3c85c8bf4c5a1ffa38e1ecbe09c9e9c9862176942"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-custom-768x1024-dpr1-astylar.json",
        "sha256": "71852bd3f0c20faaf17cdb2521ea7498d57a428c1b661090c8f5d8d716a598fc"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-custom-390x844-dpr2-reference.json",
        "sha256": "f8941cbc8d1062fea4d8ba6d0ab8848157bdc882b6741bbe742285116c1e9799"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/select-custom-390x844-dpr2-astylar.json",
        "sha256": "b08bb035dbc8de3c383312d8e5f4733cd14036b41dad65b561bce080921b8caf"
      }
    ],
    "boundary": "Twelve static pairs per family,whole authored methods and bounded native Chromium diagnostic. Not all AX relationships,interaction/AT behavior,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "fixture-radio-native-input-group-replaced-by-role-divs",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "      \\{ type: 'div', id: 'radio-solo', class: 'radio-option', role: 'radio', tabindex: state\\.selected \\? -1 : 0, ariaChecked: !state\\.selected, ariaDisabled: state\\.disabled, children: \\[\\{ type: 'span', id: 'radio-solo-state-layer', class: `radio-state-layer\\$\\{state\\.selected \\? '' : ' selected'\\}` \\}, \\{ type: 'span', id: 'radio-solo-ring', class: `radio-ring\\$\\{state\\.selected \\? '' : ' selected'\\}`, children: state\\.selected \\? \\[\\] : \\[\\{ type: 'span', id: 'radio-solo-dot', class: 'radio-dot' \\}\\] \\}, \\{ type: 'span', id: 'radio-solo-label', class: 'radio-label', textContent: 'Solo' \\}\\] \\},",
    "introducedBy": "Initial2f440115 already authors the role-DIV representation;historical runtime/motive unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material radio native input/group/value and label composition authoring",
    "focusedProof": "node scripts/review-checkable-semantic-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "states": [
            {
              "family": "checkbox",
              "selected": false,
              "controls": [
                {
                  "type": "input",
                  "inputType": "checkbox",
                  "id": "checkbox-primary",
                  "checked": false,
                  "disabled": false,
                  "ariaLabel": "Include archived"
                }
              ]
            },
            {
              "family": "radio",
              "selected": false,
              "controls": [
                {
                  "type": "div",
                  "id": "radio-solo",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": 0,
                  "ariaChecked": true,
                  "ariaDisabled": false
                },
                {
                  "type": "div",
                  "id": "radio-team",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": -1,
                  "ariaChecked": false,
                  "ariaDisabled": false
                }
              ]
            },
            {
              "family": "slide-toggle",
              "selected": false,
              "controls": [
                {
                  "type": "div",
                  "id": "slide-toggle-primary",
                  "role": "switch",
                  "tabindex": 0,
                  "ariaLabel": "Automatic updates",
                  "ariaChecked": false,
                  "ariaDisabled": false
                }
              ]
            },
            {
              "family": "checkbox",
              "selected": true,
              "controls": [
                {
                  "type": "input",
                  "inputType": "checkbox",
                  "id": "checkbox-primary",
                  "checked": true,
                  "disabled": false,
                  "ariaLabel": "Include archived"
                }
              ]
            },
            {
              "family": "radio",
              "selected": true,
              "controls": [
                {
                  "type": "div",
                  "id": "radio-solo",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": -1,
                  "ariaChecked": false,
                  "ariaDisabled": false
                },
                {
                  "type": "div",
                  "id": "radio-team",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": 0,
                  "ariaChecked": true,
                  "ariaDisabled": false
                }
              ]
            },
            {
              "family": "slide-toggle",
              "selected": true,
              "controls": [
                {
                  "type": "div",
                  "id": "slide-toggle-primary",
                  "role": "switch",
                  "tabindex": 0,
                  "ariaLabel": "Automatic updates",
                  "ariaChecked": true,
                  "ariaDisabled": false
                }
              ]
            }
          ],
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
          "wholeHelperHashes": [],
          "excerpts": {
            "radio": "      { type: 'div', id: 'radio-solo', class: 'radio-option', role: 'radio', tabindex: state.selected ? -1 : 0, ariaChecked: !state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'radio-solo-ring', class: `radio-ring${state.selected ? '' : ' selected'}`, children: state.selected ? [] : [{ type: 'span', id: 'radio-solo-dot', class: 'radio-dot' }] }, { type: 'span', id: 'radio-solo-label', class: 'radio-label', textContent: 'Solo' }] },",
            "slide-toggle": "    if (family === 'slide-toggle') return [{ type: 'div', id: 'slide-toggle-primary', role: 'switch', tabindex: state.disabled ? -1 : 0, ariaLabel: 'Automatic updates', ariaChecked: state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'slide-toggle-track', class: 'switch-track', children: [{ type: 'span', id: 'slide-toggle-thumb', class: 'switch-thumb', textContent: state.selected ? '✓' : '' }] }, { type: 'span', id: 'slide-toggle-label', class: 'switch-label', textContent: 'Automatic updates' }] }];"
          }
        }
      }
    ],
    "observation": {
      "component": "radio",
      "staticPairs": 12,
      "property": "native semantic control and label/form metadata",
      "reference": "native radio inputs with shared name,solo/team values,HTML labels and explicit aria-invalid=false",
      "astylar": "role-radio DIVs with ariaChecked,no form name/value and content naming",
      "stage": "authored control kind and metadata before projection"
    },
    "justification": "All12 enabled static pairs preserve names/checked state but expose the different primitive,validity and label association inputs. Complete current/initial family methods execute both selected states with actual selectionMark helper when present. Supported native types/control fields and fully bound current/installed/pinned projection distinguish application composition from a proven core projection failure. Native defaults and explicit reference aria-invalid metadata remain recorded separately;no form-submission,disabled-focus or keyboard outcome is inferred from static AX.",
    "recommendation": "Preserve reference-equivalent native input/group/value/label intent in future fixture correction. Retain the separate public native-checkable value-label core failure rather than masking it with role-DIV authoring or fabricated ARIA defaults.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-light-1440x1000-dpr1-reference.json",
        "sha256": "24277201818809655b3431a731c1d0f7c89a7e7a0fed399dc78daa1957c52707"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-light-1440x1000-dpr1-astylar.json",
        "sha256": "269f33cac56463d195a8f6fd2a9f543ea44ddbfd5a8bb6aac9842819b37e28b1"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-light-768x1024-dpr1-reference.json",
        "sha256": "95f5d127a40721d8e27cd38d2d656277d2d422a8ae16ac56aa5aa22df6d5399a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-light-768x1024-dpr1-astylar.json",
        "sha256": "8acdcca526350630ed8f433165d8b6675962cbeb8410ee4ac58b3b0bab59595f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-light-390x844-dpr2-reference.json",
        "sha256": "2e9646344282dc010a3e330c8cd3f6ce0893512402f8ac1a2cc6ce3e8dd31a8e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-light-390x844-dpr2-astylar.json",
        "sha256": "888e224863f5f6b6ab1ef8a28030480676b244e5de778b8fb4858790aac56e94"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-dark-1440x1000-dpr1-reference.json",
        "sha256": "bf99210dde0c6cb744473fd6a4842489b116de5041573b7b5bb42c15ab95d8a9"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-dark-1440x1000-dpr1-astylar.json",
        "sha256": "05e707c74a7ddd5627cb6343627456a90647c455a525508abbee51665a6d3fe9"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-dark-768x1024-dpr1-reference.json",
        "sha256": "eb4ad6773b9a400ee7486e0cac1970ef0e54e7eeb26d42480bb241e644a57111"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-dark-768x1024-dpr1-astylar.json",
        "sha256": "258209d88f2b71e84a14b6fb587224b6639299438cf1f53755c5c4fac160213b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-dark-390x844-dpr2-reference.json",
        "sha256": "2cf2abeb99fea8e647afb1ff4515f064afcdabb68aa479da9786aaaa267cd3ed"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-dark-390x844-dpr2-astylar.json",
        "sha256": "63095661463e09f14f71ba11858b273ca1ff9d39c71c80c8c5dab8ca43351c88"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-contrast-1440x1000-dpr1-reference.json",
        "sha256": "5be2796e9b552220e46826e38c2cac891f0bc14ae8814a374e7acee89c84a0a7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "892418438b170599ad390a4780db98c2971da969333d57de49fbf74bd09d94b6"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-contrast-768x1024-dpr1-reference.json",
        "sha256": "9b2d645ff5679cc2009c394b090189c5745518d3444021f9169f16b98e3a8bde"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-contrast-768x1024-dpr1-astylar.json",
        "sha256": "8e15622ee7732289549f33a655c9dea8a204ba9a2bb1ee1b1ee337c1a8e14356"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-contrast-390x844-dpr2-reference.json",
        "sha256": "7757599b7bd40e8313bcab4353387a0ff62b6d2c5823b9aa5b490f9f853617f2"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-contrast-390x844-dpr2-astylar.json",
        "sha256": "dfaec37900b44492b4025acc789c8daff5a5d4abdd01e26a2788ed6f6adca4b3"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-custom-1440x1000-dpr1-reference.json",
        "sha256": "22f062c71ac1069aa6903f838e7352154bfbe48a1a28e63166a407e0c3d24ddd"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-custom-1440x1000-dpr1-astylar.json",
        "sha256": "f0e157dd163dcfe70582690c1a2b5b5b992ca5c5c0e15b29b665afe4581daf77"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-custom-768x1024-dpr1-reference.json",
        "sha256": "30403ba4b76af861414afb20f6478271eee6380f98a1046be73070bbef1ffa0b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-custom-768x1024-dpr1-astylar.json",
        "sha256": "8053414c3f1d92b2f93eafc279bd697408414de10ef6ce678190d5ac5f182da0"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-custom-390x844-dpr2-reference.json",
        "sha256": "6ea9835d4d0f7828c21558fcc69ae25d3fb11280bed49a0a5daaff11fafe9660"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/radio-custom-390x844-dpr2-astylar.json",
        "sha256": "2677a03abafb17b3c8bf194689533a49b925ae83e0184a27091bc7bcfd8ded31"
      }
    ],
    "boundary": "Twelve enabled static pairs per new finding and initial/current executed authoring. Checkbox reuses its existing cause/history separately. Not full control/form behavior,all disabled states,AT,paint,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "fixture-switch-native-button-replaced-by-role-div",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "    if \\(family === 'slide-toggle'\\) return \\[\\{ type: 'div', id: 'slide-toggle-primary', role: 'switch', tabindex: state\\.disabled \\? -1 : 0, ariaLabel: 'Automatic updates', ariaChecked: state\\.selected, ariaDisabled: state\\.disabled, children: \\[",
    "introducedBy": "Initial2f440115 already authors the role-DIV representation;historical runtime/motive unproven.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material switch native button and label composition authoring",
    "focusedProof": "node scripts/review-checkable-semantic-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "states": [
            {
              "family": "checkbox",
              "selected": false,
              "controls": [
                {
                  "type": "input",
                  "inputType": "checkbox",
                  "id": "checkbox-primary",
                  "checked": false,
                  "disabled": false,
                  "ariaLabel": "Include archived"
                }
              ]
            },
            {
              "family": "radio",
              "selected": false,
              "controls": [
                {
                  "type": "div",
                  "id": "radio-solo",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": 0,
                  "ariaChecked": true,
                  "ariaDisabled": false
                },
                {
                  "type": "div",
                  "id": "radio-team",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": -1,
                  "ariaChecked": false,
                  "ariaDisabled": false
                }
              ]
            },
            {
              "family": "slide-toggle",
              "selected": false,
              "controls": [
                {
                  "type": "div",
                  "id": "slide-toggle-primary",
                  "role": "switch",
                  "tabindex": 0,
                  "ariaLabel": "Automatic updates",
                  "ariaChecked": false,
                  "ariaDisabled": false
                }
              ]
            },
            {
              "family": "checkbox",
              "selected": true,
              "controls": [
                {
                  "type": "input",
                  "inputType": "checkbox",
                  "id": "checkbox-primary",
                  "checked": true,
                  "disabled": false,
                  "ariaLabel": "Include archived"
                }
              ]
            },
            {
              "family": "radio",
              "selected": true,
              "controls": [
                {
                  "type": "div",
                  "id": "radio-solo",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": -1,
                  "ariaChecked": false,
                  "ariaDisabled": false
                },
                {
                  "type": "div",
                  "id": "radio-team",
                  "class": "radio-option",
                  "role": "radio",
                  "tabindex": 0,
                  "ariaChecked": true,
                  "ariaDisabled": false
                }
              ]
            },
            {
              "family": "slide-toggle",
              "selected": true,
              "controls": [
                {
                  "type": "div",
                  "id": "slide-toggle-primary",
                  "role": "switch",
                  "tabindex": 0,
                  "ariaLabel": "Automatic updates",
                  "ariaChecked": true,
                  "ariaDisabled": false
                }
              ]
            }
          ],
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
          "wholeHelperHashes": [],
          "excerpts": {
            "radio": "      { type: 'div', id: 'radio-solo', class: 'radio-option', role: 'radio', tabindex: state.selected ? -1 : 0, ariaChecked: !state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'radio-solo-ring', class: `radio-ring${state.selected ? '' : ' selected'}`, children: state.selected ? [] : [{ type: 'span', id: 'radio-solo-dot', class: 'radio-dot' }] }, { type: 'span', id: 'radio-solo-label', class: 'radio-label', textContent: 'Solo' }] },",
            "slide-toggle": "    if (family === 'slide-toggle') return [{ type: 'div', id: 'slide-toggle-primary', role: 'switch', tabindex: state.disabled ? -1 : 0, ariaLabel: 'Automatic updates', ariaChecked: state.selected, ariaDisabled: state.disabled, children: [{ type: 'span', id: 'slide-toggle-track', class: 'switch-track', children: [{ type: 'span', id: 'slide-toggle-thumb', class: 'switch-thumb', textContent: state.selected ? '✓' : '' }] }, { type: 'span', id: 'slide-toggle-label', class: 'switch-label', textContent: 'Automatic updates' }] }];"
          }
        }
      }
    ],
    "observation": {
      "component": "slide-toggle",
      "staticPairs": 12,
      "property": "native semantic control and label/form metadata",
      "reference": "native BUTTON role switch with associated HTML label",
      "astylar": "DIV role switch with direct ariaLabel and ariaChecked",
      "stage": "authored control kind and metadata before projection"
    },
    "justification": "All12 enabled static pairs preserve names/checked state but expose the different primitive,validity and label association inputs. Complete current/initial family methods execute both selected states with actual selectionMark helper when present. Supported native types/control fields and fully bound current/installed/pinned projection distinguish application composition from a proven core projection failure. Native defaults and explicit reference aria-invalid metadata remain recorded separately;no form-submission,disabled-focus or keyboard outcome is inferred from static AX.",
    "recommendation": "Preserve reference-equivalent button/label intent in future fixture correction. Do not turn generic role widgets into native form controls through core special cases or add offsets to hide the structural input difference.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log",
        "sha256": "2f130ff825b7885e0c7d0a35eaea849d6560bc486cb88ee033899966e7bc7aaf"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-light-1440x1000-dpr1-reference.json",
        "sha256": "94dba97c05ab9c695c99cb0940581ce8529415fccac47470ac0d0ad4323e2b94"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-light-1440x1000-dpr1-astylar.json",
        "sha256": "f423d8a969e70dd3a96227567f6db8c0eaea68274d5ec6c2823fd23d6504a3f6"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-light-768x1024-dpr1-reference.json",
        "sha256": "6de88cdbca7534ee2fdf92e1bd0c08d4c4e9f13b3c05f0b55bf839eace472467"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-light-768x1024-dpr1-astylar.json",
        "sha256": "1a25c8b5698dab01afedf7810bbe7d4956cdbaad39035d996e956821430ba11e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-light-390x844-dpr2-reference.json",
        "sha256": "6ce5eab92f6dbe3e7f8d4ffe28d84012f1567c68a639d07ab91c3be98ba0d5b1"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-light-390x844-dpr2-astylar.json",
        "sha256": "29eed3d3991a4145044b2cc6e07ccaa501115cea75c4362bd8df3fc5551d273a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-dark-1440x1000-dpr1-reference.json",
        "sha256": "2e454381c17c6dccd6aba2d9ba396a2bbf330c310a66d1ce4d24f53e7d4a6afb"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-dark-1440x1000-dpr1-astylar.json",
        "sha256": "709fbd5988f74ef03f12caa47cd3415669afe8330895a481285dcddd93fd6fbe"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-dark-768x1024-dpr1-reference.json",
        "sha256": "4b0e3cf0a3efbc7b7afb4d69bd07063c51511f683f1d61e9f0d9c62b9b4d1feb"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-dark-768x1024-dpr1-astylar.json",
        "sha256": "b7e1691d0d1cd31bdf295a40dfe2554d6685b82976ff5c1b9a2f185479cebd34"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-dark-390x844-dpr2-reference.json",
        "sha256": "145b5e6e04944b544420c6f39471d8306fd25176bbf638752d50ddc2ebabc556"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-dark-390x844-dpr2-astylar.json",
        "sha256": "b0198b0cbffa0a94f647927767bd604c126ecd004d1ba848e5ba4abdafce125b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-contrast-1440x1000-dpr1-reference.json",
        "sha256": "b420851e60dfeeac533d74aaef69a9f903f4174a8394ef3436bbf3a52a9f5511"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "f69c972cd259885c610e770324981568b01311b69f456cef35dcb2322d4558e8"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-contrast-768x1024-dpr1-reference.json",
        "sha256": "2a3befe927978eafc93e4e6ac3bf3b8bdd47b230f1f8dce5ba69f81ee0bc1c81"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-contrast-768x1024-dpr1-astylar.json",
        "sha256": "75dca95d96945a21206792faceecac775c635f6d5ca9fe7e9964e435e1d45f1a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-contrast-390x844-dpr2-reference.json",
        "sha256": "2eb2598c5c3e348bd4c19798cfb0ca2e80a3f508a6ea937cd521af14ba715dd0"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-contrast-390x844-dpr2-astylar.json",
        "sha256": "7c38bd3e8377aa9547dc9633adfe6a0bb2a9777644daf2975ff7ffe094b744b0"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-custom-1440x1000-dpr1-reference.json",
        "sha256": "b46b951d852f7b96ee8093a94997f6a99bd95473d6498f69f41e1559cd8edf7c"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-custom-1440x1000-dpr1-astylar.json",
        "sha256": "30e80ce473f3cba6986d4a055b65accbaf7b6e3285b0f6c69ecf478d861cfa28"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-custom-768x1024-dpr1-reference.json",
        "sha256": "d738da55bf5a629123a4fb5b23836addaaeedbc6b5fc967a673cf22b6479ce2f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-custom-768x1024-dpr1-astylar.json",
        "sha256": "1f260befb178940c9eadeee189ab3a5efdac9e03b4d2bc0df46b342d32c12358"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-custom-390x844-dpr2-reference.json",
        "sha256": "b1908b6831535f88520d75aaffc40a13aafb33d59bc6203a6cf6c94a313a06de"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/slide-toggle-custom-390x844-dpr2-astylar.json",
        "sha256": "8043b15cb28ea5f7498e533ada0c5055b965106d92221bfc68fc9ea1cd2eb27e"
      }
    ],
    "boundary": "Twelve enabled static pairs per new finding and initial/current executed authoring. Checkbox reuses its existing cause/history separately. Not full control/form behavior,all disabled states,AT,paint,current whole rendering or case closure."
  }),
  Object.freeze({
    "id": "core-hidden-referenced-description-targets-pruned",
    "file": "src/lib/astylar-semantic-bridge.ts",
    "pattern": "\\.filter\\(\\(element\\) => !element\\.hidden\\)|if \\(child\\.hidden\\) continue;",
    "introducedBy": "Current hidden-root/child pruning confirmed;first-bad hidden-reference source revision/runtime not established.",
    "classification": "confirmed-core-renderer-defect",
    "owner": "Core semantic graph reconciliation:retention of hidden native ID-reference targets versus ordinary AX exposure",
    "focusedProof": "node scripts/check-public-hidden-description.mjs",
    "publicReproduction": {
      "captureCommand": "node scripts/audit-public-hidden-description.mjs artifacts/material-parity/NEW-UNUSED-DIRECTORY",
      "verification": {
        "file": "artifacts/material-parity/public-hidden-description-verification-20261022.log",
        "sha256": "85d39bc7fd73eeebd436b756a0c19c6ea0c5e223f854cc4dd4a476ca8e740358"
      },
      "verifiedRuns": [
        {
          "file": "artifacts/material-parity/public-hidden-description-20261022/latest-report.json",
          "sha256": "77c303e3898c98c4725224e182a3093ec1f927526df13b918040a15e34868d73"
        },
        {
          "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/latest-report.json",
          "sha256": "5597c93a23e286861d149bfc9d61bbe8f6fbe9ea5a5a1f7ffe048ff910745f7f"
        }
      ],
      "packageEntry": "astylarui",
      "authoredInputsEqualPerPair": true,
      "applicationPlugins": false,
      "publicDeclarations": [
        {
          "file": "examples/material-showcase/node_modules/astylarui/dist/lib/lib/index.d.ts",
          "sha256": "cec7c69ce58df53f195e5e9e1602f0a1b7ad5e5220bf2e3330856f9664be8085"
        },
        {
          "file": "examples/material-showcase/node_modules/astylarui/dist/lib/app/types/dom-element.d.ts",
          "sha256": "5b497c3eefb06023ca0e3c088b78eb89e04e4023420d04a094907a933a18c0c0"
        }
      ]
    },
    "observation": {
      "component": "core semantic bridge",
      "property": "aria-describedby to hidden target/root/ancestor",
      "states": [
        "visible-description",
        "hidden-child-target",
        "hidden-root-target",
        "hidden-ancestor"
      ],
      "dpr": [
        1,
        2
      ],
      "independentRuns": 2,
      "captures": 32,
      "reference": "All16 descriptions remain Help info;hidden text not ordinarily exposed",
      "astylar": "Visible-description controls pass;all12 hidden candidate cases lose description and DOM target while reference attribute remains",
      "stage": "Complete hidden authored identity graph reaches reconciliation;root filter/child skip precedes native target creation"
    },
    "justification": "Two independent package-root equal-input runs retain actual AX,DOM target presence,original SiteData and public semantic identity/reconciliation counts. Native reference creates hidden DOM nodes rather than eliding them. Both sides suppress ordinary hidden text;only candidate loses the referenced target and description. Six complete owning methods including child enumeration and ID mapping bind current TS,installed JS and both actual bundles through the existing guarded compiler comparator. The bridge elides hidden roots/children instead of preserving native hidden reference semantics;visible-description controls and101 mutations distinguish unsupported/dropped attributes from target pruning. This is separate from CSS-hidden AX overexposure and from Material fixtures that omit the association entirely.",
    "evidence": [
      {
        "file": "src/lib/astylar-semantic-bridge.ts",
        "sha256": "1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725"
      },
      {
        "file": "src/app/types/dom-element.ts",
        "sha256": "72eef2f09d5cdacaab10db7328c40e5b4748c3f22640e2b40f0436a268351e83"
      },
      {
        "file": "docs/compatibility/capabilities.json",
        "sha256": "7bde70f23f806570bc3eb8b30a627677f11ef26b134e7d57a4d15f943266c0be"
      },
      {
        "file": "scripts/audit-public-hidden-description.mjs",
        "sha256": "00fb39c4816d102e50a8ec127247c0a2d6049ac6b682e893ed474c2ee2ea9e02"
      },
      {
        "file": "scripts/check-public-hidden-description.mjs",
        "sha256": "71039d6688012970db4898c31e3e1c4b85a855de5969a778d175548a8de27433"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-verification-20261022.log",
        "sha256": "85d39bc7fd73eeebd436b756a0c19c6ea0c5e223f854cc4dd4a476ca8e740358"
      },
      {
        "file": "scripts/check-public-native-checkable-value.mjs",
        "sha256": "7f3ff2c868ce9dc6c5eb52ce28f1e5f66db2fcd96e1bfb29bc743c72eb6998fc"
      },
      {
        "file": "scripts/check-public-semantic-css-hidden.mjs",
        "sha256": "8a5679624d560cd1950032c0a956d42847a3d7e1dfa67c4633ce5e296c81437d"
      },
      {
        "file": "examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js",
        "sha256": "7c892095300b0eb8f03a9f38ce421143579a5d90e687e3e80a045b48be8f5aee"
      },
      {
        "file": "examples/material-showcase/node_modules/astylarui/dist/lib/lib/index.d.ts",
        "sha256": "cec7c69ce58df53f195e5e9e1602f0a1b7ad5e5220bf2e3330856f9664be8085"
      },
      {
        "file": "examples/material-showcase/node_modules/astylarui/dist/lib/app/types/dom-element.d.ts",
        "sha256": "5b497c3eefb06023ca0e3c088b78eb89e04e4023420d04a094907a933a18c0c0"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/latest-report.json",
        "sha256": "77c303e3898c98c4725224e182a3093ec1f927526df13b918040a15e34868d73"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/provenance.json",
        "sha256": "a5d04ab0567e7576e8cd7ace4e6b2d721c567d481e95a0e02c98a009f9888e16"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/producer.mjs",
        "sha256": "e37d3c9391c9ad08c8b88e25995e847e0c5a0fa0b64b805313271691773f3b8f"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/audit.js",
        "sha256": "473a16724a4617df58a85f518fbe8b101e471783fbdd67bf04fa347de15a05ca"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/failure.json",
        "sha256": "edbca03503ee93942158c22516b93061d17b55d8e6e187edd3b4d907587dc35e"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/visible-reference-dpr1.json",
        "sha256": "39877a927cc92ff531d425d1bddfc60853cf1cc149544521c4b13c25962f2796"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/visible-astylar-dpr1.json",
        "sha256": "c5679b47b4cac1a887ab99226bcf2abbe797fe3d6aaea46d8fc386a9024b3f5d"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-child-reference-dpr1.json",
        "sha256": "ee829842abaa6d09ac9d2938bd787645ceb26515ad59047d5283512c80691bc3"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-child-astylar-dpr1.json",
        "sha256": "8542f26aa58ee9d06aeb09b9389489f75fbd026a1bb9ee70db7ad30977d87fba"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-root-reference-dpr1.json",
        "sha256": "13fd7cfb62c96f816c0149fb3855ad77ad5681d9e0b3939f49baf5ffd5ccb4e3"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-root-astylar-dpr1.json",
        "sha256": "c6c2cbdc534fd9e2697af14fff5fa68f6f267bbc40b6f9685ed525a963d5988e"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-parent-reference-dpr1.json",
        "sha256": "579f774789e1a1ddf6ba521908791e6ca5fbf5ff210544bc0d8fd633fde8e1d5"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-parent-astylar-dpr1.json",
        "sha256": "f29ae53e564fbad9d66d1a70d2f7d290c36f5e41d4100e174e860135d03cfe16"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/visible-reference-dpr2.json",
        "sha256": "4f828fd631b97d9502a0cc5e669bd2fbcbeab9b4a2f9a9eb06f44ce8ccd7066b"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/visible-astylar-dpr2.json",
        "sha256": "3c3767cc98587a74da9799410a3e86d1922f302f32a856370424f617f128c722"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-child-reference-dpr2.json",
        "sha256": "32161e92fd838e02ad71e77701db3af0603915fc1c58e40ea4b79567f5ea192d"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-child-astylar-dpr2.json",
        "sha256": "8c76ed62fd7c880aab7325f5a0f2d3076e9937ede502d41599426bf6ed731ba2"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-root-reference-dpr2.json",
        "sha256": "55282fce0e949e8d93c0a651ac651d1481776851246cd95f6061155045a4746a"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-root-astylar-dpr2.json",
        "sha256": "8f5f657470ef32fa5e220078e88c4b1716e22712938774f7aabf206d2fa46d7e"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-parent-reference-dpr2.json",
        "sha256": "7217767c31be12458f1bf7599e350b82190f52f01acda3d1cb7fea1f3cd31dc3"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-20261022/hidden-parent-astylar-dpr2.json",
        "sha256": "02b7094d0d26d697496ea6e999f14be2d3e5cd5d68c125e3cb70f04acc5d10f6"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/latest-report.json",
        "sha256": "5597c93a23e286861d149bfc9d61bbe8f6fbe9ea5a5a1f7ffe048ff910745f7f"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/provenance.json",
        "sha256": "479da1013c011165350db83b28e0b4edd2f86142d95b340ced978366a2ef0200"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/producer.mjs",
        "sha256": "e37d3c9391c9ad08c8b88e25995e847e0c5a0fa0b64b805313271691773f3b8f"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/audit.js",
        "sha256": "473a16724a4617df58a85f518fbe8b101e471783fbdd67bf04fa347de15a05ca"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/failure.json",
        "sha256": "cce97748807ae1da516af12102d164a9faff706f8c7035bf8149854a95d3a692"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/visible-reference-dpr1.json",
        "sha256": "adc5d990ec5f1e2758247b1d973408dae59897f360cfd948c5ee2e0924b8a413"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/visible-astylar-dpr1.json",
        "sha256": "2aa663b9a97baaafe41178e7bff268d91d60585364cc02e647a5257d30fd2943"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-child-reference-dpr1.json",
        "sha256": "65afa072bea0a6c77627218d303597211735d7373810238599cbbc9c3cc8e044"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-child-astylar-dpr1.json",
        "sha256": "f0b52da6d186ac52e1df758686aa5ea4e16e96ee58993f5ac276621e43a29990"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-root-reference-dpr1.json",
        "sha256": "34fdff59331e64ab222b50396b714dea2815137851e8bcab32219f08ee144919"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-root-astylar-dpr1.json",
        "sha256": "3d1d6b748f786d6825a8ec6ab718d272df110beb46721368d5aa54aad8aec121"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-parent-reference-dpr1.json",
        "sha256": "ec14b55b685b00675fcfe8e58be2b5f256b9e638586f7dfad596d1030fa9703a"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-parent-astylar-dpr1.json",
        "sha256": "4b4a8698122267b1516d6d5d6c51c1bd4db0688316d0129f3395956839549d13"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/visible-reference-dpr2.json",
        "sha256": "f57e6454651ae26646be3b5d75456ec7160b8fe4ae6fc9d1dd87f6f6c8ef4b3f"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/visible-astylar-dpr2.json",
        "sha256": "1ecfa1baf80bbf1e748bfe0bc625e2bca56e19c779c4c5358155118b5aea2a2c"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-child-reference-dpr2.json",
        "sha256": "a927a08e309c1854e1a2d11ec5c9213b5478e4e3f4d983229c34d9bba547cd6d"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-child-astylar-dpr2.json",
        "sha256": "a261c1ec069fce34c83c9f90c113a3c116e721d65b488d7abeb6a77262e791f9"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-root-reference-dpr2.json",
        "sha256": "a72ba1d25b28203d2da8398977136b1447c9bcdcb78edfcb687646cb6af66755"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-root-astylar-dpr2.json",
        "sha256": "679a13a990cc0540f388e8396cc3cba231931737f6d9ad001af1ab28627759b6"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-parent-reference-dpr2.json",
        "sha256": "cdcb51b2ad21701a69a7f0556ced25efe9b68962b5d4f9734b8b5de1fee245c6"
      },
      {
        "file": "artifacts/material-parity/public-hidden-description-repeat-20261022/hidden-parent-astylar-dpr2.json",
        "sha256": "72243f340fe0287439065241983821b508243faa2949e0647c6ab7b3d5ce17cc"
      }
    ],
    "recommendation": "At the general semantic reconciliation boundary,preserve native hidden ID-reference graph semantics while keeping hidden content out of ordinary exposure,focus and visual layout. Do not remove hiding,copy help text into a different ARIA field,add fixture-specific IDs,modify Material authoring to mask the defect or change coordinate/paint calculations. Add update/removal and other-reference controls before broadening support.",
    "boundary": "Static supported hidden plus ariaDescribedby atDPR1/2 only. Not CSS hiding,ariaLabelledby or all relationships,updates/inherited overrides,AT behavior,Material tooltip/sort causality,paint,current whole rendering or case closure. Historical first-bad execution remains uncertain."
  }),
  Object.freeze({
    "id": "fixture-sort-description-association-omitted",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "type: 'div', id: 'sort-trigger', class:",
    "classification": "application-plugin-authoring-defect",
    "introducedBy": "Initial2f440115 already omits the sort description input;first runtime/motive and public support at that revision are unproven.",
    "owner": "Material sort action-description relationship and target authoring before semantic projection",
    "focusedProof": "node scripts/review-sort-description-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "wholeMethodSha256": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
          "states": [
            {
              "open": false,
              "focused": false,
              "sortTrigger": {
                "type": "button",
                "id": "sort-trigger",
                "ariaSort": "ascending",
                "value": "Sort by name"
              },
              "tooltipAssociation": null
            },
            {
              "open": false,
              "focused": true,
              "sortTrigger": {
                "type": "button",
                "id": "sort-trigger",
                "ariaSort": "ascending",
                "value": "Sort by name"
              },
              "tooltipAssociation": null
            },
            {
              "open": true,
              "focused": false,
              "sortTrigger": {
                "type": "button",
                "id": "sort-trigger",
                "ariaSort": "ascending",
                "value": "Sort by name"
              },
              "tooltipAssociation": "tooltip-popup"
            },
            {
              "open": true,
              "focused": true,
              "sortTrigger": {
                "type": "button",
                "id": "sort-trigger",
                "ariaSort": "ascending",
                "value": "Sort by name"
              },
              "tooltipAssociation": "tooltip-popup"
            }
          ]
        }
      }
    ],
    "observation": {
      "component": "sort",
      "staticPairs": 12,
      "property": "aria-describedby/AX description",
      "reference": "related target resolves;AX description Sort",
      "astylar": "no relationship or Sort help target supplied;AX description absent",
      "stage": "authored SiteData"
    },
    "justification": "All12 pinned static pairs authenticate actual backend DOM/AX association and target identity. Complete initial/current authoring executes across open/focused variants and omits the sort relationship and help target. Complete current familyElements matches the captured source map;reference source also binds. This establishes unequal fixture input before the renderer,not hidden-target pruning or a coordinate defect. The separately demonstrated equal-input hidden-reference core failure remains required and must not be masked when equivalent hidden help is eventually authored. Tooltip static observations reuse its existing persistent-description finding rather than adding a duplicate.",
    "recommendation": "Preserve native action-help intent through the shared public relationship contract in later implementation,after fixing the independently demonstrated core hidden-target behavior. Do not copy help into the accessible name,expose hidden help visually,change reference truth or use placement offsets.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "examples/material-showcase/src/app/reference.component.ts",
        "sha256": "debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa"
      },
      {
        "file": "artifacts/material-parity/list-static-ax-review-20261021.log",
        "sha256": "a5ebaffa495e23a3b35362fee84cf2348dba54771533564d2b1f4bbff8a99473"
      },
      {
        "file": "examples/material-showcase/dist/material-showcase/browser/chunk-PCHQTLJM.js.map",
        "sha256": "55fedcbf88e93c3e0ca413d6458495aeb36087e947314dd4f0671358af8727b8"
      },
      {
        "file": "examples/material-showcase/dist/material-showcase/browser/chunk-7SL66K3U.js.map",
        "sha256": "67e956a6f4b3b0325fc51b7b45688a27d5e9307095f8b4a20391a96f68244df4"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-light-1440x1000-dpr1-reference.json",
        "sha256": "a7b3e91a50524de0ecc32221848751b9208272756609cb8a6595842845f30234"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-light-1440x1000-dpr1-astylar.json",
        "sha256": "e67ad690837076288840e1458e0eae2fb9cdac49f4edceccd09b6d2c14602968"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-light-768x1024-dpr1-reference.json",
        "sha256": "1edc8fc17a22a543f70a81dd538af126e17ca431928fdd1da860d2853edc6b58"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-light-768x1024-dpr1-astylar.json",
        "sha256": "f44cb8f351ce9690c32ebb0a4c10f4e5bb4e85ae7b14b39f4e6079db671816a6"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-light-390x844-dpr2-reference.json",
        "sha256": "8c38d33bbffdc64ff7f091d207737c67bdffff34fd71ad4d434ef79324287bea"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-light-390x844-dpr2-astylar.json",
        "sha256": "c18c88a1632bc5077b593b68479d587ab83bf8e196307a66b45837916b7f248a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-dark-1440x1000-dpr1-reference.json",
        "sha256": "d4d39d69a57feb51a3ce0b81cb1d9b33e3b326956225658cde55d62fdc35652c"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-dark-1440x1000-dpr1-astylar.json",
        "sha256": "2de5d30a2e3404271b0e04fe91e4665a14cde4b7666866334d558d093055cb87"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-dark-768x1024-dpr1-reference.json",
        "sha256": "352ea4394191c828774954fbc5f31cea73a2af0838066d576760383e995cec19"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-dark-768x1024-dpr1-astylar.json",
        "sha256": "ddb120f28a683adcce82ca2accda1d30bba0b2eca617a2bcba5f4baf2c1789d4"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-dark-390x844-dpr2-reference.json",
        "sha256": "2e9948852d4bfadf7444b7ff2bcf8681ccd6b6d60ad9c0702495d26c5fcaf675"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-dark-390x844-dpr2-astylar.json",
        "sha256": "4590b24f1211fe5638043d28110cb58ab572918a05e30dedc03ab9ff2df77e11"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-contrast-1440x1000-dpr1-reference.json",
        "sha256": "9a9fdde95b80bae0edfe1975ae9747d14dcdb2e39a9d44c87fba231c093a1884"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "4cc488454f3750a9051dee17f4793298bfcf68acd96103234dc68fa7a81bac1a"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-contrast-768x1024-dpr1-reference.json",
        "sha256": "a40c8adbf9fd97930614f7770a45163e2609de842b3d50c9fd9192b8e5c7282f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-contrast-768x1024-dpr1-astylar.json",
        "sha256": "f1100bf038adf0a626e4b120ca8af2370dc4d773f25f51b5e0bcdd7651721d0f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-contrast-390x844-dpr2-reference.json",
        "sha256": "138db50c48ff37923fb74fb66f14d8e5511aede76e8eafbe4e770d4d43ba981e"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-contrast-390x844-dpr2-astylar.json",
        "sha256": "d6ec8cb71d9c7fcc3b38aaa6f2c42c94888572e8a71293fac0958a52e1fdabb0"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-custom-1440x1000-dpr1-reference.json",
        "sha256": "28313421c17374258152b11c9c848374ed3ce4967ab5d28c603645d6d19f780d"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-custom-1440x1000-dpr1-astylar.json",
        "sha256": "39856ce12df7287ac5288eaa7dd720a3637174a4599f65ed4a2e32de323623cc"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-custom-768x1024-dpr1-reference.json",
        "sha256": "05ccff6ea23abe5816739975082dfe515bdc5bb356cf8c4eabf1a01c1c094ab7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-custom-768x1024-dpr1-astylar.json",
        "sha256": "47940385db042828413b9a3da5b5c7f6a432a9106df51339bfc2fd3bd971020f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-custom-390x844-dpr2-reference.json",
        "sha256": "e8453f700fdaf471682a0c0de23f0602c1d607fa3f5e166965eb3cc0ac0ed738"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/sort-custom-390x844-dpr2-astylar.json",
        "sha256": "37ad49349a3c80fa71c26cf3ffd522fb54ad2eec3d5965f7e7bed6e8fa6c9d63"
      }
    ],
    "boundary": "Twelve initial-state sort pairs,plus12 tooltip controls and executed authored open/focused variants. Not all interactive AX endpoints,AT behavior,sort toggling,paint or complete-case/current whole-rendering acceptance."
  }),
  Object.freeze({
    "id": "fixture-toggle-group-accessible-name-substitution",
    "file": "examples/material-showcase/src/app/astylar.component.ts",
    "pattern": "role: 'radiogroup', ariaLabel: 'ListGrid'",
    "introducedBy": "c47d589ac2cf1967cc321df38339cb64dabb3732 adds explicit group name while replacing native controls;initial and immediate parent leave group unnamed.",
    "classification": "application-plugin-authoring-defect",
    "owner": "Material button-toggle group accessible-name authoring",
    "focusedProof": "node scripts/review-toggle-group-inputs.mjs",
    "history": [
      {
        "revision": "2f440115740ff76fa9e55b3f4a11568207b2af5a",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24",
        "observation": {
          "states": [
            {
              "selected": false,
              "root": {
                "type": "div",
                "id": "button-toggle-primary",
                "role": "radiogroup",
                "class": "row",
                "ariaDisabled": false
              },
              "controls": [
                {
                  "type": "button",
                  "id": "button-toggle-one",
                  "class": "material-button",
                  "tabindex": 0,
                  "value": "List"
                },
                {
                  "type": "button",
                  "id": "button-toggle-two",
                  "class": "material-button outlined",
                  "tabindex": -1,
                  "value": "Grid"
                }
              ]
            },
            {
              "selected": true,
              "root": {
                "type": "div",
                "id": "button-toggle-primary",
                "role": "radiogroup",
                "class": "row",
                "ariaDisabled": false
              },
              "controls": [
                {
                  "type": "button",
                  "id": "button-toggle-one",
                  "class": "material-button",
                  "tabindex": 0,
                  "value": "List"
                },
                {
                  "type": "button",
                  "id": "button-toggle-two",
                  "class": "material-button outlined",
                  "tabindex": -1,
                  "value": "Grid"
                }
              ]
            }
          ],
          "completeMethodHashes": {
            "familyElements": "f033583a668c3fa5df0ea0ac0d188730d0debc77ba6b73d82f116eb587805728",
            "composite": "dbe80b9873425e39234f6ee1c5a45667b2523e10bef3126ccb04b3c2b98ef733"
          }
        }
      },
      {
        "revision": "705cf584b749caaf59149bba4b017567ca794c23",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "eec792f05fda94b04ffb22415752c1924b037e30908b9fc28d236abf392a5170",
        "observation": {
          "states": [
            {
              "selected": false,
              "root": {
                "type": "div",
                "id": "button-toggle-primary",
                "role": "radiogroup",
                "class": "row",
                "ariaDisabled": false
              },
              "controls": [
                {
                  "type": "button",
                  "id": "button-toggle-one",
                  "class": "material-button",
                  "tabindex": 0,
                  "value": "List"
                },
                {
                  "type": "button",
                  "id": "button-toggle-two",
                  "class": "material-button outlined",
                  "tabindex": -1,
                  "value": "Grid"
                }
              ]
            },
            {
              "selected": true,
              "root": {
                "type": "div",
                "id": "button-toggle-primary",
                "role": "radiogroup",
                "class": "row",
                "ariaDisabled": false
              },
              "controls": [
                {
                  "type": "button",
                  "id": "button-toggle-one",
                  "class": "material-button",
                  "tabindex": 0,
                  "value": "List"
                },
                {
                  "type": "button",
                  "id": "button-toggle-two",
                  "class": "material-button outlined",
                  "tabindex": -1,
                  "value": "Grid"
                }
              ]
            }
          ],
          "completeMethodHashes": {
            "familyElements": "d1dac035014645261140604665282825f0b32efd3d514d5db11217200d64b186",
            "composite": "dbe80b9873425e39234f6ee1c5a45667b2523e10bef3126ccb04b3c2b98ef733"
          }
        }
      },
      {
        "revision": "c47d589ac2cf1967cc321df38339cb64dabb3732",
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "761c0291cc2160c08d83d21a21db8a831f91ed061b136698612c85775ee5c69b",
        "observation": {
          "states": [
            {
              "selected": false,
              "root": {
                "type": "div",
                "id": "button-toggle-primary",
                "role": "radiogroup",
                "ariaLabel": "ListGrid",
                "ariaDisabled": false
              },
              "controls": [
                {
                  "type": "div",
                  "id": "button-toggle-one",
                  "class": "button-toggle-option selected",
                  "role": "radio",
                  "tabindex": 0,
                  "ariaLabel": "List",
                  "ariaChecked": true
                },
                {
                  "type": "div",
                  "id": "button-toggle-two",
                  "class": "button-toggle-option",
                  "role": "radio",
                  "tabindex": -1,
                  "ariaLabel": "Grid",
                  "ariaChecked": false
                }
              ]
            },
            {
              "selected": true,
              "root": {
                "type": "div",
                "id": "button-toggle-primary",
                "role": "radiogroup",
                "ariaLabel": "ListGrid",
                "ariaDisabled": false
              },
              "controls": [
                {
                  "type": "div",
                  "id": "button-toggle-one",
                  "class": "button-toggle-option",
                  "role": "radio",
                  "tabindex": -1,
                  "ariaLabel": "List",
                  "ariaChecked": false
                },
                {
                  "type": "div",
                  "id": "button-toggle-two",
                  "class": "button-toggle-option selected",
                  "role": "radio",
                  "tabindex": 0,
                  "ariaLabel": "Grid",
                  "ariaChecked": true
                }
              ]
            }
          ],
          "completeMethodHashes": {
            "familyElements": "b463ed5cb0472f2fd5a74fa4ca414bed7c0e412d761e3d32396df9a7d80f7e77",
            "composite": "dbe80b9873425e39234f6ee1c5a45667b2523e10bef3126ccb04b3c2b98ef733",
            "selectionMark": "73d79e4ac5ab3073cdee9672e4396cb4b35df46059a9ec066fbd5913519338e8"
          }
        }
      }
    ],
    "observation": {
      "component": "button-toggle",
      "staticPairs": 12,
      "property": "group aria-label/AX name",
      "reference": "no aria-label;empty AX group name",
      "astylar": "explicit ListGrid label and AX name",
      "stage": "authored group metadata before semantic projection"
    },
    "justification": "All12 pinned static pairs authenticate the root group and child backend identities. Current complete authoring and its actual selectionMark/composite helpers execute both selection states and match captured source-map methods. Complete initial and immediate pre/post c47d589a methods locate addition of ListGrid at authoring. Existing native-button-substitution finding owns the separate BUTTON-to-DIV difference;the checked/name/tabstop projections agree but do not erase native naming/validity/form-name input differences. This is not a core default accessible-name failure or evidence that the native group should be renamed.",
    "recommendation": "Preserve reference group-name intent in later fixture correction;restore native-control intent under its existing finding before assessing remaining defaults. Do not change the reference label,core naming algorithm or paint geometry to manufacture parity.",
    "evidence": [
      {
        "file": "examples/material-showcase/src/app/astylar.component.ts",
        "sha256": "71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd"
      },
      {
        "file": "artifacts/material-parity/list-static-ax-review-20261021.log",
        "sha256": "a5ebaffa495e23a3b35362fee84cf2348dba54771533564d2b1f4bbff8a99473"
      },
      {
        "file": "examples/material-showcase/dist/material-showcase/browser/chunk-PCHQTLJM.js.map",
        "sha256": "55fedcbf88e93c3e0ca413d6458495aeb36087e947314dd4f0671358af8727b8"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/latest-report.json",
        "sha256": "407b996d780c12d025b82bc2392781422818674c360c8dce73b5c23f669db987"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-light-1440x1000-dpr1-reference.json",
        "sha256": "1a49a9a90e3c8e7de91f79c1d4d458882f884e66ede67b3f87d5069e5e1bec43"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-light-1440x1000-dpr1-astylar.json",
        "sha256": "55eae97480c4203eed3f22f682cbcb4077ff5c7106b5bd58ce8f07862e8a37dd"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-light-768x1024-dpr1-reference.json",
        "sha256": "2d6d847988b6fd46a352054c7b0a1be38b0ee324ec6d1dc8453134fb92e3e729"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-light-768x1024-dpr1-astylar.json",
        "sha256": "afb897aee4f266233814ff9f19a6de4251712550c5026b05c2adf4f1add440f4"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-light-390x844-dpr2-reference.json",
        "sha256": "85735ae4dc8f1cd1ebda0566b0da3f7d5758e34385f0cb70fafcd8d61fdef6bc"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-light-390x844-dpr2-astylar.json",
        "sha256": "9dee6ee847932558c80e82df1f8680ff63b4798ab8402b9e04993cb6db73cfec"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-dark-1440x1000-dpr1-reference.json",
        "sha256": "d3f8c35b40e0657096f415f18928a0a78357d135f3ba089e7477787765612cbe"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-dark-1440x1000-dpr1-astylar.json",
        "sha256": "2dbe971cf84a46e948d41033233caa978c26969155777c1f92aefffcd4fb2ffd"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-dark-768x1024-dpr1-reference.json",
        "sha256": "6da30a40860bb0371d863c5b654687a65dda4bc39b03851eaaeffc235f98c2bd"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-dark-768x1024-dpr1-astylar.json",
        "sha256": "f4e6c5f9c68cebb0baba701e734e5c72e4ca652f5cb84f9cba6b4709d5c5be01"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-dark-390x844-dpr2-reference.json",
        "sha256": "5298e317d263ad598c4c81ea4e423527ccb0d9b2208071fa9debae4488649c7c"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-dark-390x844-dpr2-astylar.json",
        "sha256": "e1a279a2eed3577b479811ab5d233dc41f051df0a32d501f71bceb21a4b849d9"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-contrast-1440x1000-dpr1-reference.json",
        "sha256": "8c7f9cc48fff9253cda7f41c2eb3586f5fa0e9384e8926ae999da59f82c2be54"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-contrast-1440x1000-dpr1-astylar.json",
        "sha256": "20224eaf23d42d85d7270606d25576db94301d5f45c0fce73398dae6dc505271"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-contrast-768x1024-dpr1-reference.json",
        "sha256": "ba5abd49f7c66921eb67f045dc53e5e36090f151462624ab94d3cc3e75a3ebb9"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-contrast-768x1024-dpr1-astylar.json",
        "sha256": "831dd9fc8d0d8be1c87a3a4affe6bd48b3ce52054d8ba5993a2807be1c01377f"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-contrast-390x844-dpr2-reference.json",
        "sha256": "c2708d261a00cfb1c482d64ff47871443b883958ab131a42fe3d75f9d46a7b84"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-contrast-390x844-dpr2-astylar.json",
        "sha256": "1e5fdcd286aa46056ceb37ab90e1206051768482aa9b55c1b4bf70ffeea157b2"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-custom-1440x1000-dpr1-reference.json",
        "sha256": "d113e4604a2774e983741dc352a88c3d193351dbc0306a89d6eae4ee0f49a2c7"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-custom-1440x1000-dpr1-astylar.json",
        "sha256": "b4c14540a8b9397d26bddab24dd0ac1a913809dacf59a050d48378bd3bbb9331"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-custom-768x1024-dpr1-reference.json",
        "sha256": "2fb682e2fff7e043f0901ae2ab79c61904547de7427777d2ac36c86057787df4"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-custom-768x1024-dpr1-astylar.json",
        "sha256": "f1331a35d9d7e9407536b1070bd60db807f3daecd1efa0049556eb7b3cbbf48b"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-custom-390x844-dpr2-reference.json",
        "sha256": "fe059faeddaad75a21fb14ae926ec5d954b12514c51d3355dbcfc9f50102d419"
      },
      {
        "file": "artifacts/material-parity/remaining-static-ax-resume-20261022/button-toggle-custom-390x844-dpr2-astylar.json",
        "sha256": "4c17ec79b40ecd41de5a8bfc12e57cf27570062cc4b7a36665268e707f9defc4"
      }
    ],
    "boundary": "Twelve enabled static pairs and executed authored selection variants only. Native primitive metadata is preserved under its existing finding,not a new defect. Not keyboard/form submission,disabled states,paint,current whole rendering or case closure."
  }),
  Object.freeze({
    id: 'core-root-paint-depth-crosses-viewport-camera',
    introducedBy: 'Current source and authenticated public reproduction agree;first-bad revision not established',
    file: 'src/app/services/dom/positioning/stacking-context.manager.ts',
    pattern: String.raw`return 0\.01 \+ zIndex \* this\.rootContextStep;`,
    classification: 'confirmed-core-renderer-defect',
    owner: 'shared root stacking-depth allocation and final camera clip boundary',
    focusedProof: 'tests/material-parity/tooltip-position-composition.spec.mjs: current public depth reduction loses only the high-z short pane despite equal CSS geometry',
    observation: { component: 'plugin-free public root pane', property: 'z-index versus visible paint',
      states: ['z-index1 and1000 at320x240 and320x1000'], dpr: [1],
      reference: 'All four120x24 panes paint2880 solid pixels at20,20',
      astylar: 'Identical CSS/projected boxes;high-z1000 short pane paints0 pixels,three controls paint2880',
      stage: 'unbounded root paint depth exceeds viewport-height-dependent camera position' },
    evidence: [
      { file: 'artifacts/material-parity/current-depth-public-reduction-20261022/result.json', sha256: 'd464b8d4931c652dcc46d6e1da3114641b38c9205477dcb7271f5024d7797257' },
      { file: 'artifacts/material-parity/current-depth-public-reduction-20261022/provenance.json', sha256: 'da3ff1622585e00f10d7df0ba51739d2fe9585a053ac3bb8c56893c56f79f979' },
      { file: 'artifacts/material-parity/current-depth-public-validation-20261022.log', sha256: '1db33fb2dff32c068f946eddc38bd9bcfd6ced69577f591387a700273ccf7755' },
    ],
    publicReproduction: { command: 'ASTYLAR_AUDIT_SPEC_FILTER=depth- node scripts/audit-overlay-layout-stage.mjs <new-output> 1 artifacts/material-parity/divider-context-angular-source-build-20261013',
      pairs: 4, rendererFailures: 1, controls: 3, equalAuthoredInputs: true, currentRenderingAccepted: false },
    justification: 'The unchanged public reduction derives native CSS from the same SiteData styles and preserves authored input across mount. All104 current source/compiled/installed receipts equal the authenticated Angular compilation;2516 served bundle inputs authenticate. Native,CSS and projected boxes agree in all four cases. Only high-z1000 at240px places meshZ250 beyond cameraZ207.8461 while enabled/visible/visibility1 remain true;native2880 solid pixels become0. Tall high-z and both low-z controls paint. Orthographic projection fixes apparent x/y scaling but does not bound physical stacking depth. This is a core paint failure distinct from unequal Material tooltip connected-overlay versus flow inputs and historical off-screen placement. Current source arithmetic corroborates the mechanism without substituting for browser evidence.',
    recommendation: 'Keep CSS z-index as paint order and allocate final render depth within the camera-visible range at the shared core boundary. Preserve stacking-context ordering and fractional CSS geometry. Do not lower fixture z-index,move popups,or add plugin camera calculations to hide clipping.',
    boundary: 'Current reduced root-pane failure at observed DPR1 only. Not full Material tooltip/snackbar causality,current configured-case parity,all z-indices,DPRs or complete raster equivalence. First-bad history and canonical case joins remain open.',
  }),
  Object.freeze({
    id: 'fixture-slider-state-layer-composition',
    introducedBy: 'Current source and captured modules agree;2cb8b198 introduced mutable dispatch but its parent already has the .08/.12 alpha intent;first-bad revision not established',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: String.raw`this\.updateSliderStateLayer\(sliderHandleName\(event\.targetId\), \.12\)`,
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase Material state-layer composition and alpha inputs before plugin paint',
    focusedProof: 'tests/material-parity/slider-retained-state-layer.spec.mjs: retained Slider state layers diverge in application inputs before plugin paint',
    observation: { component: 'slider', states: ['hover', 'held'], profiles: ['light', 'dark', 'contrast', 'custom'], dpr: [1, 2],
      reference: 'One48px hover layer at.05 alpha;held active and focus layers each at.2 alpha',
      astylar: 'One plugin state disc driven at.08 hover/.12 held,other handle transparent;theme RGB agrees',
      stage: 'application state-layer requests/composition before material paint' },
    evidence: [
      { file: 'artifacts/material-parity/slider-hover-held-20261024/latest-report.json', sha256: 'de4228f971a0b0b341a21c9d71a20d9f351701ec634257732c6ed6d929a8ec98' },
      { file: 'artifacts/material-parity/slider-historical-black-material-integration-20261024.log', sha256: '00472e2a7281b330b5cdf3d29e79f65007d3297f45f7f20f3d913616e6f3ec94' },
    ],
    justification: 'Sixteen exact retained contexts authenticate paired trees/PNGs,two served scripts/maps and whole captured/current application and plugin modules. Executing the original handlers/material updates preserves unequal layer counts and alpha despite matching RGB. Four light hover/held DPR1/2 interiors also differ. These inputs diverge before core rendering;do not classify their color difference as an equal-input alpha/projection defect. The separately reproduced historical opaque-black fallback is not claimed as a current renderer failure or exact old screenshot attribution.',
    recommendation: 'Preserve the reference state-layer composition and resolved ink/alpha through supported public APIs in later implementation. Do not tune fixture opacity or offsets to match screenshots. Any missing general rendering capability must remain an explicit core/public-API issue.',
    boundary: 'Current input mismatch for16 retained desktop contexts,not whole-case/current rendering acceptance,edge/track/knob sharpness,other actions or exact historical black-circle causality.',
  }),
]);

export const pluginBoundaryVerdict = Object.freeze({
  status: 'violation-found',
  cssSpaceContract: 'plugin-projection-conforms; application-feedback-violation',
  legitimatePluginResponsibilities: Object.freeze([
    'Material state-layer and ripple paint',
    'Material determinate/indeterminate progress paint',
    'Material range-track/thumb paint driven by CSS-space dimensions and values',
    'Material checkmark and sort-arrow vector paint',
  ]),
  coreOwnedWorkFoundInPlugin: Object.freeze([
    'MaterialTabPanelRenderer performs glyph rasterization, font selection, baseline calculation, and text positioning through a private DynamicTexture.',
  ]),
  applicationWorkThatNeedsCoreApi: Object.freeze([
    'Connected-overlay anchor/collision placement is duplicated in AstylarShowcaseComponent.',
    'Ripple callers duplicate target dimensions rather than receiving resolved CSS-space event bounds.',
    'connectedOverlayTop feeds projected mesh output back into authored CSS top instead of querying the authoritative pre-projection layout box.',
  ]),
  coordinateFinding: 'Plugin geometry generally uses context.coordinates at mesh creation/placement. However, the application connectedOverlayTop -> measure -> vectorsWorld/Vector3.Project -> anchor.top -> authored top path feeds rendered geometry back into layout. This is a concrete violation of the final-projection-only contract even though the returned number is expressed in CSS pixels. Core layout boxes must be authoritative.',
});
