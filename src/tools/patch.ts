import fs from "fs/promises";
import path from "path";
import { isPathSafe, isSensitiveFile, getIgnoreInstanceAsync, isBinaryFileAsync } from "../utils/fileSystem.js";
import { clearIndexCache } from "./hybridSearch.js";

/**
 * Aplica modificaciones quirúrgicas y reemplazos de código seguros en un archivo específico.
 * Normaliza automáticamente saltos de línea (CRLF y LF) y valida la existencia exacta del bloque antes de escribir.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param relativePath Ruta relativa del archivo a modificar.
 * @param targetContent Bloque de código exacto a reemplazar.
 * @param replacementContent Nuevo bloque de código con el que se reemplazará targetContent.
 * @param allowMultiple Si es true, reemplaza todas las ocurrencias encontradas (por defecto: false).
 * @returns Mensaje de confirmación con las líneas modificadas o mensaje de error detallado.
 */
export async function handleApplyFilePatch(
  rootPath: string,
  relativePath: string,
  targetContent: string,
  replacementContent: string,
  allowMultiple: boolean = false
): Promise<string> {
  const { safe, fullPath } = isPathSafe(rootPath, relativePath);
  if (!safe) {
    return "Error: Cannot modify files outside the project root directory.";
  }

  if (isSensitiveFile(relativePath)) {
    return "Error: Access denied. Sensitive configuration and credential files cannot be modified via MCP.";
  }

  const ig = await getIgnoreInstanceAsync(rootPath);
  if (ig.ignores(relativePath)) {
    return "Error: Cannot modify files ignored by .gitignore rules.";
  }

  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return `Error: "${relativePath}" is a directory, not a file.`;
    }

    if (await isBinaryFileAsync(fullPath)) {
      return `Error: Cannot patch binary file "${relativePath}".`;
    }

    const currentContent = await fs.readFile(fullPath, "utf-8");

    // Detectar si el archivo original en disco usa saltos de línea Windows (CRLF)
    const usesCrlf = currentContent.includes("\r\n");

    // Normalizar a LF para comparar y reemplazar sin errores por diferencias de sistema operativo
    const normalizedCurrent = currentContent.replace(/\r\n/g, "\n");
    const normalizedTarget = targetContent.replace(/\r\n/g, "\n");
    const normalizedReplacement = replacementContent.replace(/\r\n/g, "\n");

    if (!normalizedCurrent.includes(normalizedTarget)) {
      return `Error: Target content was not found in "${relativePath}". Please re-read the file with 'read_project_file' to ensure exact character matching (including indentation and whitespace).`;
    }

    const occurrences = normalizedCurrent.split(normalizedTarget).length - 1;
    if (occurrences > 1 && !allowMultiple) {
      return `Error: Target content occurs ${occurrences} times in "${relativePath}". Set 'allow_multiple: true' or provide more surrounding context to uniquely target the block.`;
    }

    let updatedNormalized: string;
    if (allowMultiple) {
      updatedNormalized = normalizedCurrent.split(normalizedTarget).join(normalizedReplacement);
    } else {
      updatedNormalized = normalizedCurrent.replace(normalizedTarget, normalizedReplacement);
    }

    // Restaurar el formato original de saltos de línea del archivo
    const finalContent = usesCrlf ? updatedNormalized.replace(/\n/g, "\r\n") : updatedNormalized;

    await fs.writeFile(fullPath, finalContent, "utf-8");

    // Invalidar inmediatamente la caché del índice de búsqueda en memoria
    clearIndexCache();

    const oldLines = normalizedCurrent.split("\n").length;
    const newLines = updatedNormalized.split("\n").length;

    return `✅ Successfully patched "${relativePath}" (${occurrences} replacement${occurrences > 1 ? "s" : ""}, lines: ${oldLines} -> ${newLines}).`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      return `Error: File "${relativePath}" does not exist.`;
    }
    return `Error patching file "${relativePath}": ${msg}`;
  }
}
