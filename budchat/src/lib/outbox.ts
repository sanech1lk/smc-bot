"use client";

// A small IndexedDB-backed outbox so chat messages and photos taken with no
// signal on site aren't lost — they queue locally and flush automatically
// once the connection comes back.

const DB_NAME = "budchat-outbox";
const STORE = "items";

export interface OutboxMessageItem {
  id: string;
  kind: "message";
  stageId: string;
  content: string;
  createdAt: number;
}

export interface OutboxPhotoItem {
  id: string;
  kind: "photo";
  stageId: string;
  blob: Blob;
  tag: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  createdAt: number;
}

export type OutboxItem = OutboxMessageItem | OutboxPhotoItem;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function enqueueOutboxItem(item: OutboxItem): Promise<void> {
  await withStore("readwrite", (store) => store.put(item));
}

/**
 * IndexedDB can be unavailable entirely (Safari private browsing, storage
 * blocked by policy). Callers use this to decorate the UI, so a failure must
 * degrade to "no queued items" rather than reject and break the screen.
 */
export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  try {
    return await withStore<OutboxItem[]>("readonly", (store) => store.getAll());
  } catch (err) {
    console.warn("Outbox unavailable", err);
    return [];
  }
}

export async function removeOutboxItem(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function countPendingForStage(stageId: string): Promise<number> {
  const items = await getAllOutboxItems();
  return items.filter((i) => i.stageId === stageId).length;
}

interface FlushCallbacks {
  onMessageSent?: (item: OutboxMessageItem, saved: unknown) => void;
  onMessageFailed?: (item: OutboxMessageItem) => void;
  onPhotoSent?: (item: OutboxPhotoItem, saved: unknown) => void;
  onPhotoFailed?: (item: OutboxPhotoItem) => void;
}

let flushing = false;

/** Sends every queued item in creation order, stopping at the first network failure so order is preserved. */
export async function flushOutbox(callbacks: FlushCallbacks = {}): Promise<void> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return;
  flushing = true;
  try {
    const items = (await getAllOutboxItems()).sort((a, b) => a.createdAt - b.createdAt);

    for (const item of items) {
      try {
        if (item.kind === "message") {
          const res = await fetch(`/api/stages/${item.stageId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: item.content, type: "TEXT" })
          });
          if (!res.ok) throw new Error("send failed");
          const data = await res.json();
          await removeOutboxItem(item.id);
          callbacks.onMessageSent?.(item, data.message);
        } else {
          const formData = new FormData();
          formData.append("file", item.blob, "photo.jpg");
          formData.append("tag", item.tag);
          if (item.lat != null) formData.append("lat", String(item.lat));
          if (item.lng != null) formData.append("lng", String(item.lng));
          if (item.accuracy != null) formData.append("accuracy", String(item.accuracy));

          const res = await fetch(`/api/stages/${item.stageId}/photos`, { method: "POST", body: formData });
          if (!res.ok) throw new Error("send failed");
          const data = await res.json();
          await removeOutboxItem(item.id);
          callbacks.onPhotoSent?.(item, data.photo);
        }
      } catch {
        // Network dropped again mid-flush — stop here, keep the rest queued for next time.
        if (item.kind === "message") callbacks.onMessageFailed?.(item);
        else callbacks.onPhotoFailed?.(item);
        break;
      }
    }
  } finally {
    flushing = false;
  }
}
