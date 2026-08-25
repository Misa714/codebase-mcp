#!/usr/bin/env node
import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { handleGetProjectTree } from "./tools/tree.js";
import { handleSearchCodebase } from "./tools/search.js";
import { handleReadProjectFile } from "./tools/reader.js";
import { handleInspectTechStack } from "./tools/techStack.js";
import { handleGetFileOutline } from "./tools/outline.js";
import { handleGetFileDependencies } from "./tools/dependencies.js";
import { handleGetGitChanges } from "./tools/git.js";
import { startInteractiveCLI } from "./cli.js";

// Extraer argumentos de la línea de comandos
const args = process.argv.slice(2);

// Determinar la ruta raíz del repositorio objetivo (por defecto es el directorio actual)
let rootDir = process.cwd();
const pathIdx = args.indexOf("--path");
if (pathIdx !== -1 && args[pathIdx + 1]) {
  rootDir = path.resolve(args[pathIdx + 1]);
}

// Comprobar si el usuario solicitó directamente el modo CLI interactivo
if (args.includes("--cli") || args.includes("-c")) {
  const isEs = args.includes("--lang") && args[args.indexOf("--lang") + 1] === "en" ? "en" : "es";
  startInteractiveCLI(rootDir, isEs);
} else {
  // Detectar el idioma del sistema o del argumento --lang para formatear descripciones
  const langArg = args.find((a, i) => args[i - 1] === "--lang") || "en";
  const isSpanish = langArg === "es" || process.env.LANG?.toLowerCase().startsWith("es");

  // Crear la instancia principal del servidor MCP (Model Context Protocol)
  const server = new Server(
    {
      name: "codebase-mcp",
      version: "1.3.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Registrar el manejador de la lista de herramientas disponibles (ListTools)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_project_tree",
          description: isSpanish
            ? "Devuelve la estructura y árbol de archivos del repositorio local respetando las reglas de .gitignore."
            : "Returns the directory structure and file tree of the local repository, respecting .gitignore rules.",
          inputSchema: {
            type: "object",
            properties: {
              max_depth: {
                type: "number",
                description: isSpanish
                  ? "Profundidad máxima de carpetas a escanear (por defecto: 4)"
                  : "Maximum directory depth to scan (default: 4)",
              },
              sub_path: {
                type: "string",
                description: isSpanish
                  ? "Subcarpeta o ruta relativa opcional a inspeccionar (ej: 'src/tools')"
                  : "Optional subfolder or relative path to inspect (e.g. 'src/tools')",
              },
            },
          },
        },
        {
          name: "search_codebase",
          description: isSpanish
            ? "Busca un patrón de texto o expresión regular en todo el código del proyecto, con filtros opcionales por extensión o subcarpeta."
            : "Searches the codebase for a text pattern or regular expression, with optional extension and folder filters.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: isSpanish
                  ? "Texto o patrón regex a buscar en el código"
                  : "Text or regex pattern to search for",
              },
              max_results: {
                type: "number",
                description: isSpanish
                  ? "Número máximo de resultados (por defecto: 30)"
                  : "Maximum number of results (default: 30)",
              },
              use_regex: {
                type: "boolean",
                description: isSpanish
                  ? "Si es true, interpreta la búsqueda como una Expresión Regular (por defecto: false)"
                  : "If true, treats the query as a Regular Expression (default: false)",
              },
              file_extensions: {
                type: "array",
                items: { type: "string" },
                description: isSpanish
                  ? "Lista opcional de extensiones a filtrar (ej: ['ts', 'js'] o ['py'])"
                  : "Optional list of file extensions to filter (e.g. ['ts', 'js'] or ['py'])",
              },
              path_pattern: {
                type: "string",
                description: isSpanish
                  ? "Filtro opcional por ruta o subcarpeta (ej: 'src/tools')"
                  : "Optional path or subfolder filter (e.g. 'src/tools')",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_file_outline",
          description: isSpanish
            ? "Extrae el esquema e índice de símbolos (funciones, clases, interfaces, métodos, encabezados) de un archivo con sus números de línea para ahorrar contexto."
            : "Extracts an outline of declarations and symbols (functions, classes, interfaces, methods, headers) with line numbers to save context tokens.",
          inputSchema: {
            type: "object",
            properties: {
              relative_path: {
                type: "string",
                description: isSpanish
                  ? "Ruta relativa del archivo a inspeccionar (ej: 'src/index.ts')"
                  : "Relative path of the file to inspect (e.g. 'src/index.ts')",
              },
            },
            required: ["relative_path"],
          },
        },
        {
          name: "get_file_dependencies",
          description: isSpanish
            ? "Analiza las dependencias entrantes y salientes de un archivo (qué módulos usa y qué otros archivos del proyecto se verán afectados si se modifica)."
            : "Analyzes incoming and outgoing dependencies of a file (what it imports and what other project files will be impacted if changed).",
          inputSchema: {
            type: "object",
            properties: {
              relative_path: {
                type: "string",
                description: isSpanish
                  ? "Ruta relativa del archivo a analizar (ej: 'src/utils/fileSystem.ts')"
                  : "Relative path of the file to analyze (e.g. 'src/utils/fileSystem.ts')",
              },
            },
            required: ["relative_path"],
          },
        },
        {
          name: "get_git_changes",
          description: isSpanish
            ? "Inspecciona los archivos modificados, staged y untracked de Git con estadísticas y diff textual para revisiones de código y mensajes de commit."
            : "Inspects modified, staged, and untracked Git files with statistics and code diff for reviews and commit generation.",
          inputSchema: {
            type: "object",
            properties: {
              include_diff: {
                type: "boolean",
                description: isSpanish
                  ? "Si es true, incluye el diff textual de los cambios no confirmados (por defecto: true)"
                  : "If true, includes the textual code diff of uncommitted changes (default: true)",
              },
            },
          },
        },
        {
          name: "read_project_file",
          description: isSpanish
            ? "Lee el contenido de un archivo específico del proyecto de forma segura con números de línea."
            : "Reads the contents of a specific file within the project safely with line numbers.",
          inputSchema: {
            type: "object",
            properties: {
              relative_path: {
                type: "string",
                description: isSpanish
                  ? "Ruta relativa del archivo a leer (ej: 'src/index.ts')"
                  : "Relative path of the file to read (e.g. 'src/index.ts')",
              },
              start_line: {
                type: "number",
                description: isSpanish ? "Línea inicial (opcional)" : "Optional start line number (1-based)",
              },
              end_line: {
                type: "number",
                description: isSpanish ? "Línea final (opcional)" : "Optional end line number (inclusive)",
              },
            },
            required: ["relative_path"],
          },
        },
        {
          name: "inspect_tech_stack",
          description: isSpanish
            ? "Inspecciona archivos de configuración (package.json, Cargo.toml, Dockerfile, etc.) para entregar un diagnóstico de tecnologías usadas."
            : "Analyzes package files (package.json, Cargo.toml, requirements.txt, Dockerfile, etc.) to report project dependencies, frameworks, and setup.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  /** Tipo de función manejadora para el registro de herramientas Strategy */
  type ToolHandler = (args: Record<string, any>) => Promise<string>;

  // Registro de estrategias (Strategy Pattern) para despachar llamadas a herramientas
  const toolRegistry: Record<string, ToolHandler> = {
    get_project_tree: async (toolArgs) => {
      const maxDepth = typeof toolArgs?.max_depth === "number" ? toolArgs.max_depth : 4;
      const subPath = typeof toolArgs?.sub_path === "string" ? toolArgs.sub_path : undefined;
      return await handleGetProjectTree(rootDir, maxDepth, subPath);
    },
    search_codebase: async (toolArgs) => {
      const query = String(toolArgs?.query || "");
      const maxResults = typeof toolArgs?.max_results === "number" ? toolArgs.max_results : 30;
      const useRegex = Boolean(toolArgs?.use_regex);
      const fileExtensions = toolArgs?.file_extensions;
      const pathPattern = typeof toolArgs?.path_pattern === "string" ? toolArgs.path_pattern : undefined;
      return await handleSearchCodebase(rootDir, query, maxResults, useRegex, fileExtensions, pathPattern);
    },
    get_file_outline: async (toolArgs) => {
      const relativePath = String(toolArgs?.relative_path || "");
      return await handleGetFileOutline(rootDir, relativePath);
    },
    get_file_dependencies: async (toolArgs) => {
      const relativePath = String(toolArgs?.relative_path || "");
      return await handleGetFileDependencies(rootDir, relativePath);
    },
    get_git_changes: async (toolArgs) => {
      const includeDiff = toolArgs?.include_diff !== undefined ? Boolean(toolArgs.include_diff) : true;
      return await handleGetGitChanges(rootDir, includeDiff);
    },
    read_project_file: async (toolArgs) => {
      const relativePath = String(toolArgs?.relative_path || "");
      const startLine = typeof toolArgs?.start_line === "number" ? toolArgs.start_line : undefined;
      const endLine = typeof toolArgs?.end_line === "number" ? toolArgs.end_line : undefined;
      return await handleReadProjectFile(rootDir, relativePath, startLine, endLine);
    },
    inspect_tech_stack: async () => {
      return await handleInspectTechStack(rootDir);
    },
  };

  // Registrar el manejador de solicitudes de ejecución de herramientas (CallTool)
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;

    try {
      const handler = toolRegistry[name];
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const result = await handler(toolArgs || {});
      return { content: [{ type: "text", text: result }] };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error executing tool '${name}': ${errorMessage}` }],
        isError: true,
      };
    }
  });

  /**
   * Función de inicio que conecta el servidor MCP mediante transporte Stdio
   */
  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[codebase-mcp] server running for: ${rootDir}`);
  }

  main().catch((error: unknown) => {
    console.error("Fatal error starting codebase-mcp:", error);
    process.exit(1);
  });
}
