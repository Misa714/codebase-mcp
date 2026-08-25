import readline from "readline";
import { handleGetProjectTree } from "./tools/tree.js";
import { handleSearchHybrid } from "./tools/hybridSearch.js";
import { handleSearchCodebase } from "./tools/search.js";
import { handleReadProjectFile } from "./tools/reader.js";
import { handleInspectTechStack } from "./tools/techStack.js";
import { handleGetFileOutline } from "./tools/outline.js";
import { handleGetFileDependencies } from "./tools/dependencies.js";
import { handleGetGitChanges } from "./tools/git.js";
import { handleApplyFilePatch } from "./tools/patch.js";

/**
 * Inicia la interfaz interactiva de línea de comandos (CLI) para permitir
 * a los usuarios ejecutar manualmente las herramientas MCP desde la terminal.
 * 
 * @param rootDir Ruta del directorio raíz sobre el cual operar.
 * @param lang Idioma de la interfaz ("es" para español, "en" para inglés).
 */
export function startInteractiveCLI(rootDir: string, lang: "es" | "en" = "es") {
  // Crear interfaz de lectura de entrada estándar (stdin/stdout)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const isEs = lang === "es";

  console.log("\n========================================================");
  console.log(isEs ? "MODO CLI INTERACTIVO - codebase-mcp (v2.0.0)" : "INTERACTIVE CLI MODE - codebase-mcp (v2.0.0)");
  console.log(`${isEs ? "Directorio actual" : "Current directory"}: ${rootDir}`);
  console.log("========================================================\n");

  /**
   * Muestra el menú principal de opciones e interactúa de forma asincrónica con el usuario.
   */
  function showMenu() {
    console.log("\n" + (isEs ? "Selecciona una opción:" : "Select an option:"));
    console.log(isEs ? "1. Ver árbol del proyecto (get_project_tree)" : "1. View project tree (get_project_tree)");
    console.log(isEs ? "2. Búsqueda híbrida inteligente BM25 (search_hybrid)" : "2. Smart hybrid BM25 search (search_hybrid)");
    console.log(isEs ? "3. Búsqueda exacta / regex (search_codebase)" : "3. Exact / regex search (search_codebase)");
    console.log(isEs ? "4. Esquema / Índice de un archivo (get_file_outline)" : "4. File outline / Symbol index (get_file_outline)");
    console.log(isEs ? "5. Análisis de dependencias e impacto (get_file_dependencies)" : "5. Dependency & impact analysis (get_file_dependencies)");
    console.log(isEs ? "6. Cambios locales Git / Diff (get_git_changes)" : "6. Local Git changes & diff (get_git_changes)");
    console.log(isEs ? "7. Aplicar parche / edición segura (apply_file_patch)" : "7. Apply safe patch / edit (apply_file_patch)");
    console.log(isEs ? "8. Leer un archivo del proyecto (read_project_file)" : "8. Read a project file (read_project_file)");
    console.log(isEs ? "9. Inspeccionar tecnologías (inspect_tech_stack)" : "9. Inspect tech stack (inspect_tech_stack)");
    console.log(isEs ? "10. Salir" : "10. Exit");

    rl.question("\nOption (1-10): ", async (answer) => {
      const choice = answer.trim();

      if (choice === "1") {
        rl.question(isEs ? "Profundidad máxima (por defecto 4): " : "Max depth (default 4): ", async (depthStr) => {
          const depth = parseInt(depthStr) || 4;
          const result = await handleGetProjectTree(rootDir, depth);
          console.log("\n" + result);
          showMenu();
        });
      } else if (choice === "2") {
        rl.question(isEs ? "Consulta en lenguaje natural o término: " : "Natural query or term: ", async (query) => {
          const result = await handleSearchHybrid(rootDir, query);
          console.log("\n" + result);
          showMenu();
        });
      } else if (choice === "3") {
        rl.question(isEs ? "Texto a buscar: " : "Search query: ", async (query) => {
          const result = await handleSearchCodebase(rootDir, query);
          console.log("\n" + result);
          showMenu();
        });
      } else if (choice === "4") {
        rl.question(
          isEs ? "Ruta relativa del archivo (ej: src/index.ts): " : "Relative file path (e.g. src/index.ts): ",
          async (filePath) => {
            const result = await handleGetFileOutline(rootDir, filePath);
            console.log("\n" + result);
            showMenu();
          }
        );
      } else if (choice === "5") {
        rl.question(
          isEs ? "Ruta relativa del archivo (ej: src/utils/fileSystem.ts): " : "Relative file path (e.g. src/utils/fileSystem.ts): ",
          async (filePath) => {
            const result = await handleGetFileDependencies(rootDir, filePath);
            console.log("\n" + result);
            showMenu();
          }
        );
      } else if (choice === "6") {
        const result = await handleGetGitChanges(rootDir, true);
        console.log("\n" + result);
        showMenu();
      } else if (choice === "7") {
        rl.question(isEs ? "Ruta del archivo: " : "File path: ", (filePath) => {
          rl.question(isEs ? "Texto exacto a reemplazar: " : "Target content: ", (target) => {
            rl.question(isEs ? "Nuevo contenido: " : "Replacement: ", async (replacement) => {
              const result = await handleApplyFilePatch(rootDir, filePath, target, replacement);
              console.log("\n" + result);
              showMenu();
            });
          });
        });
      } else if (choice === "8") {
        rl.question(
          isEs ? "Ruta relativa del archivo (ej: src/index.ts): " : "Relative file path (e.g. src/index.ts): ",
          async (filePath) => {
            const result = await handleReadProjectFile(rootDir, filePath);
            console.log("\n" + result);
            showMenu();
          }
        );
      } else if (choice === "9") {
        const result = await handleInspectTechStack(rootDir);
        console.log("\n" + result);
        showMenu();
      } else if (choice === "10") {
        console.log(isEs ? "\n¡Gracias por usar codebase-mcp!" : "\nThank you for using codebase-mcp!");
        rl.close();
        process.exit(0);
      } else {
        console.log(isEs ? "Opción no válida." : "Invalid option.");
        showMenu();
      }
    });
  }

  showMenu();
}
