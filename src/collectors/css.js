import { isBrowser, safeGet } from '../runtime-utils/env.js';

const DEFAULT_CSS_FEATURES = [
  { name: 'css-grid', property: 'display', value: 'grid' },
  { name: 'css-flex', property: 'display', value: 'flex' },
  { name: 'aspect-ratio', property: 'aspect-ratio', value: '1 / 1' },
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
  if (typeof property === 'string' && property.trim().startsWith('(')) {
    const query = property.trim();
    const mq = safeGet(
      () => (typeof matchMedia === 'function' ? matchMedia(query) : null),
      null
    );

    if (!mq) return false;

    const directSupport = mq.media === query && mq.media !== 'not all';
    if (directSupport) return true;

    const negated = safeGet(
      () => (typeof matchMedia === 'function' ? matchMedia(`not all and ${query}`) : null),
      null
    );
    const negatedSupported = Boolean(negated && negated.media !== 'not all');

    return negatedSupported || (mq.media !== 'not all' && mq.media.length > 0);
  }

  const supportsByStyleMutation = (testProperty, testValue) => {
    if (!style) return undefined;

    const previousValue = style.getPropertyValue(testProperty);
    const previousPriority = style.getPropertyPriority(testProperty);
    try {
      style.setProperty(testProperty, testValue);
      return style.getPropertyValue(testProperty) !== '';
    } catch (err) {
      return false;
    } finally {
      style.removeProperty(testProperty);
      if (previousValue) style.setProperty(testProperty, previousValue, previousPriority);
    }
  };

  const supportsApi = safeGet(() => globalThis.CSS && typeof CSS.supports === 'function', false);
  if (supportsApi) {
    if (!property) return false;

    const trySupports = (...args) => {
      try {
        return CSS.supports(...args);
      } catch (err) {
        return undefined;
      }
    };

    if (value !== undefined) {
      const declarationResult = trySupports(`${property}: ${value}`);
      if (declarationResult !== undefined) {
        if (!declarationResult) return false;
        const mutation = supportsByStyleMutation(property, value);
        return mutation === undefined ? declarationResult : mutation;
      }

      const pairResult = trySupports(property, value);
      if (pairResult !== undefined) {
        if (!pairResult) return false;
        const mutation = supportsByStyleMutation(property, value);
        return mutation === undefined ? pairResult : mutation;
      }

      return false;
    }

    const propertyResult = trySupports(property);
    if (!propertyResult) return false;
    const mutation = supportsByStyleMutation(property, 'initial');
    return mutation === undefined ? Boolean(propertyResult) : mutation;
  }

  if (!property) return false;
  const mutation = supportsByStyleMutation(property, value === undefined ? 'initial' : value);
  return Boolean(mutation);
};

// Collects CSS feature support with optional custom checks.
// 采集 CSS 特性支持情况，并允许外部自定义检测项。
const collectCssSupport = (customFeatures = []) => {
  if (!isBrowser()) return {};
  const style = safeGet(() => document.createElement('div').style, null);
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
