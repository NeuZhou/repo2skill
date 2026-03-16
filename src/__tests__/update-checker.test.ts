import { describe, it, expect } from "vitest";
import { compareVersions, formatUpdateCheck, getCurrentVersion } from "../update-checker";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("2.3.0", "2.3.0")).toBe(0);
  });

  it("returns positive when a > b", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.1.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.1", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("2.3.0", "2.2.0")).toBeGreaterThan(0);
  });

  it("returns negative when a < b", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.1.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
  });
});

describe("formatUpdateCheck", () => {
  it("shows update available when newer version exists", () => {
    const result = formatUpdateCheck({
      currentVersion: "2.2.0",
      latestVersion: "2.3.0",
      updateAvailable: true,
      updateCommand: "npm update -g repo2skill",
    });
    expect(result).toContain("2.2.0");
    expect(result).toContain("2.3.0");
    expect(result).toContain("Update available");
    expect(result).toContain("npm update -g repo2skill");
  });

  it("shows up to date when versions match", () => {
    const result = formatUpdateCheck({
      currentVersion: "2.3.0",
      latestVersion: "2.3.0",
      updateAvailable: false,
      updateCommand: "npm update -g repo2skill",
    });
    expect(result).toContain("up to date");
    expect(result).not.toContain("Update available");
  });
});

describe("getCurrentVersion", () => {
  it("returns a valid semver string", () => {
    const version = getCurrentVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
