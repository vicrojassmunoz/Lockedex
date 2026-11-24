# Base de datos de Lockedex

Esta carpeta es la **fuente de verdad** de los datos de juego. Partió de los datos de nuzlocke-redux (que a su vez vienen de [domtronn/nuzlocke.data](https://github.com/domtronn/nuzlocke.data)) y desde aquí se corrigen y amplían.

| Archivo | Qué contiene | Se compila a |
| --- | --- | --- |
| `juegos.json` | Cada juego: nombre, logo, generación, región, parche, dificultades… (el orden es el de la lista de juegos) | `web/src/lib/data/games.json` |
| `rutas/<clave>.json` | Rutas en orden con sus encuentros (`type: "route"`) y los jefes intercalados (`type: "gym"`, con `value` = id del jefe) | `routes.json` |
| `jefes/<liga>.json` | Equipos de los jefes: nivel, movimientos, habilidad, objeto y, si depende del inicial, `starter` | `league.json` |
| `parches/<id>.json` | Cambios de cada ROM hack (movimientos, habilidades, objetos, Pokémon y fakemon) | `patches.json` |
| `entrenadores.json` | Clases de entrenador por generación | `trainers.json` |
| `indice.json` | Orden de las claves al compilar (lo nuevo va al final) | — |

## Cómo se usa

```bash
node herramientas/datos.mjs compilar    # después de tocar algo en datos/
node herramientas/datos.mjs comprobar   # valida y comprueba que la app está al día
```

GitHub Actions ejecuta `comprobar` antes de compilar: si hay un error de estructura o te olvidaste de compilar, la versión no se publica. Los avisos (Pokémon o movimientos que no se reconocen) no bloquean, pero conviene revisarlos: así salieron erratas como `pelliper`, `smeagle` o `kanghaskan`.

## Pendiente

Los equipos detallados de los jefes que ve la app (`web/static/api/league/<juego>.<inicial>.json`, con estadísticas y movimientos resueltos) todavía son los generados por el proyecto original. El siguiente paso es generarlos desde `jefes/` + PokeAPI con un script propio.
