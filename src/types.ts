export type Detector = () => unknown;

export interface ApiFeature {
  name: string;
  detector?: Detector;
}

export interface HtmlFeature {
  name: string;
  detector?: Detector;
}

export interface CssFeature {
  name: string;
  property?: string;
  value?: string;
}

export interface BenchmarkOptions {
  iterations?: number;
  timeoutMs?: number;
}

export interface HardwareSnapshot {
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  userAgent: unknown;
  language: string | null;
  platform: string | null;
}

export interface BenchmarksSnapshot {
  micro?: {
    duration: number | null;
    accumulator?: number | null;
  } | null;
}

export interface Snapshot {
  hardware: HardwareSnapshot;
  apiSupport: Record<string, boolean>;
  htmlSupport: Record<string, boolean>;
  cssSupport: Record<string, boolean>;
  benchmarks?: BenchmarksSnapshot | null;
}

export type Severity = 'error' | 'warn' | 'info';

export interface CompatibilityFinding {
  id: string;
  severity: Severity;
  triggered: boolean;
  message: {
    en: string;
    zh: string;
  };
}

export interface CompatibilityReport {
  findings: CompatibilityFinding[];
  ruleVersion: string;
}

export interface ProbeResult {
  snapshot: Snapshot;
  report: CompatibilityReport;
}

export interface ProbeConfig {
  enableBenchmarks?: boolean;
  customApis?: Array<string | ApiFeature>;
  customHtmlFeatures?: Array<string | HtmlFeature>;
  customCssFeatures?: Array<string | CssFeature>;
  benchmarkOptions?: BenchmarkOptions;
  ruleOverrides?: Record<string, boolean>;
  theme?: 'light' | 'dark' | string;
}

export interface RenderOptions {
  mount?: Element | string | null;
  theme?: 'light' | 'dark' | string;
}

export type IntegrationHandler<TPayload> = (payload: TPayload) => void;
