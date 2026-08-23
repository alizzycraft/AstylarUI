import type { DOMElement } from '../app/types/dom-element';
import {
  areAstylarReconciliationNodesCompatible,
  AstylarReconciliationIdentityIndex,
  astylarChildReconciliationPath,
} from './astylar-reconciliation-identity';

describe('AstylarReconciliationIdentityIndex', () => {
  it('keeps unique authored IDs stable across insertion, reparenting, and reordering', () => {
    const before: DOMElement[] = [
      { type: 'section', id: 'left', children: [{ type: 'button', id: 'save' }] },
      { type: 'section', id: 'right' },
    ];
    const after: DOMElement[] = [
      { type: 'p', id: 'inserted' },
      { type: 'section', id: 'right', children: [{ type: 'button', id: 'save' }] },
      { type: 'section', id: 'left' },
    ];
    const beforeIndex = new AstylarReconciliationIdentityIndex(before);
    const afterIndex = new AstylarReconciliationIdentityIndex(after);
    const beforeSave = before[0].children![0];
    const afterSave = after[1].children![0];

    expect(beforeIndex.key(beforeSave, 'root/0:section/0:button')).toBe('id:save');
    expect(afterIndex.key(afterSave, 'root/1:section/0:button')).toBe('id:save');
    expect(beforeIndex.isStable(beforeSave)).toBeTrue();
    expect(afterIndex.isStable(afterSave)).toBeTrue();
  });

  it('uses typed positional identity for anonymous and duplicate-ID nodes', () => {
    const anonymous = { type: 'span' } as DOMElement;
    const firstDuplicate = { type: 'button', id: 'duplicate' } as DOMElement;
    const secondDuplicate = { type: 'button', id: 'duplicate' } as DOMElement;
    const index = new AstylarReconciliationIdentityIndex([
      anonymous,
      firstDuplicate,
      secondDuplicate,
    ]);

    expect(index.key(anonymous, 'root/0:span')).toBe('root/0:span');
    expect(index.key(firstDuplicate, 'root/1:button')).toBe('root/1:button');
    expect(index.key(secondDuplicate, 'root/2:button')).toBe('root/2:button');
    expect(index.isStable(firstDuplicate)).toBeFalse();
    expect(index.snapshot).toEqual({
      totalNodes: 3,
      uniqueAuthoredIds: 0,
      anonymousNodes: 1,
      duplicateAuthoredIds: ['duplicate'],
      duplicateNodes: 2,
    });
  });

  it('makes anonymous continuity explicitly sensitive to insertion and element type', () => {
    expect(astylarChildReconciliationPath('root', 0, { type: 'div' })).toBe('root/0:div');
    expect(astylarChildReconciliationPath('root', 1, { type: 'div' })).toBe('root/1:div');
    expect(astylarChildReconciliationPath('root', 0, { type: 'span' })).toBe('root/0:span');
  });
});

describe('areAstylarReconciliationNodesCompatible', () => {
  it('accepts data and paint changes on the same renderer kind', () => {
    expect(areAstylarReconciliationNodesCompatible(
      { type: 'img', id: 'preview', src: '/before.png' },
      { type: 'img', id: 'preview', src: '/after.png' },
    )).toBeTrue();
    expect(areAstylarReconciliationNodesCompatible(
      { type: 'input', id: 'field', inputType: 'text', value: 'Before' },
      { type: 'input', id: 'field', inputType: 'email', value: 'after@example.test' },
    )).toBeTrue();
    expect(areAstylarReconciliationNodesCompatible(
      { type: 'input', id: 'action', inputType: 'button' },
      { type: 'input', id: 'action', inputType: 'submit' },
    )).toBeTrue();
  });

  it('requires replacement for element and input-manager kind changes', () => {
    expect(areAstylarReconciliationNodesCompatible(
      { type: 'div', id: 'content' },
      { type: 'section', id: 'content' },
    )).toBeFalse();
    expect(areAstylarReconciliationNodesCompatible(
      { type: 'input', id: 'control', inputType: 'text' },
      { type: 'input', id: 'control', inputType: 'checkbox' },
    )).toBeFalse();
    expect(areAstylarReconciliationNodesCompatible(
      { type: 'input', id: 'control', inputType: 'checkbox' },
      { type: 'input', id: 'control', inputType: 'radio' },
    )).toBeFalse();
  });
});
