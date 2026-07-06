# Quickstart: Frontend Design Audit

## Prerequisites

- Node.js instalado
- Proyecto genwork con dependencias (`npm install`)
- Dev server corriendo: `npm run dev` (puerto 3010)
- Navegador con DevTools (Chrome recomendado)

## Validación: Tokens sin hex hardcodeados (SC-001)

```bash
# Buscar hex hardcodeados fuera de definiciones :root y [data-theme]
grep -n '#[0-9a-fA-F]\{3,8\}' src/app/globals.css | grep -v '^\s*--' | grep -v ':root' | grep -v 'data-theme'
```

**Expected**: 0 resultados (todos los colores usan `var(--token)`).

## Validación: Estados interactivos (SC-002)

1. Abrir la app en el navegador
2. Navegar con Tab por todos los elementos interactivos
3. Verificar que cada botón, link, input y card clickeable tiene:
   - Hover: cambio visual al pasar el mouse
   - Focus-visible: outline/ring visible al navegar con Tab
   - Disabled: apariencia diferenciada (si aplica)

**Expected**: 100% de elementos interactivos tienen los 3 estados.

## Validación: Contraste AA (SC-003)

1. Abrir Chrome DevTools > Elements
2. Seleccionar un elemento de texto
3. En el panel Styles, click en el cuadro de color
4. Verificar "Contrast ratio" ≥ 4.5:1 (texto normal) o ≥ 3:1 (texto grande)
5. Repetir en ambos temas (claro y oscuro)

**Elementos clave a verificar**:
- Body text sobre fondo de página
- Texto muted/subtle sobre cards
- Etiquetas de sector (10 colores) sobre sus fondos
- Status pills (texto sobre fondo de color)
- Links sobre fondo de cards y página

**Expected**: 100% cumple WCAG AA.

## Validación: Responsive sin scroll (SC-004)

1. Abrir DevTools > Toggle Device Toolbar
2. Verificar en 375px, 768px, y 1280px:
   - No hay scroll horizontal en `<body>`
   - Sidebar/drawer funciona correctamente
   - Cards y tablas no desbordan
   - Todos los controles son accesibles

```javascript
// En consola del navegador — detectar overflow
document.documentElement.scrollWidth > document.documentElement.clientWidth
```

**Expected**: Retorna `false` en los 3 breakpoints.

## Validación: Consolidación de tokens (SC-005)

```bash
# Contar variables CSS definidas en :root
grep -c '^\s*--' src/app/globals.css
```

**Expected**: Reducción ≥ 20% respecto al conteo inicial (anotar antes y después).

## Validación: Colores de sector (SC-006)

1. Navegar a la vista de sectores
2. Verificar que las 10 variantes de color son legibles:
   - red, orange, amber, green, teal, blue, indigo, violet, pink, gray
3. Verificar en ambos temas

**Expected**: Contraste texto/fondo ≥ 3:1 en todas las variantes y temas.

## Validación: Tema dual completo (FR-007)

1. Click en ThemeToggle (sidebar footer): sol → luna → monitor
2. Verificar que TODOS los elementos cambian correctamente
3. Buscar elementos "huérfanos" que conserven colores del tema opuesto

**Expected**: 0 elementos huérfanos en cambio de tema.
