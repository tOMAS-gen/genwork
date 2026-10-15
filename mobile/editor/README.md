# Editor local móvil

El WebView carga solamente `assets/editor/index.html` y el bundle local. Usa el
mismo esquema y serializador Markdown que la web (`markdownExtensions.ts`).
La app Flutter conserva el JSON original, autoguarda por revisiones y realiza
las solicitudes autenticadas. No se pasan tokens, cookies ni URLs arbitrarias
de la API al WebView. Imágenes privadas pasan por el repositorio; imágenes
externas HTTPS usan un cliente sin credenciales. CSP bloquea red y scripts inline.

Regenerar desde la raíz del repo, con las dependencias web instaladas:

```sh
npm ci
node mobile/editor/build.mjs
```

El bundle y las licencias se incluyen en Flutter, sin CDN. Regenerar cuando
cambie el esquema TipTap de la web. El test usa Playwright y Chrome instalado:

```sh
npm install --prefix .context/editor-qa playwright
NODE_PATH="$PWD/.context/editor-qa/node_modules" node mobile/editor/editor.test.cjs
```

Verifica formato, enlaces, listas de tareas, imágenes sin cambiar su URL,
importación por agregado, tabla con pipes escapados al exportar, ancho 360 px
con texto a 150 %, ausencia de guardado al cargar y bloqueo de contenido ajeno
al esquema. Los tests Flutter usan `richEditorBuilderProvider` para simular
el puente; no sustituyen esta prueba ni la verificación del WebView Android.
