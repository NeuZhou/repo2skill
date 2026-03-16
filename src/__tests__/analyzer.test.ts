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

  it("handles self-closing tags", () => {
    expect(stripHtmlTags("before<br/>after")).toBe("beforeafter");
  });

  it("handles multiple entities", () => {
    expect(stripHtmlTags("&lt;hello&gt; &amp; &quot;world&quot;")).toBe("hello world");
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

  it("handles readme with only headings", () => {
    expect(extractFirstParagraph("# Title\n## Subtitle\n### Section")).toBe("");
  });

  it("handles readme with separator lines", () => {
    const readme = "# Title\n\n---\n\nContent after separator.";
    expect(extractFirstParagraph(readme)).toBe("Content after separator.");
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
      configSection: "",
      features: [],
      isMonorepo: false,
      monorepoPackages: [],
      keyApi: [],
      packageName: "",
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

  it("detects framework", () => {
    expect(categorizeProject(makeAnalysis({ description: "A modern UI framework" }))).toBe("framework");
  });

  it("detects tool from description", () => {
    expect(categorizeProject(makeAnalysis({ description: "A developer toolkit for testing" }))).toBe("tool");
  });

  it("detects api framework", () => {
    expect(categorizeProject(makeAnalysis({ description: "A blazing fast API framework" }))).toBe("server-framework");
  });

  it("detects http server", () => {
    expect(categorizeProject(makeAnalysis({ description: "An HTTP server implementation" }))).toBe("server-framework");
  });

  it("detects library from utility keyword", () => {
    expect(categorizeProject(makeAnalysis({ description: "A collection of utilities for strings" }))).toBe("library");
  });

  // Ruby gemspec parsing test
  it("handles Ruby gemspec project", () => {
    const analysis = makeAnalysis({
      description: "A Ruby web framework",
      language: "Ruby",
      languages: ["Ruby"],
      installInstructions: "gem install rails",
    });
    expect(categorizeProject(analysis)).toBe("server-framework");
  });

  // Java/Maven project
  it("handles Java/Maven project", () => {
    const analysis = makeAnalysis({
      description: "A Java library for JSON processing",
      language: "Java",
      languages: ["Java"],
      dependencies: ["com.fasterxml.jackson:jackson-core"],
    });
    expect(categorizeProject(analysis)).toBe("library");
  });

  // Go project
  it("handles Go CLI project", () => {
    const analysis = makeAnalysis({
      description: "A Go command-line tool for file management",
      language: "Go",
      languages: ["Go"],
      cliCommands: [{ name: "filetool" }],
    });
    expect(categorizeProject(analysis)).toBe("cli-tool");
  });

  // Monorepo
  it("handles monorepo project", () => {
    const analysis = makeAnalysis({
      description: "A monorepo utility library",
      isMonorepo: true,
      monorepoPackages: ["core", "cli", "web"],
    });
    expect(categorizeProject(analysis)).toBe("library");
  });

  it("prefers server-framework over CLI when both present", () => {
    const analysis = makeAnalysis({
      description: "A web server with CLI utilities",
      cliCommands: [{ name: "serve" }],
    });
    expect(categorizeProject(analysis)).toBe("server-framework");
  });

  it("detects fetch-based client", () => {
    expect(categorizeProject(makeAnalysis({ description: "A fetch wrapper for browsers" }))).toBe("http-client");
  });

  it("detects request library", () => {
    expect(categorizeProject(makeAnalysis({ description: "A request library for Python" }))).toBe("http-client");
  });
});
