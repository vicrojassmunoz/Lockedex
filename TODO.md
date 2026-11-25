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
- [ ] **Iconos con sprites de los juegos (≤ 5.ª gen, nada de 3D)** — el usuario deja libertad para elegir los mejores; ir poco a poco, unos cuantos por versión. Hoja de los actuales: `herramientas/generar_iconos.py --muestra`.
  - Criterio: **objeto de la mochila** (PokéSprite, `/home/claude/pokesprite/items`) cuando el icono representa algo que se lleva (Poké Ball, piedras, Mapa, Cuerda Huida, MT…); **objeto del tileset/mapa** (pret: pokefirered/pokeemerald `data/tilesets/.../metatiles`, `graphics/`) cuando es mobiliario o escenario: el **PC** mejor como el PC del Centro Pokémon, la Caja, la Tienda, la Liga (estatua/puerta), el cementerio (lápida de la Torre Pokémon)…
  - **No** usar proteínas/vitaminas para las estadísticas (no le gustan). Los iconos de estadísticas actuales (Atk, Def, Spa, Spd…) son «feotes»: rehacerlos a mi manera (p. ej. símbolos pixel claros o las barras de colores de la pantalla de datos).
  - Se añaden a `web/static/lx/objetos/` (o `lx/tiles/`) y a `icons/sprites.js` + `IconSet.ts`; los créditos ya citan PokéSprite y pret.
  - [x] La Cuerda Huida («Fallido») no se veía bien → Bola Humo (1.8.0).
  - [x] **1.8.0 — iconos elegidos por el usuario** (sprites sacados con `herramientas/iconos_juego.py` a `web/static/lx/objetos/`; exportados en `icons/sprites.js`):
    Caja = PC del Centro Pokémon (metatile 741) · Equipo = personaje del mapa del avatar del perfil (`spriteAvatar` en `mapa.js`, Rojo si no hay) · Muerto/Cementerio = lápida de la Torre Pokémon (657) · Fallido = Bola Humo · Regalo = Gloria Ball · Medallas = Cinta Campeón · Mapa = el Mapa del mapa de RojoFuego · Intercambiado = recepcionista del Club de Cable (**el usuario no está seguro: preguntar al verlo**) · Estadísticas = objetos Recio de la 4.ª gen (Pesa, Brazal, Cinto, Lente, Banda y Franja Recias), elegido por el usuario entre las opciones «no tan GBA».
    - [x] **1.9.0 — lugares y clases**: Ruta = cartel de madera, Pueblo = cartel blanco, Ciudad = Centro Pokémon, Bosque = árbol, Hierba alta = el tile de hierba, Cueva = entrada de cueva, Monte = roca grande, Estadio = cartel de gimnasio, Ruinas = fósil, Santuario = piedra mística de Isla Origen; físico/especial/estado dibujados a la manera de la 4.ª gen (`herramientas/iconos_juego.py`).
- [x] 1.11.0: el icono del Pokémon elegido en el menú de equipo salta a dos fotogramas (como en GBA) y la ficha usa el sprite animado de Negro/Blanco (PokeAPI/sprites, con el fijo si no hay internet). Antes: **Sprites animados al seleccionar un Pokémon** en el menú de equipo / ficha (como el icono que se mueve en el menú de GBA, y el sprite animado de la 4.ª–5.ª gen en la ficha). «Yo por pedir que no quede». Ver qué sprites animados hay (PokeAPI/sprites `versions/generation-v/black-white/animated/*.gif`, iconos de 2 frames de pokeemerald `graphics/pokemon/*/icon.png`).
- [x] **1.9.2 — Tema oscuro «de noche en los juegos»**: violeta-índigo de las rutas de noche, texto crema, rayitas diagonales de los menús de GBA y grises de Tailwind heredados al mismo tono (`lockedex.css`). Pendiente de que el usuario lo vea. Antes: **Tema oscuro con estética Pokémon**: el claro le encanta, pero el oscuro «es muy moderno, muy poco pokémon». Rehacer la paleta oscura inspirándose en los juegos (noche de los juegos, menús de la 4.ª gen en DS, PC/Pokédex de noche) en vez del azul marino plano tipo web; revisar `--lx-*` oscuros en `lockedex.css`.
- [ ] **Responsive al ancho de la ventana**: con la ventana estrecha se cortan cosas, p. ej. la Piedra Fuego del selector de inicial (`starter-type.svelte`) se ve cortada en el borde derecho de la cabecera de la partida. Revisar cabecera de la partida, barra, tarjetas de jefe y el menú de equipo a 800–1000 px.
- [x] Nombres de gimnasio traducidos con un patrón («Cerulean City Gym» → «Gimnasio de Ciudad Celeste»).

**Pendiente:**

- [x] 1.11.0: ficha al lado de cada fila (ventana ≥ 1200 px): sprite grande (gris si cayó, variocolor si lo es), estado como sello de goma de color y naturaleza como chip ↑/↓. Antes: **Filas de encuentros, paso 2**: fichas con sprite grande, estado como sello y naturaleza como chip (ahora solo es el contenedor).
- [x] **Caja** (1.5.0): rejilla tipo caja del PC (30 huecos por caja, flechas para moverse, se puede arrastrar al equipo) con panel de detalle (`lib/lockedex/CajaPC.svelte`). Las fichas de siempre siguen en la pestaña «Fichas».
- [x] **Cementerio** (1.5.0): lápidas pixel art propias dibujadas en SVG (`graveyard/Lapida.svelte`, 4 formas con musgo y grietas al azar) y la causa de la muerte al pasar por encima.
- [ ] **Tarjetas de los jefes por dentro** (`move-card.svelte`, cabecera de `pokemon-card`): pantalla oscura y estadísticas en barras tipo PS.
- [ ] **Página de cada guía**: listados en pantallas, mismo estilo que la app.
- [x] 1.10.0: repasado el tema oscuro en Partida, Caja, Cementerio, Analista, Partidas, Nueva partida y Guías; el naranja heredado pasa a ser el rojo de Lockedex y el índigo el turquesa LCD (`tailwind.config.cjs`). Antes: Repasar el tema oscuro pantalla por pantalla y los colores sueltos de Tailwind que quedan (`grep -rn "orange-\|indigo-" web/src`).

Cómo hacerlo: ir componente a componente, con capturas antes y después. Se puede abrir Electron con `--remote-debugging-port` y hacer capturas con puppeteer-core, como en las pruebas de esta sesión. Sería útil maquetar primero cada pantalla (por ejemplo, como diseño en Claude) y luego pasarla a código.

---

- [ ] **Actualizaciones más ligeras** (idea del usuario, 25/11). **Paso 1 hecho en la 1.9.0:** las guías ya no se prerenderizan (−171 MB sin comprimir; `electron/app` pasa de 252 a 82 MB). **Resultado real: el instalador solo baja de 148,5 a 143,3 MB**, porque esos HTML se comprimían muchísimo; casi todo el peso es Electron. Lo que de verdad aligeraría las actualizaciones es el punto 3 (solo contenido) o la descarga diferencial. Hoy cada versión baja el instalador entero (~148 MB). Medido en local: `electron/app` ocupa 252 MB sin comprimir, de los que **171 MB son `app/prerendered`** (páginas y JSON prerenderizados, en parte duplicados de `static/api`), 46 MB `client` y 35 MB `server/chunks`.
  1. **Adelgazar lo que se empaqueta:** ver qué se prerenderiza (probablemente las rutas `/api/...` de cada juego/Pokémon) y servirlo desde `static/` o generarlo al vuelo; quitar duplicados. Puede bajar el instalador a la mitad o menos.
  2. **Comprobar que funciona la descarga diferencial** de electron-updater (ya se publican los `.blockmap`): mirar en el registro de la app si pone «Downloading … differential»; si no compensa por la compresión sólida del NSIS, probar `nsis.differentialPackage`.
  3. **Actualizaciones solo de contenido:** si Electron no cambia, bajar solo un zip de `app/` (unos MB) firmado con hash SHA-256 publicado en la release, descomprimirlo en `userData` y servir desde ahí; el instalador completo solo cuando cambia la versión de Electron o `main.mjs`.

### Repaso del usuario (25/11, tarde) — pendiente
- [ ] **Revisar el tamaño de los Pokémon en toda la app** (pedido el 25/11): hay sitios donde se ven pequeños o a escalas raras. Los sprites base vienen en un lienzo de 96×96 con mucho margen y los iconos de caja (PIcon) a 40×30; repasar filas de encuentros, selector, Caja (fichas y PC), tarjetas de jefe, VS, cementerio, equipo de la barra y modo compacto: recortar el margen o escalar a múltiplos enteros (×1, ×2) para que se vean grandes y nítidos.
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
- [ ] **Analista: lavado de cara a fondo** — se parece demasiado al original. Misma línea que el menú de equipo y la ficha (estética GBA/NDS: marcos de `gba.js`, letra Fusion Pixel, paneles de la pantalla de datos).
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
- [x] 1.10.0: compacto en Randomlocke con riesgo solo si se apuntó el equipo real; barra de EXP con «MÁX n» y el próximo jefe en el título.
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

## 5b. Modos de juego (pedido el 25/11)

- [x] **1.12.0 — Marcar una derrota** (`lib/lockedex/derrotas.js`, `FinPartida.svelte`): botón «Derrota» en la ventana de VS y en el compacto, «He perdido» en la partida, pantalla de FIN DE LA PARTIDA con «Nuevo intento» (guarda el intento en `lockedex.historial.<id>`) y «Deshacer»; cuenta en el perfil (runs perdidas, verdugo, derrotas por juego, logro «Levántate»). Pendiente: proponer game over solo al caer todo el equipo con la regla de Game over (ahora lo avisa AvisosReglas). Plan original: poder indicar que **has perdido contra un jefe** o que **has perdido la run en general** (te han debilitado a todo el equipo, te rindes…).
  - En la tarjeta de cada jefe y en la ventana de VS, junto a «Marcar victoria»: botón **«Derrota»** → se apunta la derrota (jefe, fecha, equipo que llevabas) y, según las reglas, o es **game over** o se sigue (modo con vidas: resta una vida; reglas suaves: solo queda apuntado).
  - Botón general **«He perdido»** en la partida (y en el modo compacto) para cuando no ha sido contra un jefe.
  - **Game over:** la run queda marcada como perdida (no se puede seguir editando salvo deshacer), con resumen (hasta dónde llegaste, medallas, caídos, quién te ganó) y botón **«Nuevo intento»** (ya existe en Cargar partida: reutilizarlo). Que cuente en el perfil (logros, «tu mayor verdugo», runs perdidas por juego).
  - Con el modo con vidas y el Hardcore de las reglas, la derrota la puede proponer la app sola cuando cae todo el equipo.

Ampliar los modos además de Nuzlocke clásico, Hardcore y Randomlocke. Cada modo = plantilla de reglas + lo que la app tenga que llevar (contadores, avisos, pantallas):

- [x] **1.12.0 — Modo con vidas**: regla «Modo con vidas» (3/5/10/20) y plantilla «Extremo (10 vidas)»; contador ♥ en la partida y en el compacto; sin vidas → game over solo. Plan original: un contador de vidas por run; cada Pokémon caído resta una y al llegar a 0 es game over (con «nuevo intento»). Que el número sea configurable.
- [ ] **Egglocke:** los encuentros se cambian por huevos (los Pokémon que salen de ellos son los que usas). Apuntar qué sale de cada huevo.
  - [ ] **Generador de Egglocke** (más adelante, «fumada pero se tendrá que poder»): reparto de huevos con Pokémon aleatorios **por juego oficial** (solo especies que existen en ese juego/generación), con opciones (sin legendarios, por tipo, equilibrado por evoluciones…) y una lista para compartir/imprimir.
- [x] **1.12.0 — Cláusula de revivir**: regla (1 por medalla, 1 o 3 por run) y botón «Revivir» en el cementerio (vuelve a la caja como capturado; gasta una vida si se juega con vidas). Plan original: cuándo se puede revivir a un Pokémon, si se permite (p. ej. uno por cada medalla/gimnasio, o X en toda la run). La app lleva la cuenta de revividos disponibles y saca al Pokémon del cementerio de vuelta a la Caja.
- [ ] **Duallocke / Soul Link:** dos jugadores con runs enlazadas (los encuentros de cada zona van en pareja; si cae uno, cae su pareja). **Con un sistema de amigos sería la repanocha:** enlazar dos runs entre dos Lockedex (cuenta o código de amigo, sincronización por la nube o por archivo/QR), ver la run del otro y que las muertes se propaguen.
- [ ] Otras variantes populares a valorar: **Wonderlocke** (intercambio prodigioso), **Monotype** (solo un tipo), **Genlocke** (varias generaciones seguidas con el equipo del anterior), **Wedlocke** (parejas), **Sacrificio**, **Nuzlocke por niveles (level cap estricto)**…

## 6. Otras mejoras y limitaciones conocidas

- [x] **Consejos del riesgo cortados en el modo compacto** (avisado el 25/11): la ventana flotante de 320 px se salía de la ventana. Desde la 1.6.0, en el compacto los consejos salen en un desplegable a todo el ancho, debajo del medidor (`Riesgo.svelte` tiene `sinPopover`).
- [ ] **Modo batalla en el compacto** (pedido el 25/11): durante un combate contra un jefe, ver su Pokémon actual y el tuyo, con la **calculadora de daño** (`@smogon/calc`, ya en la app): daño de cada ataque en %, si hace KO y en cuántos golpes, quién es más rápido y el siguiente Pokémon del rival. Ideas: elegir tu Pokémon y el suyo con un toque, cambiar de nivel o estado (quemado, paralizado), clima y potenciadores (+1/+2), y apuntar al terminar si se ganó o quién cayó.
- [ ] **Leer el .sav de NDS** (4.ª y 5.ª generación: DPPt, HGSS, BW, B2N2), con IVs y EVs exactos, naturaleza, habilidad y movimientos. Formato documentado (cifrado PRNG, bloques barajados, sumas de verificación); los .dsv de DeSmuME llevan un pie que hay que quitar. Hace falta un .sav real del usuario para probarlo.
- [ ] **Reconocer equipo por captura** (pedido el 25/11): elegir la ventana del emulador, capturar la pantalla de datos del Pokémon y leer especie (por el sprite), nivel, naturaleza y estadísticas (plantillas de la fuente de cada juego o Tesseract.js sin conexión) para calcular **rangos de IVs** (los EVs no se ven en pantalla). Hay que calibrar cada juego con capturas reales. Útil sobre todo donde no hay .sav (Switch).

- [x] **El rival llevaba el inicial equivocado** (avisado el 25/11: Bulbasaur y el rival con Squirtle). El tipo de inicial solo cambiaba con los iconos de la fila «Inicial» y por defecto era fuego. Desde la 1.5.2 se deduce del Pokémon apuntado (`lib/lockedex/inicial.js`, también para los iniciales de Unbound, Blazing Emerald y New Generations), salvo en Randomlocke o si ya se eligió a mano.
- [x] **Jefes vencidos no detectados** (avisado el 25/11): `resumirPartida` leía `__teams` como objeto y es una lista `[{ id, … }]`, así que el modo compacto, las medallas y el perfil no veían los combates ganados. Arreglado en la 1.5.2, y el modo compacto tiene «🏅 Vencido» (con confirmación) y «Deshacer».
- [x] **El «próximo jefe» se saltaba al rival** (avisado el 25/11: capturar en la Ruta 2 antes de ir a la Ruta 22 lo pasaba a Brock). Desde la 1.5.3 los jefes que no cortan el paso (rivales, equipos malvados…) solo cuentan como pasados si los marcas, si estuviste en su zona (la ruta con su nombre o la anterior), si es el primer combate o si ya dejaste atrás el gimnasio siguiente. Gimnasios y Alto Mando siguen contando como pasados en cuanto capturas más adelante.
- [x] **Modo compacto más completo** (pedido el 25/11, 1.5.4): flechas ◀ ▶ para moverse entre jefes (y ⟲ para volver al próximo), «Vencido» o «Quitar» sobre el jefe que se ve, y el «NV. MÁX» es siempre el del próximo líder de gimnasio (o el Alto Mando al final), aunque se vea un rival o un equipo malvado.
- [x] Nombres oficiales en español de los lugares de Kanto, Johto y Sinnoh que faltaban (Pueblo Paleta, Ciudad Trigal, Ciudad Corazón…), en `interfaz-es.json`. Faltan algunos dudosos (Puerta Pirita, Senda Desolada, Cueva Acantilado…): revisar con una fuente oficial.

- [x] **Página anterior visible ~1 s al cambiar de pestaña** (sobre todo desde Inicio y Partidas; avisado el 25/11). Causa: en Svelte 3 las transiciones son globales, así que la animación de salida de la página vieja (el menú de Inicio, la lista de Partidas) se reproducía encima de la nueva. Arreglado en la 1.5.1 marcando todas las transiciones de salida como `|local` y dejando solo de entrada la de Partidas, que estaba en la raíz de la página. Prueba: `pruebas/solape.mjs` mide cuánto sigue visible la página vieja (ahora 0 ms en todos los cambios). **Al añadir transiciones nuevas, usar siempre `|local`.**

- [ ] **Lector de .sav:** probado solo con partidas sintéticas. Hay que probarlo con partidas reales de Rubí, Zafiro, Esmeralda, RojoFuego y VerdeHoja (y con hacks CFRU como Radical Red y Unbound, que amplían especies y pueden no ser compatibles).
- [ ] Añadir .sav de otras generaciones (1–2 en GB/GBC y 4–5 en NDS, siguiendo los formatos de PKHeX).
- [x] **Modo compacto con acciones rápidas** (1.5.0): apuntar el encuentro de la siguiente zona (capturado o fallido) y marcar como caído a un miembro del equipo. Se envían por IPC a la ventana principal (`lib/lockedex/acciones.js`), que es la que guarda.
- [x] 1.10.0 (en parte): **IVs reales de los jefes de RojoFuego, VerdeHoja, Esmeralda y (1.10.1) Rubí/Zafiro** (525 Pokémon, de pret: `herramientas/ivs_jefes.py` → campo «iv» en `datos/jefes`); clima de Sequía/Llovizna/Chorro Arena/Nevada; movimientos con prioridad que rematan. Falta: IVs de otros juegos (4.ª+ gen), naturalezas de los entrenadores y EVs. Antes: **Afinar el riesgo:** IVs y EVs reales de los jefes por juego, cambios de forma o tipo, objetos, clima y prioridad.
- [ ] Sincronizar la partida del emulador con la run de forma más fina (evoluciones, muertes cuando el Pokémon sale debilitado en el .sav).
- [x] 1.10.1: 15 logros (antes 8) con sprites de objetos de los juegos en vez de símbolos, en gris hasta conseguirlos, y sección «Por juego» en el perfil.
- [x] Privacidad y créditos reescritos en español (1.5.0), con lo que de verdad hace la versión de escritorio y los proyectos en los que se apoya.
- [x] 1.9.0: traducidas las guías por juego (índice, encuentros, jefes, inicial) y las plantillas de epitafio del modal de muerte (con concordancias: «el Rattata salvaje», «de tipo Fuego»). Quedan en inglés los textos largos de `src/docs/*.md` (9 juegos) y los nombres de lugares unidos en listas de solo lector de pantalla.
- [ ] Firmar el instalador para que Windows no muestre el aviso de SmartScreen (requiere certificado).
