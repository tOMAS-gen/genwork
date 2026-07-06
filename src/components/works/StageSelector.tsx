"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/ui/useApi";
import { ChevronDown } from "@/components/ui/icons";

export interface StageDto {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
}

export function StageSelector({
  workId,
  groupId,
  currentStage,
  onChanged,
}: {
  workId: string;
  groupId: string | null;
  currentStageId: string | null;
  currentStage: { id: string; name: string; color: string | null } | null;
  onChanged: () => void;
}) {
  const [stages, setStages] = useState<StageDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    const url = groupId
      ? `/api/stages?groupId=${groupId}`
      : `/api/stages?personal=true`;
    api<StageDto[]>(url)
      .then((data) => {
        if (!cancelled) setStages(data);
      })
      .catch(() => {
        if (!cancelled) setStages([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (loaded && stages.length === 0) return null;
  if (!loaded) return null;

  const assign = async (stageId: string | null) => {
    if (stageId === (currentStage?.id ?? null)) return;
    try {
      await api(`/api/works/${workId}`, {
        method: "PATCH",
        body: JSON.stringify({ stageId }),
      });
      onChanged();
    } catch {
      // silencioso
    }
  };

  const stageColor = currentStage?.color ?? "var(--muted)";

  return (
    <span className="stage-select-wrap" style={{ color: stageColor }}>
      <select
        className="stage-select"
        value={currentStage?.id ?? ""}
        onChange={(e) => void assign(e.target.value || null)}
        aria-label="Estado del proyecto"
      >
        <option value="">Sin estado</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="stage-select-chevron" />
    </span>
  );
}
