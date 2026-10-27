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
// Material Symbols Outlined (Apache-2.0), los mismos que vendoriza @gen/ui:
// trazos SVG locales, sin fuente ni red (la CSP los bloquea).
const icons: Record<string, string[]> = {
  format_bold: [
    "M272-200v-560h221q65 0 120 40t55 111q0 51-23 78.5T602-491q25 11 55.5 41t30.5 90q0 89-65 124.5T501-200H272Zm121-112h104q48 0 58.5-24.5T566-372q0-11-10.5-35.5T494-432H393v120Zm0-228h93q33 0 48-17t15-38q0-24-17-39t-44-15h-95v109Z",
  ],
  format_italic: ["M200-200v-100h160l120-360H320v-100h400v100H580L460-300h140v100H200Z"],
  strikethrough_s: [
    "M486-160q-76 0-135-45t-85-123l88-38q14 48 48.5 79t85.5 31q42 0 76-20t34-64q0-18-7-33t-19-27h112q5 14 7.5 28.5T694-340q0 86-61.5 133T486-160ZM80-480v-80h800v80H80Zm402-326q66 0 115.5 32.5T674-674l-88 39q-9-29-33.5-52T484-710q-41 0-68 18.5T386-640h-96q2-69 54.5-117.5T482-806Z",
  ],
  title: ["M420-160v-520H200v-120h560v120H540v520H420Z"],
  format_list_bulleted: [
    "M360-200v-80h480v80H360Zm0-240v-80h480v80H360Zm0-240v-80h480v80H360ZM200-160q-33 0-56.5-23.5T120-240q0-33 23.5-56.5T200-320q33 0 56.5 23.5T280-240q0 33-23.5 56.5T200-160Zm0-240q-33 0-56.5-23.5T120-480q0-33 23.5-56.5T200-560q33 0 56.5 23.5T280-480q0 33-23.5 56.5T200-400Zm0-240q-33 0-56.5-23.5T120-720q0-33 23.5-56.5T200-800q33 0 56.5 23.5T280-720q0 33-23.5 56.5T200-640Z",
  ],
  format_list_numbered: [
    "M120-80v-60h100v-30h-60v-60h60v-30H120v-60h120q17 0 28.5 11.5T280-280v40q0 17-11.5 28.5T240-200q17 0 28.5 11.5T280-160v40q0 17-11.5 28.5T240-80H120Zm0-280v-110q0-17 11.5-28.5T160-510h60v-30H120v-60h120q17 0 28.5 11.5T280-560v70q0 17-11.5 28.5T240-450h-60v30h100v60H120Zm60-280v-180h-60v-60h120v240h-60Zm180 440v-80h480v80H360Zm0-240v-80h480v80H360Zm0-240v-80h480v80H360Z",
  ],
  checklist: [
    "M222-200 80-342l56-56 85 85 170-170 56 57-225 226Zm0-320L80-662l56-56 85 85 170-170 56 57-225 226Zm298 240v-80h360v80H520Zm0-320v-80h360v80H520Z",
  ],
  format_quote: [
    "m228-240 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T458-480L320-240h-92Zm360 0 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T818-480L680-240h-92ZM320-500q25 0 42.5-17.5T380-560q0-25-17.5-42.5T320-620q-25 0-42.5 17.5T260-560q0 25 17.5 42.5T320-500Zm360 0q25 0 42.5-17.5T740-560q0-25-17.5-42.5T680-620q-25 0-42.5 17.5T620-560q0 25 17.5 42.5T680-500Zm0-60Zm-360 0Z",
  ],
  code: [
    "M320-240 80-480l240-240 57 57-184 184 183 183-56 56Zm320 0-57-57 184-184-183-183 56-56 240 240-240 240Z",
  ],
  link: [
    "M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z",
  ],
  link_off: [
    "m770-302-60-62q40-11 65-42.5t25-73.5q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 57-29.5 105T770-302ZM634-440l-80-80h86v80h-6ZM792-56 56-792l56-56 736 736-56 56ZM440-280H280q-83 0-141.5-58.5T80-480q0-69 42-123t108-71l74 74h-24q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h65l79 80H320Z",
  ],
  table: [
    "M120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200Zm80-400h560v-160H200v160Zm213 200h134v-120H413v120Zm0 200h134v-120H413v120ZM200-400h133v-120H200v120Zm427 0h133v-120H627v120ZM200-200h133v-120H200v120Zm427 0h133v-120H627v120Z",
  ],
  horizontal_rule: ["M160-440v-80h640v80H160Z"],
  undo: [
    "M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z",
  ],
  redo: [
    "M396-200q-97 0-166.5-63T160-420q0-94 69.5-157T396-640h252L544-744l56-56 200 200-200 200-56-56 104-104H396q-63 0-109.5 40T240-420q0 60 46.5 100T396-280h284v80H396Z",
  ],
};
type Action = {
  label: string;
  icon?: string;
  text?: string;
  run: (e: Editor) => void;
  /** Marca o nodo que pinta el botón como activo. */
  active?: [string, Record<string, unknown>?];
  /** Solo se muestra con el cursor dentro de una tabla. */
  table?: boolean;
};
// Los ocho primeros entran en un teléfono de 360 dp; el resto queda a la
// derecha, en el desplazamiento horizontal (P16-M2).
const actions: Action[] = [
  {
    label: "Negrita",
    icon: "format_bold",
    active: ["bold"],
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    label: "Cursiva",
    icon: "format_italic",
    active: ["italic"],
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    label: "Tachado",
    icon: "strikethrough_s",
    active: ["strike"],
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    label: "Título",
    icon: "title",
    active: ["heading", { level: 2 }],
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Lista",
    icon: "format_list_bulleted",
    active: ["bulletList"],
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Lista numerada",
    icon: "format_list_numbered",
    active: ["orderedList"],
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Lista de tareas",
    icon: "checklist",
    active: ["taskList"],
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: "Cita",
    icon: "format_quote",
    active: ["blockquote"],
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Código",
    icon: "code",
    active: ["codeBlock"],
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  { label: "Enlace", icon: "link", active: ["link"], run: () => send("linkRequest") },
  { label: "Quitar enlace", icon: "link_off", run: (e) => e.chain().focus().unsetLink().run() },
  {
    label: "Tabla",
    icon: "table",
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(),
  },
  {
    label: "Agregar fila",
    text: "+ Fila",
    table: true,
    run: (e) => e.chain().focus().addRowAfter().run(),
  },
  {
    label: "Agregar columna",
    text: "+ Col.",
    table: true,
    run: (e) => e.chain().focus().addColumnAfter().run(),
  },
  {
    label: "Quitar fila",
    text: "− Fila",
    table: true,
    run: (e) => e.chain().focus().deleteRow().run(),
  },
  {
    label: "Quitar columna",
    text: "− Col.",
    table: true,
    run: (e) => e.chain().focus().deleteColumn().run(),
  },
  {
    label: "Eliminar tabla",
    text: "− Tabla",
    table: true,
    run: (e) => e.chain().focus().deleteTable().run(),
  },
  {
    label: "Separador",
    icon: "horizontal_rule",
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  { label: "Deshacer", icon: "undo", run: (e) => e.chain().focus().undo().run() },
  { label: "Rehacer", icon: "redo", run: (e) => e.chain().focus().redo().run() },
];
const SVG = "http://www.w3.org/2000/svg";
function iconElement(name: string) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 -960 960 960");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const d of icons[name]) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
const buttons: [HTMLButtonElement, Action][] = [];
// Activo en `brand` y acciones de tabla solo dentro de una tabla.
function refreshToolbar() {
  const inTable = editor.isActive("table");
  for (const [b, a] of buttons) {
    if (a.table) b.hidden = !inTable;
    if (a.active) b.setAttribute("aria-pressed", String(editor.isActive(...a.active)));
  }
}
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
    for (const action of actions) {
      const b = document.createElement("button");
      if (action.icon) b.append(iconElement(action.icon));
      else b.textContent = action.text!;
      b.title = action.label;
      b.setAttribute("aria-label", action.label);
      b.onpointerdown = (e) => e.preventDefault();
      b.onclick = () => action.run(editor);
      buttons.push([b, action]);
      bar.append(b);
    }
    refreshToolbar();
    editor.on("transaction", refreshToolbar);
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
