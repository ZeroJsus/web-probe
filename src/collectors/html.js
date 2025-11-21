import { isBrowser, safeGet } from '../runtime-utils/env.js';

const DEFAULT_HTML_FEATURES = [
  {
    name: 'canvas',
    detector: () => {
      const el = document.createElement('canvas');
      return Boolean(el && typeof el.getContext === 'function');
    }
  },
  {
    name: 'video',
    detector: () => {
      const el = document.createElement('video');
      return Boolean(el && typeof el.canPlayType === 'function');
    }
  },
  {
    name: 'template',
    detector: () => {
      const el = document.createElement('template');
      return 'content' in el;
    }
  },
  {
    name: 'dialog',
    detector: () => {
      const el = document.createElement('dialog');
      return typeof el.showModal === 'function';
    }
  },
  {
    name: 'picture',
    detector: () => Boolean(safeGet(() => globalThis.HTMLPictureElement, null))
  },
  {
    name: 'slot',
    detector: () => Boolean(safeGet(() => globalThis.HTMLSlotElement, null))
  },
  {
    name: 'custom-elements',
    detector: () => Boolean(safeGet(() => window.customElements && window.customElements.define, false))
  }
];

const toPascal = (input) =>
  String(input)
    .split(/[-_:]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join('');

const normalizeFeature = (feature) => {
  if (!feature) return null;
  if (typeof feature === 'string') {
    const tag = feature;
    return {
      name: tag,
      detector: () => {
        const ctorName = `HTML${toPascal(tag)}Element`;
        const ctor = safeGet(() => globalThis[ctorName], null);
        if (ctor) return true;
        const el = document.createElement(tag);
        return safeGet(() => Object.prototype.toString.call(el) !== '[object HTMLUnknownElement]', false);
      }
    };
  }
  if (typeof feature === 'object' && feature.name) {
    const detector = typeof feature.detector === 'function' ? feature.detector : () => false;
    return { name: feature.name, detector };
  }
  return null;
};

// Collects HTML feature support (elements or APIs) with extendable detectors.
// 采集 HTML 特性（元素或 API）支持情况，并允许外部扩展检测逻辑。
const collectHtmlSupport = (customFeatures = []) => {
  if (!isBrowser()) return {};
  const normalizedDefaults = DEFAULT_HTML_FEATURES.map(normalizeFeature).filter(Boolean);
  const normalizedCustom = (customFeatures || []).map(normalizeFeature).filter(Boolean);
  const features = [...normalizedDefaults, ...normalizedCustom];

  const support = {};
  features.forEach((feature) => {
    support[feature.name] = Boolean(safeGet(() => feature.detector(), false));
  });

  return support;
};

export { DEFAULT_HTML_FEATURES, collectHtmlSupport };
