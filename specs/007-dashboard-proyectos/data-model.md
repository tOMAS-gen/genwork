# Data Model: Dashboard de Proyectos

**Feature**: specs/007-dashboard-proyectos
**Date**: 2026-07-03

## Cambios al modelo existente

### Work (modificación)

Agregar campo:

| Campo   | Tipo      | Nullable | Default | Descripción                     |
|---------|-----------|----------|---------|----------------------------------|
| dueDate | DateTime  | Sí       | null    | Fecha de entrega del proyecto   |

Sin cambios en relaciones existentes. El campo se expone en `GET /api/works` y se edita via `PATCH /api/works/[id]`.

### Nuevo modelo: UserFavorite

| Campo  | Tipo   | Nullable | Descripción                          |
|--------|--------|----------|---------------------------------------|
| userId | String | No       | FK a User.id                         |
| workId | String | No       | FK a Work.id (cascade on delete)     |

**PK compuesta**: `(userId, workId)`

**Relaciones**:
- `user → User` (onDelete: Cascade)
- `work → Work` (onDelete: Cascade)

**Índice**: PK compuesta ya cubre las queries más comunes (buscar favoritos de un usuario).

## Estado derivado (no almacenado)

El estado del proyecto se calcula a partir del progreso de tareas:

| Condición                    | Estado        |
|------------------------------|---------------|
| 0 tareas completadas         | Pendiente     |
| 100% tareas completadas      | Completado    |
| Entre 1% y 99% completadas   | En progreso   |
| 0 tareas totales             | Pendiente     |

Este cálculo ya existe en `GET /api/works` (field `taskCounts`). No se agrega campo al modelo.

## Datos adicionales en response de Work

Para soportar filtrado por sector en el cliente, la API debe incluir los IDs de sectores vinculados a las tareas de cada proyecto:

| Campo     | Tipo     | Fuente                                              |
|-----------|----------|------------------------------------------------------|
| sectorIds | String[] | Distinct `task.sectorId` where `task.workId = work.id` |

## Migración

1. `ALTER TABLE Work ADD COLUMN dueDate TIMESTAMP NULL`
2. `CREATE TABLE UserFavorite (userId TEXT, workId TEXT, PRIMARY KEY (userId, workId), FOREIGN KEY ...)`

Migración no destructiva, sin datos que migrar.
