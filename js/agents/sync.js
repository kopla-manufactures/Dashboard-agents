/**
 * Sincroniza el estado que reportan agentes de Cowork hacia el kanban.
 *
 * Cada agente escribe su avance como un archivo JSON en la rama `data` de
 * este mismo repo (agents/<slug-departamento>.json) — ver
 * docs/protocolo-agentes.md para el protocolo exacto. Este módulo lee esos
 * archivos vía raw.githubusercontent.com (CDN de GitHub, sin token, CORS
 * abierto) y hace upsert de tarjetas en el store. Sin DOM: emite eventos por
 * el bus, la UI (js/ui/syncStatus.js) reacciona a ellos.
 */
import { bus } from "../core/eventBus.js";
import { slugify } from "../core/slug.js";

const RAW_BASE = "https://raw.githubusercontent.com/kopla-manufactures/Dashboard-agents/data/agents";
const VALID_STATUS = new Set(["pendiente", "en_progreso", "hecho"]);

export function createAgentSync({ store, baseUrl = RAW_BASE, fetchImpl = fetch }) {
  let timer = null;

  async function syncDepartment(dept) {
    const slug = slugify(dept.name);
    const res = await fetchImpl(`${baseUrl}/${slug}.json?t=${Date.now()}`, { cache: "no-store" });
    if (res.status === 404) return { departmentId: dept.id, slug, ok: true, itemCount: 0, skipped: true };
    if (!res.ok) throw new Error(`HTTP ${res.status} para ${slug}.json`);
    const data = await res.json();

    let itemCount = 0;
    for (const item of data.items ?? []) {
      if (!item?.id || !VALID_STATUS.has(item.status)) continue; // ítem inválido: se ignora, no rompe el resto
      store.upsertSyncedCard({
        departmentId: dept.id,
        syncId: String(item.id),
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: item.status,
        agent: data.agent || "agent:desconocido",
      });
      itemCount++;
    }
    return { departmentId: dept.id, slug, ok: true, itemCount };
  }

  async function syncAll() {
    bus.emit("agents:sync:start", {});
    const settled = await Promise.allSettled(store.state.departments.map(syncDepartment));
    const results = settled.map((r, i) => {
      const dept = store.state.departments[i];
      return r.status === "fulfilled"
        ? r.value
        : { departmentId: dept.id, slug: slugify(dept.name), ok: false, error: r.reason?.message ?? "error desconocido" };
    });
    bus.emit("agents:sync:done", { results, timestamp: Date.now() });
    return results;
  }

  /** Sincroniza ya, y reintenta cada `intervalMs` mientras la pestaña esté abierta. */
  function start(intervalMs = 5 * 60 * 1000) {
    syncAll();
    timer = setInterval(syncAll, intervalMs);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  return { syncAll, start, stop };
}
