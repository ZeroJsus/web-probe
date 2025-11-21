// Minimal event bus to let host apps subscribe to probe lifecycle events.
// 轻量事件总线，允许宿主应用订阅探针的生命周期事件。
const createIntegrationBus = () => {
  const listeners = new Map();

  const on = (event, handler) => {
    const existing = listeners.get(event) || [];
    listeners.set(event, [...existing, handler]);
    return () => off(event, handler);
  };

  const off = (event, handler) => {
    const existing = listeners.get(event) || [];
    listeners.set(
      event,
      existing.filter((fn) => fn !== handler)
    );
  };

  const emit = (event, payload) => {
    const handlers = listeners.get(event) || [];
    handlers.forEach((fn) => fn(payload));
  };

  return { on, off, emit };
};

export { createIntegrationBus };
