/**
 * Renderizado del tablero: columnas + tarjetas + drag & drop nativo.
 * Se re-renderiza completo en cada "state:changed" — con el volumen de un
 * kanban personal es más simple y suficientemente rápido.
 */
import { bus } from "../core/eventBus.js";

export function initBoard({ store, boardEl, emptyStateEl, onEditCard }) {
  function render() {
    const dept = store.activeDepartment;
    boardEl.innerHTML = "";
    emptyStateEl.hidden = boardEl.hidden || Boolean(dept && dept.columns.length > 0);
    if (!dept) return;

    for (const column of dept.columns) {
      boardEl.appendChild(renderColumn(column, dept.cards));
    }
  }

  function renderColumn(column, cards) {
    const section = document.createElement("section");
    section.className = "column";
    section.dataset.columnId = column.id;

    const header = document.createElement("div");
    header.className = "column-header";

    const title = document.createElement("button");
    title.className = "column-title";
    title.type = "button";
    title.textContent = column.title;
    title.title = "Tocar para renombrar";
    title.addEventListener("click", () => {
      const newTitle = prompt("Nombre de la columna:", column.title);
      if (newTitle !== null) store.renameColumn(column.id, newTitle);
    });

    const count = document.createElement("span");
    count.className = "column-count";
    count.textContent = String(column.cardIds.length);

    const del = document.createElement("button");
    del.className = "column-delete";
    del.type = "button";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Eliminar columna ${column.title}`);
    del.addEventListener("click", () => {
      const n = column.cardIds.length;
      const msg = n
        ? `Eliminar «${column.title}» y sus ${n} tarjeta(s)?`
        : `Eliminar la columna «${column.title}»?`;
      if (confirm(msg)) store.deleteColumn(column.id);
    });

    header.append(title, count, del);

    const list = document.createElement("ul");
    list.className = "card-list";
    list.dataset.columnId = column.id;

    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      list.classList.add("drag-over");
    });
    list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
    list.addEventListener("drop", (e) => {
      e.preventDefault();
      list.classList.remove("drag-over");
      const cardId = e.dataTransfer.getData("text/plain");
      if (cardId && store.getCard(cardId)) store.moveCard(cardId, column.id);
    });

    for (const cardId of column.cardIds) {
      const card = cards[cardId];
      if (card) list.appendChild(renderCard(card));
    }

    section.append(header, list);
    return section;
  }

  function renderCard(card) {
    const li = document.createElement("li");
    li.className = "card";
    li.draggable = true;
    li.dataset.cardId = card.id;

    const title = document.createElement("p");
    title.className = "card-title-text";
    title.textContent = card.title;
    li.appendChild(title);

    if (card.description) {
      const desc = document.createElement("p");
      desc.className = "card-desc";
      desc.textContent = card.description;
      li.appendChild(desc);
    }

    const meta = document.createElement("div");
    meta.className = "card-meta";

    const prio = document.createElement("span");
    prio.className = `badge badge-${card.priority}`;
    prio.textContent = card.priority;
    meta.appendChild(prio);

    for (const tag of card.tags ?? []) {
      const el = document.createElement("span");
      el.className = "tag";
      el.textContent = tag;
      meta.appendChild(el);
    }

    li.appendChild(meta);

    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.id);
      e.dataTransfer.effectAllowed = "move";
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", () => li.classList.remove("dragging"));
    li.addEventListener("click", () => onEditCard(card.id));

    return li;
  }

  bus.on("state:changed", render);
  render();
}
