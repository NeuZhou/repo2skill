import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import simpleGit from "simple-git";
import { glob } from "glob";
import { analyzeRepo, RepoAnalysis } from "./analyzer";
import { generateSkill } from "./generator";

export interface Repo2SkillOptions {
  outputDir: string;
  skillName?: string;
}

export interface Repo2SkillResult {
  skillDir: string;
  referencesCount: number;
}

function parseRepoArg(repo: string): { url: string; name: string } {
  // Full URL
  if (repo.startsWith("http")) {
    const name = repo.replace(/\.git$/, "").split("/").pop()!;
    return { url: repo, name };
  }
  // owner/repo format
  if (repo.includes("/")) {
    const name = repo.split("/").pop()!;
    return { url: `https://github.com/${repo}`, name };
  }
  throw new Error(`Invalid repo: "${repo}". Use a GitHub URL or owner/repo format.`);
}

export async function repo2skill(
  repo: string,
  options: Repo2SkillOptions
): Promise<Repo2SkillResult> {
  const { url, name: repoName } = parseRepoArg(repo);
  const skillName = options.skillName || repoName;

  // Clone to temp dir
  const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  console.log(`📦 Cloning ${url}...`);
  const git = simpleGit();
  await git.clone(url, tmpDir, ["--depth", "1"]);

  try {
    // Analyze
    console.log(`🔍 Analyzing repository...`);
    const analysis = await analyzeRepo(tmpDir, repoName);

    // Generate
    console.log(`⚙️  Generating skill...`);
    const skillDir = path.join(options.outputDir, skillName);
    const result = generateSkill(analysis, skillDir, skillName);

    return result;
  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function repo2skillJson(repo: string): Promise<RepoAnalysis> {
  const { url, name: repoName } = parseRepoArg(repo);

  const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const git = simpleGit();
  await git.clone(url, tmpDir, ["--depth", "1"]);

  try {
    const analysis = await analyzeRepo(tmpDir, repoName);
    return analysis;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
