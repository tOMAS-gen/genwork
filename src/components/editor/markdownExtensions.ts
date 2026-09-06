import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TableKit, Table, renderTableToMarkdown } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";

// Tiptap 3.31 emits literal pipes in cells as column delimiters. Escape them
// before rendering the table so exporting/reimporting cannot drop cell text.
const MarkdownTable = Table.extend({
  renderMarkdown(node, helpers) {
    return renderTableToMarkdown(node, {
      ...helpers,
      renderChildren: (...args) =>
        helpers
          .renderChildren(...args)
          .replace(/\\.|\|/g, (match) => (match === "|" ? "\\|" : match)),
    });
  },
});

/** Shared schema so notes, documentation and .md files support the same blocks. */
export function markdownExtensions() {
  return [
    StarterKit.configure({ link: { openOnClick: false } }),
    Image,
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: false }),
    MarkdownTable.configure({ resizable: false, cellMinWidth: 120 }),
    Markdown.configure({ markedOptions: { gfm: true } }),
  ];
}
