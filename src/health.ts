/**
 * Skill Health Check - evaluate SKILL.md quality with detailed scoring.
 */

import * as fs from "fs";

export interface HealthCheck {
  name: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
  points: number;
  maxPoints: number;
}

export interface HealthResult {
  score: number;
  maxScore: number;
  checks: HealthCheck[];
  grade: "A" | "B" | "C" | "D" | "F";
}

/**
 * Run a comprehensive health check on a SKILL.md file.
 */
export function checkSkillHealth(filePath: string): HealthResult {
  const content = fs.readFileSync(filePath, "utf-8");
  return checkSkillHealthContent(content);
}

/**
 * Run health check on SKILL.md content string.
 */
export function checkSkillHealthContent(content: string): HealthResult {
  const checks: HealthCheck[] = [];

  // 1. Title present and descriptive
  const titleMatch = content.match(/^#\s+(.+)/m);
  const titleText = titleMatch?.[1]?.trim() || "";
  checks.push({
    name: "Title present and descriptive",
    passed: !!titleText && titleText.length > 3,
    severity: "error",
    message: titleText ? (titleText.length > 3 ? "Title is present and descriptive" : "Title is too short") : "No title found",
    points: titleText && titleText.length > 3 ? 15 : 0,
    maxPoints: 15,
  });

  // 2. Description length
  const descMatch = content.match(/^#\s+.+\n+([\s\S]*?)(?=\n##\s|\n$|$)/);
  const desc = descMatch?.[1]?.trim() || "";
  checks.push({
    name: "Description > 50 chars",
    passed: desc.length > 50,
    severity: desc.length > 20 ? "warning" : "error",
    message: desc.length > 50 ? `Description is ${desc.length} chars` : `Description is only ${desc.length} chars (recommend > 50)`,
    points: desc.length > 50 ? 15 : desc.length > 20 ? 8 : 0,
    maxPoints: 15,
  });

  // 3. "When NOT to use" section
  const hasWhenNot = /##\s*(When NOT to use|Limitations|Not for)/im.test(content);
  checks.push({
    name: '"When NOT to use" section',
    passed: hasWhenNot,
    severity: "warning",
    message: hasWhenNot ? '"When NOT to use" section present' : 'No "When NOT to use" section found',
    points: hasWhenNot ? 10 : 0,
    maxPoints: 10,
  });

  // 4. Install instructions
  const hasInstall = /##\s*(Install|Setup|Getting Started|Quick Start)/im.test(content) ||
    /```[\s\S]*?(npm|pip|brew|apt|cargo|go get|yarn|pnpm)/m.test(content);
  checks.push({
    name: "Install instructions present",
    passed: hasInstall,
    severity: "warning",
    message: hasInstall ? "Install instructions found" : "No install instructions detected",
    points: hasInstall ? 15 : 0,
    maxPoints: 15,
  });

  // 5. Examples section with code blocks
  const hasExamples = /##\s*(Example|Usage)/im.test(content);
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  const examplesDetailed = codeBlocks >= 3;
  checks.push({
    name: "Examples present",
    passed: hasExamples,
    severity: "warning",
    message: hasExamples
      ? (examplesDetailed ? `Examples present with ${Math.floor(codeBlocks)} code blocks` : "Examples present but could be more detailed")
      : "No examples section found",
    points: hasExamples ? (examplesDetailed ? 15 : 8) : 0,
    maxPoints: 15,
  });

  // 6. References section
  const hasReferences = /##\s*(Reference|API|Commands)/im.test(content);
  checks.push({
    name: "References section present",
    passed: hasReferences,
    severity: "info",
    message: hasReferences ? "References section present" : "No references section found",
    points: hasReferences ? 10 : 0,
    maxPoints: 10,
  });

  // 7. Frontmatter present
  const hasFrontmatter = content.startsWith("---\n");
  checks.push({
    name: "Frontmatter metadata",
    passed: hasFrontmatter,
    severity: "info",
    message: hasFrontmatter ? "Frontmatter present" : "No frontmatter metadata",
    points: hasFrontmatter ? 10 : 0,
    maxPoints: 10,
  });

  // 8. Reasonable length
  const wordCount = content.split(/\s+/).length;
  const goodLength = wordCount >= 100 && wordCount <= 5000;
  checks.push({
    name: "Reasonable length",
    passed: goodLength,
    severity: wordCount < 50 ? "error" : "info",
    message: `${wordCount} words (recommended: 100-5000)`,
    points: goodLength ? 10 : wordCount >= 50 ? 5 : 0,
    maxPoints: 10,
  });

  const score = checks.reduce((sum, c) => sum + c.points, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  const pct = Math.round((score / maxScore) * 100);

  let grade: HealthResult["grade"];
  if (pct >= 90) grade = "A";
  else if (pct >= 75) grade = "B";
  else if (pct >= 60) grade = "C";
  else if (pct >= 40) grade = "D";
  else grade = "F";

  return { score: pct, maxScore: 100, checks, grade };
}

/**
 * Format health check result for CLI output.
 */
export function formatHealthResult(result: HealthResult): string {
  const lines: string[] = [];
  lines.push("🏥 Skill Health Check");
  lines.push("");

  for (const check of result.checks) {
    const icon = check.passed ? "✅" : (check.severity === "error" ? "❌" : "⚠️");
    lines.push(`${icon} ${check.message}`);
  }

  lines.push("");
  lines.push(`Score: ${result.score}/100 (Grade: ${result.grade})`);
  return lines.join("\n");
}
