import { isBrowser, safeGet } from '../runtime-utils/env.js';

const DEFAULT_APIS = [
  'fetch',
  'Promise',
  'IntersectionObserver',
  'ResizeObserver',
  'Worker',
  'WebGLRenderingContext',
  'OffscreenCanvas',
  'PaymentRequest'
];

// Detects whether core and custom APIs exist on the current global scope.
// 检测核心与自定义 API 是否存在于当前全局对象。
const collectApiSupport = (customApis = []) => {
  if (!isBrowser()) return {};
  const candidates = [...new Set([...DEFAULT_APIS, ...customApis])];
  const support = {};

  candidates.forEach((apiName) => {
    support[apiName] = Boolean(safeGet(() => globalThis[apiName], false));
  });

  support['ServiceWorker'] = Boolean(
    safeGet(() => navigator.serviceWorker && navigator.serviceWorker.register, false)
  );

  support['Permissions'] = Boolean(safeGet(() => navigator.permissions, false));

  return support;
};

export { collectApiSupport, DEFAULT_APIS };
