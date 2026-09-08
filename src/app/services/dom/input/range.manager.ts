import { Injectable } from '@angular/core';
import { Color3 } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { InputType, RangeInput, ValidationState } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { BabylonRender } from '../interfaces/render.types';
import type { CssSize } from '../../coordinate-space.types';

@Injectable({ providedIn: 'root' })
export class RangeManager {
    private readonly renders = new WeakMap<RangeInput, BabylonRender>();

    constructor(private readonly meshes: BabylonMeshService) {}

    createRange(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        dimensions: CssSize,
    ): RangeInput {
        const min = this.number(element.min, 0);
        const max = Math.max(min, this.number(element.max, 100));
        const step = Math.max(Number.EPSILON, this.number(element.step, 1));
        const value = this.normalize(this.number(element.value, (min + max) / 2), min, max, step);
        const id = element.id || `range-${Date.now()}`;
        const renderedSize = render.actions.camera.projectCssSize(dimensions);
        const mesh = this.meshes.createPolygon(
            `${id}-range`,
            'rectangle',
            renderedSize.width,
            renderedSize.height,
            0,
        );
        const hitMaterial = this.meshes.createMaterial(`${id}-range-hit`, Color3.Black(), 0.001);
        // A range's interaction plane is a hit target, not a painted surface.
        // It must not write depth or it can hide a composed visual layer after
        // reconciliation changes mesh creation order.
        hitMaterial.disableDepthWrite = true;
        mesh.material = hitMaterial;

        const trackHeight = Math.max(2, Math.min(dimensions.height * 0.16, 8));
        const renderedTrack = render.actions.camera.projectCssSize({
            width: dimensions.width,
            height: trackHeight,
        });
        const trackMesh = this.meshes.createPolygon(
            `${id}-range-track`,
            'rectangle',
            renderedTrack.width,
            renderedTrack.height,
            renderedTrack.height / 2,
        );
        trackMesh.material = this.meshes.createMaterial(`${id}-range-track-material`, Color3.FromHexString('#79747e'));
        trackMesh.isPickable = false;
        this.meshes.parentTextMesh(trackMesh, mesh);

        const activeTrackMesh = this.meshes.createPolygon(
            `${id}-range-active`,
            'rectangle',
            renderedTrack.width,
            renderedTrack.height,
            renderedTrack.height / 2,
        );
        activeTrackMesh.material = this.meshes.createMaterial(`${id}-range-active-material`, Color3.FromHexString('#386a20'));
        activeTrackMesh.isPickable = false;
        this.meshes.parentTextMesh(activeTrackMesh, mesh);

        const thumbSize = Math.max(trackHeight * 2.5, Math.min(dimensions.height * 0.7, 24));
        const renderedThumb = render.actions.camera.projectCssSize({ width: thumbSize, height: thumbSize });
        const thumbMesh = this.meshes.createPolygon(
            `${id}-range-thumb`,
            'circle',
            renderedThumb.width,
            renderedThumb.height,
            0,
        );
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
            trackMesh, activeTrackMesh, thumbMesh, cssSize: { ...dimensions },
        };
        this.renders.set(range, render);
        this.updateVisual(range);
        return range;
    }

    setValue(range: RangeInput, value: number): boolean {
        const next = this.normalize(value, range.min, range.max, range.step);
        if (Object.is(next, range.value)) return false;
        range.value = next;
        range.validationState.dirty = true;
        this.updateVisual(range);
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

    private updateVisual(range: RangeInput): void {
        const render = this.renders.get(range);
        if (!render) return;
        const width = range.cssSize.width;
        const ratio = range.max === range.min ? 0 : (range.value - range.min) / (range.max - range.min);
        const activeWidth = Math.max(0.1, width * ratio);
        const trackHeight = Math.max(2, Math.min(range.cssSize.height * 0.16, 8));
        if (range.activeTrackMesh) {
            const size = render.actions.camera.projectCssSize({ width: activeWidth, height: trackHeight });
            this.meshes.updateMeshWithBorderRadius(
                range.activeTrackMesh,
                'rectangle',
                size.width,
                size.height,
                size.height / 2,
            );
            const center = render.actions.camera.projectCssLocalPoint(
                { x: -width / 2 + activeWidth / 2, y: 0 },
                -0.02,
            );
            this.meshes.positionTextMesh(range.activeTrackMesh, center.x, center.y, center.z);
        }
        if (range.thumbMesh) {
            const center = render.actions.camera.projectCssLocalPoint(
                { x: -width / 2 + width * ratio, y: 0 },
                -0.04,
            );
            this.meshes.positionTextMesh(range.thumbMesh, center.x, center.y, center.z);
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
