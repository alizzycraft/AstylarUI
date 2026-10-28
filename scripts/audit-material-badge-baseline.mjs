import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Reuse the immutable native-marker/served-asset probe, not a new baseline engine.
const prior = 'scripts/audit-material-divider-baselines.mjs';
let source = readFileSync(prior,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), 'bb87aa6576b1c52b9c2aa077a94ddba832802942c0096fac3717d3ca2eac638f');
const replace = (before,after) => {assert.equal(source.split(before).length,2,before);source=source.replace(before,after);};
replace("'../tests/material-parity/run-checkpoint.mjs'", JSON.stringify(pathToFileURL(path.resolve('tests/material-parity/run-checkpoint.mjs')).href));
replace("'playwright-core'",JSON.stringify(import.meta.resolve('playwright-core')));
replace('readFileSync(import.meta.filename)',"readFileSync('scripts/audit-material-badge-baseline.mjs')");
replace("examples/material-showcase/dist/material-showcase/browser",'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser');
replace("artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json",'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
replace('4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11','7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
replace('baseline.captureProvenance.browserFiles','baseline.provenance.browserFiles');
replace("for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar']){", "for(const dpr of [1,2])for(const side of ['reference','astylar']){const profile='contrast';");
replace('deviceScaleFactor:1','deviceScaleFactor:dpr');
replace("['Above','Below'].includes(args[0])","args[0]==='Notifications'");
replace('/divider?benchmark=1&profile=${profile}','/badge?benchmark=1&profile=${profile}&interaction=inspect');
replace("'#divider-above'","'#badge-label'");
replace("['divider-above','divider-below']","['badge-label']");
replace('parent=leaf.parentElement','parent=leaf');
replace('paragraphHeight:before.height,baselineOffset:box.top-before.top,','paragraphHeight:before.height,baselineCssY:box.top,textCssTop:ink.top,baselineOffset:box.top-before.top,');
replace('stable:before.height===after.height&&ink.top===inkAfter.top&&ink.height===inkAfter.height',
  'stable:JSON.stringify(before.toJSON())===JSON.stringify(after.toJSON())&&JSON.stringify(ink.toJSON())===JSON.stringify(inkAfter.toJSON())');
replace('assert.equal(observation.native.length,2)','assert.equal(observation.native.length,1)');
replace("observation.draws.some(x=>x.text==='Above')&&observation.draws.some(x=>x.text==='Below')","observation.draws.some(x=>x.text==='Notifications')");
replace('results.push({profile,side,observation,assets})','results.push({profile,dpr,side,observation,assets})');
replace('Fresh four-profile desktop DPR1 baseline diagnostic on authenticated served bytes. Marker-only native intervention preserves measured bounds;candidate draw coordinates remain texture-local. Not old-browser replay,global baseline equality,current core-source equivalence or full-case acceptance.',
  'Retained-build contrast DPR1/2 native baseline and candidate draw observations. Native zero-size marker preserves complete label and text Range rectangles. Candidate draw events are not tied to live texture identity;use separately authenticated texture reconstruction. Not original focus replay,current core or case acceptance.');
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
