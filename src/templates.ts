/**
 * Template System — different SKILL.md templates for different needs.
 */

export type TemplateName = "minimal" | "detailed" | "security" | "default";

export interface TemplateConfig {
  name: TemplateName;
  description: string;
  /** Which sections to include */
  sections: {
    whenToUse: boolean;
    whenNotToUse: boolean;
    quickStart: boolean;
    cliCommands: boolean;
    features: boolean;
    configuration: boolean;
    packages: boolean;
    examples: boolean;
    api: boolean;
    keyApi: boolean;
    docker: boolean;
    projectInfo: boolean;
    fileStructure: boolean;
    githubStats: boolean;
    securityConsiderations: boolean;
    threatModel: boolean;
  };
  /** Max code examples to include */
  maxExamples: number;
  /** Max features to list */
  maxFeatures: number;
  /** Include references dir */
  includeReferences: boolean;
}

const TEMPLATES: Record<TemplateName, TemplateConfig> = {
  minimal: {
    name: "minimal",
    description: "Just the basics — description, install, quick usage",
    sections: {
      whenToUse: true,
      whenNotToUse: false,
      quickStart: true,
      cliCommands: true,
      features: false,
      configuration: false,
      packages: false,
      examples: false,
      api: false,
      keyApi: false,
      docker: false,
      projectInfo: true,
      fileStructure: false,
      githubStats: false,
      securityConsiderations: false,
      threatModel: false,
    },
    maxExamples: 1,
    maxFeatures: 3,
    includeReferences: false,
  },
  detailed: {
    name: "detailed",
    description: "Full skill with API reference, examples, config, and stats",
    sections: {
      whenToUse: true,
      whenNotToUse: true,
      quickStart: true,
      cliCommands: true,
      features: true,
      configuration: true,
      packages: true,
      examples: true,
      api: true,
      keyApi: true,
      docker: true,
      projectInfo: true,
      fileStructure: true,
      githubStats: true,
      securityConsiderations: false,
      threatModel: false,
    },
    maxExamples: 5,
    maxFeatures: 10,
    includeReferences: true,
  },
  security: {
    name: "security",
    description: "Security-focused — includes threat model, auth patterns, known CVEs",
    sections: {
      whenToUse: true,
      whenNotToUse: true,
      quickStart: true,
      cliCommands: true,
      features: true,
      configuration: true,
      packages: false,
      examples: true,
      api: true,
      keyApi: true,
      docker: true,
      projectInfo: true,
      fileStructure: false,
      githubStats: true,
      securityConsiderations: true,
      threatModel: true,
    },
    maxExamples: 3,
    maxFeatures: 5,
    includeReferences: true,
  },
  default: {
    name: "default",
    description: "Balanced template (the original repo2skill output)",
    sections: {
      whenToUse: true,
      whenNotToUse: true,
      quickStart: true,
      cliCommands: true,
      features: true,
      configuration: true,
      packages: true,
      examples: true,
      api: true,
      keyApi: true,
      docker: true,
      projectInfo: true,
      fileStructure: true,
      githubStats: false,
      securityConsiderations: false,
      threatModel: false,
    },
    maxExamples: 3,
    maxFeatures: 5,
    includeReferences: true,
  },
};

export function getTemplate(name: string): TemplateConfig {
  const key = name.toLowerCase() as TemplateName;
  if (key in TEMPLATES) return TEMPLATES[key];
  throw new Error(`Unknown template: "${name}". Available: ${Object.keys(TEMPLATES).join(", ")}`);
}

export function listTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATES);
}

export function isValidTemplate(name: string): boolean {
  return name.toLowerCase() in TEMPLATES;
}
