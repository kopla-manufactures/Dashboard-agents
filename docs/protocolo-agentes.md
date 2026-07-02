# Protocolo para agentes de Cowork — reportar estado al kanban

Este documento es para pegar (o resumir) en las instrucciones persistentes de
cada agente de Cowork que deba reportar su avance al kanban de
Dashboard-agents.

## Qué debes hacer

Cada vez que quieras reportar en qué estás trabajando, escribe (crea o
actualiza) UN archivo JSON en este mismo repositorio, en la RAMA `data`
(nunca en `main`), en la ruta:

    agents/<tu-slug-de-departamento>.json

El slug se deriva del nombre del departamento tal como aparece en el
tablero: minúsculas, sin tildes, espacios reemplazados por guiones.
Ejemplos: "Marketing" → `marketing.json`; "Junta directiva" →
`junta-directiva.json`. Si no estás seguro del nombre exacto del
departamento, pregúntalo antes de inventar un slug.

## Formato exacto del archivo

```json
{
  "department": "Marketing",
  "agent": "agent:marketing-cowork",
  "updatedAt": "2026-07-02T18:30:00Z",
  "items": [
    {
      "id": "campana-julio",
      "title": "Preparar campaña de julio",
      "description": "Definiendo calendario y presupuesto",
      "status": "en_progreso",
      "priority": "alta",
      "updatedAt": "2026-07-02T18:29:00Z"
    }
  ]
}
```

Reglas:
- `id`: identificador ESTABLE que tú eliges (texto simple, sin espacios,
  p. ej. `campana-julio`). Reutilízalo en cada actualización de la misma
  tarea — así el dashboard actualiza la tarjeta en vez de duplicarla.
- `status`: uno de `pendiente`, `en_progreso`, `hecho` (exactamente así,
  en minúsculas).
- `priority`: uno de `baja`, `media`, `alta`.
- `items` es la lista COMPLETA de tus tareas activas — cada vez que
  escribas el archivo, sobrescribe todo el arreglo (no es un parche
  incremental).
- El campo `agent` debe empezar con `agent:` — así el dashboard distingue
  visualmente tus tarjetas de las creadas a mano (badge 🤖).

## Cómo escribir el archivo (tool call esperado)

Usa la herramienta de GitHub disponible en tu sesión (equivalente a
`create_or_update_file`) con estos parámetros:

- `owner`: `kopla-manufactures`
- `repo`: `Dashboard-agents`
- `branch`: `data`
- `path`: `agents/<tu-slug>.json`
- `content`: el JSON de arriba (formateado)
- `message`: `"sync: actualizar estado de <departamento>"`
- `sha`: si el archivo YA existe, primero consulta su contenido actual
  (`get_file_contents` con `branch: "data"`) para obtener el `sha` y
  pasarlo aquí; si no existe (primera vez), omite `sha`.

## Qué NO hacer

- No escribas en `main` — solo en `data`.
- No inventes rutas fuera de `agents/`.
- No uses un `id` distinto para la misma tarea en sincronizaciones
  sucesivas: perderías el historial de esa tarjeta (se crearía una
  duplicada).

## Frecuencia

No hay límite estricto, pero recuerda que la lectura del dashboard
cachea ~5 minutos (CDN de GitHub) — reportar más seguido que eso no
acelera lo que el usuario ve.

## Prerrequisito

Necesitas la herramienta de GitHub conectada a este repo con permiso de
escritura. Si tu sesión de Cowork no la tiene, pídele al usuario que la
configure antes de intentar reportar.
