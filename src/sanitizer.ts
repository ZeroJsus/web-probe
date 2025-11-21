import { coerceNumber } from './runtime-utils/env';
import type { Snapshot } from './types';

const roundValue = (value, precision = 2) => {
  if (value === null || value === undefined) return value;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

// Normalize numeric fields and strip sensitive benchmark details before sharing.
// 规范化数值字段，并在共享前去除可能敏感的基准细节。
const sanitizeSnapshot = (snapshot: Snapshot): Snapshot => {
  const sanitized: Snapshot = { ...snapshot };

  if (sanitized.hardware) {
    sanitized.hardware = {
      ...sanitized.hardware,
      deviceMemory: roundValue(coerceNumber(sanitized.hardware.deviceMemory, null), 1),
      hardwareConcurrency: coerceNumber(sanitized.hardware.hardwareConcurrency, null)
    };
  }

  if (sanitized.benchmarks?.micro) {
    sanitized.benchmarks = sanitized.benchmarks || {};
    sanitized.benchmarks.micro = {
      duration: roundValue(coerceNumber(sanitized.benchmarks.micro.duration, null)),
      accumulator: undefined
    };
  }

  return sanitized;
};

export { sanitizeSnapshot };
