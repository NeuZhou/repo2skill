/**
 * AI-Enhanced Analysis — Use LLM to improve generated skills.
 * Requires OPENAI_API_KEY environment variable. Falls back gracefully without it.
 */

export interface AiEnhanceOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AiEnhanceResult {
  description: string;
  whenToUse: string[];
  differentiators: string[];
  examples: string[];
  enhanced: boolean;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/**
 * Check if AI enhancement is available (API key present).
 */
export function isAiAvailable(opts?: AiEnhanceOptions): boolean {
  return !!(opts?.apiKey || process.env.OPENAI_API_KEY);
}

/**
 * Enhance a skill analysis using an LLM.
 * Falls back gracefully if no API key is set — returns original data with enhanced=false.
 */
export async function aiEnhance(
  skillName: string,
  description: string,
  features: string[],
  language: string,
  readmeSnippet: string,
  opts?: AiEnhanceOptions,
): Promise<AiEnhanceResult> {
  const apiKey = opts?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      description,
      whenToUse: [],
      differentiators: [],
      examples: [],
      enhanced: false,
    };
  }

  const model = opts?.model || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const baseUrl = opts?.baseUrl || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;

  const prompt = buildPrompt(skillName, description, features, language, readmeSnippet);

  try {
    const response = await callLLM(baseUrl, apiKey, model, prompt);
    return parseResponse(response);
  } catch (err: any) {
    console.warn(`⚠️  AI enhancement failed: ${err.message}. Using original analysis.`);
    return {
      description,
      whenToUse: [],
      differentiators: [],
      examples: [],
      enhanced: false,
    };
  }
}

function buildPrompt(
  name: string,
  description: string,
  features: string[],
  language: string,
  readmeSnippet: string,
): string {
  return `You are a technical writer creating an OpenClaw agent skill description.

Given this repository analysis:
- Name: ${name}
- Language: ${language}
- Description: ${description}
- Features: ${features.slice(0, 10).join(", ")}
- README excerpt: ${readmeSnippet.slice(0, 800)}

Generate a JSON response with these fields:
1. "description" — A concise, action-oriented description (1-2 sentences, max 200 chars). Focus on what an AI agent can DO with this tool.
2. "whenToUse" — Array of 3-5 specific scenarios when an agent should use this skill. Be concrete (e.g. "Parse YAML configuration files" not "Work with data").
3. "differentiators" — Array of 2-3 key things that make this tool unique vs alternatives.
4. "examples" — Array of 1-2 short code/command examples showing the most common usage.

Respond ONLY with valid JSON, no markdown fences.`;
}

async function callLLM(baseUrl: string, apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  // Use native fetch (Node 18+) or dynamic import
  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LLM API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || "";
}

function parseResponse(raw: string): AiEnhanceResult {
  // Strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      description: typeof parsed.description === "string" ? parsed.description.slice(0, 300) : "",
      whenToUse: Array.isArray(parsed.whenToUse) ? parsed.whenToUse.map(String).slice(0, 6) : [],
      differentiators: Array.isArray(parsed.differentiators) ? parsed.differentiators.map(String).slice(0, 5) : [],
      examples: Array.isArray(parsed.examples) ? parsed.examples.map(String).slice(0, 3) : [],
      enhanced: true,
    };
  } catch {
    return {
      description: "",
      whenToUse: [],
      differentiators: [],
      examples: [],
      enhanced: false,
    };
  }
}
