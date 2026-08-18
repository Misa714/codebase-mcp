import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Inspecciona el estado de control de versiones de Git en el proyecto local.
 * Retorna archivos modificados, staged, untracked y un resumen de las diferencias (diff).
 * 
 * @param rootPath Ruta absoluta de la raíz del proyecto.
 * @param includeDiff Si es true, incluye el diff textual de los cambios no confirmados.
 * @returns Resumen formateado del estado y cambios de Git.
 */
export async function handleGetGitChanges(rootPath: string, includeDiff: boolean = true): Promise<string> {
  try {
    // 1. Obtener status sucinto
    const { stdout: statusOut } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: rootPath,
      timeout: 5000,
    });

    if (!statusOut || statusOut.trim().length === 0) {
      return `Git Working Tree Clean: No uncommitted changes in ${rootPath}.`;
    }

    const lines = statusOut.trim().split("\n");
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filename = line.slice(3).trim();

      if (indexStatus === "?" && workTreeStatus === "?") {
        untracked.push(filename);
      } else {
        if (indexStatus !== " " && indexStatus !== "?") {
          staged.push(`[${indexStatus}] ${filename}`);
        }
        if (workTreeStatus !== " " && workTreeStatus !== "?") {
          modified.push(`[${workTreeStatus}] ${filename}`);
        }
      }
    }

    const sections: string[] = [
      `Git Changes Summary for: ${rootPath}\n`,
      `📊 Changed Files (${lines.length} total):`,
    ];

    if (staged.length > 0) {
      sections.push(`  Staged for commit (${staged.length}):`);
      staged.forEach((f) => sections.push(`    • ${f}`));
    }

    if (modified.length > 0) {
      sections.push(`  Modified in working directory (${modified.length}):`);
      modified.forEach((f) => sections.push(`    • ${f}`));
    }

    if (untracked.length > 0) {
      sections.push(`  Untracked files (${untracked.length}):`);
      untracked.slice(0, 10).forEach((f) => sections.push(`    • ${f}`));
      if (untracked.length > 10) {
        sections.push(`    ...and ${untracked.length - 10} more untracked files`);
      }
    }

    // 2. Incluir resumen del diff si fue solicitado
    if (includeDiff) {
      try {
        const { stdout: diffStat } = await execFileAsync("git", ["diff", "--stat"], {
          cwd: rootPath,
          timeout: 5000,
        });

        if (diffStat && diffStat.trim().length > 0) {
          sections.push(`\n📈 Diff Statistics:\n${diffStat.trim()}`);
        }

        const { stdout: diffOut } = await execFileAsync("git", ["diff", "--unified=3"], {
          cwd: rootPath,
          timeout: 5000,
        });

        if (diffOut && diffOut.trim().length > 0) {
          const maxDiffChars = 3000;
          const trimmedDiff = diffOut.length > maxDiffChars ? `${diffOut.slice(0, maxDiffChars)}\n\n[... Diff truncated for brevity]` : diffOut;
          sections.push(`\n📝 Uncommitted Code Diff:\n\`\`\`diff\n${trimmedDiff.trim()}\n\`\`\``);
        }
      } catch {
        // Ignorar errores en diff si git status funcionó
      }
    }

    return sections.join("\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not a git repository")) {
      return `Notice: "${rootPath}" is not a Git repository.`;
    }
    return `Error checking Git status: ${msg}`;
  }
}
