import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";

export interface CLICommand {
  name: string;
  description?: string;
}

export interface BadgeInfo {
  type: string;   // e.g. "npm", "ci", "coverage", "license", "downloads"
  label: string;
  url: string;
}

export interface TOCEntry {
  level: number;
  title: string;
}

export type FrameworkType =
  | "mcp-server"
  | "ai-agent"
  | "web-framework"
  | "cli-tool"
  | "library"
  | "service"
  | "serverless"
  | "unknown";

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
  keyApi: string[];
  /** Actual package name from manifest (may differ from repo name) */
  packageName: string;
  /** Smart README parsing: install commands extracted from code blocks */
  readmeInstallCommands: string[];
  /** Smart README parsing: API examples extracted from code blocks */
  readmeApiExamples: string[];
  /** Smart README parsing: badge info extracted from README */
  badges: BadgeInfo[];
  /** Smart README parsing: table of contents structure */
  toc: TOCEntry[];
  /** Detected framework/project type */
  frameworkType: FrameworkType;
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
    keyApi: [],
    packageName: "",
    readmeInstallCommands: [],
    readmeApiExamples: [],
    badges: [],
    toc: [],
    frameworkType: "unknown",
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

    // Features extraction — try exact keys first, then partial match on section names containing "feature"
    const featuresKeys = ["features", "highlights", "why", "key features", "main features", "core features", "whats included", "what you get"];
    let featuresText = findFirstSection(analysis.sections, featuresKeys);
    if (!featuresText) {
      // Partial match: any section whose key contains "feature" or "highlight"
      for (const [key, value] of Object.entries(analysis.sections)) {
        if (key.includes("feature") || key.includes("highlight")) {
          featuresText = value;
          break;
        }
      }
    }
    // Fallback: extract feature-like bullet points from the first few README paragraphs
    if (!featuresText && analysis.readmeRaw) {
      const introFeatures = extractFeaturesFromIntro(analysis.readmeRaw);
      if (introFeatures.length > 0) {
        analysis.features = introFeatures;
      }
    }
    if (featuresText) {
      analysis.features = extractFeatureList(featuresText);
    }

    // Supplement features from package metadata if still empty/sparse
    if (analysis.features.length < 3) {
      const metaFeatures = extractFeaturesFromMetadata(repoDir, analysis, allFiles);
      for (const f of metaFeatures) {
        if (!analysis.features.includes(f)) analysis.features.push(f);
      }
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

    // Smart README parsing: install commands from code blocks
    analysis.readmeInstallCommands = extractInstallCommands(analysis.readmeRaw);

    // Smart README parsing: API examples from code blocks
    analysis.readmeApiExamples = extractApiExamples(analysis.readmeRaw);

    // Smart README parsing: badges
    analysis.badges = extractBadges(analysis.readmeRaw);

    // Smart README parsing: table of contents
    analysis.toc = extractTOC(analysis.readmeRaw);

    // Use badge info to supplement: license from badge if not found elsewhere
    if (!analysis.license) {
      const licenseBadge = analysis.badges.find(b => b.type === "license");
      if (licenseBadge) analysis.license = licenseBadge.label;
    }

    // If install instructions empty, try install commands from code blocks
    if (!analysis.installInstructions && analysis.readmeInstallCommands.length > 0) {
      analysis.installInstructions = "```bash\n" + analysis.readmeInstallCommands[0] + "\n```";
    }
  }

  // package.json (Node.js)
  const pkgPath = path.join(repoDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      analysis.description = analysis.description || pkg.description || "";
      if (pkg.name) analysis.packageName = pkg.name;
      if (pkg.bin) {
        const bins = typeof pkg.bin === "string" ? { [pkg.name || repoName]: pkg.bin } : pkg.bin;
        for (const [name] of Object.entries(bins)) {
          analysis.cliCommands.push({ name });
        }
      }
      if (pkg.dependencies) analysis.dependencies = Object.keys(pkg.dependencies);
      if (pkg.main) analysis.entryPoints.push(pkg.main);
      analysis.license = pkg.license || "";
    } catch (e: any) {
      console.warn(`⚠️  Could not parse package.json: ${e.message}`);
    }
  }

  // pyproject.toml (Python)
  const pyprojectPath = path.join(repoDir, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, "utf-8");
    const toml = require("@iarna/toml");
    try {
      const parsed = toml.parse(content);
      const proj = parsed.project || parsed.tool?.poetry || {};
      analysis.description = analysis.description || proj.description || "";
      if (proj.name && !analysis.packageName) analysis.packageName = proj.name;
      const scripts = proj.scripts || parsed.tool?.poetry?.scripts || {};
      for (const [name] of Object.entries(scripts)) {
        analysis.cliCommands.push({ name });
      }
      analysis.license = typeof proj.license === "string" ? proj.license : proj.license?.text || "";
    } catch (e: any) {
      console.warn(`⚠️  Could not parse pyproject.toml: ${e.message}`);
    }
  }

  // setup.py (Python fallback)
  const setupPyPath = path.join(repoDir, "setup.py");
  if (fs.existsSync(setupPyPath) && !analysis.description) {
    const content = fs.readFileSync(setupPyPath, "utf-8");
    const descMatch = content.match(/description\s*=\s*["']([^"']+)["']/);
    if (descMatch) analysis.description = descMatch[1];
    if (!analysis.packageName) {
      const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
      if (nameMatch) analysis.packageName = nameMatch[1];
    }
  }

  // setup.cfg (Python fallback)
  const setupCfgPath = path.join(repoDir, "setup.cfg");
  if (fs.existsSync(setupCfgPath)) {
    const content = fs.readFileSync(setupCfgPath, "utf-8");
    if (!analysis.packageName) {
      const nameMatch = content.match(/^\s*name\s*=\s*(.+)$/m);
      if (nameMatch) analysis.packageName = nameMatch[1].trim();
    }
    if (!analysis.description) {
      const descMatch = content.match(/^\s*description\s*=\s*(.+)$/m);
      if (descMatch) analysis.description = descMatch[1].trim();
    }
  }

  // Cargo.toml (Rust)
  const cargoPath = path.join(repoDir, "Cargo.toml");
  if (fs.existsSync(cargoPath)) {
    const content = fs.readFileSync(cargoPath, "utf-8");
    const toml = require("@iarna/toml");
    try {
      const parsed = toml.parse(content);
      const pkg = parsed.package || {};
      analysis.description = analysis.description || pkg.description || "";
      if (pkg.name && !analysis.packageName) analysis.packageName = pkg.name;
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

  // *.csproj (C#)
  const csprojFiles = allFiles.filter(f => f.endsWith(".csproj"));
  if (csprojFiles.length > 0) {
    const csprojPath = path.join(repoDir, csprojFiles[0]);
    try {
      const content = fs.readFileSync(csprojPath, "utf-8");
      // Extract properties
      const descMatch = content.match(/<Description>([^<]+)<\/Description>/i);
      const pkgIdMatch = content.match(/<PackageId>([^<]+)<\/PackageId>/i);
      const assemblyMatch = content.match(/<AssemblyName>([^<]+)<\/AssemblyName>/i);
      const versionMatch = content.match(/<Version>([^<]+)<\/Version>/i);
      const outputTypeMatch = content.match(/<OutputType>([^<]+)<\/OutputType>/i);

      if (descMatch) analysis.description = analysis.description || descMatch[1];
      const csprojName = pkgIdMatch?.[1] || assemblyMatch?.[1] || path.basename(csprojFiles[0], ".csproj");
      if (!analysis.packageName) analysis.packageName = csprojName;

      // Extract PackageReference dependencies
      const depRegex = /<PackageReference\s+Include="([^"]+)"/gi;
      let dm;
      while ((dm = depRegex.exec(content)) !== null) {
        if (!analysis.dependencies.includes(dm[1])) {
          analysis.dependencies.push(dm[1]);
        }
      }

      // Detect CLI (OutputType=Exe)
      if (outputTypeMatch && outputTypeMatch[1].toLowerCase() === "exe") {
        const exeName = assemblyMatch?.[1] || csprojName;
        if (!analysis.cliCommands.some(c => c.name === exeName)) {
          analysis.cliCommands.push({ name: exeName });
        }
      }

      // Install instructions
      if (!analysis.installInstructions) {
        analysis.installInstructions = `\`\`\`bash\ndotnet add package ${csprojName}\n\`\`\``;
      }

      // License from csproj
      const licenseMatch = content.match(/<PackageLicenseExpression>([^<]+)<\/PackageLicenseExpression>/i);
      if (licenseMatch && !analysis.license) analysis.license = licenseMatch[1];
    } catch {}

    if (!analysis.languages.includes("C#")) analysis.languages.unshift("C#");
    if (analysis.language === "unknown") analysis.language = "C#";
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

  // pubspec.yaml (Dart/Flutter)
  const pubspecPath = path.join(repoDir, "pubspec.yaml");
  if (fs.existsSync(pubspecPath)) {
    const content = fs.readFileSync(pubspecPath, "utf-8");
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    const dartName = nameMatch ? nameMatch[1].trim() : repoName;
    if (descMatch) analysis.description = analysis.description || descMatch[1].trim();
    // Extract dependencies
    const depsBlock = content.match(/^dependencies:\s*\n((?:\s+.+\n)*)/m);
    if (depsBlock) {
      const depLines = depsBlock[1].match(/^\s{2}(\w[\w_-]*):/gm);
      if (depLines) {
        analysis.dependencies.push(...depLines.map(d => d.trim().replace(/:$/, "")));
      }
    }
    const isFlutter = content.includes("flutter:") || fs.existsSync(path.join(repoDir, "android")) || fs.existsSync(path.join(repoDir, "ios"));
    const cmd = isFlutter ? "flutter pub add" : "dart pub add";
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`bash\n${cmd} ${dartName}\n\`\`\``;
    }
    analysis.entryPoints.push(dartName);
    const lang = isFlutter ? "Dart" : "Dart";
    if (!analysis.languages.includes("Dart")) analysis.languages.unshift("Dart");
    if (analysis.language === "unknown") analysis.language = "Dart";
  }

  // build.zig / build.zig.zon (Zig)
  const buildZigPath = path.join(repoDir, "build.zig");
  const buildZigZonPath = path.join(repoDir, "build.zig.zon");
  if (fs.existsSync(buildZigPath) || fs.existsSync(buildZigZonPath)) {
    let zigName = repoName;
    if (fs.existsSync(buildZigZonPath)) {
      const content = fs.readFileSync(buildZigZonPath, "utf-8");
      const nameMatch = content.match(/\.name\s*=\s*"([^"]+)"/);
      if (nameMatch) zigName = nameMatch[1];
    } else if (fs.existsSync(buildZigPath)) {
      const content = fs.readFileSync(buildZigPath, "utf-8");
      const nameMatch = content.match(/\.name\s*=\s*"([^"]+)"/);
      if (nameMatch) zigName = nameMatch[1];
    }
    analysis.description = analysis.description || `${zigName} - a Zig project`;
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`bash\nzig build\n\`\`\``;
    }
    analysis.entryPoints.push(zigName);
    if (!analysis.languages.includes("Zig")) analysis.languages.unshift("Zig");
    if (analysis.language === "unknown") analysis.language = "Zig";
  }

  // *.cabal / stack.yaml (Haskell)
  const cabalFiles = allFiles.filter(f => f.endsWith(".cabal"));
  if (cabalFiles.length > 0) {
    const cabalPath = path.join(repoDir, cabalFiles[0]);
    const content = fs.readFileSync(cabalPath, "utf-8");
    const nameMatch = content.match(/^name:\s*(.+)$/mi);
    const versionMatch = content.match(/^version:\s*(.+)$/mi);
    const descMatch = content.match(/^synopsis:\s*(.+)$/mi) || content.match(/^description:\s*(.+)$/mi);
    const cabalName = nameMatch ? nameMatch[1].trim() : repoName;
    if (descMatch) analysis.description = analysis.description || descMatch[1].trim();
    if (versionMatch) analysis.entryPoints.push(`${cabalName}@${versionMatch[1].trim()}`);
    // Extract exposed-modules
    const modulesMatch = content.match(/^exposed-modules:\s*([\s\S]*?)(?=^\S)/mi);
    if (modulesMatch) {
      const modules = modulesMatch[1].trim().split(/[\s,]+/).filter(m => m && /^[A-Z]/.test(m));
      analysis.keyApi.push(...modules.slice(0, 10));
    }
    // Extract build-depends
    const depsMatch = content.match(/build-depends:\s*([\s\S]*?)(?=^\S)/mi);
    if (depsMatch) {
      const deps = depsMatch[1].split(",").map(d => d.trim().split(/\s+/)[0]).filter(d => d && d !== "base");
      analysis.dependencies.push(...deps);
    }
    // Check for executables
    const execMatch = content.match(/^executable\s+(\S+)/mi);
    if (execMatch && !analysis.cliCommands.some(c => c.name === execMatch[1])) {
      analysis.cliCommands.push({ name: execMatch[1] });
    }
    if (!analysis.installInstructions) {
      const hasStack = fs.existsSync(path.join(repoDir, "stack.yaml"));
      analysis.installInstructions = hasStack
        ? `\`\`\`bash\nstack install ${cabalName}\n\`\`\``
        : `\`\`\`bash\ncabal install ${cabalName}\n\`\`\``;
    }
    if (!analysis.languages.includes("Haskell")) analysis.languages.unshift("Haskell");
    if (analysis.language === "unknown") analysis.language = "Haskell";
  } else if (fs.existsSync(path.join(repoDir, "stack.yaml"))) {
    if (!analysis.languages.includes("Haskell")) analysis.languages.unshift("Haskell");
    if (analysis.language === "unknown") analysis.language = "Haskell";
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`bash\nstack build\nstack install\n\`\`\``;
    }
  }

  // *.rockspec (Lua)
  const rockspecFiles = allFiles.filter(f => f.endsWith(".rockspec"));
  if (rockspecFiles.length > 0) {
    const rockspecPath = path.join(repoDir, rockspecFiles[0]);
    const content = fs.readFileSync(rockspecPath, "utf-8");
    const nameMatch = content.match(/package\s*=\s*["']([^"']+)["']/);
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
    const descMatch = content.match(/summary\s*=\s*["']([^"']+)["']/) || content.match(/description\s*=\s*["']([^"']+)["']/);
    const luaName = nameMatch ? nameMatch[1] : repoName;
    if (descMatch) analysis.description = analysis.description || descMatch[1];
    if (versionMatch) analysis.entryPoints.push(`${luaName}@${versionMatch[1]}`);
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`bash\nluarocks install ${luaName}\n\`\`\``;
    }
    if (!analysis.languages.includes("Lua")) analysis.languages.unshift("Lua");
    if (analysis.language === "unknown") analysis.language = "Lua";
  }

  // build.sbt (Scala)
  const buildSbtPath = path.join(repoDir, "build.sbt");
  if (fs.existsSync(buildSbtPath)) {
    const content = fs.readFileSync(buildSbtPath, "utf-8");
    const nameMatch = content.match(/name\s*:=\s*"([^"]+)"/);
    const versionMatch = content.match(/version\s*:=\s*"([^"]+)"/);
    const descMatch = content.match(/description\s*:=\s*"([^"]+)"/);
    const scalaName = nameMatch ? nameMatch[1] : repoName;
    if (descMatch) analysis.description = analysis.description || descMatch[1];
    if (versionMatch) analysis.entryPoints.push(`${scalaName}@${versionMatch[1]}`);
    // Extract libraryDependencies
    const depRegex = /"([^"]+)"\s*%%?\s*"([^"]+)"\s*%\s*"([^"]+)"/g;
    let dm;
    while ((dm = depRegex.exec(content)) !== null) {
      analysis.dependencies.push(`${dm[1]}:${dm[2]}:${dm[3]}`);
    }
    if (!analysis.installInstructions) {
      analysis.installInstructions = `\`\`\`scala\n// In build.sbt\nlibraryDependencies += "com.example" %% "${scalaName}" % "${versionMatch?.[1] || "LATEST"}"\n\`\`\``;
    }
    analysis.entryPoints.push(scalaName);
    if (!analysis.languages.includes("Scala")) analysis.languages.unshift("Scala");
    if (analysis.language === "unknown") analysis.language = "Scala";
  }

  // Key API extraction
  try {
    analysis.keyApi = extractKeyApi(repoDir, analysis, allFiles);
  } catch (e: any) {
    console.warn(`⚠️  Could not extract key API: ${e.message}`);
    analysis.keyApi = [];
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

  // Framework/project type detection
  analysis.frameworkType = detectFrameworkType(repoDir, analysis, allFiles);

  return analysis;
}

/**
 * Detect framework/project type from dependencies, file patterns, and source code.
 */
export function detectFrameworkType(repoDir: string, analysis: RepoAnalysis, allFiles: string[]): FrameworkType {
  const deps = analysis.dependencies.map(d => d.toLowerCase());
  const desc = (analysis.description + " " + analysis.richDescription + " " + analysis.readmeRaw.slice(0, 2000)).toLowerCase();
  const allFilesLower = allFiles.map(f => f.toLowerCase());

  // MCP Server detection
  const mcpDeps = ["@modelcontextprotocol/sdk", "mcp", "fastmcp", "mcp-server"];
  if (deps.some(d => mcpDeps.some(m => d.includes(m)))) return "mcp-server";
  // Check source for server.tool() patterns
  const srcFiles = allFiles.filter(f => /\.(ts|js|py)$/.test(f)).slice(0, 20);
  for (const f of srcFiles) {
    try {
      const content = fs.readFileSync(path.join(repoDir, f), "utf-8").slice(0, 5000);
      if (/server\.tool\s*\(/.test(content) || /McpServer|StdioServerTransport|FastMCP/.test(content)) {
        return "mcp-server";
      }
    } catch {}
  }
  if (desc.includes("mcp server") || desc.includes("model context protocol")) return "mcp-server";

  // AI Agent frameworks
  const aiDeps = ["langchain", "langgraph", "crewai", "autogen", "openai", "anthropic", "llamaindex", "llama-index",
    "semantic-kernel", "guidance", "dspy", "haystack", "transformers", "@langchain/core"];
  if (deps.some(d => aiDeps.some(a => d.includes(a)))) {
    // Distinguish agent frameworks from simple API wrappers
    const agentPatterns = ["agent", "chain", "crew", "autogen", "langgraph", "workflow", "orchestrat"];
    if (deps.some(d => agentPatterns.some(a => d.includes(a))) || desc.match(/\b(agent|multi-agent|agentic|orchestrat)/)) {
      return "ai-agent";
    }
  }

  // Web frameworks
  const webFrameworks: Record<string, string[]> = {
    "next": ["next", "@next/"],
    "nuxt": ["nuxt", "@nuxt/"],
    "sveltekit": ["@sveltejs/kit"],
    "remix": ["@remix-run/"],
    "astro": ["astro"],
    "gatsby": ["gatsby"],
    "express": ["express"],
    "fastify": ["fastify"],
    "hono": ["hono"],
    "flask": ["flask"],
    "django": ["django"],
    "fastapi": ["fastapi"],
    "rails": ["rails"],
    "spring": ["spring-boot", "spring-web"],
    "gin": ["github.com/gin-gonic/gin"],
    "fiber": ["github.com/gofiber/fiber"],
    "actix": ["actix-web"],
    "axum": ["axum"],
  };
  for (const [, patterns] of Object.entries(webFrameworks)) {
    if (deps.some(d => patterns.some(p => d.includes(p)))) return "web-framework";
  }
  if (allFilesLower.some(f => f === "next.config.js" || f === "next.config.mjs" || f === "next.config.ts")) return "web-framework";
  if (allFilesLower.some(f => f === "nuxt.config.ts" || f === "nuxt.config.js")) return "web-framework";
  if (allFilesLower.some(f => f === "svelte.config.js" || f === "svelte.config.ts")) return "web-framework";
  if (allFilesLower.some(f => f === "astro.config.mjs" || f === "astro.config.ts")) return "web-framework";

  // Serverless functions
  const serverlessPatterns = [
    "serverless.yml", "serverless.yaml", "serverless.ts",
    "sam.yaml", "template.yaml",
    "vercel.json",
    "netlify.toml",
    "firebase.json",
  ];
  if (allFilesLower.some(f => serverlessPatterns.includes(f))) return "serverless";
  if (deps.some(d => d.includes("@aws-cdk") || d.includes("aws-lambda") || d.includes("@azure/functions") || d.includes("@google-cloud/functions-framework"))) return "serverless";
  if (allFiles.some(f => /^functions?\//i.test(f) && /\.(ts|js|py)$/.test(f)) && (deps.includes("firebase-functions") || deps.includes("firebase-admin"))) return "serverless";

  // CLI tool (already has cliCommands)
  if (analysis.cliCommands.length > 0) return "cli-tool";

  // Service (has Dockerfile + exposed ports or docker-compose)
  if (analysis.dockerInfo && analysis.dockerInfo.exposedPorts.length > 0) return "service";
  if (allFilesLower.some(f => f === "docker-compose.yml" || f === "docker-compose.yaml")) return "service";

  // Library (default for anything with package manifest)
  if (analysis.packageName || analysis.dependencies.length > 0) return "library";

  return "unknown";
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

/**
 * Extract feature-like bullet points from the README intro (before the first ## section).
 * Many repos list features as bullet points right after the description.
 */
function extractFeaturesFromIntro(readme: string): string[] {
  // Get content before first ## heading (or first 100 lines)
  const lines = readme.split("\n");
  const introLines: string[] = [];
  let pastTitle = false;
  for (const line of lines) {
    if (/^#{2,3}\s/.test(line)) {
      if (pastTitle) break;
      pastTitle = true;
      continue;
    }
    if (/^#\s/.test(line)) { pastTitle = true; continue; }
    introLines.push(line);
  }
  const introText = introLines.join("\n");
  const features = extractFeatureList(introText);
  // Only return if we found a reasonable cluster of features (3+)
  return features.length >= 3 ? features.slice(0, 10) : [];
}

/**
 * Extract features from package metadata (keywords, description) and file structure.
 */
function extractFeaturesFromMetadata(repoDir: string, analysis: RepoAnalysis, allFiles: string[]): string[] {
  const features: string[] = [];

  // From package.json keywords
  const pkgPath = path.join(repoDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.keywords && Array.isArray(pkg.keywords)) {
        for (const kw of pkg.keywords.slice(0, 5)) {
          if (typeof kw === "string" && kw.length > 2 && kw.length < 50) {
            features.push(kw.charAt(0).toUpperCase() + kw.slice(1) + " support");
          }
        }
      }
    } catch {}
  }

  // From pyproject.toml keywords
  const pyprojectPath = path.join(repoDir, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    try {
      const toml = require("@iarna/toml");
      const parsed = toml.parse(fs.readFileSync(pyprojectPath, "utf-8"));
      const proj = parsed.project || parsed.tool?.poetry || {};
      if (proj.keywords && Array.isArray(proj.keywords)) {
        for (const kw of proj.keywords.slice(0, 5)) {
          if (typeof kw === "string" && kw.length > 2 && kw.length < 50) {
            features.push(kw.charAt(0).toUpperCase() + kw.slice(1) + " support");
          }
        }
      }
    } catch {}
  }

  // From file structure detection
  if (analysis.hasTests && !features.some(f => /test/i.test(f))) features.push("Test suite included");
  if (allFiles.some(f => /^docs?\//i.test(f) || f === "docs/index.md" || f === "docs/README.md")) features.push("Documentation included");
  if (allFiles.some(f => /^\.github\/workflows\//i.test(f) || f === ".travis.yml" || f === ".circleci/config.yml")) features.push("CI/CD configured");
  if (allFiles.some(f => f === "CHANGELOG.md" || f === "CHANGES.md" || f === "HISTORY.md")) features.push("Changelog maintained");
  if (allFiles.some(f => /^examples?\//i.test(f))) features.push("Example code provided");
  if (allFiles.some(f => f === "Dockerfile" || f === "docker-compose.yml" || f === "docker-compose.yaml")) features.push("Docker support");
  if (allFiles.some(f => /\.d\.ts$/.test(f) || f === "tsconfig.json") && analysis.language !== "TypeScript") features.push("TypeScript support");

  // From package description
  const desc = (analysis.description || "").toLowerCase();
  if (desc.includes("async") || desc.includes("asynchronous")) features.push("Async/await support");
  if (desc.includes("streaming") || desc.includes("stream")) features.push("Streaming support");
  if (desc.includes("type") && (desc.includes("safe") || desc.includes("typed"))) features.push("Type-safe API");

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
  if (desc.includes("client") || desc.includes("http client") || desc.includes("fetch") || desc.includes("request library")) {
    // Only categorize as http-client if it's truly an HTTP library, not an SDK/API client
    if (!/\b(sdk|ai|llm|model|agent|mcp|protocol|langchain|openai|anthropic|cohere|gemini|api client|cloud)\b/i.test(desc)) {
      return "http-client";
    }
  }
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

  // General keyword-based, but filtered to avoid false positives
  // Only suggest "Make HTTP requests" if the project's PRIMARY purpose is HTTP
  if (category !== "server-framework" && category !== "http-client") {
    const isHttpLibrary = /\b(http client|http library|request library|fetch|ajax|http request)\b/i.test(desc)
      && !/\b(sdk|ai|llm|model|agent|mcp|protocol|langchain|openai|anthropic|cohere|gemini)\b/i.test(desc);
    if (isHttpLibrary) items.push("Make HTTP requests");
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
  if (/\b(http client|http library|request library)\b/i.test(desc) && !/\b(sdk|ai|llm|model|agent|mcp|protocol)\b/i.test(desc)) phrases.push("make http request", "fetch url");
  if (desc.includes("search") || desc.includes("grep")) phrases.push("search files", "find in code");
  if (desc.includes("lint") || desc.includes("format")) phrases.push("lint code", "format code");
  if (desc.includes("json")) phrases.push("parse json", "process json");

  return [...new Set(phrases)].slice(0, 8);
}

function extractKeyApi(repoDir: string, analysis: RepoAnalysis, allFiles: string[]): string[] {
  const exports: string[] = [];

  // Node.js: parse package.json main/exports, scan for export statements
  const pkgPath = path.join(repoDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const mainFile = pkg.main || pkg.exports?.["."]?.import || pkg.exports?.["."]?.require || pkg.exports?.["."] || "index.js";
      const candidates = [mainFile, "index.ts", "index.js", "src/index.ts", "src/index.js"].map(f => path.join(repoDir, f));
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            const content = fs.readFileSync(candidate, "utf-8");
            // export function/class/const/type
            const exportRegex = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|type|interface|enum)\s+(\w+)/g;
            let m;
            while ((m = exportRegex.exec(content)) !== null) {
              if (!exports.includes(m[1])) exports.push(m[1]);
            }
            // export { ... }
            const reExportRegex = /export\s*\{([^}]+)\}/g;
            while ((m = reExportRegex.exec(content)) !== null) {
              const names = m[1].split(",").map(n => n.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean);
              for (const name of names) {
                if (name && !exports.includes(name)) exports.push(name);
              }
            }
          } catch {}
          if (exports.length > 0) break;
        }
      }
    } catch {}
  }

  // Python: scan __init__.py
  if (exports.length === 0) {
    const initFiles = allFiles.filter(f => f.endsWith("__init__.py")).sort((a, b) => a.length - b.length);
    for (const initFile of initFiles.slice(0, 2)) {
      try {
        const content = fs.readFileSync(path.join(repoDir, initFile), "utf-8");
        // from .x import Y
        const importRegex = /from\s+\S+\s+import\s+([^(\n]+)/g;
        let m;
        while ((m = importRegex.exec(content)) !== null) {
          const names = m[1].split(",").map(n => n.trim().split(/\s+as\s+/).pop()!.trim()).filter(n => n && !n.startsWith("_"));
          for (const name of names) {
            if (!exports.includes(name)) exports.push(name);
          }
        }
        // __all__ = [...]
        const allMatch = content.match(/__all__\s*=\s*\[([^\]]+)\]/);
        if (allMatch) {
          const names = allMatch[1].match(/["'](\w+)["']/g);
          if (names) {
            for (const n of names) {
              const name = n.replace(/["']/g, "");
              if (!exports.includes(name)) exports.push(name);
            }
          }
        }
        // class/def at top level
        const defRegex = /^(?:class|def)\s+(\w+)/gm;
        while ((m = defRegex.exec(content)) !== null) {
          if (!m[1].startsWith("_") && !exports.includes(m[1])) exports.push(m[1]);
        }
      } catch {}
      if (exports.length > 0) break;
    }
  }

  return exports.slice(0, 10);
}

/**
 * Extract install commands from README code blocks.
 * Looks for common install patterns: npm install, pip install, cargo install, etc.
 */
export function extractInstallCommands(readme: string): string[] {
  const commands: string[] = [];
  const codeBlockRegex = /```(?:bash|sh|shell|console|zsh|powershell|cmd)?\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(readme)) !== null) {
    const block = match[1];
    for (const line of block.split("\n")) {
      const trimmed = line.replace(/^\$\s*/, "").trim();
      if (/^(?:npm|yarn|pnpm|bun)\s+(?:install|add|i)\s+/i.test(trimmed) ||
          /^pip3?\s+install\s+/i.test(trimmed) ||
          /^cargo\s+(?:install|add)\s+/i.test(trimmed) ||
          /^go\s+(?:install|get)\s+/i.test(trimmed) ||
          /^gem\s+install\s+/i.test(trimmed) ||
          /^composer\s+require\s+/i.test(trimmed) ||
          /^brew\s+install\s+/i.test(trimmed) ||
          /^apt(?:-get)?\s+install\s+/i.test(trimmed) ||
          /^dotnet\s+add\s+package\s+/i.test(trimmed) ||
          /^luarocks\s+install\s+/i.test(trimmed) ||
          /^mix\s+(?:deps\.get|archive\.install)\s*/i.test(trimmed) ||
          /^cabal\s+install\s+/i.test(trimmed) ||
          /^stack\s+install\s+/i.test(trimmed)) {
        if (!commands.includes(trimmed)) commands.push(trimmed);
      }
    }
  }
  return commands;
}

/**
 * Extract API usage examples from README code blocks.
 * Looks for code blocks that contain import/require/from statements or function calls.
 */
export function extractApiExamples(readme: string): string[] {
  const examples: string[] = [];
  const codeBlockRegex = /```(?:js|javascript|ts|typescript|python|py|rust|go|ruby|java|kotlin|swift|dart|elixir|php|csharp|cs|c\+\+|cpp)?\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(readme)) !== null) {
    const block = match[1].trim();
    // Must contain at least one API-like pattern
    if (/(?:import\s|require\s*\(|from\s+\S+\s+import|use\s+\w|include\s|#include|using\s)/.test(block) ||
        /\w+\s*\(/.test(block)) {
      // Skip pure install/shell commands
      if (!/^(?:npm|pip|cargo|go|gem|composer|brew|apt|curl|wget)\s/m.test(block)) {
        examples.push(match[0]);
      }
    }
  }
  return examples.slice(0, 10);
}

/**
 * Extract badge info from README.
 * Parses common badge patterns like shields.io, img.shields.io, badgen.net.
 */
export function extractBadges(readme: string): BadgeInfo[] {
  const badges: BadgeInfo[] = [];
  // Match: [![alt](img-url)](link-url) or ![alt](img-url)
  const badgeRegex = /!?\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = badgeRegex.exec(readme)) !== null) {
    const alt = match[1] || match[4] || "";
    const imgUrl = match[2] || match[5] || "";
    const linkUrl = match[3] || "";

    // Only process badge-like images (shields.io, badgen, badge URLs)
    if (!imgUrl.includes("shield") && !imgUrl.includes("badge") && !imgUrl.includes("badgen") &&
        !imgUrl.includes("coveralls") && !imgUrl.includes("codecov") && !imgUrl.includes("travis") &&
        !imgUrl.includes("github.com") && !imgUrl.includes("npmjs")) {
      continue;
    }

    let type = "other";
    const combined = (alt + " " + imgUrl + " " + linkUrl).toLowerCase();
    if (combined.includes("npm") || combined.includes("version")) type = "npm";
    else if (combined.includes("ci") || combined.includes("build") || combined.includes("action") || combined.includes("travis") || combined.includes("circleci")) type = "ci";
    else if (combined.includes("coverage") || combined.includes("codecov") || combined.includes("coveralls")) type = "coverage";
    else if (combined.includes("license")) type = "license";
    else if (combined.includes("download")) type = "downloads";
    else if (combined.includes("star")) type = "stars";
    else if (combined.includes("size") || combined.includes("bundle")) type = "size";

    badges.push({ type, label: alt, url: linkUrl || imgUrl });
  }
  return badges;
}

/**
 * Extract table of contents structure from README headings.
 */
export function extractTOC(readme: string): TOCEntry[] {
  const entries: TOCEntry[] = [];
  const lines = readme.split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      entries.push({
        level: match[1].length,
        title: match[2].replace(/[^\w\s-]/g, "").trim(),
      });
    }
  }
  return entries;
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
