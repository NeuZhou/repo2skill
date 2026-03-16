#!/bin/bash
# repo2skill — Basic Usage
# Convert a single GitHub repo into an OpenClaw skill

repo2skill https://github.com/expressjs/express

# With a specific output directory
repo2skill https://github.com/expressjs/express -o ./my-skills

# Generate JSON output instead of SKILL.md
repo2skill https://github.com/expressjs/express --format json

# Use minimal template
repo2skill https://github.com/expressjs/express -t minimal
