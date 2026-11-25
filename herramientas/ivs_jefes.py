# IVs reales de los jefes de la 3.ª gen, sacados de los desensamblados de pret (trainer_parties.h).
# En la GBA cada Pokémon de entrenador lleva un «iv» de 0 a 255 y sus IVs valen iv*31/255 en todas las
# estadísticas: Brock y Misty en RojoFuego, por ejemplo, van con IVs 0, no 31. Se añaden como «iv» (0–31)
# a datos/jefes/<juego>.json; luego `node herramientas/datos.mjs compilar` los lleva a las ligas.
import re, json, os, sys
from collections import Counter
PRET = '/home/claude/sprites-pret'
JUEGOS = {'fr': 'pokefirered', 'lg': 'pokefirered', 'em': 'pokeemerald', 'ruby': 'pokeruby', 'saph': 'pokeruby'}
DATOS = os.path.join(os.path.dirname(__file__), '..', 'datos', 'jefes')

def partidas(repo):
    s = open(f'{PRET}/{repo}/src/data/trainer_parties.h').read()
    out = []
    # pokefirered/pokeemerald: «static const struct … sParty_X[]»; pokeruby: «const struct … gTrainerParty_X[]»
    for m in re.finditer(r'(?:static )?const struct \w+ ((?:sParty|gTrainerParty)_\w+)\[\] = \{(.*?)\n\};', s, re.S):
        mons = []
        for e in re.finditer(r'\{([^{}]*?\.species\s*=\s*SPECIES_\w+[^{}]*?)(?:\{[^{}]*\}[^{}]*)?\}', m.group(2), re.S):
            t = e.group(1)
            iv = re.search(r'\.iv\s*=\s*(\d+)', t); lvl = re.search(r'\.(?:lvl|level)\s*=\s*(\d+)', t)
            sp = re.search(r'\.species\s*=\s*SPECIES_(\w+)', t)
            if iv and lvl and sp:
                mons.append((sp.group(1).lower().replace('_', '-'), int(lvl.group(1)), int(iv.group(1))))
        if mons: out.append((m.group(1), mons))
    return out

def nombre(n):
    n = str(n).lower()
    return {'farfetch-d': 'farfetchd', 'mr-mime': 'mr-mime', 'nidoran-f': 'nidoran-f', 'nidoran-m': 'nidoran-m'}.get(n, n)

# Mismo formato que herramientas/datos.mjs (formatear): objetos «planos» en una línea si caben en 160
def simple(v): return not isinstance(v, (dict, list))
def js(v): return json.dumps(v, ensure_ascii=False)
def plano(v): return isinstance(v, dict) and all(simple(x) or (isinstance(x, list) and all(simple(y) for y in x)) for x in v.values())
def formatear(v, nivel=0):
    sangria, dentro = '  ' * nivel, '  ' * (nivel + 1)
    if simple(v): return js(v)
    if isinstance(v, list):
        if not v: return '[]'
        if all(simple(x) for x in v): return '[' + ', '.join(js(x) for x in v) + ']'
        return '[\n' + ',\n'.join(dentro + formatear(x, nivel + 1) for x in v) + '\n' + sangria + ']'
    if not v: return '{}'
    if plano(v):
        linea = '{ ' + ', '.join(js(k) + ': ' + formatear(x) for k, x in v.items()) + ' }'
        if len(linea) + len(sangria) <= 160: return linea
    return '{\n' + ',\n'.join(dentro + js(k) + ': ' + formatear(x, nivel + 1) for k, x in v.items()) + '\n' + sangria + '}'

total = 0
for juego, repo in JUEGOS.items():
    ruta = os.path.join(DATOS, juego + '.json')
    if not os.path.exists(ruta): continue
    bruto = open(ruta).read(); jefes = json.loads(bruto)
    pp = partidas(repo)
    puestos = 0; sin = []
    for clave, jefe in jefes.items():
        equipo = [(nombre(p['name']), int(p.get('level') or 0)) for p in jefe.get('pokemon', [])]
        if not equipo: continue
        s = Counter(equipo)
        # partidas de pret que encajan con el equipo (todas sus especies y niveles están en el jefe)
        buenas = [mons for _, mons in pp if len(mons) >= min(2, len(equipo)) and all((sp, lv) in s for sp, lv, _ in mons)]
        if not buenas:
            sin.append(jefe.get('name')); continue
        ivs = {}
        for mons in buenas:
            for sp, lv, iv in mons: ivs.setdefault((sp, lv), iv)
        for p in jefe['pokemon']:
            k = (nombre(p['name']), int(p.get('level') or 0))
            if k in ivs:
                p['iv'] = ivs[k] * 31 // 255; puestos += 1
    with open(ruta, 'w') as fh:
        fh.write(formatear(jefes) + '\n')
    total += puestos
    print(f'{juego}: IVs puestos a {puestos} Pokémon; sin pareja en pret: {", ".join(map(str, sin)) or "ninguno"}')
print('total', total)
