/**
 * Interactive Mode - guided prompts for repo2skill.
 * v3.5.0: Enhanced with skill/readme/both output, tests, and publish options.
 */

import * as readline from "readline";

export interface InteractiveAnswers {
  repo: string;
  format: "markdown" | "json" | "yaml";
  outputType: "skill" | "readme" | "both";
  template: "default" | "minimal" | "detailed" | "security";
  includeGithub: boolean;
  includeExamples: boolean;
  includeApi: boolean;
  includeTests: boolean;
  publishToClawHub: boolean;
}

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

export async function runInteractive(): Promise<InteractiveAnswers> {
  const rl = createInterface();

  try {
    console.log("\n🦀 Welcome to repo2skill!\n");

    const repo = await ask(rl, "? Enter GitHub repo URL: ");
    if (!repo) throw new Error("No repo provided");

    console.log(`\nAnalyzing ${repo}...`);

    const outputTypeInput = await ask(rl, "? Output format? (skill / readme / both) [skill]: ");
    const outputType = (["skill", "readme", "both"].includes(outputTypeInput) ? outputTypeInput : "skill") as InteractiveAnswers["outputType"];

    const formatInput = await ask(rl, "? File format (markdown/json/yaml) [markdown]: ");
    const format = (["markdown", "json", "yaml"].includes(formatInput) ? formatInput : "markdown") as InteractiveAnswers["format"];

    const templateInput = await ask(rl, "? Template (default/minimal/detailed/security) [default]: ");
    const template = (["default", "minimal", "detailed", "security"].includes(templateInput) ? templateInput : "default") as InteractiveAnswers["template"];

    const githubInput = await ask(rl, "? Include GitHub metadata? (Y/n): ");
    const includeGithub = githubInput.toLowerCase() !== "n";

    const examplesInput = await ask(rl, "? Include examples? (Y/n): ");
    const includeExamples = examplesInput.toLowerCase() !== "n";

    const apiInput = await ask(rl, "? Include API reference? (Y/n): ");
    const includeApi = apiInput.toLowerCase() !== "n";

    const testsInput = await ask(rl, "? Include tests? (Y/n): ");
    const includeTests = testsInput.toLowerCase() !== "n";

    const publishInput = await ask(rl, "? Publish to ClawHub? (y/N): ");
    const publishToClawHub = publishInput.toLowerCase() === "y";

    console.log("\n⚡ Generating SKILL.md...\n");

    return { repo, format, outputType, template, includeGithub, includeExamples, includeApi, includeTests, publishToClawHub };
  } finally {
    rl.close();
  }
}

/**
 * Display analysis summary during interactive mode.
 */
export function displayAnalysisSummary(info: {
  languages: string[];
  type: string;
  commandCount: number;
}): void {
  console.log(`  Found: ${info.languages.join(", ")}, ${info.type}, ${info.commandCount} commands`);
}
