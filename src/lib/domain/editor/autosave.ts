export type SaveState = "idle" | "saving" | "saved" | "error";

/** Debounces edits and serializes writes so a slow response cannot overwrite newer text. */
export function createAutosave<T extends object>(options: {
  save: (value: T) => Promise<void>;
  onState: (state: SaveState) => void;
  delay: number;
}) {
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;

  const flush = (): Promise<void> => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (running) return running;
    if (!pending) return Promise.resolve();

    options.onState("saving");
    // Start on the next microtask so `running` is set even if save throws synchronously.
    running = Promise.resolve()
      .then(async () => {
        while (pending) {
          const snapshot = pending;
          pending = null;
          try {
            await options.save(snapshot);
          } catch {
          pending = Object.assign({}, snapshot, pending);
            options.onState("error");
            return;
          }
        }
        options.onState("saved");
      })
      .finally(() => {
        running = null;
      });
    return running;
  };

  return {
    schedule(value: T) {
      pending = { ...pending, ...value };
      options.onState("saving");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, options.delay);
    },
    flush,
    hasUnsavedChanges: () => pending !== null || running !== null,
  };
}
