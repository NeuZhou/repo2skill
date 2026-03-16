/**
 * Interactive Mode - guided prompts for repo2skill.
 * v3.4.0: Enhanced with analysis summary display and more options.
 */

import * as readline from "readline";

export interface InteractiveAnswers {
  repo: string;
  format: "markdown" | "json" | "yaml";
  template: "default" | "minimal" | "detailed" | "security";
  includeGithub: boolean;
  includeExamples: boolean;
  includeApi: boolean;
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
    console.log("\n🚀 Welcome to repo2skill!\n");

    const repo = await ask(rl, "Enter repo URL or path: ");
    if (!repo) throw new Error("No repo provided");

    console.log(`\nAnalyzing ${repo}...`);

    const formatInput = await ask(rl, "Output format (markdown/json/yaml) [markdown]: ");
    const format = (["markdown", "json", "yaml"].includes(formatInput) ? formatInput : "markdown") as InteractiveAnswers["format"];

    const templateInput = await ask(rl, "Template (default/minimal/detailed/security) [default]: ");
    const template = (["default", "minimal", "detailed", "security"].includes(templateInput) ? templateInput : "default") as InteractiveAnswers["template"];

    const githubInput = await ask(rl, "Include GitHub metadata? (Y/n): ");
    const includeGithub = githubInput.toLowerCase() !== "n";

    const examplesInput = await ask(rl, "Include examples? (Y/n): ");
    const includeExamples = examplesInput.toLowerCase() !== "n";

    const apiInput = await ask(rl, "Include API reference? (Y/n): ");
    const includeApi = apiInput.toLowerCase() !== "n";

    console.log("\nGenerating SKILL.md...\n");

    return { repo, format, template, includeGithub, includeExamples, includeApi };
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
