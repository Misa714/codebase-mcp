import fs from "fs/promises";
import path from "path";
import { isPathSafe, isSensitiveFile, getIgnoreInstanceAsync, isBinaryFileAsync } from "../utils/fileSystem.js";

/**
 * Representa un símbolo extraído dentro del archivo.
 */
export interface SymbolEntry {
  /** Número de línea (1-based) */
  line: number;
  /** Tipo de símbolo (function, class, interface, method, heading, type, etc.) */
  kind: string;
  /** Declaración o firma del símbolo */
  signature: string;
}

/**
 * Extrae de forma estática los símbolos clave (funciones, clases, interfaces, tipos, encabezados)
 * de un archivo según su extensión de lenguaje.
 * 
 * @param content Contenido completo del archivo en texto.
 * @param ext Extensión del archivo (ej. '.ts', '.py', '.md').
 * @returns Lista de símbolos ordenados por número de línea.
 */
export function extractSymbols(content: string, ext: string): SymbolEntry[] {
  const lines = content.split("\n");
  const symbols: SymbolEntry[] = [];
  const lowerExt = ext.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    // Ignorar líneas vacías y comentarios de una sola línea al inicio
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") && lowerExt !== ".md" || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    // 1. Markdown: Encabezados (#, ##, ###)
    if (lowerExt === ".md" || lowerExt === ".markdown") {
      const headingMatch = rawLine.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        symbols.push({
          line: lineNum,
          kind: `h${level}`,
          signature: `${"#".repeat(level)} ${headingMatch[2].trim()}`,
        });
      }
      continue;
    }

    // 2. TypeScript / JavaScript (.ts, .tsx, .js, .jsx, .mjs, .cjs)
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(lowerExt)) {
      // Clases, Interfaces, Tipos, Enums
      const typeMatch = trimmed.match(/^(export\s+)?(default\s+)?(abstract\s+)?(class|interface|type|enum)\s+([A-Za-z0-9_$]+)/);
      if (typeMatch) {
        symbols.push({
          line: lineNum,
          kind: typeMatch[4],
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }

      // Funciones nombradas
      const funcMatch = trimmed.match(/^(export\s+)?(default\s+)?(async\s+)?function(\s*\*|\s+)?([A-Za-z0-9_$]+)?\s*\(/);
      if (funcMatch) {
        symbols.push({
          line: lineNum,
          kind: "function",
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }

      // Funciones asignadas a const/let/var (ej. export const myFn = () =>)
      const arrowMatch = trimmed.match(/^(export\s+)?(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(async\s*)?(\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/);
      if (arrowMatch) {
        symbols.push({
          line: lineNum,
          kind: "function",
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }

      // Métodos de clase o getters/setters
      const methodMatch = trimmed.match(/^(public|private|protected|static|async|override|get|set|\*)*\s*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(:\s*[^;{]+)?\s*\{/);
      if (methodMatch && !trimmed.startsWith("if") && !trimmed.startsWith("switch") && !trimmed.startsWith("for") && !trimmed.startsWith("while") && !trimmed.startsWith("catch")) {
        symbols.push({
          line: lineNum,
          kind: "method",
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }
    }

    // 3. Python (.py)
    if (lowerExt === ".py") {
      const pyClass = rawLine.match(/^class\s+([A-Za-z0-9_]+)(\(.*?\))?:/);
      if (pyClass) {
        symbols.push({
          line: lineNum,
          kind: "class",
          signature: trimmed.replace(/:$/, "").trim(),
        });
        continue;
      }

      const pyDef = rawLine.match(/^(\s*)(async\s+)?def\s+([A-Za-z0-9_]+)\s*\(/);
      if (pyDef) {
        const isMethod = pyDef[1].length > 0;
        symbols.push({
          line: lineNum,
          kind: isMethod ? "method" : "function",
          signature: trimmed.replace(/:$/, "").trim(),
        });
        continue;
      }
    }

    // 4. Go (.go)
    if (lowerExt === ".go") {
      const goFunc = trimmed.match(/^func\s*(\(.*?\)\s*)?([A-Za-z0-9_]+)\s*\(/);
      if (goFunc) {
        symbols.push({
          line: lineNum,
          kind: goFunc[1] ? "method" : "function",
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }

      const goType = trimmed.match(/^type\s+([A-Za-z0-9_]+)\s+(struct|interface)/);
      if (goType) {
        symbols.push({
          line: lineNum,
          kind: goType[2],
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }
    }

    // 5. Rust (.rs)
    if (lowerExt === ".rs") {
      const rustDecl = trimmed.match(/^(pub(\(.*?\))?\s+)?(async\s+)?(fn|struct|enum|trait|impl|type)\s+([A-Za-z0-9_]+)/);
      if (rustDecl) {
        symbols.push({
          line: lineNum,
          kind: rustDecl[4],
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }
    }

    // 6. Java / Kotlin / C# / PHP / C++ (Patrones genéricos de clases y funciones)
    if ([".java", ".kt", ".cs", ".php", ".cpp", ".c", ".h"].includes(lowerExt)) {
      const genericClass = trimmed.match(/^(public|protected|private|class|interface|trait|enum|struct)\b.*?\b(class|interface|trait|enum|struct)\s+([A-Za-z0-9_]+)/);
      if (genericClass) {
        symbols.push({
          line: lineNum,
          kind: genericClass[2],
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }

      const genericFunc = trimmed.match(/^(public|protected|private|static|async|function)?\s*([A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/);
      if (genericFunc && !trimmed.startsWith("if") && !trimmed.startsWith("for") && !trimmed.startsWith("while")) {
        symbols.push({
          line: lineNum,
          kind: "function",
          signature: trimmed.replace(/\{.*$/, "").trim(),
        });
        continue;
      }
    }
  }

  return symbols;
}

/**
 * Extrae el esquema de símbolos (funciones, clases, interfaces, métodos) de un archivo
 * del proyecto sin tener que transferir el contenido completo del archivo al modelo de IA.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param relativePath Ruta relativa del archivo a inspeccionar.
 * @returns Esquema estructurado y numerado con las declaraciones encontradas.
 */
export async function handleGetFileOutline(rootPath: string, relativePath: string): Promise<string> {
  // 1. Validar seguridad contra Path Traversal
  const { safe, fullPath } = isPathSafe(rootPath, relativePath);
  if (!safe) {
    return "Error: Cannot access files outside the project root directory.";
  }

  // 2. Bloquear archivos confidenciales
  if (isSensitiveFile(relativePath)) {
    return "Error: Access denied. Sensitive credential files cannot be inspected.";
  }

  // 3. Respetar .gitignore
  const ig = await getIgnoreInstanceAsync(rootPath);
  if (ig.ignores(relativePath)) {
    return "Error: File is ignored by .gitignore rules.";
  }

  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return `Error: "${relativePath}" is a directory. Use get_project_tree to view folder contents.`;
    }

    if (stats.size > 2 * 1024 * 1024) {
      return `Error: File "${relativePath}" is too large (>2MB) for outline analysis.`;
    }

    // 4. Comprobar si es un archivo binario
    if (await isBinaryFileAsync(fullPath)) {
      return `Error: File "${relativePath}" is a binary file. Outline cannot be extracted.`;
    }

    const content = await fs.readFile(fullPath, "utf-8");
    const lines = content.split("\n");
    const ext = path.extname(relativePath);

    const symbols = extractSymbols(content, ext);

    if (symbols.length === 0) {
      return `File Outline: ${relativePath} (${lines.length} lines)\n\nNo top-level functions, classes, or symbols detected. You can read the raw contents with 'read_project_file'.`;
    }

    const rows = symbols.map((s) => {
      const lineTag = `L${s.line}`.padEnd(5, " ");
      const kindTag = `[${s.kind}]`.padEnd(11, " ");
      const displaySig = s.signature.length > 120 ? `${s.signature.slice(0, 120)}...` : s.signature;
      return `${lineTag} | ${kindTag} ${displaySig}`;
    });

    return `File Outline: ${relativePath} (${lines.length} lines, ${symbols.length} symbols found)\n\nLine  | Kind        Declaration\n------|---------------------------------------------------------\n${rows.join("\n")}`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT")) {
      return `Error: File "${relativePath}" does not exist.`;
    }
    return `Error generating file outline: ${msg}`;
  }
}
