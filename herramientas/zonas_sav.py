#!/usr/bin/env python3
"""Tabla «mapa del .sav → zona de Lockedex» para RojoFuego/VerdeHoja y Esmeralda.

El .sav guarda dónde estás como grupo y número de mapa (SaveBlock1, bytes 4 y 5). Los nombres de los
mapas salen de data/maps/map_groups.json de los decomps de pret (pokefirered, pokeemerald) y se
emparejan con las zonas de la app: «Route3» → «Route 3», «MtMoon_B1F» → «Mt. Moon»,
«CeladonCity_GameCorner_PrizeRoom» → «Celadon City»… Los interiores cuentan como su pueblo o su ruta
(los regalos suelen darse dentro de una casa). Lo que no tiene zona en la app se queda fuera.

Uso: python3 herramientas/zonas_sav.py [ruta a sprites-pret]  → web/static/lx/zonas-sav.json
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PRET = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/sprites-pret')

# Nombres de mapa que no se parecen a la zona de la app (prefijo antes del primer «_» → zona)
ALIAS = {
    'rfvh': {
        'PalletTown_ProfessorOaksLab': 'Starter',
        'VermilionCity': 'Vermillion City',
        'FuchsiaCity': 'Fuschia City',
        'DiglettsCave': "Diglett's Cave",
        'MtMoon': 'Mt. Moon',
        'PokemonTower': 'Pokémon Tower',
        'PokemonMansion': 'Pokémon Mansion',
        'SilphCo': 'Saffron City',
        'RocketHideout': 'Celadon City',
        'MtEmber': 'One Island',
        'BerryForest': 'Three Island',
        'IcefallCave': 'Four Island',
        'LostCave': 'Five Island',
        'RuinValley': 'Six Island',
        'AlteringCave': 'Six Island',
        'PatternBush': 'Six Island',
        'DottedHole': 'Six Island',
        'TanobyRuins': 'Seven Island',
        'Route21': 'Route 21',
    },
    'esmeralda': {
        'LittlerootTown_ProfessorBirchsLab': 'Starter',
        'Route101': 'Starter',  # el inicial se elige en la Ruta 101 (pero también hay encuentros allí)
        'MtPyre': 'Mt. Pyre',
        'MagmaHideout': 'Team Magma Hideout',
        'SSTidal': 'S.S. Tidal',
        'SSTidalCorridor': 'S.S. Tidal',
        'SSTidalLowerDeck': 'S.S. Tidal',
        'SSTidalRooms': 'S.S. Tidal',
        'BattleFrontier': 'Battle Frontier',
        'MirageIsland': 'Mirage Island',
        'DesertUnderpass': 'Desert Underpass',
    },
}
# La Ruta 101 tiene encuentros propios: el inicial solo se preselecciona en el laboratorio
ALIAS['esmeralda'].pop('Route101')

FUENTES = {'rfvh': ('pokefirered', 'fr'), 'esmeralda': ('pokeemerald', 'em')}


def separar(nombre):
    """«ViridianForest» → «viridian forest», «Route21» → «route 21»."""
    s = re.sub(r'(?<=[a-z])(?=[A-Z0-9])|(?<=[0-9])(?=[A-Z])', ' ', nombre)
    return s.lower()


def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower().replace('é', 'e'))


def main():
    rutas = json.loads((RAIZ / 'web/src/lib/data/routes.json').read_text())
    salida = {}
    for juego, (repo, clave) in FUENTES.items():
        zonas = [r['name'] for r in rutas[clave] if r.get('type') == 'route']
        por_norm = {norm(z): z for z in zonas}
        grupos = json.loads((PRET / repo / 'data/maps/map_groups.json').read_text())
        tabla, sin = {}, []
        for g, nombre_grupo in enumerate(grupos['group_order']):
            for n, mapa in enumerate(grupos[nombre_grupo]):
                zona = ALIAS[juego].get(mapa)
                partes = mapa.split('_')
                if not zona and partes[0] == 'Underwater' and len(partes) > 1:
                    partes = partes[1:]
                # de lo más largo a lo más corto: «FiveIsland_LostCave_Room1» → «FiveIsland_LostCave» → «FiveIsland»
                for i in range(len(partes), 0, -1):
                    if zona:
                        break
                    pref = '_'.join(partes[:i])
                    zona = ALIAS[juego].get(pref) or por_norm.get(norm(separar(pref)))
                    if not zona:
                        # «FiveIsland_LostCave» también puede ser «LostCave»
                        zona = ALIAS[juego].get(partes[i - 1]) if i > 1 else None
                if zona:
                    tabla[f'{g}.{n}'] = zona
                else:
                    sin.append(mapa)
        salida[juego] = tabla
        usadas = set(tabla.values())
        print(f'{juego}: {len(tabla)} mapas con zona, {len(sin)} sin zona; zonas de la app sin mapa: {[z for z in zonas if z not in usadas]}')
    destino = RAIZ / 'web/static/lx/zonas-sav.json'
    destino.write_text(json.dumps(salida, ensure_ascii=False, separators=(',', ':')))
    print('→', destino.relative_to(RAIZ))


if __name__ == '__main__':
    main()
