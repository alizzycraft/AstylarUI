import type { AstylarResolvedStyleSnapshot } from 'astylarui';

interface StyleProvenance {
  normal: ReadonlyMap<string, Record<string, unknown>>;
  interaction: ReadonlyMap<string, Record<string, unknown>>;
  byPath?: ReadonlyMap<string, { normal: Record<string, unknown>; effective: Record<string, unknown> }>;
  source?: string;
  revision?: number;
}

/** Audit-only evidence. Never use these snapshots to compute layout. */
export function collectMaterialCoreResolvedStyles(snapshot: AstylarResolvedStyleSnapshot) {
  const normal = new Map<string, Record<string, unknown>>();
  const effective = new Map<string, Record<string, unknown>>();
  const byPath = new Map<string, { normal: Record<string, unknown>; effective: Record<string, unknown> }>();
  for (const entry of snapshot.elements) {
    const styles = { normal: { ...entry.normal }, effective: { ...entry.effective } };
    byPath.set(entry.path, styles);
    if (entry.id) {
      normal.set(entry.id, styles.normal);
      effective.set(entry.id, styles.effective);
    }
  }
  // Core's effective snapshot is already merged, just like its interaction
  // metadata. Keep that provenance; never resolve selectors or states here.
  return { normal, interaction: effective, effective, byPath,
    source: 'core-style-inspection', revision: snapshot.revision };
}

export function collectMaterialResolvedStyles(meshes: readonly { metadata?: Record<string, unknown> | null }[]) {
  const normal = new Map<string, Record<string, unknown>>();
  const interaction = new Map<string, Record<string, unknown>>();
  const priorities = new Map<string, number>();
  for (const mesh of meshes) {
    const metadata = mesh.metadata;
    const id = metadata?.['elementId'];
    if (typeof id !== 'string') continue;
    const base = metadata?.['astylarResolvedStyle'];
    const active = metadata?.['astylarResolvedInteractionStyle'];
    const priority = metadata?.['isTextMesh'] === true ? 1 : 2;
    if (base && typeof base === 'object' && priority > (priorities.get(id) ?? 0)) {
      normal.set(id, { ...base });
      priorities.set(id, priority);
    }
    if (active && typeof active === 'object') interaction.set(id, { ...active });
  }
  const effective = new Map([...new Set([...normal.keys(), ...interaction.keys()])].map((id) =>
    [id, { ...normal.get(id), ...interaction.get(id) }]));
  return { normal, interaction, effective, source: 'mesh-metadata' };
}

export function materialStyleSnapshot(style: Record<string, unknown> | undefined): Record<string, string> | undefined {
  if (!style) return undefined;
  return Object.fromEntries(Object.entries(style).flatMap(([property, value]) => {
    if (property === 'selector' || property.startsWith('media') || value === undefined || value === null || value === '') return [];
    return ['string', 'number', 'boolean'].includes(typeof value) ? [[property, String(value)]] : [];
  }));
}

/** Includes anonymous authored nodes and plugin data, not just benchmark IDs. */
export function collectAuthoredInputTree(root: object, rules: readonly object[], resolved: ReadonlyMap<string, Record<string, unknown>>,
  provenance?: StyleProvenance) {
  const nodes: object[] = [];
  const visit = (node: object, key: string, parent: string | null) => {
    const { children, ...authored } = node as Record<string, unknown>;
    const id = typeof authored['id'] === 'string' ? authored['id'] : undefined;
    const inspected = provenance?.byPath?.get(key);
    nodes.push({ key, parent, authored,
      resolvedStyle: materialStyleSnapshot(inspected?.effective ?? (id ? resolved.get(id) : undefined)),
      normalResolvedStyle: materialStyleSnapshot(inspected?.normal ?? (id ? provenance?.normal.get(id) : undefined)),
      interactionResolvedStyle: materialStyleSnapshot(inspected?.effective ?? (id ? provenance?.interaction.get(id) : undefined)) });
    if (Array.isArray(children)) children.forEach((child, index) => {
      if (typeof child === 'object' && child !== null) visit(child, `${key}/${index}`, key);
    });
  };
  visit(root, 'root', null);
  return { schemaVersion: 1, resolvedStyleEvidenceVersion: provenance ? 2 : 1,
    resolvedStyleSource: provenance?.source, resolvedStyleRevision: provenance?.revision, nodes, rules, errors: [] };
}

export interface MaterialAuthoredStructure {
  readonly schemaVersion: 2;
  readonly type: string;
  readonly text: string;
  readonly ownText: string;
  readonly directChildIds: readonly string[];
  readonly descendantIds: readonly string[];
}

export function indexAuthoredStructures(root: object, mappedIds: readonly string[]): Readonly<Record<string, MaterialAuthoredStructure>> {
  const structures: Record<string, MaterialAuthoredStructure> = {};
  const mapped = new Set(mappedIds);
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  const visit = (node: object): { ids: string[]; text: string } => {
    const record = node as Record<string, unknown>;
    const children = Array.isArray(record['children'])
      ? record['children'].filter((child): child is object => typeof child === 'object' && child !== null) : [];
    const nested = children.map(visit);
    const descendantIds = nested.flatMap((child) => child.ids);
    const id = typeof record['id'] === 'string' ? record['id'] : undefined;
    const type = typeof record['type'] === 'string' ? record['type'] : 'root';
    const isTextControl = ['input', 'textarea', 'select'].includes(type);
    const ownText = String(record['textContent'] ?? record['value'] ?? '');
    const subtreeText = ownText + nested.map((child) => child.text).join('');
    if (id) structures[id] = {
      schemaVersion: 2, type, ownText: normalize(ownText), text: normalize(subtreeText),
      directChildIds: children.flatMap((child) => {
        const childId = (child as Record<string, unknown>)['id'];
        return typeof childId === 'string' ? [childId] : [];
      }),
      descendantIds: descendantIds.filter((childId) => mapped.has(childId)),
    };
    // Browser parent.textContent does not include an input's current value.
    return { ids: id ? [id, ...descendantIds] : descendantIds, text: isTextControl ? '' : subtreeText };
  };
  visit(root);
  return structures;
}
