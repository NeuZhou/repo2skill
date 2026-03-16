import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// --- Skill Graph Tests ---
import { buildSkillGraph, generateGraphHtml, formatGraphSummary, SkillGraph } from "../skill-graph";

describe("skill-graph", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `r2s-graph-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createSkill(name: string, content: string) {
    const dir = path.join(tmpDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), content);
  }

  it("returns empty graph for empty directory", () => {
    const graph = buildSkillGraph(tmpDir);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it("returns empty graph for non-existent directory", () => {
    const graph = buildSkillGraph("/nonexistent/path");
    expect(graph.nodes).toHaveLength(0);
  });

  it("parses skills into nodes", () => {
    createSkill("my-tool", `---
category: "cli-tool"
---
# My Tool

A test tool.

**Language:** TypeScript
**Key dependencies:** \`express\`, \`commander\`

Quality Score: 75/100`);

    const graph = buildSkillGraph(tmpDir);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe("my-tool");
    expect(graph.nodes[0].category).toBe("cli-tool");
    expect(graph.nodes[0].language).toBe("TypeScript");
    expect(graph.nodes[0].quality).toBe(75);
    expect(graph.nodes[0].dependencies).toContain("express");
    expect(graph.nodes[0].dependencies).toContain("commander");
  });

  it("detects same-category edges", () => {
    createSkill("tool-a", `---\ncategory: "web"\n---\n# Tool A\nTest`);
    createSkill("tool-b", `---\ncategory: "web"\n---\n# Tool B\nTest`);

    const graph = buildSkillGraph(tmpDir);
    expect(graph.nodes).toHaveLength(2);
    const catEdges = graph.edges.filter(e => e.type === "same-category");
    expect(catEdges.length).toBeGreaterThanOrEqual(1);
  });

  it("detects shared-tool edges", () => {
    createSkill("app-a", `# App A\nUses express and jest for testing.`);
    createSkill("app-b", `# App B\nAlso uses express server.`);

    const graph = buildSkillGraph(tmpDir);
    const toolEdges = graph.edges.filter(e => e.type === "shared-tool");
    expect(toolEdges.length).toBeGreaterThanOrEqual(1);
  });

  it("generates valid HTML", () => {
    createSkill("test-skill", `---\ncategory: "test"\n---\n# Test\nHello`);
    const graph = buildSkillGraph(tmpDir);
    const html = generateGraphHtml(graph);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("vis-network");
    expect(html).toContain("test-skill");
    expect(html).toContain("Skill Graph");
  });

  it("formats graph summary", () => {
    createSkill("s1", `---\ncategory: "a"\n---\n# S1\nTest`);
    createSkill("s2", `---\ncategory: "b"\n---\n# S2\nTest`);
    const graph = buildSkillGraph(tmpDir);
    const summary = formatGraphSummary(graph);
    expect(summary).toContain("Skills:        2");
    expect(summary).toContain("Categories:    2");
  });
});

// --- Skill Diff Tests ---
import { diffSkillContent, formatSkillDiff } from "../skill-diff";

describe("skill-diff", () => {
  it("detects no changes for identical content", () => {
    const content = `# My Skill\nA test skill.\n## Install\nnpm install my-skill`;
    const result = diffSkillContent(content, content);
    expect(result.changes).toHaveLength(0);
  });

  it("detects title change", () => {
    const old = `# Old Title\nA tool.`;
    const new_ = `# New Title\nA tool.`;
    const result = diffSkillContent(old, new_);
    const titleChange = result.changes.find(c => c.field === "title");
    expect(titleChange).toBeDefined();
    expect(titleChange!.type).toBe("changed");
  });

  it("detects added section", () => {
    const old = `# Tool\nDesc.\n## Install\nnpm i tool`;
    const new_ = `# Tool\nDesc.\n## Install\nnpm i tool\n## Examples\nHere are examples.`;
    const result = diffSkillContent(old, new_);
    const added = result.changes.find(c => c.type === "added" && c.summary.includes("Examples"));
    expect(added).toBeDefined();
  });

  it("detects removed section", () => {
    const old = `# Tool\nDesc.\n## Install\nnpm i tool\n## Legacy\nOld stuff.`;
    const new_ = `# Tool\nDesc.\n## Install\nnpm i tool`;
    const result = diffSkillContent(old, new_);
    const removed = result.changes.find(c => c.type === "removed" && c.summary.includes("Legacy"));
    expect(removed).toBeDefined();
  });

  it("detects frontmatter changes", () => {
    const old = `---\nversion: "1.0"\n---\n# Tool\nDesc.`;
    const new_ = `---\nversion: "2.0"\nauthor: "test"\n---\n# Tool\nDesc.`;
    const result = diffSkillContent(old, new_);
    expect(result.changes.some(c => c.field === "frontmatter.version")).toBe(true);
    expect(result.changes.some(c => c.field === "frontmatter.author" && c.type === "added")).toBe(true);
  });

  it("formats diff output", () => {
    const old = `# Old\nDesc.`;
    const new_ = `# New\nDesc.\n## Added\nNew content.`;
    const result = diffSkillContent(old, new_);
    const formatted = formatSkillDiff(result);
    expect(formatted).toContain("Skill Diff");
    expect(formatted).toContain("change(s)");
  });
});

// --- Quality Report Tests ---
import { buildQualityReport, generateQualityReportHtml, formatQualityReport } from "../quality-report";

describe("quality-report", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `r2s-qr-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createSkill(name: string, content: string) {
    const dir = path.join(tmpDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), content);
  }

  it("returns empty report for empty directory", () => {
    const report = buildQualityReport(tmpDir);
    expect(report.totalSkills).toBe(0);
    expect(report.entries).toHaveLength(0);
  });

  it("builds report for skills", () => {
    createSkill("good-skill", `---
name: good
---
# Good Skill

This is a very comprehensive skill with lots of detail and documentation for developers.

## Installation

\`\`\`bash
npm install good-skill
\`\`\`

## Usage

\`\`\`js
const g = require('good-skill');
g.run();
\`\`\`

## Examples

\`\`\`js
g.example();
\`\`\`

## When NOT to Use

Not for X.

## Reference

API docs here.`);

    createSkill("bare-skill", `# Bare\nMinimal.`);

    const report = buildQualityReport(tmpDir);
    expect(report.totalSkills).toBe(2);
    expect(report.entries).toHaveLength(2);
    // Good skill should score higher
    expect(report.entries[0].score).toBeGreaterThan(report.entries[1].score);
    expect(report.averageScore).toBeGreaterThan(0);
  });

  it("generates valid HTML report", () => {
    createSkill("test", `---\nname: test\n---\n# Test Skill\nA detailed description of this skill.\n## Install\n\`\`\`bash\nnpm i test\n\`\`\``);
    const report = buildQualityReport(tmpDir);
    const html = generateQualityReportHtml(report);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Quality Report");
    expect(html).toContain("test");
  });

  it("identifies common issues", () => {
    createSkill("a", `# A\nShort.`);
    createSkill("b", `# B\nShort.`);
    const report = buildQualityReport(tmpDir);
    expect(report.commonIssues.length).toBeGreaterThan(0);
  });

  it("formats CLI output", () => {
    createSkill("x", `---\nname: x\n---\n# X\nA comprehensive skill description that is longer than fifty chars.\n## Install\n\`\`\`bash\nnpm i x\n\`\`\``);
    const report = buildQualityReport(tmpDir);
    const formatted = formatQualityReport(report);
    expect(formatted).toContain("Batch Quality Report");
    expect(formatted).toContain("x");
  });
});

// --- Plugin System Tests ---
import { createRepoData, runPlugins, injectPluginSections, RepoSkillPlugin, RepoData } from "../plugin";

describe("plugin", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `r2s-plugin-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test Repo\nHello");
    fs.writeFileSync(path.join(tmpDir, "index.js"), "module.exports = {}");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("createRepoData reads files", () => {
    const fakeAnalysis = { name: "test" } as any;
    const data = createRepoData(tmpDir, fakeAnalysis);
    expect(data.readFile("README.md")).toContain("# Test Repo");
    expect(data.readFile("nonexistent.txt")).toBeNull();
  });

  it("createRepoData lists files", () => {
    const fakeAnalysis = { name: "test" } as any;
    const data = createRepoData(tmpDir, fakeAnalysis);
    const files = data.listFiles();
    expect(files).toContain("README.md");
    expect(files).toContain("index.js");
  });

  it("createRepoData filters files with pattern", () => {
    const fakeAnalysis = { name: "test" } as any;
    const data = createRepoData(tmpDir, fakeAnalysis);
    const jsFiles = data.listFiles(".*\\.js$");
    expect(jsFiles).toContain("index.js");
    expect(jsFiles).not.toContain("README.md");
  });

  it("runPlugins executes plugins and collects sections", () => {
    const plugin: RepoSkillPlugin = {
      name: "test-plugin",
      analyze: (repo) => [
        { heading: "Custom Section", content: "Plugin content here", priority: 10 },
      ],
    };
    const data = createRepoData(tmpDir, { name: "test" } as any);
    const sections = runPlugins([plugin], data);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Custom Section");
  });

  it("runPlugins respects shouldActivate", () => {
    const plugin: RepoSkillPlugin = {
      name: "skip-me",
      shouldActivate: () => false,
      analyze: () => [{ heading: "Skipped", content: "Should not appear" }],
    };
    const data = createRepoData(tmpDir, { name: "test" } as any);
    const sections = runPlugins([plugin], data);
    expect(sections).toHaveLength(0);
  });

  it("runPlugins handles plugin errors gracefully", () => {
    const plugin: RepoSkillPlugin = {
      name: "bad-plugin",
      analyze: () => { throw new Error("boom"); },
    };
    const data = createRepoData(tmpDir, { name: "test" } as any);
    const sections = runPlugins([plugin], data);
    expect(sections).toHaveLength(0);
  });

  it("runPlugins sorts by priority", () => {
    const plugins: RepoSkillPlugin[] = [
      { name: "low", analyze: () => [{ heading: "Low", content: "low", priority: 1 }] },
      { name: "high", analyze: () => [{ heading: "High", content: "high", priority: 100 }] },
    ];
    const data = createRepoData(tmpDir, { name: "test" } as any);
    const sections = runPlugins(plugins, data);
    expect(sections[0].heading).toBe("High");
    expect(sections[1].heading).toBe("Low");
  });

  it("injectPluginSections adds before footer", () => {
    const content = `# Skill\nContent.\n\n> Generated by repo2skill`;
    const result = injectPluginSections(content, [
      { heading: "Plugin", content: "Added by plugin" },
    ]);
    expect(result).toContain("## Plugin\n\nAdded by plugin");
    expect(result.indexOf("Plugin")).toBeLessThan(result.indexOf("Generated by"));
  });

  it("injectPluginSections appends when no footer", () => {
    const content = `# Skill\nContent.`;
    const result = injectPluginSections(content, [
      { heading: "Extra", content: "Extra content" },
    ]);
    expect(result).toContain("## Extra\n\nExtra content");
  });

  it("injectPluginSections returns unchanged when no sections", () => {
    const content = `# Skill\nContent.`;
    const result = injectPluginSections(content, []);
    expect(result).toBe(content);
  });
});

// --- Update Checker Enhancement Tests ---
import { compareVersions, formatUpdateCheck, formatSkillUpdateCheck, SkillUpdateCheckResult } from "../update-checker";

describe("update-checker-enhanced", () => {
  it("formatSkillUpdateCheck shows up-to-date", () => {
    const result: SkillUpdateCheckResult = {
      skillPath: "/test/SKILL.md",
      sourceRepo: "owner/repo",
      currentCommit: "abc1234",
      latestCommit: "abc1234",
      commitsBehind: 0,
      newFeatures: [],
      breakingChanges: [],
      updated: false,
      suggestion: "Skill is up to date with source repo.",
    };
    const formatted = formatSkillUpdateCheck(result);
    expect(formatted).toContain("✅ Skill is up to date");
    expect(formatted).toContain("owner/repo");
  });

  it("formatSkillUpdateCheck shows updates available", () => {
    const result: SkillUpdateCheckResult = {
      skillPath: "/test/SKILL.md",
      sourceRepo: "owner/repo",
      currentCommit: "old1234",
      latestCommit: "new5678",
      commitsBehind: 15,
      newFeatures: ["feat: add new command", "feat: support yaml output"],
      breakingChanges: ["breaking: remove deprecated API"],
      updated: true,
      suggestion: "Regenerate with: repo2skill owner/repo --upgrade",
    };
    const formatted = formatSkillUpdateCheck(result);
    expect(formatted).toContain("⚠️  Source repo has been updated");
    expect(formatted).toContain("15 commits");
    expect(formatted).toContain("2 new features");
    expect(formatted).toContain("1 breaking changes");
    expect(formatted).toContain("add new command");
    expect(formatted).toContain("remove deprecated API");
  });

  it("formatSkillUpdateCheck handles missing source_repo", () => {
    const result: SkillUpdateCheckResult = {
      skillPath: "/test/SKILL.md",
      sourceRepo: null,
      currentCommit: null,
      latestCommit: null,
      commitsBehind: 0,
      newFeatures: [],
      breakingChanges: [],
      updated: false,
      suggestion: "No source_repo found in frontmatter.",
    };
    const formatted = formatSkillUpdateCheck(result);
    expect(formatted).toContain("(unknown)");
  });
});
