import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Reuse the authenticated server/assets/settlement path; inspect material state
// instead of repeating numeric baseline and copy-ancestry investigations.
const prior = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(prior, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2); source = source.replace(before, after);
};
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)', "readFileSync('scripts/audit-material-divider-material-state.mjs')");
replace("for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])", "for(const profile of ['light','dark','contrast','custom'])for(const side of ['astylar'])");
replace('return {native,draws:window.baselineDraws};', `
        const surface=window.ng.getComponent(document.querySelector('astylar-surface')).surface();
        const scene=surface.scene,materialState=[];
        for(const id of ['divider-above','divider-below']){
          const meshes=scene.meshes.filter(mesh=>mesh.metadata?.elementId===id&&mesh.metadata?.isTextMesh);
          if(meshes.length!==1)throw Error('Ambiguous text material owner '+id);
          const mesh=meshes[0],material=mesh.material,texture=material.diffuseTexture;
          const chain=[];
          for(let owner=mesh;owner;owner=owner.parent)chain.push({name:owner.name,
            elementId:owner.metadata?.elementId,enabled:owner.isEnabled(),
            visibility:owner.visibility??null,isVisible:owner.isVisible??null,
            materialAlpha:owner.material?.alpha??null});
          materialState.push({id,chain,material:{alpha:material.alpha,alphaMode:material.alphaMode,
            transparencyMode:material.transparencyMode,useAlphaFromDiffuseTexture:material.useAlphaFromDiffuseTexture,
            disableLighting:material.disableLighting,useEmissiveAsIllumination:material.useEmissiveAsIllumination,
            emissiveTextureIsDiffuse:material.emissiveTexture===texture,diffuse:material.diffuseColor.asArray(),
            emissive:material.emissiveColor.asArray(),specular:material.specularColor.asArray()},
            texture:{hasAlpha:texture.hasAlpha,gammaSpace:texture.gammaSpace,samplingMode:texture.samplingMode},
            ready:material.isReady(mesh),opacityRequests:window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id]).inputTree.nodes
              .map(node=>({key:node.key,parent:node.parent,id:node.authored?.id,opacity:node.resolvedStyle?.opacity??null}))});
        }
        return {native,draws:window.baselineDraws,materialState};`);
replace("boundary:'Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.'",
  "boundary:'Read-only four-profile candidate desktop DPR1 material/owner-state diagnostic on authenticated served bytes. No reference raster,shader execution trace,all-viewport coverage,ancestor group-compositing equivalence or whole-case acceptance.'");
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
