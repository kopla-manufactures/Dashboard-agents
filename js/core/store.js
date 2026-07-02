/**
 * Store: única fuente de verdad del estado del tablero.
 *
 * Esquema de datos (version 1):
 * {
 *   version: 1,
 *   columns: [ { id, title, cardIds: [cardId, ...] } ],
 *   cards: {
 *     [id]: { id, title, description, priority, tags, createdBy, createdAt, updatedAt }
 *   }
 * }
 *
 * `createdBy` distingue el origen ("user" hoy, "agent:<nombre>" en el futuro).
 * Toda mutación pasa por los métodos del store, se persiste y emite eventos
 * por el bus — la UI y los agentes solo reaccionan a eventos.
 */
import { bus } from "./eventBus.js";

const SCHEMA_VERSION = 1;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedState() {
  const col = (title) => ({ id: uid(), title, cardIds: [] });
  const columns = [col("Pendiente"), col("En progreso"), col("Hecho")];
  const card = {
    id: uid(),
    title: "Bienvenido a tu Kanban",
    description:
      "Arrastra esta tarjeta entre columnas, o tócala para editarla y moverla desde el formulario.",
    priority: "media",
    tags: ["ejemplo"],
    createdBy: "user",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  columns[0].cardIds.push(card.id);
  return { version: SCHEMA_VERSION, columns, cards: { [card.id]: card } };
}

export class Store {
  constructor(adapter) {
    this.adapter = adapter;
    this.state = adapter.load() ?? seedState();
    this.persist();
  }

  persist() {
    this.adapter.save(this.state);
    bus.emit("state:changed", { state: this.state });
  }

  getColumn(columnId) {
    return this.state.columns.find((c) => c.id === columnId) ?? null;
  }

  getCard(cardId) {
    return this.state.cards[cardId] ?? null;
  }

  findColumnOfCard(cardId) {
    return this.state.columns.find((c) => c.cardIds.includes(cardId)) ?? null;
  }

  // ---- Tarjetas ----------------------------------------------------------

  createCard({ title, description = "", priority = "media", tags = [], columnId, createdBy = "user" }) {
    const column = this.getColumn(columnId) ?? this.state.columns[0];
    if (!column) throw new Error("No hay columnas donde crear la tarjeta");
    if (!title?.trim()) throw new Error("La tarjeta necesita un título");

    const card = {
      id: uid(),
      title: title.trim(),
      description,
      priority,
      tags,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.state.cards[card.id] = card;
    column.cardIds.push(card.id);
    this.persist();
    bus.emit("card:created", { card, columnId: column.id });
    return card;
  }

  updateCard(cardId, changes) {
    const card = this.getCard(cardId);
    if (!card) throw new Error(`Tarjeta no encontrada: ${cardId}`);
    Object.assign(card, changes, { id: card.id, updatedAt: Date.now() });
    this.persist();
    bus.emit("card:updated", { card });
    return card;
  }

  deleteCard(cardId) {
    const column = this.findColumnOfCard(cardId);
    if (column) column.cardIds = column.cardIds.filter((id) => id !== cardId);
    delete this.state.cards[cardId];
    this.persist();
    bus.emit("card:deleted", { cardId });
  }

  /** Mueve una tarjeta a otra columna (al final, o en `index` si se indica). */
  moveCard(cardId, toColumnId, index = null) {
    const from = this.findColumnOfCard(cardId);
    const to = this.getColumn(toColumnId);
    if (!from || !to) throw new Error("Columna origen o destino no encontrada");

    from.cardIds = from.cardIds.filter((id) => id !== cardId);
    if (index === null || index < 0 || index > to.cardIds.length) {
      to.cardIds.push(cardId);
    } else {
      to.cardIds.splice(index, 0, cardId);
    }
    this.getCard(cardId).updatedAt = Date.now();
    this.persist();
    bus.emit("card:moved", { cardId, fromColumnId: from.id, toColumnId: to.id });
  }

  // ---- Columnas ----------------------------------------------------------

  createColumn(title) {
    if (!title?.trim()) throw new Error("La columna necesita un título");
    const column = { id: uid(), title: title.trim(), cardIds: [] };
    this.state.columns.push(column);
    this.persist();
    bus.emit("column:created", { column });
    return column;
  }

  renameColumn(columnId, title) {
    const column = this.getColumn(columnId);
    if (!column) throw new Error(`Columna no encontrada: ${columnId}`);
    if (!title?.trim()) return column;
    column.title = title.trim();
    this.persist();
    bus.emit("column:renamed", { column });
    return column;
  }

  deleteColumn(columnId) {
    const column = this.getColumn(columnId);
    if (!column) return;
    column.cardIds.forEach((id) => delete this.state.cards[id]);
    this.state.columns = this.state.columns.filter((c) => c.id !== columnId);
    this.persist();
    bus.emit("column:deleted", { columnId });
  }

  // ---- Import / export ---------------------------------------------------

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(json) {
    const data = JSON.parse(json);
    if (data?.version !== SCHEMA_VERSION || !Array.isArray(data.columns) || typeof data.cards !== "object") {
      throw new Error("El archivo no tiene el formato esperado (version 1)");
    }
    this.state = data;
    this.persist();
  }
}
