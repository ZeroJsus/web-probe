const RULE_VERSION = '1.0.0';

const rules = [
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
  }
];

export { rules, RULE_VERSION };
