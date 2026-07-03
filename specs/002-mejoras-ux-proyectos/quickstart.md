# Quickstart: validación de las mejoras de experiencia (feature 002)

**Fecha**: 2026-07-02 | **Plan**: [plan.md](plan.md) | **Design system**: [MASTER.md](../../design-system/genwork/MASTER.md)

Valida las mejoras sobre el sistema ya corriendo (feature 001). Usa el **modo de prueba local**
(`DEV_AUTH=true`) para entrar sin Google.

## Setup

```bash
docker compose -f deploy/docker-compose.dev.yml up -d   # postgres + nextcloud
npx prisma migrate deploy                               # aplica la migración de description
npm run dev                                             # app en http://localhost:3010
npm test                                                # incluye multiline.test.ts
```

Entrar como "Admin de prueba".

## Validación por user story

### US1 — Terminología "Proyectos"

- Recorrer menú lateral, home, página de proyecto, sectores, grupos, admin y dashboard.
- **Esperado**: en ningún lado aparece "Trabajo/Trabajos" como nombre de la unidad; todo dice
  "Proyecto(s)". El símbolo `/` del etiquetado sigue igual.

### US2 — Crear proyecto con + y diálogo

1. En "Proyectos" (home), tocar el botón **+** (ícono Lucide).
2. En el diálogo: elegir ámbito (Para mí / grupo), nombre y descripción; confirmar.
3. **Esperado**: navega al proyecto; la descripción se ve bajo el título y en la tarjeta del
   listado. `Esc` o cancelar no crea nada. Nombre duplicado → error dentro del diálogo sin perder
   lo escrito.

### US3 — Página estilo Notion + bloc de notas

1. Entrar a un proyecto: título grande, descripción, documento fluido **sin cajas con borde**,
   sección "Tareas" al final.
2. Con el foco en la lista de tareas: escribir "Diseñar paneles", Enter; escribir "Comprar
   perfiles #Compras", Enter; escribir "Aprobar con cliente", Enter — **sin tocar el mouse**.
3. **Esperado**: 3 tareas creadas con casilla; la segunda queda etiquetada `#Compras`
   (autocompletado disponible mientras se escribe).
4. Pegar un bloque de 3 líneas (una vacía en el medio) en el input → se crean 2 tareas (la vacía
   se ignora).
5. Escribir en el documento y agregar una imagen → se integran en la hoja como documento.

### US4 — Menú ⋮

1. En la página del proyecto, abrir el menú **⋮** (ícono Lucide) junto al título.
2. **Esperado**: "Archivar…" (con la explicación del flujo) para activos; en uno archivado,
   descargar paquete y eliminación definitiva (con confirmación por nombre). Ya **no** hay bloque
   de archivado al pie de la página. El flujo de archivar/eliminar funciona igual que en la 001.

### US5 — Drawer con sublistas + navegación del board

1. En el menú lateral, expandir "Proyectos" → ver la lista; tocar uno → navega directo (ídem
   "Sectores"). Crear uno nuevo → aparece en la sublista sin recargar.
2. Entrar al **dashboard** como Admin/Miembro: usar la navegación compacta (menú plegado) para
   volver al home en ≤ 2 toques.
3. Entrar como **Lector**: el dashboard no muestra navegación (pantalla limpia de TV).

## Chequeo visual (design system)

- Íconos SVG (Lucide), cero emojis como íconos.
- Foco visible al navegar con teclado; contraste de texto ≥ 4.5:1.
- Transiciones 150-200ms; sin saltos de layout en hover.
- Responsive a 375 / 768 / 1024 / 1440; sin scroll horizontal en móvil.

## Tests

```bash
npm test    # multiline.test.ts (split de líneas, vacías, pegado) + suite existente de la 001
```
