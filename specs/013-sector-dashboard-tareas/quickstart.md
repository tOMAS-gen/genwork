# Quickstart Validation: Dashboard de sectores

## Prerequisites

- Dev server running on port 3010 (`npm run dev`)
- DEV_AUTH enabled (auto-login)
- At least one group with sectors and tasks linked to projects

## Scenario 1: Dashboard de sectores

1. Navigate to `/sectors`
2. Verify each sector card shows:
   - Name with color indicator (dot or border)
   - Task count (done/total)
   - Progress bar with percentage
3. Click a sector card → navigates to `/sectors/:id`

**Expected**: Cards with visual differentiation by color, metrics visible at a glance.

## Scenario 2: Color de sector

1. Navigate to `/sectors`
2. Verify newly created sectors have auto-assigned colors
3. From a sector detail view, change the color
4. Return to `/sectors` → color updated in dashboard

**Expected**: Colors persist and display consistently.

## Scenario 3: Tareas agrupadas por proyecto

1. Navigate to a sector that has:
   - Tasks without a project (loose tasks)
   - Tasks belonging to project "Tina"
   - Tasks belonging to project "Mesa"
2. Verify display shows:
   - "Tareas del sector" group first (loose tasks)
   - "Tina" group with its tasks
   - "Mesa" group with its tasks
   - "Referencias" section at the bottom

**Expected**: Clear visual grouping with project headers.

## Scenario 4: Creación de tarea en sector

1. From sector "Metalúrgica", use the general input
2. Type "Limpiar taller" (no slash) → creates loose task
3. Type "Soldar marcos /Tina" → creates task linked to project Tina
4. Navigate to project Tina → verify "Soldar marcos" appears there
5. From the "Tina" group input, type "Pintar puertas" → auto-linked to Tina

**Expected**: Tasks appear in correct groups and are visible in project view.

## Scenario 5: Restricción de #

1. From sector "Metalúrgica", type "#Compras preparar pedido"
2. Verify `#Compras` is ignored (no autocomplete, no tag created)
3. Task is created as a loose task of Metalúrgica

**Expected**: `#` symbol has no effect in sector context.
