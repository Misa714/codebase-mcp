import fs from "fs/promises";
import { isPathSafe, isSensitiveFile, getIgnoreInstanceAsync } from "../utils/fileSystem.js";

/**
 * Lee el contenido de un archivo específico del proyecto de forma segura,
 * aplicando validaciones contra Path Traversal, filtrado de archivos de credenciales,
 * respeto a las reglas de .gitignore y límites de tamaño.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param relativePath Ruta relativa del archivo a leer.
 * @param startLine Línea inicial a leer (opcional, 1-based).
 * @param endLine Línea final a leer (opcional, inclusive).
 * @returns Contenido del archivo numerado por líneas o mensaje de error.
 */
export async function handleReadProjectFile(
  rootPath: string,
  relativePath: string,
  startLine?: number,
  endLine?: number
): Promise<string> {
  // 1. Validar la seguridad de la ruta contra ataques Path Traversal (ej. ../../etc/passwd)
  const { safe, fullPath } = isPathSafe(rootPath, relativePath);

  if (!safe) {
    return "Error: Cannot access files outside the project root directory.";
  }

  // 2. Bloquear archivos que contengan credenciales o llaves privadas
  if (isSensitiveFile(relativePath)) {
    return "Error: Access denied. Sensitive configuration/credential files cannot be read via MCP for security.";
  }

  // 3. Verificar si el archivo está ignorado por el archivo .gitignore del proyecto
  const ig = await getIgnoreInstanceAsync(rootPath);
  if (ig.ignores(relativePath)) {
    return "Error: File is ignored by .gitignore rules.";
  }

  try {
    // 4. Validar las propiedades del archivo de forma asincrónica
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return `Error: "${relativePath}" is a directory. Use get_project_tree to view directory contents.`;
    }

    // Limitar el tamaño de lectura a un máximo de 2 MB
    if (stats.size > 2 * 1024 * 1024) {
      return `Error: File "${relativePath}" is too large (>2MB).`;
    }

    // 5. Leer el contenido del archivo e identificar los rangos de líneas solicitados
    const content = await fs.readFile(fullPath, "utf-8");
    const lines = content.split("\n");

    const start = startLine ? Math.max(1, startLine) : 1;
    const end = endLine ? Math.min(lines.length, endLine) : lines.length;

    if (start > lines.length) {
      return `Error: Start line (${start}) exceeds total line count (${lines.length}).`;
    }

    // Formatear las líneas seleccionadas añadiendo sus números de línea
    const selectedLines = lines.slice(start - 1, end);
    const numberedLines = selectedLines.map((line, idx) => `${start + idx} | ${line}`).join("\n");

    return `File: ${relativePath} (Lines ${start}-${end} of ${lines.length})\n\n${numberedLines}`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      return `Error: File "${relativePath}" does not exist.`;
    }
    return `Error reading file: ${msg}`;
  }
}


