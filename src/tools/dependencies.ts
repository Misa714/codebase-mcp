import fs from "fs/promises";
import path from "path";
import { isPathSafe, isSensitiveFile, getIgnoreInstanceAsync, scanDirectoryAsync, normalizePath, isBinaryFileAsync } from "../utils/fileSystem.js";

/**
 * Extrae las rutas y paquetes importados de un contenido de archivo de código.
 */
function extractImportSpecifiers(content: string, ext: string): string[] {
  const specifiers: string[] = [];
  const lines = content.split("\n");
  const lowerExt = ext.toLowerCase();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    // 1. JS / TS: import ... from "...", require("..."), export * from "...", import("...")
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(lowerExt)) {
      const importMatch = trimmed.match(/(?:import|export)\s+(?:.*?from\s+)?['"]([^'"]+)['"]/);
      if (importMatch && importMatch[1]) {
        specifiers.push(importMatch[1]);
        continue;
      }

      const requireMatch = trimmed.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
      if (requireMatch && requireMatch[1]) {
        specifiers.push(requireMatch[1]);
        continue;
      }

      const dynamicImportMatch = trimmed.match(/import\(\s*['"]([^'"]+)['"]\s*\)/);
      if (dynamicImportMatch && dynamicImportMatch[1]) {
        specifiers.push(dynamicImportMatch[1]);
        continue;
      }
    }

    // 2. Python: from ... import ..., import ...
    if (lowerExt === ".py") {
      const pyFrom = trimmed.match(/^from\s+([A-Za-z0-9_.]+)\s+import/);
      if (pyFrom && pyFrom[1]) {
        specifiers.push(pyFrom[1]);
        continue;
      }
      const pyImport = trimmed.match(/^import\s+([A-Za-z0-9_.]+)/);
      if (pyImport && pyImport[1]) {
        specifiers.push(pyImport[1]);
        continue;
      }
    }
  }

  return Array.from(new Set(specifiers));
}

/**
 * Normaliza y resuelve si un especificador de importación apunta a un archivo local del proyecto.
 */
function resolveLocalImport(fromFileRelative: string, specifier: string): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null; // Paquete de terceros o módulo built-in
  }

  const fromDir = path.dirname(fromFileRelative);
  const resolved = normalizePath(path.normalize(path.join(fromDir, specifier)));
  return resolved;
}

/**
 * Comprueba si dos rutas relativas corresponden al mismo módulo (ignorando extensiones .ts, .js, .tsx, .jsx).
 */
function isMatchingModule(pathA: string, pathB: string): boolean {
  const normA = normalizePath(pathA).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "");
  const normB = normalizePath(pathB).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "");
  return normA === normB || normA.endsWith(`/${normB}`) || normB.endsWith(`/${normA}`);
}

/**
 * Analiza las dependencias entrantes y salientes de un archivo del proyecto,
 * respondiendo qué módulos utiliza y qué otros archivos se verán afectados si se modifica.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param relativePath Ruta relativa del archivo a analizar.
 * @returns Diagnóstico estructurado de dependencias y análisis de impacto.
 */
export async function handleGetFileDependencies(rootPath: string, relativePath: string): Promise<string> {
  const { safe, fullPath } = isPathSafe(rootPath, relativePath);
  if (!safe) {
    return "Error: Cannot access files outside the project root directory.";
  }

  if (isSensitiveFile(relativePath)) {
    return "Error: Access denied. Sensitive credential files cannot be inspected.";
  }

  const ig = await getIgnoreInstanceAsync(rootPath);
  if (ig.ignores(relativePath)) {
    return "Error: File is ignored by .gitignore rules.";
  }

  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return `Error: "${relativePath}" is a directory. Specify a code file to analyze dependencies.`;
    }

    if (await isBinaryFileAsync(fullPath)) {
      return `Error: "${relativePath}" is a binary file.`;
    }

    // 1. Leer el archivo objetivo y extraer sus importaciones salientes
    const targetContent = await fs.readFile(fullPath, "utf-8");
    const targetExt = path.extname(relativePath);
    const rawImports = extractImportSpecifiers(targetContent, targetExt);

    const internalImports: string[] = [];
    const externalPackages: string[] = [];

    for (const spec of rawImports) {
      const local = resolveLocalImport(relativePath, spec);
      if (local) {
        internalImports.push(local);
      } else {
        externalPackages.push(spec);
      }
    }

    // 2. Escanear todos los archivos del proyecto para calcular el Impacto Inverso (Quién depende de este archivo)
    const allEntries = (await scanDirectoryAsync(rootPath, rootPath, ig, 6)).filter((e) => !e.isDir);
    const dependentFiles: { file: string; lineCount: number }[] = [];

    for (const entry of allEntries) {
      if (entry.relativePath === relativePath || isSensitiveFile(entry.relativePath)) continue;

      const ext = path.extname(entry.relativePath);
      if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"].includes(ext.toLowerCase())) continue;

      const otherFullPath = path.join(rootPath, entry.relativePath);
      try {
        if (await isBinaryFileAsync(otherFullPath)) continue;

        const otherContent = await fs.readFile(otherFullPath, "utf-8");
        const otherImports = extractImportSpecifiers(otherContent, ext);

        let isDependent = false;
        for (const imp of otherImports) {
          const resolved = resolveLocalImport(entry.relativePath, imp);
          if (resolved && isMatchingModule(resolved, relativePath)) {
            isDependent = true;
            break;
          }
        }

        if (isDependent) {
          const lines = otherContent.split("\n").length;
          dependentFiles.push({ file: entry.relativePath, lineCount: lines });
        }
      } catch {
        // Ignorar archivos no legibles
      }
    }

    // 3. Formatear reporte de salida
    const sections: string[] = [
      `Dependency & Impact Analysis for: ${relativePath}\n`,
      `📦 Outgoing Dependencies (What this file imports):`,
    ];

    if (internalImports.length > 0) {
      sections.push(`  Internal Project Files (${internalImports.length}):`);
      internalImports.forEach((imp) => sections.push(`    • ${imp}`));
    } else {
      sections.push(`  Internal Project Files: None`);
    }

    if (externalPackages.length > 0) {
      sections.push(`  External Packages / Libraries (${externalPackages.length}):`);
      externalPackages.forEach((pkg) => sections.push(`    • ${pkg}`));
    } else {
      sections.push(`  External Packages / Libraries: None`);
    }

    sections.push(`\n⚠️ Inbound Dependents / Impact Analysis (Files that will be affected if you modify this file):`);

    if (dependentFiles.length > 0) {
      sections.push(`  🚨 ${dependentFiles.length} file(s) in this project depend on "${relativePath}":`);
      dependentFiles.forEach((dep) => sections.push(`    • ${dep.file} (${dep.lineCount} lines)`));
      sections.push(`\n  Tip: Review these ${dependentFiles.length} dependent file(s) before applying breaking changes.`);
    } else {
      sections.push(`  ✅ No other files in the project currently import this file directly (isolated or entry point).`);
    }

    return sections.join("\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error analyzing dependencies for "${relativePath}": ${msg}`;
  }
}
