import { collectHardware } from './collectors/hardware';
import { collectApiSupport } from './collectors/api';
import { collectHtmlSupport } from './collectors/html';
import { collectCssSupport } from './collectors/css';
import { runMicroBenchmarks } from './benchmarks/micro';
import { sanitizeSnapshot } from './sanitizer';
import { evaluateCompatibility } from './compatibility';
import { renderWidget } from './ui/widget';
import { createIntegrationBus } from './integrations/hooks';
import { isBrowser } from './runtime-utils/env';
import type { ProbeConfig, ProbeResult, RenderOptions } from './types';

const DEFAULT_CONFIG: ProbeConfig = {
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
const createProbe = (userConfig: ProbeConfig = {}) => {
  const config: ProbeConfig = { ...DEFAULT_CONFIG, ...userConfig };
  const bus = createIntegrationBus();
  let lastResult: ProbeResult | null = null;

  // Run the probe once to collect environment data and compatibility findings.
  // 执行一次探针，采集环境数据并生成兼容性结论。
  const collect = (): Promise<ProbeResult> => {
    const hardware = collectHardware();
    const apiSupport = collectApiSupport(config.customApis);
    const htmlSupport = collectHtmlSupport(config.customHtmlFeatures);
    const cssSupport = collectCssSupport(config.customCssFeatures);

    const benchmarksPromise = config.enableBenchmarks
      ? runMicroBenchmarks(config.benchmarkOptions)
      : Promise.resolve(undefined);

    return Promise.resolve(benchmarksPromise).then((benchmarks) => {
      const snapshot = sanitizeSnapshot({
        hardware,
        apiSupport,
        htmlSupport,
        cssSupport,
        benchmarks: benchmarks ? { micro: benchmarks } : undefined
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
  const render = (mountNode: RenderOptions['mount']) => {
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
