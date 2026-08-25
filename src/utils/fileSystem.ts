import fs from "fs/promises";
import path from "path";
import ignore, { Ignore } from "ignore";

/**
 * Lista por defecto de archivos y directorios sensibles o autogenerados
 * que siempre deben ser ignorados por seguridad y rendimiento.
 */
const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.id_rsa",
  "*.id_ed25519",
  "*.p12",
  "*.pfx",
  ".DS_Store",
  "coverage",
];

/**
 * Obtiene de forma asincrónica una instancia de la librería 'ignore' cargada
 * con las reglas por defecto y las reglas personalizadas del archivo .gitignore local.
 * 
 * @param rootPath Ruta raíz del repositorio del proyecto.
 * @returns Instancia de Ignore lista para validar rutas.
 */
export async function getIgnoreInstanceAsync(rootPath: string): Promise<Ignore> {
  const ig = ignore();
  ig.add(DEFAULT_IGNORES);

  const gitignorePath = path.join(rootPath, ".gitignore");
  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    ig.add(content);
  } catch {
    // Si no existe el archivo .gitignore se ignoran los errores de lectura
  }

  return ig;
}



/**
 * Valida si una ruta de archivo o directorio se encuentra estrictamente dentro
 * de la raíz del proyecto para evitar ataques de salto de directorio (Path Traversal).
 * 
 * @param rootPath Ruta absoluta de la raíz del repositorio.
 * @param relativeOrAbsolutePath Ruta relativa o absoluta solicitada por el usuario/IA.
 * @returns Objeto indicando si la ruta es segura y su ruta absoluta resuelta.
 */
export function isPathSafe(rootPath: string, relativeOrAbsolutePath: string): { safe: boolean; fullPath: string } {
  const resolvedRoot = path.resolve(rootPath);
  const fullPath = path.resolve(resolvedRoot, relativeOrAbsolutePath);
  const relative = path.relative(resolvedRoot, fullPath);

  // Denegar si la ruta resuelta empieza con '..' o es una ruta absoluta fuera de rootPath
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { safe: false, fullPath };
  }

  return { safe: true, fullPath };
}

/**
 * Determina si un nombre de archivo corresponde a un archivo sensible de credenciales,
 * llaves privadas o información confidencial que debe ser bloqueado por seguridad.
 * 
 * @param filename Nombre o ruta del archivo a evaluar.
 * @returns Verdadero si el archivo contiene credenciales o información sensible.
 */
export function isSensitiveFile(filename: string): boolean {
  const base = path.basename(filename).toLowerCase();
  
  // Bloquear archivos de variables de entorno (.env, .env.local, etc.)
  if (base.startsWith(".env")) return true;
  
  // Bloquear extensiones de llaves y certificados digitales
  if (
    base.endsWith(".pem") ||
    base.endsWith(".key") ||
    base.endsWith(".id_rsa") ||
    base.endsWith(".id_ed25519") ||
    base.endsWith(".p12") ||
    base.endsWith(".pfx")
  ) {
    return true;
  }
  
  // Bloquear nombres específicos de archivos de secretos y credenciales de nube
  if (
    base === "id_rsa" ||
    base === "id_ed25519" ||
    base === "id_dsa" ||
    base === "credentials.json" ||
    base === "secrets.json" ||
    base === "service-account.json" ||
    base === "service_account.json" ||
    base === ".htpasswd"
  ) {
    return true;
  }
  
  return false;
}

/**
 * Estructura que representa una entrada del sistema de archivos encontrada durante el escaneo.
 */
export interface FileEntry {
  /** Ruta relativa respecto a la raíz del repositorio */
  relativePath: string;
  /** Indica si la entrada es un directorio */
  isDir: boolean;
  /** Tamaño del archivo en bytes (opcional para directorios) */
  size?: number;
}

/**
 * Escanea recursivamente un directorio de forma asincrónica respetando las reglas de ignorado,
 * la profundidad máxima permitida y evitando bucles infinitos por enlaces simbólicos circulares.
 * 
 * @param dirPath Ruta del directorio actual a escanear.
 * @param rootPath Ruta raíz del repositorio del proyecto.
 * @param ig Instancia de Ignore con reglas activas de filtrado.
 * @param maxDepth Profundidad máxima recursiva permitida.
 * @param currentDepth Nivel de profundidad actual de la llamada recursiva.
 * @param visitedRealPaths Conjunto de rutas reales visitadas para prevenir bucles de symlinks.
 * @returns Lista de entradas de archivos y directorios encontrados.
 */
export async function scanDirectoryAsync(
  dirPath: string,
  rootPath: string,
  ig: Ignore,
  maxDepth: number = 5,
  currentDepth: number = 0,
  visitedRealPaths: Set<string> = new Set()
): Promise<FileEntry[]> {
  // Detener la recursión si alcanzamos el límite de profundidad
  if (currentDepth > maxDepth) return [];

  const results: FileEntry[] = [];
  try {
    // Resolver la ruta real física en disco para prevenir recursión por symlinks circulares
    let realDirPath: string;
    try {
      realDirPath = await fs.realpath(dirPath);
    } catch {
      return [];
    }

    // Evitar bucles en enlaces simbólicos que apunten a directorios ya procesados
    if (visitedRealPaths.has(realDirPath)) {
      return [];
    }
    visitedRealPaths.add(realDirPath);

    // Leer el contenido del directorio de forma no bloqueante
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (!relativePath) continue;

      // Validar enlaces simbólicos para evitar que apunten fuera de la raíz del proyecto
      if (entry.isSymbolicLink()) {
        try {
          const targetRealPath = await fs.realpath(fullPath);
          const { safe } = isPathSafe(rootPath, targetRealPath);
          if (!safe) continue;
        } catch {
          continue; // Ignorar enlaces simbólicos rotos
        }
      }

      let isDirectory = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try {
          const stat = await fs.stat(fullPath);
          isDirectory = stat.isDirectory();
        } catch {
          continue;
        }
      }

      // Evaluar la ruta en las reglas de ignorado (agregando '/' al final si es directorio)
      const ignoreCheckPath = isDirectory ? `${relativePath}/` : relativePath;
      if (ig.ignores(ignoreCheckPath)) continue;

      if (isDirectory) {
        results.push({ relativePath, isDir: true });
        const subResults = await scanDirectoryAsync(
          fullPath,
          rootPath,
          ig,
          maxDepth,
          currentDepth + 1,
          visitedRealPaths
        );
        results.push(...subResults);
      } else {
        let size: number | undefined;
        try {
          const stat = await fs.stat(fullPath);
          size = stat.size;
        } catch {
          // Ignorar errores de stat en archivos inaccesibles
        }
        results.push({ relativePath, isDir: false, size });
      }
    }
  } catch {
    // Ignorar directorios no legibles por permisos de usuario
  }

  return results;
}




