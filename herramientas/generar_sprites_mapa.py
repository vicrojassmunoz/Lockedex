"""Sprites de mapa (los personajes pequeños que andan por el juego) para el menú de equipo de los jefes.

Salen de los desensamblados de pret (GitHub): pokefirered y pokeemerald (3.ª gen, con su paleta real),
pokecrystal (2.ª) y pokered (1.ª). Se guarda el fotograma de frente de cada personaje.

Uso:  python3 herramientas/generar_sprites_mapa.py /ruta/a/clones-de-pret
      (cada repo con sparse-checkout de graphics/object_events + src/data/object_events, o gfx/sprites)
Genera web/static/lx/mapa/<familia>/<nombre>.png y web/static/lx/mapa/indice.json.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'web' / 'static' / 'lx' / 'mapa'


def snake(nombre):
    return re.sub(r'(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])', '_', nombre).lower()


def leer_pal(ruta):
    filas = ruta.read_text().split('\n')[3:19]
    return [tuple(int(v) for v in f.split()) for f in filas if f.strip()]


def gba(repo, familia):
    """3.ª generación: fotograma 0 (de frente) con la paleta que usa el juego."""
    datos = repo / 'src' / 'data' / 'object_events'
    info = (datos / 'object_event_graphics_info.h').read_text()
    tablas = (datos / 'object_event_pic_tables.h').read_text()
    graficos = (datos / 'object_event_graphics.h').read_text()
    paletas = repo / 'graphics' / 'object_events' / 'palettes'
    salida = SALIDA / familia
    salida.mkdir(parents=True, exist_ok=True)
    hechos = []
    for m in re.finditer(r'gObjectEventGraphicsInfo_(\w+) = \{(.*?)\n\};', info, re.S):
        nombre, cuerpo = m.group(1), m.group(2)
        etiqueta = re.search(r'\.paletteTag = OBJ_EVENT_PAL_TAG_(\w+)', cuerpo)
        imagenes = re.search(r'\.images = (\w+)', cuerpo)
        ancho = re.search(r'\.width = (\d+)', cuerpo)
        alto = re.search(r'\.height = (\d+)', cuerpo)
        if not (etiqueta and imagenes and ancho and alto) or (int(ancho.group(1)), int(alto.group(1))) not in ((16, 32), (16, 16), (32, 32)):
            continue
        tabla = re.search(re.escape(imagenes.group(1)) + r'\[\] = \{\s*(?:overworld_frame|obj_frame_tiles)\((\w+)', tablas)
        if not tabla:
            continue
        pic = re.search(re.escape(tabla.group(1)) + r'\[\] = INC\w+\("([^"]+?)\.(?:4bpp|png)', graficos)
        if not pic or '/people/' not in pic.group(1):
            continue
        png = repo / (pic.group(1) + '.png')
        pal = paletas / (etiqueta.group(1).lower() + '.pal')
        if not png.exists():
            continue
        im = Image.open(png)
        if im.mode != 'P':
            continue
        if pal.exists():
            colores = leer_pal(pal)
            plano = [c for rgb in colores for c in rgb]
            im.putpalette(plano + [0] * (768 - len(plano)))
        w, h = int(ancho.group(1)), int(alto.group(1))
        cuadro = im.crop((0, 0, w, h)).convert('RGBA')
        # El índice 0 de la paleta es el fondo transparente
        indices = im.crop((0, 0, w, h)).load()
        pix = cuadro.load()
        for y in range(h):
            for x in range(w):
                if indices[x, y] == 0:
                    pix[x, y] = (0, 0, 0, 0)
        clave = snake(nombre)
        cuadro.save(salida / f'{clave}.png')
        hechos.append(clave)
    return sorted(hechos)


# Colores de Game Boy Color para los personajes de 1.ª y 2.ª gen (los PNG vienen en grises)
TINTA_GB = {0: (24, 24, 32, 255), 85: (88, 96, 120, 255), 170: (168, 176, 192, 255)}


def gb(repo, familia):
    origen = repo / 'gfx' / 'sprites'
    salida = SALIDA / familia
    salida.mkdir(parents=True, exist_ok=True)
    hechos = []
    for png in sorted(origen.glob('*.png')):
        im = Image.open(png).convert('L')
        if im.width != 16 or im.height < 16:
            continue
        cuadro = im.crop((0, 0, 16, 16))
        rgba = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        p, q = cuadro.load(), rgba.load()
        for y in range(16):
            for x in range(16):
                v = p[x, y]
                if v < 250:
                    q[x, y] = TINTA_GB[min(TINTA_GB, key=lambda k: abs(k - v))]
        rgba.save(salida / f'{png.stem}.png')
        hechos.append(png.stem)
    return hechos


if __name__ == '__main__':
    pret = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/sprites-pret')
    indice = {
        'frlg': gba(pret / 'pokefirered', 'frlg'),
        'rse': gba(pret / 'pokeemerald', 'rse'),
        'gsc': gb(pret / 'pokecrystal', 'gsc'),
        'rby': gb(pret / 'pokered', 'rby'),
    }
    (SALIDA / 'indice.json').write_text(json.dumps(indice, ensure_ascii=False, separators=(',', ':')) + '\n')
    print({k: len(v) for k, v in indice.items()})
