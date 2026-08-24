import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideConsumerBadgePlugin } from './consumer-badge.plugin';
import { provideAstylar } from 'astylarui';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAstylar({ css: { useDocumentStyles: true } }),
    provideConsumerBadgePlugin({
      marker: 'packed-angular-consumer',
      minimumDepth: 0.06,
    }),
  ]
};
