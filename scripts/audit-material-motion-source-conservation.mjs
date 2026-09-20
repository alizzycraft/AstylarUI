import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { collectMotionSourceConservation } from '../tests/material-parity/motion-source-conservation.mjs';

assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
const report = collectMotionSourceConservation();
const text = JSON.stringify(report, null, 2) + '\n';
const target = 'docs/material-motion-source-conservation.json';
if (process.argv[2] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), text);
else writeFileSync(target, text);
console.log(text);
