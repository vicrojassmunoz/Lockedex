#!/usr/bin/env python3
"""Genera los datos de Lockedex (web/static/lx) a partir de los CSV de PokeAPI.

Uso: python3 generar_datos.py <carpeta_csv_pokeapi> <carpeta_salida>
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict

ES, EN = '7', '9'
# Textos de juegos donde el movimiento ya no existe ("no se puede usar")
INUTIL = re.compile(r'no se puede usar|can.t be used|be forgotten|sería mejor olvidarlo', re.I)

ORIGEN, SALIDA = sys.argv[1], sys.argv[2]
os.makedirs(os.path.join(SALIDA, 'aprendizaje'), exist_ok=True)


def leer(nombre):
    with open(os.path.join(ORIGEN, nombre + '.csv'), encoding='utf-8') as f:
        return list(csv.DictReader(f))


def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def limpiar(t):
    return re.sub(r'\s+', ' ', (t or '').replace('­', '').replace('\x0c', ' ')).strip()


def guardar(nombre, datos):
    ruta = os.path.join(SALIDA, nombre)
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{nombre}: {os.path.getsize(ruta) // 1024} KB')


def nombres(tabla, campo_id, campo_nombre='name'):
    es, en = {}, {}
    for r in leer(tabla):
        if r['local_language_id'] == ES:
            es[r[campo_id]] = r[campo_nombre]
        elif r['local_language_id'] == EN:
            en[r[campo_id]] = r[campo_nombre]
    return es, en


def descripciones(tabla, campo_id, campo_texto='flavor_text'):
    """Último texto disponible (versión más reciente) en español e inglés."""
    es, en = {}, {}
    orden = {}
    for r in leer(tabla):
        vg = int(r.get('version_group_id') or 0)
        if INUTIL.search(r[campo_texto] or ''):
            continue
        clave = (r[campo_id], r['language_id'])
        if clave in orden and orden[clave] > vg:
            continue
        orden[clave] = vg
        if r['language_id'] == ES:
            es[r[campo_id]] = limpiar(r[campo_texto])
        elif r['language_id'] == EN:
            en[r[campo_id]] = limpiar(r[campo_texto])
    return es, en


# --- Tipos --------------------------------------------------------------------
tipos = {r['id']: r['identifier'] for r in leer('types')}
tipo_es, _ = nombres('type_names', 'type_id')
tipos_json = {tipos[i]: tipo_es.get(i, tipos[i]) for i in tipos}
guardar('tipos.json', tipos_json)

# --- Movimientos ----------------------------------------------------------------
clases = {'1': 'status', '2': 'physical', '3': 'special'}
mov_es, mov_en = nombres('move_names', 'move_id')
mdesc_es, mdesc_en = descripciones('move_flavor_text', 'move_id')
movimientos = {}
por_id = {}
for r in leer('moves'):
    i = r['id']
    if int(i) > 10000:
        continue
    en = mov_en.get(i) or r['identifier'].replace('-', ' ').title()
    m = {
        'id': int(i),
        'es': mov_es.get(i, en),
        'en': en,
        'tipo': tipos.get(r['type_id'], ''),
        'clase': clases.get(r['damage_class_id'], ''),
        'potencia': int(r['power']) if r['power'] else None,
        'precision': int(r['accuracy']) if r['accuracy'] else None,
        'pp': int(r['pp']) if r['pp'] else None,
        'prioridad': int(r['priority'] or 0),
        'desc': mdesc_es.get(i) or '',
        'descEn': mdesc_en.get(i) or ''
    }
    movimientos[norm(en)] = m
    movimientos.setdefault(norm(r['identifier']), m)
    por_id[i] = norm(en)
guardar('movimientos.json', movimientos)

# --- Habilidades ----------------------------------------------------------------
hab_es, hab_en = nombres('ability_names', 'ability_id')
hdesc_es, hdesc_en = descripciones('ability_flavor_text', 'ability_id')
habilidades = {}
for r in leer('abilities'):
    i = r['id']
    if int(i) > 10000:
        continue
    en = hab_en.get(i) or r['identifier'].replace('-', ' ').title()
    habilidades[norm(en)] = {
        'id': int(i), 'es': hab_es.get(i, en), 'en': en,
        'desc': hdesc_es.get(i, ''), 'descEn': hdesc_en.get(i, '')
    }
guardar('habilidades.json', habilidades)

# --- Objetos --------------------------------------------------------------------
obj_es, obj_en = nombres('item_names', 'item_id')
odesc_es, odesc_en = descripciones('item_flavor_text', 'item_id')
objetos = {}
for r in leer('items'):
    i = r['id']
    en = obj_en.get(i) or r['identifier'].replace('-', ' ').title()
    objetos[norm(en)] = {
        'id': int(i), 'es': obj_es.get(i, en), 'en': en,
        'desc': odesc_es.get(i, ''), 'descEn': odesc_en.get(i, '')
    }
    objetos.setdefault(norm(r['identifier']), objetos[norm(en)])
guardar('objetos.json', objetos)

# --- Naturalezas ------------------------------------------------------------------
stats = {r['id']: r['identifier'] for r in leer('stats')}
nat_es, nat_en = nombres('nature_names', 'nature_id')
naturalezas = {}
for r in leer('natures'):
    i = r['id']
    en = nat_en.get(i) or r['identifier'].title()
    naturalezas[norm(en)] = {
        'id': int(i), 'es': nat_es.get(i, en), 'en': en,
        'sube': stats.get(r['increased_stat_id']), 'baja': stats.get(r['decreased_stat_id'])
    }
guardar('naturalezas.json', naturalezas)

# --- Especies ---------------------------------------------------------------------
esp_es, esp_en = nombres('pokemon_species_names', 'pokemon_species_id')
legendario = {
    r['id']: (r.get('is_legendary') == '1' or r.get('is_mythical') == '1')
    for r in leer('pokemon_species')
}
pokemon = {}
for r in leer('pokemon'):
    pokemon[r['id']] = {'id': r['identifier'], 'especie': r['species_id']}
especies = {
    p['id']: {
        'n': int(p['especie']),
        'es': esp_es.get(p['especie']),
        'en': esp_en.get(p['especie']),
        **({'l': 1} if legendario.get(p['especie']) else {})
    }
    for p in pokemon.values()
}
guardar('especies.json', especies)

# --- Aprendizaje por nivel, por grupo de versiones ----------------------------------
grupos = {r['id']: r['identifier'] for r in leer('version_groups')}
aprendizaje = defaultdict(lambda: defaultdict(set))
mt = defaultdict(lambda: defaultdict(set))
with open(os.path.join(ORIGEN, 'pokemon_moves.csv'), encoding='utf-8') as f:
    for r in csv.DictReader(f):
        g = grupos.get(r['version_group_id'])
        p = pokemon.get(r['pokemon_id'])
        clave = por_id.get(r['move_id'])
        if not g or not p or not clave:
            continue
        if r['pokemon_move_method_id'] == '1':
            aprendizaje[g][p['id']].add((int(r['level'] or 0), clave))
        elif r['pokemon_move_method_id'] == '4':
            mt[g][p['id']].add(clave)

for g in aprendizaje:
    datos = {
        'nivel': {p: sorted(m) for p, m in aprendizaje[g].items()},
        'mt': {p: sorted(m) for p, m in mt[g].items()}
    }
    guardar(f'aprendizaje/{g}.json', datos)

# --- Diccionario para traducir nombres en la interfaz ------------------------------
dicc = {}
for d in (movimientos, habilidades, objetos, naturalezas):
    for v in d.values():
        if v['en'] and v['es'] and v['en'] != v['es']:
            dicc[v['en']] = v['es']
for en_id, es_nombre in tipos_json.items():
    dicc[en_id] = es_nombre.lower()
    dicc[en_id.capitalize()] = es_nombre
    dicc[en_id.upper()] = es_nombre.upper()
# Lugares (rutas, ciudades, cuevas) y sus gimnasios
lug_es, lug_en = nombres('location_names', 'location_id')
for i, en in lug_en.items():
    es = lug_es.get(i)
    if not es or en == es or en in dicc:
        continue
    dicc[en] = es
    for suf in (' City', ' Town', ' Village', ' Island'):
        if en.endswith(suf):
            dicc[en[: -len(suf)] + ' Gym'] = 'Gimnasio de ' + es
guardar('nombres-es.json', dicc)
