import { isBrowser, safeGet, coerceNumber } from '../runtime-utils/env';
import type { HardwareSnapshot } from '../types';

// Collects hardware-adjacent navigator hints (memory, cores, UA, locale, platform).
// 采集与硬件相关的 navigator 信息（内存、核心数、UA、语言、平台）。
const collectHardware = (): HardwareSnapshot => {
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
    userAgent: safeGet(() => (nav.userAgentData ? nav.userAgentData.brands : nav.userAgent), null),
    language: safeGet(() => nav.language || (nav.languages || [])[0], null),
    platform: safeGet(() => nav.platform || nav.userAgentData?.platform, null)
  };
};

export { collectHardware };
