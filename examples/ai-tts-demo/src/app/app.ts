import { Component, signal } from '@angular/core';
import {
  AstylarSurfaceComponent,
  type AstylarRenderOptions,
  type AstylarSurface,
} from 'astylarui';
import { buildTtsDemoSite } from './ui/tts-demo-site';
import { DEFAULT_TTS_VIEW_MODEL } from './ui/tts-demo-model';

@Component({
  selector: 'app-root',
  imports: [AstylarSurfaceComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly siteData = signal(buildTtsDemoSite(DEFAULT_TTS_VIEW_MODEL));
  protected readonly status = signal('Starting the AstylarUI renderer…');
  protected readonly options: AstylarRenderOptions = {};

  protected onMounted(_surface: AstylarSurface): void {
    this.status.set('AstylarUI renderer ready.');
  }

  protected onFailed(error: unknown): void {
    this.status.set(`Renderer error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
