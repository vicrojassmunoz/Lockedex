# TODO de Lockedex

Notas para retomar el trabajo en otra sesión. Lo primero es el mapa del proyecto; después, las dos tareas grandes pendientes y la lista de mejoras.

## Mapa rápido del proyecto

- `web/`: la app (SvelteKit 1.0.0-next.570 + Svelte 3 + Tailwind 3, adapter-node). Es un fork de nuzlocke-redux.
  - `web/src/lib/lockedex/`: **todo lo propio de Lockedex**. Incluye la barra Pokédex (`Barra.svelte`), la tarjeta al pasar el ratón (`InfoFlotante.svelte`), el riesgo (`riesgo.js`, `Riesgo.svelte`), el asistente de combate (`Asistente.svelte`), el equipo con datos del .sav (`equipo.js`), el lector de .sav de 3.ª gen (`sav/gen3.js`), la lectura de la run (`partida.js`), los nombres de juegos en español (`juegos.js`) y la paleta (`colores.js`). Los estilos globales están en `lockedex.css`.
  - `web/static/lx/`: datos generados (movimientos, habilidades, objetos, naturalezas, especies, aprendizaje por nivel, `gen3.json`). También están el diccionario de la interfaz (`interfaz-es.json`), el de nombres (`nombres-es.json`) y `traductor.js`, que se carga en `<head>` y traduce el DOM al vuelo.
  - Páginas nuevas: `routes/(app)/importar`, `routes/(app)/perfil` y `routes/compacto`.
  - Guardado: el script de `src/app.html` sincroniza `localStorage` con `Documentos\Lockedex\partidas.json` (endpoint `/__escritorio/estado` del proceso principal), con marca de revisión `__escritorio.rev`.
- `electron/`: el proceso principal (`main.mjs`) y el `preload.cjs`, que expone `window.lockedex`. El proceso principal levanta el servidor local con la app, gestiona las ventanas principal y compacta, la barra de título integrada y los atajos globales (Ctrl+Alt+L / Ctrl+Alt+K). También lee y vigila los .sav, hace las copias de seguridad y lleva electron-updater. Con `--prueba-arranque` arranca, se comprueba a sí mismo y sale.
- `herramientas/`: `generar_datos.py` (PokeAPI → `web/static/lx`) y `generar_gen3.py` (pret + PokeAPI → `gen3.json`).
- `.github/workflows/publicar.yml`: compila en Windows con cada cambio y prueba que arranca. **Publica cuando la versión de `electron/package.json` aún no está publicada** (desde las sesiones de Claude no se pueden subir etiquetas). Para sacar versión: sube el número de versión y edita `NOVEDADES.md`.

**Compilar en local:** `cd web && npm ci`. Después copia los sprites de PokeAPI/sprites en `web/node_modules/pokemon-sprites/sprites/pokemon/` (mira el workflow). Compila con **Node 20**, como GitHub, y copia `web/build` a `electron/app`. Con Node 22 se cuelan fallos de SSR, porque Node 22 trae `localStorage` global.

---

## 1. Estética propia (desmarcarse de nuzlocke-redux)

**Ya es Lockedex:** el chasis rojo con la lente y los LEDs, la barra con EXP, el logo de la portada, la tarjeta de información, el medidor de riesgo, el asistente, la importación, el perfil y el modo compacto.

**Sigue con la cara del original** (es lo que más se nota):

- [ ] **Filas de encuentros** de la partida (`components/pokemon-selector.svelte`, `Game/Route.svelte`): 4 inputs en fila. Idea: fichas tipo Pokédex por ruta, con sprite grande, estado como sello/insignia y naturaleza como chip.
- [ ] **Cabecera de la partida** (`navs/GameHeading.svelte`): barra blanca con el logo del juego y el equipo. Idea: integrarla en el chasis, como una segunda franja roja oscura bajo la barra Lockedex con el equipo en Poké Balls y las pestañas Partida/Caja/Cementerio.
- [ ] **Contenedor pixelado** (`containers/PixelatedContainer`) de la portada, nueva partida y cargar partida. Idea: pantallas con bisel (como el logo de la portada) en lugar del marco pixel blanco.
- [ ] **Tarjetas de Pokémon de los jefes** (`pokemon-card.svelte`, `move-card.svelte`): degradado por tipo heredado. Idea: ficha de Pokédex con la pantalla oscura y las estadísticas en barras tipo PS.
- [ ] **Caja** (`routes/(app)/box`): tarjetas de estadísticas del original. Idea: rejilla tipo caja del PC (30 huecos) con panel lateral de detalle.
- [ ] **Cementerio** (`routes/(app)/graveyard`): lápidas y niebla del original. Idea: mantener la idea pero con lápidas pixel propias y un epitafio con la causa de la muerte.
- [ ] **Guías** (`components/Guide/*`, `routes/(guides)`): cabecera negra con ondas del original. Idea: cabecera Pokédex roja y listados en pantallas.
- [ ] **Modales** (ajustes de partida, compartir, evolución): pasarlos al estilo del asistente (borde negro grueso, cabecera roja).
- [ ] **Pie de página**: simplificarlo y dejar los créditos (obligatorios por la licencia BSD-3) en Acerca de y en `/credit`.
- [ ] Definir **tokens de diseño** en `lockedex.css` (colores, radios, sombras, tipografías) y usarlos en todos los componentes, en lugar de los colores sueltos de Tailwind.
- [ ] Tema oscuro revisado entero, pantalla por pantalla.

Cómo hacerlo: ir componente a componente, con capturas antes y después. Se puede abrir Electron con `--remote-debugging-port` y hacer capturas con puppeteer-core, como en las pruebas de esta sesión. Sería útil maquetar primero cada pantalla (por ejemplo, como diseño en Claude) y luego pasarla a código.

---

## 2. Base de datos propia de Lockedex

**Situación actual:** los datos de juego vienen del original y están repartidos en formatos distintos:

- `web/src/lib/data/routes.json`: rutas en orden, por juego (clave `lid`), con encuentros posibles y jefes intercalados.
- `web/static/api/league/<pid>.<inicial>.json` (165 archivos): equipos de jefes por juego e inicial, con niveles, movimientos, habilidad, objeto y estadísticas base.
- `web/src/routes/api/pokemon.json/_pokemon.json`: Pokédex de la app (alias, sprite, tipos, estadísticas, evoluciones).
- `web/src/lib/data/games.json`, `trainers.json`, `patches.json` (cambios de ROM hacks) y `league.json`.
- Origen: los `.txt` de [domtronn/nuzlocke.data](https://github.com/domtronn/nuzlocke.data), convertidos a JSON por el autor original.

Además están los datos propios de Lockedex en `web/static/lx/`, sacados de PokeAPI.

**Plan propuesto:**

- [ ] Crear `datos/` en la raíz como **fuente de verdad**, con un archivo legible por juego (YAML o JSON) que contenga las rutas, los encuentros por método y los jefes.
- [ ] Escribir un **esquema** (JSON Schema o zod) y validarlo en el workflow (un paso nuevo antes de compilar).
- [ ] Hacer un **script de compilación** (`herramientas/`) que genere los formatos que ya consume la app (`routes.json`, `league/*.json`…). Así no se rompe nada mientras se migra; después se puede cambiar la app al formato nuevo poco a poco.
- [ ] Hacer la **importación inicial** desde los JSON actuales (y/o los `.txt` de nuzlocke.data) al formato nuevo.
- [ ] **Ampliaciones:**
  - [ ] Probabilidad de cada encuentro por método (hierba, surf, pesca, día/noche). Para los juegos oficiales sale de PokeAPI (`encounters`, `encounter_slots`, `location_areas`).
  - [ ] Dónde conseguir cada MT y objeto clave antes de cada jefe, para que el asistente diga "consigue Tumba Rocas en…".
  - [ ] Nombres en español de líderes, rivales y equipos malvados. Las rutas ya se traducen con PokeAPI.
  - [ ] Niveles máximos por dificultad y variantes del rival según el inicial, revisados.
  - [ ] Combates dobles, IA y notas por jefe ("lleva Baya Zidra", "usa Protección").
  - [ ] Versiones concretas de los ROM hacks (Radical Red 4.x, Unbound 2.x…), con sus movimientos por nivel propios, porque ahora se usan los del juego base.
- [ ] **Corrección de datos dentro de la app** (más adelante): un "modo editor" para corregir un encuentro o un jefe y exportar el cambio a `datos/`.
- [ ] **Licencias:** comprobar la licencia de nuzlocke.data antes de redistribuir datos derivados. PokeAPI permite reutilizar sus datos. No copiar textos de Bulbapedia ni de Wikidex (CC BY-NC-SA).

---

## 3. Otras mejoras y limitaciones conocidas

- [ ] **Lector de .sav:** probado solo con partidas sintéticas. Hay que probarlo con partidas reales de Rubí, Zafiro, Esmeralda, RojoFuego y VerdeHoja (y con hacks CFRU como Radical Red y Unbound, que amplían especies y pueden no ser compatibles).
- [ ] Añadir .sav de otras generaciones (1–2 en GB/GBC y 4–5 en NDS, siguiendo los formatos de PKHeX).
- [ ] **Modo compacto con acciones rápidas** (marcar captura o muerte), enviándolas a la ventana principal por IPC; ahora solo muestra información.
- [ ] **Afinar el riesgo:** IVs y EVs reales de los jefes por juego, cambios de forma o tipo, objetos, clima y prioridad.
- [ ] Sincronizar la partida del emulador con la run de forma más fina (evoluciones, muertes cuando el Pokémon sale debilitado en el .sav).
- [ ] Más logros en el perfil y estadísticas por juego.
- [ ] Traducir los textos largos que quedan en inglés (política de privacidad, créditos, guías por juego).
- [ ] Firmar el instalador para que Windows no muestre el aviso de SmartScreen (requiere certificado).
