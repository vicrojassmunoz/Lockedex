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

## 0. Hotfixes

- [x] **1.17.0 — Lo que aparece al pasar el ratón, siempre al frente** (avisado el 26/11): en la versión completa el detalle del riesgo quedaba tapado. Ahora va fuera de la tarjeta, al final del `<body>` y con posición fija (`lib/lockedex/alFrente.js`), y los tooltips de Tippy van al `<body>` con el z-index máximo. Regla para lo que venga: todo lo flotante al pasar el ratón usa `alFrente` o un tooltip.

- [x] **1.18.0 — «Osada» no salía en la lista de naturalezas** (avisado el 26/11): la traducción de la interfaz tenía «Bold» → «Intenso» (una entrada sobrante, la app no usa «Bold» para nada más) y pisaba a «Osada» del diccionario de nombres. Quitada de `static/lx/interfaz-es.json`: ahora sale «Osada» en el selector de la fila, en el menú del equipo y en el Analista.

- [x] **1.19.0 — El diario y el «verdugo» del Perfil no sabían quién debilitó a cada Pokémon**: leían `death.tab`/`death.result` (formato antiguo) y la ventana de «¿quién fue?» guarda `death.type` y `death.trainer.name`. Ahora leen los dos.

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

**Hecho en la 1.6.0 (pedido el 25/11: «sigue habiendo muchos iconos e interfaces heredados»):**

- [x] **Iconos pixel art propios** (92, rejilla de 16x16) generados por `herramientas/generar_iconos.py` → `web/src/lib/components/icons/pixel.js`. `IconSet.ts` los exporta con los mismos nombres de antes, así que cambian en toda la app. Solo los logotipos de marcas (GitHub, Discord) siguen viniendo de Iconify. Para retocar uno: editar su función en el generador y ejecutarlo con `--muestra` (hoja de contacto en /tmp/iconos.png).
- [x] Fuera la cabecera vieja (casita y luna) de todas las páginas y de las guías: el tema claro/oscuro pasa a la barra roja.
- [x] Pestañas (`core/Tabs.svelte`) como fichas con contorno; la activa, en rojo. «Seguir en…» como pantallita LCD con cursor.
- [x] Botón **VS** propio en las tarjetas de jefe; las partidas guardadas, como fichas (sin el resaltado amarillo); botones de ordenar de la Caja como fichas; menú de Inicio con cursor ▶ de videojuego; tarjetas de las guías con contorno de tinta y etiqueta de dificultad LCD.

**Hecho en la 1.7.0 (pedido el 25/11):**

- [x] **Equipo de los jefes como el menú de equipo de los juegos** (`lib/lockedex/MenuEquipo.svelte`): el primer Pokémon en grande y el resto en barras con PS (con IVs perfectos, el peor caso); al pulsar uno se despliega su ficha con habilidad, objeto, movimientos (como el menú de combate) y estadísticas, y «Comparar con mi equipo».
- [x] En la 1.7.1 se quitó el entrenador pequeño del menú (sobraba: ya sale en la cabecera). Los **sprites de mapa** siguen en la app para otros usos (¿modo compacto?).
- [x] **Sprites de mapa** de 1.ª a 3.ª generación sacados de los desensamblados de pret con su paleta real (`herramientas/generar_sprites_mapa.py` → `web/static/lx/mapa/`; FRLG, RSE, GSC y RBY). `lib/lockedex/mapa.js` elige el sprite por nombre del jefe y región (con alias: Lt. Surge, Tabitha, Silver…); si no hay, usa el de combate. **Pendiente:** 4.ª y 5.ª generación (no hay gráficos extraídos en pret) y comprobar las paletas de FRLG (Misty sale rubia).
- [x] Algunos iconos son **sprites de objetos** de los juegos (`icons/sprites.js`): Poké Ball (capturado), Amuleto Iris (variocolor), Cuerda Huida (huyó) y Mapa del pueblo.
- [x] 1.7.3: selector de inicial con Piedra Fuego, Agua y Hoja (sprites del juego).
- [x] 1.7.4: menú de equipo de los jefes **a píxeles como en GBA** (marcos escalonados en `lib/lockedex/gba.js`, letra Fusion Pixel, barra de PS de la consola) y ficha rehecha como la pantalla «INFO. POKéMON»: estadísticas al nivel del jefe junto a las base, iconos de tipo de 3.ª gen, habilidad/objeto y ◀ ▶ para pasar de Pokémon.
- [ ] (1.19.0: Piedra Lunar y Piedra Solar en el botón del tema, Galleta Lava en el aviso de cookies, Buscapelea en el modo batalla y el Huevo de Esmeralda (icono de la Caja, de pokeemerald con su paleta) para el Egglocke; la lupa del buscador se queda, el Buscaobjetos no se reconocía tan pequeño. 1.16.0: efectos de campo de los jefes con las rocas de clima y objetos de la 2.ª–5.ª gen en `Effect.svelte`, e iconos grandes encajados con `encajar.js`. Intercambio: elegida la consola de la pantalla de intercambio de Esmeralda, `consola-intercambio.png` desde `graphics/trade/gba.png` de pokeemerald) **Iconos con sprites de los juegos (≤ 5.ª gen, nada de 3D)** — el usuario deja libertad para elegir los mejores; ir poco a poco, unos cuantos por versión. Hoja de los actuales: `herramientas/generar_iconos.py --muestra`.
  - Criterio: **objeto de la mochila** (PokéSprite, `/home/claude/pokesprite/items`) cuando el icono representa algo que se lleva (Poké Ball, piedras, Mapa, Cuerda Huida, MT…); **objeto del tileset/mapa** (pret: pokefirered/pokeemerald `data/tilesets/.../metatiles`, `graphics/`) cuando es mobiliario o escenario: el **PC** mejor como el PC del Centro Pokémon, la Caja, la Tienda, la Liga (estatua/puerta), el cementerio (lápida de la Torre Pokémon)…
  - **No** usar proteínas/vitaminas para las estadísticas (no le gustan). Los iconos de estadísticas actuales (Atk, Def, Spa, Spd…) son «feotes»: rehacerlos a mi manera (p. ej. símbolos pixel claros o las barras de colores de la pantalla de datos).
  - Se añaden a `web/static/lx/objetos/` (o `lx/tiles/`) y a `icons/sprites.js` + `IconSet.ts`; los créditos ya citan PokéSprite y pret.
  - [x] La Cuerda Huida («Fallido») no se veía bien → Bola Humo (1.8.0).
  - [x] **1.8.0 — iconos elegidos por el usuario** (sprites sacados con `herramientas/iconos_juego.py` a `web/static/lx/objetos/`; exportados en `icons/sprites.js`):
    Caja = PC del Centro Pokémon (metatile 741) · Equipo = personaje del mapa del avatar del perfil (`spriteAvatar` en `mapa.js`, Rojo si no hay) · Muerto/Cementerio = lápida de la Torre Pokémon (657) · Fallido = Bola Humo · Regalo = Gloria Ball · Medallas = Cinta Campeón · Mapa = el Mapa del mapa de RojoFuego · Intercambiado = recepcionista del Club de Cable (**el usuario no está seguro: preguntar al verlo**) · Estadísticas = objetos Recio de la 4.ª gen (Pesa, Brazal, Cinto, Lente, Banda y Franja Recias), elegido por el usuario entre las opciones «no tan GBA».
    - [x] **1.9.0 — lugares y clases**: Ruta = cartel de madera, Pueblo = cartel blanco, Ciudad = Centro Pokémon, Bosque = árbol, Hierba alta = el tile de hierba, Cueva = entrada de cueva, Monte = roca grande, Estadio = cartel de gimnasio, Ruinas = fósil, Santuario = piedra mística de Isla Origen; físico/especial/estado dibujados a la manera de la 4.ª gen (`herramientas/iconos_juego.py`).
- [x] 1.11.0: el icono del Pokémon elegido en el menú de equipo salta a dos fotogramas (como en GBA) y la ficha usa el sprite animado de Negro/Blanco (PokeAPI/sprites, con el fijo si no hay internet). Antes: **Sprites animados al seleccionar un Pokémon** en el menú de equipo / ficha (como el icono que se mueve en el menú de GBA, y el sprite animado de la 4.ª–5.ª gen en la ficha). «Yo por pedir que no quede». Ver qué sprites animados hay (PokeAPI/sprites `versions/generation-v/black-white/animated/*.gif`, iconos de 2 frames de pokeemerald `graphics/pokemon/*/icon.png`).
- [x] **1.9.2 — Tema oscuro «de noche en los juegos»**: violeta-índigo de las rutas de noche, texto crema, rayitas diagonales de los menús de GBA y grises de Tailwind heredados al mismo tono (`lockedex.css`). Pendiente de que el usuario lo vea. Antes: **Tema oscuro con estética Pokémon**: el claro le encanta, pero el oscuro «es muy moderno, muy poco pokémon». Rehacer la paleta oscura inspirándose en los juegos (noche de los juegos, menús de la 4.ª gen en DS, PC/Pokédex de noche) en vez del azul marino plano tipo web; revisar `--lx-*` oscuros en `lockedex.css`.
- [x] **1.15.0 — Responsive al ancho de la ventana:** filas de encuentros con columnas de ancho propio a partir de 1024 px (estado entero, lugar en dos líneas, botones dentro de la ficha, piedras del inicial dentro), y el menú de equipo de los jefes se recoloca según su propio ancho (`bind:clientWidth` en `MenuEquipo.svelte`: el esbuild de esta versión no entiende `@container`). Antes: con la ventana estrecha se cortan cosas, p. ej. la Piedra Fuego del selector de inicial (`starter-type.svelte`) se ve cortada en el borde derecho de la cabecera de la partida. Revisar cabecera de la partida, barra, tarjetas de jefe y el menú de equipo a 800–1000 px.
- [x] Nombres de gimnasio traducidos con un patrón («Cerulean City Gym» → «Gimnasio de Ciudad Celeste»).

**Pendiente:**

- [x] 1.11.0: ficha al lado de cada fila (ventana ≥ 1200 px): sprite grande (gris si cayó, variocolor si lo es), estado como sello de goma de color y naturaleza como chip ↑/↓. Antes: **Filas de encuentros, paso 2**: fichas con sprite grande, estado como sello y naturaleza como chip (ahora solo es el contenedor).
- [x] **Caja** (1.5.0): rejilla tipo caja del PC (30 huecos por caja, flechas para moverse, se puede arrastrar al equipo) con panel de detalle (`lib/lockedex/CajaPC.svelte`). Las fichas de siempre siguen en la pestaña «Fichas».
- [x] **Cementerio** (1.5.0): lápidas pixel art propias dibujadas en SVG (`graveyard/Lapida.svelte`, 4 formas con musgo y grietas al azar) y la causa de la muerte al pasar por encima.
- [x] 1.14.0: las tarjetas que quedaban (`pokemon-card` y `move-card`, Caja en fichas) con estética GBA: cabecera del color del tipo con líneas de barrido, nombre y nivel en pixel, movimientos en pixel con separador; textos en español. Original: **Tarjetas de los jefes por dentro** (`move-card.svelte`, cabecera de `pokemon-card`): pantalla oscura y estadísticas en barras tipo PS.
- [x] 1.14.0: guías con títulos en banda de pantalla de datos, cada grupo de encuentros en un recuadro de menú y los Pokémon en casillas del PC. Original: **Página de cada guía**: listados en pantallas, mismo estilo que la app.
- [x] 1.10.0: repasado el tema oscuro en Partida, Caja, Cementerio, Analista, Partidas, Nueva partida y Guías; el naranja heredado pasa a ser el rojo de Lockedex y el índigo el turquesa LCD (`tailwind.config.cjs`). Antes: Repasar el tema oscuro pantalla por pantalla y los colores sueltos de Tailwind que quedan (`grep -rn "orange-\|indigo-" web/src`).

Cómo hacerlo: ir componente a componente, con capturas antes y después. Se puede abrir Electron con `--remote-debugging-port` y hacer capturas con puppeteer-core, como en las pruebas de esta sesión. Sería útil maquetar primero cada pantalla (por ejemplo, como diseño en Claude) y luego pasarla a código.

---

- [x] (cerrado: con la descarga diferencial cada actualización baja ~1,3 MB) **Actualizaciones más ligeras** (idea del usuario, 25/11). **1.13.0: comprobado que la descarga diferencial ya funciona**: el instalador NSIS se copia en la caché del actualizador al instalarse y se publican los `.blockmap`; comparando blockmaps reales, de la 1.12.0 a la 1.12.1 solo hay que bajar **1,3 MB de 143 MB** (de la 1.11.0, 1,9 MB). El registro de la app (`registro.txt`) apunta ahora la actividad del actualizador («Download block maps», «Full / To download»). El punto 3 (solo contenido) ya casi no hace falta. **Paso 1 hecho en la 1.9.0:** las guías ya no se prerenderizan (−171 MB sin comprimir; `electron/app` pasa de 252 a 82 MB). **Resultado real: el instalador solo baja de 148,5 a 143,3 MB**, porque esos HTML se comprimían muchísimo; casi todo el peso es Electron. Lo que de verdad aligeraría las actualizaciones es el punto 3 (solo contenido) o la descarga diferencial. Hoy cada versión baja el instalador entero (~148 MB). Medido en local: `electron/app` ocupa 252 MB sin comprimir, de los que **171 MB son `app/prerendered`** (páginas y JSON prerenderizados, en parte duplicados de `static/api`), 46 MB `client` y 35 MB `server/chunks`.
  1. **Adelgazar lo que se empaqueta:** ver qué se prerenderiza (probablemente las rutas `/api/...` de cada juego/Pokémon) y servirlo desde `static/` o generarlo al vuelo; quitar duplicados. Puede bajar el instalador a la mitad o menos.
  2. **Comprobar que funciona la descarga diferencial** de electron-updater (ya se publican los `.blockmap`): mirar en el registro de la app si pone «Downloading … differential»; si no compensa por la compresión sólida del NSIS, probar `nsis.differentialPackage`.
  3. **Actualizaciones solo de contenido:** si Electron no cambia, bajar solo un zip de `app/` (unos MB) firmado con hash SHA-256 publicado en la release, descomprimirlo en `userData` y servir desde ahí; el instalador completo solo cuando cambia la versión de Electron o `main.mjs`.

### Repaso del usuario (25/11, tarde) — pendiente
- [x] 1.14.0: **Animación en la Caja** (el icono elegido del PC ya saltaba; ahora el detalle del PC usa el sprite animado de Negro/Blanco con `lib/lockedex/animado.js`, y en fichas el Pokémon salta al pasar el ratón). Original (pedido el 26/11): que el Pokémon elegido en la Caja (vista PC y fichas) salte a dos fotogramas como en el menú de equipo de los jefes, y que el detalle del PC use el sprite animado de Negro/Blanco (mismo código que `MenuEquipo.svelte`: `animado()`, `alFallar`, `ajustar` y la animación `lx-me-salto`).
- [x] **Revisar el tamaño de los Pokémon en toda la app** — **1.15.0, hecho:** `recorte.js` admite `use:recorte={'suelo'}` (dibujo apoyado abajo; `sprites-recorte.json` lleva ahora `[x, y, lado, ySuelo]`) y se usa en las fichas de la Caja (hueco fijo de 80 px), el VS (huecos según cuántos haya) y comparar; iconos a ×2 exacto en el menú de equipo, el PC y la ventana de VS (Equipo/Caja rehechos como el PC). Antes: **1.13.0, primera pasada:** recorte del margen de los sprites con `object-view-box` (`lib/lockedex/recorte.js` + `web/static/lx/sprites-recorte.json` de `herramientas/recortes_sprites.py`, zoom máx. ×2) en la ficha de las filas, el cementerio, el detalle del PC y la ficha de los jefes. Quedan: tarjetas de la Caja en fichas (`pokemon-card`, sprite de 160 px desplazado), sprites grandes de las tarjetas de jefe y del VS, e iconos de caja (PIcon) escalados a 1,25 en el menú de equipo. Original (pedido el 25/11): hay sitios donde se ven pequeños o a escalas raras. Los sprites base vienen en un lienzo de 96×96 con mucho margen y los iconos de caja (PIcon) a 40×30; repasar filas de encuentros, selector, Caja (fichas y PC), tarjetas de jefe, VS, cementerio, equipo de la barra y modo compacto: recortar el margen o escalar a múltiplos enteros (×1, ×2) para que se vean grandes y nítidos.
- [ ] **Revisar y cambiar las «mecánicas» de la app para desmarcarnos del todo de nuzlocke-redux** (pedido el 25/11). No solo la estética: también cómo se usa. Primero hacer un inventario de los flujos heredados tal cual y proponer al usuario alternativas propias antes de tocar nada. Candidatos:
  - **Apuntar un encuentro:** hoy es la fila con buscador + mote + estado + naturaleza. Idea: flujo tipo juego (pantalla «¡Un Pokémon salvaje!» → Capturar / Huyó / Debilitado), o rellenar desde el .sav.
  - **Ventana de VS / comparar:** rehacerla como pantalla de combate (tu Pokémon abajo a la izquierda, el rival arriba a la derecha, barras de PS) en vez de pestañas «Equipo/Comparar».
  - **Muerte de un Pokémon:** el modal heredado → escena propia (lápida, epitafio, causa) que lleve al cementerio.
  - **Caja:** fichas vs. PC; el filtro/ordenación heredado.
  - **Cargar/Nueva partida, ajustes y selector de juego:** pantallas al estilo de la pantalla de inicio de los juegos (CONTINUAR / NUEVA PARTIDA / OPCIONES).
  - **Equipo (mini-team) y «Montar equipo»:** como el menú de equipo de GBA que ya tienen los jefes.
  - **Guías y pestañas Nuzlocke / Rutas / Jefes / Próximos:** reorganizar la vista de partida.
- [x] 1.10.0 (en parte): sprites de mapa de **Platino** (118, de pret/pokeplatinum; `herramientas/sprites_mapa_nds.py` → `lx/mapa/dppt/`) y se prefieren a los de GBA. 88 de 131 avatares ya tienen sprite de mapa. **Falta HGSS y BW**: pokeheartgold no tiene los sprites de mapa en PNG (van en NARC) y no hay decomp de BW; Eusine sigue con el de Cristal. Antes: **Sprites pequeños (del mapa): si hay varias versiones, usar la de NDS más nueva** (p. ej. Eusine de HeartGold/SoulSilver, no el genérico de Cristal). Hace falta sacar los sprites de mapa de la 4.ª–5.ª gen (HGSS, DPPt, BW/B2N2): mirar los decomps de pret (pokeheartgold, pokeplatinum) o hojas de sprites con licencia clara; mismo índice (`web/static/lx/mapa/<juego>/`) y que `spriteMapa`/`spriteAvatar` prueben primero `bw2 > bw > hgss > pt > dp` y luego las de GBA.
- [x] **1.9.1** — **Iconos que siguen igual que en nuzlocke-redux** (Guardar = Diario, Ajustes = Pieza Máquina, Partida = Pokédex del mapa, Tipo = Tabla Llama, Total = Brazal Firme, análisis de Caja/Equipo = Periscopio, daño máximo del VS = Protección Especial; VS traducido y barras a píxeles). 1.11.0: ventana de VS rediseñada (presentación de combate a píxeles con insignia VS, recuadros PB, pestañas de pantalla de juego, huecos vacíos con Poké Ball apagada). Lista original: (cambiarlos por sprites de los juegos ≤ 5.ª gen o pixel art propio):
  - **Guardar** (disquete), **Partida** (mando de la pestaña), **Ajustes** (engranaje).
  - En la Caja (dentro de Partida): los botones **«Caja» y «Equipo»** de arriba a la izquierda (matraces) y el aviso de **coberturas que le faltan a tu equipo**.
  - Botones de ordenar **«Tipo»** (llama) y **«Total»** (barras).
  - Ventana de **versus** (VS): las pestañas **«Equipo» y «Comparar»** y el icono de **súper eficaz**.
- [x] 1.9.1: **Icono de movimiento de estado** → espiral morada (como Hipnosis) en vez del yin-yang. Antes: (el círculo gris tipo yin-yang, p. ej. Ataque Arena): **no le convence** → buscar otro (p. ej. el icono de estado real de la 4.ª gen: círculo gris con espiral, o un símbolo más claro).
- [x] 1.9.1: los iconos-sprite se recortan a su dibujo (`icons/recortes.js`, generado) y se ven grandes; Descartado = papelera metálica. Antes: **Capturado, Fallido y Descartado se ven muy pequeños** en las filas de encuentros; además **falta icono para «Descartado»**. Agrandarlos (o recortar los sprites de PokéSprite al contenido y escalarlos ×2).
- [x] **Analista: lavado de cara** — **1.15.0, segunda pasada:** etiquetas de campo en recuadro azul, casillas cuadradas con canto, movimientos con el color del tipo, consejos en un cuadro de diálogo pixel y tabla de daño con celdas de menú y la mejor en naranja con sello «MEJOR»; sprites recortados. Antes: **1.14.0, primera pasada:** el equipo del jefe con el menú de equipo de GBA (`MenuEquipo`, sin el botón de comparar), títulos y números de paso en pixel, huecos de tu equipo con marcos y cabecera de hueco de menú. Falta rehacer los campos de cada hueco (nivel, naturaleza, IVs/EVs, movimientos) y el bloque de resultados. Original: **Analista: lavado de cara a fondo** — se parece demasiado al original. Misma línea que el menú de equipo y la ficha (estética GBA/NDS: marcos de `gba.js`, letra Fusion Pixel, paneles de la pantalla de datos).
- [ ] **Perfil: no tocar** (le gusta como está).
- [x] 1.9.1: Eusine → «super_nerd» de Cristal; sin sprite de mapa se usa el propio sprite del avatar recortado. Antes: **Equipo con el avatar: no sale Eusine** (`gs-eusine`): no hay sprite de mapa con ese nombre. En Cristal Eusine usa el sprite genérico de «super nerd» → añadir alias en `mapa.js` (FAMILIAS_AVATAR/ALIAS) y, para los avatares sin sprite de mapa (Sinnoh, Teselia…), usar como plan B la cabeza del propio sprite del avatar (`/assets/img/leaders/<id>.png`) en vez de Rojo.
- [x] 1.9.1: la recortaba `overflow-hidden` del contenedor de la partida porque la celda de 1/8 no cabía; ahora con la ventana mediana las piedras bajan debajo de «Inicial» (probado a 1100, 1300 y 1600 px). Antes: **La Piedra Fuego del selector de inicial sigue cortada** (el arreglo de la 1.7.5 no bastó): mirar qué contenedor la recorta (probablemente `overflow` de la fila de encuentros o del `slot="location"` en `Game/Route.svelte`) con la ventana a 1000–1200 px.

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

- [x] 1.10.0: avisos de la base de datos a cero (jefes opcionales de Renegade Platinum y Blaze Black/Volt White 2 como «mini-boss»; métodos de encuentro colados como Pokémon en Rejuvenation). Antes: Revisar los avisos que quedan (`TODOS=1 node herramientas/datos.mjs comprobar`): formas `-hoenn` de Blazing Emerald y `-sevii` de Radical Red que faltan en el parche, `darmanitan-standard`, y los datos de Rejuvenation (no lo usa ningún juego de la lista).
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

- [x] **Paso 1 · Juego e inicial:** buscador como el de Nueva partida.
- [x] **Paso 2 · Jefe:** lista de los jefes del juego en orden, agrupados (gimnasios, rival, Alto Mando, equipo malvado), con su nivel máximo. Este modo muestra el equipo del jefe aunque esté activado el modo sin spoilers; hay que avisarlo.
- [x] **Paso 3 · Tu equipo (hasta 6):** por cada Pokémon:
  - [x] Especie, con buscador en español o inglés.
  - [x] Nivel, por defecto el nivel máximo del jefe.
  - [x] Naturaleza, habilidad y objeto.
  - [x] IVs y EVs, con preajustes: "salvaje medio" (IVs 15, EVs 0), "perfecto" (31) y a mano.
  - [x] 4 movimientos, sugiriendo los que aprende por nivel hasta ese nivel y por MT en ese juego.
- [x] **Atajos para rellenar el equipo:** "Copiar de mi run", "Copiar de mi .sav importado" y "Aleatorio con X características" (por ejemplo: monotipo, solo Pokémon capturables antes de ese jefe, sin legendarios, etc.).
- [x] **Resultado:**
  - [x] Medidor de riesgo grande y consejos.
  - [x] Tabla de enfrentamientos: cada Pokémon tuyo contra cada Pokémon del jefe, con el % de daño que haces y recibes (mín–máx), quién es más rápido y avisos de KO de un golpe.
  - [x] Mejor Pokémon para abrir el combate y "respuesta" recomendada para cada Pokémon del jefe.
- [x] (1.17.0: fila «¿Y SI…?» en el resultado para cambiar naturaleza y movimientos de un Pokémon; el deslizador de nivel ya estaba) **Qué pasaría si…:** deslizador de nivel y cambio rápido de movimientos o naturaleza, recalculando al momento.
- [x] (1.17.0: tabla cara a cara con la mejor respuesta de cada equipo y marcador) **Comparar dos equipos** lado a lado contra el mismo jefe.
- [x] (hecho: guardar, exportar e importar) **Equipos guardados** en `localStorage` (`lockedex.analista.equipos`), que el archivo de partidas ya sincroniza. Opción de exportar e importar en formato Showdown (texto), que es el estándar de la comunidad.
- [ ] (de momento no hace falta: el cálculo va rápido) Si el cálculo de muchos enfrentamientos tarda, llevarlo a un Web Worker.

---

## 4. Modo Randomlocke (juegos aleatorizados) — ✅ base hecha en la 1.3.0

Hecho: regla Randomlocke (sin sugerencias de encuentros), entrenadores aleatorizados con equipo del jefe apuntado a mano y riesgo calculado con él. Pendiente: opción de niveles de jefes cambiados (+X %) y aclarar en la interfaz el botón *Aleatorio* de Nueva partida.

En un juego pasado por un randomizer, los Pokémon de cada ruta y los equipos de los jefes no coinciden con los datos. Este modo deja de mostrarlos, pero sigue llevando la cuenta de **dónde capturaste qué** y del **nivel del próximo jefe**, que en los randomizers normalmente se mantiene.

- [x] (1.15.0: la plantilla «Randomlocke» ya está en Nueva partida y el botón pasa a llamarse «Encuentros al azar», con una explicación de que no es el Randomlocke) Elegir el modo al crear la partida: "Randomlocke", junto al botón *Aleatorio* de Nueva partida. Ojo: ese botón hace otra cosa (preasigna encuentros al azar para juegos de mundo abierto); hay que aclararlo en la interfaz.
- [x] Opciones del modo (1.15.0, en `reglas.js`: `nivelesJefes` y `datosAleatorios`, con `ajustarNivel`, `ajustarEquipoJefe` y `sinCalculos`):
  - [x] Qué está aleatorizado (entrenadores, y tipos/habilidades/movimientos, que quita el riesgo y el asistente): solo salvajes, salvajes y entrenadores, o también habilidades, movimientos y tipos.
  - [x] Si los niveles de los jefes se mantienen o están cambiados (por ejemplo, +X %).
- [x] **En la partida:**
  - [x] El buscador de encuentro ofrece **cualquier Pokémon** (`getAllPkmn`), no los de la tabla de la ruta. Esto equivale a forzar el ajuste "Encounter suggestions" desactivado.
  - [x] (1.17.0: con «tipos aleatorizados» no hay riesgo, asistente, análisis de tipos del VS ni de la Caja, ni tipos en el detalle del PC; las estadísticas base se quedan) Sin estadísticas, tipos sugeridos ni análisis basados en datos del juego cuando no aplican.
  - [x] Jefes: solo nombre, lugar y **nivel máximo**. Si los entrenadores están aleatorizados, ocultar el equipo, el riesgo y el asistente; se puede reutilizar la lógica del modo sin spoilers (`gym-card.svelte`, ajuste `spoilers`).
  - [x] Opción de apuntar a mano el equipo real del jefe cuando lo veas en el juego, para que el riesgo y el asistente funcionen con esos datos.
- [x] 1.10.0: compacto en Randomlocke con riesgo solo si se apuntó el equipo real; barra de EXP con «MÁX n» y el próximo jefe en el título.
- [x] La importación del .sav sigue funcionando igual: el lector no depende de las tablas del juego.

---

## 5. Reglas del Nuzlocke (ampliar y hacerlas "inteligentes") — ✅ base hecha en la 1.3.0

Hecho: reglas por run en `lockedex.reglas.<id>` (`web/src/lib/lockedex/reglas.js`), plantillas al crear partida y en Ajustes, cláusulas de regalos/variocolor/estáticos (encuentro extra desde el menú ⋮), Hardcore (aviso de nivel máximo con el .sav, sin objetos, modo Set), game over, sin legendarios, monotipo, banner de avisos y LED rojo. Pendiente: Wedlocke, Soul Link, Wonderlocke y cláusula de especie.

**Situación actual:** las reglas son ajustes por partida en `web/src/lib/components/Settings/_data.js`. Se guardan como una cadena de dígitos por índice: la 8 es la de Spoilers, y el índice 999 (Croma) se añade al final como `NaN`, ojo con eso. Ya existen: cláusula de motes, de repetidos (no / resaltar / ocultar), fallidos cuentan como repetidos, niveles máximos, límite de tamaño de equipo y muerte permanente. Los estados están en `web/src/lib/data/states.js`: Recibido = 2, Variocolor = 6, Muerto = 5.

**Reglas nuevas a añadir:**

- [x] 1.13.0: avisos de la cláusula de regalos (recuerda el encuentro extra si no lo has añadido). Ya existía el «Encuentro extra» en el menú de la fila. Original: **Cláusula de regalos:** los Pokémon de regalo (estado *Recibido*) no gastan el encuentro de la zona. Permitir un encuentro normal además del regalo en el mismo lugar; se puede apoyar en las ubicaciones extra (`addlocation` / `__custom` en `store.js`).
- [x] (ya existía: «Variocolor extra» en el menú de la fila) **Cláusula variocolor:** un shiny siempre se puede capturar, aunque ya hayas tenido encuentro en esa zona. Añade un hueco extra automáticamente.
- [x] (ya existía: «Estático extra» en el menú de la fila) **Cláusula de estáticos:** los encuentros estáticos o legendarios cuentan, o no, como encuentro de la zona.
- [x] 1.13.0: regla «Cláusula de especie»: marca «repetido» en el buscador y avisa si capturas dos de la misma línea evolutiva. Original: **Cláusula de especie:** como la de repetidos, pero por línea evolutiva (ya existe `evoline` en los datos).
- [x] 1.16.0: «Objetos en combate» con límite (prohibidos o 1–3 por combate; `limiteObjetos`), contador en el compacto y recordatorios en el VS. **Modo Set** (sin cambio gratis tras debilitar) y **objetos en combate**: prohibidos, o limitados a X por combate.
- [x] 1.16.0: plantilla Hardcore con objetos prohibidos, Set, nivel máximo y sin regalos ni estáticos; aviso de nivel máximo en el VS (`ReglasCombate.svelte`) y en el compacto. **Hardcore:** nivel máximo obligatorio (aviso si tu equipo lo supera antes del combate), sin objetos en combate y modo Set.
- [x] **Game over** (1.12.0: derrotas, «He perdido», pantalla de FIN DE LA PARTIDA, nuevo intento con historial y modo con vidas; probado por el usuario). 1.16.0: la app lo propone sola al caer todo el equipo con la regla normal (`recordarEquipo`/`equipoCaido` en `derrotas.js`, panel «¡TU EQUIPO HA CAÍDO!»). Antes: Falta: proponerlo solo al caer todo el equipo con la regla normal.
- [x] Variantes populares activables:
  - [x] (1.17.0: regla «Wedlocke», parejas en el detalle del PC con `parejas.js`, avisos y recordatorios en VS, compacto y asistente) Wedlocke: parejas, y solo combate un miembro de la pareja.
  - [x] Monotipo (regla con aviso).
  - [x] Sin legendarios (regla con aviso).
  - [ ] (ver «Duallocke / Soul Link» más abajo) Soul Link a dos jugadores, emparejando encuentros por zona.
  - [x] 1.19.0 — Wonderlocke (ver «Otras variantes» más abajo).
- [x] (hecho: las plantillas salen en Nueva partida) **Plantillas de reglas:** "Nuzlocke clásico", "Hardcore", "Randomlocke", "A mi manera", y elegir la plantilla al crear la partida.
- [x] 1.16.0: segundo encuentro en una zona sin su cláusula, filas marcadas con «!» (`avisosFila`) y luz roja (graves) o ámbar (avisos) en la barra. 1.17.0: integrado en el asistente (bloque «Tus reglas»: fuera del plan quien pasa del nivel máximo o no es del monotipo, aviso si usa a los dos de una pareja). **Reglas inteligentes:** avisos cuando registras algo que rompe una regla. Por ejemplo:
  - segundo encuentro en una zona sin regalo ni shiny;
  - un Pokémon por encima del nivel máximo antes del jefe;
  - un repetido según la cláusula de especie.

  Se pueden mostrar en la fila del encuentro y en la barra superior (un LED en ámbar o rojo). Integrarlo con el riesgo: el asistente puede avisar si el equipo supera el nivel máximo en modo Hardcore.

---

## 5b. Modos de juego (pedido el 25/11)

- [x] **1.12.0 — Marcar una derrota** (`lib/lockedex/derrotas.js`, `FinPartida.svelte`): botón «Derrota» en la ventana de VS y en el compacto, «He perdido» en la partida, pantalla de FIN DE LA PARTIDA con «Nuevo intento» (guarda el intento en `lockedex.historial.<id>`) y «Deshacer»; cuenta en el perfil (runs perdidas, verdugo, derrotas por juego, logro «Levántate»). Pendiente: proponer game over solo al caer todo el equipo con la regla de Game over (ahora lo avisa AvisosReglas). Plan original: poder indicar que **has perdido contra un jefe** o que **has perdido la run en general** (te han debilitado a todo el equipo, te rindes…).
  - En la tarjeta de cada jefe y en la ventana de VS, junto a «Marcar victoria»: botón **«Derrota»** → se apunta la derrota (jefe, fecha, equipo que llevabas) y, según las reglas, o es **game over** o se sigue (modo con vidas: resta una vida; reglas suaves: solo queda apuntado).
  - Botón general **«He perdido»** en la partida (y en el modo compacto) para cuando no ha sido contra un jefe.
  - **Game over:** la run queda marcada como perdida (no se puede seguir editando salvo deshacer), con resumen (hasta dónde llegaste, medallas, caídos, quién te ganó) y botón **«Nuevo intento»** (ya existe en Cargar partida: reutilizarlo). Que cuente en el perfil (logros, «tu mayor verdugo», runs perdidas por juego).
  - Con el modo con vidas y el Hardcore de las reglas, la derrota la puede proponer la app sola cuando cae todo el equipo.

Ampliar los modos además de Nuzlocke clásico, Hardcore y Randomlocke. Cada modo = plantilla de reglas + lo que la app tenga que llevar (contadores, avisos, pantallas):

- [x] **1.12.0 — Modo con vidas**: regla «Modo con vidas» (3/5/10/20) y plantilla «Extremo (10 vidas)»; contador ♥ en la partida y en el compacto; sin vidas → game over solo. Plan original: un contador de vidas por run; cada Pokémon caído resta una y al llegar a 0 es game over (con «nuevo intento»). Que el número sea configurable.
- [x] **1.19.0 — Egglocke** (`lib/lockedex/cambios.js`: en el detalle del PC se apunta qué salió del huevo; el encuentro guarda `cambio: { de, tipo }`; Wonderlocke usa lo mismo). los encuentros se cambian por huevos (los Pokémon que salen de ellos son los que usas). Apuntar qué sale de cada huevo.
  - [ ] **Generador de Egglocke** (más adelante, «fumada pero se tendrá que poder»): reparto de huevos con Pokémon aleatorios **por juego oficial** (solo especies que existen en ese juego/generación), con opciones (sin legendarios, por tipo, equilibrado por evoluciones…) y una lista para compartir/imprimir.
- [x] **1.12.0 — Cláusula de revivir**: regla (1 por medalla, 1 o 3 por run) y botón «Revivir» en el cementerio (vuelve a la caja como capturado; gasta una vida si se juega con vidas). Plan original: cuándo se puede revivir a un Pokémon, si se permite (p. ej. uno por cada medalla/gimnasio, o X en toda la run). La app lleva la cuenta de revividos disponibles y saca al Pokémon del cementerio de vuelta a la Caja.
- [ ] **Duallocke / Soul Link:** dos jugadores con runs enlazadas (los encuentros de cada zona van en pareja; si cae uno, cae su pareja). **Con un sistema de amigos sería la repanocha:** enlazar dos runs entre dos Lockedex (cuenta o código de amigo, sincronización por la nube o por archivo/QR), ver la run del otro y que las muertes se propaguen.
- [x] 1.19.0: **Wonderlocke**, **Genlocke** (`genlocke.js`, `Genlocke.svelte`: «Siguiente juego del Genlocke» desde el Salón de la Fama, herencia en la run nueva) y **Sacrificio** por medalla (`Sacrificio.svelte`, «Progression Sacrifice» de Bulbapedia). Wedlocke en la 1.17.0; monotipo y nivel máximo estricto ya estaban. Antes: Otras variantes populares a valorar: **Wonderlocke** (intercambio prodigioso), **Monotype** (solo un tipo), **Genlocke** (varias generaciones seguidas con el equipo del anterior), **Wedlocke** (parejas), **Sacrificio**, **Nuzlocke por niveles (level cap estricto)**…

## 5c. Ideas nuevas (26/11, le gustaron al usuario)

- [x] **1.18.0 — Salón de la Fama** (`lib/lockedex/SalonFama.svelte`, `salon.js`; panel en la vista de partida al vencer al Campeón, guardado en `lockedex.salon` y sección mínima en el Perfil). Antes: la pareja del game over. Al vencer al Campeón, una pantalla con tu equipo, las medallas, los caídos y el tiempo, con estética de consola (como la del Salón de la Fama de los juegos), que queda guardada en el perfil.
- [x] **1.18.0 — Diario de la run** (`lib/lockedex/diario.js` compara una foto de la run en cada cambio, también los del compacto; `Diario.svelte` con filtros, notas y «Copiar texto»; cuenta desde la 1.18.0). Antes: línea de tiempo estilo GBA con todo lo que pasa («Capturaste a Pidgey en la Ruta 1», «Saur cayó contra Brock», «Medalla Roca»). Sale de lo que ya se apunta (encuentros, `__teams`, derrotas); haría falta guardar la fecha de cada cambio.
- [x] **1.18.0 — Zona actual desde el .sav** (RojoFuego, VerdeHoja y Esmeralda: `herramientas/zonas_sav.py` → `static/lx/zonas-sav.json`, `lib/lockedex/zonas.js`; el compacto la elige sola). Falta Rubí/Zafiro y hacks (otros números de mapa). Antes: el guardado de la 3.ª gen dice en qué mapa estás (grupo y número de mapa); la ventana compacta tendría ya elegida esa zona al apuntar un encuentro. Hace falta una tabla mapa → zona por juego.
- [x] **1.18.0 — Ficha de entrenador para compartir** (`lib/lockedex/TarjetaEntrenador.svelte`, canvas 600×400; medallas de Kanto, Johto y Hoenn de pret en `static/lx/medallas/`, genéricas en el resto). Antes: una imagen como la Ficha de Entrenador de los juegos, con equipo, medallas, caídos y reglas, para pasarla por Discord (generada en un canvas y guardada como PNG).
- [x] **1.19.0 — Equipo equilibrado desde la Caja** (pedido el 26/11; `lib/lockedex/equilibrar.js` y `EquipoEquilibrado.svelte`). Un botón en la Caja («Equilibrar equipo») que mira la Caja y el equipo (solo vivos, sin descartados) y propone los 6 mejores, con lo que cambia respecto al equipo actual («Saca a Mankey, mete a Oddish») y un botón para aplicarlo.
  - **Qué es «equilibrado»:** cobertura ofensiva con los **movimientos** (los del .sav si está vinculado; si no, los que aprenden por nivel, como el riesgo de la 1.18.0), pocas debilidades compartidas (que no haya tres débiles a Tierra), sin repetir tipos de más, y mezcla de atacantes físicos y especiales, velocidad y aguante.
  - **Dos modos:** «General» y «Para el próximo jefe», que usa la calculadora de riesgo contra el próximo jefe (y algún combate más) y suma el riesgo del equipo entero.
  - **Respeta tus reglas:** nivel máximo, monotipo, las parejas del Wedlocke (nunca los dos de una pareja), modo Set. Con el Randomlocke de tipos aleatorizados no se ofrece (no sería fiable).
  - **Opciones:** fijar miembros con un candado («Tortu se queda sí o sí») y explicar cada elección con chips («cubre Agua», «resiste Planta», «el más rápido»).
  - **Cómo calcularlo:** con 30–100 Pokémon en la Caja no se pueden probar todas las combinaciones de 6: puntuar cada candidato, elegir por pasos (greedy) y luego probar cambios de uno en uno (búsqueda local) hasta que ninguno mejore.

## 6. Otras mejoras y limitaciones conocidas

- [x] **1.17.0 — Capturas al equipo solas** (pedido el 26/11): al pasar una fila a capturado, regalo, intercambio o shiny, si hay hueco en el equipo entra sola (`pokemon-selector.svelte` y `acciones.js` para el compacto). 1.17.1: ajuste «Capturas al equipo» (index 10 de los ajustes de la run, `ajustes.js`); de paso, los ajustes se guardan ya cada uno en su posición (antes el de Greenscreen caía en la 9).
- [x] **1.17.1 — Un solo nivel máximo:** `capDelCombate` (en `reglas.js`) da el del próximo líder de gimnasio; lo usan el asistente y el VS como ya hacían el compacto y los avisos.

- [x] **Consejos del riesgo cortados en el modo compacto** (avisado el 25/11): la ventana flotante de 320 px se salía de la ventana. Desde la 1.6.0, en el compacto los consejos salen en un desplegable a todo el ancho, debajo del medidor (`Riesgo.svelte` tiene `sinPopover`).
- [x] **1.19.0 — Modo batalla en el compacto** (`lib/lockedex/ModoBatalla.svelte`: duelo con la calculadora, estados, clima, PS y potenciadores, siguiente Pokémon del jefe y «Ha caído»). Pedido el 25/11: durante un combate contra un jefe, ver su Pokémon actual y el tuyo, con la **calculadora de daño** (`@smogon/calc`, ya en la app): daño de cada ataque en %, si hace KO y en cuántos golpes, quién es más rápido y el siguiente Pokémon del rival. Ideas: elegir tu Pokémon y el suyo con un toque, cambiar de nivel o estado (quemado, paralizado), clima y potenciadores (+1/+2), y apuntar al terminar si se ganó o quién cayó.
- [ ] **Leer el .sav de NDS** (4.ª y 5.ª generación: DPPt, HGSS, BW, B2N2), con IVs y EVs exactos, naturaleza, habilidad y movimientos. Formato documentado (cifrado PRNG, bloques barajados, sumas de verificación); los .dsv de DeSmuME llevan un pie que hay que quitar. Hace falta un .sav real del usuario para probarlo.
- [ ] **Reconocer equipo por captura** (pedido el 25/11): elegir la ventana del emulador, capturar la pantalla de datos del Pokémon y leer especie (por el sprite), nivel, naturaleza y estadísticas (plantillas de la fuente de cada juego o Tesseract.js sin conexión) para calcular **rangos de IVs** (los EVs no se ven en pantalla). Hay que calibrar cada juego con capturas reales. Útil sobre todo donde no hay .sav (Switch).

- [x] **El rival llevaba el inicial equivocado** (avisado el 25/11: Bulbasaur y el rival con Squirtle). El tipo de inicial solo cambiaba con los iconos de la fila «Inicial» y por defecto era fuego. Desde la 1.5.2 se deduce del Pokémon apuntado (`lib/lockedex/inicial.js`, también para los iniciales de Unbound, Blazing Emerald y New Generations), salvo en Randomlocke o si ya se eligió a mano.
- [x] **Jefes vencidos no detectados** (avisado el 25/11): `resumirPartida` leía `__teams` como objeto y es una lista `[{ id, … }]`, así que el modo compacto, las medallas y el perfil no veían los combates ganados. Arreglado en la 1.5.2, y el modo compacto tiene «🏅 Vencido» (con confirmación) y «Deshacer».
- [x] **El «próximo jefe» se saltaba al rival** (avisado el 25/11: capturar en la Ruta 2 antes de ir a la Ruta 22 lo pasaba a Brock). Desde la 1.5.3 los jefes que no cortan el paso (rivales, equipos malvados…) solo cuentan como pasados si los marcas, si estuviste en su zona (la ruta con su nombre o la anterior), si es el primer combate o si ya dejaste atrás el gimnasio siguiente. Gimnasios y Alto Mando siguen contando como pasados en cuanto capturas más adelante.
- [x] **Modo compacto más completo** (pedido el 25/11, 1.5.4): flechas ◀ ▶ para moverse entre jefes (y ⟲ para volver al próximo), «Vencido» o «Quitar» sobre el jefe que se ve, y el «NV. MÁX» es siempre el del próximo líder de gimnasio (o el Alto Mando al final), aunque se vea un rival o un equipo malvado.
- [x] Nombres oficiales en español de los lugares de Kanto, Johto y Sinnoh que faltaban (Pueblo Paleta, Ciudad Trigal, Ciudad Corazón…), en `interfaz-es.json`. Faltan algunos dudosos (Puerta Pirita, Senda Desolada, Cueva Acantilado…): revisar con una fuente oficial.

- [x] **Página anterior visible ~1 s al cambiar de pestaña** (sobre todo desde Inicio y Partidas; avisado el 25/11). Causa: en Svelte 3 las transiciones son globales, así que la animación de salida de la página vieja (el menú de Inicio, la lista de Partidas) se reproducía encima de la nueva. Arreglado en la 1.5.1 marcando todas las transiciones de salida como `|local` y dejando solo de entrada la de Partidas, que estaba en la raíz de la página. Prueba: `pruebas/solape.mjs` mide cuánto sigue visible la página vieja (ahora 0 ms en todos los cambios). **Al añadir transiciones nuevas, usar siempre `|local`.**

- [ ] **Lector de .sav:** (1.12.1) **probado con una partida real de RojoFuego del usuario** (49 h, equipo de 6 y 17 en cajas: juego, entrenador, motes, niveles y naturalezas bien) y **arreglados los IVs y la habilidad**, que se leían de las cintas (bytes 8–11 de la subestructura M) en vez de los bytes 4–7: salían siempre 0. La partida está en `/home/claude/pruebas/sav-real/` (no subirla al repo: datos personales); probar con `node /home/claude/pruebas/sav/leer_real.mjs <archivo>`. Falta probar Rubí, Zafiro, Esmeralda, VerdeHoja y hacks CFRU. Antes: probado solo con partidas sintéticas. Hay que probarlo con partidas reales de Rubí, Zafiro, Esmeralda, RojoFuego y VerdeHoja (y con hacks CFRU como Radical Red y Unbound, que amplían especies y pueden no ser compatibles).
- [ ] Añadir .sav de otras generaciones (1–2 en GB/GBC y 4–5 en NDS, siguiendo los formatos de PKHeX).
- [x] **Modo compacto con acciones rápidas** (1.5.0): apuntar el encuentro de la siguiente zona (capturado o fallido) y marcar como caído a un miembro del equipo. Se envían por IPC a la ventana principal (`lib/lockedex/acciones.js`), que es la que guarda.
- [x] **1.18.0 — Riesgo por movimientos, no por tipos** (pedido el 26/11): sin .sav, tu equipo al nivel máximo con lo que aprende por nivel y el jefe con sus movimientos, por la calculadora de daño (modo «estimado»). Lo de abajo era el encargo: Con el .sav importado o vinculado ya se usan los movimientos reales (calculadora de daño); el problema es la **estimación sin .sav** (`riesgoPorTipos` en `riesgo.js`):
  - **Lo que pega el jefe:** hoy suma sus tipos aunque no tenga movimientos de ese tipo (`tiposAtaque` mete siempre `b.types`): la Starmie de Misty cuenta como psíquica sin tener ningún ataque psíquico. Contar solo los tipos de sus **movimientos ofensivos** (los datos de los jefes los traen), con potencia, **STAB** (×1,5) y categoría (física/especial contra tu Defensa o tu Defensa Especial; en la 1.ª–3.ª gen, por tipo).
  - **Tus bazas:** que salgan también de **tus movimientos**, no solo de tus tipos. Sin .sav, los probables por nivel hasta tu nivel o el nivel máximo (como ya hace el asistente). Ejemplo del usuario: Wartortle con Mordisco (siniestro, supereficaz contra Starmie) que además resiste su STAB de agua → respuesta buena aunque por tipos no lo parezca.
  - **Factores extra a sopesar:** quién es más rápido (estadística base + nivel), aguante (PS y defensas base), habilidades que anulan tipos (Levitación, Absorbe Agua, Sebo…), objetos (Baya Zidra), clima, movimientos con prioridad y el nivel máximo.
  - Que los consejos lo expliquen con el movimiento («Wartortle con Mordisco le pega supereficaz y resiste su Pistola Agua»), igual que en el modo calculadora.
- [x] 1.15.0: **naturalezas reales de los jefes de la 3.ª gen** (calculadas como `CreateNPCTrainerParty`: hash del nombre del entrenador y de la especie, `herramientas/naturalezas_jefes.py` → campo «nat»), **IVs de Platino** (`iv_scale` de pret/pokeplatinum) y EVs 0 explícitos. 1.17.0: naturalezas de Platino (TrainerData_BuildParty: semilla = iv_scale + nivel + especie + índice del entrenador, LCRNG avanzado tantas veces como la clase) y Gardenia (Cherrim) y Candice (Piloswine Nv. 40, orden del juego) corregidas. 1.18.0: IVs y naturalezas de **Diamante/Perla** (pret/pokediamond) y **HGSS** (pret/pokeheartgold, con el cambio de habilidad que mueve el último bit), y cuatro niveles de jefes corregidos (Lucario de Cynthia y Bronzor de Saturn en DP; Exeggutor de Will y Kabutops de Brock en HGSS). Falta la 5.ª gen: no hay decomp. Antes, 1.10.0 (en parte): **IVs reales de los jefes de RojoFuego, VerdeHoja, Esmeralda y (1.10.1) Rubí/Zafiro** (525 Pokémon, de pret: `herramientas/ivs_jefes.py` → campo «iv» en `datos/jefes`); clima de Sequía/Llovizna/Chorro Arena/Nevada; movimientos con prioridad que rematan. Falta: IVs de otros juegos (4.ª+ gen), naturalezas de los entrenadores y EVs. Antes: **Afinar el riesgo:** IVs y EVs reales de los jefes por juego, cambios de forma o tipo, objetos, clima y prioridad.
- [x] 1.15.0 (`lib/lockedex/sincronizar.js`): al guardar en el emulador se aplican solas las evoluciones (emparejando por línea evolutiva) y se pregunta por los del equipo con 0 PS; en Importar salen también como «caído». Arreglada de paso una carrera en `pokemon-selector.svelte` que volvía a guardar la especie vieja. Antes: Sincronizar la partida del emulador con la run de forma más fina (evoluciones, muertes cuando el Pokémon sale debilitado en el .sav).
- [x] 1.10.1: 15 logros (antes 8) con sprites de objetos de los juegos en vez de símbolos, en gris hasta conseguirlos, y sección «Por juego» en el perfil.
- [x] Privacidad y créditos reescritos en español (1.5.0), con lo que de verdad hace la versión de escritorio y los proyectos en los que se apoya.
- [x] 1.9.0: traducidas las guías por juego (índice, encuentros, jefes, inicial) y las plantillas de epitafio del modal de muerte (con concordancias: «el Rattata salvaje», «de tipo Fuego»). Quedan en inglés los textos largos de `src/docs/*.md` (9 juegos) y los nombres de lugares unidos en listas de solo lector de pantalla.
- [ ] Firmar el instalador para que Windows no muestre el aviso de SmartScreen (requiere certificado).
