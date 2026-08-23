import { DestroyRef, Injectable, inject } from '@angular/core';
import { ShowcaseStore } from './showcase.store';
import { parseFrameCommand } from './frame-protocol';

@Injectable()
export class FrameSync {
  private readonly store = inject(ShowcaseStore);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const apply = (raw: unknown): boolean => {
      const command = parseFrameCommand(raw);
      if (!command) return false;
      if (command.type === 'showcase:family') this.store.selectFamily(command.family);
      if (command.type === 'showcase:theme') this.store.setTheme(command.theme);
      if (command.type === 'showcase:state') this.store.setState(command.state);
      if (command.type === 'showcase:reset') this.store.reset();
      if (command.type === 'showcase:benchmark') this.store.setBenchmarkPhase(command.phase);
      return true;
    };
    const listener = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      apply(event.data);
    };
    if (typeof window !== 'undefined') {
      window.__MATERIAL_SHOWCASE_COMMAND__ = apply;
      window.addEventListener('message', listener);
    }
    this.destroyRef.onDestroy(() => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', listener);
        if (window.__MATERIAL_SHOWCASE_COMMAND__ === apply) delete window.__MATERIAL_SHOWCASE_COMMAND__;
      }
    });
  }
}

declare global {
  interface Window {
    __MATERIAL_SHOWCASE_COMMAND__?: (raw: unknown) => boolean;
  }
}
