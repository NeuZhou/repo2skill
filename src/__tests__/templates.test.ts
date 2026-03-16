import { describe, it, expect } from "vitest";
import { getTemplate, listTemplates, isValidTemplate } from "../templates";

describe("getTemplate", () => {
  it("returns minimal template", () => {
    const t = getTemplate("minimal");
    expect(t.name).toBe("minimal");
    expect(t.sections.api).toBe(false);
    expect(t.sections.features).toBe(false);
    expect(t.sections.whenToUse).toBe(true);
    expect(t.maxExamples).toBe(1);
    expect(t.includeReferences).toBe(false);
  });

  it("returns detailed template", () => {
    const t = getTemplate("detailed");
    expect(t.name).toBe("detailed");
    expect(t.sections.api).toBe(true);
    expect(t.sections.githubStats).toBe(true);
    expect(t.maxExamples).toBe(5);
    expect(t.includeReferences).toBe(true);
  });

  it("returns security template", () => {
    const t = getTemplate("security");
    expect(t.name).toBe("security");
    expect(t.sections.securityConsiderations).toBe(true);
    expect(t.sections.threatModel).toBe(true);
  });

  it("returns default template", () => {
    const t = getTemplate("default");
    expect(t.name).toBe("default");
    expect(t.sections.githubStats).toBe(false);
    expect(t.sections.securityConsiderations).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(getTemplate("Minimal").name).toBe("minimal");
    expect(getTemplate("DETAILED").name).toBe("detailed");
  });

  it("throws for unknown template", () => {
    expect(() => getTemplate("nonexistent")).toThrow("Unknown template");
  });
});

describe("listTemplates", () => {
  it("returns all templates", () => {
    const templates = listTemplates();
    expect(templates.length).toBe(4);
    const names = templates.map(t => t.name);
    expect(names).toContain("minimal");
    expect(names).toContain("detailed");
    expect(names).toContain("security");
    expect(names).toContain("default");
  });
});

describe("isValidTemplate", () => {
  it("returns true for valid names", () => {
    expect(isValidTemplate("minimal")).toBe(true);
    expect(isValidTemplate("detailed")).toBe(true);
    expect(isValidTemplate("security")).toBe(true);
    expect(isValidTemplate("default")).toBe(true);
  });

  it("returns false for invalid names", () => {
    expect(isValidTemplate("nope")).toBe(false);
    expect(isValidTemplate("")).toBe(false);
  });
});
