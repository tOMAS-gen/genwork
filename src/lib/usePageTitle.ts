import { useEffect, useRef } from "react";

export function usePageTitle(title: string | undefined | null) {
  const desired = title ? `${title} — ›genwork` : "›genwork";
  const ref = useRef(desired);
  ref.current = desired;

  useEffect(() => {
    document.title = ref.current;

    const el = document.querySelector("title");
    if (!el) return;

    const obs = new MutationObserver(() => {
      if (document.title !== ref.current) {
        document.title = ref.current;
      }
    });
    obs.observe(el, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [desired]);
}
