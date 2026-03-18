import { describe, it, expect } from "vitest";
import {
  LANGUAGE_CONFIGS,
  detectLanguages,
  getLanguageContext,
  getInstallCommand,
} from "../languages.js";

describe("LANGUAGE_CONFIGS", () => {
  it("has at least 27 languages (20 original + 7 new)", () => {
    expect(Object.keys(LANGUAGE_CONFIGS).length).toBeGreaterThanOrEqual(27);
  });

  it("every config has required fields", () => {
    for (const [key, config] of Object.entries(LANGUAGE_CONFIGS)) {
      expect(config.name, `${key}.name`).toBeTruthy();
      expect(config.extensions, `${key}.extensions`).toBeInstanceOf(Array);
      expect(config.extensions.length, `${key}.extensions.length`).toBeGreaterThan(0);
      expect(config.packageFiles, `${key}.packageFiles`).toBeInstanceOf(Array);
      expect(config.packageFiles.length, `${key}.packageFiles.length`).toBeGreaterThan(0);
      expect(config.entryPoints, `${key}.entryPoints`).toBeInstanceOf(Array);
      expect(config.entryPoints.length, `${key}.entryPoints.length`).toBeGreaterThan(0);
    }
  });

  it("extensions all start with a dot", () => {
    for (const [key, config] of Object.entries(LANGUAGE_CONFIGS)) {
      for (const ext of config.extensions) {
        expect(ext, `${key}: ${ext}`).toMatch(/^\./);
      }
    }
  });

  it("no duplicate extensions across languages", () => {
    const seen = new Map<string, string>();
    for (const [key, config] of Object.entries(LANGUAGE_CONFIGS)) {
      for (const ext of config.extensions) {
        const lower = ext.toLowerCase();
        // .R and .r are intentional duplicates for the R language
        if (lower === ".r" && key === "r") continue;
        if (seen.has(lower) && seen.get(lower) !== key) {
          // Allow known overlaps (e.g., .h shared by C and C++)
          const existing = seen.get(lower)!;
          const overlappable = [
            [".h", "c", "cpp"],
            [".v", "vlang"],  // V language uses .v
          ];
          const allowed = overlappable.some(
            ([e, ...langs]) => lower === e && (langs.includes(key) || langs.includes(existing))
          );
          if (!allowed) {
            throw new Error(`Duplicate extension ${ext}: ${key} vs ${seen.get(lower)}`);
          }
        }
        seen.set(lower, key);
      }
    }
  });
});

describe("new language configs", () => {
  const newLanguages = ["nim", "ocaml", "clojure", "erlang", "julia", "vlang", "gleam"];

  it("all 7 new languages are registered", () => {
    for (const lang of newLanguages) {
      expect(LANGUAGE_CONFIGS[lang], `missing: ${lang}`).toBeDefined();
    }
  });

  it("Nim config is correct", () => {
    const nim = LANGUAGE_CONFIGS.nim;
    expect(nim.name).toBe("Nim");
    expect(nim.extensions).toContain(".nim");
    expect(nim.extensions).toContain(".nims");
    expect(nim.packageFiles).toContain("*.nimble");
    expect(nim.packageManager).toBe("nimble");
  });

  it("OCaml config is correct", () => {
    const ocaml = LANGUAGE_CONFIGS.ocaml;
    expect(ocaml.name).toBe("OCaml");
    expect(ocaml.extensions).toContain(".ml");
    expect(ocaml.extensions).toContain(".mli");
    expect(ocaml.packageFiles).toContain("dune-project");
    expect(ocaml.packageFiles).toContain("*.opam");
    expect(ocaml.packageManager).toBe("opam");
  });

  it("Clojure config is correct", () => {
    const clj = LANGUAGE_CONFIGS.clojure;
    expect(clj.name).toBe("Clojure");
    expect(clj.extensions).toContain(".clj");
    expect(clj.extensions).toContain(".cljs");
    expect(clj.extensions).toContain(".cljc");
    expect(clj.extensions).toContain(".edn");
    expect(clj.packageFiles).toContain("deps.edn");
    expect(clj.packageFiles).toContain("project.clj");
  });

  it("Erlang config is correct", () => {
    const erl = LANGUAGE_CONFIGS.erlang;
    expect(erl.name).toBe("Erlang");
    expect(erl.extensions).toContain(".erl");
    expect(erl.extensions).toContain(".hrl");
    expect(erl.packageFiles).toContain("rebar.config");
    expect(erl.packageManager).toBe("rebar3");
  });

  it("Julia config is correct", () => {
    const jl = LANGUAGE_CONFIGS.julia;
    expect(jl.name).toBe("Julia");
    expect(jl.extensions).toContain(".jl");
    expect(jl.packageFiles).toContain("Project.toml");
    expect(jl.packageManager).toBe("pkg");
  });

  it("V config is correct", () => {
    const v = LANGUAGE_CONFIGS.vlang;
    expect(v.name).toBe("V");
    expect(v.extensions).toContain(".v");
    expect(v.extensions).toContain(".vsh");
    expect(v.packageFiles).toContain("v.mod");
    expect(v.packageManager).toBe("vpm");
  });

  it("Gleam config is correct", () => {
    const gleam = LANGUAGE_CONFIGS.gleam;
    expect(gleam.name).toBe("Gleam");
    expect(gleam.extensions).toContain(".gleam");
    expect(gleam.packageFiles).toContain("gleam.toml");
    expect(gleam.packageManager).toBe("gleam");
  });
});

describe("detectLanguages with new languages", () => {
  it("detects Nim files", () => {
    const profiles = detectLanguages(["main.nim", "src/utils.nim", "config.nims"]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].language).toBe("Nim");
    expect(profiles[0].fileCount).toBe(3);
  });

  it("detects OCaml files", () => {
    const profiles = detectLanguages(["bin/main.ml", "lib/parser.ml", "lib/parser.mli"]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].language).toBe("OCaml");
    expect(profiles[0].fileCount).toBe(3);
  });

  it("detects Clojure files", () => {
    const profiles = detectLanguages(["src/core.clj", "test/core_test.clj", "src/app.cljs"]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].language).toBe("Clojure");
    expect(profiles[0].fileCount).toBe(3);
  });

  it("detects Erlang files", () => {
    const profiles = detectLanguages(["src/app.erl", "include/defs.hrl"]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].language).toBe("Erlang");
    expect(profiles[0].fileCount).toBe(2);
  });

  it("detects Julia files", () => {
    const profiles = detectLanguages(["src/MyPackage.jl", "test/runtests.jl"]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].language).toBe("Julia");
    expect(profiles[0].fileCount).toBe(2);
  });

  it("detects V files", () => {
    const profiles = detectLanguages(["main.v", "src/util.v"]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].language).toBe("V");
    expect(profiles[0].fileCount).toBe(2);
  });

  it("detects Gleam files", () => {
    const profiles = detectLanguages(["src/app.gleam", "test/app_test.gleam"]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].language).toBe("Gleam");
    expect(profiles[0].fileCount).toBe(2);
  });

  it("detects mixed new + existing languages", () => {
    const profiles = detectLanguages([
      "main.nim",
      "src/lib.rs",
      "src/app.gleam",
      "index.ts",
    ]);
    expect(profiles).toHaveLength(4);
    const names = profiles.map(p => p.language);
    expect(names).toContain("Nim");
    expect(names).toContain("Rust");
    expect(names).toContain("Gleam");
    expect(names).toContain("TypeScript");
  });
});

describe("getInstallCommand for new languages", () => {
  it("returns nimble install for Nim", () => {
    expect(getInstallCommand("Nim", "mypkg")).toBe("nimble install mypkg");
  });

  it("returns opam install for OCaml", () => {
    expect(getInstallCommand("OCaml", "mypkg")).toBe("opam install mypkg");
  });

  it("returns gleam add for Gleam", () => {
    expect(getInstallCommand("Gleam", "mypkg")).toBe("gleam add mypkg");
  });

  it("returns v install for V", () => {
    expect(getInstallCommand("V", "mypkg")).toBe("v install mypkg");
  });

  it("returns julia Pkg.add for Julia", () => {
    expect(getInstallCommand("Julia", "mypkg")).toBe(
      'julia -e \'using Pkg; Pkg.add("mypkg")\''
    );
  });

  it("returns null for Erlang (no install template)", () => {
    expect(getInstallCommand("Erlang", "mypkg")).toBeNull();
  });
});

describe("getLanguageContext for new languages", () => {
  it("generates context for Nim", () => {
    const ctx = getLanguageContext({
      language: "Nim",
      fileCount: 10,
      percentage: 80,
      hasManifest: true,
      detectedEntryPoints: ["src/main.nim"],
    });
    expect(ctx).toContain("Nim");
    expect(ctx).toContain("nimble");
    expect(ctx).toContain("src/main.nim");
  });

  it("generates context for Gleam", () => {
    const ctx = getLanguageContext({
      language: "Gleam",
      fileCount: 5,
      percentage: 100,
      hasManifest: true,
      detectedEntryPoints: ["src/app.gleam"],
    });
    expect(ctx).toContain("Gleam");
    expect(ctx).toContain("gleam build");
    expect(ctx).toContain("gleam test");
  });
});
