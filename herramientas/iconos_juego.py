# Saca los sprites de los juegos que usan los iconos de Lockedex (objetos del mapa de pret y objetos
# de PokéSprite) y los deja recortados en web/static/lx/objetos/.
# Necesita los clones de /home/claude/sprites-pret (con data/tilesets de pokemon_center y pokemon_tower
# en el sparse-checkout) y /home/claude/pokesprite.
import sys, os, shutil
sys.argv = ['x', 'primary/building', 'secondary/pokemon_center', '/dev/null']
exec(open(os.path.join(os.path.dirname(__file__), 'tiles_mapa.py')).read().split("if __name__")[0])
from PIL import Image

DESTINO = os.path.join(os.path.dirname(__file__), '..', 'web', 'static', 'lx', 'objetos')
PS = '/home/claude/pokesprite/'
PRET = '/home/claude/sprites-pret/pokefirered/'

def objeto_mapa(sec, metatile):
    """Capa de arriba de un metatile (el objeto, sin el suelo), recortada."""
    global ts, pals, ms
    ts, _ = tiles(raiz + sec + '/tiles.png')
    pals[7:] = [pal(raiz + sec + f'/palettes/{i:02}.pal') for i in range(7, 13)]
    ms = metas(raiz + sec + '/metatiles.bin')
    m = ms[metatile - 640]
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for k in range(4):
        v = m[4 + k]; t = tile(v & 0x3ff); fx, fy, pi = v >> 10 & 1, v >> 11 & 1, v >> 12
        for y in range(8):
            for x in range(8):
                c = t[y * 8 + x]
                if c:
                    im.putpixel(((k % 2) * 8 + (7 - x if fx else x), (k // 2) * 8 + (7 - y if fy else y)), pals[pi][c] + (255,))
    return im.crop(im.getbbox())

def misc_pret(nombre, ancho=16):
    im = Image.open(PRET + f'graphics/object_events/pics/misc/{nombre}.png')
    p = im.load(); paleta = im.getpalette()
    out = Image.new('RGBA', (min(ancho, im.size[0]), im.size[1]), (0, 0, 0, 0))
    for y in range(out.size[1]):
        for x in range(out.size[0]):
            c = p[x, y]
            if c: out.putpixel((x, y), tuple(paleta[c * 3:c * 3 + 3]) + (255,))
    return out.crop(out.getbbox())

def guardar(im, nombre):
    im.save(os.path.join(DESTINO, nombre + '.png')); print(nombre, im.size)

def en16(im):
    """Centrado en 16×16, para que el icono (32×32) lo amplíe justo ×2."""
    lienzo = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    lienzo.paste(im, ((16 - im.size[0]) // 2, (16 - im.size[1]) // 2), im)
    return lienzo

guardar(en16(objeto_mapa('secondary/pokemon_center', 741)), 'pc')
guardar(en16(objeto_mapa('secondary/pokemon_tower', 657)), 'lapida')
guardar(en16(misc_pret('town_map')), 'mapa-pared')
for origen, nombre in [
    ('items/hold-item/smoke-ball', 'smoke-ball'), ('items/ball/cherish', 'cherish-ball'),
    ('misc/ribbon/champion-ribbon', 'champion-ribbon'),
    ('items/ev-item/power-weight', 'power-weight'), ('items/ev-item/power-bracer', 'power-bracer'),
    ('items/ev-item/power-belt', 'power-belt'), ('items/ev-item/power-lens', 'power-lens'),
    ('items/ev-item/power-band', 'power-band'), ('items/ev-item/power-anklet', 'power-anklet')]:
    # Los de PokéSprite ya son de 32×32 con su margen, como los demás iconos de objetos
    im = Image.open(PS + origen + '.png').convert('RGBA')
    if im.size != (32, 32):  # las cintas son de 40×40: se centran en 32×32 sin escalar
        x0, y0, x1, y1 = im.getbbox(); cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        im = im.crop((cx - 16, cy - 16, cx + 16, cy + 16))
    guardar(im, nombre)

# --- Lugares: trozos del tileset general de RojoFuego y objetos del mapa ---
def metatiles_general(ids, recorte=None):
    global tp, ts, pals
    tp, _ = tiles(raiz + 'primary/general/tiles.png')
    ts, _ = tiles(raiz + 'secondary/pallet_town/tiles.png')
    pals[:7] = [pal(raiz + f'primary/general/palettes/{i:02}.pal') for i in range(7)]
    pals[7:] = [pal(raiz + f'secondary/pallet_town/palettes/{i:02}.pal') for i in range(7, 13)]
    mp = metas(raiz + 'primary/general/metatiles.bin')
    im = Image.new('RGBA', (16 * len(ids[0]), 16 * len(ids)), (0, 0, 0, 0))
    for y, fila in enumerate(ids):
        for x, i in enumerate(fila):
            im.alpha_composite(render(list(mp[i])), (16 * x, 16 * y))
    return im.crop(recorte) if recorte else im

guardar(metatiles_general([[13]]), 'hierba-alta')
guardar(metatiles_general([[5]]), 'arbol')
guardar(metatiles_general([[89, 90], [97, 98]]), 'centro-pokemon')
guardar(metatiles_general([[152, 153, 154], [168, 169, 170]], (8, 0, 40, 32)), 'cueva')
guardar(metatiles_general([[104, 105], [120, 121]]), 'monte')
guardar(en16(misc_pret('wooden_sign')), 'cartel-ruta')
guardar(en16(misc_pret('sign')), 'cartel-pueblo')
guardar(en16(misc_pret('gym_sign')), 'cartel-gimnasio')
guardar(en16(misc_pret('fossil')), 'fosil')
guardar(en16(misc_pret('birth_island_stone', 32)), 'piedra-mistica')

# --- Clase del movimiento (físico, especial, estado), a la manera de los iconos de la 4.ª gen ---
from PIL import ImageDraw
import math
def clase(tipo):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if tipo == 'fisico':
        pts = [(7.5 + (7 if k % 2 == 0 else 3.6) * math.cos(math.pi * k / 8 - math.pi / 2),
                7.5 + (7 if k % 2 == 0 else 3.6) * math.sin(math.pi * k / 8 - math.pi / 2)) for k in range(16)]
        d.polygon(pts, fill='#f08030', outline='#983010')
        d.ellipse((5, 5, 10, 10), fill='#f8d030'); d.point([(7, 7), (8, 7), (7, 8), (8, 8)], fill='#fff8d0')
    elif tipo == 'especial':
        d.ellipse((1, 1, 14, 14), fill='#6890f0', outline='#283878')
        d.ellipse((4, 4, 11, 11), fill='#c8d8f8', outline='#3850a8')
        d.ellipse((6, 6, 9, 9), fill='#6890f0')
    else:
        d.ellipse((1, 1, 14, 14), fill='#d0d0d0', outline='#585858')
        d.pieslice((1, 1, 14, 14), 90, 270, fill='#808080', outline='#585858')
        d.ellipse((5, 1, 10, 7), fill='#d0d0d0'); d.ellipse((5, 8, 10, 14), fill='#808080')
        d.point([(7, 4), (8, 4)], fill='#585858'); d.point([(7, 11), (8, 11)], fill='#f0f0f0')
    return im
for t in ('fisico', 'especial', 'estado'):
    guardar(clase(t), 'clase-' + t)
