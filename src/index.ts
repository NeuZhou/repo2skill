import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import simpleGit from "simple-git";
import { glob } from "glob";
import { analyzeRepo, RepoAnalysis, categorizeProject } from "./analyzer";
import { generateSkill, scoreSkillQuality, SkillQuality } from "./generator";

export interface Repo2SkillOptions {
  outputDir: string;
  skillName?: string;
}

export interface Repo2SkillResult {
  skillDir: string;
  referencesCount: number;
  quality?: SkillQuality;
}

async function cloneRepo(url: string, tmpDir: string): Promise<void> {
  const git = simpleGit();
  try {
    await git.clone(url, tmpDir, ["--depth", "1", "--single-branch", "--config", "core.longpaths=true"]);
  } catch (err: any) {
    const msg = err.message || String(err);
    if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("Repository not found")) {
      throw new Error(`Repository not found: ${url}. Check the URL or owner/repo format.`);
    }
    if (msg.includes("rate limit") || msg.includes("403")) {
      throw new Error(`GitHub API rate limited. Wait a few minutes or set a GITHUB_TOKEN.`);
    }
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
      throw new Error(`Clone timed out for ${url}. The repo may be too large or the network is slow.`);
    }
    throw new Error(`Failed to clone ${url}: ${msg}`);
  }
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
  await cloneRepo(url, tmpDir);

  try {
    // Analyze
    console.log(`🔍 Analyzing repository...`);
    const analysis = await analyzeRepo(tmpDir, repoName);

    if (!analysis.readmeRaw && !analysis.description) {
      console.warn(`⚠️  Warning: No README or description found. The generated skill may be sparse.`);
    }

    // Generate
    console.log(`⚙️  Generating skill...`);
    const skillDir = path.join(options.outputDir, skillName);
    const result = generateSkill(analysis, skillDir, skillName, url);

    // Quality scoring
    const quality = scoreSkillQuality(analysis);
    result.quality = quality;

    return result;
  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Analyze a local directory without cloning.
 */
export async function repo2skillLocal(
  localPath: string,
  options: Repo2SkillOptions
): Promise<Repo2SkillResult> {
  const resolvedPath = path.resolve(localPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Local path not found: ${resolvedPath}`);
  }
  const repoName = options.skillName || path.basename(resolvedPath);

  console.log(`🔍 Analyzing local repository at ${resolvedPath}...`);
  const analysis = await analyzeRepo(resolvedPath, repoName);

  console.log(`⚙️  Generating skill...`);
  const skillDir = path.join(options.outputDir, repoName);
  const result = generateSkill(analysis, skillDir, repoName);

  const quality = scoreSkillQuality(analysis);
  result.quality = quality;

  return result;
}

export async function repo2skillJson(repo: string): Promise<RepoAnalysis> {
  const { url, name: repoName } = parseRepoArg(repo);

  const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await cloneRepo(url, tmpDir);

  try {
    const analysis = await analyzeRepo(tmpDir, repoName);
    return analysis;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export interface UpgradeResult {
  skillDir: string;
  manualSectionsPreserved: number;
}

export async function upgradeSkill(skillDir: string): Promise<UpgradeResult> {
  const skillMdPath = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`SKILL.md not found in ${skillDir}`);
  }

  const existingContent = fs.readFileSync(skillMdPath, "utf-8");

  // Extract source_repo from frontmatter
  const sourceRepoMatch = existingContent.match(/^source_repo:\s*(.+)$/m);
  if (!sourceRepoMatch) {
    throw new Error("No source_repo found in SKILL.md frontmatter. Cannot upgrade.");
  }
  const sourceRepo = sourceRepoMatch[1].trim();

  // Extract manual sections (<!-- manual --> ... <!-- /manual -->)
  const manualRegex = /<!-- manual -->([\s\S]*?)<!-- \/manual -->/g;
  const manualSections: { content: string; label: string }[] = [];
  let match;
  while ((match = manualRegex.exec(existingContent)) !== null) {
    // Find the nearest heading before this manual block
    const before = existingContent.slice(0, match.index);
    const headingMatch = before.match(/^(#{1,3}\s+.+)$/mg);
    const label = headingMatch ? headingMatch[headingMatch.length - 1].trim() : `manual_${manualSections.length}`;
    manualSections.push({ content: match[0], label });
  }

  // Clone and re-analyze
  const { url, name: repoName } = parseRepoArgPublic(sourceRepo);
  const skillName = path.basename(skillDir);

  const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  console.log(`📦 Cloning ${url} for upgrade...`);
  await cloneRepo(url, tmpDir);

  try {
    console.log(`🔍 Re-analyzing repository...`);
    const analysis = await analyzeRepo(tmpDir, repoName);

    console.log(`⚙️  Regenerating skill...`);
    const result = generateSkill(analysis, skillDir, skillName, url);

    // Re-inject manual sections
    if (manualSections.length > 0) {
      let newContent = fs.readFileSync(skillMdPath, "utf-8");
      for (const section of manualSections) {
        // Try to find the same heading and append after it
        const headingEscaped = section.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headingRegex = new RegExp(`(${headingEscaped}\\n)`);
        if (headingRegex.test(newContent)) {
          newContent = newContent.replace(headingRegex, `$1\n${section.content}\n`);
        } else {
          // Append before the badge line
          const badgeIdx = newContent.lastIndexOf("> Generated by");
          if (badgeIdx !== -1) {
            newContent = newContent.slice(0, badgeIdx) + section.content + "\n\n" + newContent.slice(badgeIdx);
          } else {
            newContent += "\n\n" + section.content;
          }
        }
      }
      fs.writeFileSync(skillMdPath, newContent);
    }

    return { skillDir, manualSectionsPreserved: manualSections.length };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function parseRepoArgPublic(repo: string): { url: string; name: string } {
  return parseRepoArg(repo);
}

export interface DryRunResult {
  skillName: string;
  description: string;
  language: string;
  languages: string[];
  category: string;
  cliCommands: string[];
  hasTests: boolean;
  license: string;
  isMonorepo: boolean;
  monorepoPackages: string[];
  features: string[];
  usageExamples: number;
  whenToUse: string[];
  packageName: string;
  installCommand: string;
}

export async function repo2skillDryRun(repo: string, nameOverride?: string): Promise<DryRunResult> {
  const { url, name: repoName } = parseRepoArg(repo);
  const skillName = nameOverride || repoName;

  const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  console.log(`📦 Cloning ${url}...`);
  await cloneRepo(url, tmpDir);

  try {
    console.log(`🔍 Analyzing repository...`);
    const analysis = await analyzeRepo(tmpDir, repoName);
    const pkgName = analysis.packageName || analysis.name;
    let installCmd = "";
    if (analysis.installInstructions) {
      // Extract the actual command from README install instructions
      const cmdMatch = analysis.installInstructions.match(/(?:pip install|npm install|cargo install|go install|gem install|composer require)\s+\S+/);
      installCmd = cmdMatch ? cmdMatch[0] : "(from README)";
    } else if (analysis.language === "JavaScript" || analysis.language === "TypeScript") {
      installCmd = `npm install ${pkgName}`;
    } else if (analysis.language === "Python") {
      installCmd = `pip install ${pkgName}`;
    } else if (analysis.language === "Rust") {
      installCmd = `cargo install ${pkgName}`;
    } else if (analysis.language === "Go") {
      installCmd = `go install ${analysis.entryPoints[0] || analysis.name}@latest`;
    }

    return {
      skillName,
      description: analysis.richDescription || analysis.description,
      language: analysis.language,
      languages: analysis.languages,
      category: categorizeProject(analysis),
      cliCommands: analysis.cliCommands.map(c => c.name),
      hasTests: analysis.hasTests,
      license: analysis.license,
      isMonorepo: analysis.isMonorepo,
      monorepoPackages: analysis.monorepoPackages,
      features: analysis.features,
      usageExamples: analysis.usageExamples.length,
      whenToUse: analysis.whenToUse,
      packageName: pkgName,
      installCommand: installCmd,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
