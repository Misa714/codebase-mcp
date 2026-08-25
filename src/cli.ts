import readline from "readline";
import { handleGetProjectTree } from "./tools/tree.js";
import { handleSearchCodebase } from "./tools/search.js";
import { handleReadProjectFile } from "./tools/reader.js";
import { handleInspectTechStack } from "./tools/techStack.js";
import { handleGetFileOutline } from "./tools/outline.js";

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
  console.log(isEs ? "MODO CLI INTERACTIVO - codebase-mcp" : "INTERACTIVE CLI MODE - codebase-mcp");
  console.log(`${isEs ? "Directorio actual" : "Current directory"}: ${rootDir}`);
  console.log("========================================================\n");

  /**
   * Muestra el menú principal de opciones e interactúa de forma asincrónica con el usuario.
   */
  function showMenu() {
    console.log("\n" + (isEs ? "Selecciona una opción:" : "Select an option:"));
    console.log(isEs ? "1. Ver árbol del proyecto (get_project_tree)" : "1. View project tree (get_project_tree)");
    console.log(isEs ? "2. Buscar texto en el proyecto (search_codebase)" : "2. Search text in project (search_codebase)");
    console.log(isEs ? "3. Esquema / Índice de un archivo (get_file_outline)" : "3. File outline / Symbol index (get_file_outline)");
    console.log(isEs ? "4. Leer un archivo del proyecto (read_project_file)" : "4. Read a project file (read_project_file)");
    console.log(isEs ? "5. Inspeccionar tecnologías (inspect_tech_stack)" : "5. Inspect tech stack (inspect_tech_stack)");
    console.log(isEs ? "6. Salir" : "6. Exit");

    rl.question("\nOption (1-6): ", async (answer) => {
      const choice = answer.trim();

      if (choice === "1") {
        rl.question(isEs ? "Profundidad máxima (por defecto 4): " : "Max depth (default 4): ", async (depthStr) => {
          const depth = parseInt(depthStr) || 4;
          const result = await handleGetProjectTree(rootDir, depth);
          console.log("\n" + result);
          showMenu();
        });
      } else if (choice === "2") {
        rl.question(isEs ? "Texto a buscar: " : "Search query: ", async (query) => {
          const result = await handleSearchCodebase(rootDir, query);
          console.log("\n" + result);
          showMenu();
        });
      } else if (choice === "3") {
        rl.question(
          isEs ? "Ruta relativa del archivo (ej: src/index.ts): " : "Relative file path (e.g. src/index.ts): ",
          async (filePath) => {
            const result = await handleGetFileOutline(rootDir, filePath);
            console.log("\n" + result);
            showMenu();
          }
        );
      } else if (choice === "4") {
        rl.question(
          isEs ? "Ruta relativa del archivo (ej: src/index.ts): " : "Relative file path (e.g. src/index.ts): ",
          async (filePath) => {
            const result = await handleReadProjectFile(rootDir, filePath);
            console.log("\n" + result);
            showMenu();
          }
        );
      } else if (choice === "5") {
        const result = await handleInspectTechStack(rootDir);
        console.log("\n" + result);
        showMenu();
      } else if (choice === "6") {
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
