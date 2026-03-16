#!/bin/bash
# repo2skill — Batch Convert Multiple Repos
# Process a list of repos from a file in parallel

# Create a batch file with one repo URL per line
cat > repos.txt << 'EOF'
https://github.com/expressjs/express
https://github.com/fastify/fastify
https://github.com/koajs/koa
https://github.com/honojs/hono
EOF

# Run batch conversion (4 parallel workers)
repo2skill --batch repos.txt -o ./skills --parallel 4

# With minimum quality threshold — low-scoring skills get removed
repo2skill --batch repos.txt -o ./skills --parallel 4 --min-quality 60

# View stats for generated skills
repo2skill stats ./skills
