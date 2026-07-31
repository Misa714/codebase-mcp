import { describe, it, expect } from "vitest";
import path from "path";
import { isPathSafe, isSensitiveFile, getIgnoreInstanceAsync } from "../src/utils/fileSystem.js";

describe("fileSystem utilities", () => {
  it("should validate path safety correctly", () => {
    const root = "/home/user/project";
    expect(isPathSafe(root, "src/index.ts").safe).toBe(true);
    expect(isPathSafe(root, "../outside.txt").safe).toBe(false);
    expect(isPathSafe(root, "../../etc/passwd").safe).toBe(false);
  });

  it("should detect sensitive credential files", () => {
    expect(isSensitiveFile(".env")).toBe(true);
    expect(isSensitiveFile(".env.production")).toBe(true);
    expect(isSensitiveFile("server.key")).toBe(true);
    expect(isSensitiveFile("id_rsa")).toBe(true);
    expect(isSensitiveFile("credentials.json")).toBe(true);
    expect(isSensitiveFile("secrets.json")).toBe(true);
    expect(isSensitiveFile("service_account.json")).toBe(true);

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
});
