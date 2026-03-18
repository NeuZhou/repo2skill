/**
 * Tests for repo2skillLocal edge cases
 */

import { describe, it, expect } from "vitest";
import { repo2skillLocal } from "../index";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("repo2skillLocal", () => {
  it("throws on non-existent path", async () => {
    await expect(
      repo2skillLocal("/nonexistent/path/that/should/not/exist", {
        outputDir: os.tmpdir(),
      })
    ).rejects.toThrow(/not found/i);
  });

  it("throws when path is a file, not a directory", async () => {
    const tmpFile = path.join(os.tmpdir(), `repo2skill-test-file-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, "not a directory");
    try {
      await expect(
        repo2skillLocal(tmpFile, { outputDir: os.tmpdir() })
      ).rejects.toThrow(/Not a directory/i);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("generates skill from a minimal local directory", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r2s-local-"));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "r2s-out-"));
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# TestProject\n\nA small test project.\n\n## Features\n- Fast\n- Simple\n- Clean");
    fs.writeFileSync(path.join(tmpDir, "index.js"), "module.exports = {}");

    try {
      const result = await repo2skillLocal(tmpDir, { outputDir: outDir });
      expect(result.skillDir).toBeTruthy();
      expect(fs.existsSync(path.join(result.skillDir, "SKILL.md"))).toBe(true);
      const content = fs.readFileSync(path.join(result.skillDir, "SKILL.md"), "utf-8");
      expect(content).toContain("small test project");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});
