# Quickstart: verificar el arreglo del orden de migraciones

## Prerrequisitos

- Stack de datos de desarrollo levantado: `docker compose -f deploy/docker-compose.dev.yml up -d`
- `.env` con `DATABASE_URL` apuntando a la base de desarrollo local.

## 1. Verificar que la base de desarrollo sigue "al día"

```bash
npx prisma migrate status
```

**Esperado**: `Database schema is up to date!`, sin migraciones pendientes ni
"migrations have not yet been applied" — confirma que renombrar carpetas +
actualizar `_prisma_migrations` no rompió el reconocimiento del historial ya aplicado
(SC-003).

## 2. Verificar que un replay desde cero funciona (el bug original)

```bash
npx prisma migrate dev --create-only --name verificacion_orden
```

**Esperado**: ya NO aparece el error `P3006` ("failed to apply cleanly to the shadow
database"). Si Prisma no detecta cambios de schema pendientes, puede reportar "no
changes to apply" en vez de crear una migración — ambos resultados son válidos
mientras no aparezca el error de shadow DB. Borrar la carpeta
`prisma/migrations/*_verificacion_orden/` que haya quedado (si Prisma llegó a
crearla), ya que es solo para verificar, no un cambio real de schema (SC-001).

## 3. Verificar que el resultado final del esquema no cambió

```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

**Esperado**: script vacío (o sin `ALTER`/`CREATE` relevantes) — confirma que el
esquema real de la base de datos sigue coincidiendo exactamente con lo que describe
`prisma/schema.prisma`, es decir, que el reordenamiento no alteró el resultado final
(SC-002, FR-005).

## 4. (Opcional) Replay completo contra una base descartable

Para una verificación más exhaustiva, se puede repetir el método usado durante la
investigación (`research.md` §3): crear una base Postgres vacía y aplicar cada
`migration.sql` de `prisma/migrations/` en orden alfabético de carpeta (que ahora
coincide con el orden nuevo), confirmando que las 18 migraciones se aplican sin
errores de principio a fin.
