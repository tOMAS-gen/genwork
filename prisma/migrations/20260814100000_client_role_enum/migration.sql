-- Feature 059: rol CLIENT para el portal de cliente externo (solo lectura, con
-- alcance por proyecto).
--
-- Va SOLO en esta migración: Postgres no permite usar un valor de enum recién
-- agregado dentro de la misma transacción que lo agrega, y Prisma corre cada
-- archivo de migración en una transacción. Mismo patrón que la migración
-- 20260713052053_audit_group_permissions_job_kind.
--
-- Aditiva pura: ninguna fila existente cambia de rol.
ALTER TYPE "GlobalRole" ADD VALUE 'CLIENT';
