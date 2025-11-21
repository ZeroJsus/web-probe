import { isBrowser, safeGet } from '../runtime-utils/env';
import type { CssFeature } from '../types';

const DEFAULT_CSS_FEATURES: CssFeature[] = [
  { name: 'css-grid', property: 'display', value: 'grid' },
  { name: 'css-flex', property: 'display', value: 'flex' },
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

  const supportsApi = safeGet(() => globalThis.CSS && typeof CSS.supports === 'function', false);
  if (supportsApi) {
    if (value === undefined) return CSS.supports(property);
    return CSS.supports(property, value);
  }

  if (!style) return false;
  if (value === undefined) return property ? property in style : false;

  if (!property) return false;

  const styleRecord = style as Record<string, unknown>;
  const previous = styleRecord[property];
  try {
    styleRecord[property] = value;
    return styleRecord[property] === value;
  } catch (err) {
    return false;
  } finally {
    styleRecord[property] = previous;
  }
};

// Collects CSS feature support with optional custom checks.
// 采集 CSS 特性支持情况，并允许外部自定义检测项。
const collectCssSupport = (customFeatures: Array<string | CssFeature> = []) => {
  if (!isBrowser()) return {};
  const style = safeGet(() => document.documentElement && document.documentElement.style, null);
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
