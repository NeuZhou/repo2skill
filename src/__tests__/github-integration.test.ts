import { describe, it, expect } from "vitest";
import { parseOwnerRepo, formatGitHubSection, GitHubMetadata } from "../github-integration";

describe("parseOwnerRepo", () => {
  it("parses owner/repo format", () => {
    expect(parseOwnerRepo("NeuZhou/repo2skill")).toEqual({ owner: "NeuZhou", repo: "repo2skill" });
  });

  it("parses GitHub URL", () => {
    expect(parseOwnerRepo("https://github.com/NeuZhou/repo2skill")).toEqual({ owner: "NeuZhou", repo: "repo2skill" });
  });

  it("parses GitHub URL with .git", () => {
    expect(parseOwnerRepo("https://github.com/NeuZhou/repo2skill.git")).toEqual({ owner: "NeuZhou", repo: "repo2skill" });
  });

  it("returns null for invalid format", () => {
    expect(parseOwnerRepo("just-a-name")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseOwnerRepo("")).toBeNull();
  });
});

describe("formatGitHubSection", () => {
  const meta: GitHubMetadata = {
    stars: 1234,
    forks: 56,
    openIssues: 10,
    lastCommitDate: "2025-12-01T10:00:00Z",
    latestRelease: "v2.1.0",
    license: "MIT",
    topics: ["cli", "typescript", "ai"],
    contributorsCount: 5,
    description: "A test project",
    language: "TypeScript",
    defaultBranch: "main",
  };

  it("includes star count", () => {
    const result = formatGitHubSection(meta);
    expect(result).toContain("1,234");
    expect(result).toContain("Stars");
  });

  it("includes fork count", () => {
    expect(formatGitHubSection(meta)).toContain("56");
  });

  it("includes latest release", () => {
    expect(formatGitHubSection(meta)).toContain("v2.1.0");
  });

  it("includes license", () => {
    expect(formatGitHubSection(meta)).toContain("MIT");
  });

  it("includes topics", () => {
    expect(formatGitHubSection(meta)).toContain("cli, typescript, ai");
  });

  it("includes contributors count", () => {
    expect(formatGitHubSection(meta)).toContain("5+");
  });

  it("includes last updated date", () => {
    expect(formatGitHubSection(meta)).toContain("2025-12-01");
  });

  it("omits release if null", () => {
    const noRelease = { ...meta, latestRelease: null };
    expect(formatGitHubSection(noRelease)).not.toContain("Latest Release");
  });

  it("omits topics if empty", () => {
    const noTopics = { ...meta, topics: [] };
    expect(formatGitHubSection(noTopics)).not.toContain("Topics");
  });
});
