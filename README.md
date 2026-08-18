<div align="center">

# codebase-mcp

**Servidor MCP (Model Context Protocol) Zero-Config para conectar código local con asistentes de IA.**  
*Zero-config CLI that turns any local repository into a Model Context Protocol (MCP) server for Claude, Cursor, Antigravity IDE, and AI agents.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-blue.svg)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Misa714/codebase-mcp/pulls)

[Español](#español) | [English](#english)

</div>

---

# Español

`codebase-mcp` proporciona a Claude Code, Claude Desktop, Cursor, Antigravity IDE, Windsurf, VS Code y agentes autónomos de IA una visibilidad profunda e instantánea sobre repositorios de código local, sin necesidad de indexadores pesados, bases de datos vectoriales ni configuraciones complejas.

## Características

- **Configuración Cero (Zero-Config)**: Ejecuta simplemente `npx 714-mcp-tool` en cualquier carpeta o especifica `--path /ruta/al/proyecto`.
- **Motor Híbrido BM25 Inteligente (`search_hybrid`)**: Ranqueo de relevancia léxica y conceptual en milisegundos con tolerancia a errores tipográficos (*fuzzy search*).
- **E/S Asíncrona de Alto Rendimiento**: Operaciones sobre el sistema de archivos no bloqueantes con detección automática de archivos binarios.
- **Árbol de Proyecto Inteligente (`get_project_tree`)**: Genera mapas limpios en texto plano ASCII respetando `.gitignore`, con soporte para subcarpetas (`sub_path`).
- **Búsqueda Instantánea con Filtros (`search_codebase`)**: Búsqueda rápida estilo grep con números de línea, snippets, regex (`use_regex`), filtros de extensión (`file_extensions`) y subcarpeta (`path_pattern`).
- **Esquema e Índice de Símbolos (`get_file_outline`)**: Extrae la tabla de contenidos (funciones, clases, interfaces, métodos, encabezados) con números de línea para ahorrar memoria y contexto a la IA.
- **Análisis de Dependencias e Impacto (`get_file_dependencies`)**: Analiza qué librerías importa un archivo y qué otros archivos del proyecto se verán afectados si se modifica.
- **Inspección de Cambios Git y Diff (`get_git_changes`)**: Muestra archivos modificados, staged y diffs de código para revisiones y generación de commits.
- **Parchado Quirúrgico Seguro (`apply_file_patch`)**: Aplica ediciones de código con validación de coincidencia previa para garantizar integridad y evitar alucinaciones.
- **Lectura Segura de Archivos (`read_project_file`)**: Lee archivos completos o rangos de líneas con límites de tamaño y protección contra Path Traversal.
- **Seguridad Integrada**: Bloquea y protege automáticamente archivos sensibles (`.env`, `.pem`, `id_rsa`, `credentials.json`, `secrets.json`, `.npmrc`, `.pypirc`, etc.).
- **Diagnóstico de Stack Tecnológico (`inspect_tech_stack`)**: Identifica proyectos Node.js, Python, Go, Rust, Java, PHP, Ruby y entornos Docker.

---

## Cómo funciona internamente

No necesitas clonar este repositorio manualmente para usarlo. Tu asistente de IA ejecuta `codebase-mcp` en segundo plano como un proceso local cuando lo necesita.

```text
[ Usuario ] -- "¿Dónde se gestiona la seguridad y qué pasa si la modifico?"
    │
    ▼
[ Asistente IA ] -- (Detecta herramientas de codebase-mcp)
    │
    ├─► 1. Búsqueda híbrida conceptual: search_hybrid(query: "seguridad de credenciales")
    │   └─► Retorna: "src/utils/fileSystem.ts (100% Match) -> isSensitiveFile"
    │
    ├─► 2. Análisis de impacto: get_file_dependencies(relative_path: "src/utils/fileSystem.ts")
    │   └─► Retorna: "4 archivos dependen de esta función"
    │
    ├─► 3. Edición segura: apply_file_patch(relative_path: "src/utils/fileSystem.ts", target_content: "...", replacement_content: "...")
    │   └─► Retorna: "Patched successfully with integrity check"
    │
    ▼
[ Asistente IA ] -- "Se localizó y modificó la función de forma segura verificando su impacto en el proyecto."
```

---

## Inicio Rápido

No requiere instalación previa. Ejecuta directamente usando `npx`:

```bash
npx 714-mcp-tool
```

O especifica la ruta del proyecto explícitamente:

```bash
npx 714-mcp-tool --path /ruta/a/tu/proyecto
```

---

## Tutoriales de Integración

### 1. Antigravity IDE / Antigravity

Agrega el servidor a tu archivo de configuración global `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "codebase-mcp": {
      "command": "npx",
      "args": ["-y", "714-mcp-tool"]
    }
  }
}
```

### 2. Claude Code (CLI de Anthropic)

```bash
claude mcp add codebase-mcp -- npx -y 714-mcp-tool
```

### 3. Cursor IDE

1. Abre **Cursor Settings** -> **MCP**.
2. Haz clic en **+ Add New MCP Server**.
3. Configura: **Name:** `codebase-mcp`, **Type:** `command`, **Command:** `npx -y 714-mcp-tool`.

### 4. Claude Desktop

Añade en `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "714-mcp-tool": {
      "command": "npx",
      "args": ["-y", "714-mcp-tool"]
    }
  }
}
```

---

## Herramientas MCP Expuestas

| Herramienta | Parámetros | Descripción |
| :--- | :--- | :--- |
| **`search_hybrid`** | `query` (requerido), `max_results`, `file_extensions`, `path_pattern` | Búsqueda híbrida inteligente BM25 + Símbolos con ranqueo de relevancia por porcentaje. |
| **`get_project_tree`** | `max_depth` (defecto: `4`), `sub_path` | Devuelve la estructura en árbol ASCII del proyecto o subcarpeta respetando `.gitignore`. |
| **`search_codebase`** | `query` (requerido), `max_results`, `use_regex`, `file_extensions`, `path_pattern` | Busca patrones de texto o regex con filtros opcionales de extensión y carpeta. |
| **`get_file_outline`** | `relative_path` (requerido) | Extrae índice y símbolos (funciones, clases, interfaces, tipos, encabezados) con líneas. |
| **`get_file_dependencies`** | `relative_path` (requerido) | Análisis de impacto: qué importa este archivo y qué otros archivos del proyecto dependen de él. |
| **`get_git_changes`** | `include_diff` (defecto: `true`) | Inspecciona cambios locales de Git (modificados, staged, untracked) y diff para reviews/commits. |
| **`apply_file_patch`** | `relative_path`, `target_content`, `replacement_content`, `allow_multiple` | Aplica una edición de código con validación de coincidencia exacta previa. |
| **`read_project_file`** | `relative_path` (requerido), `start_line`, `end_line` | Lee el contenido de un archivo de forma segura con números de línea y protección contra binarios. |
| **`inspect_tech_stack`** | *ninguno* | Analiza manifiestos del proyecto (`package.json`, `Cargo.toml`, etc.) para dar un resumen del stack. |

---

# English

`codebase-mcp` gives Claude Code, Claude Desktop, Cursor, Antigravity IDE, Windsurf, VS Code, and autonomous AI agents instant, deep visibility into your local codebases without indexers, vector databases, or complex setup.

## Features

- **Zero Configuration**: Simply run `npx 714-mcp-tool` in any project folder or specify `--path /path/to/project`.
- **Smart BM25 Hybrid Search (`search_hybrid`)**: Fast relevance-ranked lexical and symbol search with fuzzy matching in milliseconds.
- **High-Performance Async I/O**: Fully non-blocking asynchronous filesystem operations with automatic binary file detection.
- **Smart Tree Inspection (`get_project_tree`)**: Generates clean ASCII directory maps respecting `.gitignore`, supporting subfolders (`sub_path`).
- **Filtered Instant Search (`search_codebase`)**: Fast grep-style search with line numbers, snippets, optional regex, extension filters, and path filters.
- **Symbol & File Outline (`get_file_outline`)**: Extracts declaration table of contents (functions, classes, interfaces, methods, headers) with line numbers to conserve AI tokens.
- **Dependency & Impact Analysis (`get_file_dependencies`)**: Identifies incoming and outgoing dependencies to prevent breaking changes across project files.
- **Git Changes & Diff Inspection (`get_git_changes`)**: Displays uncommitted changes, status, and code diffs for reviews and commit generation.
- **Surgical Safe Patching (`apply_file_patch`)**: Applies surgical edits to files with pre-validation checksum matching.
- **Safe File Reading (`read_project_file`)**: Read specific files or line ranges safely with path traversal protection and binary guards.
- **Security-First**: Automatically redacts and blocks access to sensitive credential files (`.env`, `.pem`, `id_rsa`, `credentials.json`, `secrets.json`, `.npmrc`, `.pypirc`, etc.).
- **Multi-Language Tech Stack Diagnostics (`inspect_tech_stack`)**: Automatically identifies Node.js, Python, Go, Rust, Java, PHP, Ruby, and Docker setups.

---

## Exposed MCP Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| **`search_hybrid`** | `query` (required), `max_results`, `file_extensions`, `path_pattern` | BM25 + Symbol relevance search with percentage score ranking. |
| **`get_project_tree`** | `max_depth` (default: `4`), `sub_path` | Returns directory tree for whole project or subfolder respecting `.gitignore`. |
| **`search_codebase`** | `query` (required), `max_results`, `use_regex`, `file_extensions`, `path_pattern` | Searches codebase with optional extension and subfolder filtering. |
| **`get_file_outline`** | `relative_path` (required) | Extracts table of contents and declarations with line numbers. |
| **`get_file_dependencies`** | `relative_path` (required) | Reverse dependency and impact analysis across project files. |
| **`get_git_changes`** | `include_diff` (default: `true`) | Inspects uncommitted Git changes, modified files, and code diff. |
| **`apply_file_patch`** | `relative_path`, `target_content`, `replacement_content`, `allow_multiple` | Applies a surgical code patch with exact match verification. |
| **`read_project_file`** | `relative_path` (required), `start_line`, `end_line` | Safely reads project file contents with line numbers and binary guard. |
| **`inspect_tech_stack`** | *none* | Analyzes configuration files to summarize language and framework setup. |

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
