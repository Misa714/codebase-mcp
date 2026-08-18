import path from "path";
import { getIgnoreInstanceAsync, scanDirectoryAsync, isPathSafe, normalizePath } from "../utils/fileSystem.js";

/**
 * Genera una representación limpia en árbol de texto plano de la estructura de archivos
 * y directorios del repositorio, respetando las reglas de ignorado (.gitignore).
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param maxDepth Profundidad máxima de directorios a inspeccionar (por defecto: 4).
 * @param subPath Subcarpeta o ruta relativa opcional a inspeccionar.
 * @returns Cadena formateada representando el árbol del proyecto.
 */
export async function handleGetProjectTree(
  rootPath: string,
  maxDepth: number = 4,
  subPath?: string
): Promise<string> {
  let targetPath = rootPath;
  let relativePrefix = "";

  if (subPath && subPath.trim().length > 0) {
    const { safe, fullPath } = isPathSafe(rootPath, subPath);
    if (!safe) {
      return "Error: Cannot inspect directories outside the project root.";
    }
    targetPath = fullPath;
    relativePrefix = normalizePath(path.relative(rootPath, fullPath));
  }

  // Cargar las reglas de ignorado asincrónicamente
  const ig = await getIgnoreInstanceAsync(rootPath);
  
  // Escanear el directorio de forma asincrónica hasta la profundidad especificada
  const entries = await scanDirectoryAsync(targetPath, rootPath, ig, maxDepth);

  if (entries.length === 0) {
    return `El directorio ${relativePrefix || rootPath} parece estar vacío o todos los archivos están ignorados por .gitignore.`;
  }

  // Construir la representación formateada del árbol
  const displayHeader = relativePrefix ? `${rootPath}/${relativePrefix}` : rootPath;
  const lines: string[] = [`Project Tree: ${displayHeader}`];

  for (const entry of entries) {
    const relativeToTarget = relativePrefix
      ? entry.relativePath.replace(new RegExp(`^${relativePrefix}/?`), "")
      : entry.relativePath;

    if (!relativeToTarget) continue;

    const parts = relativeToTarget.split("/").filter(Boolean);
    const depth = parts.length - 1;
    const indent = "  ".repeat(Math.max(0, depth));
    const tag = entry.isDir ? "[DIR]" : "[FILE]";
    const sizeInfo = entry.size !== undefined && !entry.isDir ? ` (${(entry.size / 1024).toFixed(1)} KB)` : "";
    const name = parts[parts.length - 1];

    lines.push(`${indent}${tag} ${name}${sizeInfo}`);
  }

  return lines.join("\n");
}
