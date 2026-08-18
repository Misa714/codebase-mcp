import { describe, it, expect } from "vitest";
import { handleGetProjectTree } from "../src/tools/tree.js";
import { handleSearchCodebase } from "../src/tools/search.js";
import { handleReadProjectFile } from "../src/tools/reader.js";
import { handleInspectTechStack } from "../src/tools/techStack.js";
import { handleGetFileOutline, extractSymbols } from "../src/tools/outline.js";

/**
 * Suite de pruebas unitarias para los manejadores de herramientas MCP.
 */
describe("MCP tool handlers", () => {
  const root = process.cwd();

  it("handleGetProjectTree should return ASCII tree string", async () => {
    const result = await handleGetProjectTree(root, 2);
    expect(result).toContain("Project Tree:");
    expect(result).toContain("src");
  });

  it("handleGetProjectTree with sub_path should inspect subfolder", async () => {
    const result = await handleGetProjectTree(root, 2, "src/tools");
    expect(result).toContain("Project Tree:");
    expect(result).toContain("outline.ts");
    expect(result).toContain("tree.ts");
  });

  it("handleSearchCodebase should find keyword matches", async () => {
    const result = await handleSearchCodebase(root, "handleGetProjectTree", 5);
    expect(result).toContain("matches for");
    expect(result).toContain("src/");
  });

  it("handleSearchCodebase with regex should match regex patterns", async () => {
    const result = await handleSearchCodebase(root, "handle[A-Z]\\w+", 5, true);
    expect(result).toContain("matches for");
  });

  it("handleSearchCodebase with file_extensions should filter files", async () => {
    const result = await handleSearchCodebase(root, "handleGetProjectTree", 10, false, ["ts"]);
    expect(result).toContain("matches for");
    expect(result).not.toContain(".md:");
  });

  it("handleSearchCodebase with path_pattern should filter by subfolder", async () => {
    const result = await handleSearchCodebase(root, "handleGetProjectTree", 10, false, undefined, "src/tools");
    expect(result).toContain("src/tools/tree.ts");
  });

  it("handleReadProjectFile should read specified lines safely", async () => {
    const result = await handleReadProjectFile(root, "package.json", 1, 5);
    expect(result).toContain("File: package.json");
    expect(result).toContain("714-mcp-tool");
  });

  it("handleReadProjectFile should block access to sensitive files", async () => {
    const result = await handleReadProjectFile(root, ".env");
    expect(result).toContain("Error: Access denied");
  });

  it("handleInspectTechStack should detect Node.js package setup", async () => {
    const result = await handleInspectTechStack(root);
    expect(result).toContain("[Node.js] Project: 714-mcp-tool");
    expect(result).toContain("Key Dependencies");
  });

  it("handleGetFileOutline should extract symbols from TypeScript files", async () => {
    const result = await handleGetFileOutline(root, "src/tools/tree.ts");
    expect(result).toContain("File Outline: src/tools/tree.ts");
    expect(result).toContain("handleGetProjectTree");
    expect(result).toContain("[function]");
  });

  it("handleGetFileOutline should extract headings from Markdown files", async () => {
    const result = await handleGetFileOutline(root, "README.md");
    expect(result).toContain("File Outline: README.md");
    expect(result).toContain("[h1]");
  });

  it("handleGetFileOutline should block sensitive files", async () => {
    const result = await handleGetFileOutline(root, ".env");
    expect(result).toContain("Error: Access denied");
  });

  it("extractSymbols should parse functions, classes and methods across languages", () => {
    const tsCode = `
      export interface User { id: string; }
      export class UserService {
        async getUser(id: string): Promise<User> { return { id }; }
      }
      export const helper = () => true;
    `;
    const symbols = extractSymbols(tsCode, ".ts");
    expect(symbols.some((s) => s.signature.includes("interface User"))).toBe(true);
    expect(symbols.some((s) => s.signature.includes("class UserService"))).toBe(true);
    expect(symbols.some((s) => s.signature.includes("getUser"))).toBe(true);
    expect(symbols.some((s) => s.signature.includes("helper"))).toBe(true);
  });
});
