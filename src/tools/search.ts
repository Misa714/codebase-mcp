import fs from "fs/promises";
import path from "path";
import { getIgnoreInstanceAsync, scanDirectoryAsync, isSensitiveFile, isBinaryFileAsync, normalizePath } from "../utils/fileSystem.js";

/**
 * Estructura que representa una coincidencia de búsqueda individual dentro del proyecto.
 */
export interface SearchMatch {
  /** Ruta relativa del archivo donde se encontró la coincidencia */
  file: string;
  /** Número de línea (1-based) */
  line: number;
  /** Snippet o contenido de la línea coincidente */
  content: string;
}

/**
 * Busca patrones de texto o expresiones regulares dentro de los archivos del proyecto,
 * soportando filtros por extensión de archivo y subcarpeta.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param query Texto plano o expresión regular a buscar.
 * @param maxResults Número máximo de coincidencias a retornar (por defecto: 30).
 * @param useRegex Si es true, evalúa 'query' como una Expresión Regular.
 * @param fileExtensions Filtro opcional por extensiones (ej. ["ts", "js"] o "ts,tsx").
 * @param pathPattern Filtro opcional por ruta o subcarpeta (ej. "src/tools").
 * @returns Cadena formateada con la lista de coincidencias encontradas.
 */
export async function handleSearchCodebase(
  rootPath: string,
  query: string,
  maxResults: number = 30,
  useRegex: boolean = false,
  fileExtensions?: string[] | string,
  pathPattern?: string
): Promise<string> {
  // Validar que la consulta no esté vacía
  if (!query || query.trim().length === 0) {
    return "Search query cannot be empty.";
  }

  // Normalizar extensiones permitidas si fueron provistas
  let allowedExts: Set<string> | null = null;
  if (fileExtensions) {
    const rawList = Array.isArray(fileExtensions) ? fileExtensions : fileExtensions.split(",");
    const cleaned = rawList
      .map((ext) => ext.trim().toLowerCase())
      .filter(Boolean)
      .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
    if (cleaned.length > 0) {
      allowedExts = new Set(cleaned);
    }
  }

  const normalizedPathPattern = pathPattern ? normalizePath(pathPattern.trim().toLowerCase()) : null;

  // Cargar reglas de ignorado (.gitignore) y obtener la lista de archivos a examinar
  const ig = await getIgnoreInstanceAsync(rootPath);
  let entries = (await scanDirectoryAsync(rootPath, rootPath, ig, 6)).filter((e) => !e.isDir);

  // Aplicar filtros previos por extensión y ruta
  if (allowedExts) {
    entries = entries.filter((e) => allowedExts!.has(path.extname(e.relativePath).toLowerCase()));
  }

  if (normalizedPathPattern) {
    entries = entries.filter((e) => normalizePath(e.relativePath.toLowerCase()).includes(normalizedPathPattern));
  }

  const matches: SearchMatch[] = [];

  // Compilar la Expresión Regular si fue solicitada
  let searchRegex: RegExp | null = null;
  if (useRegex) {
    try {
      searchRegex = new RegExp(query, "i");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Invalid regular expression pattern "${query}": ${msg}`;
    }
  }

  const lowerQuery = query.toLowerCase();

  // Iterar de forma asincrónica sobre los archivos filtrados
  for (const entry of entries) {
    if (matches.length >= maxResults) break;
    
    // Omitir archivos sensibles o confidenciales (.env, llaves privadas, etc.)
    if (isSensitiveFile(entry.relativePath)) continue;

    const fullPath = path.join(rootPath, entry.relativePath);
    try {
      // Omitir archivos grandes (> 1.5MB) para evitar consumo excesivo de memoria
      if (entry.size !== undefined && entry.size > 1.5 * 1024 * 1024) continue;

      // Descartar archivos binarios rápidamente
      if (await isBinaryFileAsync(fullPath)) continue;

      const fileContent = await fs.readFile(fullPath, "utf-8");
      const lines = fileContent.replace(/\r\n/g, "\n").split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= maxResults) break;

        const lineText = lines[i];
        const isMatch = searchRegex ? searchRegex.test(lineText) : lineText.toLowerCase().includes(lowerQuery);

        if (isMatch) {
          // Truncar líneas excesivamente largas a un máximo de 200 caracteres
          const trimmedContent = lineText.trim();
          const displayContent = trimmedContent.length > 200 ? `${trimmedContent.slice(0, 200)}...` : trimmedContent;

          matches.push({
            file: entry.relativePath,
            line: i + 1,
            content: displayContent,
          });
        }
      }
    } catch {
      // Ignorar archivos inaccesibles o eliminados durante el escaneo
    }
  }

  if (matches.length === 0) {
    const filterInfo = [
      allowedExts ? `extensions: [${Array.from(allowedExts).join(", ")}]` : null,
      normalizedPathPattern ? `path: "${normalizedPathPattern}"` : null,
    ].filter(Boolean);

    const filterMsg = filterInfo.length > 0 ? ` with filters (${filterInfo.join(", ")})` : "";
    return `No matches found for query "${query}"${filterMsg}.`;
  }

  const formatted = matches.map((m) => `${m.file}:${m.line} -> ${m.content}`).join("\n");
  return `Found ${matches.length} matches for "${query}":\n\n${formatted}`;
}
