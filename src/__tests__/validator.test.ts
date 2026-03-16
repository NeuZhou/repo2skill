import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateSkillMd, formatValidationResult } from "../validator";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDir = path.join(os.tmpdir(), `repo2skill-val-test-${Date.now()}`);

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

describe("validateSkillMd", () => {
  it("passes all checks for a complete SKILL.md", () => {
    const fp = writeSkill(`---
name: test-skill
description: A great tool for testing things
source_repo: https://github.com/test/test
generated_at: "2024-01-01T00:00:00Z"
---

# test-skill

## When to Use
- Testing things

## When NOT to Use
- Production without tests

## Quick Start

### Install

\`\`\`bash
npm install test-skill
\`\`\`

### Usage

\`\`\`typescript
import { test } from "test-skill";
test();
\`\`\`
`);
    const result = validateSkillMd(fp);
    expect(result.failed).toBe(0);
    expect(result.passed).toBe(result.total);
  });

  it("detects missing frontmatter", () => {
    const fp = writeSkill("# No frontmatter\n\nJust content.");
    const result = validateSkillMd(fp);
    const frontmatterCheck = result.checks.find(c => c.label === "Has required frontmatter");
    expect(frontmatterCheck?.passed).toBe(false);
  });

  it("detects missing When to Use section", () => {
    const fp = writeSkill(`---
name: test
description: test
---
# test
`);
    const result = validateSkillMd(fp);
    const check = result.checks.find(c => c.label.includes("When to Use"));
    expect(check?.passed).toBe(false);
  });

  it("detects description over 500 chars", () => {
    const longDesc = "a".repeat(501);
    const fp = writeSkill(`---
name: test
description: ${longDesc}
---
# test
`);
    const result = validateSkillMd(fp);
    const check = result.checks.find(c => c.label === "Description under 500 chars");
    expect(check?.passed).toBe(false);
  });

  it("detects unclosed code blocks", () => {
    const fp = writeSkill(`---
name: test
description: test
---
# test

\`\`\`javascript
const x = 1;
`);
    const result = validateSkillMd(fp);
    const check = result.checks.find(c => c.label === "No unclosed code blocks");
    expect(check?.passed).toBe(false);
  });

  it("throws for missing file", () => {
    expect(() => validateSkillMd("/nonexistent/SKILL.md")).toThrow("File not found");
  });
});

describe("formatValidationResult", () => {
  it("formats result with pass/fail icons", () => {
    const fp = writeSkill(`---
name: test
description: A short desc
---
# test
`);
    const result = validateSkillMd(fp);
    const output = formatValidationResult(result);
    expect(output).toContain("✓");
    expect(output).toContain("✗");
    expect(output).toContain("Validating:");
    expect(output).toContain("checks passed");
  });

  it("shows all passed for complete skill", () => {
    const fp = writeSkill(`---
name: test
description: A short desc
source_repo: https://github.com/t/t
generated_at: "2024-01-01"
---

# test

## When to Use
- stuff

## When NOT to Use
- other stuff

## Quick Start

### Install

\`\`\`bash
npm install test
\`\`\`
`);
    const result = validateSkillMd(fp);
    const output = formatValidationResult(result);
    expect(output).toContain("All checks passed!");
  });
});
