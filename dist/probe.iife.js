(function (global) {
  'use strict';

  // Helpers -------------------------------------------------------------
  function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  function safeGet(getter, fallback) {
    try {
      var value = getter();
      return value === undefined ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function coerceNumber(value, fallback) {
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

  function collectApiSupport(customApis) {
    if (customApis === void 0) customApis = [];
    if (!isBrowser()) return {};

    var seen = {};
    var candidates = [];
    DEFAULT_APIS.concat(customApis || []).forEach(function (name) {
      if (!seen[name]) {
        seen[name] = true;
        candidates.push(name);
      }
    });

    var support = {};
    candidates.forEach(function (apiName) {
      support[apiName] = Boolean(safeGet(function () { return global[apiName]; }, false));
    });

    support['ServiceWorker'] = Boolean(
      safeGet(function () { return navigator.serviceWorker && navigator.serviceWorker.register; }, false)
    );

    support['Permissions'] = Boolean(safeGet(function () { return navigator.permissions; }, false));

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
    var sanitized = {};
    for (var key in snapshot) {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        sanitized[key] = snapshot[key];
      }
    }

    if (sanitized.hardware) {
      sanitized.hardware = {
        deviceMemory: roundValue(coerceNumber(sanitized.hardware.deviceMemory, null), 1),
        hardwareConcurrency: coerceNumber(sanitized.hardware.hardwareConcurrency, null),
        userAgent: sanitized.hardware.userAgent,
        language: sanitized.hardware.language,
        platform: sanitized.hardware.platform
      };
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
  var RULE_VERSION = '1.0.0';
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
      check: function (snapshot) {
        return snapshot.hardware && snapshot.hardware.deviceMemory !== null && snapshot.hardware.deviceMemory < 1.5;
      }
    },
    {
      id: 'no-service-worker',
      severity: 'info',
      message: {
        en: 'Service Worker unavailable; offline cache will be disabled.',
        zh: '不支持 Service Worker，离线缓存无法使用。'
      },
      check: function (snapshot) { return snapshot.apiSupport && snapshot.apiSupport.ServiceWorker === false; }
    }
  ];

  function evaluateCompatibility(snapshot, overrides) {
    if (overrides === void 0) overrides = {};
    var findings = [];

    for (var i = 0; i < rules.length; i += 1) {
      var rule = rules[i];
      if (overrides[rule.id] === false) continue;
      var triggered = Boolean(rule.check(snapshot));
      if (triggered) {
        findings.push({
          id: rule.id,
          severity: rule.severity,
          triggered: true,
          message: rule.message
        });
      }
    }

    return { findings: findings, ruleVersion: RULE_VERSION };
  }

  // Integrations -------------------------------------------------------
  function createIntegrationBus() {
    var listeners = new Map();

    var on = function (event, handler) {
      var existing = listeners.get(event) || [];
      listeners.set(event, existing.concat([handler]));
      return function () { off(event, handler); };
    };

    var off = function (event, handler) {
      var existing = listeners.get(event) || [];
      var next = [];
      for (var i = 0; i < existing.length; i += 1) {
        if (existing[i] !== handler) next.push(existing[i]);
      }
      listeners.set(event, next);
    };

    var emit = function (event, payload) {
      var handlers = listeners.get(event) || [];
      handlers.forEach(function (fn) { fn(payload); });
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
    var apiLines = Object.keys(apiSupport).slice(0, 6).map(function (key) {
      return key + ': ' + apiSupport[key];
    });
    apiBlock.appendChild(buildList(apiLines));
    container.appendChild(apiBlock);

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

      var benchmarksPromise = config.enableBenchmarks
        ? runMicroBenchmarks(config.benchmarkOptions)
        : Promise.resolve(undefined);

      return Promise.resolve(benchmarksPromise).then(function (benchmarks) {
        var snapshot = sanitizeSnapshot({ hardware: hardware, apiSupport: apiSupport, benchmarks: benchmarks });
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
})(typeof window !== 'undefined' ? window : this);
