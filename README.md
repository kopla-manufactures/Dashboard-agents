# Kanban — Dashboard Agents

Tablero kanban 100 % estático: sin build, sin dependencias, sin backend.
Funciona directo en GitHub Pages y también abriendo `index.html` con cualquier
servidor estático local.

## Probar

**En GitHub Pages (una sola vez):**
1. En el repo: **Settings → Pages → Source: GitHub Actions**.
2. Haz merge de esta rama a `main` (o pushea a `main`). El workflow
   `.github/workflows/deploy-pages.yml` publica automáticamente.
3. La URL queda en `https://<usuario>.github.io/Dashboard-agents/`.

**En local:**
```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Qué hace hoy (Fase 1.5)

- **Departamentos como espacios de trabajo**: Diseño, Junta directiva,
  Marketing y Mantenimiento vienen de fábrica; crea más con «+ Departamento».
  Tocar dos veces la pestaña activa permite renombrar o eliminar.
- **Dashboard ejecutivo** (pestaña Dashboard): KPIs globales, tareas activas
  por departamento, distribución por prioridad y tabla «Atención requerida»
  (prioridad alta pendiente, la más antigua primero) para decidir dónde actuar.
- Columnas: crear, renombrar (tocar el título), eliminar.
- Tarjetas: crear, editar, eliminar, con prioridad y etiquetas.
- Mover tarjetas: drag & drop en escritorio; en móvil, desde el selector de
  columna al editar la tarjeta.
- Persistencia en `localStorage` (migración automática de datos v1 → v2).
- Exportar / importar el tablero como JSON (menú `⋯`).
- API programática para agentes expuesta como `window.KanbanAPI`.

> El dashboard considera «terminada» una tarea que está en una columna cuyo
> título sugiere cierre (hecho, done, completado, terminado, finalizado, listo).

## Arquitectura (modular por capas)

```
index.html            Estructura de la página
css/styles.css        Tokens de diseño (colores, radios) + estilos; claro/oscuro
js/
  app.js              Punto de entrada: cablea todo
  config.js           Configuración central (qué adaptador de storage se usa)
  core/               Lógica pura, sin DOM
    eventBus.js       Pub/sub que desacopla las capas
    store.js          Estado + mutaciones + esquema de datos (version 1)
    storage.js        Persistencia con patrón adaptador (hoy: localStorage)
  ui/                 Solo DOM, reacciona a eventos del bus
    board.js          Render de columnas/tarjetas + drag & drop
    deptBar.js        Pestañas de departamentos
    dashboard.js      Dashboard ejecutivo (KPIs, barras, tabla de atención)
    cardDialog.js     Formulario crear/editar tarjeta
    toast.js          Notificaciones breves
  agents/
    api.js            API estable para agentes (window.KanbanAPI)
```

Reglas de dependencia: `ui/` y `agents/` dependen de `core/`; `core/` no
depende de nadie. Nada se importa entre `ui/` y `agents/` — se comunican por
eventos del bus. Esto permite arreglar o reemplazar una capa sin tocar las
demás.

## Conectar agentes (la vía preparada)

Un agente opera el tablero solo a través de `KanbanAPI`:

```js
// Desde la consola del navegador o cualquier script cargado en la página:
const dept = KanbanAPI.findDepartment("Marketing");
KanbanAPI.createCard({ title: "Programar posts", departmentId: dept.id, agent: "agent:marketing" });
KanbanAPI.listDepartments();                       // [{ id, name, cardCount }]
KanbanAPI.on("card:moved", (e) => console.log("se movió", e));
```

Cada tarjeta guarda `createdBy` (`"user"` o `"agent:<nombre>"`), así que el
origen queda trazado desde ya.

## Hoja de ruta escalonada

- **Fase 1:** kanban personal, localStorage, API de agentes en página. ✅
- **Fase 1.5 (esta):** departamentos como espacios de trabajo + dashboard
  ejecutivo. ✅
- **Fase 2:** nuevo adaptador de storage (p. ej. GitHub API sobre un JSON del
  repo, o un backend REST) — solo se cambia `js/config.js`.
- **Fase 3:** agentes externos escribiendo por ese backend compartido;
  filtros por `createdBy`, vistas por persona/equipo.

## Esquema de datos (version 2)

```json
{
  "version": 2,
  "activeDepartmentId": "…",
  "departments": [
    {
      "id": "…", "name": "Marketing",
      "columns": [{ "id": "…", "title": "Pendiente", "cardIds": ["…"] }],
      "cards": {
        "…": {
          "id": "…", "title": "…", "description": "…",
          "priority": "baja|media|alta", "tags": ["…"],
          "createdBy": "user | agent:<nombre>", "createdAt": 0, "updatedAt": 0
        }
      }
    }
  ]
}
```

Los datos guardados con el esquema v1 (un solo tablero) se migran solos: el
tablero anterior aparece como departamento «General».
