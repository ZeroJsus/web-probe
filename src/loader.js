import { collectHardware } from './collectors/hardware.js';
import { collectApiSupport } from './collectors/api.js';
import { collectHtmlSupport } from './collectors/html.js';
import { collectCssSupport } from './collectors/css.js';
import { runMicroBenchmarks } from './benchmarks/micro.js';
import { sanitizeSnapshot } from './sanitizer.js';
import { evaluateCompatibility } from './compatibility/index.js';
import { renderWidget } from './ui/widget.js';
import { createIntegrationBus } from './integrations/hooks.js';
import { isBrowser } from './runtime-utils/env.js';

const DEFAULT_CONFIG = {
  enableBenchmarks: false,
  customApis: [],
  customHtmlFeatures: [],
  customCssFeatures: [],
  benchmarkOptions: {},
  ruleOverrides: {},
  theme: 'light'
};

// Factory that assembles the full probe pipeline (collect → sanitize → evaluate → render).
// 工厂方法：组装探针全流程（采集 → 清洗 → 评估 → 渲染）。
const createProbe = (userConfig = {}) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const bus = createIntegrationBus();
  let lastResult = null;

  // Run the probe once to collect environment data and compatibility findings.
  // 执行一次探针，采集环境数据并生成兼容性结论。
  const collect = () => {
    const hardware = collectHardware();
    const apiSupport = collectApiSupport(config.customApis);
    const htmlSupport = collectHtmlSupport(config.customHtmlFeatures);
    const css = collectCssSupport(config.customCssFeatures);

    const benchmarksPromise = config.enableBenchmarks
      ? runMicroBenchmarks(config.benchmarkOptions)
      : Promise.resolve(undefined);

    return Promise.resolve(benchmarksPromise).then((benchmarks) => {
      const snapshot = sanitizeSnapshot({
        hardware,
        apiSupport,
        htmlSupport,
        cssSupport: css.support,
        cssSupportDebug: css.debug,
        benchmarks
      });
      bus.emit('snapshot', snapshot);

      const report = evaluateCompatibility(snapshot, config.ruleOverrides);
      const result = { snapshot, report };
      lastResult = result;
      bus.emit('result', result);
      return result;
    });
  };

  // Render the embeddable UI widget with the last collected result.
  // 使用最近的探针结果渲染可嵌入的 UI 组件。
  const render = (mountNode) => {
    if (!isBrowser()) return null;
    if (!lastResult) return null;
    return renderWidget(lastResult, { mount: mountNode, theme: config.theme });
  };

  return {
    run: collect,
    render,
    on: bus.on,
    off: bus.off
  };
};

export { createProbe };
