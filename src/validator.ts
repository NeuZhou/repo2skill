/**
 * Output Validator — validate generated SKILL.md against AgentSkills spec.
 */

import * as fs from "fs";

export interface ValidationCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ValidationResult {
  file: string;
  checks: ValidationCheck[];
  passed: number;
  failed: number;
  total: number;
}

/**
 * Validate a SKILL.md file against the AgentSkills spec.
 */
export function validateSkillMd(filePath: string): ValidationResult {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const checks: ValidationCheck[] = [];

  // 1. Has frontmatter
  const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
  checks.push({
    label: "Has required frontmatter",
    passed: hasFrontmatter,
    detail: hasFrontmatter ? undefined : "SKILL.md should start with --- frontmatter ---",
  });

  // 2. Frontmatter has name field
  const hasName = /^name:\s*.+/m.test(content);
  checks.push({
    label: "Has name field",
    passed: hasName,
    detail: hasName ? undefined : "Frontmatter should include 'name' field",
  });

  // 3. Has description (frontmatter)
  const descMatch = content.match(/^description:\s*(.+)/m);
  const hasDesc = !!descMatch;
  checks.push({
    label: "Has description",
    passed: hasDesc,
    detail: hasDesc ? undefined : "Frontmatter should include 'description' field",
  });

  // 4. Description under 500 chars
  const descLength = descMatch ? descMatch[1].length : 0;
  const descUnder500 = descLength > 0 && descLength <= 500;
  checks.push({
    label: "Description under 500 chars",
    passed: descUnder500,
    detail: descUnder500 ? undefined : descLength === 0 ? "No description found" : `Description is ${descLength} chars (max 500)`,
  });

  // 5. Has "When to Use" section
  const hasWhenToUse = /^##\s+When to Use/mi.test(content);
  checks.push({
    label: 'Has "When to Use"',
    passed: hasWhenToUse,
    detail: hasWhenToUse ? undefined : 'Missing "## When to Use" section',
  });

  // 6. Has "When NOT to Use" section
  const hasWhenNotToUse = /^##\s+When NOT to Use/mi.test(content);
  checks.push({
    label: 'Has "When NOT to Use"',
    passed: hasWhenNotToUse,
    detail: hasWhenNotToUse ? undefined : 'Missing "## When NOT to Use" section',
  });

  // 7. Has Quick Start section
  const hasQuickStart = /^##\s+Quick Start/mi.test(content);
  checks.push({
    label: "Has Quick Start",
    passed: hasQuickStart,
    detail: hasQuickStart ? undefined : 'Missing "## Quick Start" section',
  });

  // 8. Has code examples
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  const hasExamples = codeBlocks.length > 0;
  checks.push({
    label: "Has code examples",
    passed: hasExamples,
    detail: hasExamples ? `${codeBlocks.length} code block(s) found` : "No code examples found",
  });

  // 9. Has install instructions
  const hasInstall = /^###?\s+Install/mi.test(content) ||
    /(?:npm install|pip install|cargo install|go install|gem install|composer require)/i.test(content);
  checks.push({
    label: "Has install instructions",
    passed: hasInstall,
    detail: hasInstall ? undefined : "No install section or install commands found",
  });

  // 10. Has source_repo in frontmatter
  const hasSourceRepo = /^source_repo:\s*.+/m.test(content);
  checks.push({
    label: "Has source_repo",
    passed: hasSourceRepo,
    detail: hasSourceRepo ? undefined : "Consider adding 'source_repo' to frontmatter for upgrade support",
  });

  // 11. Has generated_at timestamp
  const hasGeneratedAt = /^generated_at:\s*.+/m.test(content);
  checks.push({
    label: "Has generated_at",
    passed: hasGeneratedAt,
    detail: hasGeneratedAt ? undefined : "Consider adding 'generated_at' timestamp",
  });

  // 12. File not too large (< 50KB)
  const fileSize = Buffer.byteLength(content, "utf-8");
  const sizeOk = fileSize < 50 * 1024;
  checks.push({
    label: "File size under 50KB",
    passed: sizeOk,
    detail: sizeOk ? undefined : `File is ${Math.round(fileSize / 1024)}KB (recommended < 50KB)`,
  });

  // 13. No unclosed code blocks
  let inBlock = false;
  for (const line of content.split("\n")) {
    if (/^```/.test(line.trim())) inBlock = !inBlock;
  }
  checks.push({
    label: "No unclosed code blocks",
    passed: !inBlock,
    detail: inBlock ? "Found unclosed code block (missing closing ```)" : undefined,
  });

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;

  return { file: filePath, checks, passed, failed, total: checks.length };
}

/**
 * Format validation result for CLI output.
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  lines.push(`\n🔍 Validating: ${result.file}\n`);

  for (const check of result.checks) {
    const icon = check.passed ? "✓" : "✗";
    lines.push(`  ${icon} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
  }

  lines.push(`\n  Result: ${result.passed}/${result.total} checks passed`);
  if (result.failed > 0) {
    lines.push(`  ⚠ ${result.failed} issue(s) found`);
  } else {
    lines.push(`  ✅ All checks passed!`);
  }

  return lines.join("\n");
}
