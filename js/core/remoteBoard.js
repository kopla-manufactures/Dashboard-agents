/**
 * Sincronización local-first del tablero completo entre dispositivos.
 *
 * El estado vive en localStorage (carga instantánea, funciona offline) y
 * esta capa lo replica como un sobre { savedAt, state } en board.json de la
 * rama `data` del repo:
 *
 *  - pull: al cargar y cada pullIntervalMs. Lee primero por el CDN público
 *    (raw.githubusercontent.com, sin credenciales); si falla y hay token,
 *    reintenta por la API (cubre el caso de repo privado). Solo aplica el
 *    remoto si su savedAt es más nuevo que el último cambio local.
 *  - push: tras cada mutación local (debounce), vía la API de GitHub con el
 *    token del dispositivo. Sin token, el dispositivo queda en solo lectura.
 *
 * Conflictos: gana la última escritura (tablero completo). Suficiente para
 * un kanban personal; documentado en docs/sincronizacion-dispositivos.md.
 */
import { bus } from "./eventBus.js";

/** btoa seguro para UTF-8 (títulos con tildes/emoji). */
function b64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64DecodeUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function createBoardSync({ store, config, fetchImpl = fetch }) {
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
  const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${config.path}`;

  const meta = { lastSavedAt: 0, lastPullAt: null, lastPushAt: null };
  try {
    Object.assign(meta, JSON.parse(localStorage.getItem(config.metaKey)) ?? {});
  } catch { /* meta corrupta: se parte de cero */ }
  const saveMeta = () => localStorage.setItem(config.metaKey, JSON.stringify(meta));

  let applyingRemote = false;
  let pushTimer = null;
  let knownSha = null;

  const getToken = () => localStorage.getItem(config.tokenKey) || "";

  function setToken(token) {
    if (token?.trim()) localStorage.setItem(config.tokenKey, token.trim());
    else localStorage.removeItem(config.tokenKey);
    bus.emit("board:sync:status", getStatus());
  }

  function getStatus() {
    return {
      hasToken: Boolean(getToken()),
      lastPullAt: meta.lastPullAt,
      lastPushAt: meta.lastPushAt,
    };
  }

  const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  });

  async function fetchEnvelope() {
    // 1) CDN público: gratis, sin límite práctico (repo público)
    try {
      const res = await fetchImpl(`${rawUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) return await res.json();
      if (res.status === 404 && !getToken()) return null;
      if (res.status !== 404 && res.status !== 403) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (!getToken()) throw err;
    }
    // 2) API con token (repo privado, o CDN no disponible)
    const token = getToken();
    if (!token) return null;
    const res = await fetchImpl(`${apiUrl}?ref=${config.branch}`, { headers: authHeaders(token) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    knownSha = data.sha;
    return JSON.parse(b64DecodeUtf8(data.content));
  }

  async function pull() {
    try {
      const envelope = await fetchEnvelope();
      meta.lastPullAt = Date.now();
      if (envelope?.state && (envelope.savedAt ?? 0) > meta.lastSavedAt) {
        applyingRemote = true;
        try {
          store.importJSON(JSON.stringify(envelope.state));
        } finally {
          applyingRemote = false;
        }
        meta.lastSavedAt = envelope.savedAt;
        bus.emit("board:sync:pulled", { savedAt: envelope.savedAt });
      }
      saveMeta();
      bus.emit("board:sync:status", getStatus());
    } catch (err) {
      bus.emit("board:sync:error", { op: "pull", message: err.message });
    }
  }

  async function fetchSha(token) {
    const res = await fetchImpl(`${apiUrl}?ref=${config.branch}`, { headers: authHeaders(token) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).sha;
  }

  async function push() {
    const token = getToken();
    if (!token) return;
    try {
      const envelope = { savedAt: meta.lastSavedAt, state: store.state };
      const base = {
        message: "sync: tablero",
        content: b64EncodeUtf8(JSON.stringify(envelope, null, 2)),
        branch: config.branch,
      };
      const attempt = (sha) =>
        fetchImpl(apiUrl, {
          method: "PUT",
          headers: { ...authHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify(sha ? { ...base, sha } : base),
        });

      let sha = knownSha ?? (await fetchSha(token));
      let res = await attempt(sha);
      if (res.status === 409 || res.status === 422) {
        // sha desactualizado (otro dispositivo escribió): refrescar y reintentar una vez
        sha = await fetchSha(token);
        res = await attempt(sha);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      knownSha = (await res.json()).content?.sha ?? null;
      meta.lastPushAt = Date.now();
      saveMeta();
      bus.emit("board:sync:pushed", {});
      bus.emit("board:sync:status", getStatus());
    } catch (err) {
      bus.emit("board:sync:error", { op: "push", message: err.message });
    }
  }

  function onStateChanged() {
    if (applyingRemote) return; // el cambio vino del remoto: no re-subirlo
    meta.lastSavedAt = Date.now();
    saveMeta();
    if (!getToken()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, config.pushDebounceMs);
  }

  function start() {
    bus.on("state:changed", onStateChanged);
    pull();
    setInterval(pull, config.pullIntervalMs);
  }

  return { start, pull, push, setToken, getToken, getStatus };
}
