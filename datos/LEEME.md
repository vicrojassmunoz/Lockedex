# Base de datos de Lockedex

Esta carpeta es la **fuente de verdad** de los datos de juego. Partió de los datos de nuzlocke-redux (que a su vez vienen de [domtronn/nuzlocke.data](https://github.com/domtronn/nuzlocke.data)) y desde aquí se corrigen y amplían.

| Archivo | Qué contiene | Se compila a |
| --- | --- | --- |
| `juegos.json` | Cada juego: nombre, logo, generación, región, parche, dificultades… (el orden es el de la lista de juegos) | `web/src/lib/data/games.json` |
| `rutas/<clave>.json` | Rutas en orden con sus encuentros (`type: "route"`) y los jefes intercalados (`type: "gym"`, con `value` = id del jefe) | `routes.json` |
| `jefes/<juego>.json` | Equipos de los jefes de cada juego (y de cada dificultad, como `radred_hard`): nivel, movimientos, habilidad, objeto y, si depende del inicial, `starter` | `web/static/api/league/<juego>.<inicial>.json` (los tres iniciales) y `league.json` |
| `parches/<id>.json` | Cambios de cada ROM hack (movimientos, habilidades, objetos, Pokémon y fakemon) | `patches.json` |
| `entrenadores.json` | Clases de entrenador por generación | `trainers.json` |
| `indice.json` | Orden de las claves al compilar (lo nuevo va al final) | — |

## Cómo se usa

```bash
node herramientas/datos.mjs compilar    # después de tocar algo en datos/
node herramientas/datos.mjs comprobar   # valida y comprueba que la app está al día
```

GitHub Actions ejecuta `comprobar` antes de compilar: si hay un error de estructura o te olvidaste de compilar, la versión no se publica. Los avisos (Pokémon o movimientos que no se reconocen) no bloquean, pero conviene revisarlos: así salieron erratas como `pelliper`, `smeagle` o `kanghaskan`.

## Los jefes, en formato corto

Cada Pokémon de un jefe se escribe con nombres cortos de PokeAPI:

```json
{ "name": "makuhita", "level": "19", "moves": ["arm-thrust", "vital-throw", "reversal", "bulk-up"], "ability": "guts", "held": "sitrus-berry" }
```

Al compilar se calculan la potencia, el tipo y la clase de cada movimiento, los nombres de habilidad y objeto, el sprite, los tipos y las estadísticas, con los datos de `web/static/lx/` y el parche del juego. Hasta la 3.ª generación la clase (físico/especial) sale del tipo, como en los juegos originales.

- **Rival que cambia según tu inicial:** pon `"starter": "fire" | "grass" | "water"` en los Pokémon que solo salen con ese inicial.
- **Algo distinto a lo calculado** (un ataque modificado en un ROM hack, unas estadísticas propias…): escribe el movimiento como objeto (`{ "name": "Spark", "type": "electric", "power": 65, "damage_class": "special", "effect": "" }`) o añade `sprite`, `types` o `stats` al Pokémon. Con `"calc": false` no se calcula nada y se copia tal cual.
- `hidden-power-<tipo>` es Poder Oculto de ese tipo.

La primera migración se hizo desde los equipos detallados del original (`extraer-jefes`) y al compilar sale **byte a byte lo mismo**: los 165 archivos son idénticos.
