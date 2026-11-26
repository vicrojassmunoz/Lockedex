#!/usr/bin/env python3
"""Ciclos de huevo de la 3.ª gen por especie interna → web/static/lx/huevos-gen3.json

El contador de eclosión de un huevo (MON_DATA_FRIENDSHIP en CreateEgg de pokeemerald) es el campo
eggCycles de gSpeciesInfo. Se saca de pret/pokeemerald (src/data/pokemon/species_info.h y
include/constants/species.h); RojoFuego/VerdeHoja y Rubí/Zafiro usan los mismos valores.

Uso: python3 herramientas/huevos_gen3.py [carpeta de pokeemerald]
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
EM = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/sprites-pret/pokeemerald')

numeros = {}
for m in re.finditer(r'#define SPECIES_([A-Z0-9_]+) (\d+)\s*$', (EM / 'include/constants/species.h').read_text(), re.M):
    numeros[m.group(1)] = int(m.group(2))

texto = (EM / 'src/data/pokemon/species_info.h').read_text()
ciclos = [0] * 412
# cada entrada va de «[SPECIES_X] =» a la siguiente; las de Unown antiguo usan la macro (120 ciclos)
trozos = re.split(r'\n    \[SPECIES_', texto)
for t in trozos[1:]:
    nombre = t.split(']', 1)[0]
    n = numeros.get(nombre)
    if n is None or n >= 412:
        continue
    c = re.search(r'\.eggCycles\s*=\s*(\d+)', t)
    ciclos[n] = int(c.group(1)) if c else 120
destino = RAIZ / 'web/static/lx/huevos-gen3.json'
destino.write_text(json.dumps({'ciclos': ciclos}, separators=(',', ':')))
print('ciclos de', sum(1 for c in ciclos if c), 'especies →', destino.relative_to(RAIZ), '| bulbasaur', ciclos[1], 'magikarp', ciclos[129], 'togepi', ciclos[175])
