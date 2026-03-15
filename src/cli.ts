#!/usr/bin/env node
import { Command } from "commander";
import { repo2skill, repo2skillJson, repo2skillDryRun } from "./index";
import * as path from "path";
import * as fs from "fs";

const program = new Command();

program
  .name("repo2skill")
  .description("Convert any GitHub repo into an OpenClaw skill. One command.")
  .version("1.0.0")
  .argument("[repo]", "GitHub URL or owner/repo")
  .option("-o, --output <dir>", "Output directory", "./skills")
  .option("-n, --name <name>", "Override skill name")
  .option("-b, --batch <file>", "Batch mode: file with one repo URL per line")
  .option("-j, --json", "Output analysis as JSON instead of generating files")
  .option("-d, --dry-run", "Preview what would be generated without writing files")
  .action(async (repo: string | undefined, opts: { output: string; name?: string; batch?: string; json?: boolean; dryRun?: boolean }) => {
    try {
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
        console.log(`  When to use:   ${result.whenToUse.join("; ")}`);
        console.log("");
        return;
      }
      if (opts.batch) {
        // Batch mode
        await runBatch(opts.batch, opts.output);
      } else if (repo) {
        // Single repo mode
        const result = await repo2skill(repo, {
          outputDir: path.resolve(opts.output),
          skillName: opts.name,
        });
        console.log(`\n✅ Skill generated: ${result.skillDir}`);
        console.log(`   SKILL.md: ${path.join(result.skillDir, "SKILL.md")}`);
        if (result.referencesCount > 0) {
          console.log(`   References: ${result.referencesCount} file(s)`);
        }
      } else {
        console.error("❌ Provide a repo argument or use --batch <file>");
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  });

async function runBatch(batchFile: string, outputDir: string) {
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
      console.log(`  ✅ → ${result.skillDir}\n`);
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

program.parse();
