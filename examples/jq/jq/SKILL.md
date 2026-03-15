---
name: jq
description: `jq` is a lightweight and flexible command-line JSON processor akin to `sed`,`awk`,`grep`, and friends for JSON data. It's written in portable C and has zero runtime dependencies, allowing you to easily slice, filter, map, and transform structured data. Language: C.
---

# jq

`jq` is a lightweight and flexible command-line JSON processor akin to `sed`,`awk`,`grep`, and friends for JSON data. It's written in portable C and has zero runtime dependencies, allowing you to easily slice, filter, map, and transform structured data.

## When to Use

Use when working with the jq C library.

## Quick Start


## Project Info

- **Language:** C, Python, C++, JavaScript
- **Tests:** Yes

## File Structure

```
├── build/
├── config/
│   └── m4/
├── docs/
│   ├── content/
│   ├── public/
│   ├── templates/
│   ├── build_manpage.py
│   ├── build_mantests.py
│   ├── build_website.py
│   ├── manual_schema.yml
│   ├── Pipfile
│   ├── Pipfile.lock
│   ├── README.md
│   └── validate_manual_schema.py
├── m4/
│   ├── ax_compare_version.m4
│   ├── ax_prog_bison_version.m4
│   └── ax_pthread.m4
├── scripts/
```