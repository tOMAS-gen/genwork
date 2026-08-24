# Quickstart — 060 Sectores agrupados por ámbito

## Correr

```bash
npm install
npm run db:generate          # necesario tras una instalación limpia
npm run db:migrate
npm run dev                  # puerto 3010
```

Ir a `http://localhost:3010/sectors`. En local con `DEV_AUTH=true`, entrar con
"Entrar como Admin de prueba".

Para que la agrupación se note hace falta un catálogo con varios ámbitos: sectores globales, de al
menos dos grupos, y personales.

## Automático

```bash
npm test                     # incluye sectors-grouping y sector-section-header
npm run lint
npx tsc --noEmit
```

## Checklist manual

### Agrupación y orden (US1, US3)

1. La página muestra una sección por ámbito, con encabezado propio: GLOBAL primero, los grupos
   alfabéticamente, PERSONAL al final.
2. Un grupo del que no se ve ningún sector **no** aparece como sección vacía.
3. Cada encabezado muestra el nombre, `(n)` sectores y el total de pendientes. Una sección sin
   pendientes no muestra contador.
4. El total de pendientes de una sección coincide con la suma de los pendientes de sus sectores
   (contrastar contra el drawer).
5. Los encabezados de sección **no** salen con el fondo/borde/padding gris del navegador (riesgo de
   `preflight: false`). Verificar en tema claro y oscuro.
6. Elegir **"Más pendientes"**: se reordenan las secciones *y* las tarjetas dentro de cada una. La
   sección con más pendientes queda arriba, sin importar si es GLOBAL, un grupo o PERSONAL.
7. Volver a **"Nombre A-Z"**: vuelve el orden GLOBAL → grupos A-Z → PERSONAL.

### Plegado y persistencia (US2)

8. Plegar dos secciones → F5 → siguen plegadas. En DevTools,
   `localStorage.getItem("gw:sectors-sections-collapsed")` lista solo esas dos.
9. "Contraer todo" pliega todas y el botón pasa a decir "Expandir todo"; volver a tocarlo las abre.
10. Crear un grupo nuevo con un sector: su sección aparece **desplegada**, no escondida.

### Buscador (US4)

11. Buscar un texto que coincida en dos ámbitos: se muestran solo esas dos secciones, ambas
    abiertas aunque estuvieran plegadas en el paso 8.
12. Limpiar el buscador: vuelven todas y las plegadas del paso 8 siguen plegadas.
13. Plegar una sección *mientras* se busca y luego tipear otra letra: se reabre (estado efímero), y
    el estado persistido no se vio afectado.
14. Buscar algo sin coincidencias: aparece "No hay sectores que coincidan con el filtro".

### Modo lista

15. Alternar a lista: mismas secciones, encabezados a lo ancho de la tabla, y las columnas alineadas
    entre secciones distintas.
16. Las filas siguen navegando al sector con click y con Enter, sin recarga completa de página.
17. Copiar el `outerHTML` de la `<table>` en validator.w3.org: sin errores de content model.

### Accesibilidad

18. Tab llega a cada encabezado con outline visible; Enter y Espacio pliegan y despliegan.
19. Los sectores de una sección plegada **no** aparecen en el orden de tabulación.
20. DevTools → Accessibility: el encabezado expone `expanded: true/false` y `Controls` apunta a un
    elemento que existe, también cuando está plegado.
21. Activar "reducir movimiento" en el sistema: el chevron cambia de estado sin animar.

### Responsive y tema

22. A 375px: grilla en una columna, la tabla scrollea dentro de su contenedor y la página no
    scrollea horizontal. Los títulos largos se truncan con ellipsis y conservan el `title`.
23. Tema oscuro: contraste correcto en encabezados, badges y puntos de color.

### Permisos

24. Con una sesión que solo ve GLOBAL y PERSONAL: dos secciones, mismo tratamiento visual, sin
    errores en consola.
