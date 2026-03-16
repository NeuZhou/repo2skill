import { describe, it, expect } from "vitest";
import { categorizeCommit, formatChangelog, Changelog, ChangelogEntry } from "../changelog";

describe("categorizeCommit", () => {
  it("detects feat: commits", () => {
    expect(categorizeCommit("feat: add new feature")).toBe("feature");
    expect(categorizeCommit("feat(core): new thing")).toBe("feature");
    expect(categorizeCommit("feat!: breaking change")).toBe("feature");
  });

  it("detects fix: commits", () => {
    expect(categorizeCommit("fix: resolve bug")).toBe("fix");
    expect(categorizeCommit("fix(ui): fix crash")).toBe("fix");
  });

  it("detects docs: commits", () => {
    expect(categorizeCommit("docs: update readme")).toBe("docs");
    expect(categorizeCommit("doc(api): add examples")).toBe("docs");
  });

  it("detects refactor commits", () => {
    expect(categorizeCommit("refactor: clean up code")).toBe("refactor");
    expect(categorizeCommit("refactor(core): simplify")).toBe("refactor");
  });

  it("detects test commits", () => {
    expect(categorizeCommit("test: add unit tests")).toBe("test");
    expect(categorizeCommit("test(api): coverage")).toBe("test");
  });

  it("detects chore commits", () => {
    expect(categorizeCommit("chore: bump deps")).toBe("chore");
    expect(categorizeCommit("chore(ci): update workflow")).toBe("chore");
  });

  it("detects add/fix/update patterns", () => {
    expect(categorizeCommit("added new endpoint")).toBe("feature");
    expect(categorizeCommit("fixed memory leak")).toBe("fix");
    expect(categorizeCommit("updated configuration")).toBe("feature");
    expect(categorizeCommit("removes old API")).toBe("feature");
    expect(categorizeCommit("improved performance")).toBe("feature");
  });

  it("returns other for unrecognized", () => {
    expect(categorizeCommit("initial commit")).toBe("other");
    expect(categorizeCommit("v1.0.0")).toBe("other");
    expect(categorizeCommit("WIP")).toBe("other");
  });
});

describe("formatChangelog", () => {
  it("formats a changelog with grouped entries", () => {
    const changelog: Changelog = {
      repo: "test-repo",
      entries: [
        { hash: "abc1234", date: "2024-01-15", message: "feat: add new feature", category: "feature" },
        { hash: "def5678", date: "2024-01-14", message: "fix: resolve crash", category: "fix" },
        { hash: "ghi9012", date: "2024-01-13", message: "docs: update readme", category: "docs" },
      ],
      summary: "test-repo: 3 commits (1 features, 1 fixes)",
    };
    const output = formatChangelog(changelog);
    expect(output).toContain("test-repo");
    expect(output).toContain("abc1234");
    expect(output).toContain("add new feature");
    expect(output).toContain("resolve crash");
    expect(output).toContain("Feature (1)");
    expect(output).toContain("Fix (1)");
  });

  it("handles empty changelog", () => {
    const changelog: Changelog = {
      repo: "empty-repo",
      entries: [],
      summary: "empty-repo: 0 commits (0 features, 0 fixes)",
    };
    const output = formatChangelog(changelog);
    expect(output).toContain("empty-repo");
    expect(output).toContain("0 commits");
  });
});
