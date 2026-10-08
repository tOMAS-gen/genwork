/**
 * Subida de un archivo al visor del proyecto con progreso.
 *
 * Con Google Drive el archivo va directo del navegador a Google (URL de sesión
 * que prepara el servidor), sin consumir el ancho de banda de genwork. Con
 * Nextcloud, o si la subida directa no puede arrancar, va en streaming por
 * `/api/upload-stream/{id}`.
 */

export class UploadAbortedError extends Error {
  constructor() {
    super("Subida cancelada");
    this.name = "UploadAbortedError";
  }
}

interface XhrResult {
  status: number;
  body: string;
  /** Bytes enviados antes de terminar (para saber si la subida llegó a arrancar). */
  sent: number;
}

/** `XMLHttpRequest` porque `fetch` no informa el progreso de subida. */
function send(
  method: string,
  url: string,
  file: File,
  opts: { contentType?: string; onProgress: (loaded: number) => void; signal: AbortSignal },
): Promise<XhrResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal.aborted) return reject(new UploadAbortedError());
    const xhr = new XMLHttpRequest();
    let sent = 0;
    const onAbort = () => xhr.abort();
    xhr.open(method, url);
    if (opts.contentType) xhr.setRequestHeader("Content-Type", opts.contentType);
    xhr.upload.onprogress = (e) => {
      sent = e.loaded;
      opts.onProgress(e.loaded);
    };
    xhr.onload = () => {
      opts.signal.removeEventListener("abort", onAbort);
      resolve({ status: xhr.status, body: xhr.responseText, sent });
    };
    xhr.onerror = () => {
      opts.signal.removeEventListener("abort", onAbort);
      resolve({ status: 0, body: "", sent });
    };
    xhr.onabort = () => {
      opts.signal.removeEventListener("abort", onAbort);
      reject(new UploadAbortedError());
    };
    opts.signal.addEventListener("abort", onAbort);
    xhr.send(file);
  });
}

function errorMessage(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
    if (parsed.error?.code === "STORAGE_UNAVAILABLE") return "El almacenamiento no está configurado";
    return parsed.error?.message || fallback;
  } catch {
    return fallback;
  }
}

async function viaProxy(
  workId: string,
  file: File,
  path: string,
  onProgress: (loaded: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const qs = new URLSearchParams({ name: file.name });
  if (path) qs.set("path", path);
  const res = await send("POST", `/api/upload-stream/${workId}?${qs}`, file, {
    contentType: "application/octet-stream",
    onProgress,
    signal,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      res.status === 0
        ? "Se cortó la conexión durante la subida"
        : errorMessage(res.body, "No se pudo subir el archivo"),
    );
  }
}

export async function uploadWorkFile(
  workId: string,
  file: File,
  path: string,
  opts: { onProgress: (loaded: number) => void; signal: AbortSignal },
): Promise<void> {
  const sessionRes = await fetch(`/api/works/${workId}/files/upload/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name: file.name, size: file.size, mimeType: file.type || null }),
    signal: opts.signal,
  }).catch((err: unknown) => {
    if (opts.signal.aborted) throw new UploadAbortedError();
    throw err;
  });
  if (!sessionRes.ok) {
    throw new Error(errorMessage(await sessionRes.text(), "No se pudo preparar la subida"));
  }
  const session = (await sessionRes.json()) as { mode: "direct"; uploadUrl: string } | { mode: "proxy" };

  if (session.mode === "proxy") {
    return viaProxy(workId, file, path, opts.onProgress, opts.signal);
  }

  const res = await send("PUT", session.uploadUrl, file, opts);
  if (res.status === 0 && res.sent === 0) {
    // La subida directa no llegó a arrancar (red o CORS bloqueado): se reintenta
    // por genwork para no dejar al usuario sin subir.
    opts.onProgress(0);
    return viaProxy(workId, file, path, opts.onProgress, opts.signal);
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      res.status === 0
        ? "Se cortó la conexión durante la subida"
        : errorMessage(res.body, `Google Drive rechazó la subida (HTTP ${res.status})`),
    );
  }
  // Aviso a los demás clientes; si falla, el archivo ya está subido igual.
  await fetch(`/api/works/${workId}/files/upload/complete`, { method: "POST" }).catch(() => undefined);
}
