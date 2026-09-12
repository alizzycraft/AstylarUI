import { Injectable } from '@angular/core';

import { DOMElement } from '../../types/dom-element';

/** Maintains renderer-only ancestry without mutating serializable SiteData. */
@Injectable({ providedIn: 'root' })
export class DOMAncestryService {
  private parents = new WeakMap<DOMElement, DOMElement>();
  private mutationRevision = 0;

  /** Changes whenever selector-relevant tree relationships may have changed. */
  get revision(): number {
    return this.mutationRevision;
  }

  setParent(child: DOMElement, parent: DOMElement | undefined): void {
    if (parent) {
      this.parents.set(child, parent);
    } else {
      this.parents.delete(child);
    }
    this.mutationRevision += 1;
  }

  getParent(element: DOMElement): DOMElement | undefined {
    return this.parents.get(element);
  }

  /** Resolve a synchronous query against its document, without changing live ancestry. */
  withTree<T>(root: DOMElement, query: () => T): T {
    const previous = this.parents;
    this.parents = new WeakMap<DOMElement, DOMElement>();
    this.mutationRevision += 1;
    const visit = (parent: DOMElement): void => {
      for (const child of parent.children ?? []) {
        this.parents.set(child, parent);
        visit(child);
      }
    };
    try {
      visit(root);
      return query();
    } finally {
      this.parents = previous;
      // Keep revisions monotonic: selector caches from either context are stale.
      this.mutationRevision += 1;
    }
  }

  clear(): void {
    this.parents = new WeakMap<DOMElement, DOMElement>();
    this.mutationRevision += 1;
  }
}
