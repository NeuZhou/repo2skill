#!/bin/bash
# repo2skill — Monorepo Handling
# Convert specific packages from a monorepo

# Convert the entire monorepo (auto-detects packages)
repo2skill https://github.com/vercel/turborepo

# Target a specific package within a monorepo
repo2skill https://github.com/vercel/turborepo --package packages/turbo-utils

# Generate skills for all detected packages
repo2skill https://github.com/trpc/trpc -o ./skills
