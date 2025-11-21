import { isBrowser, safeGet } from '../runtime-utils/env';
import type { ApiFeature } from '../types';

const DEFAULT_APIS: string[] = [
  'fetch',
  'Promise',
  'IntersectionObserver',
  'ResizeObserver',
  'Worker',
  'WebGLRenderingContext',
  'OffscreenCanvas',
  'PaymentRequest'
];

const normalizeApi = (api?: string | ApiFeature | null) => {
  if (!api) return null;
  if (typeof api === 'string') {
    return { name: api, detector: () => safeGet(() => (globalThis as Record<string, unknown>)[api], false) };
  }
  if (typeof api === 'object' && api.name) {
    const detector = typeof api.detector === 'function'
      ? api.detector
      : () => safeGet(() => (globalThis as Record<string, unknown>)[api.name], false);
    return { name: api.name, detector };
  }
  return null;
};

// Detects whether core and custom APIs exist on the current global scope.
// 检测核心与自定义 API 是否存在于当前全局对象。
const collectApiSupport = (customApis: Array<string | ApiFeature> = []) => {
  if (!isBrowser()) return {};

  const defaults = DEFAULT_APIS.map((api) => ({
    name: api,
    detector: () => safeGet(() => (globalThis as Record<string, unknown>)[api], false)
  }));
  const normalizedCustom = (customApis || []).map(normalizeApi).filter(Boolean) as Array<{
    name: string;
    detector: () => unknown;
  }>;

  const seen = new Set();
  const candidates = [...defaults, ...normalizedCustom].filter((entry) => {
    if (seen.has(entry.name)) return false;
    seen.add(entry.name);
    return true;
  });

  const support: Record<string, boolean> = {};

  candidates.forEach((entry) => {
    support[entry.name] = Boolean(safeGet(() => entry.detector(), false));
  });

  support['ServiceWorker'] = Boolean(
    safeGet(() => navigator.serviceWorker && navigator.serviceWorker.register, false)
  );

  support['Permissions'] = Boolean(safeGet(() => navigator.permissions, false));

  return support;
};

export { collectApiSupport, DEFAULT_APIS };
