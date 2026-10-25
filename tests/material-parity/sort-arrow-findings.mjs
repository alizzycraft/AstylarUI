// Pending findings;the frozen live policy/source inventory is not changed here.
const original={file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62'};
export const sortArrowFindings=Object.freeze([
  Object.freeze({
    id:'fixture-sort-hover-arrow-omitted',classification:'application-plugin-authoring-defect',
    owner:'showcase Sort arrow presence/state translation',file:'examples/material-showcase/src/app/astylar.component.ts',
    pattern:String.raw`\.\.\.\(state\.open \|\| focused \? \[\{\s+type: 'showcase\.material:sort-arrow'`,
    introducedBy:'705cf584 first authors an activated-only text arrow;75fe617b adds focused presence but not hover;5b74d1b3 preserves that gate for the plugin arrow. Source history only,not first-bad runtime or historical reference equivalence.',
    history:{initialArrow:'705cf584b749caaf59149bba4b017567ca794c23',focusGate:'75fe617bf947eabf8c4353322a1b97ca5b3bc7d7',pluginArrow:'5b74d1b3e79016a1ba402090d66c60a123718e71'},
    observation:{property:'arrow node presence versus native opacity',cases:60,hoverFailures:8,hiddenControls:12,presentControls:40,
      reference:'All eight hover owners have arrow opacity0.54.',astylar:'All eight hover trees omit sort-arrow entirely.',
      firstDivergence:'Candidate conditional authoring before plugin rendering or projection.'},
    evidence:{report:original},focusedProof:'tests/material-parity/sort-arrow-geometry.spec.mjs',
    action:'Match native hover/focus/activation arrow presence through authored state;do not add renderer offsets or duplicate input routing.',
    boundary:'Retained input presence and current source/history only;not raw hover timing,animation,paint,current served build or whole-case closure.'
  }),
  Object.freeze({
    id:'fixture-sort-arrow-triangulation-fills-notch-and-overdraws',classification:'application-plugin-authoring-defect',
    owner:'Material sort-arrow CSS-space vector paint geometry',file:'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    pattern:String.raw`export function materialSortArrowTriangles\(direction: 'asc' \| 'desc'\)`,
    introducedBy:'5b74d1b3 replaces the text glyph with the five-triangle function. Initial unit-scale vertices equal current CSS vertices;e4ca3db4 changes coordinate API but preserves topology. Not historical browser or first-bad-runtime proof.',
    history:{introduction:'5b74d1b3e79016a1ba402090d66c60a123718e71',parent:'6a43034a5f42a03f96f413c9301b136afff776a6',cssBoundary:'e4ca3db4070b1aaac0c1a43dda67bc135f18900a'},
    observation:{property:'vector fill coverage before projection',nativePolygonArea:49.08,summedTriangleArea:64.48,
      witnesses:[{point:{x:2,y:-1.5},nativeFilled:false,candidateTriangles:1},{point:{x:0,y:-2},nativeFilled:true,candidateTriangles:2}],
      firstDivergence:'Current plugin triangles differ from the retained native SVG path despite equal bounds.'},
    evidence:{report:original,currentPluginSha256:'dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e'},
    retainedPaint:{states:['focus','activate'],profile:'light',dpr:1,metricReplay:'Exact complete original focused-raster metrics on existing PNGs;zero phase shift.',
      focusStem:{reference:[129,126,131],astylar:[75,72,78]},opaqueStem:{reference:[29,27,32],astylar:[29,27,32]},
      attribution:'Consistent with extra fill/double alpha coverage;not proof of capture-time plugin identity or historical GPU cause.'},
    focusedProof:'tests/material-parity/sort-arrow-geometry.spec.mjs',
    action:'Preserve native path and dimensions with faithful nonoverlapping vector geometry;do not retune scale,offset,color or opacity to hide the mismatch.',
    boundary:'Current geometry and source history plus two retained local observations. Captured-plugin linkage and fresh current raster remain unverified;not all-context paint or case closure.'
  })
]);
