# Quickstart: validar Renombrar Proyectos, Sectores y Grupos

## Prerrequisitos

- Repo en `049-renombrar-entidades`, dependencias instaladas (`npm install`).
- Servidor dev corriendo: `npm run dev` (puerto configurado del proyecto, ver README).
- Un usuario SUPERADMIN (dev login, ver `src/server/auth.ts` credentials provider) y,
  si se quiere probar el caso negativo, un segundo usuario MEMBER/READER.

## Escenario 1 — Renombrar un proyecto (US1)

1. Entrar a un proyecto propio (`/works/<id>`).
2. Abrir el menú "Acciones del proyecto" → "Renombrar…".
3. Cambiar el nombre y guardar.
4. **Esperado**: el `<h1>` del proyecto y su entrada en el listado (`/`) muestran el
   nuevo nombre sin recargar manualmente; el código `GRUPO-N-NOMBRE` recalculado usa el
   nuevo nombre en el próximo GET.
5. Repetir intentando guardar vacío y un nombre duplicado en el mismo grupo → debe
   mostrar error y conservar el nombre anterior.
6. Con un usuario cuyo único acceso al proyecto es de lectura: el menú no debe mostrar
   "Renombrar…".

## Escenario 2 — Renombrar un grupo (US2)

1. Como SUPERADMIN o ADMIN de un grupo, entrar a `/groups/<id>`.
2. Abrir "Acciones del grupo" → "Renombrar…", cambiar el nombre, guardar.
3. **Esperado**: el nombre se refleja en la página del grupo y en `/groups` (listado).
4. Con un usuario MEMBER (no ADMIN) del grupo: el menú no debe mostrar "Renombrar…".
5. Probar nombre duplicado con otro grupo existente → error, nombre anterior conservado.

## Escenario 3 — Renombrar un sector (US3)

1. Como SUPERADMIN, entrar a `/sectors/<id>` (probar con un sector de cada ámbito:
   Grupo, Personal, Global).
2. Abrir "Acciones del sector" → "Renombrar…", cambiar el nombre, guardar.
3. **Esperado**: el nombre se actualiza; las tareas ya asignadas al sector siguen
   visibles bajo el nuevo nombre en la misma vista.
4. Con un usuario ADMIN de grupo (dueño del sector) que NO es SUPERADMIN: el menú NO
   debe mostrar "Renombrar…" (verifica la Decisión 2 de `research.md` — chequeo por
   `globalRole`, no por `level`/`SectorGrant`).

## Verificación del endpoint extendido

```bash
curl -s http://localhost:<puerto>/api/me -H "Cookie: <sesión>" | jq
# Esperado: { "id": "...", "globalRole": "SUPERADMIN" | "MEMBER" | "READER" }
```

## Referencias

- Contratos: [contracts/me-api.md](./contracts/me-api.md)
- Modelo de datos: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
