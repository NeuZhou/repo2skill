/**
 * Tests for R DESCRIPTION file support in analyzer
 */

import { describe, it, expect } from "vitest";
import { analyzeRepo } from "../analyzer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("R DESCRIPTION file support", () => {
  let tmpDir: string;

  function setup(files: Record<string, string>) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r-test-"));
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tmpDir, name);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
  }

  function cleanup() {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  it("detects R language from DESCRIPTION file", async () => {
    setup({
      "DESCRIPTION": `Package: myRpkg
Title: A Great R Package
Version: 1.0.0
Description: Does wonderful statistical analysis.
License: MIT
Imports: dplyr, ggplot2, tidyr
`,
      "R/main.R": `# main R file\nmy_func <- function() { 42 }`
    });

    try {
      const result = await analyzeRepo(tmpDir, "myRpkg");
      expect(result.languages).toContain("R");
      expect(result.description).toContain("statistical analysis");
      expect(result.packageName).toBe("myRpkg");
      expect(result.license).toBe("MIT");
    } finally {
      cleanup();
    }
  });

  it("extracts dependencies from Imports field", async () => {
    setup({
      "DESCRIPTION": `Package: testpkg
Title: Test Package
Version: 0.1.0
Imports: dplyr, ggplot2,
    tidyr
License: GPL-3
`,
      "R/func.R": `f <- function() {}`
    });

    try {
      const result = await analyzeRepo(tmpDir, "testpkg");
      expect(result.dependencies).toContain("dplyr");
      expect(result.dependencies).toContain("ggplot2");
    } finally {
      cleanup();
    }
  });

  it("generates install.packages instructions", async () => {
    setup({
      "DESCRIPTION": `Package: mypkg
Title: Simple Package
Version: 1.0.0
License: MIT
`,
      "R/code.R": `x <- 1`
    });

    try {
      const result = await analyzeRepo(tmpDir, "mypkg");
      expect(result.installInstructions).toContain("install.packages");
    } finally {
      cleanup();
    }
  });
});
