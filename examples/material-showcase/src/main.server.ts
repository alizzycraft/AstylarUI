import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

// Angular 20.2+ supplies an SSR bootstrap context while the original 20.0 API
// only declares two parameters. Keep this example consumable across the supported
// Angular 20 range; older runtimes harmlessly ignore the additional argument.
const bootstrapWithContext = bootstrapApplication as unknown as (
  ...args: unknown[]
) => ReturnType<typeof bootstrapApplication>;

const bootstrap = (context?: unknown) => bootstrapWithContext(App, config, context);

export default bootstrap;
