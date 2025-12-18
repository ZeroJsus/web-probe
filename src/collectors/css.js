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

const supportsAspectRatioBehavioral = () => {
  if (!isBrowser()) return { supported: false, squareHeight: null, wideHeight: null };

  const doc = safeGet(() => document, null);
  if (!doc) return { supported: false, squareHeight: null, wideHeight: null };

  const root = doc.body || doc.documentElement;
  if (!root) return { supported: false, squareHeight: null, wideHeight: null };

  const wrapper = doc.createElement('div');
  wrapper.style.cssText =
    'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;z-index:-1;overflow:hidden;';

  const square = doc.createElement('div');
  square.style.cssText =
    'display:block;width:120px;height:auto;margin:0;padding:0;border:0;box-sizing:content-box;aspect-ratio:1/1;';

  const wide = doc.createElement('div');
  wide.style.cssText =
    'display:block;width:120px;height:auto;margin:0;padding:0;border:0;box-sizing:content-box;aspect-ratio:2/1;';

  wrapper.appendChild(square);
  wrapper.appendChild(wide);

  try {
    root.appendChild(wrapper);
    const squareHeight = square.getBoundingClientRect().height;
    const wideHeight = wide.getBoundingClientRect().height;

    const squareOk = squareHeight > 0 && Math.abs(squareHeight - 120) <= 2;
    const wideOk = wideHeight > 0 && Math.abs(wideHeight - 60) <= 2;

    return { supported: squareOk && wideOk, squareHeight, wideHeight };
  } catch (err) {
    return { supported: false, squareHeight: null, wideHeight: null };
  } finally {
    try {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    } catch (cleanupErr) {
      // ignore
    }
  }
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
  if (!isBrowser()) return { support: {}, debug: {} };
  const style = safeGet(() => document.createElement('div').style, null);
  const normalizedDefaults = DEFAULT_CSS_FEATURES.map(normalizeFeature).filter(Boolean);
  const normalizedCustom = (customFeatures || []).map(normalizeFeature).filter(Boolean);
  const features = [...normalizedDefaults, ...normalizedCustom];

  const support = {};
  const debug = {};
  features.forEach((feature) => {
    const syntacticSupport = Boolean(supportsCss(style, feature.property, feature.value));
    if (feature.property === 'aspect-ratio' || feature.name === 'aspect-ratio') {
      const behavior = supportsAspectRatioBehavioral();
      support[feature.name] = syntacticSupport && behavior.supported;
      debug[feature.name] = {
        syntactic: syntacticSupport,
        behavioral: behavior.supported,
        squareHeight: behavior.squareHeight,
        wideHeight: behavior.wideHeight
      };
      return;
    }

    support[feature.name] = syntacticSupport;
  });

  return { support, debug };
};

export { DEFAULT_CSS_FEATURES, collectCssSupport };
