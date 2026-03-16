/**
 * Batch Quality Report — generate HTML report for all skills in a directory.
 */

import * as fs from "fs";
import * as path from "path";
import { checkSkillHealthContent, HealthResult } from "./health";

export interface QualityReportEntry {
  name: string;
  score: number;
  grade: string;
  issues: string[];
  strengths: string[];
}

export interface QualityReport {
  entries: QualityReportEntry[];
  averageScore: number;
  commonIssues: { issue: string; count: number }[];
  totalSkills: number;
  gradeDistribution: Record<string, number>;
}

/**
 * Build a quality report for all skills in a directory.
 */
export function buildQualityReport(skillsDir: string): QualityReport {
  const entries: QualityReportEntry[] = [];
  const issueCounter: Record<string, number> = {};
  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  if (!fs.existsSync(skillsDir)) {
    return { entries, averageScore: 0, commonIssues: [], totalSkills: 0, gradeDistribution };
  }

  const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  for (const dir of dirs) {
    const skillMdPath = path.join(skillsDir, dir.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, "utf-8");
    const health = checkSkillHealthContent(content);

    const issues = health.checks.filter(c => !c.passed).map(c => c.message);
    const strengths = health.checks.filter(c => c.passed).map(c => c.message);

    for (const issue of issues) {
      issueCounter[issue] = (issueCounter[issue] || 0) + 1;
    }

    gradeDistribution[health.grade] = (gradeDistribution[health.grade] || 0) + 1;

    entries.push({
      name: dir.name,
      score: health.score,
      grade: health.grade,
      issues,
      strengths,
    });
  }

  entries.sort((a, b) => b.score - a.score);

  const avgScore = entries.length > 0
    ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length)
    : 0;

  const commonIssues = Object.entries(issueCounter)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);

  return {
    entries,
    averageScore: avgScore,
    commonIssues,
    totalSkills: entries.length,
    gradeDistribution,
  };
}

/**
 * Generate an HTML quality report.
 */
export function generateQualityReportHtml(report: QualityReport): string {
  const gradeColor = (grade: string) => {
    const colors: Record<string, string> = { A: "#34a853", B: "#4285f4", C: "#fbbc04", D: "#ff6d01", F: "#ea4335" };
    return colors[grade] || "#999";
  };

  const rows = report.entries.map(e => `
    <tr>
      <td>${esc(e.name)}</td>
      <td style="color:${gradeColor(e.grade)};font-weight:bold">${e.grade}</td>
      <td>
        <div class="bar-bg"><div class="bar" style="width:${e.score}%;background:${gradeColor(e.grade)}"></div></div>
        ${e.score}/100
      </td>
      <td>${e.issues.length > 0 ? e.issues.map(i => `<span class="issue">⚠️ ${esc(i)}</span>`).join("<br>") : '<span class="ok">✅ All checks pass</span>'}</td>
    </tr>`).join("\n");

  const commonRows = report.commonIssues.slice(0, 10).map(ci =>
    `<tr><td>${esc(ci.issue)}</td><td>${ci.count} / ${report.totalSkills}</td></tr>`
  ).join("\n");

  const gradeBars = Object.entries(report.gradeDistribution)
    .map(([g, c]) => `<div class="grade-bar"><span class="grade-label" style="color:${gradeColor(g)}">${g}</span><div class="bar-bg small"><div class="bar" style="width:${report.totalSkills ? (c / report.totalSkills * 100) : 0}%;background:${gradeColor(g)}"></div></div><span>${c}</span></div>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skill Quality Report — repo2skill</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #333; padding: 2em; max-width: 1200px; margin: 0 auto; }
h1 { color: #1a73e8; margin-bottom: 0.3em; }
h2 { color: #555; margin: 1.5em 0 0.5em; }
.summary { display: flex; gap: 2em; margin: 1em 0; flex-wrap: wrap; }
.card { background: white; border-radius: 8px; padding: 1.2em; box-shadow: 0 1px 4px rgba(0,0,0,0.1); min-width: 160px; }
.card .label { font-size: 0.85em; color: #666; }
.card .value { font-size: 2em; font-weight: bold; color: #1a73e8; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); margin-bottom: 1.5em; }
th, td { padding: 0.7em 1em; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f1f3f4; font-weight: 600; }
.bar-bg { display: inline-block; width: 100px; height: 10px; background: #e8eaed; border-radius: 5px; vertical-align: middle; margin-right: 0.5em; }
.bar-bg.small { width: 80px; }
.bar { height: 100%; border-radius: 5px; }
.issue { color: #d93025; font-size: 0.85em; }
.ok { color: #34a853; font-size: 0.85em; }
.grade-bar { display: flex; align-items: center; gap: 0.5em; margin: 0.3em 0; }
.grade-label { font-weight: bold; width: 1.5em; }
.timestamp { color: #999; font-size: 0.8em; margin-top: 2em; }
</style>
</head>
<body>
<h1>📊 Skill Quality Report</h1>
<p style="color:#666">Generated by repo2skill</p>

<div class="summary">
  <div class="card"><div class="label">Total Skills</div><div class="value">${report.totalSkills}</div></div>
  <div class="card"><div class="label">Average Score</div><div class="value">${report.averageScore}</div></div>
  <div class="card"><div class="label">Common Issues</div><div class="value">${report.commonIssues.length}</div></div>
</div>

<h2>Grade Distribution</h2>
<div class="card">${gradeBars}</div>

<h2>Skills</h2>
<table>
<thead><tr><th>Skill</th><th>Grade</th><th>Score</th><th>Issues</th></tr></thead>
<tbody>${rows}</tbody>
</table>

${report.commonIssues.length > 0 ? `
<h2>Common Issues</h2>
<table>
<thead><tr><th>Issue</th><th>Affected</th></tr></thead>
<tbody>${commonRows}</tbody>
</table>` : ""}

<div class="timestamp">Generated: ${new Date().toISOString()}</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Format quality report for CLI output.
 */
export function formatQualityReport(report: QualityReport): string {
  const lines: string[] = [];
  lines.push("📊 Batch Quality Report\n");
  lines.push(`  Total skills:   ${report.totalSkills}`);
  lines.push(`  Average score:  ${report.averageScore}/100`);
  lines.push(`  Grades: ${Object.entries(report.gradeDistribution).map(([g, c]) => `${g}:${c}`).join("  ")}`);
  lines.push("");

  for (const entry of report.entries) {
    const icon = entry.grade === "A" ? "🟢" : entry.grade === "B" ? "🔵" : entry.grade === "C" ? "🟡" : "🔴";
    lines.push(`  ${icon} ${entry.name.padEnd(25)} ${entry.grade} (${entry.score}/100) ${entry.issues.length > 0 ? `— ${entry.issues.length} issue(s)` : ""}`);
  }

  if (report.commonIssues.length > 0) {
    lines.push("\n  Common Issues:");
    for (const ci of report.commonIssues.slice(0, 5)) {
      lines.push(`    ⚠️  ${ci.issue} (${ci.count}/${report.totalSkills})`);
    }
  }

  return lines.join("\n");
}
