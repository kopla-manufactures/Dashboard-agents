/**
 * API pública para agentes — el punto de conexión futuro.
 *
 * Cualquier agente (script externo, extensión, bot que corra en la página,
 * o un backend que hable con un adaptador de storage) opera el tablero a
 * través de esta interfaz estable, nunca tocando el store o el DOM directo.
 *
 * Uso desde la consola del navegador o desde otro módulo:
 *   KanbanAPI.createCard({ title: "Tarea creada por agente", agent: "mi-bot" })
 *   KanbanAPI.listColumns()
 *   KanbanAPI.onChange((state) => console.log(state))
 */
import { bus } from "../core/eventBus.js";

export function createAgentAPI(store) {
  const api = {
    /** Snapshot de solo lectura del estado completo. */
    getState() {
      return structuredClone(store.state);
    },

    listColumns() {
      return store.state.columns.map(({ id, title, cardIds }) => ({
        id,
        title,
        cardCount: cardIds.length,
      }));
    },

    listCards(columnId = null) {
      const ids = columnId
        ? store.getColumn(columnId)?.cardIds ?? []
        : Object.keys(store.state.cards);
      return ids.map((id) => structuredClone(store.getCard(id)));
    },

    /** `agent` identifica quién crea la tarjeta; queda en card.createdBy. */
    createCard({ title, description, priority, tags, columnId, agent = "agent:anon" }) {
      return structuredClone(
        store.createCard({ title, description, priority, tags, columnId, createdBy: agent })
      );
    },

    updateCard(cardId, changes) {
      return structuredClone(store.updateCard(cardId, changes));
    },

    moveCard(cardId, toColumnId) {
      store.moveCard(cardId, toColumnId);
    },

    deleteCard(cardId) {
      store.deleteCard(cardId);
    },

    createColumn(title) {
      return structuredClone(store.createColumn(title));
    },

    /** Suscribirse a cambios de estado. Devuelve función para desuscribirse. */
    onChange(handler) {
      return bus.on("state:changed", ({ state }) => handler(structuredClone(state)));
    },

    /** Suscribirse a un evento puntual: "card:created", "card:moved", etc. */
    on(event, handler) {
      return bus.on(event, handler);
    },
  };

  // Expuesta en window para poder probar agentes desde la consola hoy mismo.
  window.KanbanAPI = api;
  return api;
}
