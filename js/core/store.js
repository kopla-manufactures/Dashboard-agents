/**
 * Store: única fuente de verdad del estado.
 *
 * Esquema de datos (version 2 — espacios de trabajo por departamento):
 * {
 *   version: 2,
 *   activeDepartmentId: "…",
 *   departments: [
 *     {
 *       id, name,
 *       columns: [ { id, title, cardIds: [cardId, ...] } ],
 *       cards: { [id]: { id, title, description, priority, tags,
 *                        createdBy, createdAt, updatedAt } }
 *     }
 *   ]
 * }
 *
 * Los ids de columnas y tarjetas son únicos globalmente, así que las
 * operaciones sobre tarjetas/columnas reciben solo el id y el store resuelve
 * a qué departamento pertenecen — la UI y los agentes no cargan con ese dato.
 *
 * `createdBy` distingue el origen ("user" hoy, "agent:<nombre>" mañana).
 * Toda mutación pasa por el store, se persiste y emite eventos por el bus.
 */
import { bus } from "./eventBus.js";

const SCHEMA_VERSION = 2;

const SEED_DEPARTMENTS = ["Diseño", "Junta directiva", "Marketing", "Mantenimiento"];
const SEED_COLUMNS = ["Pendiente", "En progreso", "Hecho"];

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDepartment(name) {
  return {
    id: uid(),
    name,
    columns: SEED_COLUMNS.map((title) => ({ id: uid(), title, cardIds: [] })),
    cards: {},
  };
}

function seedState() {
  const departments = SEED_DEPARTMENTS.map(emptyDepartment);
  return {
    version: SCHEMA_VERSION,
    activeDepartmentId: departments[0].id,
    departments,
  };
}

/** v1 (un solo tablero) → v2: el tablero existente pasa a ser "General". */
function migrateV1(v1) {
  const general = {
    id: uid(),
    name: "General",
    columns: v1.columns,
    cards: v1.cards,
  };
  const departments = [general, ...SEED_DEPARTMENTS.map(emptyDepartment)];
  return {
    version: SCHEMA_VERSION,
    activeDepartmentId: general.id,
    departments,
  };
}

export class Store {
  constructor(adapter) {
    this.adapter = adapter;
    const loaded = adapter.load();
    if (!loaded) this.state = seedState();
    else if (loaded.version === 1) this.state = migrateV1(loaded);
    else this.state = loaded;
    this.persist();
  }

  persist() {
    this.adapter.save(this.state);
    bus.emit("state:changed", { state: this.state });
  }

  // ---- Resolución (ids únicos globales) -----------------------------------

  getDepartment(departmentId) {
    return this.state.departments.find((d) => d.id === departmentId) ?? null;
  }

  get activeDepartment() {
    return this.getDepartment(this.state.activeDepartmentId) ?? this.state.departments[0] ?? null;
  }

  /** Departamento que contiene la columna. */
  findDepartmentOfColumn(columnId) {
    return this.state.departments.find((d) => d.columns.some((c) => c.id === columnId)) ?? null;
  }

  /** Departamento que contiene la tarjeta. */
  findDepartmentOfCard(cardId) {
    return this.state.departments.find((d) => d.cards[cardId]) ?? null;
  }

  getColumn(columnId) {
    for (const d of this.state.departments) {
      const col = d.columns.find((c) => c.id === columnId);
      if (col) return col;
    }
    return null;
  }

  getCard(cardId) {
    for (const d of this.state.departments) {
      if (d.cards[cardId]) return d.cards[cardId];
    }
    return null;
  }

  findColumnOfCard(cardId) {
    for (const d of this.state.departments) {
      const col = d.columns.find((c) => c.cardIds.includes(cardId));
      if (col) return col;
    }
    return null;
  }

  // ---- Departamentos ------------------------------------------------------

  createDepartment(name) {
    if (!name?.trim()) throw new Error("El departamento necesita un nombre");
    const department = emptyDepartment(name.trim());
    this.state.departments.push(department);
    this.persist();
    bus.emit("department:created", { department });
    return department;
  }

  renameDepartment(departmentId, name) {
    const department = this.getDepartment(departmentId);
    if (!department) throw new Error(`Departamento no encontrado: ${departmentId}`);
    if (!name?.trim()) return department;
    department.name = name.trim();
    this.persist();
    bus.emit("department:renamed", { department });
    return department;
  }

  deleteDepartment(departmentId) {
    const department = this.getDepartment(departmentId);
    if (!department) return;
    this.state.departments = this.state.departments.filter((d) => d.id !== departmentId);
    if (this.state.activeDepartmentId === departmentId) {
      this.state.activeDepartmentId = this.state.departments[0]?.id ?? null;
    }
    this.persist();
    bus.emit("department:deleted", { departmentId });
  }

  setActiveDepartment(departmentId) {
    if (!this.getDepartment(departmentId)) return;
    this.state.activeDepartmentId = departmentId;
    this.persist();
    bus.emit("department:activated", { departmentId });
  }

  // ---- Tarjetas -----------------------------------------------------------

  createCard({ title, description = "", priority = "media", tags = [], columnId, createdBy = "user" }) {
    const column = this.getColumn(columnId) ?? this.activeDepartment?.columns[0];
    if (!column) throw new Error("No hay columnas donde crear la tarjeta");
    if (!title?.trim()) throw new Error("La tarjeta necesita un título");
    const department = this.findDepartmentOfColumn(column.id);

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
    department.cards[card.id] = card;
    column.cardIds.push(card.id);
    this.persist();
    bus.emit("card:created", { card, columnId: column.id, departmentId: department.id });
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
    const department = this.findDepartmentOfCard(cardId);
    if (!department) return;
    const column = this.findColumnOfCard(cardId);
    if (column) column.cardIds = column.cardIds.filter((id) => id !== cardId);
    delete department.cards[cardId];
    this.persist();
    bus.emit("card:deleted", { cardId });
  }

  /**
   * Mueve una tarjeta a otra columna (al final, o en `index`). Si la columna
   * destino es de otro departamento, la tarjeta se traslada de espacio.
   */
  moveCard(cardId, toColumnId, index = null) {
    const from = this.findColumnOfCard(cardId);
    const to = this.getColumn(toColumnId);
    if (!from || !to) throw new Error("Columna origen o destino no encontrada");

    const fromDept = this.findDepartmentOfCard(cardId);
    const toDept = this.findDepartmentOfColumn(toColumnId);

    from.cardIds = from.cardIds.filter((id) => id !== cardId);
    if (fromDept.id !== toDept.id) {
      toDept.cards[cardId] = fromDept.cards[cardId];
      delete fromDept.cards[cardId];
    }
    if (index === null || index < 0 || index > to.cardIds.length) {
      to.cardIds.push(cardId);
    } else {
      to.cardIds.splice(index, 0, cardId);
    }
    this.getCard(cardId).updatedAt = Date.now();
    this.persist();
    bus.emit("card:moved", { cardId, fromColumnId: from.id, toColumnId: to.id });
  }

  // ---- Columnas -----------------------------------------------------------

  createColumn(title, departmentId = null) {
    const department = departmentId ? this.getDepartment(departmentId) : this.activeDepartment;
    if (!department) throw new Error("No hay departamento donde crear la columna");
    if (!title?.trim()) throw new Error("La columna necesita un título");
    const column = { id: uid(), title: title.trim(), cardIds: [] };
    department.columns.push(column);
    this.persist();
    bus.emit("column:created", { column, departmentId: department.id });
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
    const department = this.findDepartmentOfColumn(columnId);
    if (!department) return;
    const column = department.columns.find((c) => c.id === columnId);
    column.cardIds.forEach((id) => delete department.cards[id]);
    department.columns = department.columns.filter((c) => c.id !== columnId);
    this.persist();
    bus.emit("column:deleted", { columnId });
  }

  // ---- Import / export ----------------------------------------------------

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(json) {
    const data = JSON.parse(json);
    if (data?.version === 1 && Array.isArray(data.columns)) {
      this.state = migrateV1(data);
    } else if (data?.version === SCHEMA_VERSION && Array.isArray(data.departments)) {
      this.state = data;
    } else {
      throw new Error("El archivo no tiene el formato esperado (version 1 o 2)");
    }
    this.persist();
  }
}
