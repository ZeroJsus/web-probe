const isBrowser = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

const safeGet = <T>(getter: () => T, fallback?: T): T | undefined => {
  try {
    const value = getter();
    return value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
};

const coerceNumber = (value: unknown, fallback: number | null = 0): number | null => {
  if (value === null || value === undefined) return fallback;
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : fallback;
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs?: number): Promise<T> => {
  if (!timeoutMs || timeoutMs <= 0) return promise;

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('probe-timeout')), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }) as Promise<T>;
};

export { isBrowser, safeGet, coerceNumber, withTimeout };
