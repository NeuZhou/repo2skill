/**
 * Round 8 Tests — v3.4.0
 * Tests for: Linter diagnostics, Template scaffolding, Interactive mode, Changelog generator
 */

import { describe, test, expect, vi } from "vitest";
import { lintSkillContent, LintResult, LintDiagnostic } from "../linter";
import {
  generateFromTemplate,
  isValidSkillType,
  SKILL_TYPES,
  listTemplates,
  isValidTemplate,
  getTemplate,
  SkillType,
} from "../templates";
import { displayAnalysisSummary, InteractiveAnswers } from "../interactive";
import { categorizeCommit, formatChangelog, Changelog, ChangelogEntry } from "../changelog";

// ─── Linter Diagnostics ─────────────────────────────────────────

describe("Linter v3.4.0 — line-level diagnostics", () => {
  test("detects short description", () => {
    const content = `---\ndescription: "Short"\n---\n# Tool\n\nHello`;
    const result = lintSkillContent(content);
    const diag = result.diagnostics.find((d) => d.message.includes("Description too short"));
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("warning");
    expect(diag!.line).toBe(2);
  });

  test("detects broken code block (missing closing ```)", () => {
    const content = `# Tool\n\nSome text\n\n\`\`\`bash\nnpm install foo\n\nMore text`;
    const result = lintSkillContent(content);
    const diag = result.diagnostics.find((d) => d.message.includes("Broken code block"));
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("error");
  });

  test("no broken code block when properly closed", () => {
    const content = `# Tool\n\n\`\`\`bash\nnpm install foo\n\`\`\`\n`;
    const result = lintSkillContent(content);
    const diag = result.diagnostics.find((d) => d.message.includes("Broken code block"));
    expect(diag).toBeUndefined();
  });

  test("detects placeholder links", () => {
    const content = `# Tool\n\n[Example](http://localhost:3000)`;
    const result = lintSkillContent(content);
    const diag = result.diagnostics.find((d) => d.message.includes("placeholder"));
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("info");
  });

  test("detects empty sections", () => {
    const content = `# Tool\n\n## Features\n\n## Quick Start\n\nDo this.`;
    const result = lintSkillContent(content);
    const diag = result.diagnostics.find((d) => d.message.includes("Empty section"));
    expect(diag).toBeDefined();
    expect(diag!.message).toContain("Features");
  });

  test("detects duplicate headings", () => {
    const content = `# Tool\n\n## Features\n\nStuff\n\n## Features\n\nMore stuff`;
    const result = lintSkillContent(content);
    const diag = result.diagnostics.find((d) => d.message.includes("Duplicate heading"));
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("warning");
  });

  test("returns score and checks", () => {
    const content = `---\ndescription: "A comprehensive tool that does many things well and is very useful"\n---\n# Tool\n\nGreat tool.\n\n## When to Use\n\n- Stuff\n\n## When NOT to Use\n\n- Nah\n\n## Quick Start\n\n\`\`\`bash\nnpm install tool\n\`\`\`\n\n## Features\n\n- Fast\n\n## Project Info\n\n**Language:** TypeScript\n\n## API\n\n- fn()`;
    const result = lintSkillContent(content);
    expect(result.score).toBeGreaterThan(0);
    expect(result.maxScore).toBe(100);
    expect(result.checks.length).toBe(10);
  });

  test("diagnostics array is empty for clean file", () => {
    const content = `# Tool\n\nA great tool.\n\n## When to Use\n\n- Stuff\n\n\`\`\`bash\nnpm install x\n\`\`\``;
    const result = lintSkillContent(content);
    // Should have no errors at minimum
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    expect(errors.length).toBe(0);
  });
});

// ─── Template Scaffolding ────────────────────────────────────────

describe("Template scaffolding v3.4.0", () => {
  test("isValidSkillType returns true for valid types", () => {
    expect(isValidSkillType("cli-tool")).toBe(true);
    expect(isValidSkillType("api-service")).toBe(true);
    expect(isValidSkillType("library")).toBe(true);
    expect(isValidSkillType("framework")).toBe(true);
  });

  test("isValidSkillType returns false for invalid types", () => {
    expect(isValidSkillType("invalid")).toBe(false);
    expect(isValidSkillType("")).toBe(false);
  });

  test("SKILL_TYPES has 4 entries", () => {
    expect(SKILL_TYPES).toHaveLength(4);
  });

  test("generateFromTemplate cli-tool contains key commands", () => {
    const content = generateFromTemplate("cli-tool", "my-tool");
    expect(content).toContain("my-tool");
    expect(content).toContain("## Key Commands");
    expect(content).toContain("npm install -g my-tool");
    expect(content).toContain("## Quick Start");
  });

  test("generateFromTemplate api-service contains endpoints", () => {
    const content = generateFromTemplate("api-service", "my-api");
    expect(content).toContain("## Key API");
    expect(content).toContain("/api/resource");
    expect(content).toContain("MyApi");
  });

  test("generateFromTemplate library has features", () => {
    const content = generateFromTemplate("library", "my-lib");
    expect(content).toContain("## Features");
    expect(content).toContain("npm install my-lib");
  });

  test("generateFromTemplate framework has key concepts", () => {
    const content = generateFromTemplate("framework", "my-framework");
    expect(content).toContain("## Key Concepts");
    expect(content).toContain("create-my-framework-app");
  });

  test("generateFromTemplate throws for unknown type", () => {
    expect(() => generateFromTemplate("invalid" as SkillType, "x")).toThrow("Unknown skill type");
  });

  test("all templates have frontmatter", () => {
    for (const type of SKILL_TYPES) {
      const content = generateFromTemplate(type, "test");
      expect(content).toMatch(/^---\n/);
    }
  });

  test("existing template system still works", () => {
    expect(listTemplates()).toHaveLength(4);
    expect(isValidTemplate("minimal")).toBe(true);
    expect(isValidTemplate("nonexistent")).toBe(false);
    expect(getTemplate("detailed").maxExamples).toBe(5);
  });
});

// ─── Interactive Mode ────────────────────────────────────────────

describe("Interactive mode v3.4.0", () => {
  test("displayAnalysisSummary outputs to console", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    displayAnalysisSummary({
      languages: ["TypeScript", "JavaScript"],
      type: "CLI tool",
      commandCount: 15,
    });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("TypeScript"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("CLI tool"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("15"));
    spy.mockRestore();
  });

  test("InteractiveAnswers type has new fields", () => {
    const answers: InteractiveAnswers = {
      repo: "user/repo",
      format: "markdown",
      outputType: "skill",
      template: "default",
      includeGithub: true,
      includeExamples: true,
      includeApi: false,
      includeTests: true,
      publishToClawHub: false,
    };
    expect(answers.includeExamples).toBe(true);
    expect(answers.includeApi).toBe(false);
  });
});

// ─── Changelog Generator ────────────────────────────────────────

describe("Changelog v3.4.0", () => {
  test("categorizeCommit detects features", () => {
    expect(categorizeCommit("feat: add new thing")).toBe("feature");
    expect(categorizeCommit("feat(core): stuff")).toBe("feature");
    expect(categorizeCommit("feat!: breaking")).toBe("feature");
  });

  test("categorizeCommit detects fixes", () => {
    expect(categorizeCommit("fix: broken thing")).toBe("fix");
    expect(categorizeCommit("fix(ui): layout")).toBe("fix");
    expect(categorizeCommit("fixed a bug")).toBe("fix");
  });

  test("categorizeCommit detects docs", () => {
    expect(categorizeCommit("docs: update readme")).toBe("docs");
    expect(categorizeCommit("doc(api): add examples")).toBe("docs");
  });

  test("categorizeCommit returns other for unknown", () => {
    expect(categorizeCommit("bump version")).toBe("other");
    expect(categorizeCommit("merge branch")).toBe("other");
  });

  test("formatChangelog groups by category", () => {
    const changelog: Changelog = {
      repo: "test-repo",
      entries: [
        { hash: "abc1234", date: "2024-01-01", message: "feat: add X", category: "feature" },
        { hash: "def5678", date: "2024-01-02", message: "fix: broken Y", category: "fix" },
        { hash: "ghi9012", date: "2024-01-03", message: "docs: update", category: "docs" },
      ],
      summary: "test-repo: 3 commits (1 features, 1 fixes)",
    };
    const output = formatChangelog(changelog);
    expect(output).toContain("test-repo");
    expect(output).toContain("Feature (1)");
    expect(output).toContain("Fix (1)");
    expect(output).toContain("Docs (1)");
    expect(output).toContain("abc1234");
  });

  test("formatChangelog handles empty changelog", () => {
    const changelog: Changelog = {
      repo: "empty",
      entries: [],
      summary: "empty: 0 commits",
    };
    const output = formatChangelog(changelog);
    expect(output).toContain("empty");
  });
});
