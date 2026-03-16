/**
 * Monorepo Support - detect and process multi-package repositories.
 */

import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";

export interface MonorepoPackage {
  name: string;
  path: string;
  relativePath: string;
  hasPackageJson: boolean;
  description?: string;
}

export interface MonorepoDetectionResult {
  isMonorepo: boolean;
  packages: MonorepoPackage[];
  tool?: "npm-workspaces" | "yarn-workspaces" | "pnpm-workspaces" | "lerna" | "nx" | "turbo" | "directory-based";
}

/**
 * Detect if a repository is a monorepo and find all packages.
 */
export async function detectMonorepo(repoDir: string): Promise<MonorepoDetectionResult> {
  const packages: MonorepoPackage[] = [];
  let tool: MonorepoDetectionResult["tool"];

  // Check for workspace configuration files
  const packageJsonPath = path.join(repoDir, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      // npm/yarn workspaces
      if (pkg.workspaces) {
        const patterns = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : pkg.workspaces.packages || [];
        tool = "npm-workspaces";
        for (const pattern of patterns) {
          const matches = await glob(pattern, { cwd: repoDir, absolute: false });
          for (const match of matches) {
            const absPath = path.join(repoDir, match);
            if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
              const pkgInfo = readPackageInfo(repoDir, match);
              if (pkgInfo) packages.push(pkgInfo);
            }
          }
        }
      }
    } catch {}
  }

  // Check pnpm-workspace.yaml
  if (packages.length === 0) {
    const pnpmPath = path.join(repoDir, "pnpm-workspace.yaml");
    if (fs.existsSync(pnpmPath)) {
      tool = "pnpm-workspaces";
      const content = fs.readFileSync(pnpmPath, "utf-8");
      const patterns = extractYamlPatterns(content);
      for (const pattern of patterns) {
        const matches = await glob(pattern, { cwd: repoDir, absolute: false });
        for (const match of matches) {
          const absPath = path.join(repoDir, match);
          if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
            const pkgInfo = readPackageInfo(repoDir, match);
            if (pkgInfo) packages.push(pkgInfo);
          }
        }
      }
    }
  }

  // Check lerna.json
  if (packages.length === 0) {
    const lernaPath = path.join(repoDir, "lerna.json");
    if (fs.existsSync(lernaPath)) {
      try {
        const lerna = JSON.parse(fs.readFileSync(lernaPath, "utf-8"));
        tool = "lerna";
        const patterns = lerna.packages || ["packages/*"];
        for (const pattern of patterns) {
          const matches = await glob(pattern, { cwd: repoDir, absolute: false });
          for (const match of matches) {
            const absPath = path.join(repoDir, match);
            if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
              const pkgInfo = readPackageInfo(repoDir, match);
              if (pkgInfo) packages.push(pkgInfo);
            }
          }
        }
      } catch {}
    }
  }

  // Check nx.json
  if (packages.length === 0 && fs.existsSync(path.join(repoDir, "nx.json"))) {
    tool = "nx";
    const dirs = ["packages", "apps", "libs"];
    for (const dir of dirs) {
      const dirPath = path.join(repoDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const absPath = path.join(repoDir, entryPath);
          if (fs.statSync(absPath).isDirectory()) {
            const pkgInfo = readPackageInfo(repoDir, entryPath);
            if (pkgInfo) packages.push(pkgInfo);
          }
        }
      }
    }
  }

  // Check turbo.json
  if (packages.length === 0 && fs.existsSync(path.join(repoDir, "turbo.json"))) {
    tool = "turbo";
    const dirs = ["packages", "apps"];
    for (const dir of dirs) {
      const dirPath = path.join(repoDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const absPath = path.join(repoDir, entryPath);
          if (fs.statSync(absPath).isDirectory()) {
            const pkgInfo = readPackageInfo(repoDir, entryPath);
            if (pkgInfo) packages.push(pkgInfo);
          }
        }
      }
    }
  }

  // Fallback: directory-based detection
  if (packages.length === 0) {
    const dirs = ["packages", "apps", "libs", "modules"];
    for (const dir of dirs) {
      const dirPath = path.join(repoDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        tool = "directory-based";
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const absPath = path.join(repoDir, entryPath);
          if (fs.statSync(absPath).isDirectory()) {
            const pkgInfo = readPackageInfo(repoDir, entryPath);
            if (pkgInfo) packages.push(pkgInfo);
          }
        }
      }
    }
  }

  return {
    isMonorepo: packages.length > 1,
    packages,
    tool: packages.length > 1 ? tool : undefined,
  };
}

function readPackageInfo(repoDir: string, relativePath: string): MonorepoPackage | null {
  const absPath = path.join(repoDir, relativePath);
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) return null;

  const pkgJsonPath = path.join(absPath, "package.json");
  const hasPackageJson = fs.existsSync(pkgJsonPath);
  let name = path.basename(relativePath);
  let description: string | undefined;

  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      if (pkg.name) name = pkg.name;
      if (pkg.description) description = pkg.description;
    } catch {}
  }

  return {
    name,
    path: absPath,
    relativePath: relativePath.replace(/\\/g, "/"),
    hasPackageJson,
    description,
  };
}

/**
 * Simple extraction of workspace patterns from pnpm-workspace.yaml.
 */
function extractYamlPatterns(content: string): string[] {
  const patterns: string[] = [];
  const lines = content.split("\n");
  let inPackages = false;
  for (const line of lines) {
    if (line.match(/^packages:/)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const match = line.match(/^\s+-\s+['"]?([^'"]+)['"]?/);
      if (match) {
        patterns.push(match[1].trim());
      } else if (line.match(/^\S/) && line.trim()) {
        break;
      }
    }
  }
  return patterns;
}

/**
 * Generate skill output filename for a monorepo package.
 */
export function packageSkillName(packageName: string): string {
  return `skill-${packageName.replace(/^@[^/]+\//, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase()}.md`;
}

/**
 * Format detection result for CLI output.
 */
export function formatMonorepoDetection(result: MonorepoDetectionResult): string {
  if (!result.isMonorepo) {
    return "Not a monorepo (single package detected).";
  }
  const lines: string[] = [];
  lines.push(`Detected ${result.packages.length} packages${result.tool ? ` (${result.tool})` : ""}:`);
  for (const pkg of result.packages) {
    const desc = pkg.description ? ` - ${pkg.description}` : "";
    lines.push(`  ${pkg.relativePath} → ${packageSkillName(pkg.name)}${desc}`);
  }
  return lines.join("\n");
}
