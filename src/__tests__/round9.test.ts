/**
 * Round 9 Tests — v3.5.0
 * Tests for: languages.ts, readme-parser.ts, enhanced monorepo.ts
 */

import { describe, test, expect } from "vitest";
import {
  LANGUAGE_CONFIGS,
  detectLanguages,
  detectLanguagesFromRepo,
  getLanguageContext,
  getInstallCommand,
} from "../languages";
import {
  parseReadme,
  ReadmeInfo,
} from "../readme-parser";
import {
  detectMonorepo,
  formatMonorepoDetection,
  packageSkillName,
} from "../monorepo";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// ========== languages.ts tests ==========

describe("LANGUAGE_CONFIGS", () => {
  test("should have 20+ language configurations", () => {
    expect(Object.keys(LANGUAGE_CONFIGS).length).toBeGreaterThanOrEqual(20);
  });

  test("each config has required fields", () => {
    for (const [key, config] of Object.entries(LANGUAGE_CONFIGS)) {
      expect(config.name).toBeTruthy();
      expect(config.extensions.length).toBeGreaterThan(0);
      expect(config.packageFiles.length).toBeGreaterThan(0);
      expect(config.entryPoints.length).toBeGreaterThan(0);
    }
  });

  test("all extensions start with dot", () => {
    for (const config of Object.values(LANGUAGE_CONFIGS)) {
      for (const ext of config.extensions) {
        expect(ext).toMatch(/^\./);
      }
    }
  });
});

describe("detectLanguages", () => {
  test("detects TypeScript from .ts files", () => {
    const files = ["src/index.ts", "src/cli.ts", "src/utils.ts", "package.json"];
    const profiles = detectLanguages(files);
    expect(profiles[0].language).toBe("TypeScript");
    expect(profiles[0].fileCount).toBe(3);
  });

  test("detects Python from .py files", () => {
    const files = ["main.py", "app.py", "tests/test_main.py"];
    const profiles = detectLanguages(files);
    expect(profiles[0].language).toBe("Python");
  });

  test("detects multiple languages sorted by count", () => {
    const files = [
      "src/main.rs", "src/lib.rs",
      "scripts/build.py",
      "index.js",
    ];
    const profiles = detectLanguages(files);
    expect(profiles[0].language).toBe("Rust");
    expect(profiles.length).toBeGreaterThanOrEqual(3);
  });

  test("returns empty for non-source files", () => {
    const files = ["README.md", "LICENSE", ".gitignore"];
    const profiles = detectLanguages(files);
    expect(profiles).toHaveLength(0);
  });

  test("detects Swift files", () => {
    const profiles = detectLanguages(["Sources/main.swift", "Sources/App.swift"]);
    expect(profiles[0].language).toBe("Swift");
  });

  test("detects C# files", () => {
    const profiles = detectLanguages(["Program.cs", "Startup.cs", "Models/User.cs"]);
    expect(profiles[0].language).toBe("C#");
  });

  test("detects Elixir files", () => {
    const profiles = detectLanguages(["lib/app.ex", "test/app_test.exs"]);
    expect(profiles[0].language).toBe("Elixir");
  });
});

describe("detectLanguagesFromRepo", () => {
  test("detects manifest for TypeScript repo", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lang-test-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "package.json"), '{"name":"test"}');
      fs.mkdirSync(path.join(tmpDir, "src"));
      fs.writeFileSync(path.join(tmpDir, "src", "index.ts"), "export const x = 1;");
      const files = ["package.json", "src/index.ts"];
      const profiles = detectLanguagesFromRepo(tmpDir, files);
      expect(profiles[0].language).toBe("TypeScript");
      expect(profiles[0].hasManifest).toBe(true);
      expect(profiles[0].detectedEntryPoints).toContain("src/index.ts");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("getLanguageContext", () => {
  test("generates context string for a profile", () => {
    const profile = {
      language: "TypeScript",
      fileCount: 10,
      percentage: 80,
      hasManifest: true,
      packageManager: "npm",
      detectedEntryPoints: ["src/index.ts"],
    };
    const ctx = getLanguageContext(profile);
    expect(ctx).toContain("TypeScript");
    expect(ctx).toContain("npm");
    expect(ctx).toContain("src/index.ts");
  });
});

describe("getInstallCommand", () => {
  test("returns npm install for TypeScript", () => {
    expect(getInstallCommand("TypeScript", "my-pkg")).toBe("npm install my-pkg");
  });

  test("returns pip install for Python", () => {
    expect(getInstallCommand("Python", "my-pkg")).toBe("pip install my-pkg");
  });

  test("returns cargo install for Rust", () => {
    expect(getInstallCommand("Rust", "my-pkg")).toBe("cargo install my-pkg");
  });

  test("returns null for unknown language", () => {
    expect(getInstallCommand("Brainfuck", "test")).toBeNull();
  });

  test("returns dotnet add for C#", () => {
    expect(getInstallCommand("C#", "Newtonsoft.Json")).toBe("dotnet add package Newtonsoft.Json");
  });
});

// ========== readme-parser.ts tests ==========

describe("parseReadme", () => {
  test("extracts title from H1 heading", () => {
    const info = parseReadme("# My Cool Project\n\nSome description.");
    expect(info.title).toBe("My Cool Project");
  });

  test("extracts description from first paragraph", () => {
    const info = parseReadme("# Title\n\nThis is a great project that does things.\n\n## Features\n- One\n- Two");
    expect(info.description).toContain("great project");
  });

  test("extracts install commands from code blocks", () => {
    const readme = `# Test
## Install
\`\`\`bash
npm install my-package
pip install other-package
\`\`\``;
    const info = parseReadme(readme);
    expect(info.installCommands.length).toBe(2);
    expect(info.installCommands[0].manager).toBe("npm");
    expect(info.installCommands[1].manager).toBe("pip");
  });

  test("extracts badges", () => {
    const readme = `# Test
[![npm](https://img.shields.io/npm/v/pkg)](https://npmjs.com/pkg)
[![CI](https://github.com/user/repo/actions/badge.svg)](https://github.com/user/repo)`;
    const info = parseReadme(readme);
    expect(info.badges.length).toBe(2);
    expect(info.badges[0].type).toBe("npm");
  });

  test("extracts features from features section", () => {
    const readme = `# Test
## Features
- Fast and lightweight processing engine
- Full TypeScript support with type safety
- Plugin system for extensibility`;
    const info = parseReadme(readme);
    expect(info.features.length).toBe(3);
    expect(info.features[0]).toContain("Fast");
  });

  test("extracts usage examples", () => {
    const readme = `# Test
## Usage
\`\`\`typescript
import { thing } from 'my-lib';
const result = thing.doStuff();
console.log(result);
\`\`\``;
    const info = parseReadme(readme);
    expect(info.usageExamples.length).toBeGreaterThanOrEqual(1);
    expect(info.usageExamples[0].language).toBe("typescript");
  });

  test("detects table of contents", () => {
    const readme = `# Test
## Table of Contents
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [License](#license)`;
    const info = parseReadme(readme);
    expect(info.hasTOC).toBe(true);
  });

  test("extracts environment variables", () => {
    const readme = `# Test
\`\`\`bash
export $OPENAI_API_KEY
echo $DATABASE_URL
\`\`\``;
    const info = parseReadme(readme);
    expect(info.envVars).toContain("OPENAI_API_KEY");
    expect(info.envVars).toContain("DATABASE_URL");
  });

  test("returns empty info for empty content", () => {
    const info = parseReadme("");
    expect(info.title).toBe("");
    expect(info.sections).toHaveLength(0);
  });

  test("extracts links from content", () => {
    const readme = `# Test
Check the [documentation](https://docs.example.com) and [API reference](https://api.example.com).`;
    const info = parseReadme(readme);
    expect(info.links.length).toBe(2);
    expect(info.links[0].text).toBe("documentation");
  });

  test("extracts prerequisites", () => {
    const readme = `# Test
## Prerequisites
- Node.js >= 18
- npm >= 9
- Git installed`;
    const info = parseReadme(readme);
    expect(info.prerequisites.length).toBe(3);
  });
});

// ========== monorepo.ts tests ==========

describe("packageSkillName", () => {
  test("generates clean skill name from package", () => {
    expect(packageSkillName("core")).toBe("skill-core.md");
  });

  test("strips scoped package prefix", () => {
    expect(packageSkillName("@myorg/core")).toBe("skill-core.md");
  });

  test("sanitizes special characters", () => {
    expect(packageSkillName("my.weird+pkg")).toBe("skill-my-weird-pkg.md");
  });
});

describe("formatMonorepoDetection", () => {
  test("formats non-monorepo result", () => {
    const result = formatMonorepoDetection({ isMonorepo: false, packages: [] });
    expect(result).toContain("Not a monorepo");
  });

  test("formats monorepo with packages", () => {
    const result = formatMonorepoDetection({
      isMonorepo: true,
      tool: "npm-workspaces",
      packages: [
        { name: "@my/core", path: "/tmp/core", relativePath: "packages/core", hasPackageJson: true, description: "Core lib" },
        { name: "@my/cli", path: "/tmp/cli", relativePath: "packages/cli", hasPackageJson: true },
      ],
    });
    expect(result).toContain("2 packages");
    expect(result).toContain("npm-workspaces");
    expect(result).toContain("packages/core");
    expect(result).toContain("Core lib");
  });
});

describe("detectMonorepo", () => {
  test("detects npm workspaces monorepo", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mono-test-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({
        name: "my-monorepo",
        workspaces: ["packages/*"],
      }));
      fs.mkdirSync(path.join(tmpDir, "packages", "core"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "packages", "core", "package.json"), JSON.stringify({ name: "@my/core" }));
      fs.mkdirSync(path.join(tmpDir, "packages", "cli"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "packages", "cli", "package.json"), JSON.stringify({ name: "@my/cli" }));

      const result = await detectMonorepo(tmpDir);
      expect(result.isMonorepo).toBe(true);
      expect(result.packages.length).toBe(2);
      expect(result.tool).toBe("npm-workspaces");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("detects non-monorepo for single package", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mono-test-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "single-pkg" }));
      const result = await detectMonorepo(tmpDir);
      expect(result.isMonorepo).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
