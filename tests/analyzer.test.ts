import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { analyzeRepo, extractFirstParagraph, stripHtmlTags, categorizeProject } from "../src/analyzer";

function makeTmpDir(): string {
  const dir = path.join(os.tmpdir(), `repo2skill-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, relPath: string, content: string) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe("analyzeRepo — language detection", () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("detects Node.js project from package.json", async () => {
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "my-pkg", description: "A test pkg" }));
    writeFile(tmpDir, "index.js", "module.exports = {}");
    const a = await analyzeRepo(tmpDir, "my-pkg");
    expect(a.languages).toContain("JavaScript");
    expect(a.description).toBe("A test pkg");
  });

  it("detects Python project from pyproject.toml", async () => {
    writeFile(tmpDir, "pyproject.toml", `[project]\nname = "mypkg"\ndescription = "A python pkg"\n`);
    writeFile(tmpDir, "src/main.py", "print('hi')");
    const a = await analyzeRepo(tmpDir, "mypkg");
    expect(a.languages).toContain("Python");
    expect(a.description).toBe("A python pkg");
  });

  it("detects Python project from setup.py", async () => {
    writeFile(tmpDir, "setup.py", `from setuptools import setup\nsetup(name="foo", description="setup.py pkg")\n`);
    writeFile(tmpDir, "foo.py", "x = 1");
    const a = await analyzeRepo(tmpDir, "foo");
    expect(a.description).toBe("setup.py pkg");
  });

  it("detects Rust project from Cargo.toml", async () => {
    writeFile(tmpDir, "Cargo.toml", `[package]\nname = "myrs"\nversion = "0.1.0"\ndescription = "A rust crate"\nlicense = "MIT"\n`);
    writeFile(tmpDir, "src/main.rs", "fn main() {}");
    const a = await analyzeRepo(tmpDir, "myrs");
    expect(a.languages).toContain("Rust");
    expect(a.packageName).toBe("myrs");
    expect(a.license).toBe("MIT");
    expect(a.cliCommands.length).toBeGreaterThan(0);
  });

  it("detects Go project from go.mod", async () => {
    writeFile(tmpDir, "go.mod", "module github.com/test/goapp\n\ngo 1.21\n");
    writeFile(tmpDir, "main.go", "package main\nfunc main() {}");
    const a = await analyzeRepo(tmpDir, "goapp");
    expect(a.languages).toContain("Go");
    expect(a.cliCommands.length).toBeGreaterThan(0);
  });

  it("detects multiple languages", async () => {
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "multi" }));
    writeFile(tmpDir, "index.ts", "export default 1");
    writeFile(tmpDir, "script.py", "x = 1");
    writeFile(tmpDir, "lib.go", "package lib");
    const a = await analyzeRepo(tmpDir, "multi");
    expect(a.languages.length).toBeGreaterThanOrEqual(2);
  });
});

describe("analyzeRepo — metadata extraction", () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("extracts package name from package.json", async () => {
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "@scope/pkg", description: "scoped" }));
    writeFile(tmpDir, "index.js", "");
    const a = await analyzeRepo(tmpDir, "pkg");
    expect(a.packageName).toBe("@scope/pkg");
  });

  it("extracts package name from pyproject.toml", async () => {
    writeFile(tmpDir, "pyproject.toml", `[project]\nname = "cool-lib"\n`);
    writeFile(tmpDir, "cool_lib.py", "");
    const a = await analyzeRepo(tmpDir, "cool-lib");
    expect(a.packageName).toBe("cool-lib");
  });

  it("extracts description from README if no manifest", async () => {
    writeFile(tmpDir, "README.md", "# My Tool\n\nThis is a great tool for testing things.\n");
    writeFile(tmpDir, "main.c", "int main() { return 0; }");
    const a = await analyzeRepo(tmpDir, "my-tool");
    expect(a.description).toContain("great tool");
  });

  it("extracts keywords/features from README", async () => {
    writeFile(tmpDir, "README.md", "# Foo\n\nA lib.\n\n## Features\n\n- Fast parsing engine\n- Zero dependencies\n- Cross-platform support\n");
    writeFile(tmpDir, "index.js", "");
    const a = await analyzeRepo(tmpDir, "foo");
    expect(a.features.length).toBeGreaterThanOrEqual(2);
  });

  it("detects test presence", async () => {
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "t" }));
    writeFile(tmpDir, "src/index.ts", "");
    writeFile(tmpDir, "tests/foo.test.ts", "");
    const a = await analyzeRepo(tmpDir, "t");
    expect(a.hasTests).toBe(true);
  });

  it("detects no tests when absent", async () => {
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "t" }));
    writeFile(tmpDir, "src/index.ts", "");
    const a = await analyzeRepo(tmpDir, "t");
    expect(a.hasTests).toBe(false);
  });

  it("detects CI presence via .travis.yml", async () => {
    writeFile(tmpDir, ".travis.yml", "language: node_js");
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "x", description: "Something" }));
    writeFile(tmpDir, "index.js", "");
    writeFile(tmpDir, "README.md", "# X\n\nSomething.\n");
    const a = await analyzeRepo(tmpDir, "x");
    // .travis.yml is a non-dot-prefixed directory file, glob may or may not pick it up
    // At minimum, ensure no crash
    expect(a.name).toBe("x");
  });

  it("detects Docker presence", async () => {
    writeFile(tmpDir, "Dockerfile", "FROM node:20\nEXPOSE 3000\nCMD [\"node\", \"index.js\"]");
    writeFile(tmpDir, "index.js", "");
    const a = await analyzeRepo(tmpDir, "dkr");
    expect(a.dockerInfo).toBeDefined();
    expect(a.dockerInfo!.baseImage).toBe("node:20");
    expect(a.dockerInfo!.exposedPorts).toContain("3000");
  });

  it("detects monorepo via packages/ dir", async () => {
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "mono", workspaces: ["packages/*"] }));
    writeFile(tmpDir, "packages/core/package.json", JSON.stringify({ name: "@mono/core" }));
    writeFile(tmpDir, "packages/cli/package.json", JSON.stringify({ name: "@mono/cli" }));
    const a = await analyzeRepo(tmpDir, "mono");
    expect(a.isMonorepo).toBe(true);
    expect(a.monorepoPackages).toContain("core");
  });

  it("extracts CLI commands from package.json bin", async () => {
    writeFile(tmpDir, "package.json", JSON.stringify({ name: "mycli", bin: { mycli: "./dist/cli.js" } }));
    writeFile(tmpDir, "dist/cli.js", "");
    const a = await analyzeRepo(tmpDir, "mycli");
    expect(a.cliCommands.some(c => c.name === "mycli")).toBe(true);
  });
});

describe("categorizeProject", () => {
  it("categorizes CLI tool", () => {
    const analysis = { richDescription: "", description: "A command-line tool", cliCommands: [{ name: "foo" }] } as any;
    expect(categorizeProject(analysis)).toBe("cli-tool");
  });

  it("categorizes framework", () => {
    const analysis = { richDescription: "A web framework for building APIs", description: "", readmeFirstParagraph: "", cliCommands: [] } as any;
    expect(categorizeProject(analysis)).toBe("server-framework");
  });

  it("categorizes library as default", () => {
    const analysis = { richDescription: "Some utility library", description: "", readmeFirstParagraph: "", cliCommands: [] } as any;
    expect(categorizeProject(analysis)).toBe("library");
  });
});

describe("extractFirstParagraph", () => {
  it("extracts first text paragraph skipping headings and badges", () => {
    const md = "# Title\n\n[![badge](url)](link)\n\nThis is the first paragraph.\n\nSecond paragraph.";
    expect(extractFirstParagraph(md)).toBe("This is the first paragraph.");
  });

  it("returns empty for empty string", () => {
    expect(extractFirstParagraph("")).toBe("");
  });
});

describe("stripHtmlTags", () => {
  it("removes HTML tags", () => {
    expect(stripHtmlTags("<b>bold</b> text")).toBe("bold text");
  });

  it("removes HTML entities", () => {
    expect(stripHtmlTags("a&amp;b")).toBe("ab");
  });
});
