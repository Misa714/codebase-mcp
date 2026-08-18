import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs/promises";
import { isPathSafe, isSensitiveFile, getIgnoreInstanceAsync, normalizePath, isBinaryFileAsync } from "../src/utils/fileSystem.js";

describe("fileSystem utilities", () => {
  it("should validate path safety correctly", () => {
    const root = "/home/user/project";
    expect(isPathSafe(root, "src/index.ts").safe).toBe(true);
    expect(isPathSafe(root, "../outside.txt").safe).toBe(false);
    expect(isPathSafe(root, "../../etc/passwd").safe).toBe(false);
  });

  it("should normalize paths to use forward slashes", () => {
    expect(normalizePath("src\\tools\\tree.ts")).toBe("src/tools/tree.ts");
    expect(normalizePath("src/tools/tree.ts")).toBe("src/tools/tree.ts");
  });

  it("should detect sensitive credential files and patterns", () => {
    expect(isSensitiveFile(".env")).toBe(true);
    expect(isSensitiveFile(".env.production")).toBe(true);
    expect(isSensitiveFile("server.key")).toBe(true);
    expect(isSensitiveFile("id_rsa")).toBe(true);
    expect(isSensitiveFile("credentials.json")).toBe(true);
    expect(isSensitiveFile("secrets.json")).toBe(true);
    expect(isSensitiveFile("service_account.json")).toBe(true);
    expect(isSensitiveFile(".npmrc")).toBe(true);
    expect(isSensitiveFile(".pypirc")).toBe(true);
    expect(isSensitiveFile("keys.kdbx")).toBe(true);
    expect(isSensitiveFile("keystore.jks")).toBe(true);

    expect(isSensitiveFile("index.ts")).toBe(false);
    expect(isSensitiveFile("package.json")).toBe(false);
  });

  it("should create ignore instance with default ignores", async () => {
    const root = process.cwd();
    const ig = await getIgnoreInstanceAsync(root);
    expect(ig.ignores("node_modules/foo.js")).toBe(true);
    expect(ig.ignores(".git/config")).toBe(true);
    expect(ig.ignores(".env")).toBe(true);
    expect(ig.ignores("src/index.ts")).toBe(false);
  });

  it("should identify binary files vs text files correctly", async () => {
    const tempTextPath = path.join(process.cwd(), "tests", "temp_sample.txt");
    const tempBinPath = path.join(process.cwd(), "tests", "temp_sample.bin");

    await fs.writeFile(tempTextPath, "Hello world this is plain text\nSecond line");
    await fs.writeFile(tempBinPath, Buffer.from([0x00, 0x01, 0x02, 0x00, 0xff]));

    try {
      expect(await isBinaryFileAsync(tempTextPath)).toBe(false);
      expect(await isBinaryFileAsync(tempBinPath)).toBe(true);
    } finally {
      await fs.unlink(tempTextPath).catch(() => {});
      await fs.unlink(tempBinPath).catch(() => {});
    }
  });
});
