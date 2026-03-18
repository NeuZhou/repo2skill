/**
 * Multi-Language Support — Enhanced detection and context generation.
 * Supports 20+ languages with package file detection, entry points, and install commands.
 */

import * as path from "path";
import * as fs from "fs";

export interface LanguageConfig {
  /** Display name */
  name: string;
  /** File extensions (lowercase, with dot) */
  extensions: string[];
  /** Package/manifest files */
  packageFiles: string[];
  /** Common entry points */
  entryPoints: string[];
  /** Install command template (use {name} for package name) */
  installTemplate?: string;
  /** Build command template */
  buildTemplate?: string;
  /** Test command template */
  testTemplate?: string;
  /** Package manager name */
  packageManager?: string;
}

export interface LanguageProfile {
  /** Language name */
  language: string;
  /** File count for this language */
  fileCount: number;
  /** Percentage of total source files */
  percentage: number;
  /** Whether a package manifest was found */
  hasManifest: boolean;
  /** Detected package manager */
  packageManager?: string;
  /** Detected entry points that exist */
  detectedEntryPoints: string[];
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  typescript: {
    name: "TypeScript",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
    packageFiles: ["package.json", "tsconfig.json"],
    entryPoints: ["src/index.ts", "index.ts", "src/main.ts", "main.ts", "src/app.ts"],
    installTemplate: "npm install {name}",
    buildTemplate: "npm run build",
    testTemplate: "npm test",
    packageManager: "npm",
  },
  javascript: {
    name: "JavaScript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    packageFiles: ["package.json"],
    entryPoints: ["index.js", "src/index.js", "main.js", "src/main.js", "app.js"],
    installTemplate: "npm install {name}",
    buildTemplate: "npm run build",
    testTemplate: "npm test",
    packageManager: "npm",
  },
  python: {
    name: "Python",
    extensions: [".py", ".pyi"],
    packageFiles: ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"],
    entryPoints: ["main.py", "app.py", "__init__.py", "src/__init__.py", "cli.py"],
    installTemplate: "pip install {name}",
    buildTemplate: "python -m build",
    testTemplate: "pytest",
    packageManager: "pip",
  },
  rust: {
    name: "Rust",
    extensions: [".rs"],
    packageFiles: ["Cargo.toml"],
    entryPoints: ["src/main.rs", "src/lib.rs"],
    installTemplate: "cargo install {name}",
    buildTemplate: "cargo build --release",
    testTemplate: "cargo test",
    packageManager: "cargo",
  },
  go: {
    name: "Go",
    extensions: [".go"],
    packageFiles: ["go.mod"],
    entryPoints: ["main.go", "cmd/", "cmd/main.go"],
    installTemplate: "go install {name}@latest",
    buildTemplate: "go build ./...",
    testTemplate: "go test ./...",
    packageManager: "go",
  },
  java: {
    name: "Java",
    extensions: [".java"],
    packageFiles: ["pom.xml", "build.gradle", "build.gradle.kts"],
    entryPoints: ["src/main/java/", "src/main/"],
    buildTemplate: "mvn package",
    testTemplate: "mvn test",
    packageManager: "maven",
  },
  kotlin: {
    name: "Kotlin",
    extensions: [".kt", ".kts"],
    packageFiles: ["build.gradle.kts", "build.gradle", "pom.xml"],
    entryPoints: ["src/main/kotlin/", "src/main/"],
    buildTemplate: "gradle build",
    testTemplate: "gradle test",
    packageManager: "gradle",
  },
  swift: {
    name: "Swift",
    extensions: [".swift"],
    packageFiles: ["Package.swift"],
    entryPoints: ["Sources/", "Sources/main.swift"],
    buildTemplate: "swift build",
    testTemplate: "swift test",
    packageManager: "spm",
  },
  ruby: {
    name: "Ruby",
    extensions: [".rb"],
    packageFiles: ["Gemfile", "*.gemspec"],
    entryPoints: ["lib/", "bin/", "app.rb", "config.ru"],
    installTemplate: "gem install {name}",
    buildTemplate: "bundle exec rake build",
    testTemplate: "bundle exec rspec",
    packageManager: "gem",
  },
  php: {
    name: "PHP",
    extensions: [".php"],
    packageFiles: ["composer.json"],
    entryPoints: ["index.php", "src/", "public/index.php"],
    installTemplate: "composer require {name}",
    testTemplate: "vendor/bin/phpunit",
    packageManager: "composer",
  },
  csharp: {
    name: "C#",
    extensions: [".cs"],
    packageFiles: ["*.csproj", "*.sln", "Directory.Build.props"],
    entryPoints: ["Program.cs", "Startup.cs", "src/"],
    installTemplate: "dotnet add package {name}",
    buildTemplate: "dotnet build",
    testTemplate: "dotnet test",
    packageManager: "nuget",
  },
  elixir: {
    name: "Elixir",
    extensions: [".ex", ".exs"],
    packageFiles: ["mix.exs"],
    entryPoints: ["lib/", "lib/application.ex"],
    buildTemplate: "mix compile",
    testTemplate: "mix test",
    packageManager: "hex",
  },
  dart: {
    name: "Dart",
    extensions: [".dart"],
    packageFiles: ["pubspec.yaml"],
    entryPoints: ["lib/", "bin/", "lib/main.dart"],
    installTemplate: "dart pub add {name}",
    testTemplate: "dart test",
    packageManager: "pub",
  },
  scala: {
    name: "Scala",
    extensions: [".scala", ".sc"],
    packageFiles: ["build.sbt", "project/build.properties"],
    entryPoints: ["src/main/scala/"],
    buildTemplate: "sbt compile",
    testTemplate: "sbt test",
    packageManager: "sbt",
  },
  haskell: {
    name: "Haskell",
    extensions: [".hs", ".lhs"],
    packageFiles: ["*.cabal", "stack.yaml", "package.yaml"],
    entryPoints: ["app/Main.hs", "src/", "Main.hs"],
    buildTemplate: "stack build",
    testTemplate: "stack test",
    packageManager: "cabal",
  },
  lua: {
    name: "Lua",
    extensions: [".lua"],
    packageFiles: ["*.rockspec"],
    entryPoints: ["init.lua", "main.lua", "src/"],
    installTemplate: "luarocks install {name}",
    packageManager: "luarocks",
  },
  zig: {
    name: "Zig",
    extensions: [".zig"],
    packageFiles: ["build.zig", "build.zig.zon"],
    entryPoints: ["src/main.zig", "src/root.zig"],
    buildTemplate: "zig build",
    testTemplate: "zig build test",
    packageManager: "zig",
  },
  c: {
    name: "C",
    extensions: [".c", ".h"],
    packageFiles: ["CMakeLists.txt", "Makefile", "configure"],
    entryPoints: ["main.c", "src/main.c"],
    buildTemplate: "make",
    packageManager: "system",
  },
  cpp: {
    name: "C++",
    extensions: [".cpp", ".cc", ".cxx", ".hpp", ".hxx"],
    packageFiles: ["CMakeLists.txt", "Makefile", "conanfile.txt", "vcpkg.json"],
    entryPoints: ["main.cpp", "src/main.cpp"],
    buildTemplate: "cmake --build .",
    packageManager: "cmake",
  },
  r: {
    name: "R",
    extensions: [".r", ".R", ".Rmd"],
    packageFiles: ["DESCRIPTION", "NAMESPACE"],
    entryPoints: ["R/", "main.R"],
    installTemplate: "install.packages('{name}')",
    packageManager: "cran",
  },
  nim: {
    name: "Nim",
    extensions: [".nim", ".nims"],
    packageFiles: ["*.nimble"],
    entryPoints: ["src/", "main.nim", "src/main.nim"],
    installTemplate: "nimble install {name}",
    buildTemplate: "nimble build",
    testTemplate: "nimble test",
    packageManager: "nimble",
  },
  ocaml: {
    name: "OCaml",
    extensions: [".ml", ".mli"],
    packageFiles: ["dune-project", "*.opam"],
    entryPoints: ["bin/main.ml", "lib/", "src/"],
    installTemplate: "opam install {name}",
    buildTemplate: "dune build",
    testTemplate: "dune runtest",
    packageManager: "opam",
  },
  clojure: {
    name: "Clojure",
    extensions: [".clj", ".cljs", ".cljc", ".edn"],
    packageFiles: ["deps.edn", "project.clj"],
    entryPoints: ["src/", "src/core.clj"],
    installTemplate: "clj -Sdeps '{:deps {{name} {:mvn/version \"LATEST\"}}}'",
    buildTemplate: "clj -T:build uber",
    testTemplate: "clj -M:test",
    packageManager: "clojure-cli",
  },
  erlang: {
    name: "Erlang",
    extensions: [".erl", ".hrl"],
    packageFiles: ["rebar.config", "rebar.lock"],
    entryPoints: ["src/", "src/app.erl"],
    buildTemplate: "rebar3 compile",
    testTemplate: "rebar3 eunit",
    packageManager: "rebar3",
  },
  julia: {
    name: "Julia",
    extensions: [".jl"],
    packageFiles: ["Project.toml", "Manifest.toml"],
    entryPoints: ["src/", "main.jl"],
    installTemplate: "julia -e 'using Pkg; Pkg.add(\"{name}\")'",
    buildTemplate: "julia --project=. -e 'using Pkg; Pkg.build()'",
    testTemplate: "julia --project=. -e 'using Pkg; Pkg.test()'",
    packageManager: "pkg",
  },
  vlang: {
    name: "V",
    extensions: [".v", ".vsh"],
    packageFiles: ["v.mod"],
    entryPoints: ["main.v", "src/main.v"],
    installTemplate: "v install {name}",
    buildTemplate: "v .",
    testTemplate: "v test .",
    packageManager: "vpm",
  },
  gleam: {
    name: "Gleam",
    extensions: [".gleam"],
    packageFiles: ["gleam.toml"],
    entryPoints: ["src/", "src/app.gleam"],
    installTemplate: "gleam add {name}",
    buildTemplate: "gleam build",
    testTemplate: "gleam test",
    packageManager: "gleam",
  },
};

/**
 * Detect languages present in a list of file paths, returning sorted profiles.
 */
export function detectLanguages(files: string[]): LanguageProfile[] {
  const counts: Record<string, number> = {};
  const totalSource = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return Object.values(LANGUAGE_CONFIGS).some(c => c.extensions.includes(ext));
  }).length;

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    for (const [key, config] of Object.entries(LANGUAGE_CONFIGS)) {
      if (config.extensions.includes(ext)) {
        counts[key] = (counts[key] || 0) + 1;
        break; // only count once per file
      }
    }
  }

  const profiles: LanguageProfile[] = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      language: LANGUAGE_CONFIGS[key].name,
      fileCount: count,
      percentage: totalSource > 0 ? Math.round((count / totalSource) * 100) : 0,
      hasManifest: false,
      detectedEntryPoints: [],
    }));

  return profiles;
}

/**
 * Detect languages with full context (manifest + entry point detection) from a repo directory.
 */
export function detectLanguagesFromRepo(repoDir: string, files: string[]): LanguageProfile[] {
  const profiles = detectLanguages(files);

  for (const profile of profiles) {
    const configKey = Object.keys(LANGUAGE_CONFIGS).find(
      k => LANGUAGE_CONFIGS[k].name === profile.language
    );
    if (!configKey) continue;
    const config = LANGUAGE_CONFIGS[configKey];

    // Check for manifest files
    for (const pkgFile of config.packageFiles) {
      if (pkgFile.includes("*")) {
        // Glob pattern — check if any file matches
        const pattern = pkgFile.replace("*", "");
        if (files.some(f => f.endsWith(pattern) && !f.includes("/"))) {
          profile.hasManifest = true;
          break;
        }
      } else if (fs.existsSync(path.join(repoDir, pkgFile))) {
        profile.hasManifest = true;
        break;
      }
    }

    // Check for entry points
    for (const ep of config.entryPoints) {
      const epPath = path.join(repoDir, ep);
      if (fs.existsSync(epPath)) {
        profile.detectedEntryPoints.push(ep);
      }
    }

    profile.packageManager = config.packageManager;
  }

  return profiles;
}

/**
 * Generate language context string for skill output.
 */
export function getLanguageContext(profile: LanguageProfile): string {
  const configKey = Object.keys(LANGUAGE_CONFIGS).find(
    k => LANGUAGE_CONFIGS[k].name === profile.language
  );
  if (!configKey) return `${profile.language} project`;
  const config = LANGUAGE_CONFIGS[configKey];

  const parts: string[] = [`${profile.language}`];
  if (config.packageManager) parts.push(`(${config.packageManager})`);
  if (profile.detectedEntryPoints.length > 0) {
    parts.push(`— entry: ${profile.detectedEntryPoints.slice(0, 3).join(", ")}`);
  }
  if (config.buildTemplate) parts.push(`| build: \`${config.buildTemplate}\``);
  if (config.testTemplate) parts.push(`| test: \`${config.testTemplate}\``);

  return parts.join(" ");
}

/**
 * Get install command for a language/package combo.
 */
export function getInstallCommand(language: string, packageName: string): string | null {
  const configKey = Object.keys(LANGUAGE_CONFIGS).find(
    k => LANGUAGE_CONFIGS[k].name === language
  );
  if (!configKey) return null;
  const config = LANGUAGE_CONFIGS[configKey];
  if (!config.installTemplate) return null;
  return config.installTemplate.replace("{name}", packageName);
}
