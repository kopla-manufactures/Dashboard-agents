/**
 * Diálogo de sincronización entre dispositivos: estado actual y gestión del
 * token de escritura. Solo DOM; habla con la capa de sync por su API pública
 * y escucha sus eventos por el bus.
 */
import { bus } from "../core/eventBus.js";

export function initSyncDialog({ dialogEl, boardSync }) {
  const form = dialogEl.querySelector("#sync-form");
  const tokenInput = form.elements.token;
  const statusEl = dialogEl.querySelector("#sync-status");
  const removeBtn = dialogEl.querySelector("#btn-sync-remove");
  const closeBtn = dialogEl.querySelector("#btn-sync-close");

  const fmt = (ts) =>
    ts ? new Date(ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "—";

  function render(status = boardSync.getStatus()) {
    removeBtn.hidden = !status.hasToken;
    statusEl.textContent = status.hasToken
      ? `Lectura y escritura activadas · última subida ${fmt(status.lastPushAt)} · última lectura ${fmt(status.lastPullAt)}`
      : `Solo lectura (sin token en este dispositivo) · última lectura ${fmt(status.lastPullAt)}`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const token = tokenInput.value.trim();
    if (token) {
      boardSync.setToken(token);
      tokenInput.value = "";
      boardSync.push(); // primera subida inmediata: valida el token en la práctica
    }
    dialogEl.close();
  });

  removeBtn.addEventListener("click", () => {
    if (confirm("¿Quitar el token de este dispositivo? Quedará en solo lectura.")) {
      boardSync.setToken("");
      render();
    }
  });

  closeBtn.addEventListener("click", () => dialogEl.close());
  bus.on("board:sync:status", render);

  return {
    open() {
      render();
      dialogEl.showModal();
    },
  };
}
