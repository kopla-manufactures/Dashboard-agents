# Sincronizar el tablero entre dispositivos

Desde la Fase 2 el tablero puede verse y editarse igual desde cualquier
dispositivo (PC, celular, otra laptop). Cómo funciona:

- El tablero completo se guarda como `board.json` en la rama `data` de este
  repositorio, con marca de tiempo.
- **Leer** no requiere nada: cualquier dispositivo que abra la página baja la
  última versión automáticamente (al cargar y cada 5 minutos).
- **Escribir** requiere un token de GitHub guardado en ese dispositivo (una
  sola vez). Sin token, el dispositivo queda en solo lectura: ve los cambios
  de los demás pero sus ediciones no se replican.

## Crear el token (una sola vez, ~2 minutos)

1. Entra a GitHub → tu avatar → **Settings** → **Developer settings** →
   **Fine-grained tokens** → **Generate new token**.
2. Nombre: `kanban-sync` (o el que quieras). Expiración: la que prefieras
   (cuando expire, simplemente generas otro y lo vuelves a pegar).
3. **Repository access**: *Only select repositories* → elige
   `Dashboard-agents`.
4. **Permissions → Repository permissions → Contents**: *Read and write*.
   Nada más — ningún otro permiso.
5. **Generate token** y copia el `github_pat_…` (solo se muestra una vez).

## Activarlo en cada dispositivo

1. Abre el kanban → menú `⋯` → **Sincronizar dispositivos…**
2. Pega el token → **Guardar**. Se sube el tablero de inmediato como prueba.
3. Repite en cada dispositivo desde el que quieras editar. El token se
   guarda solo en el navegador de ese dispositivo (localStorage) — nunca se
   sube al repo ni viaja a otro lado que no sea la API de GitHub.

## Qué esperar

- Los cambios se suben solos unos segundos después de editar; los demás
  dispositivos los ven al recargar o en el siguiente ciclo (≤5 min, por la
  caché del CDN de GitHub).
- **Conflictos**: si editas en dos dispositivos a la vez sin que alcancen a
  sincronizarse, gana la última escritura (el tablero completo). Para uso
  personal es el comportamiento razonable; evita editar en dos aparatos
  exactamente al mismo tiempo.
- **Dispositivo nuevo**: al abrir por primera vez, espera unos segundos a
  que baje el tablero antes de crear tarjetas — si editas antes de la
  primera lectura, tu versión local (vacía) puede quedar como la más
  reciente.

## Privacidad

El repositorio es público, así que `board.json` (títulos y descripciones de
tus tareas) es visible para cualquiera que sepa dónde mirar. Si eso te
importa, haz el repo privado (Settings → General → Danger Zone → Change
visibility): la sincronización sigue funcionando, solo que la lectura pasará
a usar también el token, así que todos los dispositivos (incluso los de solo
lectura) necesitarán tenerlo configurado. Ojo: GitHub Pages en plan gratuito
requiere repo público — hacer el repo privado apaga la página publicada, y
tendrías que abrir `index.html` desde otro hosting o localmente.
