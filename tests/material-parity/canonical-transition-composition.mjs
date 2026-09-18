import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

// The caller must authenticate the frozen payload bytes and independently
// reconstruct every expected row before calling this boundary. Keep the frozen
// serialization for the next byte-sensitive proof only after proving complete,
// ordered value equality. This does not authenticate either input by itself.
export function conserveIntermediateCanonicalRows(expected, frozen) {
  assert.equal(expected.length, frozen.length, 'intermediate canonical row count changed');
  let serializationOnlyRows = 0;
  for (let i = 0; i < expected.length; i++) {
    assert.ok(isDeepStrictEqual(expected[i], frozen[i]),
      `intermediate canonical row ${i} differs from independently reconstructed evidence`);
    if (JSON.stringify(expected[i]) !== JSON.stringify(frozen[i])) serializationOnlyRows++;
  }
  return { rows: structuredClone(frozen), serializationOnlyRows };
}
