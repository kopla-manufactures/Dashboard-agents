/**
 * Indicador de estado de la sincronización de agentes en el header. Solo
 * DOM: reacciona a los eventos de js/agents/sync.js por el bus, nunca lo
 * importa directo.
 */
import { bus } from "../core/eventBus.js";

export function initSyncStatus({ indicatorEl, triggerBtn, syncAll }) {
  let lastSync = null;
  let state = "idle"; // idle | syncing | ok | error

  function render() {
    indicatorEl.classList.toggle("is-error", state === "error");
    if (state === "syncing") {
      indicatorEl.textContent = "Agentes: sincronizando…";
      return;
    }
    if (!lastSync) {
      indicatorEl.textContent = "Agentes: sin sincronizar";
      return;
    }
    const mins = Math.max(0, Math.round((Date.now() - lastSync) / 60000));
    const when = mins < 1 ? "hace instantes" : `hace ${mins} min`;
    indicatorEl.textContent =
      state === "error" ? `Agentes: error parcial · ${when}` : `Agentes: sincronizado ${when}`;
  }

  bus.on("agents:sync:start", () => {
    state = "syncing";
    render();
  });
  bus.on("agents:sync:done", ({ results }) => {
    lastSync = Date.now();
    state = results.some((r) => !r.ok) ? "error" : "ok";
    render();
  });

  triggerBtn?.addEventListener("click", () => syncAll());
  setInterval(render, 30000); // refresca el texto relativo ("hace N min") sin pedir red
  render();
}
