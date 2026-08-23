import { Injectable } from '@angular/core';
import { Color3 } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { InputType, RangeInput, ValidationState } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { BabylonRender } from '../interfaces/render.types';

@Injectable({ providedIn: 'root' })
export class RangeManager {
    constructor(private readonly meshes: BabylonMeshService) {}

    createRange(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        dimensions: { width: number; height: number },
    ): RangeInput {
        const min = this.number(element.min, 0);
        const max = Math.max(min, this.number(element.max, 100));
        const step = Math.max(Number.EPSILON, this.number(element.step, 1));
        const value = this.normalize(this.number(element.value, (min + max) / 2), min, max, step);
        const id = element.id || `range-${Date.now()}`;
        const mesh = this.meshes.createPolygon(`${id}-range`, 'rectangle', dimensions.width, dimensions.height, 0);
        const hitMaterial = this.meshes.createMaterial(`${id}-range-hit`, Color3.Black(), 0.001);
        // A range's interaction plane is a hit target, not a painted surface.
        // It must not write depth or it can hide a composed visual layer after
        // reconciliation changes mesh creation order.
        hitMaterial.disableDepthWrite = true;
        mesh.material = hitMaterial;

        const trackHeight = Math.max(0.02, Math.min(dimensions.height * 0.16, 0.08));
        const trackMesh = this.meshes.createPolygon(`${id}-range-track`, 'rectangle', dimensions.width, trackHeight, trackHeight / 2);
        trackMesh.material = this.meshes.createMaterial(`${id}-range-track-material`, Color3.FromHexString('#79747e'));
        trackMesh.isPickable = false;
        this.meshes.parentTextMesh(trackMesh, mesh);

        const activeTrackMesh = this.meshes.createPolygon(`${id}-range-active`, 'rectangle', dimensions.width, trackHeight, trackHeight / 2);
        activeTrackMesh.material = this.meshes.createMaterial(`${id}-range-active-material`, Color3.FromHexString('#386a20'));
        activeTrackMesh.isPickable = false;
        this.meshes.parentTextMesh(activeTrackMesh, mesh);

        const thumbSize = Math.max(trackHeight * 2.5, Math.min(dimensions.height * 0.7, 0.24));
        const thumbMesh = this.meshes.createPolygon(`${id}-range-thumb`, 'circle', thumbSize, thumbSize, 0);
        thumbMesh.material = this.meshes.createMaterial(`${id}-range-thumb-material`, Color3.FromHexString('#386a20'));
        thumbMesh.isPickable = false;
        this.meshes.parentTextMesh(thumbMesh, mesh);

        const validationState: ValidationState = {
            valid: true, errors: [], touched: false, dirty: false,
        };
        const range: RangeInput = {
            element, type: InputType.Range, style, value, min, max, step,
            focused: false, disabled: !!element.disabled, required: false,
            validationRules: [], validationState, mesh,
            trackMesh, activeTrackMesh, thumbMesh,
        };
        this.updateVisual(range, dimensions.width);
        return range;
    }

    setValue(range: RangeInput, value: number): boolean {
        const next = this.normalize(value, range.min, range.max, range.step);
        if (Object.is(next, range.value)) return false;
        range.value = next;
        range.validationState.dirty = true;
        this.updateVisual(range, range.mesh.getBoundingInfo().boundingBox.extendSize.x * 2);
        return true;
    }

    setFromRatio(range: RangeInput, ratio: number): boolean {
        return this.setValue(range, range.min + Math.max(0, Math.min(1, ratio)) * (range.max - range.min));
    }

    handleKey(range: RangeInput, event: KeyboardEvent): boolean {
        const page = range.step * 10;
        const next = ({
            ArrowLeft: range.value - range.step,
            ArrowDown: range.value - range.step,
            ArrowRight: range.value + range.step,
            ArrowUp: range.value + range.step,
            PageDown: range.value - page,
            PageUp: range.value + page,
            Home: range.min,
            End: range.max,
        } as Record<string, number | undefined>)[event.key];
        if (next === undefined) return false;
        event.preventDefault();
        return this.setValue(range, next);
    }

    dispose(range: RangeInput): void {
        range.thumbMesh?.dispose();
        range.activeTrackMesh?.dispose();
        range.trackMesh?.dispose();
        range.mesh?.dispose();
    }

    private updateVisual(range: RangeInput, width: number): void {
        const ratio = range.max === range.min ? 0 : (range.value - range.min) / (range.max - range.min);
        const activeWidth = Math.max(0.001, width * ratio);
        if (range.activeTrackMesh) {
            range.activeTrackMesh.scaling.x = activeWidth / width;
            this.meshes.positionTextMesh(range.activeTrackMesh, -width / 2 + activeWidth / 2, 0, -0.02);
        }
        if (range.thumbMesh) {
            this.meshes.positionTextMesh(range.thumbMesh, -width / 2 + width * ratio, 0, -0.04);
        }
    }

    private number(value: unknown, fallback: number): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    private normalize(value: number, min: number, max: number, step: number): number {
        const stepped = min + Math.round((Math.max(min, Math.min(max, value)) - min) / step) * step;
        const precision = Math.max(this.decimals(step), this.decimals(min));
        return Number(Math.max(min, Math.min(max, stepped)).toFixed(precision));
    }

    private decimals(value: number): number {
        const exponent = value.toString().match(/e-(\d+)$/)?.[1];
        if (exponent) return Number(exponent);
        return value.toString().split('.')[1]?.length ?? 0;
    }
}
