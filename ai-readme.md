# Web Probe Architecture Overview / 网页探针架构概览

This document is bilingual (English / 中文) to ease collaboration.

## Goals / 目标
- Provide embeddable diagnostics revealing browser capabilities (hardware, memory, HTML/CSS/JS APIs) for host apps. / 为宿主应用提供可嵌入的诊断，展示浏览器硬件、内存及 HTML/CSS/JS API 能力。
- Surface compatibility signals with actionable fallbacks to guide developers. / 提供可操作的兼容性提示与回退建议，帮助开发者定位问题。
- Stay lightweight, framework-agnostic, and safe in untrusted contexts. / 轻量、框架无关，并可在不可信环境中安全运行。

## High-Level Architecture / 高层架构
- **Loader & Bootstrap / 加载与启动**: Minimal entry that reads config, mounts an isolated container, and lazy-loads heavy collectors. / 精简入口，读取配置、挂载隔离容器，并懒加载重型采集器。
- **Capability Collectors / 能力采集器**: Focused modules capturing runtime profile (hardware, UA hints, API availability) and permission-gated signals. / 聚焦模块，采集运行时画像（硬件、UA hints、API 可用性）及需权限的信号。
- **Measurement & Benchmarking / 性能测量**: Optional micro-benchmarks for budget estimation (layout, canvas, JS ops) with throttling to avoid fingerprinting. / 可选微基准（布局、画布、JS 操作）评估性能预算，并做节流以降低指纹风险。
- **Normalization & Privacy Guardrails / 规范化与隐私护栏**: Sanitizes data (rounding, redaction) to remove PII and cap precision before exposure. / 在对外提供前进行取整、脱敏，移除 PII、限制精度。
- **Compatibility Engine / 兼容性引擎**: Compares capabilities with ruleset to emit severity-tagged findings and fallback suggestions. / 将能力与规则集对比，输出按严重级别分类的结论及回退方案。
- **UI & Reporting / 界面与报告**: Embeddable widget + headless exporter for JSON/clipboard/download; supports minimal theming. / 可嵌入组件与无界面导出（JSON/剪贴板/下载），支持基础主题定制。
- **Integration Hooks / 集成钩子**: Subscriptions, event emitters, and overrides so hosts can log or enrich findings. / 订阅、事件与覆写入口，便于宿主记录或扩展结论。
- **Error Handling & Resilience / 错误与韧性**: Guarded feature detection, timeouts, and graceful degradation when APIs are blocked. / 受保护的特性检测、超时控制，在 API 受限时优雅降级。
- **Build & Distribution / 构建与发布**: ESM/CJS/UMD bundles, tree-shaking, size budgets, and a demo playground. / 提供 ESM/CJS/UMD 产物、摇树优化、体积预算及演示页面。

## Data Flow / 数据流
1. **Initialize / 初始化**: Loader consumes config and registers collectors. / 入口读取配置并注册采集器。
2. **Collect / 采集**: Collectors and optional benchmarks run (often in parallel) to produce sanitized snapshots. / 采集器与可选基准（多并行）产出已脱敏的快照。
3. **Analyze / 分析**: Compatibility Engine evaluates snapshots against rules. / 引擎将快照与规则集比对。
4. **Publish / 发布**: UI renders summaries; hooks emit structured payloads for hosts. / UI 展示摘要，钩子输出结构化数据。
5. **Persist (optional) / 可选持久化**: Host stores or forwards summaries; probe stays stateless. / 宿主可存储/转发摘要，探针默认无状态。

## Module Responsibilities / 模块职责
- `loader` — bootstrap, config parsing, host-safe mounting, lazy collector loading. / 启动、配置解析、安全挂载、懒加载采集器。
- `collectors/*` — domain-specific capability detection with consistent schema and privacy-aware formatting. / 各领域能力检测，统一结构与隐私格式。
- `benchmarks/*` — opt-in micro-benchmarks with guardrails and pluggable cases. / 可选微基准，含护栏与可插拔用例。
- `sanitizer` — normalizes and redacts data before exposure. / 对外前的规范化与脱敏。
- `compatibility` — rules engine, severity tagging, fallback suggestions. / 规则引擎、严重度标注、回退建议。
- `ui` — embeddable widget plus headless exporters. / 可嵌入组件与无界面导出。
- `integrations` — subscriptions, event emitters, logging hooks, host overrides. / 订阅、事件、日志钩子与宿主覆写。
- `runtime-utils` — safe feature checks, permission prompts, timeout helpers, legacy fallbacks. / 安全特性检测、权限提示、超时助手与旧版兼容。

## Extensibility & Maintenance / 可扩展性与维护
- Modular collectors and rules auto-register when added under `collectors/` or `compatibility/rules/`. / 在 `collectors/` 与 `compatibility/rules/` 下新增模块即可自动注册。
- Rule definitions are versioned; snapshots embed the rule version for debugging. / 规则有版本，快照包含规则版本以便调试。
- Automated tests should cover collectors (mocked APIs), rule evaluation, and UI rendering of findings. / 自动化测试需覆盖采集器（模拟 API）、规则评估与 UI 呈现。

## Security & Privacy / 安全与隐私
- Default to minimal data retention; no network calls unless host explicitly enables. / 默认最小化数据留存，除非宿主开启，否则不发起网络请求。
- Reduce fingerprinting risk via coarsened metrics and avoidance of unique identifiers. / 通过粗化指标、避免唯一标识降低指纹风险。
- Sandboxed error boundaries prevent host-page failures from breaking the probe. / 沙盒化的错误边界避免宿主页面故障影响探针。
