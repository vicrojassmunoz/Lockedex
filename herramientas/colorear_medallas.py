"""Colorea las hojas de medallas (web/static/lx/medallas/*.png), que vienen en grises de las tarjetas de
entrenador, con los colores de cada medalla. Cada gris pasa a un tono de la paleta de su medalla; el
contorno negro se queda. Salen como <región>-color.png junto a las originales.

    python3 herramientas/colorear_medallas.py
"""
from pathlib import Path
from PIL import Image

CARPETA = Path(__file__).resolve().parent.parent / 'web' / 'static' / 'lx' / 'medallas'

# (oscuro, medio, claro, brillo) para los grises 123, 180, 213 y 255 (en Johto, 85 y 170)
PALETAS = {
    'kanto': [
        ('#606870', '#909aa0', '#c0c8d0', '#f0f4f8'),  # Roca
        ('#2050b0', '#4888e0', '#80b8f8', '#e0f0ff'),  # Cascada
        ('#c06018', '#f09030', '#f8c840', '#fff8c0'),  # Trueno
        ('#38a040', '#e05878', '#f0a0c0', '#fff0f8'),  # Arcoíris
        ('#b03878', '#e068a8', '#f8a8d0', '#fff0f8'),  # Alma
        ('#a07818', '#d0a830', '#f0d058', '#fff8c8'),  # Pantano
        ('#a02818', '#e04828', '#f88848', '#fff0c0'),  # Volcán
        ('#286830', '#48a048', '#80d070', '#e8ffe0'),  # Tierra
    ],
    'johto': [
        ('#5878a0', '#b0c8e8'),  # Céfiro
        ('#a83020', '#f0c040'),  # Colmena
        ('#b88818', '#f8d848'),  # Planicie
        ('#604890', '#b098e0'),  # Niebla
        ('#805030', '#d0a070'),  # Tormenta
        ('#707880', '#d0d8e0'),  # Mineral
        ('#3888b8', '#a8e0f8'),  # Glaciar
        ('#2048a0', '#6898e8'),  # Dragón
    ],
    'hoenn': [
        ('#706050', '#a09080', '#c8b8a8', '#f0e8e0'),  # Piedra
        ('#a85018', '#e88838', '#f8b870', '#fff0d8'),  # Puño
        ('#a08010', '#d8b828', '#f8e050', '#fffcd0'),  # Dinamo
        ('#a02818', '#e04828', '#f88040', '#ffe8c0'),  # Calor
        ('#a03030', '#e0b030', '#f8d878', '#fff8e0'),  # Equilibrio
        ('#3870b0', '#68a8e8', '#a8d8f8', '#f0f8ff'),  # Pluma
        ('#b04890', '#e080c0', '#f8b0e0', '#fff0fa'),  # Mente
        ('#2050a0', '#4080d0', '#78b8f0', '#e0f4ff'),  # Lluvia
    ],
}
GRISES = {'kanto': (123, 180, 213, 255), 'hoenn': (123, 180, 213, 255), 'johto': (85, 170)}


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


for region, paletas in PALETAS.items():
    im = Image.open(CARPETA / f'{region}.png').convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0 or r == 0:
                continue
            paleta = paletas[min(x // 16, 7)]
            grises = GRISES[region]
            if r in grises:
                px[x, y] = hex_rgb(paleta[grises.index(r)]) + (a,)
    im.save(CARPETA / f'{region}-color.png')
    print('ok', region)
