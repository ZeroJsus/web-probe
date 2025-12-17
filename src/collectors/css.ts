import { isBrowser, safeGet } from '../runtime-utils/env';
import type { CssFeature } from '../types';

const DEFAULT_CSS_FEATURES: CssFeature[] = [
  { name: 'css-grid', property: 'display', value: 'grid' },
  { name: 'css-flex', property: 'display', value: 'flex' },
  { name: 'aspect-ratio', property: 'aspect-ratio', value: '1 / 1' },
  { name: 'backdrop-filter', property: 'backdrop-filter', value: 'blur(2px)' },
  { name: 'position-sticky', property: 'position', value: 'sticky' },
  { name: 'container-queries', property: 'container-type', value: 'inline-size' },
  { name: 'prefers-reduced-motion', property: '(prefers-reduced-motion: reduce)' }
];

const normalizeFeature = (feature?: string | CssFeature | null) => {
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

const supportsCss = (
  style: CSSStyleDeclaration | null,
  property?: string,
  value?: string
): boolean => {
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

  const supportsByStyleMutation = (testProperty: string, testValue: string) => {
    if (!style) return undefined;

    // Avoid `style[property] = value` because CSSStyleDeclaration may accept arbitrary expando
    // properties (e.g. `style['aspect-ratio']`) and produce false positives.
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

    const trySupports = (...args: unknown[]) => {
      try {
        return (CSS.supports as (...params: unknown[]) => boolean)(...args);
      } catch (err) {
        return undefined;
      }
    };

    // Prefer the declaration form because it matches `@supports(...)` behavior more closely.
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
const collectCssSupport = (customFeatures: Array<string | CssFeature> = []) => {
  if (!isBrowser()) return {};
  const style = safeGet(() => document.createElement('div').style, null) as CSSStyleDeclaration | null;
  const normalizedDefaults = DEFAULT_CSS_FEATURES.map(normalizeFeature).filter(Boolean) as Array<{
    name: string;
    property?: string;
    value?: string;
  }>;
  const normalizedCustom = (customFeatures || []).map(normalizeFeature).filter(Boolean) as Array<{
    name: string;
    property?: string;
    value?: string;
  }>;
  const features = [...normalizedDefaults, ...normalizedCustom];

  const support: Record<string, boolean> = {};
  features.forEach((feature) => {
    support[feature.name] = Boolean(supportsCss(style, feature.property, feature.value));
  });

  return support;
};

export { DEFAULT_CSS_FEATURES, collectCssSupport };
