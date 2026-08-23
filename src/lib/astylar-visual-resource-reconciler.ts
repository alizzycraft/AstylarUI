import type { Mesh } from '@babylonjs/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { BabylonElementManagerService } from '../app/services/dom/element-manager.service';
import type { InputElementService } from '../app/services/dom/input/input-element.service';
import { areAstylarReconciliationNodesCompatible, AstylarReconciliationIdentityIndex } from './astylar-reconciliation-identity';
import type { AstylarSceneResources } from './astylar-scene-resources';

export interface AstylarVisualResourceReconciliationResult {
  reusedMeshes: number;
  retainedElementIds: readonly string[];
}

interface RetainedOwner {
  id: string;
  mesh: Mesh;
}

/**
 * Retains compatible, uniquely identified non-control element meshes while a
 * fresh layout tree is produced, then transplants the new visual payload onto
 * those owners. Owned children remain independently replaceable resources.
 */
export class AstylarVisualResourceReconciler {
  stage(
    previousSiteData: SiteData | undefined,
    nextSiteData: SiteData,
    elementManager: BabylonElementManagerService,
    sceneResources: AstylarSceneResources,
    inputElementService?: InputElementService,
  ): AstylarVisualResourceTransaction {
    if (!previousSiteData) return new AstylarVisualResourceTransaction([], elementManager, sceneResources);
    const previous = uniqueElementsById(previousSiteData);
    const next = uniqueElementsById(nextSiteData);
    const retained: RetainedOwner[] = [];

    for (const [id, previousElement] of previous) {
      const nextElement = next.get(id);
      const mesh = elementManager.elementsMap.get(id);
      if (!nextElement || !mesh ||
          !areAstylarReconciliationNodesCompatible(previousElement, nextElement)) continue;
      // Plugin renderer roots own a complete render generation. Retaining the
      // old root would dispose the new mesh before delayed generation work can
      // safely attach to it.
      if (mesh.metadata?.astylarPluginRenderer) continue;
      if (isControl(previousElement) || isControl(nextElement)) {
        const releasedMesh = inputElementService?.releaseInputMesh(id);
        if (releasedMesh !== mesh) continue;
        elementManager.inputElementsMap.delete(id);
      }
      retained.push({ id, mesh });
    }

    // Every retained node must be detached before an owned ancestor is disposed.
    for (const owner of retained) owner.mesh.parent = null;
    for (const owner of retained) elementManager.elementsMap.delete(owner.id);
    sceneResources.releaseMeshes(retained.map((owner) => owner.mesh));
    return new AstylarVisualResourceTransaction(retained, elementManager, sceneResources);
  }
}

export class AstylarVisualResourceTransaction {
  private adopted: Mesh[] = [];

  constructor(
    private readonly retained: RetainedOwner[],
    private readonly elementManager: BabylonElementManagerService,
    private readonly sceneResources: AstylarSceneResources,
  ) {}

  reconcile(): AstylarVisualResourceReconciliationResult {
    const adopted: Mesh[] = [];
    const adoptedIds: string[] = [];
    for (const owner of this.retained) {
      const replacement = this.elementManager.elementsMap.get(owner.id);
      if (!replacement || replacement.isDisposed() || owner.mesh.isDisposed()) {
        if (!owner.mesh.isDisposed()) owner.mesh.dispose(false, false);
        continue;
      }
      transplantMeshOwner(owner.mesh, replacement);
      this.elementManager.elementsMap.set(owner.id, owner.mesh);
      const input = this.elementManager.inputElementsMap.get(owner.id);
      if (input) input.mesh = owner.mesh;
      adopted.push(owner.mesh);
      adoptedIds.push(owner.id);
    }
    this.adopted = adopted;
    return {
      reusedMeshes: adopted.length,
      retainedElementIds: adoptedIds,
    };
  }

  /** Reattaches retained owners to the session tracker after replace() commits. */
  commitOwnership(): void {
    this.sceneResources.adoptMeshes(this.adopted);
  }
}

function transplantMeshOwner(owner: Mesh, replacement: Mesh): void {
  const replacementParent = replacement.parent;
  const replacementChildren = replacement.getChildMeshes(true);
  owner.actionManager?.dispose();
  owner.actionManager = replacement.actionManager;
  replacement.actionManager = null;
  replacement.geometry?.applyToMesh(owner);
  owner.position.copyFrom(replacement.position);
  owner.rotation.copyFrom(replacement.rotation);
  owner.scaling.copyFrom(replacement.scaling);
  owner.rotationQuaternion = replacement.rotationQuaternion?.clone() ?? null;
  owner.material = replacement.material;
  owner.metadata = replacement.metadata;
  owner.visibility = replacement.visibility;
  owner.isVisible = replacement.isVisible;
  owner.isPickable = replacement.isPickable;
  owner.renderingGroupId = replacement.renderingGroupId;
  owner.alphaIndex = replacement.alphaIndex;
  owner.layerMask = replacement.layerMask;
  owner.setEnabled(replacement.isEnabled());
  owner.parent = replacementParent;
  for (const child of replacementChildren) child.parent = owner;
  replacement.dispose(true, false);
}

function uniqueElementsById(siteData: SiteData): Map<string, DOMElement> {
  const identities = new AstylarReconciliationIdentityIndex(siteData.root.children);
  const result = new Map<string, DOMElement>();
  const visit = (element: DOMElement): void => {
    if (!element.hidden && element.id && identities.isStable(element)) result.set(element.id, element);
    element.children?.forEach(visit);
  };
  siteData.root.children.forEach(visit);
  return result;
}

function isControl(element: DOMElement): boolean {
  return element.type === 'input' || element.type === 'button' ||
    element.type === 'select' || element.type === 'textarea';
}
