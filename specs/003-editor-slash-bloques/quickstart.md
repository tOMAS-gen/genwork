# Quickstart: validación del editor con menú slash (feature 003)

**Fecha**: 2026-07-03 | **Plan**: [plan.md](plan.md)

Valida sobre el sistema corriendo (features 001+002), en modo prueba local.

## Setup

```bash
docker compose -f deploy/docker-compose.dev.yml up -d
npm run dev      # http://localhost:3010
npm test         # incluye slash-items.test.ts
```

Entrar como "Admin de prueba", abrir un proyecto (o crear uno).

## Validación por user story

### US1 — Insertar un bloque con "/"

1. En el documento del proyecto, en una línea vacía, escribir `/`.
2. **Esperado**: aparece el menú flotante cerca del cursor con los bloques.
3. Elegir "Encabezado 1" → la línea se vuelve un encabezado grande listo para escribir.
4. Escribir `/`, presionar Esc → el menú se cierra, sin dejar comando.

### US2 — Filtrar el menú

1. Escribir `/enca` → el menú queda solo con los encabezados.
2. Flechas ↑/↓ para navegar, Enter inserta el resaltado.
3. `/xyz` (sin coincidencias) → estado "sin resultados", no inserta nada.

### US3 — Bloques básicos + imagen

1. Abrir el menú y verificar: Texto, Encabezado 1-4, Lista con viñetas, Imagen.
2. "Lista con viñetas" → crea una lista; "Texto" → párrafo normal.
3. "Imagen" → abre selector de archivo; al elegir, la imagen se sube y aparece en el documento.
4. Escribir `# ` al inicio de una línea → Encabezado 1 (atajo markdown sigue andando).

### US4 — Barra flotante inline

1. Seleccionar una palabra → aparece la barra flotante con Negrita/Cursiva.
2. Tocar Negrita → la palabra queda en negrita; deseleccionar → la barra desaparece.
3. Ctrl+B / `**texto**` → mismo resultado.
4. Abrir un proyecto archivado → seleccionar texto no muestra la barra (solo lectura).

### Convivencia (FR-209)

1. En el **input de tareas** (sección Tareas), escribir `/` → aparece el autocompletado de
   `/proyecto` (NO el menú de bloques). En el **documento**, `/` abre el menú de bloques. Nunca se
   confunden.

## Chequeo visual (design system)

- Íconos SVG Lucide en el menú y la barra; cero emojis.
- Menú aparece < 150 ms; foco/resaltado visible; navegación por teclado completa.
- Hoja limpia: sin barra de botones fija.

## Tests

```bash
npm test    # slash-items.test.ts (filtrado, sin resultados, acentos) + suite existente
```
