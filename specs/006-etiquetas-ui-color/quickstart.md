# Quickstart: Validación de 006-etiquetas-ui-color

## Prerrequisitos

- PostgreSQL corriendo con base `genwork`
- `npm install` completado
- `npx prisma migrate deploy && npx prisma generate`
- Variable `DEV_AUTH=true` en `.env.local` para bypass de auth en dev

## Iniciar

```bash
npm run dev    # http://localhost:3010
```

## Escenarios de validación

### 1. Fix del bug al crear clave (FR-611)

1. Ir a un proyecto existente
2. Click en el ícono de etiquetas (Tag)
3. Click en "Gestionar etiquetas…"
4. Escribir un nombre de clave (ej. "Prioridad") y click "Agregar"
5. **Esperado**: la clave se crea sin error y aparece en la lista
6. Agregar un valor con color (ej. "Alta" / Rojo)
7. **Esperado**: el valor aparece como chip coloreado

### 2. Sección admin de etiquetas (FR-601, FR-602)

1. Navegar a `/admin`
2. **Esperado**: ver link "Etiquetas" junto a los existentes (Acceso, Almacenamiento, Usuarios)
3. Click en "Etiquetas"
4. **Esperado**: tabla con todas las claves del ámbito, valores como chips, acciones editar/eliminar
5. Crear clave nueva, agregar valores, renombrar, eliminar
6. **Esperado**: todas las operaciones funcionan con feedback visual

### 3. Color de proyecto en home (FR-607, FR-608)

1. Ir a home (`/`)
2. Asignar etiqueta con color a un proyecto desde su vista de detalle
3. Volver a home
4. **Esperado**: la card del proyecto muestra indicador de color (borde lateral o similar) del color de la primera etiqueta (ordenada por nombre de clave)
5. Proyecto sin etiquetas: no muestra indicador de color

### 4. Dot de color en drawer (FR-609)

1. Mirar el drawer lateral con la lista de proyectos
2. **Esperado**: cada proyecto con etiquetas muestra un punto (dot) de color junto al nombre
3. **Esperado**: proyectos sin etiquetas no muestran dot

### 5. Color en dashboard/board (FR-610)

1. Ir a `/board`
2. **Esperado**: los tags de proyecto (`/Nombre`) muestran el color derivado del proyecto
3. Proyecto sin etiquetas: tag sin color especial

## Tests automatizados

```bash
npm run test               # Incluye test de getProjectColor
npm run lint               # ESLint sobre src/ y tests/
npm run build              # Build de producción
```
