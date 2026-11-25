# Dibuja todos los metatiles de un par de tilesets de pokefirered (primario + secundario) en una hoja numerada.
# Uso: python3 herramientas/tiles_mapa.py primary/building secondary/pokemon_center hoja.png
# (necesita el clon de pret en /home/claude/sprites-pret con data/tilesets en el sparse-checkout)
import sys, struct
from PIL import Image, ImageDraw
raiz = '/home/claude/sprites-pret/pokefirered/data/tilesets/'
prim, sec, salida = sys.argv[1], sys.argv[2], sys.argv[3]
NPRIM_T, NPRIM_M, NPRIM_P = 640, 640, 7
def pal(p):
    l = open(p).read().split('\n')[3:19]
    return [tuple(int(v) for v in x.split()) for x in l if x.strip()]
def tiles(p):
    im = Image.open(p); w, h = im.size
    return [[im.getpixel((tx*8+x, ty*8+y)) for y in range(8) for x in range(8)] for ty in range(h//8) for tx in range(w//8)], im
tp, imp = tiles(raiz+prim+'/tiles.png'); ts, ims = tiles(raiz+sec+'/tiles.png')
pals = [pal(raiz+prim+f'/palettes/{i:02}.pal') for i in range(NPRIM_P)] + [pal(raiz+sec+f'/palettes/{i:02}.pal') for i in range(NPRIM_P, 13)]
def tile(i): return tp[i] if i < NPRIM_T else ts[i-NPRIM_T] if i-NPRIM_T < len(ts) else [0]*64
def metas(p):
    d = open(p, 'rb').read(); return [struct.unpack('<8H', d[i:i+16]) for i in range(0, len(d), 16)]
ms = metas(raiz+sec+'/metatiles.bin')
def render(m):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for capa in range(2):
        for k in range(4):
            v = m[capa*4+k]; t = tile(v & 0x3ff); fx, fy, pi = v >> 10 & 1, v >> 11 & 1, v >> 12
            for y in range(8):
                for x in range(8):
                    c = t[y*8+x]
                    if c == 0 and capa == 1: continue
                    if c == 0 and capa == 0: c = 0
                    px, py = (7-x if fx else x), (7-y if fy else y)
                    im.putpixel(((k % 2)*8+px, (k//2)*8+py), pals[pi][c] + (255,))
    return im
if __name__ == '__main__':
    cols = 16; filas = (len(ms)+cols-1)//cols; E = 3
    hoja = Image.new('RGB', (cols*16*E+cols*2, filas*(16*E+12)), (40, 40, 40)); d = ImageDraw.Draw(hoja)
    for i, m in enumerate(ms):
        x, y = (i % cols)*(16*E+2), (i//cols)*(16*E+12)
        hoja.paste(render(m).resize((16*E, 16*E), Image.NEAREST), (x, y+12))
        d.text((x+2, y), str(NPRIM_M+i), fill=(255, 255, 0))
    hoja.save(salida); print(len(ms), hoja.size)
