import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createRadioCaretReviewReader, radioCaretPaintReview } from '../tests/material-parity/radio-caret-case-review-source.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export const pointerFocusPredecessor = '6889b546f95572c1df93b4c598634b3ad3565553bc69a99ff2a9e1c6b791590c';
export const pointerFocusCapture = {
  file: 'artifacts/material-parity/configured-control-activation-distinct-20261017/latest-report.json',
  sha256: '945d1232074796ec066d8403ca606e13180c4c91a8540be062ddd7950cc1e406',
};

// Reuse measured pointer-focus boundaries in their exact cases. This does not
// substitute pointer actions for programmatic/keyboard focus or infer correctness
// from different native/generated IDs, later trees, or final selection state.
export function joinRetainedPointerFocus(predecessor, captureBytes) {
  assert.equal(hash(JSON.stringify(predecessor)), pointerFocusPredecessor);
  assert.equal(hash(captureBytes), pointerFocusCapture.sha256);
  const capture = JSON.parse(captureBytes), review = structuredClone(predecessor);
  assert.equal(capture.results.length, 113);
  const seen = new Set();
  for (const row of capture.results) {
    const id = `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}`;
    assert.ok(!seen.has(id)); seen.add(id);
    const groups = review.groups.filter(group => group.case === id);
    assert.equal(groups.length, 1);
    const group = groups[0], activation = group.obligations.authoredActivation.configuredRawPointerObservation;
    assert.ok(activation);
    assert.deepEqual(activation.evidence.report, pointerFocusCapture);
    const focus = group.obligations.programmaticFocus;
    assert.equal(focus.disposition, 'evidence-join-pending');
    assert.equal(focus.retainedPointerFocusBoundaries, undefined);
    const observations = {};
    for (const side of ['reference', 'astylar']) {
      assert.deepEqual(activation.observations[side], row[side].observations);
      assert.deepEqual(row[side].observations.map(value => value.boundary), ['before', 'after-action', 'settled']);
      observations[side] = row[side].observations.map(value => {
        assert.equal(value.targetKind, 'focus-selector-candidate-not-pointer-hit');
        assert.ok(value.active && Array.isArray(value.activeAncestry) && Array.isArray(value.events));
        return { boundary: value.boundary, active: value.active, activeAncestry: value.activeAncestry,
          activeWithinHost: value.activeWithinHost, activeEqualsTarget: value.activeEqualsTarget,
          events: value.events };
      });
    }
    focus.retainedPointerFocusBoundaries = {
      disposition: 'inspected-retained-pointer-focus-only', case: id, caseId: row.caseId,
      sourceObligation: 'authoredActivation.configuredRawPointerObservation',
      completeSourceObservationSha256: hash(JSON.stringify(activation)),
      evidence: pointerFocusCapture, observations, currentRenderingAccepted: false,
      boundary: 'Exact retained pointer action and direct observed active owners only. Focus-selector target is not a pointer-hit witness. Later trees do not establish earlier action-time inputs. Different ID namespaces are not automatic focus failures.',
      remaining: ['Programmatic and keyboard focus need their own exact-action evidence.',
        'Complete focus restoration,source/runtime currentness,paint and whole-case acceptance remain open.'],
    };
    focus.disposition = 'partial';
  }
  assert.equal(seen.size, 113);
  const restored = structuredClone(review);
  for (const group of restored.groups) {
    const focus = group.obligations.programmaticFocus;
    if (!focus.retainedPointerFocusBoundaries) continue;
    delete focus.retainedPointerFocusBoundaries;
    focus.disposition = 'evidence-join-pending';
  }
  assert.equal(hash(JSON.stringify(restored)), pointerFocusPredecessor, 'All prior fields and remaining work must conserve');
  return review;
}

export const disabledFocusPredecessor = '6c39adadf48ddcfd2a2b80f732b4d09114e2c8ed53810cf61786026b99253e40';

export function joinRetainedDisabledFocusOwners(predecessor, read) {
  assert.equal(hash(JSON.stringify(predecessor)), disabledFocusPredecessor);
  const review = structuredClone(predecessor), logs = new Map();
  const hasOwner = value => value && Object.hasOwn(value, 'focusedOwner');
  const measured = entry => ['before','after'].every(boundary =>
    ['reference','astylar'].every(side => hasOwner(entry.observation?.[boundary]?.[side])));
  let cases = 0, actions = 0;
  const cohorts = new Map();
  for (const group of review.groups) {
    const focus = group.obligations.programmaticFocus;
    if (focus.disposition !== 'evidence-join-pending') continue;
    const raw = group.obligations.authoredActivation.retainedRawControlActions;
    if (!Array.isArray(raw) || !raw.some(measured)) continue;
    assert.match(group.case, /^interaction:(checkbox|slider)@(light|dark|contrast|custom)\/desktop-dpr[12]\/disabled$/);
    const sources = [];
    for (const [index, entry] of raw.entries()) {
      if (!measured(entry)) continue;
      const receipt = entry.evidence.log;
      if (!logs.has(receipt.file)) {
        const bytes = read(receipt.file);
        assert.equal(hash(bytes), receipt.sha256);
        logs.set(receipt.file, { sha256: receipt.sha256, rows: bytes.toString().trim().split(/\r?\n/).map(line => JSON.parse(line)) });
      }
      const log = logs.get(receipt.file); assert.equal(log.sha256, receipt.sha256);
      cohorts.set(receipt.file, (cohorts.get(receipt.file) ?? 0) + 1);
      const observation = entry.observation, c = observation.case;
      assert.equal(`interaction:${c.family}@${c.profile}/${c.viewport.id}/${c.state}`, group.case);
      const matches = log.rows.filter(row => JSON.stringify(row.case) === JSON.stringify(c));
      assert.equal(matches.length, 1); assert.deepEqual(matches[0], observation);
      assert.equal(observation.acceptance, false);
      const boundaries = [];
      const record = (boundary, value) => {
        for (const side of ['reference','astylar']) assert.ok(hasOwner(value[side]));
        boundaries.push({ boundary, reference: value.reference.focusedOwner, astylar: value.astylar.focusedOwner });
      };
      record('before', observation.before); record('after', observation.after);
      for (const field of ['keyboardBoundaries','pointerBoundaries'])
        for (const [ordinal, value] of (observation[field] ?? []).entries())
          record({ collection: field, ordinal, ...(Object.hasOwn(value,'action') ? { action:value.action } : {}) }, value);
      sources.push({ sourceIndex: index, completeSourceObservationSha256: hash(JSON.stringify(entry)), evidence: receipt,
        modes: Object.fromEntries(['keyboardOnly','disabledKeyboardOnly','disabledPointerOnly','sliderMotionOnly']
          .filter(key => Object.hasOwn(observation,key)).map(key => [key,observation[key]])), boundaries });
      actions++;
    }
    assert.equal(focus.retainedDisabledFocusOwners, undefined);
    focus.retainedDisabledFocusOwners = {
      disposition: 'inspected-serialized-owner-only', case: group.case,
      sourceObligation: 'authoredActivation.retainedRawControlActions', sources, currentRenderingAccepted: false,
      boundary: 'Exact retained disabled physical anchors. Additional keyboard/pointer/held actions remain supplementary. Recorded owner strings are not complete active-descendant association or focus-event histories;native BODY and candidate CANVAS/control owners are not normalized to equality.',
      remaining: ['Direct active-descendant identity,focus events and other focus actions remain open.',
        'Current runtime,paint,lifetime and whole-case acceptance remain unverified.'],
    };
    focus.disposition = 'partial'; cases++;
  }
  assert.equal(cases, 16); assert.equal(actions, 39);
  assert.deepEqual([...cohorts].sort(), [
    ['artifacts/material-parity/disabled-slider-held-centers-20261012.log',8],
    ['artifacts/material-parity/raw-disabled-control-keyboard-events-20261012.log',15],
    ['artifacts/material-parity/raw-disabled-control-pointer-events-20261012.log',16],
  ].sort());
  const restored = structuredClone(review);
  for (const group of restored.groups) {
    const focus = group.obligations.programmaticFocus;
    if (!focus.retainedDisabledFocusOwners) continue;
    delete focus.retainedDisabledFocusOwners; focus.disposition = 'evidence-join-pending';
  }
  assert.equal(hash(JSON.stringify(restored)), disabledFocusPredecessor);
  return review;
}

export function joinRetainedFocusObservationBatch(predecessor, read) {
  const review = joinRetainedDisabledFocusOwners(predecessor, read);
  let pairs = 0;
  for (const group of review.groups) {
    const source = group.obligations.semantics.retainedConfiguredActivateActualAx;
    const focus = group.obligations.programmaticFocus;
    if (!source || focus.disposition !== 'evidence-join-pending') continue;
    assert.equal(group.family, 'bottom-sheet');
    assert.match(group.case, /^interaction:bottom-sheet@[^/]+\/[^/]+\/activate$/);
    const observations = [];
    for (const receipt of source.evidence.raw) {
      const bytes = read(receipt.file); assert.equal(hash(bytes),receipt.sha256);
      const raw = JSON.parse(bytes);
      assert.equal(`interaction:${raw.family}@${raw.profile}/${raw.viewport.id}/${raw.state}`,group.case);
      assert.equal(raw.boundary,'after-configured-activate-and-settlement');
      assert.deepEqual(raw.runtimeErrors,[]);
      const nodes = raw.nodes.filter(node => !node.ignored && node.role.value !== 'RootWebArea' &&
        node.properties.some(property => property.name === 'focused' && property.value.value === true));
      assert.equal(nodes.length,1);
      const node = nodes[0], result = {backend:node.backendDOMNodeId,role:node.role.value,name:node.name.value};
      const saved = source.observations.filter(observation => observation.mode === raw.mode);
      assert.equal(saved.length,1); assert.deepEqual(result,saved[0].result.focused);
      const dom = raw.dom.filter(item => item.backendNodeId === result.backend);
      assert.equal(dom.length,1);
      observations.push({mode:raw.mode,focused:result,domNodeName:dom[0].nodeName,evidence:receipt});
    }
    assert.deepEqual(observations.map(o=>o.mode).sort(),['astylar','reference']);
    assert.deepEqual(observations.find(o=>o.mode==='reference').focused.role,'link');
    assert.deepEqual(observations.find(o=>o.mode==='reference').focused.name,'Share');
    assert.deepEqual(observations.find(o=>o.mode==='astylar').focused.role,'button');
    assert.deepEqual(observations.find(o=>o.mode==='astylar').focused.name,'Open bottom sheet');
    assert.equal(focus.retainedAxEndpointFocus,undefined);
    const history = group.obligations.historyOwnership.retainedAuthoredFocusRequestSourceApplicability;
    assert.ok(history);
    focus.retainedAxEndpointFocus = {
      disposition:'inspected-actual-ax-endpoint-only',case:group.case,
      sourceObligation:'semantics.retainedConfiguredActivateActualAx',
      completeSourceObservationSha256:hash(JSON.stringify(source)),observations,
      historySourceObligation:'historyOwnership.retainedAuthoredFocusRequestSourceApplicability',
      completeHistoryObservationSha256:hash(JSON.stringify(history)),currentRenderingAccepted:false,
      boundary:'Actual backend-bound AX focus after the exact retained activate/settlement endpoint. Different focused roles/names remain observations,not a new core diagnosis. Historical request ordering does not establish current endpoint timing for all nine pairs.',
      remaining:['First current focus-request/update divergence and complete trapping/restoration remain open.',
        'Current rendering,paint,lifetime and whole-case acceptance remain unverified.'],
    };
    focus.disposition='partial'; pairs++;
  }
  assert.equal(pairs,9);
  const restored=structuredClone(review);
  for(const group of restored.groups){
    const focus=group.obligations.programmaticFocus;
    for(const key of ['retainedDisabledFocusOwners','retainedAxEndpointFocus']){
      if(!focus[key])continue;
      delete focus[key];focus.disposition='evidence-join-pending';
    }
  }
  assert.equal(hash(JSON.stringify(restored)),disabledFocusPredecessor);
  return review;
}

export const retainedFocusObservationReview = 'aeb1ef1452d65ab53677088ee2944bdf453a7b0d2e0e9f6fed0f987a4e3f4a36';

export function createRetainedFocusReviewReader({root,read,reviewSha256}) {
  assert.equal(reviewSha256,retainedFocusObservationReview,'Unknown retained focus review');
  const file=path.resolve(root,`artifacts/material-parity/working-audit/proposals/${reviewSha256}.json`);
  const envelope=JSON.parse(read(file));
  assert.equal(envelope.sha256,reviewSha256);
  assert.equal(hash(JSON.stringify(envelope.review)),reviewSha256);
  let disabled=0,ax=0,pointer=0;
  for(const group of envelope.review.groups){
    assert.equal(group.inspection,'partial');assert.equal(group.currentRendering,'unverified');
    const focus=group.obligations.programmaticFocus;
    for(const [key,kind] of [['retainedDisabledFocusOwners','disabled'],['retainedAxEndpointFocus','ax']]){
      if(!focus[key])continue;
      assert.equal(focus[key].case,group.case);assert.equal(focus[key].currentRenderingAccepted,false);
      assert.equal(focus.disposition,'partial');
      delete focus[key];focus.disposition='evidence-join-pending';
      if(kind==='disabled')disabled++;else ax++;
    }
  }
  assert.deepEqual([disabled,ax],[16,9]);
  assert.equal(hash(JSON.stringify(envelope.review)),disabledFocusPredecessor);
  for(const group of envelope.review.groups){
    const focus=group.obligations.programmaticFocus,child=focus.retainedPointerFocusBoundaries;
    if(!child)continue;
    assert.equal(child.case,group.case);assert.equal(child.currentRenderingAccepted,false);
    assert.equal(focus.disposition,'partial');
    delete focus.retainedPointerFocusBoundaries;focus.disposition='evidence-join-pending';pointer++;
  }
  assert.equal(pointer,113);
  assert.equal(hash(JSON.stringify(envelope.review)),pointerFocusPredecessor);
  const base=createRadioCaretReviewReader({root,read,reviewSha256:radioCaretPaintReview});
  return {read:base.read,sourceApplicability:{
    mode:'exact-retained-focus-observation-successor',reviewSha256,
    predecessorReviews:[disabledFocusPredecessor,pointerFocusPredecessor],completePredecessorsRecovered:true,
    pointerFocusChildren:pointer,disabledFocusChildren:disabled,axFocusChildren:ax,
    predecessorApplicability:base.sourceApplicability,
    boundary:'Only138 exact partial focus links and their pending-to-partial dispositions. Pointer,supplementary disabled probes and AX endpoints retain separate limits;no programmatic/keyboard substitution,current rendering acceptance or case closure.',
  }};
}
