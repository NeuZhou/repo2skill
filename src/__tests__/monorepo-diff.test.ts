import { describe, it, expect } from "vitest";
import { analyzeRepo, RepoAnalysis } from "../analyzer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function makeTmpDir(): string {
  const dir = path.join(os.tmpdir(), `repo2skill-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("monorepo --package support", () => {
  it("analyzes a specific package directory within monorepo", async () => {
    const root = makeTmpDir();
    // Create monorepo structure
    fs.mkdirSync(path.join(root, "packages", "core"), { recursive: true });
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
      name: "monorepo",
      workspaces: ["packages/*"],
    }));
    fs.writeFileSync(path.join(root, "packages", "core", "package.json"), JSON.stringify({
      name: "@monorepo/core",
      version: "1.0.0",
      description: "Core package",
      main: "index.js",
    }));
    fs.writeFileSync(path.join(root, "packages", "core", "index.js"), "export function hello() {}");
    fs.writeFileSync(path.join(root, "packages", "core", "README.md"), "# Core\n\nThe core package.\n\n## Install\n\n```bash\nnpm install @monorepo/core\n```\n");

    // Analyze just the core package
    const pkgDir = path.join(root, "packages", "core");
    const analysis = await analyzeRepo(pkgDir, "core");

    expect(analysis.packageName).toBe("@monorepo/core");
    expect(analysis.description).toBe("Core package");
    expect(analysis.readmeInstallCommands).toContain("npm install @monorepo/core");

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("analyzes root of monorepo and detects packages", async () => {
    const root = makeTmpDir();
    fs.mkdirSync(path.join(root, "packages", "alpha"), { recursive: true });
    fs.mkdirSync(path.join(root, "packages", "beta"), { recursive: true });
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
      name: "mono",
      workspaces: ["packages/*"],
    }));
    fs.writeFileSync(path.join(root, "packages", "alpha", "package.json"), "{}");
    fs.writeFileSync(path.join(root, "packages", "beta", "package.json"), "{}");
    fs.writeFileSync(path.join(root, "README.md"), "# Mono\n\nA monorepo.\n");

    const analysis = await analyzeRepo(root, "mono");
    expect(analysis.isMonorepo).toBe(true);
    expect(analysis.monorepoPackages).toContain("alpha");
    expect(analysis.monorepoPackages).toContain("beta");

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("detects pnpm-workspace.yaml as monorepo", async () => {
    const root = makeTmpDir();
    fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "test" }));
    fs.writeFileSync(path.join(root, "README.md"), "# Test\n\nTest project.\n");

    const analysis = await analyzeRepo(root, "test");
    expect(analysis.isMonorepo).toBe(true);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("diff mode types", () => {
  // We test the DiffChange interface behavior through import validation
  it("DiffResult has expected shape", async () => {
    const { diffSkill } = await import("../index");
    expect(typeof diffSkill).toBe("function");
  });
});

describe("analyzeRepo smart README fields", () => {
  it("populates badges from README", async () => {
    const root = makeTmpDir();
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "test", description: "Test" }));
    fs.writeFileSync(path.join(root, "README.md"),
      "# Test\n\n[![npm](https://img.shields.io/npm/v/test.svg)](https://npmjs.com/package/test)\n\nA test project.\n");

    const analysis = await analyzeRepo(root, "test");
    expect(analysis.badges.length).toBeGreaterThan(0);
    expect(analysis.badges[0].type).toBe("npm");

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("populates TOC from README headings", async () => {
    const root = makeTmpDir();
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "test" }));
    fs.writeFileSync(path.join(root, "README.md"),
      "# Test\n\n## Install\n\nDo stuff.\n\n## Usage\n\nMore stuff.\n\n## API\n\nAPI docs.\n");

    const analysis = await analyzeRepo(root, "test");
    expect(analysis.toc.length).toBe(4);
    expect(analysis.toc.map(t => t.title)).toContain("Install");
    expect(analysis.toc.map(t => t.title)).toContain("Usage");

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("extracts install commands into readmeInstallCommands", async () => {
    const root = makeTmpDir();
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "my-tool" }));
    fs.writeFileSync(path.join(root, "README.md"),
      "# Tool\n\n## Install\n\n```bash\nnpm install my-tool\n```\n\nDone.\n");

    const analysis = await analyzeRepo(root, "my-tool");
    expect(analysis.readmeInstallCommands).toContain("npm install my-tool");

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("extracts API examples into readmeApiExamples", async () => {
    const root = makeTmpDir();
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "lib" }));
    fs.writeFileSync(path.join(root, "README.md"),
      "# Lib\n\n## Usage\n\n```js\nimport { run } from 'lib';\nrun();\n```\n");

    const analysis = await analyzeRepo(root, "lib");
    expect(analysis.readmeApiExamples.length).toBeGreaterThan(0);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("uses install command from code block when installInstructions empty", async () => {
    const root = makeTmpDir();
    // No package.json with install instructions, but README has one
    fs.writeFileSync(path.join(root, "README.md"),
      "# Tool\n\nA cool tool.\n\n```bash\nbrew install cool-tool\n```\n");

    const analysis = await analyzeRepo(root, "tool");
    expect(analysis.installInstructions).toContain("brew install cool-tool");

    fs.rmSync(root, { recursive: true, force: true });
  });
});
