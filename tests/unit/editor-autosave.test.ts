import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutosave } from "@/lib/domain/editor/autosave";

afterEach(() => vi.useRealTimers());

describe("document autosave", () => {
  it("combines rapid title/content edits into one write", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const onState = vi.fn();
    const autosave = createAutosave({ save, onState, delay: 800 });
    autosave.schedule({ content: "primero" });
    autosave.schedule({ title: "Título" });
    autosave.schedule({ content: "último" });
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledExactlyOnceWith({ title: "Título", content: "último" });
    expect(onState).toHaveBeenLastCalledWith("saved");
    expect(autosave.hasUnsavedChanges()).toBe(false);
  });

  it("flushes on navigation before the debounce delay", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const autosave = createAutosave({ save, onState: vi.fn(), delay: 800 });
    autosave.schedule({ content: "nuevo" });
    await autosave.flush();
    expect(save).toHaveBeenCalledExactlyOnceWith({ content: "nuevo" });
    await vi.runAllTimersAsync();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("serializes slow writes and saves the latest edit afterward", async () => {
    let finish!: () => void;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const autosave = createAutosave({ save, onState: vi.fn(), delay: 800 });
    autosave.schedule({ content: "primero" });
    const flushing = autosave.flush();
    await Promise.resolve();
    autosave.schedule({ content: "segundo" });
    void autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    finish();
    await flushing;
    expect(save).toHaveBeenNthCalledWith(2, { content: "segundo" });
  });

  it("keeps failed edits for retry, merging newer fields", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const onState = vi.fn();
    const autosave = createAutosave({ save, onState, delay: 800 });
    autosave.schedule({ title: "Título", content: "primero" });
    await autosave.flush();
    expect(onState).toHaveBeenLastCalledWith("error");
    expect(autosave.hasUnsavedChanges()).toBe(true);
    autosave.schedule({ content: "corregido" });
    await autosave.flush();
    expect(save).toHaveBeenLastCalledWith({ title: "Título", content: "corregido" });
    expect(autosave.hasUnsavedChanges()).toBe(false);
  });
});
