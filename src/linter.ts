/**
 * Skill Linter — validate an existing SKILL.md and score it.
 */

import * as fs from "fs";

export interface LintCheck {
  label: string;
  passed: boolean;
  weight: number;
}

export interface LintResult {
  file: string;
  checks: LintCheck[];
  score: number;
  maxScore: number;
}

/**
 * Lint a SKILL.md file and return a structured result.
 */
export function lintSkillMd(filePath: string): LintResult {
  const content = fs.readFileSync(filePath, "utf-8");
  const checks: LintCheck[] = [];

  // 1. Has description (frontmatter or first paragraph)
  const hasDesc = /^description:\s*.+/m.test(content) || /^# .+\n\n.+/m.test(content);
  checks.push({ label: "Has description", passed: hasDesc, weight: 15 });

  // 2. Has "When to Use" section
  const hasWhenToUse = /^##\s+When to Use/mi.test(content);
  checks.push({ label: 'Has "When to Use"', passed: hasWhenToUse, weight: 12 });

  // 3. Has "When NOT to Use" section
  const hasWhenNotToUse = /^##\s+When NOT to Use/mi.test(content);
  checks.push({ label: 'Has "When NOT to Use"', passed: hasWhenNotToUse, weight: 10 });

  // 4. Has code examples
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const hasExamples = codeBlocks.length > 0;
  checks.push({ label: "Has examples", passed: hasExamples, weight: 15 });

  // 5. Has install command
  const hasInstall = /(?:npm install|pip install|cargo install|go install|brew install|apt install|gem install|composer require|cargo add)/i.test(content)
    || /^###?\s+Install/mi.test(content);
  checks.push({ label: "Has install command", passed: hasInstall, weight: 10 });

  // 6. Has Quick Start section
  const hasQuickStart = /^##\s+Quick Start/mi.test(content);
  checks.push({ label: "Has Quick Start", passed: hasQuickStart, weight: 8 });

  // 7. Has features list
  const hasFeatures = /^##\s+(?:Key )?Features/mi.test(content);
  checks.push({ label: "Has features list", passed: hasFeatures, weight: 8 });

  // 8. Has project info / metadata
  const hasProjectInfo = /^##\s+Project Info/mi.test(content) || /\*\*Language:\*\*/m.test(content);
  checks.push({ label: "Has project info", passed: hasProjectInfo, weight: 7 });

  // 9. Has API reference
  const hasApi = /^##\s+(?:API|Key API)/mi.test(content);
  checks.push({ label: "Has API reference", passed: hasApi, weight: 8 });

  // 10. Has frontmatter
  const hasFrontmatter = /^---\n[\s\S]*?\n---/m.test(content);
  checks.push({ label: "Has frontmatter", passed: hasFrontmatter, weight: 7 });

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);

  return { file: filePath, checks, score, maxScore };
}

/**
 * Format lint result for CLI output.
 */
export function formatLintResult(result: LintResult): string {
  const lines: string[] = [];
  lines.push(`\n🔍 Linting: ${result.file}\n`);
  for (const check of result.checks) {
    const icon = check.passed ? "✓" : "✗";
    const label = check.passed ? check.label : `Missing ${check.label.replace(/^Has /, "").replace(/"/g, "")}`;
    lines.push(`  ${icon} ${label}`);
  }
  lines.push(`\n  Score: ${result.score}/${result.maxScore}`);
  return lines.join("\n");
}
