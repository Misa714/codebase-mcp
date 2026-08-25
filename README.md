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
- **E/S Asíncrona de Alto Rendimiento**: Operaciones sobre el sistema de archivos no bloqueantes con detección automática de archivos binarios.
- **Árbol de Proyecto Inteligente (`get_project_tree`)**: Genera mapas limpios en texto plano ASCII respetando `.gitignore`, compatible con subcarpetas (`sub_path`) y soporte multiplataforma.
- **Búsqueda Instantánea con Filtros (`search_codebase`)**: Búsqueda rápida estilo grep con números de línea, snippets, regex (`use_regex`), filtros de extensión (`file_extensions`) y subcarpeta (`path_pattern`).
- **Esquema e Índice de Símbolos (`get_file_outline`)**: Extrae la tabla de contenidos (funciones, clases, interfaces, métodos, encabezados) con números de línea para ahorrar memoria y contexto a la IA.
- **Lectura Segura de Archivos (`read_project_file`)**: Lee archivos completos o rangos de líneas (`start_line`, `end_line`) con límites de tamaño y protección contra Path Traversal.
- **Seguridad Integrada**: Bloquea y protege automáticamente archivos sensibles (`.env`, `.pem`, `id_rsa`, `credentials.json`, `secrets.json`, `.npmrc`, `.pypirc`, etc.).
- **Diagnóstico de Stack Tecnológico (`inspect_tech_stack`)**: Identifica proyectos Node.js, Python, Go, Rust, Java, PHP, Ruby y entornos Docker.

---

## Cómo funciona internamente

No necesitas clonar este repositorio manualmente para usarlo. Tu asistente de IA ejecuta `codebase-mcp` en segundo plano como un proceso local cuando lo necesita.

```text
[ Usuario ] -- "¿Dónde está la función de filtrado de archivos sensibles?"
    │
    ▼
[ Asistente IA (Antigravity / Claude / Cursor) ] -- (Detecta herramientas de codebase-mcp)
    │
    ├─► 1. Consulta índice: get_file_outline(relative_path: "src/utils/fileSystem.ts")
    │   └─► Retorna: "L78 | [function] export function isSensitiveFile..."
    │
    ├─► 2. Lee función exacta: read_project_file(relative_path: "src/utils/fileSystem.ts", start_line: 78, end_line: 115)
    │
    ▼
[ codebase-mcp (Proceso local en segundo plano) ]
    │
    ├─► Escanea y lee el archivo aplicando seguridad y límites
    └─► Retorna las líneas exactas
    │
    ▼
[ Asistente IA ] -- "La función se encuentra en la línea 78 de src/utils/fileSystem.ts..."
```

- **Cero Subidas a la Nube**: Todo el análisis ocurre 100% en tu computadora local.
- **Consumo bajo demanda**: La herramienta solo consume recursos cuando la IA la invoca.

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

Ejecuta el siguiente comando en tu terminal:

```bash
claude mcp add codebase-mcp -- npx -y 714-mcp-tool
```

Verificar que esté conectado:

```bash
claude mcp list
```

### 3. Cursor IDE

1. Abre **Cursor**.
2. Ve a **Settings** -> **Cursor Settings** -> **MCP**.
3. Haz clic en **+ Add New MCP Server**.
4. Completa:
   - **Name:** `codebase-mcp`
   - **Type:** `command`
   - **Command:** `npx -y 714-mcp-tool`

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

### 5. Windsurf IDE

Añade en `~/.codeium/windsurf/mcp_config.json`:

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
| **`get_project_tree`** | `max_depth` (defecto: `4`), `sub_path` | Devuelve la estructura en árbol ASCII del proyecto o de una subcarpeta respetando `.gitignore`. |
| **`search_codebase`** | `query` (requerido), `max_results`, `use_regex`, `file_extensions`, `path_pattern` | Busca patrones de texto o regex en el proyecto con filtros opcionales de extensión y carpeta. |
| **`get_file_outline`** | `relative_path` (requerido) | Extrae el índice y símbolos (funciones, clases, interfaces, tipos, encabezados) con sus números de línea. |
| **`read_project_file`** | `relative_path` (requerido), `start_line`, `end_line` | Lee el contenido de un archivo de forma segura con números de línea y protección contra binarios. |
| **`inspect_tech_stack`** | *ninguno* | Analiza manifiestos del proyecto (`package.json`, `Cargo.toml`, etc.) para dar un resumen del stack. |

---

# English

`codebase-mcp` gives Claude Code, Claude Desktop, Cursor, Antigravity IDE, Windsurf, VS Code, and autonomous AI agents instant, deep visibility into your local codebases without indexers, vector databases, or complex setup.

## Features

- **Zero Configuration**: Simply run `npx 714-mcp-tool` in any project folder or specify `--path /path/to/project`.
- **High-Performance Async I/O**: Fully non-blocking asynchronous filesystem operations with automatic binary file detection.
- **Smart Tree Inspection (`get_project_tree`)**: Generates clean ASCII directory maps respecting `.gitignore`, supporting subfolders (`sub_path`) and cross-platform paths.
- **Filtered Instant Search (`search_codebase`)**: Fast grep-style search with line numbers, code snippets, optional regex (`use_regex`), file extension filtering (`file_extensions`), and subfolder filtering (`path_pattern`).
- **Symbol & File Outline (`get_file_outline`)**: Extracts declaration table of contents (functions, classes, interfaces, methods, headers) with line numbers to conserve AI memory and context.
- **Safe File Reading (`read_project_file`)**: Read specific files or line ranges safely with path traversal protection and binary guards.
- **Security-First**: Automatically redacts and blocks access to sensitive credential files (`.env`, `.pem`, `id_rsa`, `credentials.json`, `secrets.json`, `.npmrc`, `.pypirc`, etc.).
- **Multi-Language Tech Stack Diagnostics (`inspect_tech_stack`)**: Automatically identifies Node.js, Python, Go, Rust, Java, PHP, Ruby, and Docker setups.

---

## Exposed MCP Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| **`get_project_tree`** | `max_depth` (default: `4`), `sub_path` | Returns directory tree for whole project or subfolder respecting `.gitignore`. |
| **`search_codebase`** | `query` (required), `max_results`, `use_regex`, `file_extensions`, `path_pattern` | Searches codebase with optional extension and subfolder filtering. |
| **`get_file_outline`** | `relative_path` (required) | Extracts table of contents and declarations with line numbers. |
| **`read_project_file`** | `relative_path` (required), `start_line`, `end_line` | Safely reads project file contents with line numbers and binary guard. |
| **`inspect_tech_stack`** | *none* | Analyzes configuration files to summarize language and framework setup. |

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
