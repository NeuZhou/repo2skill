import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";

export interface CLICommand {
  name: string;
  description?: string;
}

export interface RepoAnalysis {
  name: string;
  description: string;
  richDescription: string;
  whenToUse: string[];
  whenNotToUse: string[];
  triggerPhrases: string[];
  language: string;
  languages: string[];
  cliCommands: CLICommand[];
  installInstructions: string;
  usageSection: string;
  usageExamples: string[];
  configSection: string;
  features: string[];
  apiSection: string;
  examplesSection: string;
  readmeRaw: string;
  readmeFirstParagraph: string;
  dependencies: string[];
  entryPoints: string[];
  hasTests: boolean;
  license: string;
  sections: Record<string, string>;
  fileTree: string;
  isMonorepo: boolean;
  monorepoPackages: string[];
  dockerInfo?: {
    baseImage: string;
    exposedPorts: string[];
    entrypoint: string;
  };
}

export async function analyzeRepo(repoDir: string, repoName: string): Promise<RepoAnalysis> {
  const analysis: RepoAnalysis = {
    name: repoName,
    description: "",
    richDescription: "",
    whenToUse: [],
    whenNotToUse: [],
    triggerPhrases: [],
    language: "unknown",
    languages: [],
    cliCommands: [],
    installInstructions: "",
    usageSection: "",
    usageExamples: [],
    configSection: "",
    features: [],
    apiSection: "",
    examplesSection: "",
    readmeRaw: "",
    readmeFirstParagraph: "",
    dependencies: [],
    entryPoints: [],
    hasTests: false,
    license: "",
    sections: {},
    fileTree: "",
    isMonorepo: false,
    monorepoPackages: [],
  };

  // File tree (top 2 levels)
  analysis.fileTree = buildFileTree(repoDir, 2);

  // Detect languages
  const allFiles = await glob("**/*", { cwd: repoDir, nodir: true, ignore: ["node_modules/**", ".git/**", "vendor/**", "__pycache__/**"] });
  analysis.languages = detectLanguages(allFiles);
  analysis.language = analysis.languages[0] || "unknown";
  analysis.hasTests = allFiles.some(f => /test|spec|__tests__/i.test(f));

  // Monorepo detection
  const monorepoDirs = ["packages", "libs", "modules", "apps"];
  for (const dir of monorepoDirs) {
    const dirPath = path.join(repoDir, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      analysis.isMonorepo = true;
      try {
        const pkgs = fs.readdirSync(dirPath, { withFileTypes: true })
          .filter(e => e.isDirectory() && !e.name.startsWith("."))
          .map(e => e.name);
        analysis.monorepoPackages.push(...pkgs);
      } catch {}
    }
  }
  // Also detect workspaces in package.json
  const rootPkgPath = path.join(repoDir, "package.json");
  if (fs.existsSync(rootPkgPath)) {
    try {
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
      if (rootPkg.workspaces) {
        analysis.isMonorepo = true;
      }
    } catch {}
  }
  // Detect pnpm-workspace.yaml or lerna.json
  if (fs.existsSync(path.join(repoDir, "pnpm-workspace.yaml")) || fs.existsSync(path.join(repoDir, "lerna.json"))) {
    analysis.isMonorepo = true;
  }

  // README
  const readmePath = findFile(repoDir, ["README.md", "readme.md", "Readme.md"]);
  if (readmePath) {
    analysis.readmeRaw = fs.readFileSync(readmePath, "utf-8");
    analysis.readmeFirstParagraph = extractFirstParagraph(analysis.readmeRaw);
    analysis.sections = extractSections(analysis.readmeRaw);

    // Usage section — try multiple alternative header names
    const usageKeys = ["usage", "getting started", "quickstart", "quick start", "tutorial", "basic usage", "how to use", "documentation"];
    analysis.usageSection = findFirstSection(analysis.sections, usageKeys);

    analysis.apiSection = analysis.sections["api"] || analysis.sections["api reference"] || "";
    analysis.examplesSection = analysis.sections["examples"] || analysis.sections["example"] || "";

    // Install instructions
    const installKeys = ["install", "installation", "setup", "getting started"];
    analysis.installInstructions = findFirstSection(analysis.sections, installKeys);

    // Configuration section
    const configKeys = ["configuration", "config", "options", "settings"];
    analysis.configSection = findFirstSection(analysis.sections, configKeys);

    // Features extraction
    const featuresKeys = ["features", "highlights", "why"];
    const featuresText = findFirstSection(analysis.sections, featuresKeys);
    if (featuresText) {
      analysis.features = extractFeatureList(featuresText);
    }

    // Extract all code examples from usage/examples/API/config sections
    analysis.usageExamples = [
      ...extractCodeBlocks(analysis.usageSection),
      ...extractCodeBlocks(analysis.examplesSection),
      ...extractCodeBlocks(analysis.apiSection),
      ...extractCodeBlocks(analysis.configSection),
    ];

    // Rich description: prefer first meaningful README paragraph over package.json one-liner
    analysis.richDescription = extractRichDescription(analysis.readmeRaw);
  }

  // package.json (Node.js)
  const pkgPath = path.join(repoDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    analysis.description = analysis.description || pkg.description || "";
    if (pkg.bin) {
      const bins = typeof pkg.bin === "string" ? { [pkg.name || repoName]: pkg.bin } : pkg.bin;
      for (const [name] of Object.entries(bins)) {
        analysis.cliCommands.push({ name });
      }
    }
    if (pkg.dependencies) analysis.dependencies = Object.keys(pkg.dependencies);
    if (pkg.main) analysis.entryPoints.push(pkg.main);
    analysis.license = pkg.license || "";
  }

  // pyproject.toml (Python)
  const pyprojectPath = path.join(repoDir, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, "utf-8");
    const toml = require("toml");
    try {
      const parsed = toml.parse(content);
      const proj = parsed.project || parsed.tool?.poetry || {};
      analysis.description = analysis.description || proj.description || "";
      const scripts = proj.scripts || parsed.tool?.poetry?.scripts || {};
      for (const [name] of Object.entries(scripts)) {
        analysis.cliCommands.push({ name });
      }
      analysis.license = typeof proj.license === "string" ? proj.license : proj.license?.text || "";
    } catch {}
  }

  // setup.py (Python fallback)
  const setupPyPath = path.join(repoDir, "setup.py");
  if (fs.existsSync(setupPyPath) && !analysis.description) {
    const content = fs.readFileSync(setupPyPath, "utf-8");
    const descMatch = content.match(/description\s*=\s*["']([^"']+)["']/);
    if (descMatch) analysis.description = descMatch[1];
  }

  // Cargo.toml (Rust)
  const cargoPath = path.join(repoDir, "Cargo.toml");
  if (fs.existsSync(cargoPath)) {
    const content = fs.readFileSync(cargoPath, "utf-8");
    const toml = require("toml");
    try {
      const parsed = toml.parse(content);
      const pkg = parsed.package || {};
      analysis.description = analysis.description || pkg.description || "";
      analysis.license = pkg.license || "";
      if (parsed.bin || fs.existsSync(path.join(repoDir, "src", "main.rs"))) {
        analysis.cliCommands.push({ name: pkg.name || repoName });
      }
    } catch {}
  }

  // Gemfile / .gemspec (Ruby)
  const gemfilePath = path.join(repoDir, "Gemfile");
  const gemspecs = allFiles.filter(f => f.endsWith(".gemspec"));
  if (gemspecs.length > 0) {
    const specPath = path.join(repoDir, gemspecs[0]);
    const content = fs.readFileSync(specPath, "utf-8");
    const nameMatch = content.match(/\.name\s*=\s*["']([^"']+)["']/);
    const versionMatch = content.match(/\.version\s*=\s*["']([^"']+)["']/);
    const descMatch = content.match(/\.summary\s*=\s*["']([^"']+)["']/) || content.match(/\.description\s*=\s*["']([^"']+)["']/);
    if (nameMatch) {
      const gemName = nameMatch[1];
      if (!analysis.installInstructions) {
        analysis.installInstructions = `gem install ${gemName}`;
      }
      if (!analysis.cliCommands.some(c => c.name === gemName)) {
        // Check for executables
        const execMatch = content.match(/\.executables\s*=\s*\[([^\]]+)\]/);
        if (execMatch) {
          const execs = execMatch[1].match(/["']([^"']+)["']/g);
          if (execs) {
            for (const e of execs) {
              const name = e.replace(/["']/g, "");
              analysis.cliCommands.push({ name });
            }
          }
        }
      }
      if (descMatch) analysis.description = analysis.description || descMatch[1];
      if (versionMatch) analysis.entryPoints.push(`${gemName}@${versionMatch[1]}`);
    }
    // Extract dependencies from gemspec
    const depRegex = /\.add(?:_runtime)?_dependency\s*\(?["']([^"']+)["']/g;
    let depMatch;
    while ((depMatch = depRegex.exec(content)) !== null) {
      analysis.dependencies.push(depMatch[1]);
    }
    if (!analysis.languages.includes("Ruby")) analysis.languages.unshift("Ruby");
    if (analysis.language === "unknown") analysis.language = "Ruby";
  } else if (fs.existsSync(gemfilePath)) {
    const content = fs.readFileSync(gemfilePath, "utf-8");
    const gems = content.match(/gem\s+["']([^"']+)["']/g);
    if (gems) {
      analysis.dependencies.push(...gems.map(g => g.match(/["']([^"']+)["']/)![1]));
    }
    if (!analysis.languages.includes("Ruby")) analysis.languages.unshift("Ruby");
    if (analysis.language === "unknown") analysis.language = "Ruby";
  }

  // pom.xml (Maven - Java/Kotlin)
  const pomPath = path.join(repoDir, "pom.xml");
  if (fs.existsSync(pomPath)) {
    const content = fs.readFileSync(pomPath, "utf-8");
    const groupId = content.match(/<groupId>([^<]+)<\/groupId>/);
    const artifactId = content.match(/<artifactId>([^<]+)<\/artifactId>/);
    const version = content.match(/<version>([^<]+)<\/version>/);
    const descMatch = content.match(/<description>([^<]+)<\/description>/);
    if (artifactId) {
      const name = artifactId[1];
      if (groupId) analysis.entryPoints.push(`${groupId[1]}:${name}`);
      if (version) analysis.entryPoints.push(`${name}@${version[1]}`);
      if (!analysis.installInstructions) {
        analysis.installInstructions = `<!-- Maven -->\n<dependency>\n  <groupId>${groupId?.[1] || "com.example"}</groupId>\n  <artifactId>${name}</artifactId>\n  <version>${version?.[1] || "LATEST"}</version>\n</dependency>`;
      }
    }
    if (descMatch) analysis.description = analysis.description || descMatch[1];
    // Extract dependencies
    const depRegex = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>/g;
    let dm;
    while ((dm = depRegex.exec(content)) !== null) {
      analysis.dependencies.push(`${dm[1]}:${dm[2]}`);
    }
    const lang = allFiles.some(f => f.endsWith(".kt") || f.endsWith(".kts")) ? "Kotlin" : "Java";
    if (!analysis.languages.includes(lang)) analysis.languages.unshift(lang);
    if (analysis.language === "unknown") analysis.language = lang;
  }

  // build.gradle / build.gradle.kts (Gradle - Java/Kotlin)
  const gradleFile = findFile(repoDir, ["build.gradle.kts", "build.gradle"]);
  if (gradleFile && !fs.existsSync(pomPath)) {
    const content = fs.readFileSync(gradleFile, "utf-8");
    const groupMatch = content.match(/group\s*=\s*["']([^"']+)["']/);
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
    if (groupMatch) analysis.entryPoints.push(groupMatch[1]);
    if (versionMatch) analysis.entryPoints.push(`version@${versionMatch[1]}`);
    // Extract dependencies
    const depRegex = /(?:implementation|api|compile)\s*\(?["']([^"']+)["']/g;
    let gm;
    while ((gm = depRegex.exec(content)) !== null) {
      analysis.dependencies.push(gm[1]);
    }
    if (!analysis.installInstructions) {
      const artifact = groupMatch ? groupMatch[1] : analysis.name;
      analysis.installInstructions = `// Gradle\nimplementation '${artifact}:${versionMatch?.[1] || "LATEST"}'`;
    }
    const lang = gradleFile.endsWith(".kts") || allFiles.some(f => f.endsWith(".kt")) ? "Kotlin" : "Java";
    if (!analysis.languages.includes(lang)) analysis.languages.unshift(lang);
    if (analysis.language === "unknown") analysis.language = lang;
  }

  // go.mod (Go)
  const goModPath = path.join(repoDir, "go.mod");
  if (fs.existsSync(goModPath)) {
    const content = fs.readFileSync(goModPath, "utf-8");
    const moduleMatch = content.match(/^module\s+(.+)$/m);
    if (moduleMatch) {
      const moduleName = moduleMatch[1].trim();
      if (!analysis.entryPoints.includes(moduleName)) {
        analysis.entryPoints.push(moduleName);
      }
    }
    // Extract dependencies
    const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireBlock) {
      const deps = requireBlock[1].match(/^\s*(\S+)\s+/gm);
      if (deps) {
        analysis.dependencies.push(...deps.map(d => d.trim().split(/\s+/)[0]));
      }
    }
    // Check for main.go -> CLI tool
    if (fs.existsSync(path.join(repoDir, "main.go")) || fs.existsSync(path.join(repoDir, "cmd"))) {
      const name = moduleMatch ? moduleMatch[1].trim().split("/").pop()! : repoName;
      if (!analysis.cliCommands.some(c => c.name === name)) {
        analysis.cliCommands.push({ name });
      }
    }
    if (!analysis.languages.includes("Go")) analysis.languages.unshift("Go");
    if (analysis.language === "unknown") analysis.language = "Go";
  }

  // CMakeLists.txt / Makefile (C/C++)
  const cmakePath = path.join(repoDir, "CMakeLists.txt");
  const makefilePath = findFile(repoDir, ["Makefile", "makefile", "GNUmakefile"]);
  if (fs.existsSync(cmakePath)) {
    const content = fs.readFileSync(cmakePath, "utf-8");
    const projectMatch = content.match(/project\s*\(\s*(\w+)/i);
    const projName = projectMatch ? projectMatch[1] : repoName;
    analysis.description = analysis.description || `${projName} — a C/C++ project built with CMake`;
    // Detect library vs executable
    const hasLib = /add_library\s*\(/i.test(content);
    const hasExe = /add_executable\s*\(/i.test(content);
    if (hasExe) {
      const exeMatch = content.match(/add_executable\s*\(\s*(\w+)/i);
      const exeName = exeMatch ? exeMatch[1] : projName;
      if (!analysis.cliCommands.some(c => c.name === exeName)) {
        analysis.cliCommands.push({ name: exeName });
      }
    }
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`bash\nmkdir build && cd build\ncmake ..\nmake\n${hasExe ? "# Binary available in build/" : "make install"}\n\`\`\``;
    }
    analysis.entryPoints.push(projName);
    const lang = allFiles.some(f => /\.(cpp|cc|cxx|hpp)$/i.test(f)) ? "C++" : "C";
    if (!analysis.languages.includes(lang)) analysis.languages.unshift(lang);
    if (analysis.language === "unknown") analysis.language = lang;
  } else if (makefilePath) {
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`bash\nmake\nmake install\n\`\`\``;
    }
    const lang = allFiles.some(f => /\.(cpp|cc|cxx|hpp)$/i.test(f)) ? "C++" : "C";
    if (!analysis.languages.includes(lang)) analysis.languages.unshift(lang);
    if (analysis.language === "unknown") analysis.language = lang;
  }

  // composer.json (PHP)
  const composerPath = path.join(repoDir, "composer.json");
  if (fs.existsSync(composerPath)) {
    try {
      const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));
      analysis.description = analysis.description || composer.description || "";
      const composerName = composer.name || repoName;
      if (composer.bin) {
        const bins = Array.isArray(composer.bin) ? composer.bin : [composer.bin];
        for (const b of bins) {
          const binName = path.basename(b);
          if (!analysis.cliCommands.some(c => c.name === binName)) {
            analysis.cliCommands.push({ name: binName });
          }
        }
      }
      if (composer.require) {
        analysis.dependencies.push(...Object.keys(composer.require).filter(d => d !== "php" && !d.startsWith("ext-")));
      }
      if (!analysis.installInstructions) {
        analysis.installInstructions = `\`\`\`bash\ncomposer require ${composerName}\n\`\`\``;
      }
      analysis.license = composer.license || "";
      analysis.entryPoints.push(composerName);
    } catch {}
    if (!analysis.languages.includes("PHP")) analysis.languages.unshift("PHP");
    if (analysis.language === "unknown") analysis.language = "PHP";
  }

  // mix.exs (Elixir)
  const mixPath = path.join(repoDir, "mix.exs");
  if (fs.existsSync(mixPath)) {
    const content = fs.readFileSync(mixPath, "utf-8");
    const appMatch = content.match(/app:\s*:(\w+)/);
    const versionMatch = content.match(/version:\s*"([^"]+)"/);
    const descMatch = content.match(/description:\s*"([^"]+)"/);
    const appName = appMatch ? appMatch[1] : repoName;
    analysis.description = analysis.description || (descMatch ? descMatch[1] : `${appName} — an Elixir project`);
    if (versionMatch) analysis.entryPoints.push(`${appName}@${versionMatch[1]}`);
    // Extract deps
    const depsBlock = content.match(/defp?\s+deps\b[\s\S]*?\[([^\]]*)\]/);
    if (depsBlock) {
      const depNames = depsBlock[1].match(/:\w+/g);
      if (depNames) {
        analysis.dependencies.push(...depNames.map(d => d.slice(1)));
      }
    }
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`elixir\n# In mix.exs deps:\n{:${appName}, "~> ${versionMatch?.[1] || "0.1.0"}"}\n\`\`\`\n\n\`\`\`bash\nmix deps.get\n\`\`\``;
    }
    analysis.entryPoints.push(appName);
    if (!analysis.languages.includes("Elixir")) analysis.languages.unshift("Elixir");
    if (analysis.language === "unknown") analysis.language = "Elixir";
  }

  // Package.swift (Swift)
  const packageSwiftPath = path.join(repoDir, "Package.swift");
  if (fs.existsSync(packageSwiftPath)) {
    const content = fs.readFileSync(packageSwiftPath, "utf-8");
    // Extract package name
    const nameMatch = content.match(/name:\s*"([^"]+)"/);
    const pkgName = nameMatch ? nameMatch[1] : repoName;
    // Extract targets
    const targetRegex = /\.(?:executableTarget|target|testTarget)\s*\(\s*name:\s*"([^"]+)"/g;
    let tm;
    const targets: string[] = [];
    while ((tm = targetRegex.exec(content)) !== null) {
      targets.push(tm[1]);
    }
    // Extract dependencies
    const depRegex = /\.package\s*\(\s*url:\s*"([^"]+)"/g;
    let dm;
    while ((dm = depRegex.exec(content)) !== null) {
      const depUrl = dm[1];
      const depName = depUrl.replace(/\.git$/, "").split("/").pop() || depUrl;
      analysis.dependencies.push(depName);
    }
    // Detect executable targets
    const execTargetRegex = /\.executableTarget\s*\(\s*name:\s*"([^"]+)"/g;
    let em;
    while ((em = execTargetRegex.exec(content)) !== null) {
      if (!analysis.cliCommands.some(c => c.name === em![1])) {
        analysis.cliCommands.push({ name: em[1] });
      }
    }
    if (!analysis.description) {
      analysis.description = `${pkgName} — a Swift package${targets.length > 0 ? ` with targets: ${targets.join(", ")}` : ""}`;
    }
    if (!analysis.installInstructions) {
      analysis.installInstructions = `// In Package.swift, add to dependencies:\n.package(url: "https://github.com/${repoName}", from: "1.0.0")\n\n// Then add to target dependencies:\n.product(name: "${pkgName}", package: "${pkgName}")`;
    }
    analysis.entryPoints.push(pkgName);
    if (!analysis.languages.includes("Swift")) analysis.languages.unshift("Swift");
    if (analysis.language === "unknown") analysis.language = "Swift";
  }

  // Dockerfile
  const dockerfilePath = findFile(repoDir, ["Dockerfile", "dockerfile"]);
  if (dockerfilePath) {
    const content = fs.readFileSync(dockerfilePath, "utf-8");
    const fromMatch = content.match(/^FROM\s+(\S+)/mi);
    const exposeMatches = [...content.matchAll(/^EXPOSE\s+(.+)/gmi)];
    const entrypointMatch = content.match(/^(?:ENTRYPOINT|CMD)\s+(.+)/mi);
    analysis.dockerInfo = {
      baseImage: fromMatch ? fromMatch[1] : "unknown",
      exposedPorts: exposeMatches.flatMap(m => m[1].trim().split(/\s+/)),
      entrypoint: entrypointMatch ? entrypointMatch[1].trim() : "",
    };
  }

  // Fallback description from README
  if (!analysis.description) {
    analysis.description = analysis.readmeFirstParagraph;
  }

  // Use rich description if available, otherwise fall back to description
  if (!analysis.richDescription) {
    analysis.richDescription = analysis.description;
  }

  // Generate "when to use" / "when not to use" / trigger phrases
  analysis.whenToUse = generateWhenToUse(analysis);
  analysis.whenNotToUse = generateWhenNotToUse(analysis);
  analysis.triggerPhrases = generateTriggerPhrases(analysis);

  return analysis;
}

function findFile(dir: string, names: string[]): string | null {
  for (const name of names) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")   // Remove HTML tags
    .replace(/&[a-z]+;/gi, "") // Remove HTML entities
    .replace(/\s+/g, " ")      // Collapse whitespace
    .trim();
}

export function extractFirstParagraph(readme: string): string {
  const lines = readme.split("\n");
  let started = false;
  let inHtmlBlock = false;
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Track multi-line HTML blocks
    if (!inHtmlBlock && /^<[a-zA-Z]/.test(trimmed)) {
      inHtmlBlock = true;
    }
    if (inHtmlBlock) {
      if (/<\/[a-zA-Z]+>/.test(trimmed) || /\/>/.test(trimmed)) {
        inHtmlBlock = false;
      }
      continue;
    }
    if (!started) {
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[") || trimmed.startsWith("!") || trimmed.startsWith("<") || trimmed.startsWith("---")) continue;
      started = true;
    }
    if (started) {
      if (!trimmed && result.length > 0) break;
      result.push(trimmed);
    }
  }
  return stripHtmlTags(result.join(" ")).slice(0, 300);
}

/**
 * Extract a rich description: first 1-3 meaningful paragraphs from README,
 * skipping badges, headings, HTML blocks, and images.
 */
function extractRichDescription(readme: string): string {
  const lines = readme.split("\n");
  const paragraphs: string[] = [];
  let current: string[] = [];
  let inCodeBlock = false;
  let inHtmlBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;

    // Track multi-line HTML blocks (div, img, a, picture, table, etc.)
    if (!inHtmlBlock && /^<[a-zA-Z]/.test(trimmed)) {
      inHtmlBlock = true;
    }
    if (inHtmlBlock) {
      // Check if the HTML block closes on this line
      if (/<\/[a-zA-Z]+>/.test(trimmed) || /\/>/.test(trimmed)) {
        inHtmlBlock = false;
      }
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }

    // Skip headings, badges, images, HTML
    if (trimmed.startsWith("#") || trimmed.startsWith("[!") || trimmed.startsWith("![") || trimmed.startsWith("---")) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }

    // Skip badge-only lines
    if (/^\[!\[.*\]\(.*\)\]\(.*\)$/.test(trimmed) || /^!\[.*\]\(.*\)$/.test(trimmed)) continue;

    if (!trimmed) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
      continue;
    }

    current.push(trimmed);
  }
  if (current.length > 0) paragraphs.push(current.join(" "));

  // Take first 2 meaningful paragraphs (min 20 chars each), strip HTML
  const meaningful = paragraphs.map(p => stripHtmlTags(p)).filter(p => p.length >= 20);
  return meaningful.slice(0, 2).join("\n\n").slice(0, 600);
}

function extractSections(readme: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = readme.split("\n");
  let currentSection = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) {
      if (currentSection) {
        sections[currentSection.toLowerCase()] = currentContent.join("\n").trim();
      }
      currentSection = match[1].replace(/[^\w\s]/g, "").trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentSection) {
    sections[currentSection.toLowerCase()] = currentContent.join("\n").trim();
  }
  return sections;
}

function extractCodeBlocks(text: string): string[] {
  if (!text) return [];
  const blocks: string[] = [];
  const regex = /```[\s\S]*?```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function findFirstSection(sections: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (sections[key]) return sections[key];
  }
  return "";
}

function extractFeatureList(text: string): string[] {
  const features: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    // Match bullet points: -, *, or numbered lists
    const match = trimmed.match(/^[-*•]\s+(.+)/) || trimmed.match(/^\d+[.)]\s+(.+)/);
    if (match) {
      // Strip markdown bold/links, keep text
      let feature = match[1].replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      if (feature.length > 10 && feature.length < 200) {
        features.push(feature);
      }
    }
  }
  return features;
}

function detectLanguages(files: string[]): string[] {
  const counts: Record<string, number> = {};
  const extMap: Record<string, string> = {
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
    ".py": "Python",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++", ".cc": "C++", ".cxx": "C++",
    ".c": "C",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".lua": "Lua",
    ".zig": "Zig",
    ".dart": "Dart",
    ".ex": "Elixir", ".exs": "Elixir",
    ".hs": "Haskell",
    ".scala": "Scala",
    ".r": "R", ".R": "R",
  };
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const lang = extMap[ext];
    if (lang) counts[lang] = (counts[lang] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

export function categorizeProject(analysis: RepoAnalysis): string {
  const desc = (analysis.richDescription + " " + analysis.description + " " + analysis.readmeFirstParagraph).toLowerCase();
  if (desc.includes("server") || desc.includes("web framework") || desc.includes("web server") || desc.includes("http server") || desc.includes("api framework")) return "server-framework";
  if (/\bcli\b/.test(desc) || desc.includes("command-line") || desc.includes("command line")) return "cli-tool";
  if (desc.includes("client") || desc.includes("http client") || desc.includes("fetch") || desc.includes("request library")) return "http-client";
  if (desc.includes("framework")) return "framework";
  if (desc.includes("library") || desc.includes("utility") || desc.includes("utilities")) return "library";
  if (desc.includes("tool") || desc.includes("toolkit")) return "tool";
  if (analysis.cliCommands.length > 0) return "cli-tool";
  return "library";
}

function generateWhenToUse(analysis: RepoAnalysis): string[] {
  const items: string[] = [];
  const isCLI = analysis.cliCommands.length > 0;
  const category = categorizeProject(analysis);
  const desc = (analysis.richDescription + " " + analysis.description).toLowerCase();

  if (isCLI) {
    for (const cmd of analysis.cliCommands) {
      items.push(`Run \`${cmd.name}\` commands`);
    }
  }

  // Category-aware suggestions
  switch (category) {
    case "server-framework":
      items.push(`Build web servers or APIs with ${analysis.name}`);
      if (desc.includes("rest")) items.push("Create RESTful API endpoints");
      if (desc.includes("plugin") || desc.includes("extensib")) items.push("Build extensible server applications");
      break;
    case "http-client":
      items.push("Make HTTP requests");
      if (desc.includes("api")) items.push("Interact with REST APIs");
      break;
    case "cli-tool":
      if (desc.includes("build") || desc.includes("bundl")) items.push("Build or bundle projects");
      break;
    case "framework":
      items.push(`Build ${analysis.language} applications with ${analysis.name}`);
      break;
  }

  // General keyword-based, but filtered by category to avoid mismatches
  if (category !== "server-framework") {
    if (desc.includes("http") || desc.includes("request")) items.push("Make HTTP requests");
  }
  if (desc.includes("test")) items.push("Run or write tests");
  if (desc.includes("lint") || desc.includes("format")) items.push("Lint or format code");
  if (desc.includes("parse") || desc.includes("pars")) items.push("Parse data or files");
  if (desc.includes("search") || desc.includes("find") || desc.includes("grep")) items.push("Search through files or text");
  if (desc.includes("color") || desc.includes("terminal") || desc.includes("ansi")) items.push("Style terminal output");
  if (category !== "cli-tool" && (desc.includes("cli") || desc.includes("command"))) items.push("Build command-line interfaces");

  if (items.length === 0) {
    items.push(`Work with the ${analysis.name} ${analysis.language} project`);
  }

  return [...new Set(items)].slice(0, 6);
}

function generateWhenNotToUse(analysis: RepoAnalysis): string[] {
  const items: string[] = [];
  const isCLI = analysis.cliCommands.length > 0;

  if (isCLI) items.push("GUI or web-based workflows where CLI is not available");
  if (analysis.language !== "unknown") {
    const others = ["Python", "JavaScript", "TypeScript", "Rust", "Go", "Java"]
      .filter(l => !analysis.languages.includes(l))
      .slice(0, 2);
    if (others.length > 0) items.push(`Projects using ${others.join(" or ")} (different ecosystem)`);
  }

  return items.slice(0, 3);
}

function generateTriggerPhrases(analysis: RepoAnalysis): string[] {
  const phrases: string[] = [];
  const name = analysis.name.toLowerCase();

  phrases.push(`use ${name}`);
  phrases.push(`install ${name}`);
  phrases.push(`how to use ${name}`);

  for (const cmd of analysis.cliCommands) {
    phrases.push(`run ${cmd.name}`);
    phrases.push(`${cmd.name} command`);
  }

  const desc = (analysis.richDescription + " " + analysis.description).toLowerCase();
  if (desc.includes("http") || desc.includes("request")) phrases.push("make http request", "fetch url");
  if (desc.includes("search") || desc.includes("grep")) phrases.push("search files", "find in code");
  if (desc.includes("lint") || desc.includes("format")) phrases.push("lint code", "format code");
  if (desc.includes("json")) phrases.push("parse json", "process json");

  return [...new Set(phrases)].slice(0, 8);
}

function buildFileTree(dir: string, maxDepth: number, prefix = "", depth = 0): string {
  if (depth >= maxDepth) return "";
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "__pycache__" && e.name !== "vendor")
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  const lines: string[] = [];
  for (let i = 0; i < entries.length && i < 30; i++) {
    const e = entries[i];
    const isLast = i === entries.length - 1 || i === 29;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    lines.push(`${prefix}${connector}${e.name}${e.isDirectory() ? "/" : ""}`);
    if (e.isDirectory()) {
      const sub = buildFileTree(path.join(dir, e.name), maxDepth, prefix + childPrefix, depth + 1);
      if (sub) lines.push(sub);
    }
  }
  if (entries.length > 30) lines.push(`${prefix}... (${entries.length - 30} more)`);
  return lines.join("\n");
}
