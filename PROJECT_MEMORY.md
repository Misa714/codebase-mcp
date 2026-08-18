# codebase-mcp (714-mcp-tool) — Project Memory & Architecture

> **Saved State:** August 18, 2026 | Version 2.0.0 Published on NPM

---

## 1. Project Overview & Repository Status

- **Repository:** `https://github.com/Misa714/codebase-mcp.git` (Open Source - MIT)
- **NPM Package:** `714-mcp-tool`
- **Published Version:** `2.0.0` (Live on npm registry)
- **Run command:** `npx 714-mcp-tool`

---

## 2. Integrated Tool Suite (9 Tools)

1. `get_project_tree`: Fast directory tree generator with `.gitignore` and sensitivity filters.
2. `search_hybrid`: BM25 relevance ranking search using `minisearch` with symbol boosting (weight 3.0) and reactive TTL caching.
3. `search_codebase`: Exact regex / keyword code search.
4. `get_file_outline`: Symbol extractor with line numbers for TypeScript, JavaScript, Python, Go, Rust, Java.
5. `get_file_dependencies`: Impact analyzer with dynamic imports and Python relative import resolution.
6. `get_git_changes`: Git staged and unstaged inspector using `git diff HEAD` with defensive fallback.
7. `apply_file_patch`: Surgical code patcher with CRLF/LF normalization and automatic BM25 cache invalidation.
8. `read_project_file`: Safe line-ranged file reader with safety path verification.
9. `inspect_tech_stack`: Automatic package/stack manifest inspector.

---

## 3. Build & Test Metrics
- **Tests:** 26/26 passing in Vitest.
- **NPM Tarball Size:** 25.5 KB (Unpacked: 98.6 KB).
