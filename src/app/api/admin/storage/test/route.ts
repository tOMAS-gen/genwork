import { NextResponse } from "next/server";
import { withApi } from "@/server/api";
import { requireSuperAdmin } from "@/server/guards";
import { getStorageProvider } from "@/lib/storage";

export const POST = withApi(async () => {
  await requireSuperAdmin();
  try {
    const storage = await getStorageProvider();
    const result = await storage.test();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, detail: (err as Error).message });
  }
});
