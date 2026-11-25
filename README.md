# Lockedex

<p align="center"><img src="web/static/logo.png" alt="Lockedex" width="480"></p>

**Tu Pokédex para Nuzlockes.** Lockedex es una app de escritorio para Windows con la que llevas el control de tus runs de Pokémon en modo Nuzlocke: encuentros ruta a ruta, equipo, caja, cementerio y todos los jefes de cada juego, con su nivel máximo.

Está basada en [nuzlocke-redux](https://nuzlocke-redux.vercel.app) (de domtronn y Bassel-T) y añade:

- **Tus partidas en tu ordenador.** Se guardan en `Documentos\Lockedex\partidas.json`, con una copia de seguridad diaria automática. Borrar las cookies del navegador ya no te hace perder nada.
- **Estilo Pokédex** y **todo en español**, con los nombres oficiales de movimientos, habilidades, objetos y lugares.
- **Información al pasar el ratón** por cualquier movimiento, habilidad u objeto: tipo, categoría, potencia, precisión, PP y descripción.
- **Nivel de riesgo de cada jefe** y un **asistente de combate** con consejos y los movimientos que aprende tu equipo hasta el nivel máximo.
- **Importación de partidas .sav** de Rubí, Zafiro, Esmeralda, RojoFuego y VerdeHoja: equipo y cajas con niveles, movimientos, naturalezas e IVs. Si quieres, se reimporta sola cada vez que guardas en el emulador, y el riesgo se calcula con la calculadora de daño de Smogon.
- **Modo Analista**: prepara cualquier combate sin partida, con equipos a mano, copiados de tu run o tu .sav, aleatorios o de Showdown.
- **Reglas de Nuzlocke** con plantillas (Clásico, Hardcore, Randomlocke) y cláusulas ampliadas, con avisos si las rompes. Incluye un **modo Randomlocke**.
- **Caja tipo PC** con panel de detalle y **cementerio** con lápidas pixel propias.
- **Modo sin spoilers**, para ocultar los equipos o los jefes hasta que decidas verlos.
- **Barra de EXP** con el progreso de la run, **perfil de entrenador** con foto, estadísticas y logros, y **modo compacto** (Ctrl+Alt+L): una ventanita siempre encima, junto al emulador, desde la que puedes apuntar encuentros y bajas sin salir del juego.
- **Se actualiza sola** desde las versiones publicadas en este repositorio.
- Sin Google Analytics ni envío de estadísticas.

## Instalar

Descarga `Lockedex-Instalador-X.Y.Z.exe` de la última versión en [Releases](../../releases/latest) y ábrelo. No hace falta ser administrador.

Windows puede mostrar el aviso «Windows protegió su PC» porque el instalador no está firmado: pulsa **Más información → Ejecutar de todas formas**.

## Cómo se publica una versión

1. Anota los cambios en `NOVEDADES.md`.
2. Sube el número de versión en `electron/package.json` (por ejemplo, de 1.2.0 a 1.3.0) y súbelo a `main`.
3. GitHub Actions compila Lockedex en Windows, comprueba que arranca, crea la etiqueta `vX.Y.Z` y publica la versión. Las apps instaladas la descargan solas y avisan con el botón **¡Actualizar!**.

## Estructura

- `web/`: la app (SvelteKit), basada en nuzlocke-redux. Lo propio de Lockedex está en `web/src/lib/lockedex/` y los datos generados en `web/static/lx/`.
- `electron/`: el programa de escritorio (ventana, guardado en archivo, modo compacto, lectura de .sav y actualizaciones).
- `herramientas/`: scripts que generan los datos de `web/static/lx/` a partir de PokeAPI y de los proyectos pret, `generar_marca.py`, que crea el logo y las imágenes de marca, y `generar_iconos.py`, que dibuja los iconos pixel art de la interfaz.
- `datos/`: la base de datos propia (juegos, rutas, jefes y parches de ROM hacks). Ver `datos/LEEME.md`.
- `marca/`: el logo de Lockedex en SVG (`icono.svg` y una versión simplificada para 16–48 px). Si lo cambias, ejecuta `python3 herramientas/generar_marca.py`.

## Créditos y licencia

- Código original: [Bassel-T/nuzlocke.app](https://github.com/Bassel-T/nuzlocke.app) y [domtronn/nuzlocke.app](https://github.com/domtronn/nuzlocke.app), licencia BSD-3 (ver `LICENSE`).
- Datos de movimientos, habilidades, objetos y nombres en español: [PokeAPI](https://pokeapi.co).
- Tablas de 3.ª generación: [pret/pokeemerald](https://github.com/pret/pokeemerald) y [pret/pokefirered](https://github.com/pret/pokefirered).
- Sprites de Pokémon: [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Fuente VT323 (licencia SIL OFL 1.1).

Pokémon y los nombres de Pokémon son marcas de Nintendo, Creatures Inc. y GAME FREAK inc. Lockedex es un proyecto de fans sin ánimo de lucro y no está afiliado a ellos.
