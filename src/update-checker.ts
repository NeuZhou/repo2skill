/**
 * Auto-Update Checker — check if a newer version of repo2skill is available,
 * and detect when a skill's source repo has been updated.
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

export interface SkillUpdateCheckResult {
  skillPath: string;
  sourceRepo: string | null;
  currentCommit: string | null;
  latestCommit: string | null;
  commitsBehind: number;
  newFeatures: string[];
  breakingChanges: string[];
  updated: boolean;
  suggestion: string;
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

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "repo2skill" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Failed to parse response"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Request timed out")); });
  });
}

/**
 * Check if a skill's source repo has been updated since generation.
 */
export async function checkSkillUpdates(skillMdPath: string): Promise<SkillUpdateCheckResult> {
  const absPath = path.resolve(skillMdPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  const content = fs.readFileSync(absPath, "utf-8");
  const sourceMatch = content.match(/source_repo:\s*"?([^"\n]+)"?/);
  const commitMatch = content.match(/version_commit:\s*"?([^"\n]+)"?/);

  const sourceRepo = sourceMatch?.[1]?.trim() || null;
  const currentCommit = commitMatch?.[1]?.trim() || null;

  if (!sourceRepo) {
    return {
      skillPath: absPath,
      sourceRepo: null,
      currentCommit: null,
      latestCommit: null,
      commitsBehind: 0,
      newFeatures: [],
      breakingChanges: [],
      updated: false,
      suggestion: "No source_repo found in frontmatter. Cannot check for updates.",
    };
  }

  // Parse owner/repo
  let owner = "", repo = "";
  const ghMatch = sourceRepo.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (ghMatch) {
    owner = ghMatch[1];
    repo = ghMatch[2].replace(/\.git$/, "");
  } else if (sourceRepo.includes("/")) {
    [owner, repo] = sourceRepo.split("/");
  }

  if (!owner || !repo) {
    return {
      skillPath: absPath, sourceRepo, currentCommit, latestCommit: null,
      commitsBehind: 0, newFeatures: [], breakingChanges: [],
      updated: false, suggestion: "Could not parse GitHub owner/repo from source_repo.",
    };
  }

  try {
    const commits = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=50`);
    if (!Array.isArray(commits)) throw new Error("Unexpected response");

    const latestCommit = commits[0]?.sha?.slice(0, 7) || null;
    let commitsBehind = 0;
    const newFeatures: string[] = [];
    const breakingChanges: string[] = [];

    if (currentCommit && Array.isArray(commits)) {
      const currentIdx = commits.findIndex((c: any) => c.sha?.startsWith(currentCommit));
      commitsBehind = currentIdx === -1 ? commits.length : currentIdx;

      const newCommits = commits.slice(0, commitsBehind);
      for (const c of newCommits) {
        const msg: string = c.commit?.message || "";
        if (/feat[:(]/i.test(msg) || /new feature/i.test(msg) || /add\w*\s+\w/i.test(msg)) {
          newFeatures.push(msg.split("\n")[0].slice(0, 80));
        }
        if (/breaking/i.test(msg) || /BREAKING CHANGE/i.test(msg)) {
          breakingChanges.push(msg.split("\n")[0].slice(0, 80));
        }
      }
    }

    const updated = commitsBehind > 0;
    let suggestion = "";
    if (updated) {
      suggestion = `Regenerate with: repo2skill ${owner}/${repo} --upgrade`;
      if (breakingChanges.length > 0) {
        suggestion += " (⚠️ contains breaking changes!)";
      }
    } else {
      suggestion = "Skill is up to date with source repo.";
    }

    return {
      skillPath: absPath, sourceRepo, currentCommit, latestCommit,
      commitsBehind, newFeatures, breakingChanges, updated, suggestion,
    };
  } catch (err: any) {
    return {
      skillPath: absPath, sourceRepo, currentCommit, latestCommit: null,
      commitsBehind: 0, newFeatures: [], breakingChanges: [],
      updated: false, suggestion: `Failed to check updates: ${err.message}`,
    };
  }
}

/**
 * Format skill update check result for CLI.
 */
export function formatSkillUpdateCheck(result: SkillUpdateCheckResult): string {
  const lines: string[] = [];
  lines.push(`🔄 Skill Update Check — ${path.basename(result.skillPath)}\n`);
  lines.push(`  Source repo:    ${result.sourceRepo || "(unknown)"}`);
  lines.push(`  Your commit:    ${result.currentCommit || "(unknown)"}`);
  lines.push(`  Latest commit:  ${result.latestCommit || "(unknown)"}`);

  if (result.updated) {
    lines.push(`\n  ⚠️  Source repo has been updated since skill was generated`);
    lines.push(`  Changes: ${result.commitsBehind} commits, ${result.newFeatures.length} new features, ${result.breakingChanges.length} breaking changes`);
    if (result.newFeatures.length > 0) {
      lines.push(`\n  New features:`);
      for (const f of result.newFeatures.slice(0, 5)) {
        lines.push(`    + ${f}`);
      }
    }
    if (result.breakingChanges.length > 0) {
      lines.push(`\n  ⚠️  Breaking changes:`);
      for (const b of result.breakingChanges.slice(0, 5)) {
        lines.push(`    ! ${b}`);
      }
    }
  } else {
    lines.push(`\n  ✅ Skill is up to date`);
  }

  lines.push(`\n  Suggestion: ${result.suggestion}`);
  return lines.join("\n");
}
