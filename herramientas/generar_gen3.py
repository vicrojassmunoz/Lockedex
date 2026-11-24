#!/usr/bin/env python3
"""Tablas para leer partidas .sav de 3.ª generación (GBA).

Uso: python3 generar_gen3.py <csv_pokeapi> <carpeta_gen3> <salida.json>
Fuentes: pret/pokeemerald y pret/pokefirered (constantes y charmap) + PokeAPI.
"""
import csv
import json
import os
import re
import sys

POKEAPI, GEN3, SALIDA = sys.argv[1:4]


def leer(nombre):
    with open(os.path.join(POKEAPI, nombre + '.csv'), encoding='utf-8') as f:
        return list(csv.DictReader(f))


def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


# Especies de PokeAPI
especie_por_id = {r['identifier']: r for r in leer('pokemon_species')}
pokemon_defecto = {}
for r in leer('pokemon'):
    if r['is_default'] == '1':
        pokemon_defecto[r['species_id']] = r['identifier']

ESPECIALES = {
    'nidoran-f': 'nidoran-f', 'nidoran-m': 'nidoran-m', 'mr-mime': 'mr-mime',
    'ho-oh': 'ho-oh', 'farfetchd': 'farfetchd'
}

# Orden interno de especies (Rubí/Zafiro/Esmeralda/RojoFuego/VerdeHoja)
internas = [None] * 412
with open(os.path.join(GEN3, 'em_include_constants_species.h'), encoding='utf-8') as f:
    for linea in f:
        m = re.match(r'#define SPECIES_([A-Z0-9_]+) (\d+)\s*$', linea)
        if not m:
            continue
        nombre, num = m.group(1), int(m.group(2))
        if num == 0 or num > 411 or nombre.startswith('OLD_UNOWN'):
            continue
        ident = nombre.lower().replace('_', '-')
        ident = ESPECIALES.get(ident, ident)
        esp = especie_por_id.get(ident)
        if not esp:
            print('Sin especie:', nombre, file=sys.stderr)
            continue
        internas[num] = {
            'n': int(esp['id']),
            'p': pokemon_defecto.get(esp['id'], ident),
            'c': int(esp['growth_rate_id'])
        }

# Experiencia por nivel para cada ritmo de crecimiento
experiencia = {}
for r in leer('experience'):
    experiencia.setdefault(r['growth_rate_id'], [0] * 101)[int(r['level'])] = int(r['experience'])

# Habilidades (huecos 1 y 2; sin ocultas, que no existen en 3.ª gen)
habilidades_ids = {r['id']: r['identifier'] for r in leer('abilities')}
habilidad_gen = {r['id']: int(r['generation_id']) for r in leer('abilities')}
habilidades = {}
for r in leer('pokemon_abilities'):
    if r['is_hidden'] == '1' or habilidad_gen.get(r['ability_id'], 9) > 3:
        continue
    habilidades.setdefault(r['pokemon_id'], {})[int(r['slot'])] = norm(habilidades_ids.get(r['ability_id'], ''))
pokemon_id = {r['identifier']: r['id'] for r in leer('pokemon')}
for e in internas:
    if e:
        h = habilidades.get(pokemon_id.get(e['p'], ''), {})
        e['h'] = [h.get(1, ''), h.get(2, h.get(1, ''))]

# Naturalezas en el orden del juego
naturalezas = [''] * 25
for r in leer('natures'):
    naturalezas[int(r['game_index'])] = r['identifier']

# Tabla de caracteres
caracteres = {}
with open(os.path.join(GEN3, 'em_charmap.txt'), encoding='utf-8') as f:
    for linea in f:
        m = re.match(r"^'(.)'\s*=\s*([0-9A-F]{2})\s*$", linea)
        if m and int(m.group(2), 16) not in caracteres:
            caracteres[int(m.group(2), 16)] = m.group(1)
caracteres[0x00] = ' '


def titulo(nombre):
    if not nombre:
        return ''
    t = ' '.join(p.capitalize() for p in nombre.split())
    return t.replace('Mt.', 'Mt.').replace("'S", "'s")


def secciones(archivo):
    datos = json.load(open(os.path.join(GEN3, archivo), encoding='utf-8'))['map_sections']
    return [titulo(s.get('name', '')) for s in datos]


json.dump(
    {
        'especies': internas,
        'experiencia': experiencia,
        'naturalezas': naturalezas,
        'caracteres': {str(k): v for k, v in sorted(caracteres.items())},
        'lugaresRSE': secciones('em_mapsec.json'),
        'lugaresRFVH': secciones('fr_mapsec.json')
    },
    open(SALIDA, 'w', encoding='utf-8'),
    ensure_ascii=False,
    separators=(',', ':')
)
print('gen3.json:', os.path.getsize(SALIDA) // 1024, 'KB')
