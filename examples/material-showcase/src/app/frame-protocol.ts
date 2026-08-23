import { MaterialFamily, isMaterialFamily } from './catalog';
import { MaterialThemeConfig, normalizeTheme } from './theme';
import { ShowcaseState, normalizeShowcaseState } from './showcase.store';

export type ShowcaseFrameCommand =
  | { readonly type: 'showcase:family'; readonly family: MaterialFamily }
  | { readonly type: 'showcase:theme'; readonly theme: MaterialThemeConfig }
  | { readonly type: 'showcase:state'; readonly state: ShowcaseState }
  | { readonly type: 'showcase:reset' }
  | { readonly type: 'showcase:benchmark'; readonly phase: 'start' | 'held' | 'settled' };

export function parseFrameCommand(value: unknown): ShowcaseFrameCommand | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const command = value as Record<string, unknown>;
  if (command['type'] === 'showcase:family' && isMaterialFamily(String(command['family']))) {
    return { type: 'showcase:family', family: String(command['family']) as MaterialFamily };
  }
  if (command['type'] === 'showcase:theme' && command['theme'] && typeof command['theme'] === 'object') {
    return { type: 'showcase:theme', theme: normalizeTheme(command['theme'] as unknown as MaterialThemeConfig) };
  }
  if (command['type'] === 'showcase:state' && command['state'] && typeof command['state'] === 'object') {
    return { type: 'showcase:state', state: normalizeShowcaseState(command['state'] as unknown as ShowcaseState) };
  }
  if (command['type'] === 'showcase:reset') return { type: 'showcase:reset' };
  if (command['type'] === 'showcase:benchmark' && ['start', 'held', 'settled'].includes(String(command['phase']))) {
    return { type: 'showcase:benchmark', phase: command['phase'] as 'start' | 'held' | 'settled' };
  }
  return undefined;
}
