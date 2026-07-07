import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireSession } from "@/server/auth";
import { getSystemTimezone } from "@/lib/time/system-tz";

/** GET /api/reminders/timezone — zona horaria del sistema para mostrar en la UI (FR-029). */
export const GET = withApi(async () => {
  await requireSession();
  const timezone = await getSystemTimezone();
  return NextResponse.json({ timezone });
});
