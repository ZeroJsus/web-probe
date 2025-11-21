import type { IntegrationHandler } from '../types';

// Minimal event bus to let host apps subscribe to probe lifecycle events.
// 轻量事件总线，允许宿主应用订阅探针的生命周期事件。
const createIntegrationBus = () => {
  const listeners = new Map<string, Array<IntegrationHandler<unknown>>>();

  const on = <TPayload>(event: string, handler: IntegrationHandler<TPayload>) => {
    const existing = listeners.get(event) || [];
    listeners.set(event, [...existing, handler as IntegrationHandler<unknown>]);
    return () => off(event, handler);
  };

  const off = <TPayload>(event: string, handler: IntegrationHandler<TPayload>) => {
    const existing = listeners.get(event) || [];
    listeners.set(event, existing.filter((fn) => fn !== handler));
  };

  const emit = <TPayload>(event: string, payload: TPayload) => {
    const handlers = listeners.get(event) || [];
    handlers.forEach((fn) => fn(payload));
  };

  return { on, off, emit };
};

export { createIntegrationBus };
