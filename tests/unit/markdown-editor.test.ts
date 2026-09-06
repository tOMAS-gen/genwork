import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { markdownExtensions } from "@/components/editor/markdownExtensions";

const example = `# Documentación

## Pasos

Texto **importante**, *cursiva*, ~~tachado~~ y \`código\`.

[Enlace](https://example.com)

- Uno
- Dos

1. Primero
2. Segundo

- [ ] Pendiente
- [x] Listo

> Una cita

\`\`\`js
const x = 1;
\`\`\`

---

| Nombre | Estado |
| --- | --- |
| Diseño | Listo |

![Diagrama](https://example.com/diagram.png)
`;

function create(content: string | object = example) {
  return new Editor({
    element: null,
    extensions: markdownExtensions(),
    content,
    ...(typeof content === "string" ? { contentType: "markdown" as const } : {}),
  });
}

describe("Markdown documents", () => {
  it("preserves standard blocks, GFM tables and formatting through JSON save/reload", () => {
    const editor = create();
    const json = editor.getJSON();
    expect(json.content?.map((n) => n.type)).toEqual(
      expect.arrayContaining([
        "heading",
        "paragraph",
        "bulletList",
        "orderedList",
        "taskList",
        "blockquote",
        "codeBlock",
        "horizontalRule",
        "table",
        "image",
      ]),
    );
    const reloaded = create(json);
    const markdown = reloaded.getMarkdown();
    for (const value of [
      "# Documentación",
      "**importante**",
      "*cursiva*",
      "~~tachado~~",
      "`código`",
      "[Enlace](https://example.com)",
      "- [x] Listo",
      "| Nombre | Estado |",
      "```js",
      "![Diagrama]",
    ]) {
      expect(markdown).toContain(value);
    }
    expect(markdown).toMatch(/\| Diseño\s+\| Listo\s+\|/);
    const roundtrip = create(markdown);
    expect(roundtrip.getJSON()).toEqual(json);
    editor.destroy();
    reloaded.destroy();
    roundtrip.destroy();
  });

  it("loads existing JSON documents without converting or dropping their content", () => {
    const existing = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Mi nota anterior", marks: [{ type: "bold" }] }],
        },
      ],
    };
    const editor = create(existing);
    expect(editor.getJSON()).toMatchObject(existing);
    expect(editor.getMarkdown()).toBe("**Mi nota anterior**");
    editor.destroy();
  });

  it("preserves table alignment, escaped pipes and inline marks", () => {
    const editor = create("| Columna | Valor |\n| :--- | ---: |\n| **A** | uno\\|dos |\n");
    const json = editor.getJSON();
    const roundtrip = create(editor.getMarkdown());
    expect(roundtrip.getJSON()).toEqual(json);
    editor.destroy();
    roundtrip.destroy();
  });
});
