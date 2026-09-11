import { indexAuthoredStructures, materialStyleSnapshot } from './material-input-evidence';

describe('Material input evidence serialization', () => {
  it('retains resolved longhands and future scalar properties without an allowlist', () => {
    expect(materialStyleSnapshot({ selector: '#x', mediaMaxWidth: '500px', transformOrigin: '20px 10px',
      clipPath: 'inset(2px)', borderLeftWidth: '1px', overflowX: 'hidden', wordBreak: 'break-all',
      opacity: 0, futureStyle: 'value', absent: undefined })).toEqual({ transformOrigin: '20px 10px',
      clipPath: 'inset(2px)', borderLeftWidth: '1px', overflowX: 'hidden', wordBreak: 'break-all',
      opacity: '0', futureStyle: 'value' });
  });

  it('matches subtree text and mapped document order without adding input values to parents', () => {
    const structures = indexAuthoredStructures({ id: 'root', children: [
      { id: 'wrapper', type: 'div', children: [{ id: 'first', type: 'span', textContent: 'First ' }] },
      { id: 'field', type: 'input', value: 'typed' },
      { id: 'second', type: 'span', textContent: 'Second' },
    ] }, ['second', 'root', 'first', 'field']);
    expect(structures['root'].text).toBe('First Second');
    expect(structures['root'].ownText).toBe('');
    expect(structures['root'].descendantIds).toEqual(['first', 'field', 'second']);
    expect(structures['field'].text).toBe('typed');
    expect(structures['wrapper'].text).toBe('First');
  });
});
