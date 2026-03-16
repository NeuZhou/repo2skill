import { describe, it, expect } from "vitest";
import { stripHtmlTags, extractFirstParagraph, categorizeProject, RepoAnalysis } from "../analyzer";
import { scoreSkillQuality, formatQualityScore, buildStructuredData } from "../generator";

// Helper to create a test analysis object
function makeAnalysis(overrides: Partial<RepoAnalysis> = {}): RepoAnalysis {
  return {
    name: "test-project",
    description: "",
    richDescription: "",
    whenToUse: [],
    whenNotToUse: [],
    triggerPhrases: [],
    language: "TypeScript",
    languages: ["TypeScript"],
    cliCommands: [],
    installInstructions: "",
    usageSection: "",
    usageExamples: [],
    configSection: "",
    features: [],
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
    isMonorepo: false,
    monorepoPackages: [],
    keyApi: [],
    packageName: "",
    readmeInstallCommands: [],
    readmeApiExamples: [],
    badges: [],
    toc: [],
    ...overrides,
  };
}

// ============================================================
// stripHtmlTags
// ============================================================
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

// ============================================================
// extractFirstParagraph
// ============================================================
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

// ============================================================
// categorizeProject
// ============================================================
describe("categorizeProject", () => {
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

  it("handles Ruby gemspec project", () => {
    expect(categorizeProject(makeAnalysis({
      description: "A Ruby web framework",
      language: "Ruby",
      languages: ["Ruby"],
    }))).toBe("server-framework");
  });

  it("handles Java/Maven project", () => {
    expect(categorizeProject(makeAnalysis({
      description: "A Java library for JSON processing",
      language: "Java",
      languages: ["Java"],
    }))).toBe("library");
  });

  it("handles Go CLI project", () => {
    expect(categorizeProject(makeAnalysis({
      description: "A Go command-line tool for file management",
      language: "Go",
      languages: ["Go"],
      cliCommands: [{ name: "filetool" }],
    }))).toBe("cli-tool");
  });

  it("handles monorepo project", () => {
    expect(categorizeProject(makeAnalysis({
      description: "A monorepo utility library",
      isMonorepo: true,
      monorepoPackages: ["core", "cli", "web"],
    }))).toBe("library");
  });

  it("prefers server-framework over CLI when both present", () => {
    expect(categorizeProject(makeAnalysis({
      description: "A web server with CLI utilities",
      cliCommands: [{ name: "serve" }],
    }))).toBe("server-framework");
  });

  it("detects fetch-based client", () => {
    expect(categorizeProject(makeAnalysis({ description: "A fetch wrapper for browsers" }))).toBe("http-client");
  });

  it("detects request library", () => {
    expect(categorizeProject(makeAnalysis({ description: "A request library for Python" }))).toBe("http-client");
  });
});

// ============================================================
// scoreSkillQuality — NEW 100-point scale
// ============================================================
describe("scoreSkillQuality", () => {
  it("returns 0/100 for empty analysis", () => {
    const q = scoreSkillQuality(makeAnalysis());
    // Only "Has category" is always 10
    expect(q.score).toBe(10);
    expect(q.maxScore).toBe(100);
  });

  it("gives full score for complete analysis", () => {
    const q = scoreSkillQuality(makeAnalysis({
      description: "A great tool",
      richDescription: "A great tool for doing things",
      installInstructions: "npm install great-tool",
      usageExamples: ["```js\nimport x\n```", "```js\nfoo()\n```", "```js\nbar()\n```"],
      features: ["Fast", "Reliable", "Easy"],
      apiSection: "## API\nsome docs",
      keyApi: ["createApp", "run"],
      whenToUse: ["Build apps"],
      whenNotToUse: ["Legacy systems"],
      hasTests: true,
    }));
    expect(q.score).toBe(100);
    expect(q.maxScore).toBe(100);
  });

  it("partial score for usage examples", () => {
    const q1 = scoreSkillQuality(makeAnalysis({ usageExamples: ["```\ncode\n```"] }));
    const q3 = scoreSkillQuality(makeAnalysis({ usageExamples: ["```a```", "```b```", "```c```"] }));
    // 1 example = 10, 3+ = 15
    expect(q1.details.find(d => d.label === "Has examples")!.score).toBe(10);
    expect(q3.details.find(d => d.label === "Has examples")!.score).toBe(15);
  });

  it("partial score for features", () => {
    const q1 = scoreSkillQuality(makeAnalysis({ features: ["One"] }));
    const q3 = scoreSkillQuality(makeAnalysis({ features: ["A", "B", "C"] }));
    expect(q1.details.find(d => d.label === "Has features list")!.score).toBe(5);
    expect(q3.details.find(d => d.label === "Has features list")!.score).toBe(10);
  });

  it("API score from keyApi alone", () => {
    const q = scoreSkillQuality(makeAnalysis({ keyApi: ["foo", "bar"] }));
    expect(q.details.find(d => d.label === "Has API reference")!.score).toBe(8);
  });

  it("API score from apiSection alone", () => {
    const q = scoreSkillQuality(makeAnalysis({ apiSection: "some api docs" }));
    expect(q.details.find(d => d.label === "Has API reference")!.score).toBe(10);
  });

  it("full API score from apiSection + keyApi", () => {
    const q = scoreSkillQuality(makeAnalysis({ apiSection: "docs", keyApi: ["fn"] }));
    expect(q.details.find(d => d.label === "Has API reference")!.score).toBe(15);
  });

  it("legacyScore maps to 1-5 range", () => {
    const qLow = scoreSkillQuality(makeAnalysis());
    const qHigh = scoreSkillQuality(makeAnalysis({
      description: "x", richDescription: "x", installInstructions: "x",
      usageExamples: ["a", "b", "c"], features: ["a", "b", "c"],
      apiSection: "x", keyApi: ["x"], whenToUse: ["x"], whenNotToUse: ["x"], hasTests: true,
    }));
    expect(qLow.legacyScore).toBeGreaterThanOrEqual(0);
    expect(qLow.legacyScore).toBeLessThanOrEqual(5);
    expect(qHigh.legacyScore).toBe(5);
  });
});

// ============================================================
// formatQualityScore
// ============================================================
describe("formatQualityScore", () => {
  it("formats passing items with checkmark", () => {
    const q = scoreSkillQuality(makeAnalysis({ description: "hello" }));
    const output = formatQualityScore(q);
    expect(output).toContain("✓ Has description");
    expect(output).toContain("📊 Skill Quality Score:");
  });

  it("formats failing items with ✗", () => {
    const q = scoreSkillQuality(makeAnalysis());
    const output = formatQualityScore(q);
    expect(output).toContain("✗");
  });

  it("shows score fraction", () => {
    const q = scoreSkillQuality(makeAnalysis({ description: "x", hasTests: true }));
    const output = formatQualityScore(q);
    expect(output).toMatch(/\d+\/100/);
  });
});

// ============================================================
// buildStructuredData
// ============================================================
describe("buildStructuredData", () => {
  it("returns correct structure", () => {
    const analysis = makeAnalysis({
      description: "A cool tool",
      packageName: "cool-tool",
      features: ["Fast"],
      whenToUse: ["Build things"],
      cliCommands: [{ name: "cool" }],
      hasTests: true,
    });
    const data = buildStructuredData(analysis, "cli-tool");
    expect(data.name).toBe("test-project");
    expect(data.category).toBe("cli-tool");
    expect(data.packageName).toBe("cool-tool");
    expect(data.features).toEqual(["Fast"]);
    expect(data.cliCommands).toEqual(["cool"]);
    expect(data.hasTests).toBe(true);
    expect(data.quality.score).toBeGreaterThan(0);
    expect(data.quality.maxScore).toBe(100);
  });

  it("uses name as packageName fallback", () => {
    const data = buildStructuredData(makeAnalysis(), "library");
    expect(data.packageName).toBe("test-project");
  });

  it("includes all fields", () => {
    const data = buildStructuredData(makeAnalysis(), "library");
    const keys = Object.keys(data);
    expect(keys).toContain("name");
    expect(keys).toContain("description");
    expect(keys).toContain("language");
    expect(keys).toContain("languages");
    expect(keys).toContain("category");
    expect(keys).toContain("features");
    expect(keys).toContain("whenToUse");
    expect(keys).toContain("whenNotToUse");
    expect(keys).toContain("cliCommands");
    expect(keys).toContain("installCommand");
    expect(keys).toContain("quality");
  });
});

// ============================================================
// Edge cases & integration-like tests
// ============================================================
describe("edge cases", () => {
  it("categorize: SDK/AI project is NOT http-client", () => {
    const a = makeAnalysis({ description: "An SDK client for OpenAI API" });
    expect(categorizeProject(a)).not.toBe("http-client");
  });

  it("categorize: MCP protocol project is NOT http-client", () => {
    const a = makeAnalysis({ description: "A client for MCP protocol servers" });
    expect(categorizeProject(a)).not.toBe("http-client");
  });

  it("quality: usageSection without code blocks gives partial score", () => {
    const q = scoreSkillQuality(makeAnalysis({ usageSection: "Just run the command and see results" }));
    expect(q.details.find(d => d.label === "Has examples")!.score).toBe(5);
  });

  it("handles analysis with all empty strings", () => {
    const a = makeAnalysis({
      name: "",
      description: "",
      language: "unknown",
      languages: [],
    });
    const cat = categorizeProject(a);
    expect(cat).toBe("library");
    const q = scoreSkillQuality(a);
    expect(q.score).toBe(10); // only category
  });

  it("handles analysis with very long description", () => {
    const longDesc = "x".repeat(10000);
    const a = makeAnalysis({ description: longDesc, richDescription: longDesc });
    const q = scoreSkillQuality(a);
    expect(q.details.find(d => d.label === "Has description")!.pass).toBe(true);
  });

  it("handles multiple CLI commands in categorization", () => {
    const a = makeAnalysis({
      cliCommands: [{ name: "build" }, { name: "serve" }, { name: "test" }],
    });
    expect(categorizeProject(a)).toBe("cli-tool");
  });

  it("extractFirstParagraph handles only badges", () => {
    const readme = "# Title\n\n[![badge](url)](link)\n[![b2](u2)](l2)\n";
    expect(extractFirstParagraph(readme)).toBe("");
  });

  it("extractFirstParagraph handles inline HTML", () => {
    expect(extractFirstParagraph("# T\n\nHello <em>world</em> foo.")).toBe("Hello world foo.");
  });
});

// ============================================================
// Quality scoring edge cases
// ============================================================
describe("quality scoring edge cases", () => {
  it("no whenNotToUse gives 0 for that criterion", () => {
    const q = scoreSkillQuality(makeAnalysis({ whenToUse: ["x"], whenNotToUse: [] }));
    expect(q.details.find(d => d.label === 'Has "When NOT to Use"')!.score).toBe(0);
  });

  it("hasTests gives 10 points", () => {
    const q = scoreSkillQuality(makeAnalysis({ hasTests: true }));
    expect(q.details.find(d => d.label === "Has test examples")!.score).toBe(10);
  });

  it("no tests gives 0 points for test criterion", () => {
    const q = scoreSkillQuality(makeAnalysis({ hasTests: false }));
    expect(q.details.find(d => d.label === "Has test examples")!.score).toBe(0);
  });

  it("category always scores 10", () => {
    const q = scoreSkillQuality(makeAnalysis());
    expect(q.details.find(d => d.label === "Has category")!.score).toBe(10);
  });

  it("quality details has 9 criteria", () => {
    const q = scoreSkillQuality(makeAnalysis());
    expect(q.details.length).toBe(9);
  });

  it("maxScore sums to 100", () => {
    const q = scoreSkillQuality(makeAnalysis());
    const sum = q.details.reduce((s, d) => s + d.maxScore, 0);
    expect(sum).toBe(100);
  });
});
