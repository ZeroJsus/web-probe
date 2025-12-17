var WebProbe = (function (exports) {
  'use strict';

  function _defineProperty(e, r, t) {
    return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
      value: t,
      enumerable: true,
      configurable: true,
      writable: true
    }) : e[r] = t, e;
  }
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function (r) {
        return Object.getOwnPropertyDescriptor(e, r).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), true).forEach(function (r) {
        _defineProperty(e, r, t[r]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
        Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
      });
    }
    return e;
  }
  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r);
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }

  const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';
  const safeGet = (getter, fallback) => {
    try {
      const value = getter();
      return value === undefined ? fallback : value;
    } catch (error) {
      return fallback;
    }
  };
  const coerceNumber = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const coerced = Number(value);
    return Number.isFinite(coerced) ? coerced : fallback;
  };
  const withTimeout = (promise, timeoutMs) => {
    if (!timeoutMs || timeoutMs <= 0) return promise;
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('probe-timeout')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });
  };

  const collectHardware = () => {
    if (!isBrowser()) {
      return {
        deviceMemory: null,
        hardwareConcurrency: null,
        userAgent: null,
        language: null,
        platform: null
      };
    }
    const nav = window.navigator || {};
    return {
      deviceMemory: coerceNumber(safeGet(() => nav.deviceMemory), null),
      hardwareConcurrency: coerceNumber(safeGet(() => nav.hardwareConcurrency), null),
      userAgent: safeGet(() => nav.userAgentData ? nav.userAgentData.brands : nav.userAgent, null),
      language: safeGet(() => nav.language || (nav.languages || [])[0], null),
      platform: safeGet(() => {
        var _nav$userAgentData;
        return nav.platform || ((_nav$userAgentData = nav.userAgentData) === null || _nav$userAgentData === void 0 ? void 0 : _nav$userAgentData.platform);
      }, null)
    };
  };

  const DEFAULT_APIS = ['fetch', 'Promise', 'IntersectionObserver', 'ResizeObserver', 'Worker', 'WebGLRenderingContext', 'OffscreenCanvas', 'PaymentRequest'];
  const normalizeApi = api => {
    if (!api) return null;
    if (typeof api === 'string') {
      return {
        name: api,
        detector: () => safeGet(() => globalThis[api], false)
      };
    }
    if (typeof api === 'object' && api.name) {
      const detector = typeof api.detector === 'function' ? api.detector : () => safeGet(() => globalThis[api.name], false);
      return {
        name: api.name,
        detector
      };
    }
    return null;
  };
  const collectApiSupport = (customApis = []) => {
    if (!isBrowser()) return {};
    const defaults = DEFAULT_APIS.map(api => ({
      name: api,
      detector: () => safeGet(() => globalThis[api], false)
    }));
    const normalizedCustom = (customApis || []).map(normalizeApi).filter(Boolean);
    const seen = new Set();
    const candidates = [...defaults, ...normalizedCustom].filter(entry => {
      if (seen.has(entry.name)) return false;
      seen.add(entry.name);
      return true;
    });
    const support = {};
    candidates.forEach(entry => {
      support[entry.name] = Boolean(safeGet(() => entry.detector(), false));
    });
    support['ServiceWorker'] = Boolean(safeGet(() => navigator.serviceWorker && navigator.serviceWorker.register, false));
    support['Permissions'] = Boolean(safeGet(() => navigator.permissions, false));
    return support;
  };

  const DEFAULT_HTML_FEATURES = [{
    name: 'canvas',
    detector: () => {
      const el = document.createElement('canvas');
      return Boolean(el && typeof el.getContext === 'function');
    }
  }, {
    name: 'video',
    detector: () => {
      const el = document.createElement('video');
      return Boolean(el && typeof el.canPlayType === 'function');
    }
  }, {
    name: 'template',
    detector: () => {
      const el = document.createElement('template');
      return 'content' in el;
    }
  }, {
    name: 'dialog',
    detector: () => {
      const el = document.createElement('dialog');
      return typeof el.showModal === 'function';
    }
  }, {
    name: 'picture',
    detector: () => Boolean(safeGet(() => globalThis.HTMLPictureElement, null))
  }, {
    name: 'slot',
    detector: () => Boolean(safeGet(() => globalThis.HTMLSlotElement, null))
  }, {
    name: 'custom-elements',
    detector: () => Boolean(safeGet(() => window.customElements && window.customElements.define, false))
  }];
  const toPascal = input => String(input).split(/[-_:]+/).filter(Boolean).map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join('');
  const normalizeFeature$1 = feature => {
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
      return {
        name: feature.name,
        detector
      };
    }
    return null;
  };
  const collectHtmlSupport = (customFeatures = []) => {
    if (!isBrowser()) return {};
    const normalizedDefaults = DEFAULT_HTML_FEATURES.map(normalizeFeature$1).filter(Boolean);
    const normalizedCustom = (customFeatures || []).map(normalizeFeature$1).filter(Boolean);
    const features = [...normalizedDefaults, ...normalizedCustom];
    const support = {};
    features.forEach(feature => {
      support[feature.name] = Boolean(safeGet(() => feature.detector(), false));
    });
    return support;
  };

  const DEFAULT_CSS_FEATURES = [{
    name: 'css-grid',
    property: 'display',
    value: 'grid'
  }, {
    name: 'css-flex',
    property: 'display',
    value: 'flex'
  }, {
    name: 'aspect-ratio',
    property: 'aspect-ratio',
    value: '1 / 1'
  }, {
    name: 'backdrop-filter',
    property: 'backdrop-filter',
    value: 'blur(2px)'
  }, {
    name: 'position-sticky',
    property: 'position',
    value: 'sticky'
  }, {
    name: 'container-queries',
    property: 'container-type',
    value: 'inline-size'
  }, {
    name: 'prefers-reduced-motion',
    property: '(prefers-reduced-motion: reduce)'
  }];
  const normalizeFeature = feature => {
    if (!feature) return null;
    if (typeof feature === 'string') {
      return {
        name: feature,
        property: feature
      };
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
      const mq = safeGet(() => typeof matchMedia === 'function' ? matchMedia(query) : null, null);
      if (!mq) return false;
      const directSupport = mq.media === query && mq.media !== 'not all';
      if (directSupport) return true;
      const negated = safeGet(() => typeof matchMedia === 'function' ? matchMedia(`not all and ${query}`) : null, null);
      const negatedSupported = Boolean(negated && negated.media !== 'not all');
      return negatedSupported || mq.media !== 'not all' && mq.media.length > 0;
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
  const collectCssSupport = (customFeatures = []) => {
    if (!isBrowser()) return {};
    const style = safeGet(() => document.createElement('div').style, null);
    const normalizedDefaults = DEFAULT_CSS_FEATURES.map(normalizeFeature).filter(Boolean);
    const normalizedCustom = (customFeatures || []).map(normalizeFeature).filter(Boolean);
    const features = [...normalizedDefaults, ...normalizedCustom];
    const support = {};
    features.forEach(feature => {
      support[feature.name] = Boolean(supportsCss(style, feature.property, feature.value));
    });
    return support;
  };

  const runMicroBenchmarks = ({
    iterations = 5000,
    timeoutMs = 25
  } = {}) => {
    if (!isBrowser()) return null;
    const perfNow = safeGet(() => performance.now.bind(performance), null);
    if (!perfNow) return null;
    const runOps = () => {
      const start = perfNow();
      let acc = 0;
      for (let i = 0; i < iterations; i += 1) {
        acc += Math.sqrt(i);
      }
      const end = perfNow();
      return {
        duration: end - start,
        accumulator: acc
      };
    };
    return withTimeout(Promise.resolve(runOps()), timeoutMs);
  };

  const roundValue = (value, precision = 2) => {
    if (value === null || value === undefined) return value;
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  };
  const sanitizeSnapshot = snapshot => {
    var _sanitized$benchmarks;
    const sanitized = _objectSpread2({}, snapshot);
    if (sanitized.hardware) {
      sanitized.hardware = _objectSpread2(_objectSpread2({}, sanitized.hardware), {}, {
        deviceMemory: roundValue(coerceNumber(sanitized.hardware.deviceMemory, null), 1),
        hardwareConcurrency: coerceNumber(sanitized.hardware.hardwareConcurrency, null)
      });
    }
    if ((_sanitized$benchmarks = sanitized.benchmarks) !== null && _sanitized$benchmarks !== void 0 && _sanitized$benchmarks.micro) {
      sanitized.benchmarks = sanitized.benchmarks || {};
      sanitized.benchmarks.micro = {
        duration: roundValue(coerceNumber(sanitized.benchmarks.micro.duration, null)),
        accumulator: undefined
      };
    }
    return sanitized;
  };

  const RULE_VERSION = '1.2.0';
  const rules = [{
    id: 'missing-fetch',
    severity: 'error',
    message: {
      en: 'Fetch API unavailable; network calls may fail.',
      zh: '缺少 Fetch API，网络请求可能失败。'
    },
    check: snapshot => snapshot.apiSupport && snapshot.apiSupport.fetch === false
  }, {
    id: 'low-memory',
    severity: 'warn',
    message: {
      en: 'Low reported device memory; consider lightweight assets.',
      zh: '设备可用内存较低，建议使用轻量资源。'
    },
    check: snapshot => {
      var _snapshot$hardware;
      return ((_snapshot$hardware = snapshot.hardware) === null || _snapshot$hardware === void 0 ? void 0 : _snapshot$hardware.deviceMemory) !== null && snapshot.hardware.deviceMemory < 1.5;
    }
  }, {
    id: 'no-service-worker',
    severity: 'info',
    message: {
      en: 'Service Worker unavailable; offline cache will be disabled.',
      zh: '不支持 Service Worker，离线缓存无法使用。'
    },
    check: snapshot => snapshot.apiSupport && snapshot.apiSupport.ServiceWorker === false
  }, {
    id: 'missing-html-template',
    severity: 'warn',
    message: {
      en: 'HTML template element is missing; client-side rendering may break.',
      zh: '缺少 HTML template 元素，前端模板渲染可能异常。'
    },
    check: snapshot => snapshot.htmlSupport && snapshot.htmlSupport.template === false
  }, {
    id: 'missing-aspect-ratio',
    severity: 'warn',
    message: {
      en: 'CSS aspect-ratio not supported; responsive components may render incorrectly.',
      zh: '不支持 CSS aspect-ratio，依赖比例的响应式组件可能渲染异常。'
    },
    check: snapshot => snapshot.cssSupport && snapshot.cssSupport['aspect-ratio'] === false
  }, {
    id: 'missing-css-grid',
    severity: 'warn',
    message: {
      en: 'CSS Grid not supported; layouts may fall back.',
      zh: '不支持 CSS Grid，页面布局可能退化。'
    },
    check: snapshot => snapshot.cssSupport && snapshot.cssSupport['css-grid'] === false
  }];

  const evaluateCompatibility = (snapshot, overrides = {}) => {
    const findings = rules.filter(rule => overrides[rule.id] !== false).map(rule => ({
      id: rule.id,
      severity: rule.severity,
      triggered: Boolean(rule.check(snapshot)),
      message: rule.message
    })).filter(finding => finding.triggered);
    return {
      findings,
      ruleVersion: RULE_VERSION
    };
  };

  const displayValue = (value, fallback = 'n/a') => {
    return value === null || value === undefined ? fallback : value;
  };
  const buildList = items => {
    const list = document.createElement('ul');
    list.style.margin = '0';
    list.style.paddingLeft = '16px';
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.style.fontSize = '12px';
      list.appendChild(li);
    });
    return list;
  };
  const resolveMount = mount => {
    if (!mount) return null;
    if (typeof mount === 'string') return document.querySelector(mount);
    return mount;
  };
  const renderWidget = (result, options = {}) => {
    var _result$report;
    if (!isBrowser()) return null;
    const mountNode = resolveMount(options.mount || document.body);
    if (!mountNode) return null;
    const container = document.createElement('section');
    container.setAttribute('data-probe', 'web-probe');
    container.style.border = '1px solid #d0d7de';
    container.style.borderRadius = '8px';
    container.style.padding = '12px';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    container.style.background = options.theme === 'dark' ? '#0b1622' : '#f6f8fa';
    container.style.color = options.theme === 'dark' ? '#f0f6fc' : '#1f2328';
    container.style.maxWidth = '360px';
    container.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
    const title = document.createElement('h3');
    title.textContent = 'Web Probe Summary / 探针摘要';
    title.style.margin = '0 0 8px 0';
    title.style.fontSize = '16px';
    container.appendChild(title);
    const {
      hardware,
      apiSupport,
      htmlSupport,
      cssSupport
    } = result.snapshot;
    const hardwareBlock = document.createElement('div');
    hardwareBlock.style.marginBottom = '8px';
    const hardwareTitle = document.createElement('strong');
    hardwareTitle.textContent = 'Hardware / 硬件';
    hardwareBlock.appendChild(hardwareTitle);
    hardwareBlock.appendChild(buildList([`Memory: ${displayValue(safeGet(() => hardware.deviceMemory, null))} GB`, `Cores: ${displayValue(safeGet(() => hardware.hardwareConcurrency, null))}`, `Platform: ${displayValue(safeGet(() => hardware.platform, null))}`, `Language: ${displayValue(safeGet(() => hardware.language, null))}`]));
    container.appendChild(hardwareBlock);
    const apiBlock = document.createElement('div');
    apiBlock.style.marginBottom = '8px';
    const apiTitle = document.createElement('strong');
    apiTitle.textContent = 'APIs';
    apiBlock.appendChild(apiTitle);
    const apiLines = Object.keys(apiSupport).slice(0, 6).map(key => `${key}: ${apiSupport[key]}`);
    apiBlock.appendChild(buildList(apiLines));
    container.appendChild(apiBlock);
    const htmlBlock = document.createElement('div');
    htmlBlock.style.marginBottom = '8px';
    const htmlTitle = document.createElement('strong');
    htmlTitle.textContent = 'HTML';
    htmlBlock.appendChild(htmlTitle);
    const htmlLines = Object.keys(htmlSupport).slice(0, 6).map(key => `${key}: ${htmlSupport[key]}`);
    htmlBlock.appendChild(buildList(htmlLines));
    container.appendChild(htmlBlock);
    const cssBlock = document.createElement('div');
    cssBlock.style.marginBottom = '8px';
    const cssTitle = document.createElement('strong');
    cssTitle.textContent = 'CSS';
    cssBlock.appendChild(cssTitle);
    const cssLines = Object.keys(cssSupport).slice(0, 6).map(key => `${key}: ${cssSupport[key]}`);
    cssBlock.appendChild(buildList(cssLines));
    container.appendChild(cssBlock);
    const findings = ((_result$report = result.report) === null || _result$report === void 0 ? void 0 : _result$report.findings) || [];
    const findingsBlock = document.createElement('div');
    const findingsTitle = document.createElement('strong');
    findingsTitle.textContent = 'Findings / 结论';
    findingsBlock.appendChild(findingsTitle);
    if (!findings.length) {
      const ok = document.createElement('p');
      ok.textContent = 'All clear / 无异常';
      ok.style.margin = '4px 0 0 0';
      ok.style.fontSize = '12px';
      findingsBlock.appendChild(ok);
    } else {
      findingsBlock.appendChild(buildList(findings.map(finding => `${finding.severity.toUpperCase()}: ${finding.message.en} / ${finding.message.zh}`)));
    }
    container.appendChild(findingsBlock);
    mountNode.appendChild(container);
    return container;
  };

  const createIntegrationBus = () => {
    const listeners = new Map();
    const on = (event, handler) => {
      const existing = listeners.get(event) || [];
      listeners.set(event, [...existing, handler]);
      return () => off(event, handler);
    };
    const off = (event, handler) => {
      const existing = listeners.get(event) || [];
      listeners.set(event, existing.filter(fn => fn !== handler));
    };
    const emit = (event, payload) => {
      const handlers = listeners.get(event) || [];
      handlers.forEach(fn => fn(payload));
    };
    return {
      on,
      off,
      emit
    };
  };

  const DEFAULT_CONFIG = {
    enableBenchmarks: false,
    customApis: [],
    customHtmlFeatures: [],
    customCssFeatures: [],
    benchmarkOptions: {},
    ruleOverrides: {},
    theme: 'light'
  };
  const createProbe = (userConfig = {}) => {
    const config = _objectSpread2(_objectSpread2({}, DEFAULT_CONFIG), userConfig);
    const bus = createIntegrationBus();
    let lastResult = null;
    const collect = () => {
      const hardware = collectHardware();
      const apiSupport = collectApiSupport(config.customApis);
      const htmlSupport = collectHtmlSupport(config.customHtmlFeatures);
      const cssSupport = collectCssSupport(config.customCssFeatures);
      const benchmarksPromise = config.enableBenchmarks ? runMicroBenchmarks(config.benchmarkOptions) : Promise.resolve(undefined);
      return Promise.resolve(benchmarksPromise).then(benchmarks => {
        const snapshot = sanitizeSnapshot({
          hardware,
          apiSupport,
          htmlSupport,
          cssSupport,
          benchmarks: benchmarks ? {
            micro: benchmarks
          } : undefined
        });
        bus.emit('snapshot', snapshot);
        const report = evaluateCompatibility(snapshot, config.ruleOverrides);
        const result = {
          snapshot,
          report
        };
        lastResult = result;
        bus.emit('result', result);
        return result;
      });
    };
    const render = mountNode => {
      if (!isBrowser()) return null;
      if (!lastResult) return null;
      return renderWidget(lastResult, {
        mount: mountNode,
        theme: config.theme
      });
    };
    return {
      run: collect,
      render,
      on: bus.on,
      off: bus.off
    };
  };

  exports.createProbe = createProbe;

  return exports;

})({});
//# sourceMappingURL=probe.iife.js.map
