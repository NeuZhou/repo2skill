import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import simpleGit from "simple-git";
import { glob } from "glob";
import { analyzeRepo, RepoAnalysis, categorizeProject } from "./analyzer";
import { generateSkill, scoreSkillQuality, SkillQuality, formatQualityScore, buildStructuredData, SkillStructuredData } from "./generator";
import { fetchGitHubMetadata, GitHubMetadata, parseOwnerRepo, formatGitHubSection } from "./github-integration";
import { lintSkillMd, lintSkillContent, formatLintResult, LintResult } from "./linter";
import { registryAdd, registryRemove, registryList, registryClear, loadRegistry, saveRegistry, getRegistryPath, RegistryEntry } from "./registry";
import { getTemplate, listTemplates, isValidTemplate, TemplateConfig, TemplateName } from "./templates";

export interface Repo2SkillOptions {
  outputDir: string;
  skillName?: string;
  /** Path to a specific package within a monorepo (e.g. "packages/core") */
  packagePath?: string;
  /** Template name: minimal, detailed, security, default */
  template?: string;
  /** Fetch GitHub metadata (stars, forks, etc.) */
  github?: boolean;
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

export function parseRepoArg(repo: string): { url: string; name: string } {
  if (repo.startsWith("http")) {
    const name = repo.replace(/\.git$/, "").split("/").pop()!;
    return { url: repo, name };
  }
  // Only accept exactly "owner/repo" format (no deeper paths)
  if (/^[^/]+\/[^/]+$/.test(repo)) {
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
  const skillName = options.skillName || (options.packagePath ? path.basename(options.packagePath) : repoName);

  const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  console.log(`📦 Cloning ${url}...`);
  await cloneRepo(url, tmpDir);

  try {
    const analyzeDir = options.packagePath ? path.join(tmpDir, options.packagePath) : tmpDir;
    if (options.packagePath && !fs.existsSync(analyzeDir)) {
      throw new Error(`Package path not found: ${options.packagePath}. Available directories: ${fs.readdirSync(tmpDir).join(", ")}`);
    }
    console.log(`🔍 Analyzing ${options.packagePath ? `package ${options.packagePath}` : "repository"}...`);
    const analysis = await analyzeRepo(analyzeDir, skillName);

    if (!analysis.readmeRaw && !analysis.description) {
      console.warn(`⚠️  Warning: No README or description found. The generated skill may be sparse.`);
    }

    if (process.env.REPO2SKILL_VERBOSE === "1") {
      printVerbose(analysis);
    }

    console.log(`⚙️  Generating skill...`);
    const skillDir = path.join(options.outputDir, skillName);

    // Fetch GitHub metadata if requested
    let githubMeta: GitHubMetadata | null = null;
    if (options.github !== false) {
      console.log(`🐙 Fetching GitHub metadata...`);
      githubMeta = await fetchGitHubMetadata(repo);
    }

    const result = generateSkill(analysis, skillDir, skillName, url, options.template, githubMeta);

    const quality = scoreSkillQuality(analysis);
    result.quality = quality;

    return result;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function repo2skillLocal(
  localPath: string,
  options: Repo2SkillOptions
): Promise<Repo2SkillResult> {
  const resolvedPath = path.resolve(localPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Local path not found: ${resolvedPath}`);
  }
  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`Not a directory: ${resolvedPath}`);
  }
  const repoName = options.skillName || path.basename(resolvedPath);

  console.log(`🔍 Analyzing local directory: ${resolvedPath}...`);
  const analysis = await analyzeRepo(resolvedPath, repoName);

  if (process.env.REPO2SKILL_VERBOSE === "1") {
    printVerbose(analysis);
  }

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
    return await analyzeRepo(tmpDir, repoName);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Analyze a repo/local and return structured data (for --format json/yaml).
 */
export async function repo2skillStructured(
  repo: string,
  options: { local?: boolean }
): Promise<SkillStructuredData> {
  let analysis: RepoAnalysis;
  if (options.local) {
    const resolvedPath = path.resolve(repo);
    if (!fs.existsSync(resolvedPath)) throw new Error(`Local path not found: ${resolvedPath}`);
    const name = path.basename(resolvedPath);
    analysis = await analyzeRepo(resolvedPath, name);
  } else {
    const { url, name } = parseRepoArg(repo);
    const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    await cloneRepo(url, tmpDir);
    try {
      analysis = await analyzeRepo(tmpDir, name);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
  const category = categorizeProject(analysis);
  return buildStructuredData(analysis, category);
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
    const before = existingContent.slice(0, match.index);
    const headingMatch = before.match(/^(#{1,3}\s+.+)$/mg);
    const label = headingMatch ? headingMatch[headingMatch.length - 1].trim() : `manual_${manualSections.length}`;
    manualSections.push({ content: match[0], label });
  }

  const { url, name: repoName } = parseRepoArg(sourceRepo);
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
        const headingEscaped = section.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headingRegex = new RegExp(`(${headingEscaped}\\n)`);
        if (headingRegex.test(newContent)) {
          newContent = newContent.replace(headingRegex, `$1\n${section.content}\n`);
        } else {
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

export interface DiffChange {
  field: string;
  type: "added" | "removed" | "changed";
  summary: string;
}

export interface DiffResult {
  changes: DiffChange[];
}

export async function diffSkill(
  repo: string,
  existingSkillMdPath: string,
  options?: { packagePath?: string }
): Promise<DiffResult> {
  if (!fs.existsSync(existingSkillMdPath)) {
    throw new Error(`Existing SKILL.md not found: ${existingSkillMdPath}`);
  }

  const existingContent = fs.readFileSync(existingSkillMdPath, "utf-8");

  const { url, name: repoName } = parseRepoArg(repo);
  const tmpDir = path.join(os.tmpdir(), `repo2skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await cloneRepo(url, tmpDir);

  try {
    const analyzeDir = options?.packagePath ? path.join(tmpDir, options.packagePath) : tmpDir;
    const analysis = await analyzeRepo(analyzeDir, repoName);
    const category = categorizeProject(analysis);
    const newData = buildStructuredData(analysis, category);

    const changes: DiffChange[] = [];

    // Compare key fields
    const compareField = (field: string, extract: (content: string) => string, newVal: string) => {
      const oldVal = extract(existingContent);
      if (!oldVal && newVal) {
        changes.push({ field, type: "added", summary: newVal.slice(0, 80) });
      } else if (oldVal && !newVal) {
        changes.push({ field, type: "removed", summary: oldVal.slice(0, 80) });
      } else if (oldVal !== newVal && oldVal && newVal) {
        changes.push({ field, type: "changed", summary: `"${oldVal.slice(0, 40)}" → "${newVal.slice(0, 40)}"` });
      }
    };

    const extractSection = (content: string, heading: string): string => {
      const regex = new RegExp(`^##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=^##\\s|$)`, "m");
      const match = content.match(regex);
      return match ? match[1].trim() : "";
    };

    compareField("description", c => {
      const m = c.match(/^description:\s*(.+)$/m);
      return m ? m[1].trim() : "";
    }, newData.description.slice(0, 200));

    // Compare features count
    const oldFeatures = (existingContent.match(/^- .+$/gm) || []).length;
    const newFeatures = newData.features.length;
    if (newFeatures > oldFeatures) {
      changes.push({ field: "features", type: "added", summary: `${newFeatures - oldFeatures} new feature(s) detected` });
    } else if (newFeatures < oldFeatures) {
      changes.push({ field: "features", type: "removed", summary: `${oldFeatures - newFeatures} feature(s) removed` });
    }

    // Compare CLI commands
    const oldCli = (existingContent.match(/`\w+`/g) || []).filter(c => c.length > 2);
    if (newData.cliCommands.length !== oldCli.length) {
      changes.push({ field: "cliCommands", type: "changed", summary: `${oldCli.length} → ${newData.cliCommands.length} commands` });
    }

    // Compare quality
    const oldQualityMatch = existingContent.match(/Quality Score:\s*(\d+)\/(\d+)/);
    if (oldQualityMatch) {
      const oldScore = parseInt(oldQualityMatch[1]);
      if (newData.quality.score !== oldScore) {
        changes.push({ field: "quality", type: "changed", summary: `${oldScore} → ${newData.quality.score}/${newData.quality.maxScore}` });
      }
    }

    // Compare languages
    const oldLangMatch = existingContent.match(/\*\*Language:\*\*\s*(.+)/);
    const newLangs = newData.languages.join(", ");
    if (oldLangMatch && oldLangMatch[1].trim() !== newLangs) {
      changes.push({ field: "languages", type: "changed", summary: `"${oldLangMatch[1].trim()}" → "${newLangs}"` });
    }

    // Dependencies
    const oldDepsMatch = existingContent.match(/\*\*Key dependencies:\*\*\s*(.+)/);
    const newDeps = newData.dependencies.slice(0, 8).join(", ");
    if (oldDepsMatch && oldDepsMatch[1].trim() !== newDeps && newDeps) {
      changes.push({ field: "dependencies", type: "changed", summary: `Dependencies updated` });
    }

    return { changes };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function printVerbose(analysis: RepoAnalysis) {
  console.log(`\n📋 Analysis Details:`);
  console.log(`   Name:        ${analysis.name}`);
  console.log(`   Package:     ${analysis.packageName || "(none)"}`);
  console.log(`   Languages:   ${analysis.languages.join(", ") || "unknown"}`);
  console.log(`   Description: ${(analysis.description || "").slice(0, 100)}${(analysis.description || "").length > 100 ? "..." : ""}`);
  console.log(`   CLI cmds:    ${analysis.cliCommands.map(c => c.name).join(", ") || "(none)"}`);
  console.log(`   Features:    ${analysis.features.length}`);
  console.log(`   Has tests:   ${analysis.hasTests}`);
  console.log(`   License:     ${analysis.license || "unknown"}`);
  console.log(`   Monorepo:    ${analysis.isMonorepo}`);
  console.log(`   Deps:        ${analysis.dependencies.length}`);
  console.log(`   Examples:    ${analysis.usageExamples.length} code blocks`);
  console.log(`   Docker:      ${analysis.dockerInfo ? "yes" : "no"}`);
  console.log("");
}

// Re-exports
export { analyzeRepo, categorizeProject, extractInstallCommands, extractApiExamples, extractBadges, extractTOC, detectFrameworkType } from "./analyzer";
export type { RepoAnalysis, BadgeInfo, TOCEntry, FrameworkType } from "./analyzer";
export { scoreSkillQuality, formatQualityScore, buildStructuredData } from "./generator";
export type { SkillQuality, SkillStructuredData } from "./generator";
export { fetchGitHubMetadata, parseOwnerRepo, formatGitHubSection } from "./github-integration";
export type { GitHubMetadata } from "./github-integration";
export { lintSkillMd, lintSkillContent, formatLintResult } from "./linter";
export type { LintResult, LintCheck, LintDiagnostic, LintSeverity } from "./linter";
export { registryAdd, registryRemove, registryList, registryClear, loadRegistry, saveRegistry, getRegistryPath } from "./registry";
export type { RegistryEntry, Registry } from "./registry";
export { getTemplate, listTemplates, isValidTemplate, generateFromTemplate, writeTemplate, isValidSkillType, SKILL_TYPES } from "./templates";
export type { TemplateConfig, TemplateName, SkillType } from "./templates";
export { checkForUpdates, compareVersions, formatUpdateCheck, getCurrentVersion, checkSkillUpdates, formatSkillUpdateCheck } from "./update-checker";
export type { UpdateCheckResult, SkillUpdateCheckResult } from "./update-checker";
export { buildComparisonEntry, formatComparison } from "./compare";
export type { SkillComparison, SkillComparisonEntry } from "./compare";
export { generateChangelog, formatChangelog, categorizeCommit } from "./changelog";
export type { Changelog, ChangelogEntry } from "./changelog";
export { runInteractive, displayAnalysisSummary } from "./interactive";
export type { InteractiveAnswers } from "./interactive";
export { resolveDependencies, formatDependencies, generatePrerequisitesSection } from "./dependencies";
export type { DependencyReport } from "./dependencies";
export { extractApi, generateApiReferenceSection } from "./api-extractor";
export type { ApiEntry } from "./api-extractor";
export { generateExamples, extractReadmeExamples, extractTestExamples, extractExampleDirExamples, generateApiExamples } from "./example-gen";
export type { GeneratedExample } from "./example-gen";
export { getVersionInfo, generateVersionStamp, formatVersionLine, injectVersionInfo, listTags, extractVersionHistory, addVersionEntry, formatVersionHistory } from "./versioning";
export type { VersionInfo, VersionHistoryEntry } from "./versioning";
export { validateSkillMd, formatValidationResult } from "./validator";
export type { ValidationResult, ValidationCheck } from "./validator";
export { testSkill, formatTestResult } from "./skill-test";
export type { SkillTestResult, SkillTestCheck } from "./skill-test";
export { aiEnhance, isAiAvailable } from "./ai-enhance";
export type { AiEnhanceResult, AiEnhanceOptions } from "./ai-enhance";
export { extractMarketplaceMetadata, generateMarketplaceJson, publishToMarketplace } from "./marketplace";
export type { MarketplaceMetadata, PublishResult } from "./marketplace";
export { detectMonorepo, packageSkillName, formatMonorepoDetection } from "./monorepo";
export type { MonorepoPackage, MonorepoDetectionResult } from "./monorepo";
export { mergeSkills } from "./merge";
export type { MergeOptions, MergeResult } from "./merge";
export { parseSkillToData, toJson, toYaml, toHtml, convertFormat, formatExtension, writeFormatted } from "./formats";
export type { OutputFormat, SkillData } from "./formats";
export { checkSkillHealth, checkSkillHealthContent, formatHealthResult } from "./health";
export type { HealthCheck, HealthResult } from "./health";
export { buildSkillGraph, generateGraphHtml, formatGraphSummary } from "./skill-graph";
export type { SkillGraph, SkillNode, SkillEdge } from "./skill-graph";
export { diffSkillFiles, diffSkillContent, formatSkillDiff } from "./skill-diff";
export type { SkillDiffResult, SkillDiffChange } from "./skill-diff";
export { buildQualityReport, generateQualityReportHtml, formatQualityReport } from "./quality-report";
export type { QualityReport, QualityReportEntry } from "./quality-report";
export { loadPlugin, createRepoData, runPlugins, injectPluginSections } from "./plugin";
export type { RepoSkillPlugin, RepoData, SkillSection } from "./plugin";
export { generateSecurityReport, formatSecurityReport } from "./security-report";
export type { SecurityReport, SecurityFinding } from "./security-report";
