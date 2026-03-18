/**
 * Tests for security-report edge cases
 */

import { describe, it, expect } from "vitest";
import { generateSecurityReport } from "../security-report";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("generateSecurityReport", () => {
  let tmpDir: string;

  function setup(files: Record<string, string>) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sec-test-"));
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tmpDir, name);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
  }

  function cleanup() {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  it("detects hardcoded API key", () => {
    setup({
      "config.ts": `const apiKey = "sk-1234567890abcdef1234567890abcdef1234";`
    });
    try {
      const report = generateSecurityReport(tmpDir);
      expect(report.findings.some(f => f.category === "secrets")).toBe(true);
      expect(report.riskLevel).toBe("critical");
    } finally {
      cleanup();
    }
  });

  it("reports low risk for clean files", () => {
    setup({
      "clean.ts": `export function add(a: number, b: number): number {\n  return a + b;\n}`
    });
    try {
      const report = generateSecurityReport(tmpDir);
      const criticals = report.findings.filter(f => f.severity === "critical");
      expect(criticals).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("handles empty directory", () => {
    setup({});
    try {
      const report = generateSecurityReport(tmpDir);
      expect(report.filesScanned).toBe(0);
      expect(report.findings).toHaveLength(0);
      expect(report.riskLevel).toBe("low");
    } finally {
      cleanup();
    }
  });

  it("skips node_modules and .git directories", () => {
    setup({
      "node_modules/bad/index.js": `const secret = "sk-ABCDEF1234567890ABCDEF1234567890AB";`,
      ".git/config": `token = ghp_123456789012345678901234567890123456`,
      "src/clean.ts": `export const x = 1;`
    });
    try {
      const report = generateSecurityReport(tmpDir);
      expect(report.findings.filter(f => f.severity === "critical")).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("detects eval usage", () => {
    setup({
      "danger.js": `const result = eval(userInput);`
    });
    try {
      const report = generateSecurityReport(tmpDir);
      expect(report.findings.some(f => f.category === "code-execution")).toBe(true);
    } finally {
      cleanup();
    }
  });
});
