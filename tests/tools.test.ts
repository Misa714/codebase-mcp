import { describe, it, expect } from "vitest";
import { handleGetProjectTree } from "../src/tools/tree.js";
import { handleSearchCodebase } from "../src/tools/search.js";
import { handleReadProjectFile } from "../src/tools/reader.js";
import { handleInspectTechStack } from "../src/tools/techStack.js";

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

  it("handleSearchCodebase should find keyword matches", async () => {
    const result = await handleSearchCodebase(root, "handleGetProjectTree", 5);
    expect(result).toContain("matches for");
    expect(result).toContain("src/");
  });

  it("handleSearchCodebase with regex should match regex patterns", async () => {
    const result = await handleSearchCodebase(root, "handle[A-Z]\\w+", 5, true);
    expect(result).toContain("matches for");
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
});

