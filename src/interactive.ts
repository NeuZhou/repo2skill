/**
 * Interactive Mode — guided prompts for repo2skill.
 */

import * as readline from "readline";

export interface InteractiveAnswers {
  repo: string;
  format: "markdown" | "json" | "yaml";
  template: "default" | "minimal" | "detailed" | "security";
  includeGithub: boolean;
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
    console.log("\n🎯 repo2skill — Interactive Mode\n");

    const repo = await ask(rl, "? Enter repo URL or owner/repo: ");
    if (!repo) throw new Error("No repo provided");

    const formatInput = await ask(rl, "? Output format (markdown/json/yaml) [markdown]: ");
    const format = (["markdown", "json", "yaml"].includes(formatInput) ? formatInput : "markdown") as InteractiveAnswers["format"];

    const templateInput = await ask(rl, "? Template (default/minimal/detailed/security) [default]: ");
    const template = (["default", "minimal", "detailed", "security"].includes(templateInput) ? templateInput : "default") as InteractiveAnswers["template"];

    const githubInput = await ask(rl, "? Include GitHub metadata? (Y/n): ");
    const includeGithub = githubInput.toLowerCase() !== "n";

    return { repo, format, template, includeGithub };
  } finally {
    rl.close();
  }
}
