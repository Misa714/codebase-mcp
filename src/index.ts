#!/usr/bin/env node
import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { handleGetProjectTree } from "./tools/tree.js";
import { handleSearchCodebase } from "./tools/search.js";
import { handleReadProjectFile } from "./tools/reader.js";
import { handleInspectTechStack } from "./tools/techStack.js";
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
      version: "1.1.0",
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
            },
          },
        },
        {
          name: "search_codebase",
          description: isSpanish
            ? "Busca un patrón de texto o expresión regular en todo el código del proyecto, devolviendo archivos y líneas coincidentes."
            : "Searches the codebase for a text pattern or regular expression, returning matching files, line numbers, and snippets.",
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
            },
            required: ["query"],
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
      return await handleGetProjectTree(rootDir, maxDepth);
    },
    search_codebase: async (toolArgs) => {
      const query = String(toolArgs?.query || "");
      const maxResults = typeof toolArgs?.max_results === "number" ? toolArgs.max_results : 30;
      const useRegex = Boolean(toolArgs?.use_regex);
      return await handleSearchCodebase(rootDir, query, maxResults, useRegex);
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


