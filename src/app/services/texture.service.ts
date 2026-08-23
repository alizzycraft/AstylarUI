import { Injectable, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Scene, Texture, Constants } from '@babylonjs/core';

@Injectable({ providedIn: 'root' })
export class TextureService {
  private textureCache = new Map<string, Texture>();
  private baseUrl: string = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformServer(this.platformId)) {
      // Fall back to default URL for SSR
      this.baseUrl = 'http://localhost:4200';

    }
  }

  async getTexture(url: string, scene: Scene): Promise<Texture> {



    // Check if texture is already cached
    if (this.textureCache.has(url)) {

      return this.textureCache.get(url)!;
    }

    // Prepare the full URL with appropriate base for SSR
    const fullUrl = this.getFullUrl(url);


    // If we're in server-side rendering, return a placeholder texture
    if (isPlatformServer(this.platformId)) {

      // Create a dummy texture that won't try to load
      const placeholderTexture = new Texture(null, scene);
      this.textureCache.set(url, placeholderTexture);
      return placeholderTexture;
    }

    return new Promise<Texture>((resolve, reject) => {


      const texture = new Texture(fullUrl, scene,
        false, // noMipmap
        true,  // invertY
        Constants.TEXTURE_TRILINEAR_SAMPLINGMODE, // samplingMode
        () => {

          this.textureCache.set(url, texture);
          resolve(texture);
        },
        (message, exception) => {
          console.error(`[TextureService] ❌ Failed to load texture: ${fullUrl}`, message, exception);
          reject(new Error(`Failed to load texture: ${message || 'Unknown error'}`));
        }
      );

      // Add timeout to catch hanging promises
      setTimeout(() => {
        if (!this.textureCache.has(url)) {
          console.warn(`[TextureService] ⏰ Texture loading timeout for: ${fullUrl}`);
        }
      }, 5000);
    });
  }

  private getFullUrl(url: string): string {
    // If URL is already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If we're in server-side rendering, prepend the base URL
    if (isPlatformServer(this.platformId) && this.baseUrl) {
      return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // Otherwise, return the URL as is
    return url;
  }

  clearCache(): void {
    this.textureCache.clear();
  }

  getCacheSize(): number {
    return this.textureCache.size;
  }
}
