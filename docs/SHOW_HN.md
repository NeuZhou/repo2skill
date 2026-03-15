# Show HN: repo2skill – Convert any GitHub repo into an AI agent skill with one command

GitHub has 400M+ repositories. AI agents need structured skills to use tools effectively. Right now, writing a skill file for each tool is manual — read the README, extract the key commands, write trigger phrases, format it properly. It takes 15-30 minutes per repo, and it doesn't scale.

**repo2skill** clones any GitHub repo, analyzes its README, package manifests, source files, and project structure, then generates a ready-to-use skill with a properly formatted `SKILL.md`. It supports 11 languages (Node.js, Python, Rust, Go, Java, Ruby, C/C++, PHP, Elixir, Swift, Kotlin + more), handles batch conversion, and works entirely offline after the clone. No LLM needed — pure heuristic analysis, fast and deterministic.

I've tested it on 35 popular repos (ripgrep, fastapi, react, express, deno, etc.) and the results are in the `examples/` directory. A typical conversion takes ~10 seconds. The generated skills include install instructions, usage examples, trigger phrases, and reference files extracted from docs.

Repo: https://github.com/NeuZhou/repo2skill

Would love feedback on the heuristic approach, language support gaps, or edge cases you hit. PRs welcome.
