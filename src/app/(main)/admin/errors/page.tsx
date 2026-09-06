import { PageHeader } from "@/components/ui/PageHeader";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ErrorLogList } from "@/components/admin/ErrorLogList";

export const metadata: Metadata = { title: "Errores" };

export default async function AdminErrorsPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPERADMIN") redirect("/");

  return (
    <div className="admin-page">
      <PageHeader title="Errores" icon="settings" />
      <ErrorLogList />
    </div>
  );
}
