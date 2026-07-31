<div align="center">

# codebase-mcp

**Servidor MCP (Model Context Protocol) Zero-Config para conectar código local con asistentes de IA.**  
*Zero-config CLI that turns any local repository into a Model Context Protocol (MCP) server for Claude, Cursor, and AI agents.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-blue.svg)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Misa714/codebase-mcp/pulls)

[Español](#español) | [English](#english)

</div>

---

# Español

`codebase-mcp` proporciona a Claude Code, Claude Desktop, Cursor, Windsurf, VS Code y agentes autónomos de IA una visibilidad profunda e instantánea sobre repositorios de código local, sin necesidad de indexadores pesados, bases de datos vectoriales ni configuraciones complejas.

## Características

- **Configuración Cero (Zero-Config)**: Ejecuta simplemente `npx 714-mcp-tool` en cualquier carpeta o especifica `--path /ruta/al/proyecto`.
- **E/S Asíncrona de Alto Rendimiento**: Operaciones sobre el sistema de archivos no bloqueantes diseñadas para repositorios grandes.
- **Árbol de Proyecto Inteligente (`get_project_tree`)**: Genera mapas limpios en texto plano ASCII respetando `.gitignore` y evitando bucles por enlaces simbólicos.
- **Búsqueda Instantánea por Texto y Regex (`search_codebase`)**: Búsqueda rápida estilo grep con números de línea, snippets y expresiones regulares opcionales (`use_regex`).
- **Lectura Segura de Archivos (`read_project_file`)**: Lee archivos completos o rangos de líneas (`start_line`, `end_line`) con límites de tamaño y protección contra Path Traversal.
- **Seguridad Integrada**: Bloquea y protege automáticamente archivos sensibles de credenciales (`.env`, `.pem`, `id_rsa`, `credentials.json`, `secrets.json`, etc.).
- **Diagnóstico de Stack Tecnológico (`inspect_tech_stack`)**: Identifica proyectos Node.js, Python, Go, Rust, Java, PHP, Ruby y entornos Docker.

---

## Cómo funciona internamente

No necesitas clonar este repositorio manualmente para usarlo. Tu asistente de IA ejecuta `codebase-mcp` en segundo plano como un proceso local cuando lo necesita.

```text
[ Usuario ] -- "¿Dónde está la función de filtrado de archivos sensibles?"
    │
    ▼
[ Asistente IA (Claude / Cursor / Windsurf) ] -- (Detecta las herramientas de codebase-mcp)
    │
    ├─► Envía solicitud JSON-RPC vía STDIO: search_codebase(query: "isSensitiveFile")
    │
    ▼
[ codebase-mcp (Proceso local en segundo plano) ]
    │
    ├─► Escanea el repositorio local aplicando .gitignore y filtros de seguridad
    └─► Retorna: "src/utils/fileSystem.ts:81 -> export function isSensitiveFile..."
    │
    ▼
[ Asistente IA ] -- "La función se encuentra en la línea 81 de src/utils/fileSystem.ts..."
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

### 1. Claude Code (CLI de Anthropic)

Para integrar `codebase-mcp` en la herramienta CLI de **Claude Code**, ejecuta el siguiente comando en tu terminal:

```bash
claude mcp add codebase-mcp -- npx -y codebase-mcp
```

O si prefieres vincular una carpeta de proyecto específica:

```bash
claude mcp add codebase-mcp -- npx -y codebase-mcp --path /ruta/a/tu/proyecto
```

Para verificar que el servidor está conectado correctamente en Claude Code:

```bash
claude mcp list
```

---

### 2. Cursor IDE

1. Abre **Cursor**.
2. Ve a **Settings (Configuración)** -> **Cursor Settings** -> **MCP**.
3. Haz clic en el botón **+ Add New MCP Server**.
4. Completa el formulario con los siguientes datos:
   - **Name:** `codebase-mcp`
   - **Type:** `command`
   - **Command:** `npx -y codebase-mcp`
5. Haz clic en **Save**. En el panel lateral del chat de Cursor aparecerá un indicador verde confirmando que las herramientas están activas.

---

### 3. Claude Desktop

Abre o crea el archivo de configuración `claude_desktop_config.json` en la ruta correspondiente a tu sistema operativo:

* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
* **Linux:** `~/.config/Claude/claude_desktop_config.json`

Agrega el servidor dentro del bloque `"mcpServers"`:

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

Reinicia **Claude Desktop** y verás el ícono de herramientas disponible en el área de chat.

---

### 4. Windsurf IDE

1. Abre **Windsurf**.
2. Dirígete a la vista de **Cascade Chat**.
3. Haz clic en el ícono de **MCP Hammers** (Configuración de MCP) o abre el archivo `~/.codeium/windsurf/mcp_config.json`.
4. Agrega la siguiente configuración:

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
5. Guarda el archivo y reinicia el chat de Cascade.

---

### 5. VS Code (Extensiones Roo Code, Cline o Continue)

#### Para Roo Code / Cline:
1. Abre la extensión **Roo Code** o **Cline** en el panel lateral de VS Code.
2. Haz clic en la pestaña **MCP Servers** y luego en **Edit MCP Settings**.
3. Pega la siguiente configuración en el archivo `cline_mcp_settings.json`:

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

#### Para Continue:
1. Abre `.continue/config.json` en tu carpeta personal.
2. Agrega dentro de la lista `"experimental"` o `"mcpServers"`:

```json
{
  "mcpServers": [
    {
      "name": "714-mcp-tool",
      "command": "npx",
      "args": ["-y", "714-mcp-tool"]
    }
  ]
}
```

---

## Herramientas MCP Expuestas

| Herramienta | Parámetros | Descripción |
| :--- | :--- | :--- |
| **`get_project_tree`** | `max_depth` (defecto: `4`) | Devuelve la estructura en árbol ASCII del proyecto respetando `.gitignore`. |
| **`search_codebase`** | `query` (requerido), `max_results`, `use_regex` | Busca patrones de texto o regex en el proyecto y devuelve snippets numerados. |
| **`read_project_file`** | `relative_path` (requerido), `start_line`, `end_line` | Lee el contenido de un archivo de forma segura con números de línea. |
| **`inspect_tech_stack`** | *ninguno* | Analiza manifiestos del proyecto (`package.json`, `Cargo.toml`, etc.) para dar un resumen del stack. |

---

# English

`codebase-mcp` gives Claude Code, Claude Desktop, Cursor, Windsurf, VS Code, and autonomous AI agents instant, deep visibility into your local codebases without indexers, vector databases, or complex setup.

## Features

- **Zero Configuration**: Simply run `npx 714-mcp-tool` in any project folder or specify `--path /path/to/project`.
- **High-Performance Async I/O**: Fully non-blocking asynchronous filesystem operations built for large codebases.
- **Smart Tree Inspection (`get_project_tree`)**: Generates clean ASCII directory maps respecting `.gitignore` and circular symlinks.
- **Instant Text & Regex Search (`search_codebase`)**: Fast grep-style search with line numbers, code snippets, and optional regex (`use_regex`).
- **Safe File Reading (`read_project_file`)**: Read specific files or line ranges safely with path traversal protection and max file size guards.
- **Security-First**: Automatically redacts and blocks access to sensitive credential files (`.env`, `.pem`, `id_rsa`, `credentials.json`, `secrets.json`, etc.).
- **Multi-Language Tech Stack Diagnostics (`inspect_tech_stack`)**: Automatically identifies Node.js, Python, Go, Rust, Java, PHP, Ruby, and Docker setups.

---

## How It Works

You do **not** need to manually clone this repository. Once configured, your AI assistant launches `codebase-mcp` automatically in the background as a local process.

```text
[ User ] -- "Where is the sensitive file filter function defined?"
    │
    ▼
[ AI Assistant (Claude / Cursor / Windsurf) ] -- (Detects local codebase-mcp tool availability)
    │
    ├─► Sends STDIO JSON-RPC: search_codebase(query: "isSensitiveFile")
    │
    ▼
[ codebase-mcp (Local Background Process) ]
    │
    ├─► Scans local repository safely, applying .gitignore & security filters
    └─► Returns: "src/utils/fileSystem.ts:81 -> export function isSensitiveFile..."
    │
    ▼
[ AI Assistant ] -- "The sensitive file filter is defined at line 81 of src/utils/fileSystem.ts..."
```

---

## Integration Tutorials

### 1. Claude Code (Anthropic CLI)

Run in your terminal:

```bash
claude mcp add codebase-mcp -- npx -y codebase-mcp
```

Verify connection:

```bash
claude mcp list
```

### 2. Cursor IDE

1. Open **Cursor Settings** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Set **Name:** `codebase-mcp`, **Type:** `command`, **Command:** `npx -y codebase-mcp`.

### 3. Claude Desktop

Add to `claude_desktop_config.json`:

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

### 4. Windsurf IDE

Add to `~/.codeium/windsurf/mcp_config.json`:

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

## Security & Privacy

- Operates **100% locally** over STDIO. No code or data is ever sent to external cloud servers.
- Path traversal attempts (`../../`) are strictly blocked.
- Sensitive files (`.env`, `credentials.json`, `id_rsa`, `secrets.json`) are protected from AI reads.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
