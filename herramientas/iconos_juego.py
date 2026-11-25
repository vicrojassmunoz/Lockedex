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
