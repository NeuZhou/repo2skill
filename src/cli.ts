#!/usr/bin/env node
import { Command } from "commander";
import { repo2skill, repo2skillJson, repo2skillDryRun, upgradeSkill, repo2skillLocal } from "./index";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

const program = new Command();

program
  .name("repo2skill")
  .description("Convert any GitHub repo into an OpenClaw skill. One command.")
  .version("1.5.0")
  .argument("[repo]", "GitHub URL or owner/repo")
  .option("-o, --output <dir>", "Output directory", "./skills")
  .option("-n, --name <name>", "Override skill name")
  .option("-b, --batch <file>", "Batch mode: file with one repo URL per line")
  .option("-j, --json", "Output analysis as JSON instead of generating files")
  .option("-d, --dry-run", "Preview what would be generated without writing files")
  .option("-v, --verbose", "Show detailed analysis during generation")
  .option("-s, --stats", "Show aggregate stats of generated skills in output directory")
  .option("-p, --publish", "Publish to ClawHub after generating")
  .option("-u, --upgrade <skill-dir>", "Re-analyze and regenerate an existing skill, preserving <!-- manual --> sections")
  .option("-l, --local <path>", "Analyze a local repo without cloning")
  .option("--min-quality <score>", "Skip skills below this quality score (1-5)", parseInt)
  .action(async (repo: string | undefined, opts: { output: string; name?: string; batch?: string; json?: boolean; dryRun?: boolean; verbose?: boolean; stats?: boolean; publish?: boolean; upgrade?: string; local?: string; minQuality?: number }) => {
    try {
      // Set verbose mode globally
      if (opts.verbose) {
        process.env.REPO2SKILL_VERBOSE = "1";
      }
      if (opts.upgrade) {
        const result = await upgradeSkill(path.resolve(opts.upgrade));
        console.log(`\n✅ Skill upgraded: ${result.skillDir}`);
        console.log(`   Preserved ${result.manualSectionsPreserved} manual section(s)`);
        return;
      }
      if (opts.stats) {
        showStats(path.resolve(opts.output));
        return;
      }
      if (opts.local) {
        const result = await repo2skillLocal(opts.local, {
          outputDir: path.resolve(opts.output),
          skillName: opts.name,
        });
        printResult(result, opts.minQuality);
        if (opts.publish && result.skillDir) await publishSkill(result.skillDir);
        return;
      }
      if (opts.json && repo) {
        const result = await repo2skillJson(repo);
        console.log(JSON.stringify(result, null, 2));
        return;
      }
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
      if (opts.batch) {
        await runBatch(opts.batch, opts.output, opts.minQuality);
      } else if (repo) {
        const result = await repo2skill(repo, {
          outputDir: path.resolve(opts.output),
          skillName: opts.name,
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

function printResult(result: { skillDir: string; referencesCount: number; quality?: { score: number; details: Record<string, boolean> } }, minQuality?: number) {
  console.log(`\n✅ Skill generated: ${result.skillDir}`);
  console.log(`   SKILL.md: ${path.join(result.skillDir, "SKILL.md")}`);
  if (result.referencesCount > 0) {
    console.log(`   References: ${result.referencesCount} file(s)`);
  }
  if (result.quality) {
    console.log(`   ⭐ Skill quality: ${result.quality.score}/5`);
    if (minQuality && result.quality.score < minQuality) {
      console.log(`   ⚠️  Below minimum quality (${minQuality}). Removing...`);
      fs.rmSync(result.skillDir, { recursive: true, force: true });
    }
  }
}

async function runBatch(batchFile: string, outputDir: string, minQuality?: number) {
  const filePath = path.resolve(batchFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Batch file not found: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#")); // Skip empty lines and comments

  console.log(`📋 Batch mode: ${lines.length} repo(s) from ${batchFile}\n`);

  const results: { repo: string; status: string; dir?: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const repo = lines[i];
    console.log(`[${i + 1}/${lines.length}] Processing: ${repo}`);
    try {
      const result = await repo2skill(repo, {
        outputDir: path.resolve(outputDir),
      });
      results.push({ repo, status: "✅", dir: result.skillDir });
      const qStr = result.quality ? ` (⭐ ${result.quality.score}/5)` : "";
      console.log(`  ✅ → ${result.skillDir}${qStr}\n`);
      if (minQuality && result.quality && result.quality.score < minQuality) {
        console.log(`  ⚠️  Below min quality (${minQuality}). Removing.\n`);
        fs.rmSync(result.skillDir, { recursive: true, force: true });
        results[results.length - 1].status = "⚠️";
      }
    } catch (err: any) {
      results.push({ repo, status: "❌" });
      console.log(`  ❌ ${err.message}\n`);
    }
  }

  // Summary
  const success = results.filter(r => r.status === "✅").length;
  const failed = results.filter(r => r.status === "❌").length;
  console.log(`\n📊 Batch complete: ${success} succeeded, ${failed} failed out of ${lines.length}`);
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

    // Extract language from "**Language:** ..." line
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

program.parse();
