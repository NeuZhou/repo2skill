#!/usr/bin/env node
import { Command } from "commander";
import { repo2skill } from "./index";
import * as path from "path";

const program = new Command();

program
  .name("repo2skill")
  .description("Convert any GitHub repo into an OpenClaw skill. One command.")
  .version("1.0.0")
  .argument("<repo>", "GitHub URL or owner/repo")
  .option("-o, --output <dir>", "Output directory", "./skills")
  .option("-n, --name <name>", "Override skill name")
  .action(async (repo: string, opts: { output: string; name?: string }) => {
    try {
      const result = await repo2skill(repo, {
        outputDir: path.resolve(opts.output),
        skillName: opts.name,
      });
      console.log(`\n✅ Skill generated: ${result.skillDir}`);
      console.log(`   SKILL.md: ${path.join(result.skillDir, "SKILL.md")}`);
      if (result.referencesCount > 0) {
        console.log(`   References: ${result.referencesCount} file(s)`);
      }
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
