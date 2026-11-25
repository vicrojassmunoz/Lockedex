"""Iconos pixel art propios de Lockedex (16x16), en el formato de Iconify que ya usa la app.

Uso (desde la raíz del repo):  python3 herramientas/generar_iconos.py [--muestra]
Genera web/src/lib/components/icons/pixel.js y, con --muestra, una hoja de contacto en /tmp/iconos.png.
"""
import math
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'web' / 'src' / 'lib' / 'components' / 'icons' / 'pixel.js'
N = 16


class L:
    """Lienzo de 16x16 con primitivas que pintan píxeles enteros."""

    def __init__(self):
        self.p = [[0] * N for _ in range(N)]

    def px(self, x, y, v=1):
        if 0 <= x < N and 0 <= y < N:
            self.p[y][x] = v
        return self

    def rect(self, x, y, w, h, v=1):
        x, y, w, h = int(x), int(y), int(w), int(h)
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.px(i, j, v)
        return self

    def marco(self, x, y, w, h, g=2, v=1):
        self.rect(x, y, w, g, v).rect(x, y + h - g, w, g, v)
        self.rect(x, y, g, h, v).rect(x + w - g, y, g, h, v)
        return self

    def disco(self, cx, cy, r, v=1):
        for j in range(N):
            for i in range(N):
                if (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r:
                    self.px(i, j, v)
        return self

    def anillo(self, cx, cy, r, g=2, v=1):
        for j in range(N):
            for i in range(N):
                d = math.hypot(i + 0.5 - cx, j + 0.5 - cy)
                if r - g < d <= r:
                    self.px(i, j, v)
        return self

    def linea(self, x0, y0, x1, y1, g=2, v=1):
        dx, dy = x1 - x0, y1 - y0
        largo = dx * dx + dy * dy or 1
        for j in range(N):
            for i in range(N):
                cx, cy = i + 0.5, j + 0.5
                t = max(0, min(1, ((cx - x0) * dx + (cy - y0) * dy) / largo))
                if math.hypot(cx - (x0 + t * dx), cy - (y0 + t * dy)) <= g / 2:
                    self.px(i, j, v)
        return self

    def poli(self, pts, v=1):
        for j in range(N):
            for i in range(N):
                x, y = i + 0.5, j + 0.5
                dentro = False
                for k in range(len(pts)):
                    (x1, y1), (x2, y2) = pts[k], pts[(k + 1) % len(pts)]
                    if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                        dentro = not dentro
                if dentro:
                    self.px(i, j, v)
        return self

    def ascii(self, filas, x=0, y=0):
        """'#' pinta, 'o' borra, cualquier otro carácter deja lo que hay."""
        for j, fila in enumerate(filas):
            for i, c in enumerate(fila):
                if c == '#':
                    self.px(x + i, y + j, 1)
                elif c == 'o':
                    self.px(x + i, y + j, 0)
        return self

    def espejo(self):
        """Copia la mitad izquierda en la derecha (para iconos simétricos)."""
        for j in range(N):
            for i in range(N // 2):
                if self.p[j][i]:
                    self.p[j][N - 1 - i] = 1
        return self

    def ruta(self):
        d = []
        for y, fila in enumerate(self.p):
            x = 0
            while x < N:
                if fila[x]:
                    w = 1
                    while x + w < N and fila[x + w]:
                        w += 1
                    d.append(f'M{x} {y}h{w}v1h-{w}z')
                    x += w
                else:
                    x += 1
        return ''.join(d)


def A(filas):
    return L().ascii(filas)


# ---------------------------------------------------------------------------------------------
# Iconos. El nombre es el mismo que exporta IconSet.ts, para que nada más tenga que cambiar.
ICONOS = {}


def icono(*nombres):
    def dec(f):
        for n in nombres:
            ICONOS[n] = f
        return f
    return dec


# --- Navegación y acciones ---
@icono('Home')
def _():
    return (L().poli([(1, 8), (8, 1), (15, 8), (13, 8), (8, 3.5), (3, 8)])
            .marco(3, 8, 10, 7).rect(7, 10, 2, 5))


@icono('Search')
def _():
    return L().anillo(6.5, 6.5, 5.5, 2).linea(10.5, 10.5, 14.5, 14.5, 2.6)


@icono('Settings')
def _():
    l = L().disco(8, 8, 5.2)
    for k in range(8):
        a = k * math.pi / 4
        l.linea(8, 8, 8 + 7.2 * math.cos(a), 8 + 7.2 * math.sin(a), 2.6)
    return l.disco(8, 8, 2.1, 0)


@icono('Menu')
def _():
    return L().rect(2, 3, 12, 2).rect(2, 7, 12, 2).rect(2, 11, 12, 2)


@icono('Dots')
def _():
    return L().rect(7, 2, 3, 3).rect(7, 7, 3, 3).rect(7, 12, 3, 3)


@icono('X')
def _():
    return L().linea(3, 3, 13, 13, 2.4).linea(13, 3, 3, 13, 2.4)


@icono('Plus')
def _():
    return L().rect(7, 2, 2, 12).rect(2, 7, 12, 2)


@icono('Minus')
def _():
    return L().rect(2, 7, 12, 2)


@icono('Add')
def _():
    return L().marco(1, 1, 14, 14).rect(7, 4, 2, 8).rect(4, 7, 8, 2)


@icono('Check')
def _():
    return L().disco(8, 8, 7.5).linea(4.5, 8.5, 7, 11, 2.2, 0).linea(7, 11, 11.8, 5.2, 2.2, 0)


@icono('Chevron')
def _():
    return L().linea(2.5, 11, 8, 5.5, 2.6).linea(8, 5.5, 13.5, 11, 2.6)


@icono('DoubleChevron')
def _():
    return (L().linea(2.5, 8, 8, 2.5, 2.4).linea(8, 2.5, 13.5, 8, 2.4)
            .linea(2.5, 14, 8, 8.5, 2.4).linea(8, 8.5, 13.5, 14, 2.4))


@icono('Caret')
def _():
    return L().poli([(2, 5), (14, 5), (8, 12)])


@icono('CaretRight')
def _():
    return L().poli([(5, 2), (12, 8), (5, 14)])


@icono('Boost')
def _():
    return L().poli([(2, 11), (14, 11), (8, 4)])


@icono('Arrow')
def _():
    return L().rect(2, 7, 10, 2).poli([(9, 3), (14.5, 8), (9, 13)])


@icono('ArrowToTop')
def _():
    return L().rect(2, 1, 12, 2).rect(7, 7, 2, 8).poli([(3, 9), (8, 4), (13, 9)])


@icono('Download')
def _():
    return L().rect(7, 1, 2, 8).poli([(3, 6), (13, 6), (8, 11)]).rect(1, 11, 2, 4).rect(13, 11, 2, 4).rect(1, 13, 14, 2)


@icono('Share')
def _():
    return (L().poli([(9, 1), (15, 6.5), (9, 12)]).rect(5, 5, 5, 3).rect(3, 6, 2, 6)
            .rect(1, 9, 2, 6).rect(1, 13, 8, 2))


@icono('External')
def _():
    return (L().rect(1, 3, 2, 12).rect(1, 13, 12, 2).rect(1, 3, 5, 2).rect(11, 9, 2, 6)
            .rect(9, 1, 6, 2).rect(13, 1, 2, 6).linea(6.5, 9.5, 13.5, 2.5, 2.4))


@icono('Link')
def _():
    return (L().ascii([
        '................',
        '.........####...',
        '........######..',
        '.......##....##.',
        '.......#......#.',
        '...........##.#.',
        '..........##..#.',
        '.........##..##.',
        '.##..###.#..##..',
        '.#..##.....##...',
        '.#.##...........',
        '.#......#.......',
        '.##....##.......',
        '..######........',
        '...####.........',
        '................']))


@icono('Edit')
def _():
    return L().linea(3, 13, 12, 4, 3.2).linea(10.5, 2.5, 13.5, 5.5, 2).rect(1, 13, 3, 2).px(2, 12).linea(4, 11, 10.5, 4.5, 1, 0)


@icono('Trash', 'Bin')
def _():
    return (L().rect(1, 3, 14, 2).rect(6, 1, 4, 2).marco(3, 5, 10, 10)
            .rect(6, 7, 1, 6).rect(9, 7, 1, 6))


@icono('Delete')
def _():
    return L().poli([(1, 8), (5, 3), (15, 3), (15, 13), (5, 13)]).linea(7.5, 5.5, 12.5, 10.5, 1.8, 0).linea(12.5, 5.5, 7.5, 10.5, 1.8, 0)


@icono('Save', 'Floppy')
def _():
    return (L().poli([(1, 1), (12, 1), (15, 4), (15, 15), (1, 15)]).rect(4, 1, 7, 4, 0).rect(8, 2, 2, 2)
            .rect(4, 9, 8, 6, 0).rect(5, 10, 6, 1).rect(5, 12, 6, 1))


@icono('File')
def _():
    return (L().poli([(2, 1), (10, 1), (14, 5), (14, 15), (2, 15)]).poli([(4, 3), (9, 3), (12, 6), (12, 13), (4, 13)], 0)
            .rect(7, 6, 2, 6).rect(5, 8, 6, 2))


@icono('Info')
def _():
    return L().anillo(8, 8, 7.5, 2).rect(7, 7, 2, 5).rect(7, 4, 2, 2)


@icono('Asterisk')
def _():
    return L().rect(7, 1, 2, 14).linea(2, 4.5, 14, 11.5, 2.2).linea(2, 11.5, 14, 4.5, 2.2)


@icono('Error')
def _():
    return L().poli([(5, 1), (11, 1), (15, 5), (15, 11), (11, 15), (5, 15), (1, 11), (1, 5)]).rect(7, 4, 2, 5, 0).rect(7, 10, 2, 2, 0)


@icono('Hide')
def _():
    return (L().ascii([
        '................',
        '................',
        '................',
        '.....######.....',
        '...##......##...',
        '..#....##....#..',
        '.#....####....#.',
        '#.....####.....#',
        '.#....####....#.',
        '..#....##....#..',
        '...##......##...',
        '.....######.....',
        '................',
        '................',
        '................',
        '................']).linea(2, 14, 14, 2, 2.2))


@icono('Sort')
def _():
    return L().rect(1, 2, 6, 2).rect(1, 7, 9, 2).rect(1, 12, 12, 2).rect(12, 1, 2, 9).poli([(9.5, 8), (16.5, 8), (13, 12)])


@icono('Unfilter')
def _():
    return L().poli([(1, 2), (15, 2), (9.5, 8), (9.5, 14), (6.5, 15), (6.5, 8)]).linea(1, 15, 15, 1, 1.6, 0).linea(2, 15, 15, 2, 1.2)


@icono('Spinner')
def _():
    l = L()
    for k in range(8):
        a = k * math.pi / 4
        l.rect(round(7 + 5.6 * math.cos(a)), round(7 + 5.6 * math.sin(a)), 2, 2)
    return l



@icono('Pip')
def _():
    return L().disco(8, 8, 4.5)


@icono('On')
def _():
    return L().anillo(8, 8, 7.5, 2).disco(8, 8, 3.6)


@icono('Off')
def _():
    return L().anillo(8, 8, 7.5, 2)


@icono('Loop')
def _():
    return (L().anillo(8, 8, 6.5, 2).rect(9, 1, 7, 6, 0).poli([(8, 0), (13.5, 4), (8, 8)])
            .rect(0, 9, 7, 6, 0).poli([(8, 8), (2.5, 12), (8, 16)]))


@icono('QR', 'QRCode')
def _():
    l = L()
    for x, y in ((1, 1), (10, 1), (1, 10)):
        l.marco(x, y, 5, 5, 1).rect(x + 2, y + 2, 1, 1)
    return l.ascii(['##.#', '#.##', '.#.#', '##..'], 10, 10).rect(7, 1, 1, 2).rect(7, 4, 2, 1).rect(1, 7, 3, 1).rect(6, 7, 3, 2).rect(7, 11, 2, 3)


@icono('Quote')
def _():
    return L().rect(1, 3, 6, 5).rect(9, 3, 6, 5).linea(5, 7, 2.5, 13, 2.2).linea(13, 7, 10.5, 13, 2.2)


# --- Nuzlocke ---
@icono('Ball')
def _():
    return A([
        '................',
        '.....######.....',
        '...##########...',
        '..############..',
        '.##############.',
        '.#####....#####.',
        '#####..##..#####',
        '#####.#..#.#####',
        '#.....#..#.....#',
        '#......##......#',
        '#..............#',
        '.#............#.',
        '.##..........##.',
        '..###......###..',
        '....########....',
        '................'])



@icono('Deceased')
def _():
    return A([
        '................',
        '....########....',
        '...##########...',
        '..############..',
        '..############..',
        '..###..##..###..',
        '..##....#...##..',
        '..###..###..###.',
        '...####.#.####..',
        '....#######.....',
        '....#.#.#.#.....',
        '....#######.....',
        '................',
        '................',
        '................',
        '................']).espejo().rect(4, 9, 8, 1).rect(4, 11, 8, 1).px(5, 10).px(7, 10).px(8, 10).px(10, 10).rect(3, 13, 3, 2).rect(10, 13, 3, 2).linea(4.5, 13.5, 11.5, 13.5, 1.2)


@icono('Gift')
def _():
    return (L().rect(1, 5, 14, 3).rect(2, 9, 12, 6).rect(7, 5, 2, 10, 0)
            .ascii(['.##....##.', '#..#..#..#', '#...##...#', '.###..###.'], 3, 1))


@icono('Traded', 'Transfer')
def _():
    return (L().rect(2, 3, 9, 2).poli([(9, 0), (14, 4), (9, 8)])
            .rect(5, 11, 9, 2).poli([(7, 8), (2, 12), (7, 16)]))


@icono('Missed')
def _():
    return A([
        '................',
        '..........###...',
        '.........#...#..',
        '.............#..',
        '.############...',
        '................',
        '.##############.',
        '...............#',
        '..............#.',
        '.###########....',
        '............#...',
        '.............#..',
        '.........#..#...',
        '..........##....',
        '................',
        '................'])


@icono('Shiny')
def _():
    return (L().poli([(6, 1), (7.6, 6.4), (13, 8), (7.6, 9.6), (6, 15), (4.4, 9.6), (-1, 8), (4.4, 6.4)])
            .poli([(12.5, 0.5), (13.3, 2.7), (15.5, 3.5), (13.3, 4.3), (12.5, 6.5), (11.7, 4.3), (9.5, 3.5), (11.7, 2.7)]))


@icono('Team')
def _():
    return A([
        '................',
        '................',
        '..###......###..',
        '.#####....#####.',
        '.#####....#####.',
        '.#####....#####.',
        '..###......###..',
        '................',
        '..###......###..',
        '.#####....#####.',
        '#######..#######',
        '#######..#######',
        '#######..#######',
        '#######..#######',
        '................',
        '................'])



@icono('Box')
def _():
    return A([
        '................',
        '................',
        '.##############.',
        '.#............#.',
        '.##############.',
        '..#..........#..',
        '..#..######..#..',
        '..#..#....#..#..',
        '..#..######..#..',
        '..#..........#..',
        '..#..........#..',
        '..#..........#..',
        '..############..',
        '................',
        '................',
        '................'])



@icono('Grave')
def _():
    return (L().disco(8, 6, 5.5).rect(3, 6, 11, 7).rect(1, 13, 14, 2)
            .rect(7, 4, 2, 6, 0).rect(5, 6, 6, 2, 0))


@icono('Trophy')
def _():
    return (L().poli([(3, 1), (13, 1), (12.5, 7), (10, 9.5), (6, 9.5), (3.5, 7)]).rect(7, 9, 2, 3).rect(4, 12, 8, 3)
            .marco(0, 2, 4, 5, 1).marco(12, 2, 4, 5, 1))


@icono('Analysis')
def _():
    return (L().rect(5, 1, 6, 2).rect(6, 3, 4, 4).poli([(6, 6), (10, 6), (15, 14), (14, 15), (2, 15), (1, 14)])
            .rect(7, 3, 2, 4, 0).poli([(7, 7), (9, 7), (11.5, 11), (4.5, 11)], 0))


@icono('Map')
def _():
    return (L().poli([(1, 3), (5.5, 1), (10.5, 3), (15, 1), (15, 13), (10.5, 15), (5.5, 13), (1, 15)])
            .rect(5, 2, 1, 12, 0).rect(10, 4, 1, 11, 0))


@icono('Heart', 'HP')
def _():
    return L().disco(5, 6, 3.7).disco(11, 6, 3.7).poli([(1.5, 7.5), (14.5, 7.5), (8, 14.5)])


@icono('Track')
def _():
    return (L().disco(5, 10.5, 2.8).disco(11, 6.5, 2.8)
            .rect(1, 5, 2, 2).rect(4, 4, 2, 2).rect(7, 5, 2, 2)
            .rect(7, 1, 2, 2).rect(10, 0, 2, 2).rect(13, 1, 2, 2))


@icono('Game')
def _():
    return (L().poli([(2, 4), (14, 4), (15.5, 12), (13, 13.5), (10.5, 11), (5.5, 11), (3, 13.5), (0.5, 12)])
            .rect(3, 7, 4, 1, 0).rect(4, 6, 2, 3, 0).rect(10, 6, 2, 1, 0).rect(12, 8, 1, 1, 0))


@icono('Dice')
def _():
    return L().marco(1, 1, 14, 14).rect(4, 4, 2, 2).rect(10, 4, 2, 2).rect(7, 7, 2, 2).rect(4, 10, 2, 2).rect(10, 10, 2, 2)


@icono('Hand')
def _():
    return L().rect(1, 10, 3, 5).poli([(4, 10), (9, 10), (11, 12), (15, 10), (15, 12), (11, 15), (4, 15)]).disco(9, 5, 3)


@icono('Cookie')
def _():
    return L().disco(8, 8, 7.5).rect(4, 4, 2, 2, 0).rect(9, 6, 2, 2, 0).rect(5, 10, 2, 2, 0).rect(10, 11, 2, 1, 0)


@icono('Desktop')
def _():
    return L().marco(1, 2, 14, 9).rect(7, 11, 2, 2).rect(4, 13, 8, 2)


@icono('Mobile')
def _():
    return L().marco(4, 1, 8, 14).rect(7, 12, 2, 1)


@icono('DarkMode')
def _():
    return L().disco(8, 8, 6.8).disco(11, 5.5, 5.5, 0)


@icono('LightMode')
def _():
    l = L().disco(8, 8, 3.7)
    for k in range(8):
        a = k * math.pi / 4
        l.linea(8 + 5.3 * math.cos(a), 8 + 5.3 * math.sin(a), 8 + 7.3 * math.cos(a), 8 + 7.3 * math.sin(a), 2)
    return l


@icono('BarChart')
def _():
    return L().rect(1, 9, 3, 6).rect(6, 4, 3, 11).rect(11, 1, 3, 14)


@icono('Bubbles')
def _():
    return L().disco(5, 10, 4.3).disco(11.5, 5, 3.2).disco(12.5, 12.5, 2)


# --- Estadísticas y categorías ---
@icono('Atk', 'Physical')
def _():
    return A([
        '................',
        '................',
        '....##.##.##....',
        '...###.##.##.#..',
        '...###.##.##.##.',
        '...############.',
        '.##############.',
        '.###..#########.',
        '.##...#########.',
        '.###.##########.',
        '..#############.',
        '...###########..',
        '....#########...',
        '.....#######....',
        '.....#######....',
        '................'])



@icono('Def')
def _():
    return L().poli([(8, 0.5), (15, 3), (14, 9), (8, 15.5), (2, 9), (1, 3)])


@icono('Shield')
def _():
    return L().poli([(8, 0.5), (15, 3), (14, 9), (8, 15.5), (2, 9), (1, 3)]).poli([(8, 3), (12.8, 4.7), (12, 8.5), (8, 12.6), (4, 8.5), (3.2, 4.7)], 0)


@icono('Spa', 'Special')
def _():
    return A([
        '................',
        '.....######.....',
        '...##......##...',
        '..#..........#..',
        '.#....####....#.',
        '.#...#....#...#.',
        '#...#......#...#',
        '#...#..##..#...#',
        '#...#..##..#...#',
        '#...#......#...#',
        '.#...#....#...#.',
        '.#....####....#.',
        '..#..........#..',
        '...##......##...',
        '.....######.....',
        '................'])



@icono('Spd')
def _():
    return (L().poli([(8, 0.5), (15, 3), (14, 9), (8, 15.5), (2, 9), (1, 3)])
            .poli([(8, 3), (12.8, 4.7), (12, 8.5), (8, 12.6), (4, 8.5), (3.2, 4.7)], 0)
            .poli([(8, 4.5), (10.5, 7.5), (8, 10.5), (5.5, 7.5)]))



@icono('Spe')
def _():
    return L().poli([(10, 0), (3, 9), (8, 9), (6, 16), (13, 6.5), (8, 6.5)])


@icono('Status')
def _():
    return L().disco(8, 8, 7.5).rect(8, 0, 8, 16, 0).anillo(8, 8, 7.5, 2)



@icono('Sword')
def _():
    return L().linea(3, 13, 13, 3, 2.6).poli([(11, 1), (15, 1), (15, 5)]).linea(2, 9, 7, 14, 2).rect(1, 13, 3, 2)


@icono('Double')
def _():
    return (L().ascii(['.####.', '##..##', '....##', '...##.', '..##..', '.##...', '######'], 1, 4)
            .linea(9, 6, 14.5, 11.5, 2).linea(14.5, 6, 9, 11.5, 2))


# --- Tipos (los tres iniciales) ---
@icono('Fire')
def _():
    return (L().poli([(8, 0.5), (12, 5), (13.5, 9), (12.5, 13), (8, 15.5), (3.5, 13), (2.5, 9), (4.5, 6), (6, 8), (6.5, 4)])
            .poli([(8.5, 7), (10.5, 10), (10.5, 12.5), (8, 14), (5.5, 12.5), (6, 10.5)], 0))


@icono('Water')
def _():
    return L().disco(8, 10, 5.5).poli([(8, 0.5), (13, 9), (3, 9)]).rect(5, 9, 2, 3, 0).px(5, 12, 0)


@icono('Grass')
def _():
    return (L().poli([(15, 1), (14, 9), (10, 13), (5, 13), (3.5, 10), (5, 6), (9, 3)])
            .linea(1, 15, 11, 5, 1.6, 0).linea(1.5, 15, 4.5, 12, 1.8))


@icono('LongGrass')
def _():
    return (L().poli([(1, 15), (2.5, 6), (4, 15)]).poli([(4, 15), (6.5, 2), (9, 15)]).poli([(8, 15), (10.5, 5), (12.5, 15)])
            .poli([(11.5, 15), (14, 8), (15.5, 15)]))


# --- Lugares ---
@icono('Route')
def _():
    return L().rect(7, 1, 2, 14).rect(4, 14, 8, 2).poli([(2, 3), (12, 3), (15, 5.5), (12, 8), (2, 8)]).rect(4, 5, 6, 1, 0)


@icono('Town')
def _():
    return L().poli([(1, 8), (8, 1.5), (15, 8)]).rect(3, 8, 10, 7).rect(7, 10, 2, 5, 0).rect(4, 9, 2, 2, 0).rect(10, 9, 2, 2, 0)


@icono('City')
def _():
    return (L().rect(1, 6, 5, 9).rect(6, 2, 5, 13).rect(11, 8, 4, 7)
            .rect(2, 8, 1, 1, 0).rect(4, 8, 1, 1, 0).rect(2, 11, 1, 1, 0).rect(4, 11, 1, 1, 0)
            .rect(7, 4, 1, 1, 0).rect(9, 4, 1, 1, 0).rect(7, 7, 1, 1, 0).rect(9, 7, 1, 1, 0).rect(7, 10, 1, 1, 0).rect(9, 10, 1, 1, 0)
            .rect(12, 10, 2, 1, 0).rect(12, 12, 2, 1, 0))


@icono('Forest')
def _():
    return (L().poli([(5, 1), (9.5, 11), (0.5, 11)]).rect(4, 11, 2, 4)
            .poli([(11.5, 4), (15.5, 12.5), (7.5, 12.5)]).rect(11, 12, 2, 3))


@icono('Mountain')
def _():
    return (L().poli([(0, 15), (6, 3), (12, 15)]).poli([(7, 15), (11.5, 6.5), (16, 15)])
            .ascii(['o.o.o'], 4, 7).ascii(['o.o'], 10, 9))



@icono('Tunnel')
def _():
    return L().poli([(0, 15), (1, 8), (4, 3), (8, 1.5), (12, 3), (15, 8), (16, 15)]).disco(8, 11, 4.5, 0).rect(4, 11, 8, 4, 0)


@icono('Ruins')
def _():
    return (L().rect(4, 4, 8, 11).rect(2, 1, 12, 3).rect(4, 1, 2, 1, 0).rect(7, 1, 2, 1, 0).rect(10, 1, 2, 1, 0)
            .rect(7, 10, 2, 5, 0).rect(7, 6, 2, 2, 0))


@icono('Shrine')
def _():
    return L().poli([(0, 5), (8, 0.5), (16, 5)]).rect(2, 5, 12, 2).rect(3, 7, 2, 8).rect(11, 7, 2, 8).rect(6, 8, 4, 7).rect(1, 14, 14, 2)


@icono('Stadium')
def _():
    return A([
        '................',
        '................',
        '..############..',
        '.##..........##.',
        '##..########..##',
        '#..##......##..#',
        '##..########..##',
        '#.##........##.#',
        '#..............#',
        '#.##.##..##.##.#',
        '#.##.##..##.##.#',
        '#.##.##..##.##.#',
        '#.##.##..##.##.#',
        '#..............#',
        '.##############.',
        '................'])


def todos():
    return {nombre: f() for nombre, f in ICONOS.items()}


def escribir_js(iconos):
    lineas = [
        '// Iconos pixel art de Lockedex (16x16). Generado por herramientas/generar_iconos.py: no editar a mano.',
        'const icono = (d) => ({',
        "  body: `<path fill=\"currentColor\" shape-rendering=\"crispEdges\" d=\"${d}\"/>`,",
        '  width: 16,',
        '  height: 16',
        '})',
        '',
    ]
    for nombre, l in iconos.items():
        lineas.append(f"export const {nombre} = icono('{l.ruta()}')")
    SALIDA.write_text('\n'.join(lineas) + '\n')


def muestra(iconos):
    """Hoja de contacto: cada icono a 16 px y a 48 px, con su nombre."""
    cols = 8
    w, h = 150, 86
    filas = (len(iconos) + cols - 1) // cols
    partes = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{cols * w}" height="{filas * h}"><rect width="100%" height="100%" fill="#f4f3ec"/>']
    for k, (nombre, l) in enumerate(iconos.items()):
        x, y = (k % cols) * w, (k // cols) * h
        d = l.ruta()
        partes.append(f'<g transform="translate({x + 8} {y + 8}) scale(3)"><path fill="#1b1b1f" shape-rendering="crispEdges" d="{d}"/></g>')
        partes.append(f'<g transform="translate({x + 70} {y + 24})"><path fill="#dc0a2d" shape-rendering="crispEdges" d="{d}"/></g>')
        partes.append(f'<g transform="translate({x + 94} {y + 20}) scale(1.5)"><path fill="#1b1b1f" d="{d}"/></g>')
        partes.append(f'<text x="{x + 8}" y="{y + 74}" font-family="monospace" font-size="12" fill="#333">{nombre}</text>')
    partes.append('</svg>')
    Path('/tmp/iconos.svg').write_text(''.join(partes))
    subprocess.run(['rsvg-convert', '/tmp/iconos.svg', '-o', '/tmp/iconos.png'], check=True)


if __name__ == '__main__':
    iconos = todos()
    escribir_js(iconos)
    if '--muestra' in sys.argv:
        muestra(iconos)
    print(f'{len(iconos)} iconos en {SALIDA.relative_to(RAIZ)}')
