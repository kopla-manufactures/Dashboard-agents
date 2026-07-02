/**
 * Dashboard ejecutivo: agrega métricas de todos los departamentos para
 * apoyar decisiones estratégicas. Solo HTML+CSS, sin librerías.
 *
 * Una columna cuenta como "final" (trabajo terminado) si su título sugiere
 * cierre: hecho/done/completado/terminado/finalizado/listo.
 */
import { bus } from "../core/eventBus.js";
import { DONE_RE } from "../core/columnMatch.js";

const PRIORITIES = ["baja", "media", "alta"];

function computeMetrics(state) {
  const perDept = state.departments.map((dept) => {
    const doneColumnIds = new Set(
      dept.columns.filter((c) => DONE_RE.test(c.title)).map((c) => c.id)
    );
    let active = 0;
    let done = 0;
    const byPriority = { baja: 0, media: 0, alta: 0 };
    const attention = [];

    for (const column of dept.columns) {
      for (const cardId of column.cardIds) {
        const card = dept.cards[cardId];
        if (!card) continue;
        if (doneColumnIds.has(column.id)) {
          done++;
          continue;
        }
        active++;
        byPriority[card.priority] = (byPriority[card.priority] ?? 0) + 1;
        if (card.priority === "alta") {
          attention.push({ card, deptName: dept.name, columnTitle: column.title });
        }
      }
    }
    return { dept, active, done, byPriority, attention };
  });

  const totals = perDept.reduce(
    (acc, d) => {
      acc.active += d.active;
      acc.done += d.done;
      acc.alta += d.byPriority.alta;
      return acc;
    },
    { active: 0, done: 0, alta: 0 }
  );
  totals.agentCards = state.departments.reduce(
    (n, d) => n + Object.values(d.cards).filter((c) => c.createdBy?.startsWith("agent")).length,
    0
  );

  const attention = perDept
    .flatMap((d) => d.attention)
    .sort((a, b) => a.card.createdAt - b.card.createdAt)
    .slice(0, 8);

  return { perDept, totals, attention };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statTile(label, value) {
  const tile = el("div", "stat-tile");
  tile.append(el("p", "stat-label", label), el("p", "stat-value", String(value)));
  return tile;
}

/** Barras horizontales: tareas activas por departamento (una sola serie). */
function chartActiveByDept(perDept) {
  const card = el("section", "viz-card");
  card.appendChild(el("h3", "viz-title", "Tareas activas por departamento"));
  const max = Math.max(1, ...perDept.map((d) => d.active));

  for (const d of perDept) {
    const row = el("div", "hbar-row");
    row.title = `${d.dept.name}: ${d.active} activa(s), ${d.done} terminada(s)`;
    const label = el("span", "hbar-label", d.dept.name);
    const track = el("div", "hbar-track");
    if (d.active > 0) {
      const bar = el("div", "hbar-fill");
      bar.style.width = `${(d.active / max) * 100}%`;
      track.appendChild(bar);
    }
    const value = el("span", "hbar-value", String(d.active));
    row.append(label, track, value);
    card.appendChild(row);
  }
  return card;
}

/** Barras apiladas por prioridad (rampa ordinal azul: baja→alta). */
function chartPriorityByDept(perDept) {
  const card = el("section", "viz-card");
  card.appendChild(el("h3", "viz-title", "Prioridad de tareas activas"));

  const legend = el("div", "viz-legend");
  for (const p of PRIORITIES) {
    const item = el("span", "legend-item");
    item.append(el("span", `legend-swatch prio-${p}`), el("span", null, p));
    legend.appendChild(item);
  }
  card.appendChild(legend);

  const max = Math.max(1, ...perDept.map((d) => d.active));
  for (const d of perDept) {
    const row = el("div", "hbar-row");
    const parts = PRIORITIES.map((p) => `${p}: ${d.byPriority[p]}`).join(" · ");
    row.title = `${d.dept.name} — ${parts}`;
    const label = el("span", "hbar-label", d.dept.name);
    const track = el("div", "hbar-track hbar-stack");
    for (const p of PRIORITIES) {
      const n = d.byPriority[p];
      if (!n) continue;
      const seg = el("div", `hbar-fill prio-${p}`);
      seg.style.width = `${(n / max) * 100}%`;
      track.appendChild(seg);
    }
    const value = el("span", "hbar-value", String(d.active));
    row.append(label, track, value);
    card.appendChild(row);
  }
  return card;
}

/** Tabla de decisión: tareas de prioridad alta pendientes, las más viejas primero. */
function attentionTable(attention) {
  const card = el("section", "viz-card");
  card.appendChild(el("h3", "viz-title", "Atención requerida — prioridad alta pendiente"));

  if (attention.length === 0) {
    card.appendChild(el("p", "viz-empty", "Sin tareas de prioridad alta pendientes. ✓"));
    return card;
  }

  const table = el("table", "viz-table");
  const thead = el("thead");
  const hr = el("tr");
  for (const h of ["Tarea", "Departamento", "Estado", "Días abierta"]) {
    hr.appendChild(el("th", null, h));
  }
  thead.appendChild(hr);
  const tbody = el("tbody");
  const now = Date.now();
  for (const { card: c, deptName, columnTitle } of attention) {
    const tr = el("tr");
    const days = Math.floor((now - c.createdAt) / 86400000);
    tr.append(
      el("td", null, c.title),
      el("td", null, deptName),
      el("td", null, columnTitle),
      el("td", "num", String(days))
    );
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  card.appendChild(table);
  return card;
}

export function initDashboard({ store, dashboardEl }) {
  function render() {
    if (dashboardEl.hidden) return;
    const { perDept, totals, attention } = computeMetrics(store.state);

    dashboardEl.innerHTML = "";

    const kpis = el("div", "kpi-row");
    kpis.append(
      statTile("Tareas activas", totals.active),
      statTile("Prioridad alta pendiente", totals.alta),
      statTile("Terminadas", totals.done),
      statTile("Creadas por agentes", totals.agentCards)
    );
    dashboardEl.appendChild(kpis);

    const grid = el("div", "viz-grid");
    grid.append(chartActiveByDept(perDept), chartPriorityByDept(perDept));
    dashboardEl.appendChild(grid);

    dashboardEl.appendChild(attentionTable(attention));
  }

  bus.on("state:changed", render);
  return { render };
}
