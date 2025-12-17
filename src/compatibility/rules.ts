import type { Snapshot, Severity } from '../types';

interface Rule {
  id: string;
  severity: Severity;
  message: {
    en: string;
    zh: string;
  };
  check: (snapshot: Snapshot) => boolean;
}

const RULE_VERSION = '1.2.0';

const rules: Rule[] = [
  {
    id: 'missing-fetch',
    severity: 'error',
    message: {
      en: 'Fetch API unavailable; network calls may fail.',
      zh: '缺少 Fetch API，网络请求可能失败。'
    },
    check: (snapshot) => snapshot.apiSupport && snapshot.apiSupport.fetch === false
  },
  {
    id: 'low-memory',
    severity: 'warn',
    message: {
      en: 'Low reported device memory; consider lightweight assets.',
      zh: '设备可用内存较低，建议使用轻量资源。'
    },
    check: (snapshot) => snapshot.hardware?.deviceMemory !== null && snapshot.hardware.deviceMemory < 1.5
  },
  {
    id: 'no-service-worker',
    severity: 'info',
    message: {
      en: 'Service Worker unavailable; offline cache will be disabled.',
      zh: '不支持 Service Worker，离线缓存无法使用。'
    },
    check: (snapshot) => snapshot.apiSupport && snapshot.apiSupport.ServiceWorker === false
  },
  {
    id: 'missing-html-template',
    severity: 'warn',
    message: {
      en: 'HTML template element is missing; client-side rendering may break.',
      zh: '缺少 HTML template 元素，前端模板渲染可能异常。'
    },
    check: (snapshot) => snapshot.htmlSupport && snapshot.htmlSupport.template === false
  },
  {
    id: 'missing-aspect-ratio',
    severity: 'warn',
    message: {
      en: 'CSS aspect-ratio not supported; responsive components may render incorrectly.',
      zh: '不支持 CSS aspect-ratio，依赖比例的响应式组件可能渲染异常。'
    },
    check: (snapshot) => snapshot.cssSupport && snapshot.cssSupport['aspect-ratio'] === false
  },
  {
    id: 'missing-css-grid',
    severity: 'warn',
    message: {
      en: 'CSS Grid not supported; layouts may fall back.',
      zh: '不支持 CSS Grid，页面布局可能退化。'
    },
    check: (snapshot) => snapshot.cssSupport && snapshot.cssSupport['css-grid'] === false
  }
];

export { rules, RULE_VERSION };
