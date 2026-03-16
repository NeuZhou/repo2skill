/**
 * Skill Testing — Validate generated skills against quality criteria.
 */
import * as fs from "fs";
import * as path from "path";

export interface SkillTestResult {
  passed: number;
  failed: number;
  warnings: number;
  checks: SkillTestCheck[];
}

export interface SkillTestCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

/**
 * Test a generated SKILL.md file for quality and correctness.
 */
export function testSkill(skillMdPath: string): SkillTestResult {
  const checks: SkillTestCheck[] = [];

  // 1. File loads correctly
  if (!fs.existsSync(skillMdPath)) {
    checks.push({ name: "File exists", status: "fail", message: `File not found: ${skillMdPath}` });
    return { passed: 0, failed: 1, warnings: 0, checks };
  }

  const content = fs.readFileSync(skillMdPath, "utf-8");
  checks.push({ name: "File loads", status: "pass", message: "SKILL.md loaded successfully" });

  // 2. Has a title (# heading)
  if (/^#\s+.+/m.test(content)) {
    checks.push({ name: "Has title", status: "pass", message: "Title heading found" });
  } else {
    checks.push({ name: "Has title", status: "fail", message: "Missing # title heading" });
  }

  // 3. Description is clear and actionable
  const descMatch = content.match(/^description:\s*(.+)$/m) || content.match(/^>\s*(.+)$/m);
  if (descMatch) {
    const desc = descMatch[1].trim();
    if (desc.length >= 20 && desc.length <= 300) {
      checks.push({ name: "Description quality", status: "pass", message: `Description is ${desc.length} chars` });
    } else if (desc.length < 20) {
      checks.push({ name: "Description quality", status: "fail", message: `Description too short (${desc.length} chars, min 20)` });
    } else {
      checks.push({ name: "Description quality", status: "warn", message: `Description may be too long (${desc.length} chars)` });
    }
  } else {
    checks.push({ name: "Description quality", status: "fail", message: "No description found" });
  }

  // 4. "When to Use" section exists and matches description
  const whenSection = content.match(/##\s+When to Use[\s\S]*?(?=\n##|\n$)/i);
  if (whenSection) {
    const bullets = whenSection[0].match(/^[-*]\s+.+/gm);
    if (bullets && bullets.length >= 2) {
      checks.push({ name: "When to Use", status: "pass", message: `${bullets.length} scenario(s) listed` });
    } else {
      checks.push({ name: "When to Use", status: "warn", message: "Less than 2 scenarios — consider adding more" });
    }
  } else {
    checks.push({ name: "When to Use", status: "warn", message: "No 'When to Use' section found" });
  }

  // 5. Install command exists and is valid-looking
  const installSection = content.match(/##\s+Install[\s\S]*?(?=\n##|\n$)/i)
    || content.match(/```(?:bash|sh)[\s\S]*?```/);
  if (installSection) {
    const hasInstallCmd = /(?:npm|pip|cargo|go|gem|composer|brew|apt|yarn|pnpm|bun)\s+(?:install|add|get|require)/i.test(installSection[0]);
    if (hasInstallCmd) {
      checks.push({ name: "Install command", status: "pass", message: "Valid install command found" });
    } else if (/```/.test(installSection[0])) {
      checks.push({ name: "Install command", status: "pass", message: "Code block found in install section" });
    } else {
      checks.push({ name: "Install command", status: "warn", message: "Install section found but no recognizable install command" });
    }
  } else {
    checks.push({ name: "Install command", status: "warn", message: "No install section or command found" });
  }

  // 6. Code blocks have valid syntax markers
  const codeBlocks = content.match(/```(\w*)\n[\s\S]*?```/g) || [];
  const validLangs = new Set(["bash", "sh", "shell", "javascript", "js", "typescript", "ts", "python", "py", "rust", "go", "java", "ruby", "php", "json", "yaml", "toml", "markdown", "md", "css", "html", "sql", "c", "cpp", "swift", "kotlin", "scala", "elixir", "haskell", "dart", "zig", "lua", ""]);
  let badBlocks = 0;
  for (const block of codeBlocks) {
    const langMatch = block.match(/```(\w*)/);
    const lang = langMatch ? langMatch[1].toLowerCase() : "";
    if (lang && !validLangs.has(lang)) {
      badBlocks++;
    }
  }
  if (codeBlocks.length > 0 && badBlocks === 0) {
    checks.push({ name: "Code blocks", status: "pass", message: `${codeBlocks.length} code block(s), all valid` });
  } else if (badBlocks > 0) {
    checks.push({ name: "Code blocks", status: "warn", message: `${badBlocks} code block(s) with unrecognized language marker` });
  } else {
    checks.push({ name: "Code blocks", status: "warn", message: "No code blocks found" });
  }

  // 7. Not too short, not too long
  const lines = content.split("\n").length;
  if (lines < 10) {
    checks.push({ name: "Content length", status: "fail", message: `Only ${lines} lines — too sparse` });
  } else if (lines > 500) {
    checks.push({ name: "Content length", status: "warn", message: `${lines} lines — consider trimming for readability` });
  } else {
    checks.push({ name: "Content length", status: "pass", message: `${lines} lines` });
  }

  // 8. Has features or key capabilities section
  if (/##\s+(?:Features|Key Capabilities|What it does)/i.test(content)) {
    checks.push({ name: "Features section", status: "pass", message: "Features section found" });
  } else {
    checks.push({ name: "Features section", status: "warn", message: "No features section — agents benefit from knowing capabilities" });
  }

  // Summarize
  const passed = checks.filter(c => c.status === "pass").length;
  const failed = checks.filter(c => c.status === "fail").length;
  const warnings = checks.filter(c => c.status === "warn").length;

  return { passed, failed, warnings, checks };
}

/**
 * Format test results for console output.
 */
export function formatTestResult(result: SkillTestResult): string {
  const lines: string[] = ["\n🧪 Skill Test Results\n"];

  for (const check of result.checks) {
    const icon = check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "⚠";
    const color = check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⚠️";
    lines.push(`  ${color} ${check.name}: ${check.message}`);
  }

  lines.push("");
  lines.push(`  ${result.passed} passed, ${result.failed} failed, ${result.warnings} warning(s)`);

  if (result.failed === 0 && result.warnings === 0) {
    lines.push("  🎉 All checks passed!");
  } else if (result.failed === 0) {
    lines.push("  ✅ No failures, but some warnings to review.");
  } else {
    lines.push("  ❌ Some checks failed. Review and fix the issues above.");
  }

  return lines.join("\n");
}
