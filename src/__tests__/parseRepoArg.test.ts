/**
 * Tests for parseRepoArg — URL/repo argument parsing.
 */

import { describe, it, expect } from "vitest";
import { parseRepoArg } from "../index";

describe("parseRepoArg", () => {
  it("parses full GitHub HTTPS URL", () => {
    const result = parseRepoArg("https://github.com/facebook/react");
    expect(result.url).toBe("https://github.com/facebook/react");
    expect(result.name).toBe("react");
  });

  it("strips .git suffix from URL", () => {
    const result = parseRepoArg("https://github.com/facebook/react.git");
    expect(result.url).toBe("https://github.com/facebook/react.git");
    expect(result.name).toBe("react");
  });

  it("parses owner/repo shorthand", () => {
    const result = parseRepoArg("sindresorhus/got");
    expect(result.url).toBe("https://github.com/sindresorhus/got");
    expect(result.name).toBe("got");
  });

  it("throws on plain string without slash", () => {
    expect(() => parseRepoArg("justarepo")).toThrow(/Invalid repo/);
  });

  it("throws on empty string", () => {
    expect(() => parseRepoArg("")).toThrow(/Invalid repo/);
  });

  it("handles HTTP (non-HTTPS) URL", () => {
    const result = parseRepoArg("http://github.com/user/repo");
    expect(result.url).toBe("http://github.com/user/repo");
    expect(result.name).toBe("repo");
  });

  it("handles scoped-like owner/repo with hyphens", () => {
    const result = parseRepoArg("my-org/my-cool-repo");
    expect(result.url).toBe("https://github.com/my-org/my-cool-repo");
    expect(result.name).toBe("my-cool-repo");
  });

  it("handles owner/repo with dots in repo name", () => {
    const result = parseRepoArg("user/repo.js");
    expect(result.url).toBe("https://github.com/user/repo.js");
    expect(result.name).toBe("repo.js");
  });

  it("rejects triple-slash paths (not valid GitHub shorthand)", () => {
    expect(() => parseRepoArg("org/sub/repo")).toThrow(/Invalid repo/);
  });
});
