const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  await page.addInitScript(() => {
    window.messages = [];
    window.Genwork = { postMessage: (raw) => window.messages.push(JSON.parse(raw)) };
  });
  await page.goto(
    require("node:url").pathToFileURL(
      require("node:path").resolve(__dirname, "../assets/editor/index.html"),
    ).href,
  );
  page.on("pageerror", (e) => console.error(e));
  const fixture = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Plan de entrega" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Detalle importante", marks: [{ type: "bold" }] },
          {
            type: "text",
            text: " enlace",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "https://example.com",
                  target: "_blank",
                  rel: "noopener noreferrer nofollow",
                  class: null,
                },
              },
            ],
          },
        ],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Revisar" }] }],
          },
        ],
      },
      { type: "image", attrs: { src: "/api/attachments/fixture", alt: "Plano", title: null } },
    ],
  };
  await page.evaluate(
    (f) => nativeEditor.init({ content: f, editable: true, dark: false, scale: 1.5 }),
    fixture,
  );
  assert.equal(await page.locator("h2").textContent(), "Plan de entrega");
  assert.equal(await page.locator("strong").textContent(), "Detalle importante");
  assert.equal(await page.locator("a").getAttribute("href"), "https://example.com");
  assert.equal(await page.evaluate(() => messages.filter((m) => m.type === "change").length), 0);
  assert.equal(await page.evaluate(() => messages.some((m) => m.type === "unsupported")), false);
  await page.evaluate(() => nativeEditor.setEditable(false));
  assert.equal(await page.locator("[contenteditable=true]").count(), 0);
  await page.evaluate(() => nativeEditor.command("import", "No debe insertarse"));
  assert.equal(
    await page
      .locator("#editor")
      .textContent()
      .then((v) => v.includes("No debe insertarse")),
    false,
  );
  await page.evaluate(() => {
    nativeEditor.setEditable(true);
    nativeEditor.style(true, 1.5);
  });
  assert.equal(await page.locator("[contenteditable=true]").count(), 1);
  await page.evaluate(() =>
    nativeEditor.command(
      "import",
      "\n## Agregado\n\n| Columna | Valor |\n| --- | --- |\n| A \\| B | **OK** |\n",
    ),
  );
  assert.equal(await page.locator("h2").count(), 2);
  assert.equal(await page.locator("table").count(), 1);
  const changed = await page.evaluate(
    () => messages.filter((m) => m.type === "change").at(-1).data,
  );
  assert.equal(
    changed.content.find((n) => n.type === "image").attrs.src,
    "/api/attachments/fixture",
  );
  assert.ok(JSON.stringify(changed).includes('"bold"'));
  assert.ok(JSON.stringify(changed).includes("taskItem"));
  await page.evaluate(() => nativeEditor.command("export"));
  const markdown = await page.evaluate(
    () => messages.filter((m) => m.type === "markdown").at(-1).data,
  );
  assert.ok(markdown.includes("A \\| B"));
  assert.ok(markdown.includes("[enlace]") || markdown.includes("https://example.com"));
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.reload();
  await page.evaluate(() =>
    nativeEditor.init({
      content: { type: "doc", content: [{ type: "unknown", content: [] }] },
      editable: true,
      dark: true,
      scale: 1,
    }),
  );
  assert.equal(await page.evaluate(() => messages.some((m) => m.type === "unsupported")), true);
  assert.equal(await page.locator("[contenteditable=true]").count(), 0);
  console.log(
    "TipTap: formato, enlaces, listas, imágenes, import/export tablas, 360dp/1.5x y bloqueo de formato desconocido OK",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
