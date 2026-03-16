import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// --- Health Check Tests ---
import { checkSkillHealthContent, formatHealthResult } from "../health";

describe("health", () => {
  it("scores a well-structured skill highly", () => {
    const content = `---
name: test-skill
description: A comprehensive test skill
---
# Test Skill

This is a comprehensive test skill that does many wonderful things for developers who need help.

## Installation

\`\`\`bash
npm install test-skill
\`\`\`

## Usage

\`\`\`js
const s = require('test-skill');
s.run();
\`\`\`

## Examples

\`\`\`js
// Example 1
s.doThing();
\`\`\`

## When NOT to Use

- Don't use for X

## API Reference

- \`run()\` - runs the thing
`;
    const result = checkSkillHealthContent(content);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.grade).toMatch(/^[AB]$/);
  });

  it("scores a minimal skill poorly", () => {
    const result = checkSkillHealthContent("# Hi\n\nShort.");
    expect(result.score).toBeLessThan(50);
    expect(result.grade).toMatch(/^[DF]$/);
  });

  it("detects missing 'When NOT to use' section", () => {
    const content = "# Skill\n\nA description that is longer than fifty characters for sure yes indeed.\n\n## Usage\n\nDo stuff.\n";
    const result = checkSkillHealthContent(content);
    const whenNotCheck = result.checks.find(c => c.name.includes("When NOT"));
    expect(whenNotCheck?.passed).toBe(false);
  });

  it("detects install instructions in code blocks", () => {
    const content = "# Skill\n\nDesc over fifty chars for sure absolutely.\n\n```bash\nnpm install foo\n```\n";
    const result = checkSkillHealthContent(content);
    const installCheck = result.checks.find(c => c.name.includes("Install"));
    expect(installCheck?.passed).toBe(true);
  });

  it("formats output with emojis", () => {
    const result = checkSkillHealthContent("# Test\n\nHello world this is a test description.\n");
    const formatted = formatHealthResult(result);
    expect(formatted).toContain("🏥");
    expect(formatted).toContain("Score:");
  });
});

// --- Merge Tests ---
import { mergeSkills } from "../merge";

describe("merge", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("merges two skill files", () => {
    const a = path.join(tmpDir, "a.md");
    const b = path.join(tmpDir, "b.md");
    fs.writeFileSync(a, "# Skill A\n\nDoes A things.\n\n## Usage\n\nUse A.\n");
    fs.writeFileSync(b, "# Skill B\n\nDoes B things.\n\n## Usage\n\nUse B.\n");
    const result = mergeSkills([a, b]);
    expect(result.sourceCount).toBe(2);
    expect(result.content).toContain("Skill A");
    expect(result.content).toContain("Use A.");
    expect(result.content).toContain("Use B.");
  });

  it("deduplicates identical lines in smart mode", () => {
    const a = path.join(tmpDir, "a.md");
    const b = path.join(tmpDir, "b.md");
    fs.writeFileSync(a, "# Skill A\n\nShared description.\n\n## Usage\n\n- Step 1\n- Step 2\n");
    fs.writeFileSync(b, "# Skill B\n\nShared description.\n\n## Usage\n\n- Step 1\n- Step 3\n");
    const result = mergeSkills([a, b]);
    expect(result.duplicatesRemoved).toBeGreaterThan(0);
  });

  it("writes output file when outputPath is set", () => {
    const a = path.join(tmpDir, "a.md");
    fs.writeFileSync(a, "# Skill A\n\nDescription.\n");
    const outPath = path.join(tmpDir, "out.md");
    mergeSkills([a], { outputPath: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it("throws on empty input", () => {
    expect(() => mergeSkills([])).toThrow("No skill files");
  });

  it("returns single file unchanged", () => {
    const a = path.join(tmpDir, "a.md");
    const content = "# Solo Skill\n\nJust one.\n";
    fs.writeFileSync(a, content);
    const result = mergeSkills([a]);
    expect(result.content).toBe(content);
    expect(result.sourceCount).toBe(1);
  });
});

// --- Formats Tests ---
import { parseSkillToData, toJson, toYaml, toHtml, convertFormat, formatExtension } from "../formats";

describe("formats", () => {
  const sampleMd = `---
name: test
---
# Test Skill

A test skill description.

## Usage

Use it like this.

## Examples

Some examples here.
`;

  it("parses skill to structured data", () => {
    const data = parseSkillToData(sampleMd);
    expect(data.title).toBe("Test Skill");
    expect(data.description).toBe("A test skill description.");
    expect(data.sections["Usage"]).toBe("Use it like this.");
    expect(data.frontmatter?.name).toBe("test");
  });

  it("converts to valid JSON", () => {
    const data = parseSkillToData(sampleMd);
    const json = toJson(data);
    const parsed = JSON.parse(json);
    expect(parsed.title).toBe("Test Skill");
  });

  it("converts to YAML", () => {
    const data = parseSkillToData(sampleMd);
    const yaml = toYaml(data);
    expect(yaml).toContain('title: "Test Skill"');
    expect(yaml).toContain("sections:");
  });

  it("converts to HTML with proper structure", () => {
    const data = parseSkillToData(sampleMd);
    const html = toHtml(data);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<h1>Test Skill</h1>");
    expect(html).toContain("<h2>Usage</h2>");
  });

  it("convertFormat returns md unchanged", () => {
    expect(convertFormat(sampleMd, "md")).toBe(sampleMd);
  });

  it("convertFormat to json produces valid JSON", () => {
    const result = convertFormat(sampleMd, "json");
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("formatExtension returns correct extensions", () => {
    expect(formatExtension("md")).toBe(".md");
    expect(formatExtension("json")).toBe(".json");
    expect(formatExtension("yaml")).toBe(".yaml");
    expect(formatExtension("html")).toBe(".html");
  });
});

// --- Monorepo Tests ---
import { detectMonorepo, packageSkillName, formatMonorepoDetection } from "../monorepo";

describe("monorepo", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "monorepo-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects npm workspaces monorepo", async () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({
      name: "root",
      workspaces: ["packages/*"],
    }));
    fs.mkdirSync(path.join(tmpDir, "packages", "core"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "packages", "cli"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "packages", "core", "package.json"), JSON.stringify({ name: "@test/core" }));
    fs.writeFileSync(path.join(tmpDir, "packages", "cli", "package.json"), JSON.stringify({ name: "@test/cli" }));

    const result = await detectMonorepo(tmpDir);
    expect(result.isMonorepo).toBe(true);
    expect(result.packages.length).toBe(2);
    expect(result.tool).toBe("npm-workspaces");
  });

  it("detects non-monorepo", async () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "single-pkg" }));
    const result = await detectMonorepo(tmpDir);
    expect(result.isMonorepo).toBe(false);
  });

  it("detects lerna monorepo", async () => {
    fs.writeFileSync(path.join(tmpDir, "lerna.json"), JSON.stringify({ packages: ["packages/*"] }));
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "root" }));
    fs.mkdirSync(path.join(tmpDir, "packages", "a"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "packages", "b"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "packages", "a", "package.json"), JSON.stringify({ name: "pkg-a" }));
    fs.writeFileSync(path.join(tmpDir, "packages", "b", "package.json"), JSON.stringify({ name: "pkg-b" }));

    const result = await detectMonorepo(tmpDir);
    expect(result.isMonorepo).toBe(true);
    expect(result.tool).toBe("lerna");
  });

  it("packageSkillName strips scope", () => {
    expect(packageSkillName("@myorg/core")).toBe("skill-core.md");
    expect(packageSkillName("simple-pkg")).toBe("skill-simple-pkg.md");
  });

  it("formatMonorepoDetection shows non-monorepo message", () => {
    const formatted = formatMonorepoDetection({ isMonorepo: false, packages: [] });
    expect(formatted).toContain("Not a monorepo");
  });

  it("formatMonorepoDetection lists packages", () => {
    const formatted = formatMonorepoDetection({
      isMonorepo: true,
      tool: "npm-workspaces",
      packages: [
        { name: "@org/core", path: "/tmp/core", relativePath: "packages/core", hasPackageJson: true },
        { name: "@org/cli", path: "/tmp/cli", relativePath: "packages/cli", hasPackageJson: true },
      ],
    });
    expect(formatted).toContain("2 packages");
    expect(formatted).toContain("npm-workspaces");
    expect(formatted).toContain("skill-core.md");
  });
});

// --- Versioning (extended) Tests ---
import { extractVersionHistory, addVersionEntry, formatVersionHistory, generateVersionStamp, formatVersionLine, injectVersionInfo } from "../versioning";

describe("versioning extended", () => {
  it("extracts version history from content", () => {
    const content = `# Skill\n\n<!-- version_history: [{"version":"v1.0.0","date":"2026-03-14","commit":"abc123","summary":"Initial"}] -->\n`;
    const history = extractVersionHistory(content);
    expect(history).toHaveLength(1);
    expect(history[0].version).toBe("v1.0.0");
  });

  it("returns empty array when no history", () => {
    expect(extractVersionHistory("# No history\n")).toEqual([]);
  });

  it("adds version entry to content", () => {
    const content = "# Skill\n\nDescription.\n";
    const result = addVersionEntry(content, {
      version: "v1.0.0",
      date: "2026-03-16",
      commit: "abc1234",
      summary: "Initial generation",
    });
    expect(result).toContain("version_history:");
    expect(result).toContain("v1.0.0");
  });

  it("prepends new entry to existing history", () => {
    const content = `# Skill\n\n<!-- version_history: [{"version":"v1.0.0","date":"2026-03-14","commit":"abc","summary":"Init"}] -->\n`;
    const result = addVersionEntry(content, {
      version: "v2.0.0",
      date: "2026-03-16",
      commit: "def",
      summary: "Major update",
    });
    const history = extractVersionHistory(result);
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe("v2.0.0");
  });

  it("formatVersionHistory shows current and history", () => {
    const output = formatVersionHistory(
      { commit: "abc1234567", commitShort: "abc1234", date: "2026-03-16", tag: "v2.0.0" },
      [{ version: "v2.0.0", date: "2026-03-16", commit: "abc", summary: "Update" }],
    );
    expect(output).toContain("Current: v2.0.0");
    expect(output).toContain("History:");
  });

  it("formatVersionHistory shows no history message", () => {
    const output = formatVersionHistory(null, []);
    expect(output).toContain("No version history");
  });

  it("generateVersionStamp includes tag when present", () => {
    const stamp = generateVersionStamp({ commit: "abc123", commitShort: "abc1234", date: "2026-03-16", tag: "v1.0.0" });
    expect(stamp).toContain('version_tag: "v1.0.0"');
  });

  it("formatVersionLine without tag shows commit", () => {
    const line = formatVersionLine({ commit: "abc123", commitShort: "abc1234", date: "2026-03-16" });
    expect(line).toContain("commit abc1234");
  });

  it("injectVersionInfo adds version line", () => {
    const content = "# Skill\n\nSome content.\n";
    const result = injectVersionInfo(content, { commit: "abc123", commitShort: "abc1234", date: "2026-03-16" });
    expect(result).toContain("generated from commit abc1234");
  });
});
