-- Feature Mi día: marca "para hacer hoy" sin fecha, estilo Microsoft To Do.
-- Es global por tarea (no por usuario): una tarea marcada aparece en "Mi día" de
-- todo usuario que puede verla. myDayAt = cuándo se agregó (orden de la lista);
-- myDayById = quién la agregó (SET NULL si se borra el usuario).
-- Aditiva: las tareas existentes quedan fuera de Mi día (ambas columnas NULL).

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "myDayAt" TIMESTAMP(3),
ADD COLUMN "myDayById" TEXT;

-- CreateIndex
CREATE INDEX "Task_myDayAt_idx" ON "Task"("myDayAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_myDayById_fkey" FOREIGN KEY ("myDayById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
