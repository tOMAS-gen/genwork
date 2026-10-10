import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { markdownExtensions } from "../../src/components/editor/markdownExtensions";

const send = (type: string, data: unknown = null) =>
  (window as any).Genwork.postMessage(JSON.stringify({ type, data }));
let editor: Editor;
let locked = false;
let imageId = 0;
const images = new Map<string, HTMLImageElement>();
// Images are fetched by native code. Document URLs remain unchanged in JSON.
const NativeImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("img");
      dom.alt = node.attrs.alt || "Imagen del documento";
      const id = String(++imageId);
      images.set(id, dom);
      send("image", { id, src: node.attrs.src });
      return { dom, destroy: () => images.delete(id) };
    };
  },
});
const actions: [string, string, (e: Editor) => void][] = [
  ["Negrita", "B", (e) => e.chain().focus().toggleBold().run()],
  ["Cursiva", "I", (e) => e.chain().focus().toggleItalic().run()],
  ["Tachado", "S", (e) => e.chain().focus().toggleStrike().run()],
  ["Título", "H", (e) => e.chain().focus().toggleHeading({ level: 2 }).run()],
  ["Lista", "•", (e) => e.chain().focus().toggleBulletList().run()],
  ["Lista numerada", "1.", (e) => e.chain().focus().toggleOrderedList().run()],
  ["Lista de tareas", "☑", (e) => e.chain().focus().toggleTaskList().run()],
  ["Cita", "❞", (e) => e.chain().focus().toggleBlockquote().run()],
  ["Código", "<>", (e) => e.chain().focus().toggleCodeBlock().run()],
  ["Enlace", "↗", () => send("linkRequest")],
  ["Quitar enlace", "↙", (e) => e.chain().focus().unsetLink().run()],
  [
    "Tabla",
    "▦",
    (e) => e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(),
  ],
  ["Agregar fila", "+ Fila", (e) => e.chain().focus().addRowAfter().run()],
  ["Agregar columna", "+ Col.", (e) => e.chain().focus().addColumnAfter().run()],
  ["Quitar fila", "− Fila", (e) => e.chain().focus().deleteRow().run()],
  ["Quitar columna", "− Col.", (e) => e.chain().focus().deleteColumn().run()],
  ["Eliminar tabla", "− Tabla", (e) => e.chain().focus().deleteTable().run()],
  ["Separador", "—", (e) => e.chain().focus().setHorizontalRule().run()],
  ["Deshacer", "↶", (e) => e.chain().focus().undo().run()],
  ["Rehacer", "↷", (e) => e.chain().focus().redo().run()],
];
function supported(node: any): boolean {
  const type = editor.schema.nodes[node.type];
  if (!type || Object.keys(node.attrs || {}).some((k) => !(k in (type.spec.attrs || {}))))
    return false;
  if (
    (node.marks || []).some(
      (m: any) =>
        !editor.schema.marks[m.type] ||
        Object.keys(m.attrs || {}).some(
          (k) => !(k in (editor.schema.marks[m.type].spec.attrs || {})),
        ),
    )
  )
    return false;
  return (node.content || []).every(supported);
}
(window as any).nativeEditor = {
  init({ content, editable, dark, scale }: any) {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.style.fontSize = `${16 * scale}px`;
    editor = new Editor({
      element: document.querySelector("#editor")!,
      extensions: [
        ...markdownExtensions()
          .filter((e) => e.name !== "image")
          .map((e) =>
            e.name === "taskItem"
              ? e.configure({
                  a11y: {
                    checkboxLabel: (node: any, checked: boolean) =>
                      `${checked ? "Completada" : "Pendiente"}: ${node.textContent || "Tarea"}`,
                  },
                })
              : e,
          ),
        NativeImage,
      ],
      editable: false,
      editorProps: {
        attributes: {
          "aria-label": "Contenido del documento",
          role: "textbox",
          "aria-multiline": "true",
        },
        handleClick: (_v, _p, event) => {
          const a = (event.target as HTMLElement).closest("a");
          if (a && !editor.isEditable) {
            send("openLink", a.getAttribute("href"));
            return true;
          }
          return false;
        },
      },
      onUpdate: () => {
        if (!locked) send("change", editor.getJSON());
      },
    });
    const doc = content || { type: "doc", content: [{ type: "paragraph" }] };
    try {
      locked = !supported(doc);
      editor.commands.setContent(doc, { emitUpdate: false, errorOnInvalidContent: true });
    } catch {
      locked = true;
    }
    if (locked) {
      send("unsupported");
      document.querySelector("#warning")!.textContent =
        "Este documento contiene un formato no compatible. El original se conserva; editá desde la web.";
    }
    editor.setEditable(editable && !locked, false);
    const bar = document.querySelector("#toolbar")!;
    (bar as HTMLElement).hidden = !editable || locked;
    for (const [label, text, action] of actions) {
      const b = document.createElement("button");
      b.textContent = text;
      b.title = label;
      b.setAttribute("aria-label", label);
      b.onpointerdown = (e) => e.preventDefault();
      b.onclick = () => action(editor);
      bar.append(b);
    }
    send("ready");
  },
  setEditable(value: boolean) {
    editor.setEditable(value && !locked, false);
    (document.querySelector("#toolbar") as HTMLElement).hidden = !value || locked;
  },
  style(dark: boolean, scale: number) {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.style.fontSize = `${16 * scale}px`;
  },
  command(name: string, value: any) {
    if (name === "export") {
      send("markdown", editor.getMarkdown());
      return;
    }
    if (!editor.isEditable || locked) return;
    if (name === "import")
      editor
        .chain()
        .focus("end")
        .insertContentAt(editor.state.doc.content.size, value, { contentType: "markdown" })
        .run();
    if (name === "image") editor.chain().focus().setImage({ src: value }).run();
    if (name === "link") editor.chain().focus().setLink({ href: value }).run();
  },
  image(id: string, uri: string) {
    const img = images.get(id);
    if (img) img.src = uri;
  },
};
send("loaded");
