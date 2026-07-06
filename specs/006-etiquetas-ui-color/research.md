# Research: 006-etiquetas-ui-color

**Date**: 2026-07-03

## R1: Bug del endpoint POST en LabelPicker

**Hallazgo**: `LabelPicker.tsx:128` llama `POST /api/labels/keys` pero esa ruta no existe. Solo hay `PATCH/DELETE` en `/api/labels/keys/[id]/route.ts`. La ruta correcta para crear claves es `POST /api/labels` (definida en `/api/labels/route.ts`).

**Decisión**: Corregir la URL en `LabelPicker.tsx` de `/api/labels/keys` a `/api/labels`.

**Alternativas**: Crear un nuevo `route.ts` en `/api/labels/keys/` con el POST → rechazado, duplicaría lógica y el endpoint `/api/labels` ya maneja la creación correctamente.

## R2: Derivación de color de proyecto

**Hallazgo**: WorkLabel tiene `keyId` y `valueId`. La API `/api/works` ya devuelve `labels[]` con `keyName`, `valueName`, `color` por cada asignación. El color de proyecto se deriva ordenando las labels por `keyName` alfabéticamente y tomando el color de la primera.

**Decisión**: Función pura `getProjectColor(labels: WorkLabelDto[]): LabelColor | null` en `src/lib/domain/works/projectColor.ts`. Se calcula en el cliente — no requiere cambio en API ni campo persistido.

**Alternativas**: (1) Persistir `colorOverride` en Work → rechazado, agrega campo y migración sin necesidad real. (2) Calcular en servidor → rechazado, la data ya viaja al cliente con labels incluidas.

## R3: Ubicación de la sección de gestión de etiquetas

**Hallazgo**: La página `/admin` existe y es solo para SUPERADMIN. Tiene links a: control de acceso, almacenamiento, usuarios. La gestión de etiquetas es por ámbito (grupo o personal), y los guards del API ya validan permisos (`requireLabelAdmin`).

**Decisión**: Agregar sub-ruta `/admin/labels` con la tabla de gestión. El guard del API ya protege las operaciones — si un usuario no admin del ámbito intenta crear/editar, recibe 403. La página admin solo la ven superadmins (consistent con la app existente). Para usuarios sin grupo, la gestión se mantiene desde el picker inline (ya existe y se va a arreglar).

**Alternativas**: (1) Sección accesible para todos los miembros del grupo → rechazado por Principio V (la app actual limita admin a SUPERADMIN y es suficiente para el flujo). (2) Página separada fuera de admin → rechazado, fragmenta la navegación.

## R4: Indicador de color en drawer

**Hallazgo**: El drawer (`DrawerNav.tsx`) carga works vía `GET /api/works` pero solo toma `{id, name}`. Necesita también las labels para derivar el color.

**Decisión**: Modificar el tipo del drawer para aceptar la data de labels que ya devuelve la API, o ajustar la query del drawer para incluir labels. La API `/api/works` ya devuelve labels — el drawer puede consumir la misma respuesta.

**Alternativas**: (1) API separada `/api/works/colors` → rechazado, sobreingeniería. (2) Precalcular y cachear color del lado servidor → rechazado, innecesario a esta escala.

## R5: Mapeo de LabelColor a CSS

**Hallazgo**: El enum `LabelColor` tiene 10 valores (RED, ORANGE, AMBER, GREEN, TEAL, BLUE, INDIGO, VIOLET, PINK, GRAY). Los estilos CSS existentes usan clases `.label-chip.label-{color}` en `globals.css`. Los mismos colores se reutilizan para el dot del drawer y el indicador de la card.

**Decisión**: Agregar clase CSS `.project-dot` que use las mismas custom properties de color que `.label-chip`. Agregar variante `.project-color-bar` para el borde lateral de las cards en home.

**Alternativas**: Inline styles con un mapa JS de colores → rechazado, ya existen las clases CSS.
