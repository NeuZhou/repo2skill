/**
 * Skill Linter - validate an existing SKILL.md and score it.
 * v3.4.0: Added line-level diagnostics with severity (error/warning/info).
 */

import * as fs from "fs";

export interface LintCheck {
  label: string;
  passed: boolean;
  weight: number;
}

export type LintSeverity = "error" | "warning" | "info";

export interface LintDiagnostic {
  line: number;
  severity: LintSeverity;
  message: string;
}

export interface LintResult {
  file: string;
  checks: LintCheck[];
  diagnostics: LintDiagnostic[];
  score: number;
  maxScore: number;
}

/**
 * Lint a SKILL.md file and return a structured result.
 */
export function lintSkillMd(filePath: string): LintResult {
  const content = fs.readFileSync(filePath, "utf-8");
  return lintSkillContent(content, filePath);
}

/**
 * Lint raw SKILL.md content (testable without filesystem).
 */
export function lintSkillContent(content: string, filePath = "SKILL.md"): LintResult {
  const lines = content.split("\n");
  const checks: LintCheck[] = [];
  const diagnostics: LintDiagnostic[] = [];

  // 1. Has description (frontmatter or first paragraph)
  const hasDesc = /^description:\s*.+/m.test(content) || /^# .+\n\n.+/m.test(content);
  checks.push({ label: "Has description", passed: hasDesc, weight: 15 });

  // Check description length
  const descMatch = content.match(/^description:\s*(.+)/m);
  if (descMatch && descMatch[1].length < 50) {
    const descLine = lines.findIndex((l) => /^description:\s*/.test(l)) + 1;
    diagnostics.push({
      line: descLine,
      severity: "warning",
      message: `Description too short (${descMatch[1].length} chars, recommend ≥50)`,
    });
  }

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

  // Check for broken code blocks (unclosed ```)
  let openCodeBlock = false;
  let openCodeBlockLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i].trim())) {
      if (!openCodeBlock) {
        openCodeBlock = true;
        openCodeBlockLine = i + 1;
      } else {
        openCodeBlock = false;
      }
    }
  }
  if (openCodeBlock) {
    diagnostics.push({
      line: openCodeBlockLine,
      severity: "error",
      message: "Broken code block (missing closing ```)",
    });
  }

  // 5. Has install command
  const hasInstall =
    /(?:npm install|pip install|cargo install|go install|brew install|apt install|gem install|composer require|cargo add)/i.test(content) ||
    /^###?\s+Install/mi.test(content);
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

  // 11. Check for empty sections
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      const nextContentLine = lines.slice(i + 1).findIndex((l) => l.trim().length > 0);
      if (nextContentLine >= 0) {
        const nextLine = lines[i + 1 + nextContentLine];
        if (/^##\s+/.test(nextLine)) {
          diagnostics.push({
            line: i + 1,
            severity: "warning",
            message: `Empty section: "${lines[i].replace(/^##\s+/, "").trim()}"`,
          });
        }
      }
    }
  }

  // 12. Check for potential stale external links
  const linkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const linkLine = content.slice(0, match.index).split("\n").length;
    const url = match[2];
    // Flag obviously stale patterns (we don't do HTTP checks in sync lint)
    if (/localhost|127\.0\.0\.1|example\.com/.test(url)) {
      diagnostics.push({
        line: linkLine,
        severity: "info",
        message: `Link may be placeholder: ${url}`,
      });
    }
  }

  // 13. Check for very long lines (>200 chars, outside code blocks)
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i].trim())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock && lines[i].length > 200) {
      diagnostics.push({
        line: i + 1,
        severity: "info",
        message: `Line is very long (${lines[i].length} chars), consider wrapping`,
      });
    }
  }

  // 14. Check for duplicate headings
  const headings: Record<string, number> = {};
  for (let i = 0; i < lines.length; i++) {
    const hMatch = lines[i].match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const key = hMatch[1] + " " + hMatch[2].trim().toLowerCase();
      if (headings[key]) {
        diagnostics.push({
          line: i + 1,
          severity: "warning",
          message: `Duplicate heading: "${hMatch[2].trim()}" (also on line ${headings[key]})`,
        });
      } else {
        headings[key] = i + 1;
      }
    }
  }

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);

  return { file: filePath, checks, diagnostics, score, maxScore };
}

/**
 * Format lint result for CLI output.
 */
export function formatLintResult(result: LintResult): string {
  const lines: string[] = [];
  lines.push(`\n🔍 Linting: ${result.file}\n`);

  // Show diagnostics first
  if (result.diagnostics.length > 0) {
    for (const d of result.diagnostics) {
      const icon = d.severity === "error" ? "❌" : d.severity === "warning" ? "⚠️" : "ℹ️";
      lines.push(`  ${icon} Line ${d.line}: ${d.message}`);
    }
    lines.push("");
  }

  for (const check of result.checks) {
    const icon = check.passed ? "✅" : "❌";
    const label = check.passed ? check.label : `Missing ${check.label.replace(/^Has /, "").replace(/"/g, "")}`;
    lines.push(`  ${icon} ${label}`);
  }

  const passed = result.checks.filter((c) => c.passed).length;
  const total = result.checks.length;
  lines.push(`\n  ${passed}/${total} checks passed · Score: ${result.score}/${result.maxScore}`);
  return lines.join("\n");
}
