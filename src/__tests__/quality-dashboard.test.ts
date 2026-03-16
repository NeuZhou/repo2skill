import { describe, it, expect } from "vitest";
import { calculateQualityMetrics, formatQualityDashboard, QualityMetrics } from "../quality-dashboard";

describe("calculateQualityMetrics", () => {
  it("calculates metrics from full info", () => {
    const m = calculateQualityMetrics({
      score: 82, maxScore: 100,
      filesAnalyzed: 13, totalFiles: 15,
      hasDescription: true, hasExamples: true, hasApi: false,
      testsGenerated: 3, securityIssues: 0,
    });
    expect(m.overall).toBe(82);
    expect(m.stars).toBe(4);
    expect(m.documentationGrade).toBe("Good");
    expect(m.securityIssues).toBe(0);
  });

  it("gives 5 stars for 90+", () => {
    const m = calculateQualityMetrics({ score: 95, maxScore: 100 });
    expect(m.stars).toBe(5);
  });

  it("gives 3 stars for 60-74", () => {
    const m = calculateQualityMetrics({ score: 65, maxScore: 100 });
    expect(m.stars).toBe(3);
  });

  it("gives 1 star for <40", () => {
    const m = calculateQualityMetrics({ score: 20, maxScore: 100 });
    expect(m.stars).toBe(1);
  });

  it("handles zero maxScore", () => {
    const m = calculateQualityMetrics({ score: 0, maxScore: 0 });
    expect(m.stars).toBe(1);
    expect(m.overall).toBe(0);
  });

  it("rates Excellent docs when all present", () => {
    const m = calculateQualityMetrics({
      hasDescription: true, hasExamples: true, hasApi: true,
    });
    expect(m.documentationGrade).toBe("Excellent");
  });

  it("rates Fair docs with only description", () => {
    const m = calculateQualityMetrics({ hasDescription: true });
    expect(m.documentationGrade).toBe("Fair");
  });

  it("rates Poor docs with nothing", () => {
    const m = calculateQualityMetrics({});
    expect(m.documentationGrade).toBe("Poor");
  });

  it("defaults missing fields to zero", () => {
    const m = calculateQualityMetrics({});
    expect(m.filesAnalyzed).toBe(0);
    expect(m.totalFiles).toBe(0);
    expect(m.testsGenerated).toBe(0);
    expect(m.securityIssues).toBe(0);
  });
});

describe("formatQualityDashboard", () => {
  it("produces box-drawing output", () => {
    const m: QualityMetrics = {
      overall: 82, maxScore: 100,
      filesAnalyzed: 13, totalFiles: 15,
      documentationGrade: "Good",
      testsGenerated: 3, securityIssues: 0, stars: 4,
    };
    const output = formatQualityDashboard(m);
    expect(output).toContain("┌─ Skill Quality Report");
    expect(output).toContain("★★★★☆");
    expect(output).toContain("13/15 files analyzed");
    expect(output).toContain("Good");
    expect(output).toContain("3 generated");
    expect(output).toContain("No issues found");
    expect(output).toContain("└──");
  });

  it("shows security issues when present", () => {
    const m: QualityMetrics = {
      overall: 50, maxScore: 100,
      filesAnalyzed: 5, totalFiles: 10,
      documentationGrade: "Fair",
      testsGenerated: 0, securityIssues: 2, stars: 3,
    };
    const output = formatQualityDashboard(m);
    expect(output).toContain("2 issue(s) found");
  });

  it("shows 5 stars for perfect score", () => {
    const m: QualityMetrics = {
      overall: 100, maxScore: 100,
      filesAnalyzed: 10, totalFiles: 10,
      documentationGrade: "Excellent",
      testsGenerated: 5, securityIssues: 0, stars: 5,
    };
    const output = formatQualityDashboard(m);
    expect(output).toContain("★★★★★");
    expect(output).not.toContain("☆");
  });

  it("shows all empty stars for 1-star", () => {
    const m: QualityMetrics = {
      overall: 10, maxScore: 100,
      filesAnalyzed: 1, totalFiles: 20,
      documentationGrade: "Poor",
      testsGenerated: 0, securityIssues: 5, stars: 1,
    };
    const output = formatQualityDashboard(m);
    expect(output).toContain("★☆☆☆☆");
  });
});
