import sys
sys.argv = ['x', 'primary/building', 'secondary/pokemon_center', '/dev/null']
exec(open('/tmp/tiles/metatiles.py').read().split("if __name__")[0])
from PIL import Image, ImageDraw, ImageFont
def bloque(sec, ids, solo_arriba=False):
    global ts, pals, ms
    ts, _ = tiles(raiz+sec+'/tiles.png'); pals[7:] = [pal(raiz+sec+f'/palettes/{i:02}.pal') for i in range(7, 13)]
    ms = metas(raiz+sec+'/metatiles.bin')
    filas = ids; h = len(filas); w = len(filas[0]); im = Image.new('RGBA', (16*w, 16*h), (0,0,0,0))
    for y, f in enumerate(filas):
        for x, i in enumerate(f):
            m = list(ms[i-640])
            t = render(m)
            if solo_arriba:
                # solo la capa de arriba (el objeto), sin el suelo
                t = Image.new('RGBA', (16, 16), (0,0,0,0))
                for k in range(4):
                    v = m[4+k]; tt = tile(v & 0x3ff); fx, fy, pi = v >> 10 & 1, v >> 11 & 1, v >> 12
                    for yy in range(8):
                        for xx in range(8):
                            c = tt[yy*8+xx]
                            if c: t.putpixel(((k % 2)*8+(7-xx if fx else xx), (k//2)*8+(7-yy if fy else yy)), pals[pi][c] + (255,))
            im.alpha_composite(t, (16*x, 16*y))
    return im
def objeto(ruta):
    im = Image.open(ruta).convert('RGBA'); return im.crop(im.getbbox())
def pret_misc(n, w=16):
    im = Image.open(f'/home/claude/sprites-pret/pokefirered/graphics/object_events/pics/misc/{n}.png')
    pi = im.convert('P') if im.mode != 'P' else im
    t = Image.new('RGBA', im.size, (0,0,0,0)); p = pi.load(); pl = pi.getpalette()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            c = p[x, y]
            if c: t.putpixel((x, y), tuple(pl[c*3:c*3+3]) + (255,))
    t = t.crop((0, 0, min(w, im.size[0]), im.size[1])); return t.crop(t.getbbox())
mapa = lambda n: objeto(f'/home/claude/lockedex/web/static/lx/mapa/frlg/{n}.png')
ps = lambda n: objeto(f'/home/claude/pokesprite/items/{n}.png')
F = '/tmp/fuentes/fontsource-fusion-pixel-12px-proportional-sc-5.3.0/package/files/fusion-pixel-12px-proportional-sc-latin-400-normal.ttf'
f24 = ImageFont.truetype(F, 24); f12 = ImageFont.truetype(F, 12)
def chips():
    im = Image.new('RGBA', (5*44, 16), (0,0,0,0)); d = ImageDraw.Draw(im)
    for i, (t, c) in enumerate([('ATQ','#f08030'),('DEF','#f8d030'),('AT.E','#6890f0'),('DF.E','#78c850'),('VEL','#f85888')]):
        d.rectangle((i*44, 0, i*44+40, 15), fill=c, outline='#283850'); d.text((i*44+4, 0), t, fill='white', font=f12)
    return im
FILAS = [
 ('Caja (PC)', 'objeto del mapa', [('A', bloque('secondary/pokemon_center', [[815]], True)), ('B', bloque('secondary/pokemon_center', [[741]], True))]),
 ('Equipo', 'objeto del mapa', [('A', mapa('red_normal')), ('B', mapa('green_normal'))]),
 ('Muerto / Cementerio', 'objeto del mapa', [('A', bloque('secondary/pokemon_tower', [[657]], True)), ('B', bloque('secondary/pokemon_tower', [[731]], True))]),
 ('Fallido (se escapó)', 'objeto', [('A', ps('hold-item/smoke-ball')), ('B', ps('other-item/poke-doll'))]),
 ('Intercambiado', 'personaje', [('A', mapa('cable_club_receptionist')), ('B', mapa('union_room_receptionist'))]),
 ('Regalo', 'objeto', [('A', pret_misc('item_ball')), ('B', ps('hold-item/lucky-egg'))]),
 ('Medallas / logros', 'objeto', [('A', objeto('/home/claude/pokesprite/misc/ribbon/champion-ribbon.png')), ('B', objeto('/home/claude/pokesprite/misc/ribbon/hoenn-champion-ribbon.png'))]),
 ('Analista', 'objeto', [('A', pret_misc('pokedex')), ('B', ps('hold-item/scope-lens'))]),
 ('PS / curar', 'objeto', [('A', ps('medicine/potion'))]),
 ('Favorito (corazón)', 'objeto', [('A', ps('other-item/heart-scale'))]),
 ('Mapa', 'objeto', [('A', ps('key-item/town-map-gen3')), ('B', pret_misc('town_map'))]),
 ('Estadísticas', 'texto como en la ficha', [('A', chips())]),
]
E = 3; W = 900; H = 20 + len(FILAS)*110
hoja = Image.new('RGB', (W, H), '#e0e8f0'); d = ImageDraw.Draw(hoja)
y = 10
for nombre, tipo, ops in FILAS:
    d.text((14, y+20), nombre, fill='#404850', font=f24); d.text((14, y+52), tipo, fill='#6880b0', font=f12)
    x = 300
    for letra, im in ops:
        im2 = im.resize((im.size[0]*E, im.size[1]*E), Image.NEAREST)
        caja = (x, y, x+max(110, im2.size[0]+20), y+100)
        d.rectangle(caja, fill='#f8f8f8', outline='#687890', width=2)
        hoja.paste(im2, (x+(caja[2]-caja[0]-im2.size[0])//2, y+8+(80-im2.size[1])//2), im2)
        d.text((x+6, y+80), letra, fill='#e85020', font=f12)
        x = caja[2] + 14
    y += 110
hoja.save('/tmp/tiles/propuesta-iconos.png'); print(hoja.size)
