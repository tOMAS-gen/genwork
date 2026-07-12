import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ErrorLogDetail } from "@/components/admin/ErrorLogDetail";

export const metadata: Metadata = { title: "Detalle de error" };

export default async function AdminErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPERADMIN") redirect("/");
  const { id } = await params;

  return (
    <div className="sheet">
      <ErrorLogDetail id={id} />
    </div>
  );
}
