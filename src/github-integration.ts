/**
 * GitHub Integration — fetch extra metadata from GitHub API
 * Uses unauthenticated requests by default, GITHUB_TOKEN env for higher rate limits.
 * v3.0: Added in-memory + disk caching for API responses.
 */

import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// --- Response Cache (in-memory + disk) ---
const memoryCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheDir(): string {
  const dir = path.join(os.tmpdir(), "repo2skill-cache");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getCached(key: string): any | null {
  // Check memory first
  const mem = memoryCache.get(key);
  if (mem && mem.expires > Date.now()) return mem.data;

  // Check disk
  try {
    const file = path.join(getCacheDir(), Buffer.from(key).toString("base64url") + ".json");
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (raw.expires > Date.now()) {
        memoryCache.set(key, raw);
        return raw.data;
      }
      fs.unlinkSync(file);
    }
  } catch { /* ignore */ }
  return null;
}

function setCache(key: string, data: any): void {
  const entry = { data, expires: Date.now() + CACHE_TTL_MS };
  memoryCache.set(key, entry);
  try {
    const file = path.join(getCacheDir(), Buffer.from(key).toString("base64url") + ".json");
    fs.writeFileSync(file, JSON.stringify(entry));
  } catch { /* ignore */ }
}

export interface GitHubMetadata {
  stars: number;
  forks: number;
  openIssues: number;
  lastCommitDate: string;
  latestRelease: string | null;
  license: string | null;
  topics: string[];
  contributorsCount: number;
  description: string | null;
  language: string | null;
  defaultBranch: string;
}

function githubRequest(apiPath: string): Promise<any> {
  const cached = getCached(apiPath);
  if (cached !== null) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const headers: Record<string, string> = {
      "User-Agent": "repo2skill",
      Accept: "application/vnd.github.v3+json",
    };
    if (token) headers.Authorization = `token ${token}`;

    const options = {
      hostname: "api.github.com",
      path: apiPath,
      headers,
    };

    const req = https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode === 404) {
          resolve(null);
        } else if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`));
        } else {
          try {
            const parsed = JSON.parse(data);
            setCache(apiPath, parsed);
            resolve(parsed);
          } catch {
            reject(new Error(`Invalid JSON from GitHub API: ${data.slice(0, 100)}`));
          }
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("GitHub API request timed out"));
    });
  });
}

/**
 * Parse owner/repo from a GitHub URL or shorthand.
 */
export function parseOwnerRepo(repo: string): { owner: string; repo: string } | null {
  // owner/repo format
  const shortMatch = repo.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };

  // URL format
  const urlMatch = repo.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  return null;
}

/**
 * Fetch GitHub metadata for a repo.
 * Returns null if repo not found or not a GitHub repo.
 */
export async function fetchGitHubMetadata(repoArg: string): Promise<GitHubMetadata | null> {
  const parsed = parseOwnerRepo(repoArg);
  if (!parsed) return null;

  const { owner, repo } = parsed;

  try {
    // Fetch repo info and latest release in parallel
    const [repoInfo, releaseInfo, contributorsInfo] = await Promise.all([
      githubRequest(`/repos/${owner}/${repo}`),
      githubRequest(`/repos/${owner}/${repo}/releases/latest`).catch(() => null),
      githubRequest(`/repos/${owner}/${repo}/contributors?per_page=1&anon=true`).catch(() => null),
    ]);

    if (!repoInfo) return null;

    // Contributors count from Link header isn't available here, so we estimate from the array
    // For accurate count we'd need to paginate; we use a simple heuristic
    let contributorsCount = 0;
    if (Array.isArray(contributorsInfo)) {
      contributorsCount = contributorsInfo.length;
      // If exactly 1 result, that's the per_page limit — the real count is unknown
      // We'll just report what we know
    }

    return {
      stars: repoInfo.stargazers_count ?? 0,
      forks: repoInfo.forks_count ?? 0,
      openIssues: repoInfo.open_issues_count ?? 0,
      lastCommitDate: repoInfo.pushed_at ?? "",
      latestRelease: releaseInfo?.tag_name ?? null,
      license: repoInfo.license?.spdx_id ?? null,
      topics: repoInfo.topics ?? [],
      contributorsCount,
      description: repoInfo.description ?? null,
      language: repoInfo.language ?? null,
      defaultBranch: repoInfo.default_branch ?? "main",
    };
  } catch (err: any) {
    // Non-fatal — just return null
    if (process.env.REPO2SKILL_VERBOSE === "1") {
      console.warn(`⚠️  GitHub API error: ${err.message}`);
    }
    return null;
  }
}

/**
 * Format GitHub metadata as a markdown section for SKILL.md.
 */
export function formatGitHubSection(meta: GitHubMetadata): string {
  const lines: string[] = [];
  lines.push("## GitHub Stats");
  lines.push("");
  lines.push(`- ⭐ **Stars:** ${meta.stars.toLocaleString()}`);
  lines.push(`- 🍴 **Forks:** ${meta.forks.toLocaleString()}`);
  lines.push(`- 📋 **Open Issues:** ${meta.openIssues}`);
  if (meta.latestRelease) {
    lines.push(`- 🏷️ **Latest Release:** ${meta.latestRelease}`);
  }
  if (meta.license) {
    lines.push(`- 📄 **License:** ${meta.license}`);
  }
  if (meta.topics.length > 0) {
    lines.push(`- 🏷️ **Topics:** ${meta.topics.join(", ")}`);
  }
  if (meta.contributorsCount > 0) {
    lines.push(`- 👥 **Contributors:** ${meta.contributorsCount}+`);
  }
  if (meta.lastCommitDate) {
    const date = new Date(meta.lastCommitDate);
    lines.push(`- 📅 **Last Updated:** ${date.toISOString().split("T")[0]}`);
  }
  lines.push("");
  return lines.join("\n");
}
