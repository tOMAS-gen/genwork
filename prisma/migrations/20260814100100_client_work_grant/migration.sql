-- Feature 059: otorgamiento explícito cliente↔proyecto (FR-005) y marca de primer
-- ingreso para distinguir una invitación pendiente de una cuenta activa (FR-012).

CREATE TABLE "ClientWorkGrant" (
    "userId"      TEXT NOT NULL,
    "workId"      TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientWorkGrant_pkey" PRIMARY KEY ("userId","workId")
);

-- La clave primaria compuesta indexa (userId, workId). La consulta "qué clientes
-- ven ESTE proyecto" (pestaña Acceso cliente del proyecto) filtra solo por workId
-- y sin este índice haría scan de la tabla.
CREATE INDEX "ClientWorkGrant_workId_idx" ON "ClientWorkGrant"("workId");

ALTER TABLE "ClientWorkGrant" ADD CONSTRAINT "ClientWorkGrant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientWorkGrant" ADD CONSTRAINT "ClientWorkGrant_workId_fkey"
    FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- grantedById nullable con SET NULL: el rastro de auditoría de quién otorgó el
-- acceso sobrevive al borrado de ese administrador. Con RESTRICT no se podría
-- borrar nunca a alguien que otorgó accesos.
ALTER TABLE "ClientWorkGrant" ADD CONSTRAINT "ClientWorkGrant_grantedById_fkey"
    FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "firstLoginAt" TIMESTAMP(3);
