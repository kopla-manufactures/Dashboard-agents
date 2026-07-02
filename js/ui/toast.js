/** Notificación breve no bloqueante. */
let timer = null;

export function showToast(message, ms = 3000) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => {
    el.hidden = true;
  }, ms);
}
