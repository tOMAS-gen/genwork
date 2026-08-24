# Research — 060 Sectores agrupados por ámbito

Decisiones no obvias que se tomaron durante el plan, con lo que se descartó y por qué.

---

## R-001 — No se crea un `Accordion` genérico en `src/components/ui/`

**Decisión**: se comparte solo el *contenido* del encabezado (`SectorSectionHeader.tsx`), y cada
modo de vista aporta su propio elemento contenedor.

**Alternativa descartada**: un `<Accordion>` reutilizable en `src/components/ui/`.

**Por qué**: no se puede intercalar un `<div>` entre `<table>` y `<tr>`. El modo lista necesita
envolver con `<tbody>` / `<tr>` / `<th>`, y el modo grilla con `<section>` / `<div>`. Un componente
que sirviera a los dos terminaría con un prop `as` y `createElement` dinámico — más complejidad que
la que ahorra, para un único consumidor. Además `src/components/ui/` mezcla convenciones (`Badge`
usa clases de `globals.css`, `SectorsView` es Tailwind puro), así que un primitivo "compartido"
tendría que elegir un bando y quedaría inconsistente con el otro.

**Consecuencia**: si en el futuro el drawer o alguna otra vista necesita el mismo acordeón, ahí sí
conviene extraerlo, con los dos consumidores a la vista.

---

## R-002 — Modo lista: dos `<tbody>` por sección

**Decisión**: cada sección emite dos `<tbody>` — el primero con la fila de encabezado
(`<th colSpan scope="colgroup">`), el segundo con las filas de datos y el `id` al que apunta
`aria-controls`.

**Alternativas descartadas**:

| Opción | Por qué no |
|---|---|
| Filas `<tr><th colSpan>` sueltas dentro de un único `<tbody>` | Es HTML válido, pero no queda ningún elemento que envuelva las filas del grupo, así que `aria-controls` no tiene a qué apuntar. Rompe el contrato del acordeón. |
| Una `<table>` por sección | Cada tabla calcula sus anchos por separado y las columnas dejan de alinearse entre secciones. |

**Detalles que sostienen la decisión**:

- HTML5 permite N `<tbody>` en una misma `<table>`.
- Un `<tbody>` vacío es válido (content model: cero o más `<tr>`), así que el contenedor se monta
  siempre y solo se condicionan las filas. Así `aria-controls` nunca apunta a un id inexistente y
  las filas plegadas no quedan en el orden de tabulación.
- No se usa el atributo `hidden` sobre `<tbody>`: con `preflight: false`, Tailwind no aporta reset
  de `[hidden]` y cualquier `display` lo pisa silenciosamente.
- `last:border-0` en las filas pasa a significar "última fila de *su* `<tbody>`". Es el
  comportamiento deseado (el borde cierra cada sección), pero es un cambio de semántica que hay que
  conocer.

---

## R-003 — Se persiste el conjunto CERRADO, no el abierto

**Decisión**: `localStorage["gw:sectors-sections-collapsed"]` guarda un array con los keys de las
secciones **plegadas**.

**Alternativa descartada**: guardar los keys abiertos.

**Por qué**: una sección desconocida — un grupo nuevo, un sector movido a otro ámbito, la primera
visita — no figura en la lista guardada. Con el conjunto cerrado eso significa "arranca abierta",
que es el default correcto. Con el conjunto abierto significaría "arranca plegada", y todo grupo
nuevo nacería escondido: eso viola el Principio I de la constitución (información de un vistazo).

**Detalles**: lectura en `useEffect` tras el montaje (nunca durante el render) con `try/catch` y
validación de que sea un array de strings; escritura con `try/catch`; y poda contra los keys
existentes en cada escritura para que la clave no crezca con grupos borrados. Se acepta el flash de
"todo abierto" en el primer paint, igual que ya hace `Shell.tsx` con el ancho del drawer.

---

## R-004 — El color del grupo viaja desde el server component, no desde la API

**Decisión**: `src/app/(main)/sectors/page.tsx` consulta `prisma.group.findMany({ select: { id, color } })`
y lo pasa como prop `groupColors` a `SectorsView`.

**Alternativas descartadas**:

| Opción | Por qué no |
|---|---|
| Agregar `groupColor` al `scope` de `GET /api/sectors` | Es una línea, pero cambia la forma de una respuesta pública y obliga a tocar su contract test, para un dato puramente decorativo. |
| Pedir `/api/groups` desde el cliente | Request extra en cascada, payload pesado (memberships, `_count`), y no cubre los grupos a los que el usuario llega solo por `SectorGrant`. |

**Por qué la elegida**: el server component ya consultaba `prisma.group.findMany` para
`adminGroups`, así que se suma a un `Promise.all` sin round-trip adicional. Los nombres de grupo ya
se exponen vía `scope.groupName`, así que el color no agrega superficie de información.

**Degradación**: sin color, el encabezado cae al ícono de ámbito (`Users` / `User` / `Globe`).
GLOBAL y PERSONAL nunca tienen color de grupo, así que siempre muestran ícono.

---

## R-005 — Un solo criterio de orden gobierna los dos niveles

**Decisión**: el valor del `<select>` ordena tanto las secciones como los sectores dentro de cada
sección.

**Alternativa descartada**: un segundo control para el orden de las secciones.

**Por qué**: el Principio II de la constitución prohíbe agregar configuración de usuario para algo
que el producto puede decidir. Un único criterio también es más predecible: "más pendientes" quiere
decir lo mismo en los dos niveles.

**Corolario**: en modo `pending`, GLOBAL y PERSONAL compiten en el ranking como cualquier grupo. El
modo existe para responder "qué urge"; pinnear GLOBAL arriba lo volvería inútil. Todo empate cae al
orden canónico (GLOBAL → grupos A-Z → PERSONAL), así que el resultado es determinístico.

---

## R-006 — Cuatro hechos del repo verificados que condicionaron la implementación

1. **`preflight: false`** (`tailwind.config.ts:6-8`) y el único reset de botón es
   `button { font: inherit; cursor: pointer }` (`globals.css:230-233`). Un `<button>` nuevo conserva
   fondo, borde y padding del navegador: el encabezado los neutraliza con
   `border-0 border-b border-solid bg-transparent p-0 text-left` explícito. Era el bug visual más
   probable de la feature.
2. **`prefers-reduced-motion` ya está resuelto globalmente** (`globals.css:189-194`) y
   `:focus-visible` también (`globals.css:184-187`). No hubo que escribir nada para ninguno de los
   dos, solo verificarlos.
3. **`GET /api/sectors` no devuelve el color del grupo** → ver R-004.
4. **Vitest corre en `environment: "node"`**, sin jsdom ni testing-library. Los tests de componente
   usan `renderToString` de `react-dom/server`, siguiendo `tests/unit/task-group-header.test.tsx`.
   React intercala marcadores `<!-- -->` entre expresiones adyacentes, así que el test normaliza el
   HTML antes de comparar.

---

## R-007 — El helper puro vive junto a la vista, no en `lib/domain`

**Decisión**: `src/components/sectors/groupSectorsByScope.ts`.

**Por qué**: el precedente exacto es `src/components/tasks/groupReferencesBySource.ts` — helper puro
de agrupación de vista, co-ubicado con su componente y testeado en `tests/unit/`. Esto es lógica de
presentación (cómo se dibuja la página), no de dominio: `src/lib/domain/sectors/` solo contiene
`colorAssign.ts`, que es una regla del modelo. Tampoco corresponde `lib/nav`, que es del drawer.

Del drawer sí se reusa el comparador: `drawerSort.ts` pasa a exportar `compareNameEs`, para no
instanciar un segundo `Intl.Collator` con la misma configuración.
