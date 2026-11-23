import { validateStore } from './cache';
import type { Store } from './model';
declare global {
  interface Window { MY_SPORTS_EMBEDDED?: { store: unknown; logos: Record<string,string> } }
}
export const isStandalone = () => location.protocol === 'file:';
export function embeddedStore(): Store { return validateStore(window.MY_SPORTS_EMBEDDED?.store); }
export function logoUrl(name: string) {
  return window.MY_SPORTS_EMBEDDED?.logos[name] ?? `${import.meta.env.BASE_URL}logos/${name}`;
}
export function initialStore(cached: Store): Store {
  const store = embeddedStore();
  for (const key of ['united','steelers'] as const) {
    if(cached[key] && (!store[key] || Date.parse(cached[key]!.updated) >= Date.parse(store[key]!.updated))) store[key] = cached[key];
  }
  return store;
}
