/** Antrean sinkronisasi hasil permainan untuk kondisi offline/intermiten. */
import { supabaseApi } from "./supabase-api.js";

export const SYNC_QUEUE_KEY = "ppnGameSyncQueueV3";
const MAX_ITEMS = 150;

function safeParse(value, fallback = []) { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } }
function uuid() { return globalThis.crypto?.randomUUID?.() || `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export class SyncQueue {
  constructor(storage = window.localStorage) { this.storage = storage; }

  read() {
    const rows = safeParse(this.storage.getItem(SYNC_QUEUE_KEY), []);
    return Array.isArray(rows) ? rows.filter(item => item?.id && item?.payload && item?.ownerId) : [];
  }

  write(rows) {
    this.storage.setItem(SYNC_QUEUE_KEY, JSON.stringify(rows.slice(-MAX_ITEMS)));
    window.dispatchEvent(new CustomEvent("ppn:queue-changed", { detail: this.summary() }));
  }

  enqueue(ownerId, payload, error = "") {
    if (!ownerId || !payload) return null;
    const duplicate = this.read().find(item => item.ownerId === ownerId && item.payload?.metadata?.clientSessionId && item.payload.metadata.clientSessionId === payload?.metadata?.clientSessionId);
    if (duplicate) return duplicate;
    const item = { id: uuid(), ownerId, payload, queuedAt: new Date().toISOString(), attempts: 0, nextAttemptAt: 0, lastError: String(error || "") };
    this.write([...this.read(), item]);
    return item;
  }

  remove(id) { this.write(this.read().filter(item => item.id !== id)); }
  clearFor(ownerId) { this.write(this.read().filter(item => item.ownerId !== ownerId)); }

  summary(ownerId = null) {
    const rows = this.read().filter(item => !ownerId || item.ownerId === ownerId);
    return { total: rows.length, failed: rows.filter(item => item.attempts > 0).length, nextAttemptAt: rows.length ? Math.min(...rows.map(item => Number(item.nextAttemptAt || 0)).filter(Boolean), Infinity) : 0 };
  }

  async flush(ownerId, { force = false } = {}) {
    if (!ownerId || !supabaseApi.configured || !supabaseApi.accessToken) return { synced: 0, remaining: this.summary(ownerId).total };
    if (!navigator.onLine && supabaseApi.backendMode === "supabase") return { synced: 0, remaining: this.summary(ownerId).total };
    const now = Date.now();
    const all = this.read();
    const next = [];
    let synced = 0;

    for (const item of all) {
      if (item.ownerId !== ownerId) { next.push(item); continue; }
      if (!force && item.nextAttemptAt && item.nextAttemptAt > now) { next.push(item); continue; }
      try {
        await supabaseApi.invoke("submit-game-session", { action: "quick", ...item.payload });
        synced += 1;
      } catch (error) {
        const attempts = Number(item.attempts || 0) + 1;
        const delay = Math.min(15 * 60_000, 5_000 * (2 ** Math.min(attempts - 1, 8)));
        next.push({ ...item, attempts, nextAttemptAt: now + delay, lastError: error.message || "Sinkronisasi gagal" });
      }
    }

    this.write(next);
    return { synced, remaining: next.filter(item => item.ownerId === ownerId).length };
  }
}

export const syncQueue = new SyncQueue();
