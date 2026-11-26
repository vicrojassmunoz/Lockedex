// Cómo se encuentra cada Pokémon en cada zona (método, niveles y probabilidad), para los juegos oficiales
// con datos en PokeAPI. Sale de herramientas/encuentros_pokeapi.py → /lx/encuentros/<juego>.json:
// { "<zona>": { "<alias>": [[metodo, min, max, prob, [condiciones]], …] } }
import { norm } from './datos.js'

const cache = {}
export const cargarEncuentros = (juego) => {
  if (!juego || typeof fetch === 'undefined') return Promise.resolve({})
  cache[juego] ||= fetch(`/lx/encuentros/${juego}.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((datos) => {
      // alias normalizados, como los de la Pokédex de la app
      const out = {}
      for (const [zona, especies] of Object.entries(datos || {})) {
        out[zona] = {}
        for (const [alias, filas] of Object.entries(especies)) out[zona][norm(alias)] = filas
      }
      return out
    })
    .catch(() => ({}))
  return cache[juego]
}

// Andar por la zona es hierba alta fuera y suelo en cuevas y edificios
const CUEVA = /cave|tunnel|mt\.|mount|victory road|islands|cavern|chamber|ruins|grotto|\bden\b|path|falls|abyss|underpass|well|hollow|crater|summit|spire/i
const INTERIOR = /tower|mansion|plant|hideout|silph|building|s\.s\.|ship|lab|gym|castle|chateau|factory|hq|museum|house|store|mall|megamart/i
const METODOS = {
  walk: ['Hierba', 'Grass'],
  'dark-grass': ['Hierba oscura', 'Dark grass'],
  'grass-spots': ['Hierba que se mueve', 'Rustling grass'],
  'cave-spots': ['Polvo en la cueva', 'Dust cloud'],
  'bridge-spots': ['Sombra en el puente', 'Bridge shadow'],
  surf: ['Surf', 'Surf'],
  'surf-spots': ['Surf (ondas)', 'Surf (ripples)'],
  'old-rod': ['Caña Vieja', 'Old Rod'],
  'good-rod': ['Caña Buena', 'Good Rod'],
  'super-rod': ['Supercaña', 'Super Rod'],
  'super-rod-spots': ['Supercaña (ondas)', 'Super Rod (ripples)'],
  'rock-smash': ['Golpe Roca', 'Rock Smash'],
  headbutt: ['Golpe Cabeza', 'Headbutt'],
  'headbutt-low': ['Golpe Cabeza', 'Headbutt'],
  'headbutt-normal': ['Golpe Cabeza', 'Headbutt'],
  'headbutt-high': ['Golpe Cabeza', 'Headbutt'],
  'yellow-flowers': ['Flores amarillas', 'Yellow flowers'],
  'purple-flowers': ['Flores moradas', 'Purple flowers'],
  'red-flowers': ['Flores rojas', 'Red flowers'],
  'rough-terrain': ['Terreno abrupto', 'Rough terrain'],
  gift: ['Regalo', 'Gift'],
  'gift-egg': ['Huevo de regalo', 'Gift egg'],
  static: ['Fijo', 'Static'],
  pokeflute: ['Poké Flauta', 'Poké Flute'],
  'squirt-bottle': ['Regadera', 'Squirt Bottle'],
  'wailmer-pail': ['Regadera', 'Wailmer Pail'],
  seaweed: ['Buceo', 'Dive'],
  'roaming-grass': ['Errante', 'Roaming'],
  'roaming-water': ['Errante (agua)', 'Roaming (water)'],
  'devon-scope': ['Detector Devon', 'Devon Scope'],
  'feebas-tile-fishing': ['Pesca (casillas de Feebas)', 'Fishing (Feebas tiles)'],
  'island-scan': ['Escáner Isla', 'Island Scan'],
  sos: ['Llamada SOS', 'SOS call'],
  'bubbling-spots': ['Agua burbujeante', 'Bubbling spots'],
  'berry-trees': ['Árbol de bayas', 'Berry tree'],
  'npc-trade': ['Intercambio', 'Trade'],
  overworld: ['A la vista', 'Overworld'],
  'overworld-water': ['A la vista (agua)', 'Overworld (water)'],
  'overworld-flying': ['A la vista (volando)', 'Overworld (flying)'],
  'overworld-special': ['A la vista', 'Overworld'],
  'overworld-flying-special': ['A la vista (volando)', 'Overworld (flying)'],
  'overworld-water-special': ['A la vista (agua)', 'Overworld (water)'],
  horde: ['Horda', 'Horde'],
  'hidden-grotto': ['Claro oculto', 'Hidden Grotto'],
  'honey-tree': ['Árbol de miel', 'Honey tree'],
  wanderer: ['Errante', 'Wanderer'],
  'wanderer-water': ['Errante (agua)', 'Wanderer (water)'],
  'max-raid': ['Incursión', 'Max Raid'],
  'dynamax-adventure': ['Aventura Dinamax', 'Dynamax Adventure']
}
const CONDICIONES = {
  'time-morning': ['mañana', 'morning'],
  'time-day': ['día', 'day'],
  'time-night': ['noche', 'night'],
  'swarm-yes': ['enjambre', 'swarm'],
  'radar-on': ['Poké Radar', 'Poké Radar'],
  'radio-hoenn': ['radio Hoenn', 'Hoenn radio'],
  'radio-sinnoh': ['radio Sinnoh', 'Sinnoh radio'],
  'season-spring': ['primavera', 'spring'],
  'season-summer': ['verano', 'summer'],
  'season-autumn': ['otoño', 'autumn'],
  'season-winter': ['invierno', 'winter'],
  'slot2-ruby': ['ranura: Rubí', 'Ruby in slot 2'],
  'slot2-sapphire': ['ranura: Zafiro', 'Sapphire in slot 2'],
  'slot2-emerald': ['ranura: Esmeralda', 'Emerald in slot 2'],
  'slot2-firered': ['ranura: RojoFuego', 'FireRed in slot 2'],
  'slot2-leafgreen': ['ranura: VerdeHoja', 'LeafGreen in slot 2'],
  'headbutt-tree-common': ['árbol común', 'common tree'],
  'headbutt-tree-rare': ['árbol raro', 'rare tree'],
  'story-progress-national-dex': ['con la Pokédex Nacional', 'with the National Dex'],
  'story-progress-hall-of-fame': ['tras la Liga', 'after the League']
}

const ORDEN_CONDICIONES = Object.keys(CONDICIONES)
const lista = (xs, es) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${es ? 'y' : 'and'} ${xs[xs.length - 1]}`)
const traducir = (tabla, clave, es) => (tabla[clave] ? tabla[clave][es ? 0 : 1] : clave.replace(/-/g, ' '))

export const nombreMetodo = (metodo, zona = '', es = true) => {
  if (metodo === 'walk' && CUEVA.test(zona)) return es ? 'Cueva' : 'Cave'
  if (metodo === 'walk' && INTERIOR.test(zona)) return es ? 'Interior' : 'Indoors'
  return traducir(METODOS, metodo, es)
}

const niveles = (mn, mx) => (mn === mx ? `${mn}` : `${mn}–${mx}`)

// «Hierba Nv. 2–5 · 45 % (noche)»
export const textoFila = ([metodo, mn, mx, prob, conds = []], zona, es = true) => {
  const orden = (x) => (ORDEN_CONDICIONES.includes(x) ? ORDEN_CONDICIONES.indexOf(x) : 99)
  const c = [...conds].sort((a, b) => orden(a) - orden(b)).map((x) => traducir(CONDICIONES, x, es))
  return `${nombreMetodo(metodo, zona, es)} ${es ? 'Nv.' : 'Lv.'} ${niveles(mn, mx)}${prob ? ` · ${prob} %` : ''}${c.length ? ` (${lista(c, es)})` : ''}`
}

// Para el desplegable: la primera forma de encontrarlo (y cuántas más hay) y todas para el título
export const resumenEspecie = (filas, zona, es = true) => {
  if (!filas?.length) return null
  // Si la condición es larga, en la línea corta va solo un asterisco (el detalle está en el título)
  const corta = textoFila(filas[0], zona, es).replace(/ \(.*\)$/, (m) => (m.length > 26 ? ' *' : m))
  return {
    linea: corta + (filas.length > 1 ? ` +${filas.length - 1}` : ''),
    detalle: filas.map((f) => textoFila(f, zona, es)).join('\n')
  }
}
