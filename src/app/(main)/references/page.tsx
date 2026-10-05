"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { MyDayAndReferencesList } from "@/components/myDay/MyDayList";
import { usePageTitle } from "@/lib/usePageTitle";

/** Una sola lista: primero Mi día y después las referencias pendientes. */
export default function ReferencesPage() {
  usePageTitle("Mi día y referencias");

  return (
    <div className="sheet">
      <PageHeader
        title="Mi día y referencias"
        description="Primero lo que hay que hacer hoy, después las tareas que necesitan tu aporte."
        icon="myDay"
      />
      <MyDayAndReferencesList />
    </div>
  );
}
