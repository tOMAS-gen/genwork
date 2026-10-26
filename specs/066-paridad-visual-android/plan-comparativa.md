# Plan de implementación: `comparativa`

Spec: [SPEC-comparativa.md](SPEC-comparativa.md) · Tareas: [tasks-comparativa.md](tasks-comparativa.md) · Estado: **aprobado** el 2026-10-25. Rama: `tOMAS-gen/paridad-visual-android`, creada desde `main`.

## Resumen

Primero se arma y valida el inventario P-xx. Después se levanta el entorno QA y se mide el ancho del emulador. Con eso se hace un **par piloto (P05 Proyectos)** que el usuario revisa antes de capturar el resto. Recién entonces se capturan las 35 pantallas en cuatro tandas y se cierra con el comparador.

## Decisiones de arquitectura

- **Se reutiliza lo que ya existe:** `scripts/mobile-dev.sh`, la base `genwork_mobile_parity`, el seed y el comparador `mobile-evidence.mjs`. No hay entorno nuevo ni dependencias nuevas.
- **El piloto va antes de las tandas.** Si el ancho, el DPR o el encuadre quedan mal, conviene descubrirlo con un par y no con 140 imágenes.
- **Tandas por zona de la app, no por plataforma.** Cada tanda deja pares completos (web y Android, claro y oscuro) y se puede revisar en el comparador apenas termina.
- **Cambiar de rol queda para la última tanda.** Cliente y lector obligan a cerrar sesión en la app y en el navegador del emulador. Se hace una sola vez.
- **Rama:** `tOMAS-gen/paridad-visual-android`, creada desde `origin/main`.

## Tareas

| # | Tarea | Tamaño | Depende de |
|---|---|---|---|
| 1 | Inventario validado (`inventario.md`) | S | — |
| 2 | El comparador acepta la carpeta como argumento | XS | — |
| 3 | Entorno QA levantado y ancho lógico medido | S | — |
| 4 | Procedimiento (`quickstart.md`) y par piloto P05 | S | 1, 2, 3 |
| — | **Checkpoint A:** el usuario revisa el piloto | | 4 |
| 5 | Tanda 1: P01–P12 (acceso, navegación, Mi día, proyectos, tareas, tablero, sectores) | M | A |
| 6 | Tanda 2: P13–P24 (grupos, notas, documentos, archivos, recordatorios, notificaciones, cuenta) | M | A |
| — | **Checkpoint B:** revisión intermedia en el comparador | | 5, 6 |
| 7 | Tanda 3: P25–P32 (administración) | M | B |
| 8 | Tanda 4: P33–P35 (portal como cliente, TV como lector) | S | B |
| 9 | Cierre: comparador, inventario completo y commit de documentos | XS | 7, 8 |
| — | **Checkpoint final:** criterios de éxito de la spec | | 9 |

Las tareas 1, 2 y 3 son independientes entre sí y se pueden hacer en paralelo. Las tandas 5 a 8 son secuenciales porque comparten un solo emulador y una sola sesión de navegador.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Chrome DevTools no emula bien el DPR fraccionario del Pixel 9a (≈2,625) | Medio | El piloto lo prueba. Si falla, se usa DPR 3 y se compara a igual ancho lógico, que es lo que importa. |
| El seed no tiene datos para alguna pantalla (Materiales sin GenStock, Archivos sin Nextcloud) | Medio | En la tarea 3 se abre cada recurso semilla. Si falta algo, se pregunta antes de tocar el seed (límite de la spec). |
| El login PKCE en el emulador se traba al cambiar de usuario | Bajo | Se sigue el procedimiento de la guía M00 (cerrar sesión en la app y en `/api/auth/signout`), y se hace una sola vez, en la tanda 4. |
| Diferencias que no son de diseño (hora, notificaciones, scroll distinto) | Bajo | Barra de estado en modo demo, captura desde arriba y desplazadas hasta el mismo elemento. |
| `docs/auditoria-ui-ux/` está sin commitear en el árbol | Bajo | No se incluye en los commits de este módulo salvo que el usuario lo pida. |
