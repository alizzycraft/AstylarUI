import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';
import { PNG } from 'pngjs';

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
      if(name!=='localPaint')assert.deepEqual(r.remaining,parent.obligations[name].remaining??[]);
    }
    const paint=value.requirements.localPaint,provenance=paint.originalCropProvenance;
    assert.deepEqual(paint.remaining,parent.obligations.localPaint.remaining.map(s=>s.replace(',original crop-producer applicability','')).concat('Fractional original native expectedBox and semantic target rectangle association remain unproved;integer pixel provenance does not replace them.'));
    assert.equal(provenance.originalProducerSourceAuthenticated,true);assert.equal(provenance.uniqueOriginalPixelRegions,4);assert.equal(provenance.originalCropFunctionEncodedReplayMatches,4);
    assert.equal(provenance.fractionalTargetGeometryRecovered,false);assert.equal(provenance.equalInputsAccepted,false);assert.equal(provenance.rasterAcceptanceChanged,false);
    assert.equal(hash(readFileSync(provenance.evidence.proof.file)),provenance.evidence.proof.sha256);
    assert.equal(provenance.evidence.observations.length,4);
  };
  validate(review);
  const promoted=structuredClone(review);promoted.inspection='complete';assert.throws(()=>validate(promoted));
  const cleared=structuredClone(review);cleared.requirements.localPaint.remaining=[];assert.throws(()=>validate(cleared));
  const rewritten=structuredClone(review);rewritten.requirements.historyOwnership.remaining=[];assert.throws(()=>validate(rewritten));
});
