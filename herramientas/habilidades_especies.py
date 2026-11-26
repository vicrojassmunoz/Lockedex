#!/usr/bin/env python3
"""Habilidades de cada Pokémon por generación → web/static/lx/habilidades-especie.json

Sale de las tablas CSV de PokeAPI (pokemon_abilities.csv y pokemon_abilities_past.csv). Una fila de la
tabla «past» (pokémon, generación G, hueco, habilidad) dice qué había en ese hueco hasta la generación G
incluida; si la habilidad está vacía, ese hueco no existía. Así Gengar tiene Levitación hasta la 6.ª gen
y Cuerpo Maldito desde la 7.ª.

Formato: { "gengar": [[3, ["levitate"], null], [7, ["cursed-body"], null]], ... }: desde qué generación,
las habilidades normales y la oculta (o null). Solo se apunta cuando cambian. Antes de la 3.ª gen no hay
habilidades.

Uso: python3 herramientas/habilidades_especies.py [carpeta del repo de PokeAPI]
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
API = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/sprites-pret/pokeapi') / 'data/v2/csv'


def leer(nombre):
    with open(API / nombre, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def main():
    habilidades = {int(r['id']): (r['identifier'], int(r['generation_id'])) for r in leer('abilities.csv') if r['is_main_series'] == '1'}
    pokemon = {int(r['id']): r['identifier'] for r in leer('pokemon.csv')}
    actuales = defaultdict(dict)  # pokemon → hueco → habilidad
    for r in leer('pokemon_abilities.csv'):
        actuales[int(r['pokemon_id'])][int(r['slot'])] = int(r['ability_id'])
    pasadas = defaultdict(list)  # pokemon → [(gen, hueco, habilidad|None)]
    for r in leer('pokemon_abilities_past.csv'):
        pasadas[int(r['pokemon_id'])].append((int(r['generation_id']), int(r['slot']), int(r['ability_id']) if r['ability_id'] else None))

    salida = {}
    for pid, nombre in pokemon.items():
        if pid not in actuales:
            continue
        cambios = []
        anterior = None
        for gen in range(3, 10):
            huecos = {}
            for hueco in (1, 2, 3):
                # la fila «past» de menor generación que todavía cubre esta generación
                candidatas = sorted((g, h) for g, s, h in pasadas[pid] if s == hueco and g >= gen)
                hab = candidatas[0][1] if candidatas else actuales[pid].get(hueco)
                if hab and hab in habilidades and habilidades[hab][1] <= gen:
                    huecos[hueco] = habilidades[hab][0]
            normales = [huecos[h] for h in (1, 2) if h in huecos]
            # las ocultas aparecen en la 5.ª gen
            oculta = huecos.get(3) if gen >= 5 else None
            estado = (normales, oculta)
            if normales and estado != anterior:
                cambios.append([gen, normales, oculta])
                anterior = estado
        if cambios:
            salida[nombre] = cambios
    destino = RAIZ / 'web/static/lx/habilidades-especie.json'
    destino.write_text(json.dumps(salida, separators=(',', ':')))
    print(len(salida), 'Pokémon →', destino.relative_to(RAIZ))
    for n in ('gengar', 'bronzong', 'pikachu', 'vaporeon', 'shedinja', 'misdreavus'):
        print(n, salida.get(n))


if __name__ == '__main__':
    main()
