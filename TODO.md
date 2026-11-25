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

**Ya es Lockedex:** el chasis rojo con la lente y los LEDs, la barra con EXP, el logo de la portada, la tarjeta de información, el medidor de riesgo, el asistente, la importación, el perfil, el modo compacto y el Analista.

**Hecho en la 1.4.0:**

- [x] **Logo e icono propios**: candado-Pokédex (cuerpo rojo con luces, arco plateado y la lente azul como cerradura). Fuente en `marca/icono.svg` (+ `icono-pequeno.svg` para 16–48 px) y `herramientas/generar_marca.py` regenera `electron/icono.png/.ico`, las barras laterales del instalador, el favicon, los iconos del manifiesto, `logo.png/.webp` y `twitter.png`. Quitadas las pantallas de inicio de iPhone del original.
- [x] **Tokens de diseño** en `lockedex.css` (`--lx-tinta`, `--lx-panel`, `--lx-panel-2`, `--lx-bisel`, `--lx-texto`, `--lx-texto-suave`, `--lx-acento-suave`, `--lx-lcd*`, `--lx-radio*`, `--lx-sombra*`), con su versión oscura.
- [x] **Panel Lockedex** (`.lx-panel`: franja roja con luces) en lugar del contenedor pixelado: portada, partidas, nueva partida, créditos, privacidad y **todos los modales** (ajustes, compartir, importar, evolución, muerte, progreso, equipo, análisis).
- [x] **Cabecera de la partida** como pantalla LCD oscura (`.lx-lcd`) con huecos de equipo y pestañas en VT323.
- [x] **Filas de encuentros** como fichas (`.lx-fila`) y **jefes** como tarjetas con franja roja (`.lx-jefe`).
- [x] **Botones, interruptores y radios** con el rojo de Lockedex (antes naranja) y botones con sombra que se hunde.
- [x] **Fichas de Pokémon** (`pokemon-card.svelte`) con contorno de tinta y sombra plana.
- [x] **Guías**: cabecera tipo chasis (color del juego con rayado y canto oscuro) en lugar de las ondas; textos en español.
- [x] **Pie de página** simplificado (créditos BSD-3, versión y «Avisar de un fallo» a este repo).

**Pendiente:**

- [ ] **Filas de encuentros, paso 2**: fichas con sprite grande, estado como sello y naturaleza como chip (ahora solo es el contenedor).
- [x] **Caja** (1.5.0): rejilla tipo caja del PC (30 huecos por caja, flechas para moverse, se puede arrastrar al equipo) con panel de detalle (`lib/lockedex/CajaPC.svelte`). Las fichas de siempre siguen en la pestaña «Fichas».
- [x] **Cementerio** (1.5.0): lápidas pixel art propias dibujadas en SVG (`graveyard/Lapida.svelte`, 4 formas con musgo y grietas al azar) y la causa de la muerte al pasar por encima.
- [ ] **Tarjetas de los jefes por dentro** (`move-card.svelte`, cabecera de `pokemon-card`): pantalla oscura y estadísticas en barras tipo PS.
- [ ] **Página de cada guía**: listados en pantallas, mismo estilo que la app.
- [ ] Repasar el tema oscuro pantalla por pantalla y los colores sueltos de Tailwind que quedan (`grep -rn "orange-\|indigo-" web/src`).

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

**Hecho en la 1.4.1 (primera fase):**

- [x] `datos/` es la **fuente de verdad** (ver `datos/LEEME.md`): `juegos.json`, `rutas/<clave>.json`, `jefes/<liga>.json`, `parches/<id>.json`, `entrenadores.json` e `indice.json`. Formato legible: una línea por ruta, jefe o Pokémon.
- [x] `herramientas/datos.mjs` (sin dependencias): `compilar` (datos → `web/src/lib/data/*.json`), `comprobar` (estructura + app al día) y `extraer` (la migración inicial, ya hecha). La primera compilación da exactamente los mismos datos que el original.
- [x] **Validación en GitHub Actions** antes de compilar: los errores de estructura o los datos sin compilar bloquean la publicación. Los Pokémon o movimientos desconocidos salen como avisos (se tienen en cuenta los Pokémon y movimientos de los parches de cada ROM hack).
- [x] Corregidas las primeras erratas que encontró: `pelliper`, `smeagle`, `budex`, `bidoofy`, `qwillfish`, `flaafy`, `nidoran-female/male`, `spinark`, `mewoth-alola`, `magnemtic`, `aerodacyl` y `kanghaskan`/`aerian-ace` (este también en los equipos detallados de New Generations).

**Hecho en la 1.5.0 (segunda fase):**

- [x] **Equipos de los jefes propios**: `datos/jefes/<juego>.json` (55 juegos y dificultades, 2 MB en lugar de 29 MB) con nombres cortos; `herramientas/jefes.mjs` genera los 165 archivos detallados que usa la app (`web/static/api/league/<juego>.<inicial>.json`) y `league.json`. La migración reproduce los originales byte a byte y GitHub Actions comprueba que siguen al día.
- [x] Validación de jefes: Pokémon, movimientos, habilidades y objetos desconocidos, inicial válido y movimientos personalizados completos.

**Siguiente fase:**

- [ ] Revisar los avisos que quedan (`TODOS=1 node herramientas/datos.mjs comprobar`): formas `-hoenn` de Blazing Emerald y `-sevii` de Radical Red que faltan en el parche, `darmanitan-standard`, y los datos de Rejuvenation (no lo usa ningún juego de la lista).
- [ ] Ampliar: juegos nuevos, encuentros por método (hierba, surf, caña…) y niveles de los encuentros.
- [ ] Más adelante, que la app lea directamente el formato nuevo y quitar la compilación intermedia.

---

## 3. Modo Analista (team builder sin partida) — ✅ hecho en la 1.3.0

Pendiente de ampliar: Web Worker si hiciera falta y más filtros del equipo aleatorio.

Una pantalla `/analista`, enlazada desde la barra, para preparar cualquier combate sin tener una run: eliges juego, jefe y un equipo hecho a mano, y ves el análisis.

**Lo que ya se puede reutilizar:**

- `calcularRiesgo({ jefe, equipo, gen, cap })` en `lockedex/riesgo.js` no depende de la run. Con nivel y movimientos usa la calculadora de Smogon (`@smogon/calc`); sin ellos, hace una estimación por tipos.
- `cargarRutas(lid)` y `cargarLiga(juego, inicial)` en `lockedex/partida.js`: lista de jefes del juego y sus equipos. Hay que elegir el inicial, porque cambia los equipos del rival.
- `coincideJuego` y `nombreJuego` en `lockedex/juegos.js`: el buscador de juegos.
- `aprendizaje(grupo)` e `infoJuego(clave)` en `lockedex/datos.js`: movimientos por nivel y MT por juego, generación y grupo de versiones.
- `/api/pokemon/<gen>.json`: Pokédex con tipos, estadísticas base y sprites. Ojo: `fetchData()` usa el juego de la run activa, así que hace falta una variante que reciba la generación.
- `Riesgo.svelte`, la tarjeta de información al pasar el ratón (`data-lx-mov`) y el estilo del asistente.

**Pasos:**

- [ ] **Paso 1 · Juego e inicial:** buscador como el de Nueva partida.
- [ ] **Paso 2 · Jefe:** lista de los jefes del juego en orden, agrupados (gimnasios, rival, Alto Mando, equipo malvado), con su nivel máximo. Este modo muestra el equipo del jefe aunque esté activado el modo sin spoilers; hay que avisarlo.
- [ ] **Paso 3 · Tu equipo (hasta 6):** por cada Pokémon:
  - [ ] Especie, con buscador en español o inglés.
  - [ ] Nivel, por defecto el nivel máximo del jefe.
  - [ ] Naturaleza, habilidad y objeto.
  - [ ] IVs y EVs, con preajustes: "salvaje medio" (IVs 15, EVs 0), "perfecto" (31) y a mano.
  - [ ] 4 movimientos, sugiriendo los que aprende por nivel hasta ese nivel y por MT en ese juego.
- [ ] **Atajos para rellenar el equipo:** "Copiar de mi run", "Copiar de mi .sav importado" y "Aleatorio con X características" (por ejemplo: monotipo, solo Pokémon capturables antes de ese jefe, sin legendarios, etc.).
- [ ] **Resultado:**
  - [ ] Medidor de riesgo grande y consejos.
  - [ ] Tabla de enfrentamientos: cada Pokémon tuyo contra cada Pokémon del jefe, con el % de daño que haces y recibes (mín–máx), quién es más rápido y avisos de KO de un golpe.
  - [ ] Mejor Pokémon para abrir el combate y "respuesta" recomendada para cada Pokémon del jefe.
- [ ] **Qué pasaría si…:** deslizador de nivel y cambio rápido de movimientos o naturaleza, recalculando al momento.
- [ ] **Comparar dos equipos** lado a lado contra el mismo jefe.
- [ ] **Equipos guardados** en `localStorage` (`lockedex.analista.equipos`), que el archivo de partidas ya sincroniza. Opción de exportar e importar en formato Showdown (texto), que es el estándar de la comunidad.
- [ ] Si el cálculo de muchos enfrentamientos tarda, llevarlo a un Web Worker.

---

## 4. Modo Randomlocke (juegos aleatorizados) — ✅ base hecha en la 1.3.0

Hecho: regla Randomlocke (sin sugerencias de encuentros), entrenadores aleatorizados con equipo del jefe apuntado a mano y riesgo calculado con él. Pendiente: opción de niveles de jefes cambiados (+X %) y aclarar en la interfaz el botón *Aleatorio* de Nueva partida.

En un juego pasado por un randomizer, los Pokémon de cada ruta y los equipos de los jefes no coinciden con los datos. Este modo deja de mostrarlos, pero sigue llevando la cuenta de **dónde capturaste qué** y del **nivel del próximo jefe**, que en los randomizers normalmente se mantiene.

- [ ] Elegir el modo al crear la partida: "Randomlocke", junto al botón *Aleatorio* de Nueva partida. Ojo: ese botón hace otra cosa (preasigna encuentros al azar para juegos de mundo abierto); hay que aclararlo en la interfaz.
- [ ] Opciones del modo:
  - [ ] Qué está aleatorizado: solo salvajes, salvajes y entrenadores, o también habilidades, movimientos y tipos.
  - [ ] Si los niveles de los jefes se mantienen o están cambiados (por ejemplo, +X %).
- [ ] **En la partida:**
  - [ ] El buscador de encuentro ofrece **cualquier Pokémon** (`getAllPkmn`), no los de la tabla de la ruta. Esto equivale a forzar el ajuste "Encounter suggestions" desactivado.
  - [ ] Sin estadísticas, tipos sugeridos ni análisis basados en datos del juego cuando no aplican.
  - [ ] Jefes: solo nombre, lugar y **nivel máximo**. Si los entrenadores están aleatorizados, ocultar el equipo, el riesgo y el asistente; se puede reutilizar la lógica del modo sin spoilers (`gym-card.svelte`, ajuste `spoilers`).
  - [ ] Opción de apuntar a mano el equipo real del jefe cuando lo veas en el juego, para que el riesgo y el asistente funcionen con esos datos.
- [ ] En el modo compacto y en la barra de EXP: el próximo jefe con su nivel máximo, sin equipo.
- [ ] La importación del .sav sigue funcionando igual: el lector no depende de las tablas del juego.

---

## 5. Reglas del Nuzlocke (ampliar y hacerlas "inteligentes") — ✅ base hecha en la 1.3.0

Hecho: reglas por run en `lockedex.reglas.<id>` (`web/src/lib/lockedex/reglas.js`), plantillas al crear partida y en Ajustes, cláusulas de regalos/variocolor/estáticos (encuentro extra desde el menú ⋮), Hardcore (aviso de nivel máximo con el .sav, sin objetos, modo Set), game over, sin legendarios, monotipo, banner de avisos y LED rojo. Pendiente: Wedlocke, Soul Link, Wonderlocke y cláusula de especie.

**Situación actual:** las reglas son ajustes por partida en `web/src/lib/components/Settings/_data.js`. Se guardan como una cadena de dígitos por índice: la 8 es la de Spoilers, y el índice 999 (Croma) se añade al final como `NaN`, ojo con eso. Ya existen: cláusula de motes, de repetidos (no / resaltar / ocultar), fallidos cuentan como repetidos, niveles máximos, límite de tamaño de equipo y muerte permanente. Los estados están en `web/src/lib/data/states.js`: Recibido = 2, Variocolor = 6, Muerto = 5.

**Reglas nuevas a añadir:**

- [ ] **Cláusula de regalos:** los Pokémon de regalo (estado *Recibido*) no gastan el encuentro de la zona. Permitir un encuentro normal además del regalo en el mismo lugar; se puede apoyar en las ubicaciones extra (`addlocation` / `__custom` en `store.js`).
- [ ] **Cláusula variocolor:** un shiny siempre se puede capturar, aunque ya hayas tenido encuentro en esa zona. Añade un hueco extra automáticamente.
- [ ] **Cláusula de estáticos:** los encuentros estáticos o legendarios cuentan, o no, como encuentro de la zona.
- [ ] **Cláusula de especie:** como la de repetidos, pero por línea evolutiva (ya existe `evoline` en los datos).
- [ ] **Modo Set** (sin cambio gratis tras debilitar) y **objetos en combate**: prohibidos, o limitados a X por combate.
- [ ] **Hardcore:** nivel máximo obligatorio (aviso si tu equipo lo supera antes del combate), sin objetos en combate y modo Set.
- [ ] **Game over** si cae todo el equipo, con opción de "nuevo intento", que ya existe en Cargar partida.
- [ ] Variantes populares activables:
  - [ ] Wedlocke: parejas, y solo combate un miembro de la pareja.
  - [ ] Monotipo.
  - [ ] Sin legendarios.
  - [ ] Soul Link a dos jugadores, emparejando encuentros por zona.
  - [ ] Wonderlocke.
- [ ] **Plantillas de reglas:** "Nuzlocke clásico", "Hardcore", "Randomlocke", "A mi manera", y elegir la plantilla al crear la partida.
- [ ] **Reglas inteligentes:** avisos cuando registras algo que rompe una regla. Por ejemplo:
  - segundo encuentro en una zona sin regalo ni shiny;
  - un Pokémon por encima del nivel máximo antes del jefe;
  - un repetido según la cláusula de especie.

  Se pueden mostrar en la fila del encuentro y en la barra superior (un LED en ámbar o rojo). Integrarlo con el riesgo: el asistente puede avisar si el equipo supera el nivel máximo en modo Hardcore.

---

## 6. Otras mejoras y limitaciones conocidas

- [ ] **Lector de .sav:** probado solo con partidas sintéticas. Hay que probarlo con partidas reales de Rubí, Zafiro, Esmeralda, RojoFuego y VerdeHoja (y con hacks CFRU como Radical Red y Unbound, que amplían especies y pueden no ser compatibles).
- [ ] Añadir .sav de otras generaciones (1–2 en GB/GBC y 4–5 en NDS, siguiendo los formatos de PKHeX).
- [x] **Modo compacto con acciones rápidas** (1.5.0): apuntar el encuentro de la siguiente zona (capturado o fallido) y marcar como caído a un miembro del equipo. Se envían por IPC a la ventana principal (`lib/lockedex/acciones.js`), que es la que guarda.
- [ ] **Afinar el riesgo:** IVs y EVs reales de los jefes por juego, cambios de forma o tipo, objetos, clima y prioridad.
- [ ] Sincronizar la partida del emulador con la run de forma más fina (evoluciones, muertes cuando el Pokémon sale debilitado en el .sav).
- [ ] Más logros en el perfil y estadísticas por juego.
- [x] Privacidad y créditos reescritos en español (1.5.0), con lo que de verdad hace la versión de escritorio y los proyectos en los que se apoya.
- [ ] Traducir lo que queda en inglés de las guías por juego y del modal de muerte (plantillas de epitafio).
- [ ] Firmar el instalador para que Windows no muestre el aviso de SmartScreen (requiere certificado).
