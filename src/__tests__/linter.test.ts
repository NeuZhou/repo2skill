import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { lintSkillMd, formatLintResult } from "../linter";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDir = path.join(os.tmpdir(), `repo2skill-lint-test-${Date.now()}`);

beforeEach(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeSkill(content: string): string {
  const fp = path.join(tmpDir, "SKILL.md");
  fs.writeFileSync(fp, content);
  return fp;
}

describe("lintSkillMd", () => {
  it("scores a complete SKILL.md highly", () => {
    const fp = writeSkill(`---
name: test-skill
description: A great tool for testing
---

# test-skill

A great tool for testing.

## When to Use

- Testing things

## When NOT to Use

- Production

## Quick Start

### Install

\`\`\`bash
npm install test-skill
\`\`\`

## Key Features

- Fast
- Reliable

## API

\`\`\`js
import { test } from 'test-skill';
\`\`\`

## Project Info

- **Language:** TypeScript
`);
    const result = lintSkillMd(fp);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.checks.every(c => c.passed)).toBe(true);
  });

  it("scores an empty file low", () => {
    const fp = writeSkill("# Empty Skill\n\nNothing here.");
    const result = lintSkillMd(fp);
    expect(result.score).toBeLessThan(30);
  });

  it("detects missing When to Use", () => {
    const fp = writeSkill("---\ndescription: test\n---\n# test\n\n```bash\nnpm install test\n```");
    const result = lintSkillMd(fp);
    const check = result.checks.find(c => c.label.includes("When to Use"));
    expect(check?.passed).toBe(false);
  });

  it("detects missing When NOT to Use", () => {
    const fp = writeSkill("---\ndescription: test\n---\n# test\n## When to Use\n- stuff");
    const result = lintSkillMd(fp);
    const check = result.checks.find(c => c.label.includes("When NOT to Use"));
    expect(check?.passed).toBe(false);
  });

  it("detects install commands", () => {
    const fp = writeSkill("# test\n\n```bash\npip install something\n```");
    const result = lintSkillMd(fp);
    const check = result.checks.find(c => c.label.includes("install"));
    expect(check?.passed).toBe(true);
  });

  it("detects code examples", () => {
    const fp = writeSkill("# test\n\n```js\nconsole.log('hi');\n```");
    const result = lintSkillMd(fp);
    const check = result.checks.find(c => c.label === "Has examples");
    expect(check?.passed).toBe(true);
  });

  it("detects frontmatter", () => {
    const fp = writeSkill("---\nname: test\n---\n# test");
    const result = lintSkillMd(fp);
    const check = result.checks.find(c => c.label === "Has frontmatter");
    expect(check?.passed).toBe(true);
  });

  it("detects missing frontmatter", () => {
    const fp = writeSkill("# test\n\nNo frontmatter here.");
    const result = lintSkillMd(fp);
    const check = result.checks.find(c => c.label === "Has frontmatter");
    expect(check?.passed).toBe(false);
  });
});

describe("formatLintResult", () => {
  it("formats checks with pass/fail icons", () => {
    const fp = writeSkill("---\ndescription: test\n---\n# test\n## When to Use\n- stuff");
    const result = lintSkillMd(fp);
    const formatted = formatLintResult(result);
    expect(formatted).toContain("✓");
    expect(formatted).toContain("✗");
    expect(formatted).toContain("Score:");
  });
});
