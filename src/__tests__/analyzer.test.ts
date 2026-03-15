import { describe, it, expect } from "vitest";
import { stripHtmlTags, extractFirstParagraph, categorizeProject, RepoAnalysis } from "../analyzer";

describe("stripHtmlTags", () => {
  it("removes HTML tags", () => {
    expect(stripHtmlTags("<b>hello</b> world")).toBe("hello world");
  });

  it("removes HTML entities", () => {
    expect(stripHtmlTags("foo &amp; bar")).toBe("foo bar");
  });

  it("collapses whitespace", () => {
    expect(stripHtmlTags("hello   \n  world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("handles nested tags", () => {
    expect(stripHtmlTags("<div><span>text</span></div>")).toBe("text");
  });
});

describe("extractFirstParagraph", () => {
  it("extracts paragraph after heading", () => {
    const readme = "# My Project\n\nThis is the description.\n\nMore stuff.";
    expect(extractFirstParagraph(readme)).toBe("This is the description.");
  });

  it("skips badges and images", () => {
    const readme = "# Title\n\n![badge](url)\n[link](url)\n\nActual description here.\n";
    expect(extractFirstParagraph(readme)).toBe("Actual description here.");
  });

  it("skips HTML blocks", () => {
    const readme = "# Title\n\n<p align=\"center\">\n<img src=\"logo.png\" />\n</p>\n\nReal paragraph.\n";
    expect(extractFirstParagraph(readme)).toBe("Real paragraph.");
  });

  it("handles multiline paragraph", () => {
    const readme = "# Title\n\nFirst line of\nthe paragraph.\n\nNext para.";
    expect(extractFirstParagraph(readme)).toBe("First line of the paragraph.");
  });

  it("truncates to 300 chars", () => {
    const longPara = "# T\n\n" + "a".repeat(400) + "\n\nDone.";
    expect(extractFirstParagraph(longPara).length).toBeLessThanOrEqual(300);
  });

  it("handles empty readme", () => {
    expect(extractFirstParagraph("")).toBe("");
  });
});

describe("categorizeProject", () => {
  function makeAnalysis(overrides: Partial<RepoAnalysis>): RepoAnalysis {
    return {
      name: "test",
      description: "",
      richDescription: "",
      whenToUse: [],
      whenNotToUse: [],
      triggerPhrases: [],
      language: "typescript",
      languages: ["typescript"],
      cliCommands: [],
      installInstructions: "",
      usageSection: "",
      usageExamples: [],
      apiSection: "",
      examplesSection: "",
      readmeRaw: "",
      readmeFirstParagraph: "",
      dependencies: [],
      entryPoints: [],
      hasTests: false,
      license: "MIT",
      sections: {},
      fileTree: "",
      ...overrides,
    };
  }

  it("detects CLI tool", () => {
    expect(categorizeProject(makeAnalysis({ description: "A command-line utility" }))).toBe("cli-tool");
  });

  it("detects server framework", () => {
    expect(categorizeProject(makeAnalysis({ description: "A fast web framework for Node.js" }))).toBe("server-framework");
  });

  it("detects HTTP client", () => {
    expect(categorizeProject(makeAnalysis({ description: "Human-friendly HTTP client" }))).toBe("http-client");
  });

  it("detects library by default", () => {
    expect(categorizeProject(makeAnalysis({ description: "Some random thing" }))).toBe("library");
  });

  it("detects CLI from commands", () => {
    expect(categorizeProject(makeAnalysis({ cliCommands: [{ name: "mycli" }] }))).toBe("cli-tool");
  });
});
