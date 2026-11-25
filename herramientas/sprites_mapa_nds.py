# Sprites del mapa de Platino (4.ª gen, NDS) para los personajes: el fotograma de frente (el 5.º de la tira
# de 16), con el índice 0 transparente. Salen de pret/pokeplatinum (res/graphics/field_sprites/npc) y van a
# web/static/lx/mapa/dppt/, añadidos a indice.json. Las versiones de NDS se prefieren a las de GBA.
import os, json, glob
from PIL import Image
ORIGEN = '/home/claude/sprites-nds/pokeplatinum/res/graphics/field_sprites/npc'
RAIZ = os.path.join(os.path.dirname(__file__), '..', 'web', 'static', 'lx', 'mapa')
DESTINO = os.path.join(RAIZ, 'dppt')
os.makedirs(DESTINO, exist_ok=True)
PROTAS = {'player_m': 'lucas', 'player_f': 'dawn'}  # los protagonistas de Platino
nombres = []
archivos = sorted(glob.glob(os.path.join(ORIGEN, '*.png'))) + [os.path.join(os.path.dirname(ORIGEN), 'player', k + '.png') for k in PROTAS]
for f in archivos:
    n = os.path.basename(f)[:-4]
    n = PROTAS.get(n, n)
    if n.startswith('unused') or 'group_of' in n: continue
    im = Image.open(f)
    if im.mode != 'P' or im.size[0] != 32: continue
    marco = im.crop((0, 4 * 32, 32, 5 * 32)) if im.size[1] >= 5 * 32 else im.crop((0, 0, 32, 32))
    pal = marco.getpalette(); p = marco.load()
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(32):
        for x in range(32):
            c = p[x, y]
            if c: out.putpixel((x, y), tuple(pal[c * 3:c * 3 + 3]) + (255,))
    if not out.getbbox(): continue
    out.save(os.path.join(DESTINO, n + '.png')); nombres.append(n)
ruta = os.path.join(RAIZ, 'indice.json')
indice = json.load(open(ruta))
indice['dppt'] = nombres
json.dump(indice, open(ruta, 'w'), ensure_ascii=False)
print('dppt', len(nombres))
