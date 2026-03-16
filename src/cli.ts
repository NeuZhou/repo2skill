#!/usr/bin/env node
import { Command } from "commander";
import { repo2skill, repo2skillJson, repo2skillDryRun, upgradeSkill, repo2skillLocal, repo2skillStructured } from "./index";
import { formatQualityScore, scoreSkillQuality } from "./generator";
import { lintSkillMd, formatLintResult } from "./linter";
import { registryAdd, registryRemove, registryList, registryClear } from "./registry";
import { listTemplates, isValidTemplate } from "./templates";
import { checkForUpdates, formatUpdateCheck } from "./update-checker";
import { buildComparisonEntry, formatComparison } from "./compare";
import { generateChangelog, formatChangelog } from "./changelog";
import { runInteractive } from "./interactive";
import { analyzeRepo } from "./analyzer";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

const program = new Command();

program
  .name("repo2skill")
  .description("Convert any GitHub repo into an OpenClaw skill. One command.")
  .version("2.3.0")
  .argument("[repo]", "GitHub URL or owner/repo (or local path with --local)")
  .option("-o, --output <dir>", "Output directory", "./skills")
  .option("-n, --name <name>", "Override skill name")
  .option("-b, --batch <file>", "Batch mode: file with one repo URL per line")
  .option("--parallel <count>", "Parallel workers for batch mode (default: 1)", parseInt)
  .option("-f, --format <type>", "Output format: markdown (default), json, yaml", "markdown")
  .option("-j, --json", "Output analysis as JSON (shorthand for --format json)")
  .option("-d, --dry-run", "Preview what would be generated without writing files")
  .option("-v, --verbose", "Show detailed analysis during generation")
  .option("-s, --stats", "Show aggregate stats of generated skills in output directory")
  .option("-p, --publish", "Publish to ClawHub after generating")
  .option("-u, --upgrade <skill-dir>", "Re-analyze and regenerate an existing skill, preserving <!-- manual --> sections")
  .option("-l, --local <path>", "Analyze a local directory without cloning")
  .option("-t, --template <name>", "Template: minimal, detailed, security, default", "default")
  .option("--no-github", "Skip GitHub API metadata fetching")
  .option("--min-quality <score>", "Skip skills below this quality score (0-100)", parseInt)
  .option("--package <path>", "Target a specific package in a monorepo (e.g. packages/core)")
  .option("--diff <skill-md>", "Compare with existing SKILL.md and show what changed")
  .option("--check-updates", "Check for newer version of repo2skill")
  .option("-i, --interactive", "Interactive guided mode")
  .action(async (repo: string | undefined, opts: any) => {
    try {
      if (opts.verbose) {
        process.env.REPO2SKILL_VERBOSE = "1";
      }

      // Check updates mode
      if (opts.checkUpdates) {
        const result = await checkForUpdates();
        console.log(formatUpdateCheck(result));
        return;
      }

      // Interactive mode
      if (opts.interactive) {
        const answers = await runInteractive();
        const format = answers.format;
        if (format === "json" || format === "yaml") {
          const data = await repo2skillStructured(answers.repo, { local: false });
          outputStructured(data, format);
        } else {
          const result = await repo2skill(answers.repo, {
            outputDir: path.resolve(opts.output),
            template: answers.template,
            github: answers.includeGithub,
          });
          printResult(result, opts.minQuality);
        }
        return;
      }

      // Upgrade mode
      if (opts.upgrade) {
        const result = await upgradeSkill(path.resolve(opts.upgrade));
        console.log(`\n✅ Skill upgraded: ${result.skillDir}`);
        console.log(`   Preserved ${result.manualSectionsPreserved} manual section(s)`);
        return;
      }

      // Diff mode
      if (opts.diff && repo) {
        const { diffSkill } = await import("./index");
        const result = await diffSkill(repo, path.resolve(opts.diff), { packagePath: opts.package });
        console.log(`\n🔍 Diff — ${repo} vs ${opts.diff}\n`);
        if (result.changes.length === 0) {
          console.log("  No changes detected.");
        } else {
          for (const change of result.changes) {
            const icon = change.type === "added" ? "+" : change.type === "removed" ? "-" : "~";
            console.log(`  ${icon} ${change.field}: ${change.summary}`);
          }
        }
        console.log("");
        return;
      }

      // Stats mode
      if (opts.stats) {
        showStats(path.resolve(opts.output));
        return;
      }

      // Local mode
      if (opts.local) {
        const format = opts.json ? "json" : opts.format;
        if (format === "json" || format === "yaml") {
          const data = await repo2skillStructured(opts.local, { local: true });
          outputStructured(data, format);
          return;
        }
        const result = await repo2skillLocal(opts.local, {
          outputDir: path.resolve(opts.output),
          skillName: opts.name,
          template: opts.template,
        });
        printResult(result, opts.minQuality);
        if (opts.publish && result.skillDir) await publishSkill(result.skillDir);
        return;
      }

      // JSON/structured format without writing files
      if ((opts.json || opts.format === "json" || opts.format === "yaml") && repo && !opts.batch) {
        const data = await repo2skillStructured(repo, { local: false });
        outputStructured(data, opts.json ? "json" : opts.format);
        return;
      }

      // Dry run
      if (opts.dryRun && repo) {
        const result = await repo2skillDryRun(repo, opts.name);
        console.log(`\n🔍 Dry Run — ${repo}\n`);
        console.log(`  Skill name:    ${result.skillName}`);
        console.log(`  Description:   ${result.description.slice(0, 120)}${result.description.length > 120 ? "..." : ""}`);
        console.log(`  Language:      ${result.language}`);
        console.log(`  Languages:     ${result.languages.join(", ")}`);
        console.log(`  Category:      ${result.category}`);
        console.log(`  CLI commands:  ${result.cliCommands.length > 0 ? result.cliCommands.join(", ") : "(none)"}`);
        console.log(`  Has tests:     ${result.hasTests ? "Yes" : "No"}`);
        console.log(`  License:       ${result.license || "Unknown"}`);
        console.log(`  Monorepo:      ${result.isMonorepo ? `Yes (${result.monorepoPackages.length} packages)` : "No"}`);
        console.log(`  Features:      ${result.features.length > 0 ? result.features.slice(0, 3).join("; ") : "(none detected)"}`);
        console.log(`  Code examples: ${result.usageExamples}`);
        console.log(`  Package name:  ${result.packageName}`);
        console.log(`  Install cmd:   ${result.installCommand}`);
        console.log(`  When to use:   ${result.whenToUse.join("; ")}`);
        console.log("");
        return;
      }

      // Batch mode
      if (opts.batch) {
        await runBatch(opts.batch, opts.output, opts.parallel || 1, opts.minQuality);
      } else if (repo) {
        const result = await repo2skill(repo, {
          outputDir: path.resolve(opts.output),
          skillName: opts.name,
          packagePath: opts.package,
          template: opts.template,
          github: opts.github,
        });
        printResult(result, opts.minQuality);
        if (opts.publish && result.skillDir) await publishSkill(result.skillDir);
      } else {
        console.error("❌ Provide a repo argument or use --batch <file> or --local <path>");
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  });

function outputStructured(data: any, format: string) {
  if (format === "yaml") {
    console.log(toYaml(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function toYaml(obj: any, indent = 0): string {
  const prefix = "  ".repeat(indent);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${prefix}${key}: null`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`);
      } else if (typeof value[0] === "object") {
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          lines.push(`${prefix}- ${toYaml(item, indent + 1).trimStart()}`);
        }
      } else {
        lines.push(`${prefix}${key}:`);
        for (const item of value) {
          lines.push(`${prefix}  - ${JSON.stringify(item)}`);
        }
      }
    } else if (typeof value === "object") {
      lines.push(`${prefix}${key}:`);
      lines.push(toYaml(value, indent + 1));
    } else if (typeof value === "string" && (value.includes("\n") || value.includes(":"))) {
      lines.push(`${prefix}${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${prefix}${key}: ${value}`);
    }
  }
  return lines.join("\n");
}

function printResult(result: { skillDir: string; referencesCount: number; quality?: any }, minQuality?: number) {
  console.log(`\n✅ Skill generated: ${result.skillDir}`);
  console.log(`   SKILL.md: ${path.join(result.skillDir, "SKILL.md")}`);
  if (result.referencesCount > 0) {
    console.log(`   References: ${result.referencesCount} file(s)`);
  }
  if (result.quality) {
    console.log("");
    console.log(formatQualityScore(result.quality));
    if (minQuality && result.quality.score < minQuality) {
      console.log(`\n   ⚠️  Below minimum quality (${minQuality}/${result.quality.maxScore}). Removing...`);
      fs.rmSync(result.skillDir, { recursive: true, force: true });
    }
  }
}

async function runBatch(batchFile: string, outputDir: string, parallel: number, minQuality?: number) {
  const filePath = path.resolve(batchFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Batch file not found: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));

  console.log(`📋 Batch mode: ${lines.length} repo(s) from ${batchFile} (parallel: ${parallel})\n`);

  const results: { repo: string; status: string; dir?: string; quality?: number }[] = [];

  if (parallel <= 1) {
    // Sequential
    for (let i = 0; i < lines.length; i++) {
      const repo = lines[i];
      console.log(`[${i + 1}/${lines.length}] Processing: ${repo}`);
      try {
        const result = await repo2skill(repo, { outputDir: path.resolve(outputDir) });
        const qScore = result.quality?.score ?? 0;
        results.push({ repo, status: "✅", dir: result.skillDir, quality: qScore });
        console.log(`  ✅ → ${result.skillDir} (${qScore}/${result.quality?.maxScore ?? 100})\n`);
        if (minQuality && qScore < minQuality) {
          console.log(`  ⚠️  Below min quality (${minQuality}). Removing.\n`);
          fs.rmSync(result.skillDir, { recursive: true, force: true });
          results[results.length - 1].status = "⚠️";
        }
      } catch (err: any) {
        results.push({ repo, status: "❌" });
        console.log(`  ❌ ${err.message}\n`);
      }
    }
  } else {
    // Parallel execution
    const chunks: string[][] = [];
    for (let i = 0; i < lines.length; i += parallel) {
      chunks.push(lines.slice(i, i + parallel));
    }

    let processed = 0;
    for (const chunk of chunks) {
      const promises = chunk.map(async (repo) => {
        processed++;
        console.log(`[${processed}/${lines.length}] Processing: ${repo}`);
        try {
          const result = await repo2skill(repo, { outputDir: path.resolve(outputDir) });
          const qScore = result.quality?.score ?? 0;
          results.push({ repo, status: "✅", dir: result.skillDir, quality: qScore });
          console.log(`  ✅ → ${result.skillDir} (${qScore}/${result.quality?.maxScore ?? 100})`);
          if (minQuality && qScore < minQuality) {
            console.log(`  ⚠️  Below min quality (${minQuality}). Removing.`);
            fs.rmSync(result.skillDir, { recursive: true, force: true });
            results[results.length - 1].status = "⚠️";
          }
        } catch (err: any) {
          results.push({ repo, status: "❌" });
          console.log(`  ❌ ${repo}: ${err.message}`);
        }
      });
      await Promise.all(promises);
    }
  }

  // Summary
  const success = results.filter(r => r.status === "✅").length;
  const failed = results.filter(r => r.status === "❌").length;
  const skipped = results.filter(r => r.status === "⚠️").length;
  console.log(`\n📊 Batch complete: ${success} succeeded, ${failed} failed, ${skipped} skipped (low quality) out of ${lines.length}`);
}

function showStats(outputDir: string) {
  if (!fs.existsSync(outputDir)) {
    console.error(`❌ Output directory not found: ${outputDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(outputDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  let totalSkills = 0;
  let totalSize = 0;
  const languages: Record<string, number> = {};

  for (const entry of entries) {
    const skillMdPath = path.join(outputDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;

    totalSkills++;
    const content = fs.readFileSync(skillMdPath, "utf-8");
    totalSize += content.length;

    const langMatch = content.match(/\*\*Language:\*\*\s*(.+)/);
    if (langMatch) {
      const langs = langMatch[1].split(",").map(l => l.trim());
      for (const lang of langs) {
        if (lang) languages[lang] = (languages[lang] || 0) + 1;
      }
    }
  }

  if (totalSkills === 0) {
    console.log(`\n📊 No skills found in ${outputDir}\n`);
    return;
  }

  const avgSize = Math.round(totalSize / totalSkills);
  const sortedLangs = Object.entries(languages).sort((a, b) => b[1] - a[1]);

  console.log(`\n📊 Skill Stats — ${outputDir}\n`);
  console.log(`  Total skills:     ${totalSkills}`);
  console.log(`  Avg SKILL.md:     ${(avgSize / 1024).toFixed(1)} KB (${avgSize} bytes)`);
  console.log(`\n  Languages:`);
  for (const [lang, count] of sortedLangs) {
    const bar = "█".repeat(Math.min(count, 20));
    console.log(`    ${lang.padEnd(15)} ${bar} ${count}`);
  }
  console.log("");
}

async function publishSkill(skillDir: string) {
  console.log(`\n📦 Publishing to ClawHub...`);
  try {
    execSync("clawhub --version", { stdio: "ignore" });
  } catch {
    console.error("❌ clawhub CLI not found. Install it: npm i -g clawhub");
    return;
  }
  try {
    execSync(`clawhub publish "${skillDir}"`, { stdio: "inherit" });
    console.log("✅ Published to ClawHub!");
  } catch (err: any) {
    console.error(`❌ Publish failed: ${err.message}`);
  }
}

// Lint subcommand
program
  .command("lint <file>")
  .description("Validate a SKILL.md file and show quality score")
  .action((file: string) => {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    const result = lintSkillMd(filePath);
    console.log(formatLintResult(result));
  });

// Compare subcommand
program
  .command("compare <repo1> <repo2>")
  .description("Compare two repos side by side (languages, features, quality, size)")
  .action(async (repo1: string, repo2: string) => {
    try {
      const os = require("os");
      const simpleGit = require("simple-git").default;

      async function resolveRepo(repo: string): Promise<{ dir: string; name: string; cleanup: boolean }> {
        if (fs.existsSync(repo) && fs.statSync(repo).isDirectory()) {
          return { dir: repo, name: path.basename(repo), cleanup: false };
        }
        const url = repo.startsWith("http") ? repo : `https://github.com/${repo}`;
        const name = repo.replace(/\.git$/, "").split("/").pop()!;
        const tmpDir = path.join(os.tmpdir(), `repo2skill-cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        console.log(`📦 Cloning ${repo}...`);
        await simpleGit().clone(url, tmpDir, ["--depth", "1"]);
        return { dir: tmpDir, name, cleanup: true };
      }

      const [r1, r2] = await Promise.all([resolveRepo(repo1), resolveRepo(repo2)]);
      try {
        console.log(`🔍 Analyzing ${r1.name} and ${r2.name}...`);
        const [a1, a2] = await Promise.all([
          analyzeRepo(r1.dir, r1.name),
          analyzeRepo(r2.dir, r2.name),
        ]);
        const comp = {
          left: buildComparisonEntry(a1),
          right: buildComparisonEntry(a2),
        };
        console.log(formatComparison(comp));
      } finally {
        if (r1.cleanup) fs.rmSync(r1.dir, { recursive: true, force: true });
        if (r2.cleanup) fs.rmSync(r2.dir, { recursive: true, force: true });
      }
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  });

// Changelog subcommand
program
  .command("changelog <repo>")
  .description("Generate skill-relevant changelog from git history")
  .option("-n, --max <count>", "Max commits to analyze", parseInt, 50)
  .action(async (repo: string, opts: any) => {
    try {
      const os = require("os");
      const simpleGit = require("simple-git").default;
      let repoDir: string;
      let cleanup = false;

      if (fs.existsSync(repo) && fs.statSync(repo).isDirectory()) {
        repoDir = repo;
      } else {
        const url = repo.startsWith("http") ? repo : `https://github.com/${repo}`;
        repoDir = path.join(os.tmpdir(), `repo2skill-cl-${Date.now()}`);
        console.log(`📦 Cloning ${repo}...`);
        await simpleGit().clone(url, repoDir, ["--single-branch"]);
        cleanup = true;
      }

      try {
        const changelog = await generateChangelog(repoDir, opts.max || 50);
        console.log(formatChangelog(changelog));
      } finally {
        if (cleanup) fs.rmSync(repoDir, { recursive: true, force: true });
      }
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  });

// Registry subcommand
const registryCmd = program
  .command("registry")
  .description("Manage local registry of generated skills");

registryCmd
  .command("list")
  .description("List all registered skills")
  .action(() => {
    const entries = registryList();
    if (entries.length === 0) {
      console.log("\n📋 Registry is empty. Use `repo2skill registry add owner/repo` to add skills.\n");
      return;
    }
    console.log(`\n📋 Registered Skills (${entries.length}):\n`);
    for (const entry of entries) {
      console.log(`  ${entry.repo}`);
      console.log(`    Dir: ${entry.skillDir}`);
      console.log(`    Generated: ${entry.generatedAt}`);
      if (entry.template) console.log(`    Template: ${entry.template}`);
      console.log("");
    }
  });

registryCmd
  .command("add <repo>")
  .description("Generate a skill and add to registry")
  .option("-o, --output <dir>", "Output directory", "./skills")
  .option("-t, --template <name>", "Template name", "default")
  .action(async (repo: string, opts: any) => {
    try {
      const result = await repo2skill(repo, {
        outputDir: path.resolve(opts.output),
        template: opts.template,
      });
      registryAdd(repo, result.skillDir, opts.template);
      console.log(`\n✅ Added ${repo} to registry`);
      printResult(result);
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  });

registryCmd
  .command("remove <repo>")
  .description("Remove a skill from registry")
  .action((repo: string) => {
    if (registryRemove(repo)) {
      console.log(`✅ Removed ${repo} from registry`);
    } else {
      console.log(`⚠️  ${repo} not found in registry`);
    }
  });

registryCmd
  .command("update-all")
  .description("Regenerate all skills from latest repo state")
  .action(async () => {
    const entries = registryList();
    if (entries.length === 0) {
      console.log("📋 Registry is empty.");
      return;
    }
    console.log(`\n🔄 Updating ${entries.length} skill(s)...\n`);
    for (const entry of entries) {
      try {
        console.log(`[${entry.repo}] Regenerating...`);
        const result = await repo2skill(entry.repo, {
          outputDir: path.dirname(entry.skillDir),
          template: entry.template,
        });
        registryAdd(entry.repo, result.skillDir, entry.template);
        console.log(`  ✅ Updated\n`);
      } catch (err: any) {
        console.log(`  ❌ ${err.message}\n`);
      }
    }
  });

registryCmd
  .command("clear")
  .description("Clear the entire registry")
  .action(() => {
    registryClear();
    console.log("✅ Registry cleared.");
  });

// Templates subcommand
program
  .command("templates")
  .description("List available SKILL.md templates")
  .action(() => {
    const templates = listTemplates();
    console.log("\n📄 Available Templates:\n");
    for (const t of templates) {
      console.log(`  ${t.name.padEnd(12)} ${t.description}`);
    }
    console.log("");
  });

program.parse();
