import { isBrowser, safeGet, withTimeout } from '../runtime-utils/env';
import type { BenchmarkOptions } from '../types';

// Performs a lightweight math loop to approximate CPU responsiveness.
// 执行轻量级数学循环，用于近似 CPU 响应能力。
const runMicroBenchmarks = (
  { iterations = 5000, timeoutMs = 25 }: BenchmarkOptions = {}
): Promise<{ duration: number; accumulator: number }> | null => {
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
    return { duration: end - start, accumulator: acc };
  };

  return withTimeout(Promise.resolve(runOps()), timeoutMs);
};

export { runMicroBenchmarks };
