# Agentes de Cowork por departamento

Un archivo por departamento, listo para pegar tal cual en las instrucciones
persistentes (persona) de ese agente en Cowork. Cada uno trae:

- **Modelo recomendado** — según el tipo de trabajo del área (ver criterio
  abajo).
- **Rol** — una descripción breve de a qué se dedica ese agente.
- **Protocolo de reporte** — el bloque exacto para que el agente escriba su
  estado en el kanban (rama `data`, `agents/<slug>.json`). Es el mismo
  protocolo documentado en [`../protocolo-agentes.md`](../protocolo-agentes.md),
  ya adaptado con el `department`/`agent`/ruta de cada área — no hace falta
  tocar nada, solo copiar y pegar.

| Departamento | Archivo |
|---|---|
| Diseño | [`diseno.md`](diseno.md) |
| Junta directiva | [`junta-directiva.md`](junta-directiva.md) |
| Marketing | [`marketing.md`](marketing.md) |
| Mantenimiento | [`mantenimiento.md`](mantenimiento.md) |

## Cómo dar de alta un agente nuevo

1. Abre el archivo del departamento correspondiente.
2. Copia todo el contenido y pégalo en las instrucciones persistentes del
   agente en Cowork (junto con lo que ya le hayas configurado sobre su
   trabajo específico — este bloque se agrega, no reemplaza).
3. Confirma que ese agente tenga la herramienta de GitHub conectada a
   `kopla-manufactures/Dashboard-agents` con permiso de escritura. Sin esto
   no puede reportar — es un paso de Cowork, no de este repo.
4. Listo. La próxima vez que ese agente reporte su estado, la tarjeta
   aparece sola en el kanban, en la columna que corresponda.

## Departamento nuevo que no está en esta lista

Si creas un departamento nuevo en el tablero (botón «+ Departamento»), arma
su archivo copiando cualquiera de los existentes y cambiando tres cosas:
el nombre del archivo (`agents/<slug-del-nuevo-departamento>.json`, mismo
slug que usa el propio tablero: minúsculas, sin tildes, espacios→guiones),
el campo `"department"`, y el campo `"agent"`.

## Criterio de modelo recomendado

- **Opus** — decisiones estratégicas, alto riesgo de equivocarse, hay que
  pensar varios pasos adelante (ej. junta directiva).
- **Sonnet** — el default equilibrado: análisis, redacción, coordinación
  operativa del día a día (ej. marketing, mantenimiento).
- **Fable** — trabajo con criterio creativo/estético (ej. diseño). También
  es el modelo reservado para el pase final de diseño visual de esta misma
  app — ver [`../handoff-diseno-fable.md`](../handoff-diseno-fable.md).
- **Haiku** — tareas simples y repetitivas de alto volumen (ej. si un
  agente solo hace pings de estado muy frecuentes sin razonar mucho, se
  puede bajar a Haiku para abaratar costo).
