import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import { materialStaticCases, materialInteractionCases } from '../tests/material-parity/benchmark.config.mjs';

// Preserve the first Angular capture. Extend its observation, not renderer code.
const prior = 'scripts/audit-material-divider-angular-remount.mjs';
let source = readFileSync(prior, 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(source), 'eada8fcd6c5f17cb6bf88e041b4e3081c080be0a1e15983f22564d12e12dcd87');
const physical = new Map();
for (const [kind, rows] of [['static', materialStaticCases], ['interaction', materialInteractionCases]])
  for (const row of rows.filter(row => row.family === 'divider')) {
    const key = `${row.profile}/${row.viewport.width}/${row.viewport.height}/${row.viewport.deviceScaleFactor}`;
    if (!physical.has(key)) physical.set(key, { profile: row.profile, viewport: row.viewport, cases: [] });
    physical.get(key).cases.push(`${kind}:divider@${row.profile}/${row.viewport.id}${kind === 'interaction' ? `/${row.state}` : ''}`);
  }
assert.equal(physical.size, 20); assert.equal([...physical.values()].flatMap(row => row.cases).length, 24);
const themes = {};
new Function('exports', ts.transpileModule(readFileSync('examples/material-showcase/src/app/theme.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(themes);
const replace = (before, after) => { assert.equal(source.split(before).length, 2); source = source.replace(before, after); };
for (const file of ['run-checkpoint.mjs', 'supplemental-capture-evidence.mjs'])
  replace(`'../tests/material-parity/${file}'`, JSON.stringify(pathToFileURL(path.resolve('tests/material-parity', file)).href));
replace("'playwright-core'", JSON.stringify(import.meta.resolve('playwright-core')));
replace(`const script = '${prior}'`, "const script = 'scripts/audit-material-divider-angular-cohorts.mjs'");
replace('for (const dpr of [1, 2]) {', `for (const cohort of ${JSON.stringify([...physical.values()])}) {
    const dpr=cohort.viewport.deviceScaleFactor,profile=cohort.profile,requestedViewport=cohort.viewport;`);
replace('viewport: { width: 1440, height: 1000 }, deviceScaleFactor: dpr',
  'viewport: { width: requestedViewport.width, height: requestedViewport.height }, deviceScaleFactor: dpr');
replace('profile=light`', 'profile=${profile}`');
replace("peerCanvas.style.cssText = 'position:absolute;left:-10000px;top:0;width:1440px;height:1000px;pointer-events:none';",
  "const initialBounds=initialCanvas.getBoundingClientRect();peerCanvas.style.cssText=`position:absolute;left:-10000px;top:0;width:${initialBounds.width}px;height:${initialBounds.height}px;pointer-events:none`;");
replace('const snapshot = surface => ({ disposed:', `const observedOwners=new WeakMap();
        const snapshot = surface => {
          let refs=observedOwners.get(surface);
          if(!refs){const host=surface.host;refs={tracked:host.sceneResources.get(surface.scene),interaction:host.interactions.get(surface.scene),
            scrolling:host.scrolling.get(surface.scene),semantics:host.semantics.get(surface.scene),pluginHost:host.pluginHost};
            if(Object.values(refs).some(value=>!value))throw Error('Missing read-only lifetime diagnostic owner');
            refs.configuredCallbacks=refs.interaction.snapshot.handlers;observedOwners.set(surface,refs);}
          return ({configuredCallbacks:refs.configuredCallbacks,tracked:refs.tracked.snapshot,interaction:refs.interaction.snapshot,scrolling:refs.scrolling.snapshot,
            semantics:refs.semantics.snapshot,pluginResources:refs.pluginHost.snapshot,
            sceneObservers:{pointer:surface.scene.onPointerObservable.observers.length,keyboard:surface.scene.onKeyboardObservable.observers.length,
              beforeRender:surface.scene.onBeforeRenderObservable.observers.length},disposed:`);
replace('.map(mesh => mesh.name) });', '.map(mesh => mesh.name) }); };');
replace("outlet.deactivate(); await tick();\n            steps.push({ label: `angular-destroyed-${cycle}`",
  "outlet.deactivate(); await tick();\n            const beforeEvents=routed.eventLog.length;\n            for(const type of ['keydown','keyup'])canvas.dispatchEvent(new KeyboardEvent(type,{key:'Enter',bubbles:true}));\n            canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:10,bubbles:true}));\n            for(const type of ['pointerdown','pointerup','pointermove'])canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:70,clientY:210}));\n            await tick();const detachedCanvasEvents={before:beforeEvents,after:routed.eventLog.length};\n            steps.push({detachedCanvasEvents,label: `angular-destroyed-${cycle}`");
replace('return { dpr: devicePixelRatio, activated, deactivated, destroyWitnesses, steps,',
  `return {dpr:devicePixelRatio,viewport:{width:innerWidth,height:innerHeight},canvasBounds:{width:initialBounds.width,height:initialBounds.height},
            peerBounds:{width:peerCanvas.clientWidth,height:peerCanvas.clientHeight},theme:showcase.store.theme(),
            activated,deactivated,destroyWitnesses,steps,`);
replace('const row = { dpr, observation, runtime };', 'const row = { ...cohort, dpr, observation, runtime };');
replace('`observations-dpr${dpr}.json`', '`observations-${profile}-${requestedViewport.id}-dpr${dpr}.json`');
replace('assert.equal(observation.error, undefined);', `assert.equal(observation.error,undefined);
      assert.deepEqual(observation.viewport,{width:requestedViewport.width,height:requestedViewport.height});
      assert.deepEqual(observation.canvasBounds,observation.viewport);assert.deepEqual(observation.peerBounds,observation.viewport);
      assert.deepEqual(observation.theme,${JSON.stringify(themes.MATERIAL_THEME_PROFILES)}[profile]);`);
replace("assert.deepEqual(owner.live, { meshes: 0, materials: 0, textures: 0 });", `assert.deepEqual(owner.live,{meshes:0,materials:0,textures:0});
            assert.deepEqual(owner.tracked,{meshes:0,materials:0,textures:0});
            assert.equal(owner.interaction.disposed,true);
            for(const key of ['pointerObservers','wheelHandlers','keyboardListeners'])assert.equal(owner.interaction[key],0);
            assert.equal(owner.interaction.handlers,owner.configuredCallbacks,'configured dispatcher callbacks are not active registration counts');
            assert.equal(owner.scrolling.disposed,true);assert.deepEqual(owner.scrolling.containers,{});
            for(const key of ['nodes','eventRegistrations','observerRegistrations'])assert.equal(owner.semantics[key],0);
            assert.deepEqual(owner.pluginResources,{owners:0,resources:0,cleanups:0,pending:0});
            assert.deepEqual(owner.sceneObservers,{pointer:0,keyboard:0,beforeRender:0});`);
replace("if (step.label !== 'all-disposed') assert.equal(step.peer.disposed, false);", `if(step.label!=='all-disposed'){
          assert.equal(step.peer.disposed,false);const baseline=observation.steps[0].peer;
          assert.deepEqual(step.peer.tracked,baseline.tracked);assert.deepEqual(step.peer.pluginResources,baseline.pluginResources);
          for(const key of ['pointerObservers','wheelHandlers','keyboardListeners','handlers'])assert.equal(step.peer.interaction[key],baseline.interaction[key]);
          for(const key of ['nodes','eventRegistrations','observerRegistrations'])assert.equal(step.peer.semantics[key],baseline.semantics[key]);
        }`);
replace("assert.equal(step.benchmarkPresent, false);",
  "assert.equal(step.benchmarkPresent,false);assert.equal(step.detachedCanvasEvents.after,step.detachedCanvasEvents.before,'detached disposed canvas dispatched callbacks');");
replace('console.log(JSON.stringify({ dpr, angularRemounts: 3, retiredScenesZero: true, peerSurvived: true }));',
  'console.log(JSON.stringify({profile,viewport:requestedViewport,cases:cohort.cases,angularRemounts:3,retiredSceneAndTrackedRegistrationsZero:true,peerSurvived:true}));');
replace("'Light desktop DPR1/2 real Angular destroy/recreate cycles and passive public peer. Not all20 physical contexts,delayed font/media teardown,interactive late callbacks,paint or whole-case acceptance.'",
  "'Twenty source-derived physical cohorts,observed viewport/canvas/theme/DPR,Angular destroy/recreate and read-only retained runtime snapshots after disposal. Not trusted Router navigation,late-font/media cancellation,interactive peer callbacks,paint or whole-case acceptance.'");
replace('browserFiles, harness: fingerprintModuleGraph(process.cwd(), script)',
  `baseProducer:{file:${JSON.stringify(prior)},sha256:'eada8fcd6c5f17cb6bf88e041b4e3081c080be0a1e15983f22564d12e12dcd87'},browserFiles,harness:fingerprintModuleGraph(process.cwd(),script)`);
await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
