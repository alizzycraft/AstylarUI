import type { DOMElement } from '../app/types/dom-element';

export interface AstylarReconciliationIdentitySnapshot {
  totalNodes: number;
  uniqueAuthoredIds: number;
  anonymousNodes: number;
  duplicateAuthoredIds: string[];
  duplicateNodes: number;
}

/**
 * Resolves the stable keys shared by Phase 11 visual and semantic reconciliation.
 *
 * A unique authored ID is stable across insertion, removal, reparenting, and
 * reordering. Anonymous nodes and every occurrence of a duplicate ID are
 * intentionally positional: they may be reused only while their typed tree path
 * remains compatible. Authors who need continuity must therefore provide a
 * unique ID.
 */
export class AstylarReconciliationIdentityIndex {
  private readonly idCounts = new Map<string, number>();
  private totalNodes = 0;
  private anonymousNodes = 0;

  constructor(elements: readonly DOMElement[]) {
    const visit = (element: DOMElement): void => {
      this.totalNodes += 1;
      if (element.id) {
        this.idCounts.set(element.id, (this.idCounts.get(element.id) ?? 0) + 1);
      } else {
        this.anonymousNodes += 1;
      }
      element.children?.forEach(visit);
    };
    elements.forEach(visit);
  }

  key(element: DOMElement, typedPath: string): string {
    return element.id && this.idCounts.get(element.id) === 1
      ? `id:${element.id}`
      : typedPath;
  }

  isStable(element: DOMElement): boolean {
    return !!element.id && this.idCounts.get(element.id) === 1;
  }

  get snapshot(): AstylarReconciliationIdentitySnapshot {
    const duplicateAuthoredIds = [...this.idCounts]
      .filter(([, count]) => count > 1)
      .map(([id]) => id)
      .sort();
    return {
      totalNodes: this.totalNodes,
      uniqueAuthoredIds: [...this.idCounts.values()].filter((count) => count === 1).length,
      anonymousNodes: this.anonymousNodes,
      duplicateAuthoredIds,
      duplicateNodes: duplicateAuthoredIds.reduce(
        (total, id) => total + (this.idCounts.get(id) ?? 0),
        0,
      ),
    };
  }
}

/** A typed positional path used only when stable authored identity is unavailable. */
export function astylarChildReconciliationPath(
  parentPath: string,
  index: number,
  element: DOMElement,
): string {
  return `${parentPath}/${index}:${element.type}`;
}

/**
 * Returns whether an existing renderer owner can safely serve the next element.
 * Attribute, text, style, value, option, and image-source changes are compatible.
 * Element-type changes and input-manager family changes require replacement.
 */
export function areAstylarReconciliationNodesCompatible(
  previous: DOMElement,
  next: DOMElement,
): boolean {
  if (previous.type !== next.type) return false;
  if (previous.type !== 'input') return true;
  return astylarInputReconciliationKind(previous) === astylarInputReconciliationKind(next);
}

export function astylarInputReconciliationKind(element: DOMElement): string {
  const inputType = (element.inputType ?? 'text').toLowerCase();
  if (inputType === 'text' || inputType === 'password' || inputType === 'email' ||
      inputType === 'number') return 'input:text-editor';
  if (inputType === 'button' || inputType === 'submit' || inputType === 'reset') {
    return 'input:button';
  }
  if (inputType === 'checkbox') return 'input:checkbox';
  if (inputType === 'radio') return 'input:radio';
  return `input:unsupported:${inputType}`;
}
