# Recorte de cada sprite de Pokémon (lienzo de 96×96 con mucho margen): el cuadrado que ocupa el dibujo,
# para enseñarlo grande con object-view-box sin tocar las imágenes. Sale web/static/lx/sprites-recorte.json
# con { id: [x, y, lado] } en píxeles del lienzo de 96.
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
    salida[os.path.basename(f)[:-4]] = [x, y, lado] if w == 96 else [round(x * 96 / w), round(y * 96 / h), round(lado * 96 / w)]
ruta = os.path.join(os.path.dirname(__file__), '..', 'web', 'static', 'lx', 'sprites-recorte.json')
json.dump(salida, open(ruta, 'w'), separators=(',', ':'))
print(len(salida), 'sprites,', os.path.getsize(ruta) // 1024, 'KB')
