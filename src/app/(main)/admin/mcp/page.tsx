import { redirect } from "next/navigation";

/** La sección pasó a /settings/claude, abierta a todo usuario interno. */
export default function McpAdminPage() {
  redirect("/settings/claude");
}
