import { Injectable } from '@angular/core';

export interface ImageFitLayout {
  renderedWidth: number;
  renderedHeight: number;
  uScale: number;
  vScale: number;
  uOffset: number;
  vOffset: number;
}

@Injectable({ providedIn: 'root' })
export class ImageLayoutService {
  calculateFit(
    boxWidth: number,
    boxHeight: number,
    imageWidth: number,
    imageHeight: number,
    objectFit: string | undefined,
  ): ImageFitLayout {
    const fit = (objectFit ?? 'fill').toLowerCase();
    if (boxWidth <= 0 || boxHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
      return this.fill(boxWidth, boxHeight);
    }

    const boxAspect = boxWidth / boxHeight;
    const imageAspect = imageWidth / imageHeight;

    if (fit === 'contain') {
      const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
      return {
        ...this.fullUv(),
        renderedWidth: imageWidth * scale,
        renderedHeight: imageHeight * scale,
      };
    }

    if (fit === 'cover') {
      if (imageAspect > boxAspect) {
        const uScale = boxAspect / imageAspect;
        return {
          renderedWidth: boxWidth,
          renderedHeight: boxHeight,
          uScale,
          vScale: 1,
          uOffset: (1 - uScale) / 2,
          vOffset: 0,
        };
      }

      const vScale = imageAspect / boxAspect;
      return {
        renderedWidth: boxWidth,
        renderedHeight: boxHeight,
        uScale: 1,
        vScale,
        uOffset: 0,
        vOffset: (1 - vScale) / 2,
      };
    }

    return this.fill(boxWidth, boxHeight);
  }

  resolveIntrinsicBox(
    currentWidth: number,
    currentHeight: number,
    horizontalInsets: number,
    verticalInsets: number,
    imageWidth: number,
    imageHeight: number,
    hasExplicitWidth: boolean,
    hasExplicitHeight: boolean,
  ): { width: number; height: number } {
    const aspect = imageWidth / imageHeight;
    if (!Number.isFinite(aspect) || aspect <= 0) {
      return { width: currentWidth, height: currentHeight };
    }

    if (!hasExplicitWidth && !hasExplicitHeight) {
      return {
        width: imageWidth + horizontalInsets,
        height: imageHeight + verticalInsets,
      };
    }
    if (hasExplicitWidth && !hasExplicitHeight) {
      return {
        width: currentWidth,
        height: Math.max(0, currentWidth - horizontalInsets) / aspect + verticalInsets,
      };
    }
    if (!hasExplicitWidth && hasExplicitHeight) {
      return {
        width: Math.max(0, currentHeight - verticalInsets) * aspect + horizontalInsets,
        height: currentHeight,
      };
    }
    return { width: currentWidth, height: currentHeight };
  }

  private fill(width: number, height: number): ImageFitLayout {
    return { renderedWidth: width, renderedHeight: height, ...this.fullUv() };
  }

  private fullUv() {
    return { uScale: 1, vScale: 1, uOffset: 0, vOffset: 0 };
  }
}
