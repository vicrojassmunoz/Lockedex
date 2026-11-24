"""Genera todos los iconos e imágenes de marca de Lockedex a partir de marca/*.svg.

Uso (desde la raíz del repo):  python3 herramientas/generar_marca.py
Necesita rsvg-convert (librsvg), ImageMagick (convert) y Pillow.
"""
import io
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
MARCA = RAIZ / 'marca'
WEB = RAIZ / 'web' / 'static'
ELECTRON = RAIZ / 'electron'
FUENTE = WEB / 'fonts' / 'vt323-latin.woff2'

ROJO_CLARO = (255, 74, 98)
ROJO = (227, 17, 47)
ROJO_OSCURO = (168, 6, 31)
NEGRO = (17, 17, 17)


def svg(nombre, lado):
    png = subprocess.run(
        ['rsvg-convert', '-w', str(lado), '-h', str(lado), str(MARCA / nombre)],
        check=True, capture_output=True,
    ).stdout
    return Image.open(io.BytesIO(png)).convert('RGBA')


def icono(lado):
    """Hasta 48 px se usa la versión simplificada (sin luces ni brillos, trazos más gruesos)."""
    return svg('icono-pequeno.svg' if lado <= 48 else 'icono.svg', lado)


def degradado(ancho, alto, arriba, medio, abajo):
    im = Image.new('RGB', (ancho, alto))
    d = ImageDraw.Draw(im)
    for y in range(alto):
        t = y / max(1, alto - 1)
        a, b, u = (arriba, medio, t / 0.45) if t < 0.45 else (medio, abajo, (t - 0.45) / 0.55)
        d.line([(0, y), (ancho, y)], fill=tuple(round(a[i] + (b[i] - a[i]) * u) for i in range(3)))
    return im


def texto(lienzo, xy, cadena, tam, color=(255, 255, 255), sombra=NEGRO, desplaz=3, centrado=False):
    fuente = ImageFont.truetype(str(FUENTE), tam)
    d = ImageDraw.Draw(lienzo)
    x, y = xy
    if centrado:
        x -= d.textlength(cadena, font=fuente) / 2
    if sombra:
        d.text((x + desplaz, y + desplaz), cadena, font=fuente, fill=sombra)
    d.text((x, y), cadena, font=fuente, fill=color)


def chasis(ancho, alto):
    """Fondo rojo con bisagra oscura abajo, como la barra de la app."""
    im = degradado(ancho, alto, ROJO_CLARO, ROJO, ROJO_OSCURO).convert('RGBA')
    d = ImageDraw.Draw(im)
    d.rectangle([0, alto - 10, ancho, alto], fill=(90, 6, 20))
    d.line([(0, alto - 11), (ancho, alto - 11)], fill=(122, 4, 22), width=2)
    return im


def con_sombra(lienzo, im, xy, radio=6, desplaz=(4, 6)):
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    sombra.putalpha(im.getchannel('A').point(lambda a: a * 0.35))
    sombra = sombra.filter(ImageFilter.GaussianBlur(radio))
    lienzo.alpha_composite(sombra, (xy[0] + desplaz[0], xy[1] + desplaz[1]))
    lienzo.alpha_composite(im, xy)


def main():
    # Icono de la app (ventana, barra de tareas, acceso directo e instalador)
    icono(512).save(ELECTRON / 'icono.png')
    tamanos = [16, 20, 24, 32, 40, 48, 64, 128, 256]
    temporales = []
    for t in tamanos:
        ruta = Path(f'/tmp/lx-icono-{t}.png')
        icono(t).save(ruta)
        temporales.append(str(ruta))
    subprocess.run(['convert', *temporales, str(ELECTRON / 'icono.ico')], check=True)

    # Barras laterales del instalador y del desinstalador (164x314, BMP de 24 bits)
    lateral = chasis(164, 314)
    con_sombra(lateral, icono(128), (18, 30))
    texto(lateral, (82, 172), 'LOCKEDEX', 38, centrado=True)
    texto(lateral, (82, 214), 'Tu Pokédex', 20, color=(255, 230, 234), sombra=None, centrado=True)
    texto(lateral, (82, 234), 'para Nuzlockes', 20, color=(255, 230, 234), sombra=None, centrado=True)
    (ELECTRON / 'build').mkdir(exist_ok=True)
    lateral.convert('RGB').save(ELECTRON / 'build' / 'installerSidebar.bmp')
    lateral.convert('RGB').save(ELECTRON / 'build' / 'uninstallerSidebar.bmp')

    # Web: favicon, iconos de manifiesto y Apple
    icono(32).save(WEB / 'favicon.png')
    for lado, nombre in [(180, 'apple-icon-180.png'), (192, 'manifest-icon-192.maskable.png'), (512, 'manifest-icon-512.maskable.png')]:
        fondo = chasis(lado, lado)
        dentro = icono(round(lado * 0.72))
        fondo.alpha_composite(dentro, ((lado - dentro.width) // 2, (lado - dentro.height) // 2))
        fondo.save(WEB / 'icons' / nombre)

    # Logotipo horizontal (transparente) y tarjeta para compartir
    ancho_texto = ImageDraw.Draw(Image.new('RGBA', (1, 1))).textlength('LOCKEDEX', font=ImageFont.truetype(str(FUENTE), 210))
    logo = Image.new('RGBA', (round(262 + ancho_texto + 24), 246), (0, 0, 0, 0))
    con_sombra(logo, icono(230), (6, 4))
    texto(logo, (262, 18), 'LOCKEDEX', 210, color=ROJO, desplaz=8)
    logo.save(WEB / 'logo.png')
    logo.save(WEB / 'logo.webp', quality=92)

    tarjeta = chasis(1200, 630)
    con_sombra(tarjeta, icono(300), (90, 150), radio=10, desplaz=(8, 12))
    texto(tarjeta, (430, 190), 'LOCKEDEX', 170, desplaz=8)
    texto(tarjeta, (436, 360), 'Tu Pokédex para Nuzlockes', 56, color=(255, 230, 234), sombra=(90, 6, 20), desplaz=4)
    tarjeta.convert('RGB').save(WEB / 'twitter.png')

    # SVG para usar dentro de la app
    (WEB / 'lx' / 'icono.svg').write_text((MARCA / 'icono.svg').read_text())
    print('Marca generada')


if __name__ == '__main__':
    main()
