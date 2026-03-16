import { describe, it, expect } from "vitest";
import { aiEnhance, isAiAvailable } from "../ai-enhance";

describe("isAiAvailable", () => {
  it("returns false when no API key", () => {
    const orig = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(isAiAvailable()).toBe(false);
    if (orig) process.env.OPENAI_API_KEY = orig;
  });

  it("returns true with explicit API key option", () => {
    expect(isAiAvailable({ apiKey: "sk-test" })).toBe(true);
  });

  it("returns true with env var", () => {
    const orig = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-env-test";
    expect(isAiAvailable()).toBe(true);
    if (orig) process.env.OPENAI_API_KEY = orig;
    else delete process.env.OPENAI_API_KEY;
  });
});

describe("aiEnhance", () => {
  it("falls back gracefully without API key", async () => {
    const orig = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await aiEnhance("test-skill", "A test tool", ["feature1"], "TypeScript", "# Test");
    expect(result.enhanced).toBe(false);
    expect(result.description).toBe("A test tool");
    if (orig) process.env.OPENAI_API_KEY = orig;
  });

  it("returns original data on failure", async () => {
    const result = await aiEnhance(
      "test-skill",
      "Original desc",
      ["f1"],
      "Python",
      "readme",
      { apiKey: "sk-invalid", baseUrl: "http://localhost:1/v1" },
    );
    expect(result.enhanced).toBe(false);
    expect(result.description).toBe("Original desc");
  });
});
