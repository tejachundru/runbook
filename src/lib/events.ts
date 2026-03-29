/**
 * Lightweight cross-component event bus using the browser's built-in CustomEvent.
 * Used to notify the sidebar (and any other listener) when notebooks or folders change.
 */

export const DATA_CHANGED_EVENT = "nb:data-changed";

/** Dispatch after any create / update / delete / restore operation. */
export function emitDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}

/** Subscribe to data-change notifications. Returns an unsubscribe function. */
export function onDataChanged(cb: () => void): () => void {
  window.addEventListener(DATA_CHANGED_EVENT, cb);
  return () => window.removeEventListener(DATA_CHANGED_EVENT, cb);
}

// ─── Save status event ────────────────────────────────────────────────────────

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const SAVE_STATUS_EVENT = "nb:save-status";

export function emitSaveStatus(status: SaveStatus) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVE_STATUS_EVENT, { detail: status }));
  }
}

export function onSaveStatus(cb: (status: SaveStatus) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<SaveStatus>).detail);
  window.addEventListener(SAVE_STATUS_EVENT, handler);
  return () => window.removeEventListener(SAVE_STATUS_EVENT, handler);
}
