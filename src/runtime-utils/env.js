const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const safeGet = (getter, fallback = undefined) => {
  try {
    const value = getter();
    return value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
};

const coerceNumber = (value, fallback = 0) => {
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
};

const withTimeout = async (promise, timeoutMs) => {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('probe-timeout')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

export { isBrowser, safeGet, coerceNumber, withTimeout };
