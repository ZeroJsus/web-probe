import { isBrowser, safeGet } from '../runtime-utils/env.js';

const DEFAULT_CSS_FEATURES = [
  { name: 'css-grid', property: 'display', value: 'grid' },
  { name: 'css-flex', property: 'display', value: 'flex' },
  { name: 'backdrop-filter', property: 'backdrop-filter', value: 'blur(2px)' },
  { name: 'position-sticky', property: 'position', value: 'sticky' },
  { name: 'container-queries', property: 'container-type', value: 'inline-size' },
  { name: 'prefers-reduced-motion', property: '(prefers-reduced-motion: reduce)' }
];

const normalizeFeature = (feature) => {
  if (!feature) return null;
  if (typeof feature === 'string') {
    return { name: feature, property: feature };
  }
  if (typeof feature === 'object' && feature.name) {
    return {
      name: feature.name,
      property: feature.property || feature.name,
      value: feature.value
    };
  }
  return null;
};

const supportsCss = (style, property, value) => {
  const supportsApi = safeGet(() => globalThis.CSS && typeof CSS.supports === 'function', false);
  if (supportsApi) {
    if (value === undefined) return CSS.supports(property);
    return CSS.supports(property, value);
  }

  if (!style) return false;
  if (value === undefined) return property in style;

  const previous = style[property];
  try {
    style[property] = value;
    return style[property] === value;
  } catch (err) {
    return false;
  } finally {
    style[property] = previous;
  }
};

// Collects CSS feature support with optional custom checks.
// 采集 CSS 特性支持情况，并允许外部自定义检测项。
const collectCssSupport = (customFeatures = []) => {
  if (!isBrowser()) return {};
  const style = safeGet(() => document.documentElement && document.documentElement.style, null);
  const normalizedDefaults = DEFAULT_CSS_FEATURES.map(normalizeFeature).filter(Boolean);
  const normalizedCustom = (customFeatures || []).map(normalizeFeature).filter(Boolean);
  const features = [...normalizedDefaults, ...normalizedCustom];

  const support = {};
  features.forEach((feature) => {
    support[feature.name] = Boolean(supportsCss(style, feature.property, feature.value));
  });

  return support;
};

export { DEFAULT_CSS_FEATURES, collectCssSupport };
