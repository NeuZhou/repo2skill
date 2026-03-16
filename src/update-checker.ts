/**
 * Auto-Update Checker — check if a newer version of repo2skill is available.
 */

import * as https from "https";
import * as fs from "fs";
import * as path from "path";

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateCommand: string;
}

function fetchNpmVersion(packageName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.version || "0.0.0");
        } catch {
          reject(new Error("Failed to parse npm registry response"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("npm registry request timed out"));
    });
  });
}

export function getCurrentVersion(): string {
  const pkgPath = path.join(__dirname, "..", "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  }
  return "0.0.0";
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();
  let latestVersion: string;
  try {
    latestVersion = await fetchNpmVersion("repo2skill");
  } catch {
    latestVersion = currentVersion; // Can't check, assume up to date
  }

  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    updateCommand: "npm update -g repo2skill",
  };
}

/**
 * Compare two semver strings. Returns >0 if a > b, <0 if a < b, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

export function formatUpdateCheck(result: UpdateCheckResult): string {
  const lines: string[] = [];
  lines.push(`📦 repo2skill version check`);
  lines.push(`  Your version:  ${result.currentVersion}`);
  lines.push(`  Latest:        ${result.latestVersion}`);
  if (result.updateAvailable) {
    lines.push(`  ⬆️  Update available! Run: ${result.updateCommand}`);
  } else {
    lines.push(`  ✅ You're up to date!`);
  }
  return lines.join("\n");
}
