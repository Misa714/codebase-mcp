# Resumen y Guía Completa de la Sesión: 714-mcp-tool

Este archivo contiene el registro de la publicación final para LinkedIn, la guía de configuración en Antigravity/Cursor/Claude y los conceptos técnicos aprendidos sobre el protocolo MCP.

---

## 📝 Publicación Final para LinkedIn

```text
Estuve estos días estudiando sobre el protocolo MCP (Model Context Protocol) de Anthropic y quise armar un proyecto propio para entender bien de qué se trata todo esto.

Para explicarlo de una manera muy sencilla, el MCP es un estándar que permite que los asistentes de IA (como Claude o Cursor) se conecten de forma estandarizada a herramientas, archivos y servicios. En el caso de herramientas locales, pueden interactuar con carpetas y programas de nuestra computadora sin necesidad de subir la información a la nube.

Desarrollé un servidor pequeño en TypeScript llamado 714-mcp-tool, lo armé al notar cómo muchas personas caen en un hábito poco eficiente: copiar y pegar archivos manualmente en la ventana del chat para darle contexto a la IA, terminando por convertirse en una especie de "secretario" del asistente (algo que probablemente todos hemos hecho alguna vez).

Con este servidor MCP, la IA puede convertirse en su propio investigador: en lugar de recibir archivos manualmente, puede consultar herramientas y carpetas locales autorizadas, encontrar la información relevante en segundos y trabajar únicamente con los datos necesarios. Además, mediante permisos y restricciones, se puede controlar qué archivos puede consultar, evitando que acceda a información sensible como credenciales o archivos .env.

Sirve para conectar proyectos de código o carpetas locales (incluso notas de Obsidian) a clientes como Claude Desktop, Cursor, Windsurf o VS Code.

No soy experto en nada, pero sí un aprendiz de todo y la verdad armé esto principalmente para mí, para estudiar, experimentar y aprender construyendo, pero lo comparto por si a alguien más le sirve para probarlo o mirar el código:

📦 npm: https://www.npmjs.com/package/714-mcp-tool
🔗 GitHub: https://github.com/Misa714/codebase-mcp

Sigo aprendiendo día a día sobre todo este mundo, así que cualquier crítica constructiva, sugerencia o consejo me ayuda un montón para seguir mejorando. ¡Gracias por leer!

#LearningByDoing #ModelContextProtocol #TypeScript #OpenSource #DevTools #AI #NodeJS #Claude #Cursor
```

---

## ⚙️ Configuración en Antigravity / Cursor / Claude Desktop

Para consumir el paquete publicado en `npm` de forma global:

```json
{
  "mcpServers": {
    "714-mcp-tool": {
      "command": "npx",
      "args": [
        "-y",
        "714-mcp-tool"
      ]
    }
  }
}
```

Para conectarlo a una carpeta específica (ej. Obsidian):

```json
{
  "mcpServers": {
    "714-mcp-tool": {
      "command": "npx",
      "args": [
        "-y",
        "714-mcp-tool",
        "--path",
        "/ruta/a/tu/carpeta-o-obsidian"
      ]
    }
  }
}
```

---

## 💡 Conceptos Fundamentales de MCP

1. **Cliente vs Servidor:**
   - **Cliente:** Antigravity, Claude Code, Cursor, Claude Desktop, Windsurf, VS Code (Cline/Continue).
   - **Servidor:** `714-mcp-tool` (Servidor local de herramientas de sistema de archivos en TypeScript).
2. **Agnóstico del Modelo:** Funciona con Gemini, Claude, GPT-4, Llama, DeepSeek o cualquier modelo compatible con Function Calling.
3. **Seguridad y Privacidad (Local-First):**
   - Ejecución 100% local en la máquina (vía STDIO).
   - Protección contra Path Traversal (`../../`).
   - Bloqueo automático de archivos sensibles (`.env`, `.pem`, `id_rsa`, `credentials.json`, `secrets.json`).
