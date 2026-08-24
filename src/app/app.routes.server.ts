import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'site/:siteId',
    renderMode: RenderMode.Server
  },
  {
    path: 'simple-demo',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'tailwind-showcase',
    renderMode: RenderMode.Client
  },
  {
    path: 'parity/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
