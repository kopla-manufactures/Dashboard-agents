/**
 * Capa de persistencia con patrón adaptador.
 *
 * Hoy: LocalStorageAdapter (funciona en GitHub Pages sin backend).
 * Mañana: se puede escribir un GitHubApiAdapter, RestApiAdapter, etc.
 * con la misma interfaz { load(), save(state) } y cambiarlo en config.js
 * sin tocar el resto de la app.
 */

export class LocalStorageAdapter {
  constructor(key) {
    this.key = key;
  }

  /** @returns {object|null} estado guardado, o null si no hay nada / está corrupto */
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("[storage] estado corrupto, se ignora", err);
      return null;
    }
  }

  save(state) {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch (err) {
      console.error("[storage] no se pudo guardar", err);
    }
  }
}
