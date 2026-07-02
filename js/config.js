/**
 * Configuración central. Para cambiar de backend de persistencia en el
 * futuro, basta con exportar otro adaptador desde aquí.
 */
import { LocalStorageAdapter } from "./core/storage.js";

export const STORAGE_KEY = "kanban-dashboard-agents-v1";

export function createStorageAdapter() {
  return new LocalStorageAdapter(STORAGE_KEY);
}
