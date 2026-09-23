import assert from 'node:assert/strict';
import { withAuditEvidenceSession } from '../tests/material-parity/audit-evidence-session.mjs';
import { collectPositionCompositionReview, validatePositionCompositionReview } from '../tests/material-parity/position-composition-review.mjs';
import { collectPositionFollowupReview, validatePositionFollowupReview } from '../tests/material-parity/position-followup-review.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';

assert.equal(process.argv[2], 'position', 'Currently supported review area: position');
assert.ok(process.argv.slice(3).every(arg => arg === '--cold'), 'Unknown review option');
const reviews = withAuditEvidenceSession(() => {
  const composition = collectPositionCompositionReview(), followup = collectPositionFollowupReview();
  validatePositionCompositionReview(composition); validatePositionFollowupReview(followup);
  return [composition, followup];
}, { cold: process.argv.includes('--cold'), onMetrics: evidenceSession => console.log(JSON.stringify({ evidenceSession })) });
for (const review of reviews) console.log(JSON.stringify(saveReviewProposal('artifacts/material-parity/working-audit', review)));
