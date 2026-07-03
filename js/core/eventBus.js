/**
 * Bus de eventos pub/sub. Desacopla core, UI y futuros agentes:
 * nadie se importa entre sí, solo emiten/escuchan eventos.
 *
 * Eventos usados hoy:
 *  - "state:changed"  → { state } tras cualquier mutación
 *  - "card:created" | "card:updated" | "card:deleted" | "card:moved"
 *  - "column:created" | "column:renamed" | "column:deleted"
 *  - "department:created" | "department:renamed" | "department:deleted" | "department:activated"
 *  - "agents:sync:start" → {}
 *  - "agents:sync:done"  → { results: [{departmentId, slug, ok, itemCount?, skipped?, error?}], timestamp }
 *  - "board:sync:pulled" → { savedAt } · "board:sync:pushed" → {}
 *  - "board:sync:status" → { hasToken, lastPullAt, lastPushAt }
 *  - "board:sync:error"  → { op: "pull"|"push", message }
 */
const listeners = new Map();

export const bus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => bus.off(event, handler);
  },

  off(event, handler) {
    listeners.get(event)?.delete(handler);
  },

  emit(event, payload) {
    listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[bus] error en handler de "${event}"`, err);
      }
    });
  },
};
