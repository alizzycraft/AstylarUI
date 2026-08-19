import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { AstylarInvalidationReason } from './astylar-render-session';
import {
  areAstylarReconciliationNodesCompatible,
  AstylarReconciliationIdentityIndex,
  astylarChildReconciliationPath,
} from './astylar-reconciliation-identity';
import type { AstylarReconciliationIdentitySnapshot } from './astylar-reconciliation-identity';

export interface AstylarVisualReconciliationCounts {
  reused: number;
  created: number;
  replaced: number;
  disposed: number;
  reconciled: number;
  reflowed: number;
}

export interface AstylarVisualReconciliationSnapshot {
  strategy: 'initial' | 'reuse' | 'rebuild';
  identities: AstylarReconciliationIdentitySnapshot;
  last: AstylarVisualReconciliationCounts;
  totals: AstylarVisualReconciliationCounts;
}

export interface AstylarVisualReconciliationPlan {
  readonly rebuild: boolean;
  readonly snapshot: AstylarVisualReconciliationSnapshot;
  commit(): void;
}

interface ReconciliationNode {
  key: string;
  element: DOMElement;
}

const ZERO_COUNTS: AstylarVisualReconciliationCounts = {
  reused: 0,
  created: 0,
  replaced: 0,
  disposed: 0,
  reconciled: 0,
  reflowed: 0,
};

const SEMANTIC_ONLY_ELEMENT_FIELDS = new Set([
  'accesskey',
  'alt',
  'ariaAtomic',
  'ariaCurrent',
  'ariaDescribedby',
  'ariaLabel',
  'ariaLabelledby',
  'ariaLive',
  'draggable',
  'for',
  'headers',
  'href',
  'onclick',
  'role',
  'scope',
  'spellcheck',
  'tabindex',
  'target',
  'title',
  'translate',
]);

/**
 * Plans visual reconciliation independently from the renderer implementation.
 *
 * Phase 11 starts with a safe reuse boundary: updates that do not alter the
 * visual projection retain the complete Babylon tree. Layout, paint, content,
 * viewport, asset, and manual invalidations still take the established rebuild
 * path until their owned resources can be reconciled individually.
 */
export class AstylarVisualReconciler {
  private previousNodes = new Map<string, DOMElement>();
  private previousVisualFingerprint?: string;
  private committedSnapshot: AstylarVisualReconciliationSnapshot = {
    strategy: 'initial',
    identities: emptyIdentitySnapshot(),
    last: { ...ZERO_COUNTS },
    totals: { ...ZERO_COUNTS },
  };

  get snapshot(): AstylarVisualReconciliationSnapshot {
    return this.committedSnapshot;
  }

  plan(
    siteData: SiteData,
    reasons: readonly AstylarInvalidationReason[],
  ): AstylarVisualReconciliationPlan {
    const identities = new AstylarReconciliationIdentityIndex(siteData.root.children);
    const nextNodes = this.flatten(siteData.root.children, identities);
    const nextFingerprint = stableStringify(visualSiteProjection(siteData));
    const initial = this.previousVisualFingerprint === undefined;
    const updateOnly = reasons.length > 0 && reasons.every((reason) => reason === 'update');
    const rebuild = initial || !updateOnly || nextFingerprint !== this.previousVisualFingerprint;
    const counts = this.count(nextNodes, rebuild);
    const strategy = initial ? 'initial' : rebuild ? 'rebuild' : 'reuse';
    const snapshot: AstylarVisualReconciliationSnapshot = {
      strategy,
      identities: identities.snapshot,
      last: counts,
      totals: addCounts(this.committedSnapshot.totals, counts),
    };
    let committed = false;

    return {
      rebuild,
      snapshot,
      commit: () => {
        if (committed) return;
        committed = true;
        this.previousNodes = new Map(
          [...nextNodes].map(([key, element]) => [key, { ...element }]),
        );
        this.previousVisualFingerprint = nextFingerprint;
        this.committedSnapshot = snapshot;
      },
    };
  }

  reset(): void {
    this.previousNodes.clear();
    this.previousVisualFingerprint = undefined;
    this.committedSnapshot = {
      strategy: 'initial',
      identities: emptyIdentitySnapshot(),
      last: { ...ZERO_COUNTS },
      totals: { ...ZERO_COUNTS },
    };
  }

  private count(
    nextNodes: Map<string, DOMElement>,
    rebuild: boolean,
  ): AstylarVisualReconciliationCounts {
    const counts = { ...ZERO_COUNTS };
    for (const [key, next] of nextNodes) {
      const previous = this.previousNodes.get(key);
      if (!previous) {
        counts.created += 1;
      } else if (!areAstylarReconciliationNodesCompatible(previous, next)) {
        counts.replaced += 1;
      } else if (!rebuild) {
        counts.reused += 1;
      }
    }
    for (const key of this.previousNodes.keys()) {
      if (!nextNodes.has(key)) counts.disposed += 1;
    }
    counts.reconciled = nextNodes.size;
    counts.reflowed = rebuild ? nextNodes.size : 0;
    return counts;
  }

  private flatten(
    elements: readonly DOMElement[],
    identities: AstylarReconciliationIdentityIndex,
  ): Map<string, DOMElement> {
    const nodes = new Map<string, DOMElement>();
    const visit = (element: DOMElement, path: string): void => {
      if (element.hidden) return;
      const key = identities.key(element, path);
      nodes.set(key, element);
      element.children?.forEach((child, index) => {
        visit(child, astylarChildReconciliationPath(path, index, child));
      });
    };
    elements.forEach((element, index) => visit(element, `root/${index}:${element.type}`));
    return nodes;
  }
}

function visualSiteProjection(siteData: SiteData): unknown {
  return {
    styles: siteData.styles,
    root: {
      id: siteData.root.id,
      type: siteData.root.type,
      children: siteData.root.children.map(visualElementProjection),
    },
  };
}

function visualElementProjection(element: DOMElement): unknown {
  const projection: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(element)) {
    if (SEMANTIC_ONLY_ELEMENT_FIELDS.has(key) || key === 'inputElement') continue;
    projection[key] = key === 'children'
      ? (value as DOMElement[] | undefined)?.map(visualElementProjection)
      : value;
  }
  return projection;
}

function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}

function addCounts(
  left: AstylarVisualReconciliationCounts,
  right: AstylarVisualReconciliationCounts,
): AstylarVisualReconciliationCounts {
  return {
    reused: left.reused + right.reused,
    created: left.created + right.created,
    replaced: left.replaced + right.replaced,
    disposed: left.disposed + right.disposed,
    reconciled: left.reconciled + right.reconciled,
    reflowed: left.reflowed + right.reflowed,
  };
}

function emptyIdentitySnapshot(): AstylarReconciliationIdentitySnapshot {
  return {
    totalNodes: 0,
    uniqueAuthoredIds: 0,
    anonymousNodes: 0,
    duplicateAuthoredIds: [],
    duplicateNodes: 0,
  };
}
