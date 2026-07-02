/**
 * Punto de entrada: instancia el store, monta la UI y expone la API de agentes.
 */
import { createStorageAdapter } from "./config.js";
import { Store } from "./core/store.js";
import { initBoard } from "./ui/board.js";
import { initCardDialog } from "./ui/cardDialog.js";
import { showToast } from "./ui/toast.js";
import { createAgentAPI } from "./agents/api.js";

const store = new Store(createStorageAdapter());
createAgentAPI(store);

const dialog = initCardDialog({
  store,
  dialogEl: document.getElementById("card-dialog"),
});

initBoard({
  store,
  boardEl: document.getElementById("board"),
  emptyStateEl: document.getElementById("empty-state"),
  onEditCard: (cardId) => dialog.openEdit(cardId),
});

// ---- Header ---------------------------------------------------------------

document.getElementById("btn-add-card").addEventListener("click", () => {
  if (store.state.columns.length === 0) {
    showToast("Primero crea una columna");
    return;
  }
  dialog.openNew();
});

const menuBtn = document.getElementById("btn-menu");
const menuPanel = document.getElementById("menu-panel");

function closeMenu() {
  menuPanel.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  menuPanel.hidden = !menuPanel.hidden;
  menuBtn.setAttribute("aria-expanded", String(!menuPanel.hidden));
});
document.addEventListener("click", (e) => {
  if (!menuPanel.hidden && !menuPanel.contains(e.target)) closeMenu();
});

document.getElementById("btn-add-column").addEventListener("click", () => {
  closeMenu();
  const title = prompt("Nombre de la nueva columna:");
  if (title?.trim()) store.createColumn(title);
});

// ---- Exportar / importar ----------------------------------------------------

document.getElementById("btn-export").addEventListener("click", () => {
  closeMenu();
  const blob = new Blob([store.exportJSON()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kanban-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Tablero exportado");
});

const importInput = document.getElementById("import-file");

document.getElementById("btn-import").addEventListener("click", () => {
  closeMenu();
  importInput.click();
});

importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  importInput.value = "";
  if (!file) return;
  if (!confirm("Importar reemplaza el tablero actual. ¿Continuar?")) return;
  try {
    store.importJSON(await file.text());
    showToast("Tablero importado");
  } catch (err) {
    showToast(`Error al importar: ${err.message}`);
  }
});
