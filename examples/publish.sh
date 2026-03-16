#!/bin/bash
# repo2skill — Publish to ClawHub
# Generate a skill and publish it to the ClawHub marketplace

# Generate and publish in one command
repo2skill https://github.com/expressjs/express --publish

# Or generate first, then publish separately
repo2skill https://github.com/expressjs/express -o ./skills
clawhub publish ./skills/express

# Interactive mode with publish option
repo2skill --interactive
# ? Enter GitHub repo URL: https://github.com/expressjs/express
# ? Output format? (skill / readme / both) → skill
# ? Include tests? (Y/n) → Y
# ? Publish to ClawHub? (y/N) → y
