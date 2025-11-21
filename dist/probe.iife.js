(function (global) {
  'use strict';

  // Helpers -------------------------------------------------------------
  function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  function safeGet(getter, fallback) {
    if (fallback === undefined) fallback = undefined;
    try {
      var value = getter();
      return value === undefined ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function coerceNumber(value, fallback) {
    if (fallback === undefined) fallback = 0;
    if (value === null || value === undefined) return fallback;
    var coerced = Number(value);
    return isFinite(coerced) ? coerced : fallback;
  }

  function withTimeout(promise, timeoutMs) {
    if (!timeoutMs || timeoutMs <= 0) return promise;

    var timeoutHandle;
    var timeoutPromise = new Promise(function (_, reject) {
      timeoutHandle = setTimeout(function () {
        reject(new Error('probe-timeout'));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(function () {
      clearTimeout(timeoutHandle);
    });
  }

  // Collectors ---------------------------------------------------------
  function collectHardware() {
    if (!isBrowser()) {
      return {
        deviceMemory: null,
        hardwareConcurrency: null,
        userAgent: null,
        language: null,
        platform: null
      };
    }

    var nav = window.navigator || {};

    return {
      deviceMemory: coerceNumber(safeGet(function () { return nav.deviceMemory; }), null),
      hardwareConcurrency: coerceNumber(safeGet(function () { return nav.hardwareConcurrency; }), null),
      userAgent: safeGet(function () {
        return nav.userAgentData ? nav.userAgentData.brands : nav.userAgent;
      }, null),
      language: safeGet(function () {
        return nav.language || (nav.languages && nav.languages[0]);
      }, null),
      platform: safeGet(function () {
        return nav.platform || (nav.userAgentData && nav.userAgentData.platform);
      }, null)
    };
  }

  var DEFAULT_APIS = [
    'fetch',
    'Promise',
    'IntersectionObserver',
    'ResizeObserver',
    'Worker',
    'WebGLRenderingContext',
    'OffscreenCanvas',
    'PaymentRequest'
  ];

  function normalizeApi(api) {
    if (!api) return null;
    if (typeof api === 'string') {
      return { name: api, detector: function () { return safeGet(function () { return global[api]; }, false); } };
    }
    if (typeof api === 'object' && api.name) {
      var detector = typeof api.detector === 'function'
        ? api.detector
        : function () { return safeGet(function () { return global[api.name]; }, false); };
      return { name: api.name, detector: detector };
    }
    return null;
  }

  function collectApiSupport(customApis) {
    if (customApis === void 0) customApis = [];
    if (!isBrowser()) return {};

    var defaults = DEFAULT_APIS.map(function (api) {
      return { name: api, detector: function () { return safeGet(function () { return global[api]; }, false); } };
    });
    var normalizedCustom = (customApis || []).map(normalizeApi).filter(Boolean);

    var seen = {};
    var candidates = defaults.concat(normalizedCustom).filter(function (entry) {
      if (seen[entry.name]) return false;
      seen[entry.name] = true;
      return true;
    });

    var support = {};
    candidates.forEach(function (entry) {
      support[entry.name] = Boolean(safeGet(function () { return entry.detector(); }, false));
    });

    support['ServiceWorker'] = Boolean(
      safeGet(function () { return navigator.serviceWorker && navigator.serviceWorker.register; }, false)
    );

    support['Permissions'] = Boolean(safeGet(function () { return navigator.permissions; }, false));

    return support;
  }

  var DEFAULT_HTML_FEATURES = [
    {
      name: 'canvas',
      detector: function () {
        var el = document.createElement('canvas');
        return Boolean(el && typeof el.getContext === 'function');
      }
    },
    {
      name: 'video',
      detector: function () {
        var el = document.createElement('video');
        return Boolean(el && typeof el.canPlayType === 'function');
      }
    },
    {
      name: 'template',
      detector: function () {
        var el = document.createElement('template');
        return 'content' in el;
      }
    },
    {
      name: 'dialog',
      detector: function () {
        var el = document.createElement('dialog');
        return typeof el.showModal === 'function';
      }
    },
    {
      name: 'picture',
      detector: function () { return Boolean(safeGet(function () { return global.HTMLPictureElement; }, null)); }
    },
    {
      name: 'slot',
      detector: function () { return Boolean(safeGet(function () { return global.HTMLSlotElement; }, null)); }
    },
    {
      name: 'custom-elements',
      detector: function () { return Boolean(safeGet(function () { return window.customElements && window.customElements.define; }, false)); }
    }
  ];

  function toPascal(input) {
    return String(input)
      .split(/[-_:]+/)
      .filter(Boolean)
      .map(function (chunk) { return chunk.charAt(0).toUpperCase() + chunk.slice(1); })
      .join('');
  }

  function normalizeHtmlFeature(feature) {
    if (!feature) return null;
    if (typeof feature === 'string') {
      var tag = feature;
      return {
        name: tag,
        detector: function () {
          var ctorName = 'HTML' + toPascal(tag) + 'Element';
          var ctor = safeGet(function () { return global[ctorName]; }, null);
          if (ctor) return true;
          var el = document.createElement(tag);
          return safeGet(function () { return Object.prototype.toString.call(el) !== '[object HTMLUnknownElement]'; }, false);
        }
      };
    }
    if (typeof feature === 'object' && feature.name) {
      var detector = typeof feature.detector === 'function' ? feature.detector : function () { return false; };
      return { name: feature.name, detector: detector };
    }
    return null;
  }

  function collectHtmlSupport(customFeatures) {
    if (customFeatures === void 0) customFeatures = [];
    if (!isBrowser()) return {};
    var normalizedDefaults = DEFAULT_HTML_FEATURES.map(normalizeHtmlFeature).filter(Boolean);
    var normalizedCustom = (customFeatures || []).map(normalizeHtmlFeature).filter(Boolean);
    var features = normalizedDefaults.concat(normalizedCustom);

    var support = {};
    features.forEach(function (feature) {
      support[feature.name] = Boolean(safeGet(function () { return feature.detector(); }, false));
    });

    return support;
  }

  var DEFAULT_CSS_FEATURES = [
    { name: 'css-grid', property: 'display', value: 'grid' },
    { name: 'css-flex', property: 'display', value: 'flex' },
    { name: 'backdrop-filter', property: 'backdrop-filter', value: 'blur(2px)' },
    { name: 'position-sticky', property: 'position', value: 'sticky' },
    { name: 'container-queries', property: 'container-type', value: 'inline-size' },
    { name: 'prefers-reduced-motion', property: '(prefers-reduced-motion: reduce)' }
  ];

  function normalizeCssFeature(feature) {
    if (!feature) return null;
    if (typeof feature === 'string') {
      return { name: feature, property: feature };
    }
    if (typeof feature === 'object' && feature.name) {
      return { name: feature.name, property: feature.property || feature.name, value: feature.value };
    }
    return null;
  }

  function supportsCss(style, property, value) {
    if (typeof property === 'string' && property.trim().charAt(0) === '(') {
      var query = property.trim();
      var mq = safeGet(function () { return typeof matchMedia === 'function' ? matchMedia(query) : null; }, null);

      if (!mq) return false;

      var directSupport = mq.media === query && mq.media !== 'not all';
      if (directSupport) return true;

      var negated = safeGet(function () { return typeof matchMedia === 'function' ? matchMedia("not all and " + query) : null; }, null);
      var negatedSupported = Boolean(negated && negated.media !== 'not all');

      return negatedSupported || mq.media !== 'not all' && mq.media.length > 0;
    }

    var supportsApi = safeGet(function () { return global.CSS && typeof CSS.supports === 'function'; }, false);
    if (supportsApi) {
      if (value === undefined) return CSS.supports(property);
      return CSS.supports(property, value);
    }

    if (!style) return false;
    if (value === undefined) return property in style;

    var previous = style[property];
    try {
      style[property] = value;
      return style[property] === value;
    } catch (err) {
      return false;
    } finally {
      style[property] = previous;
    }
  }

  function collectCssSupport(customFeatures) {
    if (customFeatures === void 0) customFeatures = [];
    if (!isBrowser()) return {};
    var style = safeGet(function () { return document.documentElement && document.documentElement.style; }, null);
    var normalizedDefaults = DEFAULT_CSS_FEATURES.map(normalizeCssFeature).filter(Boolean);
    var normalizedCustom = (customFeatures || []).map(normalizeCssFeature).filter(Boolean);
    var features = normalizedDefaults.concat(normalizedCustom);

    var support = {};
    features.forEach(function (feature) {
      support[feature.name] = Boolean(supportsCss(style, feature.property, feature.value));
    });

    return support;
  }

  // Benchmarks ---------------------------------------------------------
  function runMicroBenchmarks(options) {
    if (options === void 0) options = {};
    if (!isBrowser()) return null;

    var iterations = options.iterations != null ? options.iterations : 5000;
    var timeoutMs = options.timeoutMs != null ? options.timeoutMs : 25;

    var perfNow = safeGet(function () {
      return performance.now && performance.now.bind(performance);
    }, null);
    if (!perfNow) return null;

    var runOps = function () {
      var start = perfNow();
      var acc = 0;
      for (var i = 0; i < iterations; i += 1) {
        acc += Math.sqrt(i);
      }
      var end = perfNow();
      return { duration: end - start, accumulator: acc };
    };

    return withTimeout(Promise.resolve(runOps()), timeoutMs);
  }

  // Sanitizer ----------------------------------------------------------
  function roundValue(value, precision) {
    if (precision === void 0) precision = 2;
    if (value === null || value === undefined) return value;
    var factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  function sanitizeSnapshot(snapshot) {
    var sanitized = Object.assign({}, snapshot);

    if (sanitized.hardware) {
      sanitized.hardware = Object.assign({}, sanitized.hardware, {
        deviceMemory: roundValue(coerceNumber(sanitized.hardware.deviceMemory, null), 1),
        hardwareConcurrency: coerceNumber(sanitized.hardware.hardwareConcurrency, null)
      });
    }

    if (sanitized.benchmarks && sanitized.benchmarks.micro) {
      sanitized.benchmarks = sanitized.benchmarks || {};
      sanitized.benchmarks.micro = {
        duration: roundValue(coerceNumber(sanitized.benchmarks.micro.duration, null)),
        accumulator: undefined
      };
    }

    return sanitized;
  }

  // Compatibility ------------------------------------------------------
  var RULE_VERSION = '1.1.0';

  var rules = [
    {
      id: 'missing-fetch',
      severity: 'error',
      message: {
        en: 'Fetch API unavailable; network calls may fail.',
        zh: '缺少 Fetch API，网络请求可能失败。'
      },
      check: function (snapshot) { return snapshot.apiSupport && snapshot.apiSupport.fetch === false; }
    },
    {
      id: 'low-memory',
      severity: 'warn',
      message: {
        en: 'Low reported device memory; consider lightweight assets.',
        zh: '设备可用内存较低，建议使用轻量资源。'
      },
      check: function (snapshot) { return snapshot.hardware && snapshot.hardware.deviceMemory !== null && snapshot.hardware.deviceMemory < 1.5; }
    },
    {
      id: 'no-service-worker',
      severity: 'info',
      message: {
        en: 'Service Worker unavailable; offline cache will be disabled.',
        zh: '不支持 Service Worker，离线缓存无法使用。'
      },
      check: function (snapshot) { return snapshot.apiSupport && snapshot.apiSupport.ServiceWorker === false; }
    },
    {
      id: 'missing-html-template',
      severity: 'warn',
      message: {
        en: 'HTML template element is missing; client-side rendering may break.',
        zh: '缺少 HTML template 元素，前端模板渲染可能异常。'
      },
      check: function (snapshot) { return snapshot.htmlSupport && snapshot.htmlSupport.template === false; }
    },
    {
      id: 'missing-css-grid',
      severity: 'warn',
      message: {
        en: 'CSS Grid not supported; layouts may fall back.',
        zh: '不支持 CSS Grid，页面布局可能退化。'
      },
      check: function (snapshot) { return snapshot.cssSupport && snapshot.cssSupport['css-grid'] === false; }
    }
  ];

  function evaluateCompatibility(snapshot, overrides) {
    if (overrides === void 0) overrides = {};
    var findings = rules
      .filter(function (rule) { return overrides[rule.id] !== false; })
      .map(function (rule) {
        return {
          id: rule.id,
          severity: rule.severity,
          triggered: Boolean(rule.check(snapshot)),
          message: rule.message
        };
      })
      .filter(function (finding) { return finding.triggered; });

    return { findings: findings, ruleVersion: RULE_VERSION };
  }

  // Integrations -------------------------------------------------------
  function createIntegrationBus() {
    var listeners = new Map();

    var on = function (event, handler) {
      var existing = listeners.get(event) || [];
      listeners.set(event, existing.concat([handler]));
      return function () { return off(event, handler); };
    };

    var off = function (event, handler) {
      var existing = listeners.get(event) || [];
      listeners.set(
        event,
        existing.filter(function (fn) { return fn !== handler; })
      );
    };

    var emit = function (event, payload) {
      var handlers = listeners.get(event) || [];
      handlers.forEach(function (fn) { return fn(payload); });
    };

    return { on: on, off: off, emit: emit };
  }

  // UI -----------------------------------------------------------------
  function displayValue(value, fallback) {
    if (fallback === void 0) fallback = 'n/a';
    return value === null || value === undefined ? fallback : value;
  }

  function buildList(items) {
    var list = document.createElement('ul');
    list.style.margin = '0';
    list.style.paddingLeft = '16px';
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      li.style.fontSize = '12px';
      list.appendChild(li);
    });
    return list;
  }

  function resolveMount(mount) {
    if (!mount) return null;
    if (typeof mount === 'string') return document.querySelector(mount);
    return mount;
  }

  function renderWidget(result, options) {
    if (options === void 0) options = {};
    if (!isBrowser()) return null;
    var mountNode = resolveMount(options.mount || document.body);
    if (!mountNode) return null;

    var container = document.createElement('section');
    container.setAttribute('data-probe', 'web-probe');
    container.style.border = '1px solid #d0d7de';
    container.style.borderRadius = '8px';
    container.style.padding = '12px';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    container.style.background = options.theme === 'dark' ? '#0b1622' : '#f6f8fa';
    container.style.color = options.theme === 'dark' ? '#f0f6fc' : '#1f2328';
    container.style.maxWidth = '360px';
    container.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';

    var title = document.createElement('h3');
    title.textContent = 'Web Probe Summary / 探针摘要';
    title.style.margin = '0 0 8px 0';
    title.style.fontSize = '16px';
    container.appendChild(title);

    var hardware = (result.snapshot && result.snapshot.hardware) || {};
    var apiSupport = (result.snapshot && result.snapshot.apiSupport) || {};
    var htmlSupport = (result.snapshot && result.snapshot.htmlSupport) || {};
    var cssSupport = (result.snapshot && result.snapshot.cssSupport) || {};

    var hardwareBlock = document.createElement('div');
    hardwareBlock.style.marginBottom = '8px';
    var hardwareTitle = document.createElement('strong');
    hardwareTitle.textContent = 'Hardware / 硬件';
    hardwareBlock.appendChild(hardwareTitle);
    hardwareBlock.appendChild(
      buildList([
        'Memory: ' + displayValue(safeGet(function () { return hardware.deviceMemory; }, null)) + ' GB',
        'Cores: ' + displayValue(safeGet(function () { return hardware.hardwareConcurrency; }, null)),
        'Platform: ' + displayValue(safeGet(function () { return hardware.platform; }, null)),
        'Language: ' + displayValue(safeGet(function () { return hardware.language; }, null))
      ])
    );
    container.appendChild(hardwareBlock);

    var apiBlock = document.createElement('div');
    apiBlock.style.marginBottom = '8px';
    var apiTitle = document.createElement('strong');
    apiTitle.textContent = 'APIs';
    apiBlock.appendChild(apiTitle);
    var apiLines = Object.keys(apiSupport).slice(0, 6).map(function (key) { return key + ': ' + apiSupport[key]; });
    apiBlock.appendChild(buildList(apiLines));
    container.appendChild(apiBlock);

    var htmlBlock = document.createElement('div');
    htmlBlock.style.marginBottom = '8px';
    var htmlTitle = document.createElement('strong');
    htmlTitle.textContent = 'HTML';
    htmlBlock.appendChild(htmlTitle);
    var htmlLines = Object.keys(htmlSupport)
      .slice(0, 6)
      .map(function (key) { return key + ': ' + htmlSupport[key]; });
    htmlBlock.appendChild(buildList(htmlLines));
    container.appendChild(htmlBlock);

    var cssBlock = document.createElement('div');
    cssBlock.style.marginBottom = '8px';
    var cssTitle = document.createElement('strong');
    cssTitle.textContent = 'CSS';
    cssBlock.appendChild(cssTitle);
    var cssLines = Object.keys(cssSupport)
      .slice(0, 6)
      .map(function (key) { return key + ': ' + cssSupport[key]; });
    cssBlock.appendChild(buildList(cssLines));
    container.appendChild(cssBlock);

    var findings = (result.report && result.report.findings) || [];
    var findingsBlock = document.createElement('div');
    var findingsTitle = document.createElement('strong');
    findingsTitle.textContent = 'Findings / 结论';
    findingsBlock.appendChild(findingsTitle);
    if (!findings.length) {
      var ok = document.createElement('p');
      ok.textContent = 'All clear / 无异常';
      ok.style.margin = '4px 0 0 0';
      ok.style.fontSize = '12px';
      findingsBlock.appendChild(ok);
    } else {
      findingsBlock.appendChild(
        buildList(
          findings.map(function (finding) {
            return finding.severity.toUpperCase() + ': ' + finding.message.en + ' / ' + finding.message.zh;
          })
        )
      );
    }
    container.appendChild(findingsBlock);

    mountNode.appendChild(container);
    return container;
  }

  // Loader -------------------------------------------------------------
  var DEFAULT_CONFIG = {
    enableBenchmarks: false,
    customApis: [],
    customHtmlFeatures: [],
    customCssFeatures: [],
    benchmarkOptions: {},
    ruleOverrides: {},
    theme: 'light'
  };

  function createProbe(userConfig) {
    if (userConfig === void 0) userConfig = {};
    var config = Object.assign({}, DEFAULT_CONFIG, userConfig);
    var bus = createIntegrationBus();
    var lastResult = null;

    var collect = function () {
      var hardware = collectHardware();
      var apiSupport = collectApiSupport(config.customApis);
      var htmlSupport = collectHtmlSupport(config.customHtmlFeatures);
      var cssSupport = collectCssSupport(config.customCssFeatures);

      var benchmarksPromise = config.enableBenchmarks
        ? runMicroBenchmarks(config.benchmarkOptions)
        : Promise.resolve(undefined);

      return Promise.resolve(benchmarksPromise).then(function (benchmarks) {
        var snapshot = sanitizeSnapshot({
          hardware: hardware,
          apiSupport: apiSupport,
          htmlSupport: htmlSupport,
          cssSupport: cssSupport,
          benchmarks: benchmarks
        });
        bus.emit('snapshot', snapshot);

        var report = evaluateCompatibility(snapshot, config.ruleOverrides);
        var result = { snapshot: snapshot, report: report };
        lastResult = result;
        bus.emit('result', result);
        return result;
      });
    };

    var render = function (mountNode) {
      if (!isBrowser()) return null;
      if (!lastResult) return null;
      return renderWidget(lastResult, { mount: mountNode, theme: config.theme });
    };

    return {
      run: collect,
      render: render,
      on: bus.on,
      off: bus.off
    };
  }

  global.WebProbe = { createProbe: createProbe };
})(typeof window !== 'undefined' ? window : globalThis);
