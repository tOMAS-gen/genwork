"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/components/ui/useApi";
import { createAutosave, type SaveState } from "@/lib/domain/editor/autosave";

type DocumentPatch = { content?: unknown; title?: string };

export function useDocumentAutosave(url: string, method: "PATCH" | "PUT", delay = 800) {
  const [status, setStatus] = useState<SaveState>("idle");
  const autosave = useMemo(
    () =>
      createAutosave<DocumentPatch>({
        delay,
        onState: setStatus,
        save: async (value) => {
          const body = JSON.stringify(value);
          await api(url, { method, body, keepalive: new Blob([body]).size < 60_000 });
        },
      }),
    [url, method, delay],
  );

  useEffect(() => {
    const flush = () => {
      void autosave.flush();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!autosave.hasUnsavedChanges()) return;
      flush();
      event.preventDefault();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", beforeUnload);
      flush();
    };
  }, [autosave]);

  return { status, schedule: autosave.schedule, retry: autosave.flush };
}
