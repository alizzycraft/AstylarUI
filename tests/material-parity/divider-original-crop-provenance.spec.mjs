import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { transformSync } from 'esbuild';

const hash=b=>createHash('sha256').update(b).digest('hex');
test('Original Divider light desktop crops are unique exact screenshot regions',t=>{
  const parentFile='artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json',bytes=readFileSync(parentFile);
  assert.equal(hash(bytes),'ed7ecfea82fef0406fc9e0430a2df16a7db4555d2fdd074568c96cb5f3b39868');
  const parent=JSON.parse(bytes).review.groups.find(r=>r.case==='static:divider@light/desktop');assert.ok(parent);
  const encodedFile='docs/evidence/material-original-runner-e01.mjs.gz.b64',encoded=readFileSync(encodedFile);
  const original=gunzipSync(Buffer.from(encoded.toString().replace(/\s/g,''),'base64'));
  assert.equal(hash(original),'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const ast=ts.createSourceFile('original.mjs',original.toString(),99,true,ts.ScriptKind.JS);
  const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='cropPng');assert.equal(nodes.length,1);
  const cropPng=new Function('PNG','return ('+nodes[0].getText(ast)+')')(PNG);
  const full=new Map();
  for(const side of ['reference','astylar']){
    const receipt=parent.obligations.localPaint.retainedSeparatorPaint.evidence.observations[side].span;
    const b=readFileSync(receipt.file);assert.equal(hash(b),receipt.sha256);full.set(side,{receipt,image:PNG.sync.read(b)});
  }
  const observations=[];
  for(const row of parent.obligations.localPaint.storedTextRasters.evidence.observations)for(const receipt of row.receipts){
    const side=receipt.file.endsWith('-reference.png')?'reference':'astylar',source=full.get(side),b=readFileSync(receipt.file);assert.equal(hash(b),receipt.sha256);
    const crop=PNG.sync.read(b),stride=crop.width*4,wholeStride=source.image.width*4;
    // A full scanline with maximal color variety is only a search accelerator.
    // Every byte of every crop row must still agree at the located origin.
    let anchorY=0,colors=-1;
    for(let y=0;y<crop.height;y++){
      const unique=new Set();for(let x=0;x<crop.width;x++)unique.add(crop.data.readUInt32BE((y*crop.width+x)*4));
      if(unique.size>colors){colors=unique.size;anchorY=y;}
    }
    assert.ok(colors>1,'A uniform crop cannot identify text provenance');
    const anchor=crop.data.subarray(anchorY*stride,(anchorY+1)*stride),matches=[];
    for(let offset=source.image.data.indexOf(anchor);offset>=0;offset=source.image.data.indexOf(anchor,offset+1)){
      if(offset%4)continue;const left=(offset%wholeStride)/4,top=Math.floor(offset/wholeStride)-anchorY;
      if(left+crop.width>source.image.width||top<0||top+crop.height>source.image.height)continue;
      let equal=true;for(let y=0;y<crop.height;y++){
        const at=((top+y)*source.image.width+left)*4;
        if(!crop.data.subarray(y*stride,(y+1)*stride).equals(source.image.data.subarray(at,at+stride))){equal=false;break;}
      }
      if(equal)matches.push({left,top,right:left+crop.width,bottom:top+crop.height});
    }
    assert.equal(matches.length,1,'Original crop must have one exact full-image origin');
    const replay=cropPng(source.image,matches[0]);assert.ok(replay.data.equals(crop.data));
    const encodedReplay=PNG.sync.write(replay);assert.equal(hash(encodedReplay),receipt.sha256);
    observations.push({id:row.id,side,crop:{file:receipt.file,sha256:receipt.sha256},full:{file:source.receipt.file,sha256:source.receipt.sha256},bounds:matches[0],decodedBytes:crop.data.length,encodedReplayMatches:true});
  }
  assert.equal(observations.length,4);
  for(const id of ['divider-above','divider-below'])assert.deepEqual(observations.filter(r=>r.id===id).map(r=>r.bounds),[observations.find(r=>r.id===id).bounds,observations.find(r=>r.id===id).bounds]);
  t.diagnostic(JSON.stringify({case:parent.case,encodedSource:{file:encodedFile,sha256:hash(encoded)},cropMethodSha256:hash(nodes[0].getText(ast)),observations,
    boundary:'Exact historical full-image/crop byte provenance and original cropPng replay at uniquely recovered integer bounds. This does not recover fractional native expectedBox or all writeAlignmentArtifacts parameters,prove semantic target bounds,equal rendering inputs,current code,or change any raster threshold/acceptance.'}));
});

test('Exact Divider requirement review reconciles crop provenance without clearing other gaps',()=>{
  const review=JSON.parse(readFileSync('docs/evidence/material-divider-light-desktop-requirement-review.json'));
  const b=readFileSync(review.basis.parent.file);assert.equal(hash(b),review.basis.parent.sha256);
  const parent=JSON.parse(b).review.groups.find(r=>r.case===review.case);assert.ok(parent);
  const validate=value=>{
    assert.equal(value.status,'partial-not-inspection-closure');assert.equal(value.inspection,'partial');assert.equal(value.currentRendering,'unverified');assert.equal(value.inspectionClosureAllowed,false);
    assert.deepEqual(Object.keys(value.requirements),Object.keys(parent.obligations));
    for(const [name,r]of Object.entries(value.requirements)){
      assert.equal(r.applicability,parent.obligations[name].applicability);assert.equal(r.disposition,parent.obligations[name].disposition);
      assert.equal(r.evidence.sha256,value.basis.parent.sha256);
      if(!['localPaint','historyOwnership'].includes(name))assert.deepEqual(r.remaining,parent.obligations[name].remaining??[]);
      if(name==='historyOwnership')assert.deepEqual(r.remaining,parent.obligations[name].remaining.map(s=>s==='late completion/remount/peer isolation applicability'?'Historical network-font timing and captured-runtime applicability of controlled font-disposal tests remain unproved;interactive-peer callbacks remain unproved. No authored image/media leaf requires a media-cancellation test. Public/Angular remount and passive-peer survival retain their recorded scope.':s));
    }
    const paint=value.requirements.localPaint,provenance=paint.originalCropProvenance;
    assert.deepEqual(paint.remaining,parent.obligations.localPaint.remaining.map((s,index)=>index===0?'Remaining paragraph/text or unreviewed-owner coverage/compositing attribution is unproved;the exact original separator footprint and opaque ink difference are attributed to unequal requests.':s.replace(',original crop-producer applicability','')).concat('Fractional original native expectedBox and semantic target rectangle association remain unproved;integer pixel provenance does not replace them.'));
    assert.equal(provenance.originalProducerSourceAuthenticated,true);assert.equal(provenance.uniqueOriginalPixelRegions,4);assert.equal(provenance.originalCropFunctionEncodedReplayMatches,4);
    assert.equal(provenance.fractionalTargetGeometryRecovered,false);assert.equal(provenance.equalInputsAccepted,false);assert.equal(provenance.rasterAcceptanceChanged,false);
    assert.equal(hash(readFileSync(provenance.evidence.proof.file)),provenance.evidence.proof.sha256);
    assert.equal(provenance.evidence.observations.length,4);
    assert.equal(paint.separatorPaintAttribution.classification,'application-plugin-authoring-defect');
    assert.equal(paint.separatorPaintAttribution.observedCoverageAlphaDiscrepancy,false);
    assert.equal(paint.separatorPaintAttribution.exactRequestedPixelsPerSide,720);
    assert.equal(hash(readFileSync(paint.separatorPaintAttribution.evidence.file)),paint.separatorPaintAttribution.evidence.sha256);
  };
  validate(review);
  const dividerTree=JSON.parse(readFileSync('artifacts/material-parity/current-full-20261005/divider/light/desktop/astylar-input-tree.json'));
  assert.ok(dividerTree.nodes.every(n=>!['img','image','video','audio','source'].includes(n.authored?.type)&&!n.authored?.src));
  const fontTests=readFileSync('src/lib/astylar-isolation.spec.ts','utf8');
  assert.ok(fontTests.includes('does not revive an Angular-owned surface when initial fonts resolve after destruction'));
  assert.ok(fontTests.includes("expect(() => loadingDone!(new Event('loadingdone'))).not.toThrow()"));
  const mapBytes=readFileSync('examples/material-showcase/dist/material-showcase/browser/chunk-XOU37TRR.js.map');
  assert.equal(hash(mapBytes),'8692027f86a8d2d5571de110d92ad3fdda97ea35da86adc10f1522a5134a686d');
  const map=JSON.parse(mapBytes),module='node_modules/astylarui/dist/lib/lib/astylar.js';
  const captured=map.sourcesContent[map.sources.indexOf(module)];assert.ok(captured);
  const createScene=source=>{
    const ast=ts.createSourceFile('owner.js',source,99,true,ts.ScriptKind.JS),matches=[];
    const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='createScene')matches.push(node.getText(ast));ts.forEachChild(node,visit);};visit(ast);
    assert.equal(matches.length,1);
    return transformSync('class Owner{'+matches[0]+'}',{loader:'js',minifyWhitespace:true,minifySyntax:true}).code;
  };
  const current=ts.transpileModule(readFileSync('src/lib/astylar.ts','utf8'),{compilerOptions:{target:99,module:99,experimentalDecorators:true}}).outputText;
  assert.equal(createScene(current),createScene(captured));
  assert.equal(createScene(readFileSync('examples/material-showcase/'+module,'utf8')),createScene(captured));
  for(const guard of ['if (session.isDisposed)', 'if (scene.isDisposed)', "fontSet.removeEventListener('loadingdone', handleFontsLoaded)"])assert.ok(captured.includes(guard));
  const structure=parent.obligations.inputStyleStructure;
  const natural=structure.retainedDividerPropertyContexts;
  assert.equal(hash(readFileSync(natural.evidence.naturalLineBoxes.file)),natural.evidence.naturalLineBoxes.sha256);
  assert.equal(natural.rows.lineBox.observations.length,2);
  for(const row of natural.rows.lineBox.observations){
    assert.equal(row.before.parentBox.height,19);assert.equal(row.before.labelBox.height,19);assert.equal(row.measured.naturalHeight,19);
    assert.match(row.measured.scope,/does not establish wrapper layout, baseline/);
    const placement=structure.retainedInlinePlacementAttribution.observations.find(p=>p.id===row.id);
    assert.equal(placement.measuredInlineHeight,19);assert.equal(placement.declaredParagraphHeight,'22px');
  }
  const baseline=review.requirements.inputStyleStructure.scopedBaselineEvidence;
  const readEvidence=receipt=>{
    const bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);
    return JSON.parse(bytes.toString(bytes[0]===255?'utf16le':'utf8').replace(/^\ufeff/,''));
  };
  const publicBaseline=readEvidence(baseline.public),liveBaseline=readEvidence(baseline.materialLive);
  assert.equal(publicBaseline.results.length,8);assert.equal(liveBaseline.results.length,8);
  for(const row of publicBaseline.results.filter(r=>r.mode==='reference')){
    assert.equal(row.nativeBaseline.markerDidNotChangeParagraph,true);assert.equal(row.nativeBaseline.markerDidNotMoveText,true);
    const peer=publicBaseline.results.find(r=>r.mode==='astylar'&&r.font===row.font&&r.unit===row.unit);
    assert.ok(peer.draws.some(d=>d.y===row.nativeBaseline.offset));
  }
  for(const row of liveBaseline.results.filter(r=>r.side==='reference')){
    const peer=liveBaseline.results.find(r=>r.side==='astylar'&&r.profile===row.profile);
    for(const target of row.observation.native){
      const live=peer.observation.live.find(t=>t.id===target.id);assert.equal(live.draws.length,1);
      assert.equal(live.draws[0].y,target.baselineOffset);
    }
  }
  assert.equal(baseline.globalBaselineEqualityAccepted,false);assert.equal(baseline.originalAnonymousStrutCorrespondenceAccepted,false);
  const currentness=parent.obligations.sourceCurrentness;
  let receiptCount=0;
  const authenticate=value=>{
    if(!value||typeof value!=='object')return;
    if(value.file&&value.sha256){assert.equal(hash(readFileSync(value.file)),value.sha256);receiptCount++;}
    else for(const child of Object.values(value))authenticate(child);
  };
  for(const name of ['retainedMatchingDividerCapture','newerMappedRuntimeApplicability','freshCurrentBrowserDividerCapture'])authenticate(currentness[name].evidence);
  assert.equal(receiptCount,29);
  assert.equal(currentness.retainedMatchingDividerCapture.matchingServedFiles,1887);
  assert.equal(currentness.newerMappedRuntimeApplicability.modules,88);
  assert.equal(currentness.freshCurrentBrowserDividerCapture.aggregateAcceptance,false);
  assert.match(review.requirements.sourceCurrentness.conclusion,/do not establish current execution/);
  const promoted=structuredClone(review);promoted.inspection='complete';assert.throws(()=>validate(promoted));
  const cleared=structuredClone(review);cleared.requirements.localPaint.remaining=[];assert.throws(()=>validate(cleared));
  const rewritten=structuredClone(review);rewritten.requirements.historyOwnership.remaining=[];assert.throws(()=>validate(rewritten));
});

test('Original light desktop separator paints both unequal requested inks over identical footprints',t=>{
  const file='artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json',b=readFileSync(file);
  assert.equal(hash(b),'ed7ecfea82fef0406fc9e0430a2df16a7db4555d2fdd074568c96cb5f3b39868');
  const parent=JSON.parse(b).review.groups.find(r=>r.case==='static:divider@light/desktop'),paint=parent.obligations.localPaint;
  assert.equal(hash(readFileSync(paint.separatorEndpointFootprints.evidence.file)),paint.separatorEndpointFootprints.evidence.sha256);
  const rows=paint.separatorEndpointFootprints.observations;assert.equal(rows.length,2);const observations=[];
  for(const row of rows){
    const bytes=readFileSync(row.image.file);assert.equal(hash(bytes),row.image.sha256);const image=PNG.sync.read(bytes);
    const tb=readFileSync(row.tree.file);assert.equal(hash(tb),row.tree.sha256);const tree=JSON.parse(tb);
    const native=row.side==='reference';
    const node=tree.nodes.find(n=>native?n.attributes?.id==='divider-primary':n.authored?.id==='divider-primary');assert.ok(node);
    const style=native?tree.styles[node.style]:node.resolvedStyle;
    let ink;
    if(native){assert.equal(style.borderTopWidth,'1px');assert.equal(style.height,'0px');ink=style.borderTopColor.match(/\d+/g).map(Number).concat(255);}
    else{assert.equal(style.borderWidth,'0');assert.equal(style.height,'1px');assert.equal(style.position,'absolute');ink=[1,3,5].map(i=>parseInt(style.background.slice(i,i+2),16)).concat(255);}
    assert.deepEqual(ink,native?[123,117,127,255]:[202,196,208,255]);
    assert.deepEqual(row.footprint,{left:65,top:232,right:785,bottom:233});assert.equal(row.changedPixels,720);assert.equal(row.connectedComponents,1);assert.equal(row.clearPaddedRing,true);
    const background=[246,241,249,255];let changed=0;
    for(let y=row.band.top;y<row.band.bottom;y++)for(let x=row.band.left;x<row.band.right;x++){
      const inside=x>=65&&x<785&&y===232,at=(y*image.width+x)*4;
      assert.deepEqual([...image.data.subarray(at,at+4)],inside?ink:background);
      if(inside)changed++;
    }
    assert.equal(changed,720);observations.push({side:row.side,image:row.image,tree:row.tree,requestedInk:ink,footprint:row.footprint,exactRequestedPixels:changed});
  }
  t.diagnostic(JSON.stringify({case:parent.case,classification:'application-plugin-authoring-defect',firstDivergence:'Native1px top-border RGB123/117/127 versus candidate positioned1px fill RGB202/196/208 before layout/paint.',observations,
    boundary:'Only exact original light/desktop separator band. Both observed footprints and requested opaque inks agree with own inputs;no observed coverage/alpha defect here. Does not accept unequal border/fill intent,other themes/DPR,paragraph text,GPU internals or current rendering.'}));
});

test('Text paint hypothesis review preserves fresh-control scope and suspected classification',()=>{
  const review=JSON.parse(readFileSync('docs/evidence/material-divider-light-desktop-requirement-review.json'));
  const b=readFileSync(review.basis.parent.file);assert.equal(hash(b),review.basis.parent.sha256);
  const paint=JSON.parse(b).review.groups.find(r=>r.case===review.case).obligations.localPaint,record=review.requirements.localPaint.textPaintHypothesisReview;
  assert.equal(record.originalCaseCauseConfirmed,false);assert.equal(record.opaqueAtlasRecommended,false);assert.equal(record.layoutSnappingRecommended,false);
  assert.equal(record.existingFinding.id,'core-text-transparent-backing-and-local-raster-phase');assert.equal(record.existingFinding.classification,'suspected-core-renderer-defect');
  assert.equal(sourceAuditDefinitions.find(f=>f.id===record.existingFinding.id)?.classification,record.existingFinding.classification);
  assert.deepEqual(record.records.map(r=>r.name),['actualNativeCanvasGeneration','actualSettledFontFreshness','observedTextMaterialState']);
  for(const r of record.records){
    assert.equal(r.scope,paint[r.name].boundary);
    assert.deepEqual(r.observations,paint[r.name].observations??paint[r.name].targets);
    for(const q of Object.values(r.evidence))assert.equal(hash(readFileSync(q.file)),q.sha256);
  }
  for(const row of record.records[0].observations)assert.ok(row.transparent.differingPixels>0&&row.transparent.maximumRGBError>1);
  for(const row of record.records[1].observations){assert.equal(row.liveRGBA,row.sameRGBA);assert.ok(row.fallbackAlphaDifferences>0);}
  for(const row of record.records[2].observations){assert.equal(row.material.alpha,1);assert.equal(row.ready,true);assert.equal(row.allRecordedOpacityRequestsUnit,true);}
  assert.equal(review.inspection,'partial');assert.equal(review.currentRendering,'unverified');assert.equal(review.inspectionClosureAllowed,false);
});

test('Scoped lifetime review distinguishes actual remount witnesses from late-work acceptance',()=>{
  const review=JSON.parse(readFileSync('docs/evidence/material-divider-light-desktop-requirement-review.json'));
  const b=readFileSync(review.basis.parent.file);assert.equal(hash(b),review.basis.parent.sha256);
  const h=JSON.parse(b).review.groups.find(r=>r.case===review.case).obligations.historyOwnership,r=review.requirements.historyOwnership.scopedLifetimeReview;
  assert.deepEqual(r.publicRemount.context,h.actualDividerPublicRemount.context);assert.equal(r.publicRemount.context.remounts,3);assert.equal(r.publicRemount.context.boundaries,14);
  assert.equal(r.publicRemount.inputCorrespondence.authoredNodes,10);assert.equal(r.publicRemount.inputCorrespondence.identicalRules,293);
  assert.equal(r.publicRemount.scope,h.actualDividerPublicRemount.boundary);
  assert.equal(r.angularLifetime.conclusion,h.actualAngularComponentLifetime.conclusion);assert.equal(r.angularLifetime.scope,h.actualAngularComponentLifetime.boundary);
  assert.equal(r.angularLifetime.remounts,3);assert.equal(r.angularLifetime.deactivations,4);assert.ok(r.angularLifetime.physicalCohortCases.includes(review.case));
  for(const context of [r.publicRemount,r.angularLifetime])for(const q of Object.values(context.evidence))assert.equal(hash(readFileSync(q.file)),q.sha256);
  for(const key of ['lateFontMediaCancellationAccepted','interactivePeerCallbacksAccepted','originalStaticActionReplay','currentLifetimeAccepted'])assert.equal(r[key],false);
  assert.equal(review.requirements.historyOwnership.disposition,'partial');assert.equal(review.inspectionClosureAllowed,false);
});
