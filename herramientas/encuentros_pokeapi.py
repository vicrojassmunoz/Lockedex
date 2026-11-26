#!/usr/bin/env python3
"""Método, niveles y probabilidad de cada encuentro, sacados de PokeAPI (data/v2/csv).

Para cada juego oficial con datos en PokeAPI (1.ª a 7.ª gen, Let's Go y Espada/Escudo) busca cada zona
de su lista de rutas (datos/rutas/<lid>.json) entre las localizaciones de su región por el nombre en
inglés, junta todas sus áreas (Mt. Moon 1F, B1F, B2F…) y guarda, para cada Pokémon de la lista de la
zona, sus formas de encontrarlo:

  web/static/lx/encuentros/<juego>.json = { "<zona>": { "<alias>": [[metodo, min, max, prob, [cond…]], …] } }

prob es el % dentro de ese método (la suma de sus huecos; con varias áreas, la mayor). cond son las
condiciones que no son las de por defecto (time-night, swarm-yes, season-spring…).

Uso: python3 herramientas/encuentros_pokeapi.py [carpeta con los csv de PokeAPI]
"""
import csv, json, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path

CSV = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/pokeapi-enc')
RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'web/static/lx/encuentros'

# clave del juego en Lockedex → versión de PokeAPI (más las expansiones que van en la misma lista)
VERSIONES = {
    'red': ['red'], 'blue': ['blue'], 'yel': ['yellow'],
    'gold': ['gold'], 'silv': ['silver'], 'crys': ['crystal'],
    'ruby': ['ruby'], 'saph': ['sapphire'], 'em': ['emerald'], 'fr': ['firered'], 'lg': ['leafgreen'],
    'd': ['diamond'], 'p': ['pearl'], 'pt': ['platinum'], 'hg': ['heartgold'], 'ss': ['soulsilver'],
    'bl': ['black'], 'wh': ['white'], 'bl2': ['black-2'], 'wh2': ['white-2'],
    'x': ['x'], 'y': ['y'], 'or': ['omega-ruby'], 'as': ['alpha-sapphire'],
    'sun': ['sun'], 'moon': ['moon'], 'usun': ['ultra-sun'], 'umoon': ['ultra-moon'],
    'sw': ['sword', 'the-isle-of-armor-sword', 'the-crown-tundra-sword'],
    'sh': ['shield', 'the-isle-of-armor-shield', 'the-crown-tundra-shield'],
}
# Condiciones por defecto (no se apuntan)
POR_DEFECTO = {'swarm-no', 'radar-off', 'slot2-none', 'radio-off', 'story-progress-none', 'item-none', 'other-none'}
# Dimensiones que, si salen todas con lo mismo, no hace falta decir
DIMENSIONES = [
    {'time-morning', 'time-day', 'time-night'},
    {'season-spring', 'season-summer', 'season-autumn', 'season-winter'},
]

# Nombres de nuestras listas que no coinciden con los de PokeAPI (ya normalizados)
ALIAS = {
    'vermillion city': 'vermilion city', 'fuschia city': 'fuchsia city', 'virdian city': 'viridian city',
    'mount moon': 'mt moon', 'tower of mystery': 'tower of mastery', 'tin tower': 'bell tower',
    'rocket hideout': 'team rocket hq', 'five isalnd': 'five island', 'six isalnd': 'six island',
    'seven isalnd': 'seven island',
}
REGIONES = r'(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea)'


def leer(nombre):
    with open(CSV / f'{nombre}.csv', newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"[^a-z0-9 ]", ' ', s.replace("'", ''))
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'^(the|sea) ', '', s)
    s = re.sub(r'^' + REGIONES + r' (?!city|town)', '', s)
    s = re.sub(r'^sea ', '', s)
    s = re.sub(r'^routes ', 'route ', s)
    return ALIAS.get(s, s)


def alias_pokeapi(identificador):
    # Mismo formato que las listas de rutas: nombre corto de PokeAPI sin forma
    return identificador


def main():
    versiones = {r['identifier']: r for r in leer('versions')}
    grupo_region = defaultdict(set)
    for r in leer('version_group_regions'):
        grupo_region[r['version_group_id']].add(r['region_id'])
    metodos = {r['id']: r['identifier'] for r in leer('encounter_methods')}
    huecos = {r['id']: r for r in leer('encounter_slots')}
    condiciones = {r['id']: r['identifier'] for r in leer('encounter_condition_values')}
    cond_de = defaultdict(set)
    for r in leer('encounter_condition_value_map'):
        cond_de[r['encounter_id']].add(condiciones[r['encounter_condition_value_id']])
    pokemon = {r['id']: r['identifier'] for r in leer('pokemon')}
    lugares = {r['id']: r for r in leer('locations')}
    areas = {r['id']: r for r in leer('location_areas')}
    nombre_lugar = {}
    for r in leer('location_names'):
        if r['local_language_id'] == '9':
            nombre_lugar[r['location_id']] = r['name']

    # Encuentros por versión → área
    por_version = defaultdict(lambda: defaultdict(list))
    for e in leer('encounters'):
        por_version[e['version_id']][e['location_area_id']].append(e)

    juegos = json.load(open(RAIZ / 'datos/juegos.json'))
    juegos = juegos if isinstance(juegos, dict) else {j['key'] if 'key' in j else j['id']: j for j in juegos}
    SALIDA.mkdir(parents=True, exist_ok=True)
    informe = []
    for clave, nombres_version in VERSIONES.items():
        j = juegos.get(clave)
        if not j:
            print(f'· {clave}: no está en juegos.json')
            continue
        # La lista que se ve en la partida es la de su pid (la conjunta, lid, no siempre coincide)
        lid = j.get('pid') or clave
        ruta_lista = RAIZ / f'datos/rutas/{lid}.json'
        if not ruta_lista.exists() and j.get('lid'):
            ruta_lista = RAIZ / f'datos/rutas/{j["lid"]}.json'
        if not ruta_lista.exists():
            print(f'· {clave}: no hay datos/rutas/{lid}.json')
            continue
        lista = json.load(open(ruta_lista))
        vids = [versiones[v]['id'] for v in nombres_version if v in versiones]
        regiones = set()
        for v in nombres_version:
            if v in versiones:
                regiones |= grupo_region[versiones[v]['version_group_id']]

        # Localizaciones de la región por nombre normalizado → sus áreas con encuentros en estas versiones
        por_nombre = defaultdict(list)
        for aid, a in areas.items():
            lug = lugares.get(a['location_id'])
            if not lug or (regiones and lug['region_id'] and lug['region_id'] not in regiones):
                continue
            if not any(aid in por_version[v] for v in vids):
                continue
            por_nombre[norm(nombre_lugar.get(lug['id'], lug['identifier'].replace('-', ' ')))].append(aid)

        resultado = {}
        zonas = sin_casar = 0
        for r in lista:
            if r.get('type') != 'route' or not r.get('encounters'):
                continue
            zonas += 1
            ids_area = por_nombre.get(norm(r['name']))
            if not ids_area:
                sin_casar += 1
                informe.append(f'{clave}: {r["name"]}')
                continue
            de_la_zona = set(r['encounters'])
            # (alias, método, condiciones) → área → {min, max, prob}
            acum = defaultdict(lambda: defaultdict(lambda: [999, 0, 0]))
            for v in vids:
                for aid in ids_area:
                    for e in por_version[v].get(aid, []):
                        alias = pokemon.get(e['pokemon_id'])
                        if alias not in de_la_zona:
                            continue
                        h = huecos[e['encounter_slot_id']]
                        conds = tuple(sorted(c for c in cond_de.get(e['id'], ()) if c not in POR_DEFECTO))
                        a = acum[(alias, metodos[h['encounter_method_id']], conds)][aid]
                        a[0] = min(a[0], int(e['min_level']))
                        a[1] = max(a[1], int(e['max_level']))
                        a[2] += int(h['rarity'] or 0)
            zona = defaultdict(list)
            for (alias, metodo, conds), por_area in acum.items():
                mn = min(x[0] for x in por_area.values())
                mx = max(x[1] for x in por_area.values())
                prob = min(100, max(x[2] for x in por_area.values()))
                zona[alias].append([metodo, mn, mx, prob, list(conds)])
            # Juntar lo que solo cambia de condición y quitar la dimensión si salen todas (mañana/día/noche)
            final = {}
            for alias, filas in zona.items():
                juntas = defaultdict(set)
                for metodo, mn, mx, prob, conds in filas:
                    juntas[(metodo, mn, mx, prob)] |= {tuple(conds)}
                salida = []
                for (metodo, mn, mx, prob), grupos in juntas.items():
                    todas = set(c for g in grupos for c in g)
                    for dim in DIMENSIONES:
                        if dim <= todas:
                            todas -= dim
                    if len(grupos) == 1 and not (set(next(iter(grupos))) - todas):
                        conds = sorted(todas)
                    else:
                        conds = sorted(todas)
                    salida.append([metodo, mn, mx, prob, conds])
                orden = ['walk', 'dark-grass', 'grass-spots', 'surf', 'surf-spots', 'old-rod', 'good-rod', 'super-rod']
                salida.sort(key=lambda x: (orden.index(x[0]) if x[0] in orden else 99, -x[3]))
                final[alias] = salida
            if final:
                resultado[r['name']] = final
        (SALIDA / f'{clave}.json').write_text(json.dumps(resultado, ensure_ascii=False, separators=(',', ':')))
        print(f'✔ {clave}: {len(resultado)}/{zonas} zonas con detalle ({sin_casar} sin casar)')
    (Path('/tmp') / 'encuentros-sin-casar.txt').write_text('\n'.join(informe))


if __name__ == '__main__':
    main()
