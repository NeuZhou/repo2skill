---
name: anthropic-sdk-python
description: The Claude SDK for Python provides access to the [Claude API](https://docs.anthropic.com/en/api/) from Python applications. WHEN: make http requests. Triggers: use anthropic-sdk-python, install anthropic-sdk-python, how to use anthropic-sdk-python, make http request.
---

# anthropic-sdk-python

The Claude SDK for Python provides access to the [Claude API](https://docs.anthropic.com/en/api/) from Python applications.

## When to Use

- Make HTTP requests

## When NOT to Use

- Projects using JavaScript or TypeScript (different ecosystem)

## Quick Start

### Install

```sh
pip install anthropic
```

### Basic Usage

```python
import os
from anthropic import Anthropic

client = Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),  # This is the default and can be omitted
)

message = client.messages.create(
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Hello, Claude",
        }
    ],
    model="claude-opus-4-6",
)
print(message.content)
```

## Project Info

- **Language:** Python
- **Tests:** Yes

## File Structure

```
├── bin/
│   ├── check-release-environment
│   └── publish-pypi
├── examples/
│   ├── memory/
│   ├── auto_compaction.py
│   ├── azure.py
│   ├── batch_results.py
│   ├── bedrock.py
│   ├── images.py
│   ├── logo.png
│   ├── mcp_tool_runner.py
│   ├── messages_stream.py
│   ├── messages.py
│   ├── structured_outputs_streaming.py
│   ├── structured_outputs.py
│   ├── text_completions_demo_async.py
│   ├── text_completions_demo_sync.py
│   ├── text_completions_streaming.py
│   ├── thinking_stream.py
```