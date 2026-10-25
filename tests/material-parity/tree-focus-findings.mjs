// Pending entries for the next coherent policy/source batch,not live policy registration.
export const treeFocusFindings=Object.freeze([
  Object.freeze({
    id:'fixture-tree-tabstop-remains-first-after-pointer-focus',
    classification:'application-plugin-authoring-defect',
    owner:'showcase tree composite focus/tab-stop state translation',
    file:'examples/material-showcase/src/app/astylar.component.ts',
    introducedBy:'2f440115 already authors tabindex:index===0?0:-1 independently of focused leaf. Source introduction only,not a historical runtime bisect.',
    observation:{property:'tabindex',cases:52,differingPointerCases:24,matchingControls:28,
      reference:'After pointer activation,Projects has tabindex=0;Documents and Archive have -1.',
      astylar:'Documents remains tabindex=0 even while Projects has focused class and actual native focus.',
      firstDivergence:'Authored candidate tab-stop input,not projection or a mirror dropping the requested values.'},
    evidence:{original:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62'},
      oneActualDOMContext:{file:'artifacts/material-parity/tree-pointer-tabstop-20261025/latest-report.json',sha256:'117f3f9e1813a5b83bc1d545eb3e5dc69262cc58eaafac9d116402fe00f722a9'}},
    focusedProof:'tests/material-parity/tree-tabstop-inputs.spec.mjs',
    action:'Restore equivalent roving tab-stop inputs through public semantics;do not compensate in layout or implement a plugin input engine.',
    boundary:'52 retained input properties,one actual native-DOM context. Not complete keyboard,paint,current-source or case acceptance.'
  }),
  Object.freeze({
    id:'core-pointer-move-restores-canvas-tabstop-and-recaptures-backward-exit',
    classification:'confirmed-core-renderer-defect',
    owner:'core semantic focus and Babylon native-input canvas ownership',
    file:'src/lib/astylar-semantic-bridge.ts',
    introducedBy:'Historical introduction not yet established;do not infer first-bad revision from the current/installed sources.',
    observation:{property:'sequential focus exit after real pointer activation',pairs:1,dpr:1,
      reference:'Projects -> Tab Documents -> Shift+Tab BODY.',
      astylar:'Projects -> Tab Documents -> Shift+Tab CANVAS -> semantic Documents.',
      firstDivergence:'Semantic connect excludes canvas with tabindex=-1;Babylon pointer move overwrites tabindex to engine value1.',
      consequence:'Browser backward navigation reaches implementation canvas;semantic syncFocus calls native focus on the still-logical Documents owner.'},
    publicReproduction:{file:'artifacts/material-parity/public-tree-fixed-tabstop-corrected-20261025/latest-report.json',sha256:'ca76ab4262dbca4cac62ff4d21cbca7fd5ddbd4d5af33d51f824bba66e3163e6'},
    causalTrace:{file:'artifacts/material-parity/public-tree-tab-exit-trace-20261025/latest-report.json',sha256:'6ec16965fabd291c2bda981beaecdab35beeb31e060b5ec82648d1dba8a0500f'},
    focusedProof:'tests/material-parity/tree-tabstop-inputs.spec.mjs: one equal-input Tab-exit trace binds pointer-move canvas tab restoration and semantic refocus',
    action:'Coordinate core/Babylon canvas tab ownership while preserving pointer/selection focus and genuine modal containment;verify forward/backward exit without replacing native Tab navigation.',
    boundary:'Equal-input public installed-package reproduction and corroborating instrumented pair,not all Material cases,current-source equivalence,history bisect,paint or final acceptance.'
  })
]);
