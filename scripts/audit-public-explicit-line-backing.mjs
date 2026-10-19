import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Reuse the frozen paired public driver. Only a diagnostic copy in memory is
// changed; both reference CSS and public SiteData come from the same style input.
const prior='scripts/audit-paragraph-baseline-boundary.mjs';
let source=readFileSync(prior,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'),'5e75811e232e7c009c37823ef8fd3bc151f332f14d68d364166d3c3c6366657e');
const replace=(a,b)=>{assert.equal(source.split(a).length,2);source=source.replace(a,b);};
replace("'playwright-core'",JSON.stringify(import.meta.resolve('playwright-core')));
replace("'../tests/material-parity/run-checkpoint.mjs'",JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace('readFileSync(import.meta.filename)',"readFileSync('scripts/audit-public-explicit-line-backing.mjs')");
replace("for(const font of [16,24])for(const unit of ['normal','px'])", "for(const font of [16,18.4])for(const unit of ['px'])");
replace('assert.equal(results.length,8)','assert.equal(results.length,4)');
replace('const server=createServer',`let diagnostic=bundle.toString();
const input='font * 1.25 + "px"';assert.equal(diagnostic.split(input).length,2);
diagnostic=diagnostic.replace(input,'"22px"');
const observation='    retainedLeaf: surface?.inspectResolvedStyles()';assert.equal(diagnostic.split(observation).length,2);
diagnostic=diagnostic.replace(observation,\`    liveTextures: surface ? surface.scene.meshes.filter(m=>m.metadata?.elementId==='leaf'&&m.metadata?.isTextMesh).map(m=>({size:m.material.diffuseTexture.getSize(),logical:m.material.diffuseTexture.metadata?.astylarLogicalTextSize,uvs:Array.from(m.getVerticesData('uv')),dimensions:m.metadata.textDimensions})) : [],
\`+observation);
const diagnosticBundle=Buffer.from(diagnostic);
const server=createServer`);
replace('res.end(script?bundle:html)','res.end(script?diagnosticBundle:html)');
replace('publicReportSha256:hash(bytes),','publicReportSha256:hash(bytes),originalBundleSha256:hash(bundle),diagnosticBundleSha256:hash(diagnosticBundle),pairedExplicitLineHeight:"22px",');
replace('Fresh diagnostic on immutable retained public bundle,not current full core or Material fixture acceptance. Native marker intervention checks stable paragraph/text bounds. Candidate fillText coordinates are texture-local,not CSS global baseline;no projection inference.',
  'Diagnostic in-memory derivative of authenticated public bundle;both sides use explicit22px line-height. Canonical bundle/files untouched. Current-browser allocation/mesh observation,not current full-package or raster acceptance. Draw coordinates remain texture-local.');
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
