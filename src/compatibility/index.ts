import { rules, RULE_VERSION } from './rules';
import type { Snapshot, CompatibilityReport } from '../types';

// Applies rule set to the sanitized snapshot and returns triggered findings.
// 将规则集合应用于清洗后的快照，返回被触发的兼容性结论。
const evaluateCompatibility = (
  snapshot: Snapshot,
  overrides: Record<string, boolean> = {}
): CompatibilityReport => {
  const findings = rules
    .filter((rule) => overrides[rule.id] !== false)
    .map((rule) => ({
      id: rule.id,
      severity: rule.severity,
      triggered: Boolean(rule.check(snapshot)),
      message: rule.message
    }))
    .filter((finding) => finding.triggered);

  return { findings, ruleVersion: RULE_VERSION };
};

export { evaluateCompatibility };
