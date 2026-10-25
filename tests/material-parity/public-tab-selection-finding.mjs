// Pending bounded audit finding;not live registry or canonical acceptance.
export const publicTabSelectionFinding=Object.freeze({
  id:'core-native-tab-selection-overwritten-by-control-sync',
  classification:'confirmed-core-renderer-defect',
  file:'src/lib/astylar-semantic-bridge.ts',
  pattern:String.raw`\['text', 'search', 'tel', 'url', 'password'\]\.includes\(node\.type\)\) \{\s*node\.setSelectionRange\(state\.selectionStart, state\.selectionEnd, state\.selectionDirection\);`,
  introducedBy:'Historical first-bad revision/runtime not established;current and installed six complete owning methods agree.',
  owner:'core native-origin focus and semantic control-selection synchronization',
  focusedProof:'tests/material-parity/public-email-selection.spec.mjs',
  observation:{
    publicPairs:4,types:['text','email'],dpr:[1,2],actions:['Tab','Z','Delete','Backspace'],
    passingControl:'Identical application source,bundle,2515 build inputs and SiteData/styles with explicit Control+A before typing:all four pairs replace correctly.',
    failure:'All four candidate Tab-entry pairs prefix Z instead of native selected replacement. Text native range[0,16],candidate[0,0];email endpoints remain null.',
    causalTrace:{pairs:1,type:'text',dpr:1,nativeInitial:[0,16],candidateInitial:[0,16],
      firstDivergence:'Queued AstylarSemanticBridge.syncControlStates invokes applyControlState,which calls setSelectionRange(0,0,"none") over the browser-created[0,16] range before typing.',
      endpointControl:'Instrumented after-Tab and after-type values/focus/selection match the uninstrumented failing pair.'},
  },
  evidence:[
    {file:'artifacts/material-parity/public-email-selection-20261025/latest-report.json',sha256:'c5ee5295c582fe7506c21b3e3124cc357e4cac82785822dfa5294d36caa26683'},
    {file:'artifacts/material-parity/public-email-tab-entry-20261025/latest-report.json',sha256:'beb04e64610f8c4ef4d6b6298ff504874d4fc2e9fbafa2c8b507fc6488fbee3a'},
    {file:'artifacts/material-parity/public-tab-selection-trace-20261025/latest-report.json',sha256:'966276cd72bd0043b30e86923b67e130a0a8048831d43906db875e754b15f1dd'},
    {file:'artifacts/material-parity/public-tab-selection-cause-owner-corrected-20261025.log',sha256:'d971268a26af1bf91f1869fda64a0a54f23808be7f95efdaacc321efd25475e3'},
  ],
  recommendation:'Preserve browser-owned selection at the native-origin focus/control-sync boundary before managed editing consumes it. Keep scene-origin programmatic focus,pointer/directional selection,updates and unsupported selection APIs separate. Do not globally selectAll,patch Material callbacks,change input types or invent email endpoints.',
  boundary:'Core mechanism demonstrated for one public text Tab-entry trace with four text/email failing pairs and four explicit-selection controls. Not email-specific setter attribution,original Material runtime causality,all focus origins,IME/clipboard,raster,full current rendering or whole-case closure. No implementation fix authorized by this audit.',
});
