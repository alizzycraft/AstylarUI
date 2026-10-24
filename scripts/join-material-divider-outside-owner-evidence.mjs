import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = b => createHash('sha256').update(b).digest('hex');
export const dividerOutsideOwnerPredecessor = 'd00beaa884a5639f4294c5b81f4c49e1ec0c9cd1072fc77d4f7041fc6ff9bd3d';
const childName = 'boundedOutsideScalarOwnerInputs';
export function restoreDividerOutsideOwnerEvidence(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.inputStyleStructure[childName]) return group;
    const inputStyleStructure = { ...group.obligations.inputStyleStructure }; delete inputStyleStructure[childName];
    return { ...group, obligations: { ...group.obligations, inputStyleStructure } };
  }) };
}
export function joinDividerOutsideOwnerEvidence(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), dividerOutsideOwnerPredecessor);
  const load = (file, sha256) => {
    const bytes = read(file); assert.equal(hash(bytes), sha256);
    return { receipt: { file, sha256 }, data: JSON.parse((bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le') : bytes.toString()).replace(/^\ufeff/,'')) };
  };
  const borders = load('artifacts/material-parity/divider-outside-owner-border-attribution-20261025.log', 'f0a1d20accda2e5b91ca23e95289544f8e68abd0ff5430e0bcc865ec80b01d12');
  const clip = load('artifacts/material-parity/divider-heading-authored-clip-context-20261025.log', 'bab6edd1470d58d42bdcdc8acf3c3d94f0e6f627a47b1d17d00ea8fdc3f24a05');
  const geometry = load('artifacts/material-parity/divider-heading-boxes-verification-20261025.log', '7b2a7aed59de0bc26a5cf810dc1d23c2030102d3ec2f732cd3fa9e84ad4906e0');
  const capture = load(geometry.data.capture.file, geometry.data.capture.sha256);
  const owners = load('artifacts/material-parity/divider-frame-box-inputs-final-20261024.log', '1079d7c625336f18169c3aee9ac3629b69c266a88e8a59669cfbd2ebed15b71e');
  const eyebrowMargins=load('artifacts/material-parity/divider-eyebrow-margin-inputs-20261025.log','499f22f3b232eb91d7bcc8442ddb3680cb4979ffca034dca152eb28e41be04e4');
  const titleMargins=load('artifacts/material-parity/divider-heading-ua-verification-20261025.log','419439519449b7aab9b4182eeba421cf6111f555b4ccc4c349c369335579f19f');
  const wrapperInputs=load('artifacts/material-parity/divider-wrapper-position-margin-inputs-20261025.log','7d5f8724ae8852dc4cf9c8a2a6b3d7d6e07464c6d84c3943545a7efbdb127dd4');
  const typography=load('artifacts/material-parity/divider-wrapper-leaf-typography-inputs-20261025.log','874ea3e7a2825f569b5982511315bb101d5292f2640ed86666b4832257843757');
  const uaCapture=load(titleMargins.data.capture.file,titleMargins.data.capture.sha256);
  assert.equal(eyebrowMargins.data.eyebrowCases,24);assert.equal(titleMargins.data.physicalContexts,1);
  assert.equal(wrapperInputs.data.wrapperPairs,48);assert.equal(typography.data.leafPairs,48);
  for(const q of [eyebrowMargins.data.normalizer,typography.data.normalizer,titleMargins.data.producer])assert.equal(hash(read(q.file)),q.sha256);
  for (const receipt of [borders.data.producer,borders.data.declarationHelper,clip.data.selectorSource,geometry.data.producer]) assert.equal(hash(read(receipt.file)),receipt.sha256);
  assert.equal(borders.data.admittedOwnerPairs,120); assert.equal(borders.data.unclassifiedOwnerPairs,0);
  assert.equal(clip.data.headingPairs,48); assert.equal(geometry.data.headingPairs,8);
  assert.equal(capture.data.results.length,8);
  const producer = { file:'scripts/join-material-divider-outside-owner-evidence.mjs', sha256:hash(read('scripts/join-material-divider-outside-owner-evidence.mjs')) };
  let cases=0,physicalAliases=0;
  const groups=predecessor.groups.map(group=>{
    if(group.family!=='divider')return group;
    const mapping=owners.data.observations.filter(r=>r.case===group.case);assert.equal(mapping.length,1);
    assert.deepEqual(mapping[0].evidence,group.evidence.pairedTrees);
    const trees={};for(const [side,q] of Object.entries(mapping[0].evidence)){const b=read(q.file);assert.equal(hash(b),q.sha256);trees[side]=JSON.parse(b);}
    const borderRows=borders.data.observations.filter(r=>r.case===group.case);
    assert.deepEqual(borderRows.map(r=>r.id),mapping[0].outsideScalarTargets.map(r=>r.id));assert.equal(borderRows.length,5);
    for(const row of borderRows){assert.equal(row.classification,'intentional-documented-limitation');assert.equal(row.inputEquivalent,false);assert.equal(row.sourceFinding,'core-border-initial-color-differs-from-css');}
    const clipRows=clip.data.observations.filter(r=>r.case===group.case);assert.deepEqual(clipRows.map(r=>r.id),['title','eyebrow']);
    const eyebrow=eyebrowMargins.data.rows.filter(r=>r.case===group.case);assert.equal(eyebrow.length,1);
    assert.equal(eyebrow[0].classification,'equivalent-representation');
    const wrappers=wrapperInputs.data.rows.filter(r=>r.case===group.case);assert.deepEqual(wrappers.map(r=>r.id),['divider-above-row','divider-below-row']);
    for(const row of wrappers){assert.equal(row.inputEquivalent,false);assert.equal(row.sourceFinding,'fixture-divider-replaces-paragraph-flow-with-coordinates');}
    const textRows=typography.data.rows.filter(r=>r.case===group.case);assert.deepEqual(textRows.map(r=>r.id),['divider-above','divider-below']);
    for(const row of textRows){assert.equal(row.classification,'equivalent-representation');assert.equal(Object.keys(row.terminalStyles).length,8);}
    const nativeTitle=trees.reference.nodes.find(n=>n.type==='h1'),candidateTitle=trees.astylar.nodes.find(n=>n.authored?.id==='title');
    const titleStyle=trees.reference.styles[nativeTitle.style];assert.equal(titleStyle.fontSize,'32px');assert.equal(titleStyle.marginTop,'21.44px');assert.equal(titleStyle.marginBottom,'21.44px');
    for(const stage of [candidateTitle.normalResolvedStyle,candidateTitle.resolvedStyle,candidateTitle.interactionResolvedStyle]){assert.equal(stage.fontSize,'32px');assert.equal(stage.margin,'21.44px 0');}
    const match=/^(static|interaction):divider@([^/]+)\/([^/]+)(?:\/inspect)?$/.exec(group.case);assert.ok(match);
    const [,kind,profile,viewport]=match;
    let headingGeometry;
    if(viewport==='desktop'||viewport==='desktop-dpr1'){
      physicalAliases++;
      const pair={};for(const side of ['reference','astylar']){
        const rows=capture.data.results.filter(r=>r.profile===profile&&r.side===side);assert.equal(rows.length,1);pair[side]=rows[0].observation;
      }
      for(let i=0;i<2;i++){
        assert.equal(pair.reference.headings[i].id,pair.astylar.headings[i].id);
        assert.ok(Math.abs(pair.reference.headings[i].box.height-pair.astylar.headings[i].retainedLayout.height)<0.02);
      }
      assert.equal(pair.reference.headings[0].box.height,38);assert.equal(pair.astylar.headings[0].retainedLayout.height,38);
      headingGeometry={originalCaseKind:kind,profile,viewport:{width:1440,height:1000,dpr:1},observations:pair,
        boundary:'Supplementary physical context only;inspect is an alias,not original action replay. Logical boxes do not establish glyph/clip/raster or current-runtime acceptance.'};
    }
    assert.equal(group.obligations.inputStyleStructure[childName],undefined);cases++;
    return {...group,obligations:{...group.obligations,inputStyleStructure:{...group.obligations.inputStyleStructure,[childName]:{
      disposition:'inspected-bounded-outside-owner-properties',case:group.case,borderInputs:borderRows,headingClipDeclarations:clipRows,
      marginInputs:{eyebrow:eyebrow[0],title:{classification:'equivalent-representation',fontSize:'32px',resolvedBlockMargins:'21.44px',UA: titleMargins.data.UA,
        boundary:'Resolved fixed-font length only. Fresh one-context UA corroboration,not historical UA replay or proof of candidate omitted/em default path.'},wrappers},
      retainedLeafTypography:textRows,
      ...(headingGeometry?{headingGeometry}:{}),
      evidence:{borders:borders.receipt,clip:clip.receipt,geometry:geometry.receipt,capture:capture.receipt,owners:owners.receipt,
        eyebrowMargins:eyebrowMargins.receipt,titleMargins:titleMargins.receipt,uaCapture:uaCapture.receipt,wrapperInputs:wrapperInputs.receipt,typography:typography.receipt,producer},
      remainingDomains:['Other owner style/box-model/typography fields not inspected by these bounded proofs','Used margin/collapse/positioning behavior beyond recorded requests','Glyph/material/clip/raster and unequal masking remain separate','Current-source/runtime,lifetime and original final acceptance gates'],
      boundary:'Only named border attribution,clipping declarations,scoped margin requests and supplied leaf typography tokens,plus optional desktop-DPR1 boxes. Unequal masking/border/flow inputs remain. Every parent disposition,remaining task and acceptance gate preserves.'
    }}}};
  });
  assert.equal(cases,24);assert.equal(physicalAliases,8);
  const review={...predecessor,groups};
  assert.equal(hash(JSON.stringify(restoreDividerOutsideOwnerEvidence(review))),dividerOutsideOwnerPredecessor);
  return {review,sha256:hash(JSON.stringify(review)),cases,physicalAliases,addedChildren:cases};
}
