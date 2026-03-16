import { describe, it, expect } from "vitest";
import { runInteractive, InteractiveAnswers } from "../interactive";

describe("InteractiveAnswers type", () => {
  it("has correct shape", () => {
    const answers: InteractiveAnswers = {
      repo: "owner/repo",
      format: "markdown",
      template: "default",
      includeGithub: true,
      includeExamples: true,
      includeApi: true,
    };
    expect(answers.repo).toBe("owner/repo");
    expect(answers.format).toBe("markdown");
    expect(answers.template).toBe("default");
    expect(answers.includeGithub).toBe(true);
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
});
