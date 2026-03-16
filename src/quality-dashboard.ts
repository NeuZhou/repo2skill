/**
 * Quality Dashboard - Display a visual quality report after skill conversion.
 * v3.5.0
 */

export interface QualityMetrics {
  overall: number;
  maxScore: number;
  filesAnalyzed: number;
  totalFiles: number;
  documentationGrade: "Excellent" | "Good" | "Fair" | "Poor";
  testsGenerated: number;
  securityIssues: number;
  stars: number;
}

/**
 * Calculate quality metrics from conversion results.
 */
export function calculateQualityMetrics(info: {
  score?: number;
  maxScore?: number;
  filesAnalyzed?: number;
  totalFiles?: number;
  hasDescription?: boolean;
  hasExamples?: boolean;
  hasApi?: boolean;
  testsGenerated?: number;
  securityIssues?: number;
}): QualityMetrics {
  const overall = info.score ?? 0;
  const maxScore = info.maxScore ?? 100;
  const pct = maxScore > 0 ? (overall / maxScore) * 100 : 0;

  let documentationGrade: QualityMetrics["documentationGrade"] = "Poor";
  if (info.hasDescription && info.hasExamples && info.hasApi) documentationGrade = "Excellent";
  else if (info.hasDescription && info.hasExamples) documentationGrade = "Good";
  else if (info.hasDescription) documentationGrade = "Fair";

  const stars = pct >= 90 ? 5 : pct >= 75 ? 4 : pct >= 60 ? 3 : pct >= 40 ? 2 : 1;

  return {
    overall,
    maxScore,
    filesAnalyzed: info.filesAnalyzed ?? 0,
    totalFiles: info.totalFiles ?? 0,
    documentationGrade,
    testsGenerated: info.testsGenerated ?? 0,
    securityIssues: info.securityIssues ?? 0,
    stars,
  };
}

/**
 * Format the quality dashboard for CLI output.
 */
export function formatQualityDashboard(metrics: QualityMetrics): string {
  const starStr = "★".repeat(metrics.stars) + "☆".repeat(5 - metrics.stars);
  const pct = metrics.maxScore > 0 ? Math.round((metrics.overall / metrics.maxScore) * 100) : 0;

  const securityLine = metrics.securityIssues === 0
    ? "│ Security: No issues found        │"
    : `│ Security: ${metrics.securityIssues} issue(s) found       │`;

  return [
    "┌─ Skill Quality Report ──────────────┐",
    `│ Overall: ${starStr} (${pct}/100)${" ".repeat(Math.max(0, 10 - String(pct).length))}│`,
    `│ Coverage: ${metrics.filesAnalyzed}/${metrics.totalFiles} files analyzed${" ".repeat(Math.max(0, 9 - String(metrics.filesAnalyzed).length - String(metrics.totalFiles).length))}│`,
    `│ Documentation: ${metrics.documentationGrade}${" ".repeat(Math.max(0, 18 - metrics.documentationGrade.length))}│`,
    `│ Tests: ${metrics.testsGenerated} generated${" ".repeat(Math.max(0, 21 - String(metrics.testsGenerated).length))}│`,
    securityLine,
    "└──────────────────────────────────────┘",
  ].join("\n");
}
