-- Historial de transiciones de estado de tarea (feature 042, US4).

CREATE TABLE "TaskStatusChange" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskStatusChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskStatusChange_taskId_changedAt_idx" ON "TaskStatusChange"("taskId", "changedAt");

ALTER TABLE "TaskStatusChange" ADD CONSTRAINT "TaskStatusChange_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskStatusChange" ADD CONSTRAINT "TaskStatusChange_fromStatusId_fkey"
    FOREIGN KEY ("fromStatusId") REFERENCES "TaskStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskStatusChange" ADD CONSTRAINT "TaskStatusChange_toStatusId_fkey"
    FOREIGN KEY ("toStatusId") REFERENCES "TaskStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskStatusChange" ADD CONSTRAINT "TaskStatusChange_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
