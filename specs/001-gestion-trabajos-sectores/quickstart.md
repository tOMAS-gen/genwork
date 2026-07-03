# Quickstart: validación end-to-end de genwork

**Fecha**: 2026-07-02 | **Plan**: [plan.md](plan.md) | **Contracts**: [contracts/api.md](contracts/api.md)

Guía para levantar el sistema y validar que cada user story funciona. No contiene código de
implementación.

## Prerrequisitos

- Docker + Docker Compose v2.
- Proyecto en Google Cloud Console con OAuth Client ID (tipo Web) — redirect URI
  `https://<host>/api/auth/callback/google`.
- 2–3 cuentas de Google para probar (una será super-admin, otra miembro, otra para rol Lector).

## Levantar el sistema

```bash
cd deploy
cp .env.example .env      # completar GOOGLE_CLIENT_ID/SECRET, dominios, passwords
docker compose up -d      # genwork + postgres + nextcloud + caddy
docker compose ps         # los 4 servicios healthy
```

Primer arranque: las migraciones de Prisma corren solas; Nextcloud queda inicializado con la
app Group Folders activa y una cuenta admin de servicio cuyo app password ya está en el módulo
de conexión de genwork.

## Validación por user story

### US5 — Ingreso y control de acceso (fundacional)

1. Abrir `https://<host>` sin sesión → solo se ofrece "Ingresar con Google".
2. Ingresar con la cuenta 1 → es el primer usuario: queda como **super-admin**.
3. En Panel admin → Acceso: elegir modo lista y agregar el correo de la cuenta 2.
4. Ingresar con cuenta 2 en otra ventana → entra. Intentar con cuenta 3 → rechazo claro.
5. **Esperado**: sin datos expuestos al rechazado; cambio de lista aplica al próximo intento.

### US1 — Trabajo con documentación y checklist

1. Crear trabajo "Tina – Remodelación visual de paneles" (ámbito personal).
2. Escribir descripción en la doc, adjuntar una imagen y un PDF (presupuesto).
3. Agregar 3 tareas; marcar 1 como realizada; desmarcarla; volver a marcarla.
4. Cerrar sesión, reabrir → todo persiste; la realizada se ve tachada en su lugar.
5. **Esperado**: doc y tareas en la misma página; adjuntos visibles en la carpeta del trabajo.

### US2 — Etiquetado inline

1. En Tina, escribir `Comprar perfiles de hierro #Compras @Metalurgica`.
2. Al tipear `#Com` aparece autocompletado; con nombre inexistente ofrece **crear** el sector.
3. Confirmar → las etiquetas se ven diferenciadas y clickeables; click en `#Compras` navega al
   sector.
4. Escribir una tarea con `perfil 20/20` → el `/` literal NO crea etiqueta.
5. **Esperado**: vínculos tipados correctos (EXEC vs REF) visibles en la tarea.

### US3 — Vistas por sector y tarea única

1. Crear segundo trabajo con tarea `Armar estructura #Metalurgica`.
2. Abrir sector Metalúrgica → aparecen tareas de ambos trabajos con su trabajo de origen.
3. Completar una desde el sector → en el trabajo aparece completada (misma tarea). Con la vista
   del trabajo abierta en otra ventana/usuario, el cambio se ve en vivo sin recargar (FR-036).
4. La tarea `#Compras @Metalurgica` aparece en Metalúrgica en el apartado **Referencias**
   (solo lectura, sin casilla): Metalúrgica debe aportar, Compras la completa (FR-040).
4b. Crear `Pasar planos #Metalurgica @cuenta2` → la cuenta 2 la ve en su apartado personal
   "Mis referencias" aunque no tenga acceso al trabajo (FR-041/042); no puede completarla.
5. Desde Metalúrgica crear `Pasar diseño /Tina` → se guarda en Tina vinculada a Metalúrgica.

### US4 — Filtros transversales (caso ferretería)

1. Crear varias tareas `#Compras` con referencias `@Metalurgica` y `@Pintura` en distintos
   trabajos.
2. Abrir Compras → filtrar por referencia Metalúrgica → solo las compras de metalúrgica.
3. Combinar con filtro estado Pendiente y con filtro por trabajo.
4. **Esperado**: obtener la lista lleva ≤ 2 acciones (SC-004).

### Grupos y Nextcloud (US5 + FR-033/034/035)

1. Con cuenta 2: crear grupo "Producción" → cuenta 2 queda admin principal.
2. Agregar a cuenta 1 como miembro. Crear sector Metalúrgica y trabajo dentro del grupo.
3. Verificar en Nextcloud (`https://<nc-host>`): existe el Group Folder "Producción" compartido
   a ambos usuarios, con la carpeta del trabajo adentro.
4. Instalar cliente de escritorio Nextcloud con la cuenta espejo → la carpeta del grupo se
   sincroniza; un archivo soltado en la carpeta local aparece en la plataforma.
5. Intentar quitar al admin principal del grupo con la otra cuenta admin → imposible (403).
5b. Dar a una cuenta permiso SOLO del sector Metalúrgica (sin membresía del grupo): desde ese
   sector crear `Reforzar soporte /Tina` → la tarea aparece en el trabajo Tina con
   `#Metalurgica`; esa cuenta NO puede abrir Tina, pero ve y completa la tarea desde su sector
   (FR-038). En Tina la tarea muestra `#Metalurgica`; en Metalúrgica muestra `/Tina` (FR-039).
6. Apagar el contenedor de Nextcloud, crear un grupo → genwork sigue funcionando; el panel
   admin muestra el job PENDING/FAILED; al levantar Nextcloud el job se completa (cola).

### US6 — Dashboard TV

1. Panel admin: asignar rol Lector a cuenta 3 y habilitarle el grupo Producción (o activar
   "lectura para no miembros" del grupo).
2. Ingresar con cuenta 3 → ve solo el board por sector, sin ningún control de edición.
3. Desde otra cuenta completar una tarea de Metalúrgica → el board la refleja en < 5 s sin
   tocar nada.

### US7 — Archivado (export portable)

1. En Tina: Archivar → el sistema arma el paquete (estado BUILDING → READY).
2. Descargar el ZIP y abrirlo: `Tina – .../archivos/*`, `documentacion.pdf`,
   `documentacion.json` y `tareas.md` legibles sin el sistema.
3. Confirmar el archivado → Tina pasa a ARCHIVED: ya no está entre los activos; sus tareas
   desaparecieron de las vistas de sector.
4. Guardar el ZIP donde se prefiera (Drive propio, otra nube, disco) — fuera del sistema.
5. Interrumpir el armado o la descarga en otro trabajo (cortar red / detener Nextcloud) → falla
   informada y el trabajo **permanece intacto**; sin confirmación no hay ARCHIVED.
6. Intentar "eliminar" un trabajo activo → el sistema ofrece archivar; no hay borrado destructivo
   sin export confirmado.
7. Sobre Tina (ya archivada): ejecutar **eliminación definitiva** → exige escribir el nombre del
   trabajo; al confirmar, la carpeta desaparece de Nextcloud (verificar en la UI de Nextcloud) y
   el trabajo con todos sus datos desaparece del sistema. El espacio queda liberado.

## Tests automatizados (constitution)

```bash
npm test                  # Vitest: parser de etiquetas, permisos, vistas, archivado (mocks)
npm run test:e2e          # Playwright smoke US1+US2 (opcional)
```

**Esperado**: verde en `src/lib/domain/**` con cobertura de los casos de las user stories 1–4 y
las reglas de permisos 1–6 del data model.
