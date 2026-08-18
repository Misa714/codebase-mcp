#!/usr/bin/env node
import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { handleGetProjectTree } from "./tools/tree.js";
import { handleSearchCodebase } from "./tools/search.js";
import { handleSearchHybrid } from "./tools/hybridSearch.js";
import { handleReadProjectFile } from "./tools/reader.js";
import { handleInspectTechStack } from "./tools/techStack.js";
import { handleGetFileOutline } from "./tools/outline.js";
import { handleGetFileDependencies } from "./tools/dependencies.js";
import { handleGetGitChanges } from "./tools/git.js";
import { handleApplyFilePatch } from "./tools/patch.js";
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
      version: "2.0.0",
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
          name: "search_hybrid",
          description: isSpanish
            ? "Búsqueda híbrida inteligente (BM25 + Coincidencia difusa + Relevancia de símbolos) para encontrar código por lenguaje natural o términos técnicos en milisegundos."
            : "Smart hybrid code search (BM25 + Fuzzy match + Symbol relevance) to find code using natural language queries or technical terms in milliseconds.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: isSpanish
                  ? "Consulta en lenguaje natural o término a buscar (ej: 'donde se comprueban credenciales' o 'auth token')"
                  : "Natural language query or search term (e.g. 'where credentials are checked' or 'auth token')",
              },
              max_results: {
                type: "number",
                description: isSpanish ? "Número máximo de archivos a retornar (por defecto: 10)" : "Maximum matching files to return (default: 10)",
              },
              file_extensions: {
                type: "array",
                items: { type: "string" },
                description: isSpanish ? "Lista opcional de extensiones a filtrar (ej: ['ts', 'py'])" : "Optional file extension filters (e.g. ['ts', 'py'])",
              },
              path_pattern: {
                type: "string",
                description: isSpanish ? "Filtro opcional por subcarpeta (ej: 'src/tools')" : "Optional path or folder filter (e.g. 'src/tools')",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "search_codebase",
          description: isSpanish
            ? "Busca un patrón de texto exacto o expresión regular en todo el código del proyecto, con filtros por extensión o subcarpeta."
            : "Searches the codebase for an exact text pattern or regular expression, with optional extension and folder filters.",
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
          name: "apply_file_patch",
          description: isSpanish
            ? "Aplica una edición o reemplazo quirúrgico de código en un archivo con validación previa de coincidencia exacta para garantizar la integridad."
            : "Applies a surgical code edit or patch to a file with pre-validation of target content to guarantee integrity.",
          inputSchema: {
            type: "object",
            properties: {
              relative_path: {
                type: "string",
                description: isSpanish ? "Ruta relativa del archivo a modificar" : "Relative path of the file to patch",
              },
              target_content: {
                type: "string",
                description: isSpanish ? "Bloque exacto de código a reemplazar" : "Exact code block to be replaced",
              },
              replacement_content: {
                type: "string",
                description: isSpanish ? "Nuevo bloque de código reemplazante" : "New replacement code block",
              },
              allow_multiple: {
                type: "boolean",
                description: isSpanish ? "Si es true, reemplaza todas las ocurrencias (por defecto: false)" : "If true, replaces all occurrences (default: false)",
              },
            },
            required: ["relative_path", "target_content", "replacement_content"],
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
    search_hybrid: async (toolArgs) => {
      const query = String(toolArgs?.query || "");
      const maxResults = typeof toolArgs?.max_results === "number" ? toolArgs.max_results : 10;
      const fileExtensions = toolArgs?.file_extensions;
      const pathPattern = typeof toolArgs?.path_pattern === "string" ? toolArgs.path_pattern : undefined;
      return await handleSearchHybrid(rootDir, query, maxResults, fileExtensions, pathPattern);
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
    apply_file_patch: async (toolArgs) => {
      const relativePath = String(toolArgs?.relative_path || "");
      const targetContent = String(toolArgs?.target_content || "");
      const replacementContent = String(toolArgs?.replacement_content || "");
      const allowMultiple = Boolean(toolArgs?.allow_multiple);
      return await handleApplyFilePatch(rootDir, relativePath, targetContent, replacementContent, allowMultiple);
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
