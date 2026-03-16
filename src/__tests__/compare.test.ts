import { describe, it, expect } from "vitest";
import { buildComparisonEntry, formatComparison, SkillComparison } from "../compare";
import { RepoAnalysis } from "../analyzer";

function makeAnalysis(overrides: Partial<RepoAnalysis> = {}): RepoAnalysis {
  return {
    name: "test-repo",
    description: "A test repo",
    richDescription: "A test repo with rich features",
    readmeRaw: "# Test\nSome readme",
    language: "TypeScript",
    languages: ["TypeScript", "JavaScript"],
    dependencies: ["commander", "glob"],
    devDependencies: ["vitest"],
    cliCommands: [{ name: "test-cli", description: "A test CLI" }],
    features: ["Feature A", "Feature B"],
    hasTests: true,
    license: "MIT",
    installInstructions: "npm install test-repo",
    usageExamples: [{ code: "test()", language: "ts" }],
    usageSection: "## Usage\nRun it",
    apiSection: "## API\nSome api",
    keyApi: [{ name: "run()", description: "runs it", signature: "run(): void" }],
    configSection: "",
    entryPoints: ["src/index.ts"],
    isMonorepo: false,
    monorepoPackages: [],
    dockerInfo: null,
    whenToUse: ["When you need to test"],
    whenNotToUse: ["When you don't need to test"],
    packageName: "test-repo",
    fileTree: [],
    ...overrides,
  } as RepoAnalysis;
}

describe("buildComparisonEntry", () => {
  it("builds entry from analysis", () => {
    const entry = buildComparisonEntry(makeAnalysis());
    expect(entry.name).toBe("test-repo");
    expect(entry.language).toBe("TypeScript");
    expect(entry.features).toBe(2);
    expect(entry.cliCommands).toBe(1);
    expect(entry.hasTests).toBe(true);
    expect(entry.license).toBe("MIT");
    expect(entry.quality.score).toBeGreaterThan(0);
    expect(entry.dependencies).toBe(2);
  });

  it("handles empty analysis", () => {
    const entry = buildComparisonEntry(makeAnalysis({
      features: [],
      cliCommands: [],
      dependencies: [],
      hasTests: false,
    }));
    expect(entry.features).toBe(0);
    expect(entry.cliCommands).toBe(0);
    expect(entry.hasTests).toBe(false);
  });
});

describe("formatComparison", () => {
  it("formats comparison table", () => {
    const comp: SkillComparison = {
      left: buildComparisonEntry(makeAnalysis({ name: "repo-a" })),
      right: buildComparisonEntry(makeAnalysis({ name: "repo-b", language: "Python", languages: ["Python"] })),
    };
    const output = formatComparison(comp);
    expect(output).toContain("repo-a");
    expect(output).toContain("repo-b");
    expect(output).toContain("TypeScript");
    expect(output).toContain("Python");
    expect(output).toContain("Skill Comparison");
  });

  it("shows quality scores for both repos", () => {
    const comp: SkillComparison = {
      left: buildComparisonEntry(makeAnalysis()),
      right: buildComparisonEntry(makeAnalysis({ features: [], usageExamples: [] })),
    };
    const output = formatComparison(comp);
    expect(output).toContain("/");  // quality score format X/Y
  });
});
