# Converte o XML do pdftohtml da Bíblia em capítulos HTML (um por missão).
import re, json, html, sys

XML = sys.argv[1]
SAIDA = sys.argv[2]
x = open(XML, encoding='utf-8').read()
specs = {m.group(1): (int(m.group(2)), m.group(3), m.group(4)) for m in
         re.finditer(r'<fontspec id="(\d+)" size="(\d+)" family="([^"]+)" color="([^"]+)"/>', x)}

LIG = {'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl'}


def limpar(s):
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    for a, b in LIG.items():
        s = s.replace(a, b)
    return s


runs = []
for pg in re.finditer(r'<page number="(\d+)"[^>]*>(.*?)</page>', x, re.S):
    p = int(pg.group(1))
    for m in re.finditer(r'<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)" font="(\d+)">(.*?)</text>', pg.group(2), re.S):
        top, left, w, h, f, raw = m.groups()
        size, fam, cor = specs[f]
        txt = limpar(raw)
        if not txt.strip() and not txt:
            continue
        runs.append(dict(p=p, top=int(top), left=int(left), w=int(w), size=size, cor=cor,
                         mono='Mono' in fam, sans='Sans' in fam, b='<b>' in raw, i='<i>' in raw, t=txt))


def papel(r):
    s, c = r['size'], r['cor']
    if r['p'] == 1:
        return 'pular'
    if s == 10 and c == '#45453c':
        return 'pular'  # rodapé
    if r['mono']:
        return 'prompt'
    if r['sans']:
        k = r['t'].replace(' ', '').upper()
        if 'LER' in k and 'VOZ' in k:
            return 'selo-ler'
        if 'MESTRE' in k:
            return 'selo-mestre'
        return 'selo'
    if s >= 31:
        return 'h1'
    if s == 22:
        return 'h2'
    if s == 18:
        return 'h3'
    if s == 15 and c == '#6e2323':
        return 'h4'
    if r['mono']:
        return 'prompt'
    if s == 13:
        return 'tabela'
    if s == 15 and r['i'] and c == '#3a332d':
        return 'ler'
    if s == 15 and c == '#594d40' and not r['b']:
        return 'item'
    return 'texto'


for r in runs:
    r['papel'] = papel(r)

# Linhas: mesmo papel-família, mesma página, topo parecido.
linhas = []
porpag = {}
for r in runs:
    if r['papel'] == 'pular':
        continue
    porpag.setdefault(r['p'], []).append(r)
for p in sorted(porpag):
    rs = sorted(porpag[p], key=lambda r: (r['top'], r['left']))
    atual = None
    for r in rs:
        fam = 'texto' if r['papel'] == 'item' else r['papel']
        if atual and abs(r['top'] - atual['top']) <= 3 and (atual['fam'] == fam or (atual['fam'] == 'item' and fam == 'texto')):
            atual['runs'].append(r)
        else:
            atual = dict(p=p, top=r['top'], fam=r['papel'] if r['papel'] == 'item' else fam, runs=[r])
            linhas.append(atual)
    # ordena por topo de novo (linhas de mesma altura com famílias diferentes)
for l in linhas:
    l['runs'].sort(key=lambda r: r['left'])
    l['left'] = l['runs'][0]['left']


def html_runs(rs):
    out = ''
    for r in rs:
        t = html.escape(r['t'])
        if r['b'] and r['papel'] in ('texto', 'ler', 'item'):
            t = f'<strong>{t}</strong>' if t.strip() else t
        elif r['i'] and r['papel'] == 'texto':
            t = f'<em>{t}</em>' if t.strip() else t
        out += t
    return out


def juntar(a, b):
    if not a:
        return b
    sa = re.sub(r'<[^>]+>', '', a)
    if sa.endswith('-') or sa.endswith(' ') or b.startswith(' '):
        return a + b
    return a + ' ' + b


def tabela_html(ls):
    # colunas: lefts das células (agrupadas a 6px)
    lefts = sorted({r['left'] for l in ls for r in l['runs']})
    cols = []
    for v in lefts:
        if not cols or v - cols[-1] > 6:
            cols.append(v)
    def col(v):
        k = 0
        for i, c in enumerate(cols):
            if v + 3 >= c:
                k = i
        return k
    linhas_t = []
    primeira = cols[0]
    for l in ls:
        tem_primeira = any(abs(r['left'] - primeira) <= 6 for r in l['runs'])
        cab = all(r['b'] for r in l['runs'])
        continua = linhas_t and (l['top'] - linhas_t[-1]['ultimo'] < 24) and l['p'] == linhas_t[-1]['p'] and not cab and not linhas_t[-1]['cab']
        if (tem_primeira and not continua) or not linhas_t:
            linhas_t.append(dict(cab=cab, cel=[''] * len(cols), top=l['top'], ultimo=l['top'], p=l['p']))
        lin = linhas_t[-1]
        lin['ultimo'] = l['top']
        for r in l['runs']:
            k = col(r['left'])
            t = html.escape(r['t'].strip())
            if r['i'] and not r['b']:
                t = f'<em>{t}</em>'
            lin['cel'][k] = juntar(lin['cel'][k], t) if lin['cel'][k] else t
    # cabeçalho grudado ("CD Sucesso"): a última palavra vai para a coluna seguinte, se ela não tem título
    for lin in linhas_t:
        if not lin['cab']:
            continue
        for i in range(len(cols) - 1):
            if lin['cel'][i] and not lin['cel'][i + 1] and ' ' in lin['cel'][i] and any(o['cel'][i + 1] for o in linhas_t if not o['cab']):
                a, b = lin['cel'][i].rsplit(' ', 1)
                lin['cel'][i], lin['cel'][i + 1] = a, b
    # tira colunas vazias
    usadas = [i for i in range(len(cols)) if any(l['cel'][i] for l in linhas_t)]
    h = '<div class="tabela"><table>'
    corpo = False
    for l in linhas_t:
        cel = [l['cel'][i] for i in usadas]
        if l['cab'] and not corpo:
            h += '<thead><tr>' + ''.join(f'<th>{c}</th>' for c in cel) + '</tr></thead>'
        else:
            if not corpo:
                h += '<tbody>'
                corpo = True
            h += '<tr>' + ''.join(f'<td>{c}</td>' for c in cel) + '</tr>'
    if corpo:
        h += '</tbody>'
    return h + '</table></div>'


def slug(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]


capitulos = []
cap = None
blocos = []  # html do capítulo atual
para = None  # parágrafo aberto: dict(html, left, top, p)
ler = None
prompt = None
tab = []
caixa_mestre = False


def fechar_para():
    global para
    if para:
        blocos.append(f'<p>{para["html"].strip()}</p>')
        para = None


def fechar_ler():
    global ler
    if ler is not None:
        blocos.append('<blockquote class="ler"><div class="selo">Ler em voz alta</div>' +
                      ''.join(f'<p>{x.strip()}</p>' for x in ler if x.strip()) + '</blockquote>')
        ler = None


def fechar_prompt():
    global prompt
    if prompt is not None:
        blocos.append('<details class="prompt"><summary>Prompt de mapa</summary><pre>' + html.escape(' '.join(prompt)) + '</pre></details>')
        prompt = None


def fechar_tab():
    global tab
    if tab:
        blocos.append(tabela_html(tab))
        tab = []


def fechar_tudo():
    fechar_para(); fechar_ler(); fechar_prompt(); fechar_tab()


def novo_cap(titulo):
    global cap, blocos
    fechar_tudo()
    if cap:
        cap['html'] = '\n'.join(blocos)
        capitulos.append(cap)
    cap = dict(titulo=titulo, id=slug(titulo))
    blocos = []


ultima = None
h1_pendente = None
for l in linhas:
    fam = l['fam']
    txt = ''.join(r['t'] for r in l['runs'])
    if fam == 'h1':
        # títulos de 2 linhas
        if h1_pendente and ultima and ultima['fam'] == 'h1' and l['p'] == ultima['p'] and l['top'] - ultima['top'] < 50:
            cap['titulo'] = (cap['titulo'] + ' ' + txt.strip()).strip()
            cap['id'] = slug(cap['titulo'])
        else:
            novo_cap(txt.strip())
            h1_pendente = True
        ultima = l
        continue
    h1_pendente = False
    if cap is None:
        novo_cap('Abertura')
    if fam in ('h2', 'h3', 'h4'):
        fechar_tudo()
        nivel = {'h2': 'h2', 'h3': 'h3', 'h4': 'h4'}[fam]
        # título que continua na linha seguinte
        if ultima and ultima['fam'] == fam and l['top'] - ultima['top'] < 32 and l['p'] == ultima['p'] and blocos and blocos[-1].startswith(f'<{nivel}'):
            blocos[-1] = re.sub(rf'</{nivel}>$', ' ' + html.escape(txt.strip()) + f'</{nivel}>', blocos[-1])
        elif txt.strip().lower() == 'para o mestre' and blocos and blocos[-1].startswith('<div class="selo-mestre">'):
            pass
        else:
            hid = slug(txt)
            usados = cap.setdefault('ids', {})
            usados[hid] = usados.get(hid, 0) + 1
            if usados[hid] > 1:
                hid = f'{hid}-{usados[hid]}'
            blocos.append(f'<{nivel} id="{hid}">{html.escape(txt.strip())}</{nivel}>')
        ultima = l
        continue
    if fam == 'selo-ler':
        fechar_tudo()
        ler = []
        ultima = l
        continue
    if fam in ('selo-mestre', 'selo'):
        fechar_tudo()
        rot = 'Para o mestre' if fam == 'selo-mestre' else txt.replace('  ', ' ').strip().title()
        blocos.append(f'<div class="selo-mestre">{html.escape(rot)}</div>')
        ultima = l
        continue
    if fam == 'ler':
        if ler is None:
            fechar_tudo(); ler = []
        t = html_runs(l['runs'])
        novo = ultima and ultima['fam'] == 'ler' and (l['top'] - ultima['top'] > 30 or l['p'] != ultima['p'])
        if not ler or novo:
            ler.append(t)
        else:
            ler[-1] = juntar(ler[-1], t)
        ultima = l
        continue
    if fam == 'prompt':
        if prompt is None:
            fechar_tudo(); prompt = []
        prompt.append(txt.strip())
        ultima = l
        continue
    if fam == 'tabela':
        if not tab:
            fechar_tudo()
        elif ultima and (l['top'] - ultima['top'] > 60 or l['p'] != ultima['p']) and all(r['b'] for r in l['runs']):
            fechar_tab()
        tab.append(l)
        ultima = l
        continue
    if fam == 'item':
        fechar_tudo()
        blocos.append(f'<p class="item">{html_runs(l["runs"]).strip()}</p>')
        ultima = l
        continue
    # texto
    fechar_ler(); fechar_prompt(); fechar_tab()
    t = html_runs(l['runs'])
    primeiro = l['runs'][0]['t'].strip()
    anterior = re.sub(r'<[^>]+>', '', para['html']).strip() if para else ''
    comeca_rotulo = l['runs'][0]['b'] and (bool(re.search(r'[.:?!]$', primeiro)) or bool(re.search(r'[.!?:"”)]$', anterior)))
    if para:
        mesmo = (l['p'] == para['p'] and 0 < l['top'] - para['ultimo'] <= 26) or (l['p'] != para['p'] and l['left'] == para['left_cont'] and not comeca_rotulo)
        if mesmo and not (comeca_rotulo and l['left'] <= para['left0']):
            para['html'] = juntar(para['html'], t)
            para['ultimo'] = l['top']; para['p'] = l['p']; para['left_cont'] = l['left']
            ultima = l
            continue
        fechar_para()
    para = dict(html=t, p=l['p'], ultimo=l['top'], left0=l['left'], left_cont=l['left'])
    ultima = l
novo_cap('fim')
capitulos = [c for c in capitulos if c['titulo'] != 'fim']
for c in capitulos:
    c.pop('ids', None)
json.dump(capitulos, open(SAIDA, 'w', encoding='utf-8'), ensure_ascii=False)
for c in capitulos:
    print(c['id'], len(c['html']))
