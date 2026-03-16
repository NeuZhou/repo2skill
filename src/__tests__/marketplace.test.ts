import { describe, it, expect } from "vitest";
import { extractMarketplaceMetadata, generateMarketplaceJson } from "../marketplace";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function createTmpSkill(content: string): string {
  const dir = path.join(os.tmpdir(), `marketplace-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(dir, { recursive: true });
  const skillPath = path.join(dir, "SKILL.md");
  fs.writeFileSync(skillPath, content);
  return skillPath;
}

const sampleSkill = `---
description: A great CLI tool for testing
version: 2.0.0
author: Test Author
source_repo: owner/repo
---

# test-skill

> A great CLI tool for testing

**Language:** TypeScript
**License:** MIT

## Features
- Fast execution
- Type-safe API
- Plugin system
`;

describe("extractMarketplaceMetadata", () => {
  it("extracts metadata from SKILL.md", () => {
    const skillPath = createTmpSkill(sampleSkill);
    try {
      const meta = extractMarketplaceMetadata(skillPath);
      expect(meta.name).toBe("test-skill");
      expect(meta.description).toContain("CLI tool");
      expect(meta.version).toBe("2.0.0");
      expect(meta.author).toBe("Test Author");
      expect(meta.license).toBe("MIT");
      expect(meta.language).toBe("TypeScript");
      expect(meta.source).toBe("owner/repo");
      expect(meta.tags.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(path.dirname(skillPath), { recursive: true, force: true });
    }
  });

  it("throws for missing file", () => {
    expect(() => extractMarketplaceMetadata("/nonexistent/SKILL.md")).toThrow();
  });

  it("handles minimal SKILL.md", () => {
    const skillPath = createTmpSkill("# minimal\nJust a title.");
    try {
      const meta = extractMarketplaceMetadata(skillPath);
      expect(meta.name).toBe("minimal");
      expect(meta.version).toBe("1.0.0"); // default
    } finally {
      fs.rmSync(path.dirname(skillPath), { recursive: true, force: true });
    }
  });
});

describe("generateMarketplaceJson", () => {
  it("creates marketplace.json alongside SKILL.md", () => {
    const skillPath = createTmpSkill(sampleSkill);
    try {
      const jsonPath = generateMarketplaceJson(skillPath);
      expect(fs.existsSync(jsonPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      expect(data.name).toBe("test-skill");
      expect(data.tags).toBeInstanceOf(Array);
    } finally {
      fs.rmSync(path.dirname(skillPath), { recursive: true, force: true });
    }
  });
});
