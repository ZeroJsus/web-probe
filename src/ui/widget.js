import { isBrowser, safeGet } from '../runtime-utils/env.js';

const buildList = (items) => {
  const list = document.createElement('ul');
  list.style.margin = '0';
  list.style.paddingLeft = '16px';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    li.style.fontSize = '12px';
    list.appendChild(li);
  });
  return list;
};

const resolveMount = (mount) => {
  if (!mount) return null;
  if (typeof mount === 'string') return document.querySelector(mount);
  return mount;
};

// Render a self-contained summary widget for quick inspection inside host pages.
// 渲染可嵌入的摘要组件，便于在宿主页面内快速查看。
const renderWidget = (result, options = {}) => {
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

  const hardware = result.snapshot?.hardware || {};
  const apiSupport = result.snapshot?.apiSupport || {};

  const hardwareBlock = document.createElement('div');
  hardwareBlock.style.marginBottom = '8px';
  const hardwareTitle = document.createElement('strong');
  hardwareTitle.textContent = 'Hardware / 硬件';
  hardwareBlock.appendChild(hardwareTitle);
  hardwareBlock.appendChild(
    buildList([
      `Memory: ${safeGet(() => hardware.deviceMemory, 'n/a')} GB`,
      `Cores: ${safeGet(() => hardware.hardwareConcurrency, 'n/a')}`,
      `Platform: ${safeGet(() => hardware.platform, 'n/a')}`,
      `Language: ${safeGet(() => hardware.language, 'n/a')}`
    ])
  );
  container.appendChild(hardwareBlock);

  const apiBlock = document.createElement('div');
  apiBlock.style.marginBottom = '8px';
  const apiTitle = document.createElement('strong');
  apiTitle.textContent = 'APIs';
  apiBlock.appendChild(apiTitle);
  const apiLines = Object.keys(apiSupport).slice(0, 6).map((key) => `${key}: ${apiSupport[key]}`);
  apiBlock.appendChild(buildList(apiLines));
  container.appendChild(apiBlock);

  const findings = result.report?.findings || [];
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
    findingsBlock.appendChild(
      buildList(
        findings.map(
          (finding) => `${finding.severity.toUpperCase()}: ${finding.message.en} / ${finding.message.zh}`
        )
      )
    );
  }
  container.appendChild(findingsBlock);

  mountNode.appendChild(container);
  return container;
};

export { renderWidget };
