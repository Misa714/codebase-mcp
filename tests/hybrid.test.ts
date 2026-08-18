import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs/promises";
import { handleSearchHybrid } from "../src/tools/hybridSearch.js";
import { handleApplyFilePatch } from "../src/tools/patch.js";

describe("Hybrid Search and Safe Patching (v2.0.0)", () => {
  const root = process.cwd();

  it("handleSearchHybrid should rank results using BM25 relevance", async () => {
    const result = await handleSearchHybrid(root, "handleGetProjectTree");
    expect(result).toContain("Hybrid Search Results");
    expect(result).toContain("Match]");
    expect(result).toContain("src/tools/tree.ts");
  });

  it("handleSearchHybrid should find code by natural language query", async () => {
    const result = await handleSearchHybrid(root, "archivos sensibles o credenciales");
    expect(result).toContain("fileSystem.ts");
  });

  it("handleSearchHybrid should filter by extension", async () => {
    const result = await handleSearchHybrid(root, "handleGetProjectTree", 5, ["ts"]);
    expect(result).toContain(".ts");
  });

  it("handleApplyFilePatch should safely patch existing content and verify integrity", async () => {
    const testFile = path.join(root, "tests", "temp_patch_test.txt");
    await fs.writeFile(testFile, "line 1\nold_value_to_change\nline 3", "utf-8");

    try {
      // 1. Reemplazo exitoso
      const patchRes = await handleApplyFilePatch(root, "tests/temp_patch_test.txt", "old_value_to_change", "new_patched_value");
      expect(patchRes).toContain("Successfully patched");

      const updated = await fs.readFile(testFile, "utf-8");
      expect(updated).toContain("new_patched_value");
      expect(updated).not.toContain("old_value_to_change");

      // 2. Error si no coincide el bloque
      const failRes = await handleApplyFilePatch(root, "tests/temp_patch_test.txt", "non_existent_text", "whatever");
      expect(failRes).toContain("Error: Target content was not found");
    } finally {
      await fs.unlink(testFile).catch(() => {});
    }
  });

  it("handleApplyFilePatch should handle Windows CRLF line endings transparently", async () => {
    const testFile = path.join(root, "tests", "temp_crlf_test.txt");
    // Archivo creado explícitamente con CRLF
    await fs.writeFile(testFile, "line 1\r\nold_crlf_value\r\nline 3", "utf-8");

    try {
      // IA envía target con LF estándar \n
      const patchRes = await handleApplyFilePatch(root, "tests/temp_crlf_test.txt", "old_crlf_value", "new_crlf_value");
      expect(patchRes).toContain("Successfully patched");

      const updated = await fs.readFile(testFile, "utf-8");
      expect(updated).toContain("new_crlf_value");
      expect(updated).toContain("\r\n"); // Preserva CRLF original
    } finally {
      await fs.unlink(testFile).catch(() => {});
    }
  });

  it("handleApplyFilePatch should block sensitive files", async () => {
    const res = await handleApplyFilePatch(root, ".env", "A=1", "A=2");
    expect(res).toContain("Error: Access denied");
  });
});
