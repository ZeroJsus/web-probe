# Web Probe

Lightweight, embeddable diagnostics that reveal browser hardware hints, API availability, and compatibility findings. Designed to be dropped into host pages for quick triage of H5 issues.

## Quick start

```js
import { createProbe } from './src/index.js';

const probe = createProbe({
  enableBenchmarks: true,
  customApis: ['Notification'],
  customHtmlFeatures: ['dialog'],
  customCssFeatures: [{ name: 'accent-color', property: 'accent-color' }],
  theme: 'light'
});

const result = await probe.run();
probe.render('#probe-panel');
```

Extend detection with custom feature checks:

```js
const probe = createProbe({
  customApis: ['Notification', () => Boolean(window.webkitNotifications)],
  customHtmlFeatures: [
    { name: 'portal', detector: () => 'HTMLPortalElement' in window }
  ],
  customCssFeatures: [
    { name: 'has-selector', property: 'selector(:has(*))' }
  ]
});
```

### Legacy-friendly bundle

Run `npm run build` to emit `dist/probe.iife.js`, which exposes `window.WebProbe.createProbe` for browsers without module support:

```html
<script src="./dist/probe.iife.js"></script>
<script>
  const probe = window.WebProbe.createProbe({ enableBenchmarks: true });
  probe.run().then(() => probe.render('#probe-panel'));
</script>
```

### Development server with live reload

Use `npm run dev` to start a local server with Rollup watch + live reload so you can see probe changes immediately while adding new detectors:

```bash
npm install
npm run dev
```

The dev server serves `dist/index.html` at `http://localhost:4173` and rebuilds the bundle when source files change.

## Features
- Hardware, HTML/CSS, and API capability detection with safe fallbacks
- Optional micro-benchmark to gauge runtime budgets
- Privacy-aware sanitization (coarsened numbers, no unique IDs)
- Compatibility engine with bilingual messages and rule overrides
- Embeddable widget plus hook-based integrations for logging or analytics

## Module map
- `src/loader.js`: bootstrap and orchestrates collection + reporting
- `src/collectors/`: capability collectors (hardware, HTML, CSS, API surface)
- `src/benchmarks/`: opt-in micro benchmarks
- `src/sanitizer.js`: normalization and redaction
- `src/compatibility/`: rules engine and definitions
- `src/ui/widget.js`: minimal embeddable summary UI
- `src/integrations/hooks.js`: subscription bus for host callbacks
- `src/runtime-utils/env.js`: environment guards and helpers
