# Naturalezas reales de los Pokémon de los jefes de la 3.ª gen, calculadas como lo hace el juego
# (CreateNPCTrainerParty en battle_main.c de pret: pokeruby, pokefirered y pokeemerald):
#   valor de personalidad = base + (hash << 8), con base 0x80 en combates dobles, 0x78 si la entrenadora es
#   mujer y 0x88 si no; el hash se acumula por cada Pokémon del equipo sumando los caracteres (en la
#   codificación del juego) del nombre del entrenador y del nombre de la especie. Naturaleza = personalidad % 25.
# Se añaden como «nat» (en inglés, minúsculas) a datos/jefes/<juego>.json; luego `node herramientas/datos.mjs compilar`.
#
# También los IVs y naturalezas de los jefes de la 4.ª gen: Platino (pret/pokeplatinum), Diamante/Perla
# (pret/pokediamond) y HeartGold/SoulSilver (pret/pokeheartgold). IV = dificultad·31/255.
# La 5.ª gen no tiene decomp: sus jefes siguen sin IVs ni naturalezas.
import re, json, os, glob
from collections import Counter

AQUI = os.path.dirname(__file__)
PRET = '/home/claude/sprites-pret'
DATOS = os.path.join(AQUI, '..', 'datos', 'jefes')
NATURALEZAS = ['hardy', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax',
               'timid', 'hasty', 'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash',
               'calm', 'gentle', 'sassy', 'careful', 'quirky']
JUEGOS = {
    'fr': ('pokefirered', 'src/data/trainers.h'),
    'lg': ('pokefirered', 'src/data/trainers.h'),
    'em': ('pokeemerald', 'src/data/trainers.h'),
    'ruby': ('pokeruby', 'src/data/trainers_en.h'),
    'saph': ('pokeruby', 'src/data/trainers_en.h'),
}

# Codificación de caracteres de la GBA (la de pokeemerald vale para las tres)
CHARMAP = {}
for linea in open(f'{PRET}/pokeemerald/charmap.txt', encoding='utf-8'):
    m = re.match(r"^'(.)'\s*=\s*([0-9A-F]{2})\s*$", linea)
    if m and m.group(1) not in CHARMAP:
        CHARMAP[m.group(1)] = int(m.group(2), 16)
CHARMAP["'"] = CHARMAP.get('’', 0xB4)

def codificar(texto):
    return sum(CHARMAP[c] for c in texto)

# Nombre de la especie tal cual en el juego (gSpeciesNames) a partir de la constante SPECIES_X
ESPECIALES = {'FARFETCHD': "FARFETCH'D", 'MR_MIME': 'MR. MIME', 'NIDORAN_F': 'NIDORAN♀', 'NIDORAN_M': 'NIDORAN♂', 'HO_OH': 'HO-OH'}
def nombre_especie(constante):
    return ESPECIALES.get(constante, constante.replace('_', ' '))

def partidas(repo):
    s = open(f'{PRET}/{repo}/src/data/trainer_parties.h').read()
    out = {}
    for m in re.finditer(r'(?:static )?const struct \w+ ((?:sParty|gTrainerParty)_\w+)\[\] = \{(.*?)\n\};', s, re.S):
        mons = []
        for e in re.finditer(r'\{([^{}]*?\.species\s*=\s*SPECIES_\w+[^{}]*?)(?:\{[^{}]*\}[^{}]*)?\}', m.group(2), re.S):
            t = e.group(1)
            lvl = re.search(r'\.(?:lvl|level)\s*=\s*(\d+)', t)
            sp = re.search(r'\.species\s*=\s*SPECIES_(\w+)', t)
            if lvl and sp:
                mons.append((sp.group(1), int(lvl.group(1))))
        if mons:
            out[m.group(1)] = mons
    return out

def entrenadores(repo, fichero):
    s = open(f'{PRET}/{repo}/{fichero}').read()
    out = []
    for m in re.finditer(r'\[TRAINER_\w+\]\s*=\s*\{(.*?)\n    \},', s, re.S):
        t = m.group(1)
        nombre = re.search(r'\.trainerName\s*=\s*_\("([^"]*)"\)', t)
        party = re.search(r'\.party\s*=\s*(?:\{\s*\.\w+\s*=\s*)?(?:\w+\()?((?:sParty|gTrainerParty)_\w+)', t)
        if not nombre or not party:
            continue
        doble = re.search(r'\.doubleBattle\s*=\s*TRUE', t) is not None
        mujer = re.search(r'\.encounterMusic_gender\s*=\s*[^,]*F_TRAINER_FEMALE', t) is not None
        out.append((nombre.group(1), doble, mujer, party.group(1)))
    return out

def naturalezas(nombre, doble, mujer, mons):
    h = 0
    res = []
    for constante, _ in mons:
        base = 0x80 if doble else (0x78 if mujer else 0x88)
        h = (h + codificar(nombre)) & 0xFFFFFFFF
        h = (h + codificar(nombre_especie(constante))) & 0xFFFFFFFF
        pv = (base + (h << 8)) & 0xFFFFFFFF
        res.append(NATURALEZAS[pv % 25])
    return res

def clave_especie(constante):
    n = constante.lower().replace('_', '-')
    return {'farfetchd': 'farfetchd', 'mr-mime': 'mr-mime'}.get(n, n)

def nombre_datos(n):
    n = str(n).lower()
    return {'farfetch-d': 'farfetchd'}.get(n, n)

# Mismo formato que herramientas/datos.mjs (formatear)
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

def poner(juego, equipos, campo, valor_de):
    """equipos: lista de [(especie, nivel, valor)] de pret; se casan con los jefes como en ivs_jefes.py"""
    ruta = os.path.join(DATOS, juego + '.json')
    if not os.path.exists(ruta): return 0, []
    jefes = json.loads(open(ruta).read())
    puestos, sin = 0, []
    for jefe in jefes.values():
        equipo = [(nombre_datos(p['name']), int(p.get('level') or 0)) for p in jefe.get('pokemon', [])]
        if not equipo: continue
        s = Counter(equipo)
        buenas = [mons for mons in equipos if len(mons) >= min(2, len(equipo)) and all((sp, lv) in s for sp, lv, _ in mons)]
        if not buenas:
            sin.append(jefe.get('name')); continue
        # la partida que mejor encaja primero (la que cubre más Pokémon del jefe). Los valores van por
        # posición: dos Geodude del mismo nivel tienen naturalezas distintas (el hash se acumula)
        buenas.sort(key=lambda m: -len(m))
        valores = {}
        for mons in buenas:
            propios = {}
            for sp, lv, v in mons: propios.setdefault((sp, lv), []).append(v)
            for k, lista in propios.items(): valores.setdefault(k, lista)
        usados = Counter()
        for p in jefe['pokemon']:
            k = (nombre_datos(p['name']), int(p.get('level') or 0))
            if k in valores:
                lista = valores[k]
                p[campo] = valor_de(lista[min(usados[k], len(lista) - 1)]); usados[k] += 1; puestos += 1
    with open(ruta, 'w') as fh:
        fh.write(formatear(jefes) + '\n')
    return puestos, sin

total = 0
for juego, (repo, fichero) in JUEGOS.items():
    pp = partidas(repo)
    equipos = []
    for nombre, doble, mujer, party in entrenadores(repo, fichero):
        mons = pp.get(party)
        if not mons: continue
        nats = naturalezas(nombre, doble, mujer, mons)
        equipos.append([(clave_especie(c), lv, n) for (c, lv), n in zip(mons, nats)])
    puestos, sin = poner(juego, equipos, 'nat', lambda n: n)
    total += puestos
    print(f'{juego}: naturaleza puesta a {puestos} Pokémon ({len(equipos)} equipos de pret); sin pareja: {len(sin)}')

# Platino: IVs por «iv_scale» y naturaleza como TrainerData_BuildParty (src/trainer_data.c de pokeplatinum):
#   semilla = iv_scale + nivel + nº de especie + índice del entrenador; el LCRNG (×1103515245 + 24691) avanza
#   tantas veces como el número de la clase del entrenador (rnd = estado >> 16); personalidad =
#   (rnd << 8) + 120 si la clase es de mujer o 136 si no; naturaleza = personalidad % 25
PP = f'{PRET}/pokeplatinum'
def lista_constantes(nombre):
    return {l.strip(): i for i, l in enumerate(open(f'{PP}/generated/{nombre}.txt')) if l.strip()}
if os.path.exists(f'{PP}/generated/trainers.txt'):
    ENTRENADORES = lista_constantes('trainers')
    CLASES = lista_constantes('trainer_classes')
    ESPECIES = lista_constantes('species')
    MUJERES = set(re.findall(r'\[(TRAINER_CLASS_\w+)\]\s*=\s*GENDER_FEMALE', open(f'{PP}/include/data/trainer_class_genders.h').read()))
    def nat_platino(id_entrenador, clase, mujer, especie, nivel, escala):
        estado = (escala + nivel + especie + id_entrenador) & 0xFFFFFFFF
        rnd = estado
        for _ in range(clase):
            estado = (estado * 1103515245 + 24691) & 0xFFFFFFFF
            rnd = estado >> 16
        pv = ((rnd << 8) + (120 if mujer else 136)) & 0xFFFFFFFF
        return NATURALEZAS[pv % 25]
    plat_ivs, plat_nats = [], []
    for f in sorted(glob.glob(f'{PP}/res/trainers/data/*.json')):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        constante = 'TRAINER_' + os.path.basename(f)[:-5].upper()
        clase = d.get('class', '')
        if constante not in ENTRENADORES or clase not in CLASES:
            continue
        ivs, nats = [], []
        for p in d.get('party', []):
            sp = p.get('species')
            if not sp or sp not in ESPECIES: continue
            nombre = sp.replace('SPECIES_', '').lower().replace('_', '-')
            nivel, escala = int(p.get('level') or 0), int(p.get('iv_scale') or 0)
            ivs.append((nombre, nivel, escala))
            nats.append((nombre, nivel, nat_platino(ENTRENADORES[constante], CLASES[clase], clase in MUJERES, ESPECIES[sp], nivel, escala)))
        if ivs:
            plat_ivs.append(ivs); plat_nats.append(nats)
    # el iv_scale va de 0 a 255; el Electivire de Volkner lleva 2500 (en el juego eso da IVs al azar): se queda en 31
    puestos, sin = poner('pt', plat_ivs, 'iv', lambda v: min(31, v * 31 // 255))
    print(f'pt: IVs puestos a {puestos} Pokémon ({len(plat_ivs)} equipos de pret); sin pareja: {len(sin)} {sin}')
    puestos2, _ = poner('pt', plat_nats, 'nat', lambda n: n)
    print(f'pt: naturaleza puesta a {puestos2} Pokémon')
    total += puestos + puestos2

# Diamante/Perla y HeartGold/SoulSilver: el mismo cálculo que Platino (seed = dificultad + nivel + especie +
# índice del entrenador; el LCRNG avanza «clase» veces; personalidad = (rnd << 8) + 0x78/0x88). HGSS añade
# TrMon_OverridePidGender: «habilidad 2» pone el bit 0 (personalidad | 1) y «habilidad 1» lo quita, y el
# cambio se queda para los siguientes Pokémon del equipo (el juego lo guarda en la misma variable). El cambio
# de género (2 Pokémon en todo HGSS) depende del ratio de la especie: esos y los que les siguen se saltan.
def nat_gen4(seed, clase, base):
    estado = seed & 0xFFFFFFFF
    rnd = estado
    for _ in range(clase):
        estado = (estado * 1103515245 + 24691) & 0xFFFFFFFF
        rnd = estado >> 16
    return NATURALEZAS[(((rnd << 8) + base) & 0xFFFFFFFF) % 25]

def gen4(nombre, repo, entrenadores_, clases, mujeres, juegos):
    if not os.path.exists(f'{PRET}/{repo}') or not os.path.exists(f'{PP}/generated/species.txt'):
        print(f'{nombre}: falta {repo}'); return 0
    especies = lista_constantes('species')  # el número de especie es el de la Pokédex nacional (igual en DP/Pt/HGSS)
    t_ivs, t_nats, sin_especie = [], [], set()
    for idx, clase, party in entrenadores_:
        if clase not in clases: continue
        base = 0x78 if clase in mujeres else 0x88
        ivs, nats = [], []
        for p in party:
            sp = p.get('species')
            if sp not in especies:
                sin_especie.add(sp); continue
            n = sp.replace('SPECIES_', '').lower().replace('_', '-')
            nivel, dif = int(p.get('level') or 0), int(p.get('difficulty') or 0)
            genero = p.get('genderOverride', 'TRPOKE_GENDER_OVERRIDE_OFF')
            habilidad = p.get('abilityOverride', 'TRPOKE_ABILITY_OVERRIDE_OFF')
            if genero != 'TRPOKE_GENDER_OVERRIDE_OFF': base = None
            if base is not None and habilidad.endswith('_SECOND'): base |= 1
            if base is not None and habilidad.endswith('_FIRST'): base &= ~1
            ivs.append((n, nivel, dif))
            if base is not None:
                nats.append((n, nivel, nat_gen4(dif + nivel + especies[sp] + idx, clases[clase], base)))
        if ivs: t_ivs.append(ivs)
        if nats: t_nats.append(nats)
    hechos = 0
    for juego in juegos:
        a, sin = poner(juego, t_ivs, 'iv', lambda v: min(31, v * 31 // 255))
        b, _ = poner(juego, t_nats, 'nat', lambda n: n)
        print(f'{juego}: IVs a {a} y naturaleza a {b} Pokémon ({len(t_ivs)} equipos de {repo}); jefes sin pareja: {len(sin)} {sin[:8]}')
        hechos += a + b
    if sin_especie: print(f'{nombre}: especies sin número: {sorted(sin_especie)[:10]}')
    return hechos

def clases_de(fichero, prefijo):
    return {m.group(1): int(m.group(2)) for m in re.finditer(rf'#define ({prefijo}\w+)\s+(\d+)', open(fichero).read())}

PD = f'{PRET}/pokediamond'
if os.path.exists(f'{PD}/files/poketool/trainer/trdata.json'):
    clases = clases_de(f'{PD}/include/constants/trainer_classes.h', 'TRAINER_CLASS_')
    tabla = re.findall(r'/\*(TRAINER_CLASS_\w+)\*/\s*(\d)', open(f'{PD}/arm9/src/trainer_data.c').read())
    mujeres = {c for c, g in tabla if g == '1'}
    datos = json.load(open(f'{PD}/files/poketool/trainer/trdata.json'))['trdata']
    total += gen4('dp', 'pokediamond', [(t['index'], t['class'], t.get('party', [])) for t in datos], clases, mujeres, ['d', 'p'])

PH = f'{PRET}/pokeheartgold'
if os.path.exists(f'{PH}/files/poketool/trainer/trainers.json'):
    clases = clases_de(f'{PH}/include/constants/trainer_class.h', 'TRAINERCLASS_')
    tabla = re.findall(r'(TRAINER_MALE|TRAINER_FEMALE|TRAINER_DOUBLE),\s*//\s*(TRAINERCLASS_\w+)', open(f'{PH}/src/trainer_data.c').read())
    mujeres = {c for g, c in tabla if g == 'TRAINER_FEMALE'}
    datos = json.load(open(f'{PH}/files/poketool/trainer/trainers.json'))['trainers']
    total += gen4('hgss', 'pokeheartgold', [(i, t['class'], t.get('party', [])) for i, t in enumerate(datos)], clases, mujeres, ['hg', 'ss'])
print('total', total)
