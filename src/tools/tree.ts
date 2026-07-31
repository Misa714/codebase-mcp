import { getIgnoreInstanceAsync, scanDirectoryAsync } from "../utils/fileSystem.js";

/**
 * Genera una representación limpia en árbol de texto plano de la estructura de archivos
 * y directorios del repositorio, respetando las reglas de ignorado (.gitignore).
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param maxDepth Profundidad máxima de directorios a inspeccionar (por defecto: 4).
 * @returns Cadena formateada representando el árbol del proyecto.
 */
export async function handleGetProjectTree(rootPath: string, maxDepth: number = 4): Promise<string> {
  // Cargar las reglas de ignorado asincrónicamente
  const ig = await getIgnoreInstanceAsync(rootPath);
  
  // Escanear el directorio de forma asincrónica hasta la profundidad especificada
  const entries = await scanDirectoryAsync(rootPath, rootPath, ig, maxDepth);

  if (entries.length === 0) {
    return "El repositorio parece estar vacío o todos los archivos están ignorados por .gitignore.";
  }

  // Construir la representación formateada del árbol sin íconos o emojís
  const lines: string[] = [`Project Tree: ${rootPath}`];
  for (const entry of entries) {
    const depth = entry.relativePath.split("/").length - 1;
    const indent = "  ".repeat(depth);
    const tag = entry.isDir ? "[DIR]" : "[FILE]";
    const sizeInfo = entry.size !== undefined && !entry.isDir ? ` (${(entry.size / 1024).toFixed(1)} KB)` : "";
    const name = entry.relativePath.split("/").pop();
    lines.push(`${indent}${tag} ${name}${sizeInfo}`);
  }

  return lines.join("\n");
}


