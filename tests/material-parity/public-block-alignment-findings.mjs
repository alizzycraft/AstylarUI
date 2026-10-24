// Standalone pending findings. Not registered in the frozen canonical batch.
const reproduction = Object.freeze({
  file:'artifacts/material-parity/public-block-align-content-20261025/latest-report.json',
  sha256:'e13cac751581f025897691bd8279e23fd2b0068f64b8f31e8d222dff8c1519c5',
});
const sourceBinding = Object.freeze({
  file:'artifacts/material-parity/public-block-align-content-source-binding-20261025.log',
  sha256:'f73feaad5ace77057428591b21500e83bd19326fca1bd82dbc2d8fb0a8cfe019',
});
export const publicBlockAlignmentFindings = Object.freeze([
  Object.freeze({
    id:'core-block-align-content-omission-resolves-to-stretch',
    classification:'confirmed-core-renderer-defect',
    owner:'core CSS initial alignment value resolution',
    file:'src/app/config/browser-defaults.ts',
    publicReproduction:reproduction,sourceBinding,
    observation:{property:'alignContent',element:'parent',state:'fresh omitted-value block',dpr:[1,2],reference:'normal',astylar:'stretch'},
    firstDivergence:'Omitted equal authored request resolves to different alignment keywords before layout. Shared globalDefaultStyle supplies stretch through element-default merging.',
    history:{sourceChange:'75bb2430d46e2035ee107c343dfaf319cf69e4aa',laterExtraction:'2c16e148c3f7870c9906ce2a024661b164886e46',
      evidence:{file:'artifacts/material-parity/block-align-content-default-history-20261025.log',sha256:'c7998a58cff837cb77130764e4c42fa0c12712c1c8af5f443b7ea3ce48499e3b'},
      boundary:'Source changed invalid left to stretch;parent was not a correct normal baseline. No first-bad runtime revision or author motive inferred.'},
    justification:'Both DPR omissions resolve differently while explicit normal/stretch controls retain their supplied keywords and equal20px geometry. Native margin-collapse control separately demonstrates normal/stretch are not generally interchangeable;it is not candidate collapse evidence.',
    nextAction:'Correct general CSS initial-value semantics only after checking flex/grid/block consumers;do not change Material authoring or globally normalize normal/stretch.',
    boundary:'Confirmed resolved-value defect for tested public blocks,not a demonstrated omission-driven geometry failure in this positioned-parent control or all formatting contexts.',
  }),
  Object.freeze({
    id:'core-block-align-content-center-does-not-align-contents',
    classification:'confirmed-core-renderer-defect',
    owner:'core block content alignment and child placement',
    file:'src/app/services/dom/elements/element-creation.service.ts',
    publicReproduction:reproduction,sourceBinding,
    observation:{property:'child top relative to parent',element:'child',state:'fresh explicit center block',dpr:[1,2],reference:'55 CSSpx',astylar:'20 CSSpx'},
    firstDivergence:'Explicit center survives candidate resolved style but the rendered child does not move from the normal/stretch control offset. The35px divergence is after style resolution,not omission/default serialization.',
    causalExecution:{evidence:{file:'artifacts/material-parity/public-block-alignment-causal-execution-20261025.log',sha256:'fcc1734eff58748a456a996fcfc69fff43f6de7df6798738589254b01193c269'},
      observation:'Actual current and captured-installed layoutBlockChildren plus ten complete real helpers pass y20 to positionRenderedCssBox for normal,stretch,center without reading parent alignContent. Other parent height/position reads are observed.',
      boundary:'Creation returns the recorded fixed10x10 child;projection records CSS boxes and unexpected resize/paint branches throw. Not whole browser call tracing,nested/auto-height behavior or proof of every downstream renderer path.'},
    history:{boundary:'First-bad runtime revision not established. Current/installed six-method equivalence does not date the behavior or prove every internal call path.'},
    justification:'Eight equal-input package-root pairs separate omitted/normal/stretch/center atDPR1/2. Both center cases fail by35px despite equal center declarations;normal/stretch controls agree. Absolute block parent excludes parent-child margin collapse in this reduction. Layout/default source methods match captured installed bundle inputs.',
    nextAction:'Trace and implement general block content alignment at the owning CSS layout boundary,with explicit normal/stretch/center and margin-collapse controls. Do not substitute flex or tune offsets.',
    boundary:'Confirmed projected geometry failure with missing block content-alignment offset before projection in the bounded actual-method execution. Not local raster,all block alignment values,Material symptom causality or historical runtime.',
  }),
]);
