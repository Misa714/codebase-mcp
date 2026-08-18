import fs from "fs/promises";
import path from "path";
import MiniSearch from "minisearch";
import { getIgnoreInstanceAsync, scanDirectoryAsync, isSensitiveFile, isBinaryFileAsync, normalizePath } from "../utils/fileSystem.js";
import { extractSymbols } from "./outline.js";

/**
 * Estructura de documento indexable para el motor MiniSearch.
 */
interface CodeDocument {
  id: string;
  file: string;
  symbols: string;
  content: string;
  ext: string;
  lineCount: number;
}

/**
 * Coincidencia de búsqueda híbrida ranqueada.
 */
export interface HybridSearchResult {
  file: string;
  score: number;
  matchingLines: { line: number; text: string }[];
  matchedSymbols: string[];
}

/**
 * Construye un índice MiniSearch en memoria para los archivos del proyecto.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param fileExtensions Filtro opcional por extensiones.
 * @param pathPattern Filtro opcional por subcarpeta.
 */
async function buildProjectIndex(
  rootPath: string,
  fileExtensions?: string[] | string,
  pathPattern?: string
): Promise<{ miniSearch: MiniSearch<CodeDocument>; documents: Map<string, CodeDocument> }> {
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

  const ig = await getIgnoreInstanceAsync(rootPath);
  let entries = (await scanDirectoryAsync(rootPath, rootPath, ig, 6)).filter((e) => !e.isDir);

  if (allowedExts) {
    entries = entries.filter((e) => allowedExts!.has(path.extname(e.relativePath).toLowerCase()));
  }

  if (normalizedPathPattern) {
    entries = entries.filter((e) => normalizePath(e.relativePath.toLowerCase()).includes(normalizedPathPattern));
  }

  const miniSearch = new MiniSearch<CodeDocument>({
    fields: ["symbols", "file", "content"],
    storeFields: ["file", "ext", "lineCount"],
    searchOptions: {
      boost: { symbols: 3.0, file: 2.0, content: 1.0 },
      prefix: true,
      fuzzy: 0.2,
      weights: { fuzzy: 0.3, prefix: 0.7 },
    },
  });

  const docsMap = new Map<string, CodeDocument>();
  const docsList: CodeDocument[] = [];

  for (const entry of entries) {
    if (isSensitiveFile(entry.relativePath)) continue;

    const fullPath = path.join(rootPath, entry.relativePath);
    try {
      if (entry.size !== undefined && entry.size > 1.5 * 1024 * 1024) continue;
      if (await isBinaryFileAsync(fullPath)) continue;

      const rawContent = await fs.readFile(fullPath, "utf-8");
      const ext = path.extname(entry.relativePath);
      const symbols = extractSymbols(rawContent, ext);
      const symbolNames = symbols.map((s) => s.signature).join(" ");
      const lines = rawContent.split("\n");

      const doc: CodeDocument = {
        id: entry.relativePath,
        file: entry.relativePath,
        symbols: symbolNames,
        content: rawContent,
        ext,
        lineCount: lines.length,
      };

      docsMap.set(entry.relativePath, doc);
      docsList.push(doc);
    } catch {
      // Ignorar archivos no legibles
    }
  }

  miniSearch.addAll(docsList);
  return { miniSearch, documents: docsMap };
}

/**
 * Realiza una búsqueda híbrida (BM25 + Coincidencia Difusa + Símbolos) sobre el código del proyecto.
 * Permite encontrar funciones y archivos tanto por nombres exactos como por conceptos en lenguaje natural.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param query Consulta en lenguaje natural, nombre de función o término técnico.
 * @param maxResults Número máximo de archivos a retornar (por defecto: 10).
 * @param fileExtensions Filtro opcional por extensiones (ej. ["ts", "py"]).
 * @param pathPattern Filtro opcional por subcarpeta (ej. "src/tools").
 * @returns Reporte de búsqueda ranqueado con porcentajes de relevancia y líneas clave.
 */
export async function handleSearchHybrid(
  rootPath: string,
  query: string,
  maxResults: number = 10,
  fileExtensions?: string[] | string,
  pathPattern?: string
): Promise<string> {
  if (!query || query.trim().length === 0) {
    return "Search query cannot be empty.";
  }

  const trimmedQuery = query.trim();
  const { miniSearch, documents } = await buildProjectIndex(rootPath, fileExtensions, pathPattern);

  if (documents.size === 0) {
    return "No indexable code files found matching the criteria.";
  }

  // Realizar búsqueda con algoritmo de ranqueo BM25
  const rawResults = miniSearch.search(trimmedQuery, {
    fuzzy: (term) => (term.length > 3 ? 0.2 : false),
    prefix: true,
    combineWith: "OR",
  });

  if (rawResults.length === 0) {
    return `No matching code or symbols found for query "${query}". Try with broader terms or inspect the project tree.`;
  }

  const queryTerms = trimmedQuery.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const maxScore = rawResults[0]?.score || 1;

  const formattedResults: string[] = [
    `Hybrid Search Results (BM25 + Semantic Ranking) for: "${query}"\n`
  ];

  const topResults = rawResults.slice(0, maxResults);

  for (const res of topResults) {
    const doc = documents.get(res.id);
    if (!doc) continue;

    const relevancePct = Math.min(100, Math.round((res.score / maxScore) * 100));
    const lines = doc.content.split("\n");
    const matchingLines: { line: number; text: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      const hasMatch = queryTerms.some((term) => lineLower.includes(term));
      if (hasMatch) {
        const trimmed = lines[i].trim();
        const display = trimmed.length > 120 ? `${trimmed.slice(0, 120)}...` : trimmed;
        matchingLines.push({ line: i + 1, text: display });
        if (matchingLines.length >= 3) break; // Máximo 3 snippets por archivo
      }
    }

    formattedResults.push(`📄 [${relevancePct}% Match] ${doc.file} (${doc.lineCount} lines)`);
    if (doc.symbols) {
      const symbolSnippets = doc.symbols.split(" ").slice(0, 8).join(" ");
      formattedResults.push(`   Symbols: ${symbolSnippets}...`);
    }

    if (matchingLines.length > 0) {
      formattedResults.push(`   Key Lines:`);
      matchingLines.forEach((m) => {
        formattedResults.push(`     L${m.line} | ${m.text}`);
      });
    }
    formattedResults.push("");
  }

  return formattedResults.join("\n").trim();
}
