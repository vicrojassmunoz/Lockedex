# Recorte de cada sprite de Pokémon (lienzo de 96×96 con mucho margen): el cuadrado que ocupa el dibujo,
# para enseñarlo grande con object-view-box sin tocar las imágenes. Sale web/static/lx/sprites-recorte.json
# con { id: [x, y, lado, ySuelo] } en píxeles del lienzo de 96. ySuelo es la y del mismo cuadrado pero con
# el dibujo apoyado abajo (para los sitios donde el Pokémon «pisa» una línea, como el VS o las fichas).
import os, json, glob
from PIL import Image
RAIZ = os.path.join(os.path.dirname(__file__), '..', 'web', 'node_modules', 'pokemon-sprites', 'sprites', 'pokemon')
salida = {}
for f in sorted(glob.glob(os.path.join(RAIZ, '*.png'))):
    try:
        im = Image.open(f).convert('RGBA')
    except Exception:
        continue
    caja = im.getbbox()
    if not caja: continue
    w, h = im.size
    x0, y0, x1, y1 = caja
    # 2 px de aire por lado y como mucho ×2 de zoom (lado mínimo 48 de 96): los pequeños crecen, sin
    # que un Bulbasaur se vea tan grande como un Groudon
    lado = min(max(max(x1 - x0, y1 - y0) + 4, 48 * w // 96), w, h)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    x = int(round(min(max(cx - lado / 2, 0), w - lado)))
    y = int(round(min(max(cy - lado / 2, 0), h - lado)))
    ys = int(min(max(y1 + 2 - lado, 0), h - lado))
    esc = 96 / w
    salida[os.path.basename(f)[:-4]] = [round(v * esc) for v in (x, y, lado, ys)]
ruta = os.path.join(os.path.dirname(__file__), '..', 'web', 'static', 'lx', 'sprites-recorte.json')
json.dump(salida, open(ruta, 'w'), separators=(',', ':'))
print(len(salida), 'sprites,', os.path.getsize(ruta) // 1024, 'KB')
