/**
 * Regex tolerantes a que el usuario haya renombrado columnas, usadas tanto
 * por el dashboard (detectar columnas de cierre) como por la sincronización
 * de agentes (mapear status → columna destino).
 */
export const PENDING_RE = /pendient|to.?do|backlog|por hacer/i;
export const PROGRESS_RE = /progreso|en curso|doing|desarroll|ejecuci/i;
export const DONE_RE = /hech|done|complet|termin|finaliz|listo/i;

/**
 * Resuelve el id de columna destino para un status de agente ("pendiente" |
 * "en_progreso" | "hecho"). Si ninguna columna coincide con la regex
 * esperada, cae a la primera columna (o la última si el status es "hecho").
 */
export function resolveColumnForStatus(department, status) {
  const columns = department.columns;
  if (!columns.length) return null;
  const re = status === "hecho" ? DONE_RE : status === "en_progreso" ? PROGRESS_RE : PENDING_RE;
  const match = columns.find((c) => re.test(c.title));
  if (match) return match.id;
  return status === "hecho" ? columns[columns.length - 1].id : columns[0].id;
}
