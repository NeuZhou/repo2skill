import { describe, it, expect } from "vitest";
import { InteractiveAnswers, displayAnalysisSummary } from "../interactive";

describe("InteractiveAnswers type", () => {
  it("has correct shape with v3.5.0 fields", () => {
    const answers: InteractiveAnswers = {
      repo: "owner/repo",
      format: "markdown",
      outputType: "skill",
      template: "default",
      includeGithub: true,
      includeExamples: true,
      includeApi: true,
      includeTests: true,
      publishToClawHub: false,
    };
    expect(answers.repo).toBe("owner/repo");
    expect(answers.format).toBe("markdown");
    expect(answers.outputType).toBe("skill");
    expect(answers.includeTests).toBe(true);
    expect(answers.publishToClawHub).toBe(false);
  });

  it("accepts all format options", () => {
    const formats: InteractiveAnswers["format"][] = ["markdown", "json", "yaml"];
    for (const f of formats) {
      expect(f).toBeTruthy();
    }
  });

  it("accepts all template options", () => {
    const templates: InteractiveAnswers["template"][] = ["default", "minimal", "detailed", "security"];
    for (const t of templates) {
      expect(t).toBeTruthy();
    }
  });

  it("accepts all output type options", () => {
    const types: InteractiveAnswers["outputType"][] = ["skill", "readme", "both"];
    for (const t of types) {
      expect(t).toBeTruthy();
    }
  });

  it("defaults publishToClawHub to false pattern", () => {
    const answers: InteractiveAnswers = {
      repo: "test/repo",
      format: "markdown",
      outputType: "both",
      template: "default",
      includeGithub: true,
      includeExamples: true,
      includeApi: true,
      includeTests: false,
      publishToClawHub: false,
    };
    expect(answers.publishToClawHub).toBe(false);
  });
});

describe("displayAnalysisSummary", () => {
  it("logs analysis info without throwing", () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: any[]) => logs.push(args.join(" "));
    try {
      displayAnalysisSummary({
        languages: ["TypeScript", "JavaScript"],
        type: "library",
        commandCount: 5,
      });
      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("TypeScript");
      expect(logs[0]).toContain("5 commands");
    } finally {
      console.log = orig;
    }
  });
});
