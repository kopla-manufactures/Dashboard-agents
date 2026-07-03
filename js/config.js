/**
 * Configuración central. Para cambiar de backend de persistencia en el
 * futuro, basta con exportar otro adaptador desde aquí.
 */
import { LocalStorageAdapter } from "./core/storage.js";

export const STORAGE_KEY = "kanban-dashboard-agents-v1";

export function createStorageAdapter() {
  return new LocalStorageAdapter(STORAGE_KEY);
}

/**
 * Sincronización del tablero entre dispositivos (Fase 2, local-first):
 * localStorage sigue siendo la fuente inmediata; esta capa lee/escribe una
 * copia completa del tablero en board.json de la rama `data` del repo.
 * Leer no requiere credenciales (CDN público); escribir requiere un token
 * fine-grained de GitHub guardado por dispositivo — ver
 * docs/sincronizacion-dispositivos.md.
 */
export const REMOTE_SYNC = {
  owner: "kopla-manufactures",
  repo: "Dashboard-agents",
  branch: "data",
  path: "board.json",
  pullIntervalMs: 5 * 60 * 1000,
  pushDebounceMs: 4000,
  tokenKey: "kanban-sync-token",
  metaKey: "kanban-sync-meta",
};
