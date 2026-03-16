#!/bin/bash
# repo2skill — Custom Output Templates
# Use built-in templates or customize output

# Available built-in templates: default, minimal, detailed, security
repo2skill https://github.com/fastify/fastify -t minimal
repo2skill https://github.com/fastify/fastify -t detailed
repo2skill https://github.com/fastify/fastify -t security

# Use AI enhancement for richer descriptions (requires OPENAI_API_KEY)
export OPENAI_API_KEY="sk-..."
repo2skill https://github.com/fastify/fastify --ai

# Combine template with AI enhancement
repo2skill https://github.com/fastify/fastify -t detailed --ai
