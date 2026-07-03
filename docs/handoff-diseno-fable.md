# Traspaso a Fable 5 — pase final de diseño y estilo

Este documento es para la sesión de Fable 5 que va a darle los toques
finales visuales al kanban. Léelo completo antes de tocar nada.

## Qué es esto

Un kanban 100% estático (HTML/CSS/JS vanilla, sin build, sin dependencias)
para GitHub Pages. Funciona: departamentos como espacios de trabajo,
tarjetas con prioridad/etiquetas, drag & drop, dashboard con KPIs y
gráficos, y agentes de Cowork que reportan su estado automáticamente como
tarjetas (badge 🤖). Todo funcional, probado de punta a punta. Lo que falta
es una pasada de diseño — hoy es deliberadamente minimalista/utilitario,
construido priorizando que funcione antes que se vea bien.

## Tu encargo: SOLO diseño y estilo

- Sí: `css/styles.css`, clases/atributos en `index.html`, el favicon SVG
  inline, micro-copy si mejora la UX (textos de botones, placeholders).
- No: no cambies la lógica de `js/` — ningún archivo dentro de `js/core/`,
  `js/ui/*.js` (la parte de JS, no el CSS que aplican), ni `js/agents/`.
  Si algo requiere un cambio de comportamiento (no solo visual) para verse
  bien, dejalo anotado y pregúntale al usuario en vez de tocarlo — esta
  pasada es de estilo, no de producto.
- No agregues dependencias, frameworks de CSS, ni un paso de build. El
  proyecto se sirve tal cual, directo, sin compilar nada — eso es
  intencional (ver README.md).

## Sistema de diseño ya establecido — no lo tires, evolúcionalo

`css/styles.css` ya define tokens como custom properties CSS, con soporte
claro/oscuro vía `@media (prefers-color-scheme: dark)`:

- Colores base: `--color-bg`, `--color-surface`, `--color-text`,
  `--color-primary`, etc. (líneas 1-40 aprox.)
- Colores de prioridad: `--prio-alta-bg/text`, `--prio-media-*`, `--prio-baja-*`.
- Tokens de visualización (para el Dashboard): `--viz-series-1`,
  `--viz-prio-baja/media/alta`, `--viz-track` — vienen de una rampa ordinal
  de azul **ya validada** para daltonismo con el script
  `scripts/validate_palette.js` del skill de dataviz (contraste,
  monotonía de luminosidad, separación CVD). Si cambias estos colores,
  vuelve a validar la nueva rampa — no los reemplaces a ojo.
- `[hidden] { display: none !important; }` es una regla global a propósito
  (evita que clases con `display` propio peleen con el atributo `hidden`
  que usa el JS para mostrar/ocultar vistas) — no la borres.

Puedes reorganizar, renombrar o ampliar tokens, pero mantén el patrón
"token con variante clara + variante oscura", y sigue validando cualquier
paleta nueva para gráficos con el script de dataviz antes de aplicarla.

## Restricciones no negociables (por accesibilidad/usabilidad, ya cumplidas hoy)

- Contraste mínimo AA (WCAG), texto ≥14px cuerpo / ≥16px en inputs móviles.
- Área táctil mínima 44px en botones (`.btn` ya lo tiene — no la reduzcas).
- Mobile-first: el layout cambia de columnas apiladas a fila a partir de
  720px (`@media (min-width: 720px)`) — pruébalo en ambos tamaños siempre.
- Estados de carga/error/vacío siempre visibles (ya existen: `.empty-state`,
  el indicador de sincronización, los mensajes de tabla vacía en el
  Dashboard) — no los quites ni los dejes en blanco.
- Un botón primario por vista (ya es así: "+ Nueva tarjeta") — no agregues
  un segundo call-to-action que compita.

## Rough edges concretos que vale la pena pulir

Basado en capturas reales (escritorio 1280px y móvil 390px, claro y oscuro,
con 5 departamentos para forzar overflow):

1. **Indicador "Agentes: sincronizado/error…" en el header** — en móvil
   ocupa su propia línea completa bajo el título ("Agentes: error parcial ·
   hace instantes"), se ve un poco perdido. Podría ser más compacto (un
   punto de color + tooltip, en vez de texto completo) en pantallas
   angostas, manteniendo el texto completo en escritorio.
2. **Pestañas de departamento con overflow** — con más de ~4 departamentos
   en móvil, la barra hace scroll horizontal (funciona), pero no hay ninguna
   pista visual de que hay más contenido a los lados (sin fade/gradiente en
   los bordes). Vale la pena un indicio sutil de scroll.
3. **Badge de agente (🤖)** — hoy es un emoji plano dentro de un chip
   genérico reutilizando `.badge`. Podría tener tratamiento propio
   (tamaño, forma, color) para distinguirse mejor del badge de prioridad
   sin competir con él.
4. **Barras del Dashboard** — la pista sin llenar (`--viz-track`) y el
   relleno sólido cumplen la regla de "un hue, monótono" del skill de
   dataviz, pero visualmente son planas. Hay margen para mejorar jerarquía
   tipográfica de los títulos de cada tarjeta (`.viz-title`) y el ritmo de
   espaciado entre KPIs/gráficos/tabla sin romper la semántica de color.
5. **Favicon** — un SVG inline de 3 barras muy básico
   (`index.html`, `<link rel="icon">`). Es el único lugar con un ícono de
   marca; puede mejorarse manteniendo el mismo mecanismo (data URI inline,
   sin archivo externo, para no romper el "cero dependencias").
6. **Menú `⋯`** — hoy es una lista plana de texto (Sincronizar agentes,
   Nueva columna, Exportar, Importar). Podría beneficiarse de iconos o
   agrupación visual (acciones de agentes vs. acciones de tablero).

Ninguno de estos es un bug — son oportunidades de pulido, tal como pidió
el usuario.

## Cómo probar tus cambios (mismo patrón usado en todo el proyecto)

No hay tests automatizados (proyecto sin build). Verifica siempre en
navegador real:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Si tienes Playwright disponible, el patrón usado en este proyecto es:
capturar screenshot en escritorio (1280×800) y móvil (390×844), en
`colorScheme: "light"` y `"dark"`, con al menos un departamento con varias
tarjetas y prioridades distintas para ver los badges. Repite ese patrón
para validar cualquier cambio antes de darlo por terminado.

Para revalidar una paleta de color nueva para el Dashboard:
```bash
node <ruta-del-skill-dataviz>/scripts/validate_palette.js "<hex,hex,...>" --mode light
```
(y de nuevo con `--mode dark` contra la superficie oscura).

## Flujo de git

Igual que el resto del proyecto: trabaja en una rama (`claude/...`), commitea
con mensajes descriptivos, push, abre PR contra `main`, y fusiona — GitHub
Pages (modo clásico, `Settings → Pages → Deploy from a branch: main`)
reconstruye solo en cada push a `main`, sin workflow propio.

## Dónde NO tocar

- `js/agents/sync.js`, `js/core/store.js`, `js/core/columnMatch.js`,
  `js/core/slug.js` — lógica de sincronización de agentes, funcional y ya
  verificada. Un cambio visual no debería requerir tocar estos archivos.
- La rama `data` del repo — es almacenamiento de estado de agentes, no
  código ni assets de diseño.
- `docs/protocolo-agentes.md` y `docs/agentes/*.md` — instrucciones para
  los agentes de Cowork, no relacionadas con el diseño visual.
