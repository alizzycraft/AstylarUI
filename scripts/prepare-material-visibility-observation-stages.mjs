import { writeFileSync } from 'node:fs';
import { collectVisibilityObservationStages } from '../tests/material-parity/visibility-observation-stage.mjs';
const report = collectVisibilityObservationStages();
writeFileSync('docs/material-visibility-observation-stages.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts));
