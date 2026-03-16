import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registryAdd, registryRemove, registryList, registryClear, loadRegistry, saveRegistry, getRegistryPath } from "../registry";
import * as fs from "fs";
import * as path from "path";

// Override registry path for tests
const origPath = getRegistryPath();
const testRegistryDir = path.join(process.env.TEMP || "/tmp", `repo2skill-reg-test-${Date.now()}`);
const testRegistryFile = path.join(testRegistryDir, "registry.json");

// We'll manipulate the file directly for isolation
beforeEach(() => {
  fs.mkdirSync(testRegistryDir, { recursive: true });
  // Clear by writing empty registry
  fs.writeFileSync(testRegistryFile, JSON.stringify({ entries: [] }));
});

afterEach(() => {
  fs.rmSync(testRegistryDir, { recursive: true, force: true });
});

// Note: These tests use the real registry path (~/.repo2skill/registry.json)
// We save/restore to avoid polluting it
describe("registry", () => {
  let savedRegistry: string | null = null;

  beforeEach(() => {
    const regPath = getRegistryPath();
    if (fs.existsSync(regPath)) {
      savedRegistry = fs.readFileSync(regPath, "utf-8");
    }
    // Clear for test
    saveRegistry({ entries: [] });
  });

  afterEach(() => {
    if (savedRegistry !== null) {
      const regPath = getRegistryPath();
      fs.mkdirSync(path.dirname(regPath), { recursive: true });
      fs.writeFileSync(regPath, savedRegistry);
    } else {
      const regPath = getRegistryPath();
      if (fs.existsSync(regPath)) fs.unlinkSync(regPath);
    }
  });

  it("starts with empty registry", () => {
    expect(registryList()).toEqual([]);
  });

  it("adds an entry", () => {
    registryAdd("owner/repo", "/tmp/skills/repo");
    const list = registryList();
    expect(list).toHaveLength(1);
    expect(list[0].repo).toBe("owner/repo");
  });

  it("updates existing entry", () => {
    registryAdd("owner/repo", "/tmp/skills/repo");
    registryAdd("owner/repo", "/tmp/skills/repo-v2");
    const list = registryList();
    expect(list).toHaveLength(1);
    expect(list[0].skillDir).toContain("repo-v2");
  });

  it("removes an entry", () => {
    registryAdd("owner/repo", "/tmp/skills/repo");
    expect(registryRemove("owner/repo")).toBe(true);
    expect(registryList()).toHaveLength(0);
  });

  it("returns false when removing non-existent", () => {
    expect(registryRemove("nonexistent/repo")).toBe(false);
  });

  it("clears all entries", () => {
    registryAdd("a/b", "/tmp/a");
    registryAdd("c/d", "/tmp/c");
    registryClear();
    expect(registryList()).toHaveLength(0);
  });

  it("stores template info", () => {
    registryAdd("owner/repo", "/tmp/skills/repo", "minimal");
    expect(registryList()[0].template).toBe("minimal");
  });

  it("stores generatedAt timestamp", () => {
    registryAdd("owner/repo", "/tmp/skills/repo");
    const entry = registryList()[0];
    expect(entry.generatedAt).toBeTruthy();
    expect(new Date(entry.generatedAt).getTime()).toBeGreaterThan(0);
  });
});
