import assert from 'node:assert/strict';
import test from 'node:test';
import { sectionDigests } from '../../scripts/material-audit-section-digests.mjs';

const scan = (text, size = 7) => sectionDigests((function*() {
  const bytes = Buffer.from(text);
  for (let i = 0; i < bytes.length; i += size) yield bytes.subarray(i, i + size);
})());

test('all sections and nested data survive chunk boundaries and UTF-8 splits', async () => {
  const text = JSON.stringify({ schemaVersion: 1, a: { unicode: '日😀', list: [null, false, true, 2.5, {}, []] }, b: [], c: 'x' });
  const expected = await scan(text, 10000);
  for (const size of [1, 2, 3, 17]) assert.deepEqual(await scan(text, size), expected);
  assert.deepEqual(expected.map(s => s.name), ['schemaVersion', 'a', 'b', 'c']);
  assert.deepEqual(await scan(JSON.stringify(JSON.parse(text), null, 2)), expected);
  for (const changed of [text.replace('2.5', '2.6'), text.replace('false,true', 'true,false'),
    text.replace('"unicode":', '"renamed":')]) {
    const actual = await scan(changed);
    assert.notEqual(actual[1].sha256, expected[1].sha256);
    assert.deepEqual([actual[0], ...actual.slice(2)], [expected[0], ...expected.slice(2)]);
  }
  assert.notDeepEqual(await scan('{"a":{}}'), await scan('{"a":[]}'));
});

test('reject incomplete, duplicate-root-key, non-object and trailing-root data', async () => {
  for (const text of ['', '{"a":', '{"a":[1]', '{"a":1,"a":2}', '[]', '{}{}'])
    await assert.rejects(scan(text));
  assert.deepEqual(await scan('{}'), []);
  assert.deepEqual((await scan('{"a":1,"b":null}')).map(s => s.name), ['a', 'b']);
});
