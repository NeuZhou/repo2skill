import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveDependencies, formatDependencies, generatePrerequisitesSection } from "../dependencies";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDir = path.join(os.tmpdir(), `repo2skill-deps-test-${Date.now()}`);

beforeEach(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("resolveDependencies", () => {
  it("extracts Node.js dependencies from package.json", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({
      dependencies: { express: "^4.18.0", mongoose: "^7.0.0" },
      peerDependencies: { typescript: "^5.0.0" },
      devDependencies: { vitest: "^1.0.0", eslint: "^8.0.0" },
      engines: { node: ">= 18" },
    }));
    const report = resolveDependencies(tmpDir);
    expect(report.runtime["express"]).toBe("^4.18.0");
    expect(report.runtime["mongoose"]).toBe("^7.0.0");
    expect(report.peer["typescript"]).toBe("^5.0.0");
    expect(report.dev["vitest"]).toBe("^1.0.0");
    expect(report.system).toContain("node >= 18");
  });

  it("extracts Python dependencies from requirements.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask>=2.0\nrequests\n# comment\nnumpy==1.24.0\n");
    const report = resolveDependencies(tmpDir);
    expect(report.runtime["flask"]).toBe(">=2.0");
    expect(report.runtime["requests"]).toBe("*");
    expect(report.runtime["numpy"]).toBe("==1.24.0");
  });

  it("detects system deps from docker-compose.yml", () => {
    fs.writeFileSync(path.join(tmpDir, "docker-compose.yml"), `
services:
  db:
    image: postgres:15
  cache:
    image: redis:7
`);
    const report = resolveDependencies(tmpDir);
    expect(report.system).toContain("Postgres");
    expect(report.system).toContain("Redis");
  });

  it("returns empty report for empty directory", () => {
    const report = resolveDependencies(tmpDir);
    expect(Object.keys(report.runtime)).toHaveLength(0);
    expect(Object.keys(report.peer)).toHaveLength(0);
    expect(Object.keys(report.dev)).toHaveLength(0);
    expect(report.system).toHaveLength(0);
  });

  it("extracts Go dependencies from go.mod", () => {
    fs.writeFileSync(path.join(tmpDir, "go.mod"), `module github.com/example/app

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/go-sql-driver/mysql v1.7.1
)
`);
    const report = resolveDependencies(tmpDir);
    expect(report.system).toContain("Go >= 1.21");
    expect(report.runtime["github.com/gin-gonic/gin"]).toBe("v1.9.1");
  });
});

describe("formatDependencies", () => {
  it("formats a dependency report", () => {
    const report = {
      runtime: { express: "^4.18.0" },
      peer: { typescript: "^5.0.0" },
      dev: { vitest: "^1.0.0" },
      system: ["Node.js >= 18"],
    };
    const output = formatDependencies(report);
    expect(output).toContain("Runtime:");
    expect(output).toContain("express@^4.18.0");
    expect(output).toContain("Peer:");
    expect(output).toContain("System:");
  });
});

describe("generatePrerequisitesSection", () => {
  it("generates markdown for system requirements", () => {
    const report = {
      runtime: { express: "^4.18.0" },
      peer: {},
      dev: {},
      system: ["Node.js >= 18", "MongoDB"],
    };
    const section = generatePrerequisitesSection(report);
    expect(section).toContain("### System Requirements");
    expect(section).toContain("Node.js >= 18");
    expect(section).toContain("MongoDB");
    expect(section).toContain("### Runtime Dependencies");
    expect(section).toContain("`express`");
  });
});
