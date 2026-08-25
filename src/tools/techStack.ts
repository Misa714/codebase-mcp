import fs from "fs/promises";
import path from "path";

/**
 * Comprueba de forma asincrónica si un archivo existe en el sistema de archivos.
 * 
 * @param filePath Ruta del archivo a verificar.
 * @returns Verdadero si el archivo existe y es accesible.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Analiza el directorio raíz del proyecto buscando archivos clave de configuración
 * para generar un diagnóstico de las tecnologías, lenguaje, dependencias y contenedorización.
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @returns Diagnóstico detallado formateado en texto plano.
 */
export async function handleInspectTechStack(rootPath: string): Promise<string> {
  const findings: string[] = [`Tech Stack Analysis for: ${rootPath}\n`];

  // 1. Diagnóstico para Node.js / JavaScript / TypeScript (package.json)
  const pkgPath = path.join(rootPath, "package.json");
  if (await fileExists(pkgPath)) {
    try {
      const raw = await fs.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(raw);
      findings.push(`[Node.js] Project: ${pkg.name || "unnamed"} (v${pkg.version || "0.0.0"})`);
      if (pkg.description) findings.push(`  Description: ${pkg.description}`);

      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});

      if (deps.length > 0)
        findings.push(
          `  Key Dependencies (${deps.length}): ${deps.slice(0, 10).join(", ")}${deps.length > 10 ? "..." : ""}`
        );
      if (devDeps.length > 0)
        findings.push(
          `  Dev Dependencies (${devDeps.length}): ${devDeps.slice(0, 10).join(", ")}${
            devDeps.length > 10 ? "..." : ""
          }`
        );
      if (pkg.scripts) findings.push(`  Scripts: ${Object.keys(pkg.scripts).join(", ")}`);
    } catch {
      findings.push(`[Node.js] package.json found (corrupted or unparseable)`);
    }
  }

  // 2. Diagnóstico para Python (requirements.txt / pyproject.toml)
  const pyreq = path.join(rootPath, "requirements.txt");
  const pyproject = path.join(rootPath, "pyproject.toml");
  if ((await fileExists(pyreq)) || (await fileExists(pyproject))) {
    findings.push(`[Python] Project detected (requirements.txt / pyproject.toml present)`);
  }

  // 3. Diagnóstico para Go (go.mod)
  const gomod = path.join(rootPath, "go.mod");
  if (await fileExists(gomod)) {
    findings.push(`[Go] Project detected (go.mod present)`);
  }

  // 4. Diagnóstico para Rust (Cargo.toml)
  const cargo = path.join(rootPath, "Cargo.toml");
  if (await fileExists(cargo)) {
    findings.push(`[Rust] Project detected (Cargo.toml present)`);
  }

  // 5. Diagnóstico para Java / Kotlin (pom.xml / build.gradle)
  const pom = path.join(rootPath, "pom.xml");
  const gradle = path.join(rootPath, "build.gradle");
  const gradleKts = path.join(rootPath, "build.gradle.kts");
  if ((await fileExists(pom)) || (await fileExists(gradle)) || (await fileExists(gradleKts))) {
    findings.push(`[Java/Kotlin] Project detected (pom.xml / build.gradle present)`);
  }

  // 6. Diagnóstico para PHP (composer.json)
  const composer = path.join(rootPath, "composer.json");
  if (await fileExists(composer)) {
    findings.push(`[PHP] Project detected (composer.json present)`);
  }

  // 7. Diagnóstico para Ruby (Gemfile)
  const gemfile = path.join(rootPath, "Gemfile");
  if (await fileExists(gemfile)) {
    findings.push(`[Ruby] Project detected (Gemfile present)`);
  }

  // 8. Diagnóstico para Docker / Contenedores (Dockerfile / docker-compose)
  const dockerfile = path.join(rootPath, "Dockerfile");
  const dockerCompose = path.join(rootPath, "docker-compose.yml");
  const dockerComposeYaml = path.join(rootPath, "docker-compose.yaml");
  if ((await fileExists(dockerfile)) || (await fileExists(dockerCompose)) || (await fileExists(dockerComposeYaml))) {
    findings.push(`[Docker] Containerized project detected`);
  }

  // 9. Vista previa de la documentación (README.md)
  const readme = path.join(rootPath, "README.md");
  if (await fileExists(readme)) {
    try {
      const content = await fs.readFile(readme, "utf-8");
      const firstLines = content.split("\n").slice(0, 5).join("\n");
      findings.push(`\n[README] Overview:\n${firstLines}`);
    } catch {
      // Ignorar errores de lectura en README
    }
  }

  if (findings.length === 1) {
    return "No standard project configuration files (package.json, Cargo.toml, go.mod, etc.) were found in the root directory.";
  }

  return findings.join("\n");
}


