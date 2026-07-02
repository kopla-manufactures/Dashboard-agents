/**
 * API pública para agentes — el punto de conexión futuro.
 *
 * Cada departamento es un espacio de trabajo; un agente asignado a un área
 * (diseño, marketing, …) localiza su departamento y deposita subtareas ahí.
 * Los agentes operan solo por esta interfaz, nunca tocan store ni DOM.
 *
 * Uso desde la consola del navegador o desde otro módulo:
 *   const dept = KanbanAPI.findDepartment("Marketing");
 *   KanbanAPI.createCard({ title: "Programar posts", departmentId: dept.id, agent: "agent:marketing" });
 *   KanbanAPI.onChange((state) => console.log(state));
 */
import { bus } from "../core/eventBus.js";

export function createAgentAPI(store) {
  const api = {
    /** Snapshot de solo lectura del estado completo. */
    getState() {
      return structuredClone(store.state);
    },

    // ---- Departamentos ----------------------------------------------------

    listDepartments() {
      return store.state.departments.map(({ id, name, columns }) => ({
        id,
        name,
        cardCount: columns.reduce((n, c) => n + c.cardIds.length, 0),
      }));
    },

    /** Busca un departamento por nombre (sin distinguir mayúsculas). */
    findDepartment(name) {
      const dept = store.state.departments.find(
        (d) => d.name.toLowerCase() === String(name).toLowerCase()
      );
      return dept ? { id: dept.id, name: dept.name } : null;
    },

    createDepartment(name) {
      const { id } = store.createDepartment(name);
      return { id, name: store.getDepartment(id).name };
    },

    // ---- Columnas y tarjetas ----------------------------------------------

    /** Columnas de un departamento (del activo si no se indica). */
    listColumns(departmentId = null) {
      const dept = departmentId ? store.getDepartment(departmentId) : store.activeDepartment;
      return (dept?.columns ?? []).map(({ id, title, cardIds }) => ({
        id,
        title,
        cardCount: cardIds.length,
      }));
    },

    listCards(columnId = null) {
      if (columnId) {
        return (store.getColumn(columnId)?.cardIds ?? []).map((id) =>
          structuredClone(store.getCard(id))
        );
      }
      return store.state.departments.flatMap((d) =>
        Object.values(d.cards).map((c) => structuredClone(c))
      );
    },

    /**
     * Crea una tarjeta. Destino, en orden de precedencia:
     * `columnId` explícito → primera columna de `departmentId` → departamento activo.
     * `agent` identifica quién la crea; queda en card.createdBy.
     */
    createCard({ title, description, priority, tags, columnId, departmentId, agent = "agent:anon" }) {
      let targetColumnId = columnId;
      if (!targetColumnId && departmentId) {
        targetColumnId = store.getDepartment(departmentId)?.columns[0]?.id;
      }
      return structuredClone(
        store.createCard({
          title,
          description,
          priority,
          tags,
          columnId: targetColumnId,
          createdBy: agent,
        })
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

    createColumn(title, departmentId = null) {
      return structuredClone(store.createColumn(title, departmentId));
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
