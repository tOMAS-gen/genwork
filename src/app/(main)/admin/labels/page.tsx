import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { LabelAdmin } from "@/components/works/LabelAdmin";

export const metadata: Metadata = { title: "Etiquetas" };

export default async function LabelsAdminPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPERADMIN") redirect("/");

  return (
    <div>
      <h1>Etiquetas</h1>
      <LabelAdmin />
    </div>
  );
}
