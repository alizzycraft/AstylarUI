import { collectAuthoredInputTree, collectMaterialCoreResolvedStyles, collectMaterialResolvedStyles, indexAuthoredStructures, materialStyleSnapshot } from './material-input-evidence';

describe('Material input evidence serialization', () => {
  it('preserves actual control texture inputs and parsed units independently of other style stages', () => {
    const paintedControlText = {
      source: 'core-control-texture' as const, text: 'Action', maxWidth: 120,
      style: { fontFamily: 'Arial', fontSize: 16, fontWeight: '500' as const, fontStyle: 'normal' as const,
        color: '#abcdef', textAlign: 'center' as const, verticalAlign: 'baseline' as const,
        lineHeight: 1.5, letterSpacing: .5, wordSpacing: 0, whiteSpace: 'normal' as const,
        wordWrap: 'normal' as const, textOverflow: 'clip' as const, textDecoration: 'none' as const,
        textTransform: 'none' as const, textShadow: [{ offsetX: 1, offsetY: 2, blurRadius: 3, color: '#123456' }] },
    };
    const before = structuredClone(paintedControlText);
    const styles = collectMaterialCoreResolvedStyles({ revision: 9, elements: [
      { path: 'root/0', id: 'action', type: 'button', normal: { selector: '#action', color: 'black' },
        effective: { selector: '#action', color: 'purple' },
        retainedText: { source: 'core-text-registry', style: { selector: '#action', color: 'blue', fontSize: '20px' } },
        paintedControlText },
      { path: 'root/1', id: 'empty', type: 'button', normal: { selector: '#empty' }, effective: { selector: '#empty' } },
    ] });
    const root = { children: [{ id: 'action', type: 'button', value: 'Action' }, { id: 'empty', type: 'button' }] };
    const tree = collectAuthoredInputTree(root, [], styles.effective, styles);
    expect(tree.paintedControlTextEvidenceVersion).toBe(1);
    expect(tree.nodes[1]).toEqual(jasmine.objectContaining({
      normalResolvedStyle: { color: 'black' }, resolvedStyle: { color: 'purple' },
      retainedText: { source: 'core-text-registry', style: { color: 'blue', fontSize: '20px' } },
      paintedControlText: before,
    }));
    expect(tree.nodes[2]).not.toEqual(jasmine.objectContaining({ paintedControlText: jasmine.anything() }));
    expect(styles.normal.get('action')?.['fontSize']).toBeUndefined();
    paintedControlText.style.textShadow[0].offsetX = 99;
    expect(styles.byPath.get('root/0')?.paintedControlText).toEqual(before);
    (tree.nodes[1] as { paintedControlText: typeof paintedControlText }).paintedControlText.style.fontSize = 999;
    const again = collectAuthoredInputTree(root, [], styles.effective, styles);
    expect(again.nodes[1]).toEqual(jasmine.objectContaining({ paintedControlText: before }));
    const legacy = collectMaterialResolvedStyles([{ metadata: { elementId: 'action', astylarResolvedStyle: { fontSize: '16px' } } }]);
    expect(collectAuthoredInputTree(root, [], legacy.effective, legacy).paintedControlTextEvidenceVersion).toBeUndefined();
  });

  it('retains text-stage provenance without merging it into cascade or pseudo-state inputs', () => {
    const styles = collectMaterialCoreResolvedStyles({ revision: 8, elements: [
      { path: 'root/0', id: 'child', type: 'div', normal: { selector: '#child', color: 'black' },
        effective: { selector: '#child', color: 'purple' },
        retainedText: { source: 'core-text-registry', style: { selector: '#child', color: 'black', fontSize: '24px', lineHeight: '32px' } } },
    ] });
    const tree = collectAuthoredInputTree({ children: [{ id: 'child', type: 'div', textContent: 'Inherited' }] }, [], styles.effective, styles);
    expect(tree.nodes[1]).toEqual(jasmine.objectContaining({
      normalResolvedStyle: { color: 'black' }, resolvedStyle: { color: 'purple' },
      retainedText: { source: 'core-text-registry', style: { color: 'black', fontSize: '24px', lineHeight: '32px' } },
    }));
    expect(styles.normal.get('child')?.['fontSize']).toBeUndefined();
  });

  it('captures hidden and anonymous nodes by core tree path, not mesh existence', () => {
    const styles = collectMaterialCoreResolvedStyles({ revision: 7, elements: [
      { path: 'root/0', id: 'hidden', type: 'div', normal: { selector: '#hidden', display: 'none' }, effective: { selector: '#hidden', display: 'none' } },
      { path: 'root/0/0', type: 'span', normal: { selector: 'span', color: 'black' }, effective: { selector: 'span', color: 'purple' } },
    ] });
    const tree = collectAuthoredInputTree({ children: [{ id: 'hidden', type: 'div', children: [{ type: 'span' }] }] }, [], styles.effective, styles);
    expect(tree.resolvedStyleSource).toBe('core-style-inspection');
    expect(tree.resolvedStyleRevision).toBe(7);
    expect(tree.nodes[1]).toEqual(jasmine.objectContaining({ resolvedStyle: { display: 'none' } }));
    expect(tree.nodes[2]).toEqual(jasmine.objectContaining({ resolvedStyle: { color: 'purple' }, normalResolvedStyle: { color: 'black' } }));
  });
  it('captures core effective state declarations with separate normal provenance', () => {
    const base = { color: 'black', background: 'white', width: '40px' };
    const active = { background: 'purple', cursor: 'pointer' };
    const styles = collectMaterialResolvedStyles([
      { metadata: { elementId: 'button', isTextMesh: true, astylarResolvedStyle: { color: 'text-only' } } },
      { metadata: { elementId: 'button', isTextMesh: false, astylarResolvedStyle: base, astylarResolvedInteractionStyle: active } },
    ]);
    expect(styles.normal.get('button')).toEqual(base);
    expect(styles.effective.get('button')).toEqual({ ...base, ...active });
    expect(base.background).toBe('white');
    expect(active).toEqual({ background: 'purple', cursor: 'pointer' });
    const tree = collectAuthoredInputTree({ children: [{ id: 'button', type: 'button' }] }, [], styles.effective, styles);
    expect(tree.resolvedStyleEvidenceVersion).toBe(2);
    expect(tree.nodes[1]).toEqual(jasmine.objectContaining({ normalResolvedStyle: base,
      interactionResolvedStyle: active, resolvedStyle: { ...base, ...active } }));
    const cleared = collectMaterialResolvedStyles([{ metadata: { elementId: 'button', astylarResolvedStyle: base,
      astylarResolvedInteractionStyle: base } }]);
    expect(cleared.effective.get('button')).toEqual(base);
  });
  it('inventories anonymous nodes and plugin data without deriving geometry', () => {
    const rules = [{ selector: ':hover', background: 'red' }];
    const tree = collectAuthoredInputTree({ children: [{ type: 'div', children: [
      { id: 'icon', type: 'plugin:icon', data: { path: 'M0 0' } },
    ] }] }, rules, new Map([['icon', { width: '24px' }]]));
    expect(tree.nodes.length).toBe(3);
    expect(tree.nodes[1]).toEqual(jasmine.objectContaining({ key: 'root/0', parent: 'root' }));
    expect(tree.nodes[2]).toEqual(jasmine.objectContaining({
      authored: { id: 'icon', type: 'plugin:icon', data: { path: 'M0 0' } }, resolvedStyle: { width: '24px' },
    }));
    expect(tree.rules).toBe(rules);
  });
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
