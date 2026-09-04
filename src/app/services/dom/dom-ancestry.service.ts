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

  clear(): void {
    this.parents = new WeakMap<DOMElement, DOMElement>();
    this.mutationRevision += 1;
  }
}
