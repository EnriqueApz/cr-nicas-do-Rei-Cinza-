# Monta os dados do site: capítulos da bíblia + o que é da mesa (heranças, personagens, extensão).
import json, re, os, sys, html
import markdown

RAIZ = '/home/user/cr-nicas-do-Rei-Cinza-'
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1]
os.makedirs(os.path.join(SAIDA, 'dados'), exist_ok=True)

caps = json.load(open(os.path.join(AQUI, 'capitulos.json'), encoding='utf-8'))


def md(arquivo):
    texto = open(arquivo, encoding='utf-8').read()
    h = markdown.markdown(texto, extensions=['tables', 'sane_lists'])
    h = h.replace('<table>', '<div class="tabela"><table>').replace('</table>', '</table></div>')
    # ids nos títulos, para o sumário lateral
    vistos = {}
    def comid(m):
        nivel, conteudo = m.group(1), m.group(2)
        base = re.sub(r'[^a-z0-9]+', '-', re.sub(r'<[^>]+>', '', conteudo).lower().encode('ascii', 'ignore').decode()).strip('-')[:50] or 'secao'
        vistos[base] = vistos.get(base, 0) + 1
        hid = base if vistos[base] == 1 else f'{base}-{vistos[base]}'
        return f'<h{nivel} id="{hid}">{conteudo}</h{nivel}>'
    h = re.sub(r'<h([1-4])>(.*?)</h\1>', comid, h)
    return h


def li(itens):
    return '<ul>' + ''.join(f'<li>{i}</li>' for i in itens) + '</ul>'


# O que entra por cima da bíblia, missão a missão.
MESA = {
    1: [
        ('Sessão 3: o que muda nesta missão', li([
            '<strong>O drow do Maurício entra.</strong> Anoitecendo, o grupo chega com Mira desacordada e encontra um vulto de olhos claros na sombra, vigiando a casa de Ysolde, como faz toda noite. Ele seguiu o rastro do cultista que fugiu e leva o grupo até Tobias. Ysolde não sabe quem matou o marido.',
            '<strong>Tobias está preparado</strong> porque o cultista chegou antes e avisou. Com 5 jogadores: 125 PV, mais 5 do Auxílio. Você trocou 2 dos 4 cultistas por 2 lobos. Use a extensão na luta.',
            '<strong>Gloom Stalker:</strong> os lobos enxergam no escuro, então, na escuridão, o drow é invisível para eles. Contra Tobias e os cultistas, que são humanos, a Visão Umbral não muda nada.',
        ])),
        ('Sinais (descreva e não explique)', li([
            '<strong>Clérigo (A Chama):</strong> diante da raiz-mãe há um pequeno altar com velas, um anel e um livro aberto, de capa queimada. Na página, um sol e uma oração que o clérigo sabe de cor, só que as últimas linhas foram riscadas por Tobias. Se a luta for na vila, o livro está debaixo do altar da capela, e Bertrand o entrega junto com a carta de Irmã Coline.',
            '<strong>Mago (A Pena):</strong> no grimório há uma página numa cifra que ele nunca conseguiu ler. Às vezes um sol pequeno aparece gravado nos objetos que ele conjura.',
            '<strong>Autognomo (A Forja):</strong> entre as runas dele há uma que ele nunca aprendeu, um sol. Ela fica morna quando ele olha para o norte.',
            '<strong>Véspero (O Outro Lado):</strong> ele não dorme nem sonha. No descanso parado de 4 horas, ouve uma voz de mulher velha: "Ainda não. Mais ao norte." No rito do Magical Cunning, a voz canta duas notas de uma canção de ninar. Na Form of Dread, as cores em volta dele desbotam.',
        ])),
        ('Depois da luta', li([
            'Na manhã seguinte, uma das seis marcas do mapa do drow amanhece escura, como se tivesse sido riscada.',
            'Se acharem o diário de Tobias, deixe o drow ler primeiro a página sobre o pai de Mira. Decida antes qual é a verdade: o pai era inocente (a marca do culto em quem se recusou a entregar Mira) ou tinha feito um acordo com o culto e voltado atrás.',
            '<em>Opcional:</em> o motivo de cada personagem estar em Skypia foi arranjado por Ossian. Não diga nada; na Missão 7 eles vão lembrar.',
        ])),
    ],
    2: [('Heranças nesta missão', li([
        '<strong>Pista do clérigo:</strong> o livro é a "Oração do Silêncio" da Ordem. Comparado com o registro de Irmã Coline, mostra a palavra trocada: "calar" virou "guardar".',
        '<strong>Véspero:</strong> os sinais continuam (a voz no descanso, as duas notas, as cores desbotando).',
    ]))],
    3: [('Heranças nesta missão', li([
        '<strong>Pista do autognomo:</strong> em Grisval, os canteiros reconhecem a runa: "Isso é marca de forja antiga, do norte. Ninguém mais faz assim."',
        '<strong>Véspero:</strong> os sinais continuam.',
    ]))],
    4: [('Heranças nesta missão', li([
        '<strong>Pista e revelação do mago:</strong> no Arquivo Real, o Escriba Cinzento ataca o mago antes dos outros, porque a página dele resiste ao apagamento. No Cofre das Tintas, o códice tem um buraco do tamanho exato da página, e Ossian se oferece para ajudar a decifrar.',
        '<strong>Ossian reconhece os herdeiros</strong> quando vê o amuleto: chama o grupo de "os Protetores". "Pensei que tinha morrido. E aqui estão vocês."',
        '<strong>Entre a 4 e a 7:</strong> Ossian manda cartas, livros e presentes escolhidos com carinho para cada herdeiro.',
        '<strong>Véspero:</strong> última missão com os sinais.',
    ]))],
    5: [
        ('Heranças nesta missão (a missão do juramento)', li([
            '<strong>Clérigo, revelação e escolha:</strong> Edda ouve o clérigo rezar: "Você reza como um capelão do Alvorecer. Quem te ensinou isso?" Se aceitar, faz o juramento no Salão. Verso: <em>"Eu calo o que não deve falar."</em>',
            '<strong>Mago, escolha (aqui ou na 6):</strong> continuar decifrando o códice sabendo do que se trata. Verso: <em>"Eu lembro para que ninguém repita."</em>',
            '<strong>Autognomo, pista:</strong> a porta de bronze da cripta tem um encaixe no formato da runa. Encaixa, mas não abre. Do outro lado, uma batida, como um coração.',
            '<strong>Véspero, pista:</strong> o painel escondido do mural mostra um menino num quarto cheio de soldadinhos e uma velha cantando ao lado da cama. Ele ouve as duas notas, agora mais altas.',
            '<strong>Drow, pista:</strong> o mapa da trilha que Ossian dá é uma cópia do mapa do batedor (mesmo rasgo, mesma mancha). Na subida, sucesso automático no desafio de perícias; no pátio, o apito faz os Cavaleiros Caídos hesitarem uma rodada.',
        ])),
        ('O que muda no texto da bíblia', li([
            'Sor Edda deixa de ser "a última descendente da Ordem" e passa a ser "<strong>a última que manteve o juramento</strong>".',
            'No Salão do Juramento: os versos raspados na parede.',
        ])),
    ],
    6: [('Heranças nesta missão', li([
        '<strong>Drow, revelação (cena de destaque dele):</strong> o apito toca pela primeira vez. Só ele ouve, e o fantasma do batedor aparece: "Você terminou a minha ronda até aqui. Quer ir até o fim?"',
        '<strong>A Chama:</strong> o livro tem uma "Oração dos Doentes", escrita durante a Peste Cinza. Dá vantagem a Madre Ivra e ao grupo nos testes do antídoto.',
        '<strong>Mago:</strong> se não escolheu na 5, escolhe aqui.',
    ]))],
    7: [
        ('Heranças nesta missão', li([
            '<strong>A confissão de Ossian ganha esta fala:</strong> "Os pedaços fogem de mim. Mas correm para vocês. Ele odeia quem o partiu. Eu só precisava de isca com o sangue certo. E vocês ainda me agradeceram pelo chá."',
            '<strong>Véspero, revelação:</strong> Ossian diz a palavra de comando "Vaelmorikar", e o Véspero entende. "Vaelorik" é da mesma língua antiga.',
            '<strong>Drow:</strong> Ossian não conta com ele. Os fragmentos não correm para o drow; pode ser a primeira pista de que o grupo era isca. Ele sente o golpe em dobro: o mapa estava certo, a leitura é que estava errada.',
            '<em>Opcional:</em> a vitrine vazia da Festa da Luz diz "Ao tesouro dos Protetores"; Ossian pode propor o título de "Cavaleiros do Alvorecer de Almenara" minutos antes da palavra de comando.',
        ])),
        ('Em aberto', '<p>Revelar o Relicário aqui, como a bíblia diz, ou só no final. Por enquanto, fica como está na bíblia.</p>'),
    ],
    8: [('Heranças nesta missão', li([
        '<strong>Autognomo, revelação:</strong> no laboratório da Lanterna, Ossian usa a mesma técnica, roubada. Quem construiu o autognomo aprendeu com uma família de ferreiros do Alvorecer.',
    ]))],
    9: [('Heranças nesta missão', li([
        '<strong>Drow, escolha:</strong> no cerco, tocar o apito é assumir a ronda. Se a Missão 5 terminou bem, 1d4 Cavaleiros Caídos aparecem e lutam uma rodada ao lado do grupo. Aceitar dá o Dom e o verso; Edda toma o juramento de quem quer recomeçar.',
    ]))],
    10: [('Heranças nesta missão', li([
        '<strong>Autognomo, escolha:</strong> Ilsabet: "Você foi feito com o fogo desta forja. Mas ninguém te obriga a nada. Fica, se quiser." Verso: <em>"Eu dou de mim para que a lâmina viva."</em>',
        '<strong>Ilsabet ensina o sexto verso:</strong> <em>"E quando acabar, eu deixo ir."</em> Antes da Cena 5 ela pode dizer: "Vocês têm quase tudo. Falta o verso que eu nunca consegui dizer."',
    ]))],
    11: [('Heranças nesta missão', li([
        '<strong>Véspero, escolha:</strong> na Terra Cinzenta, a ama aparece e pede: "Proteja o menino." Se ele cantarolar a canção de ninar, Mael para de fugir: "Só a minha ama sabia essa música." Proteger Mael abre caminho para o Final A.',
        '<strong>Drow:</strong> o "?" do mapa ganha tinta e aponta para o quarto do príncipe.',
    ]))],
    12: [('Heranças nesta missão', '<p>Nenhuma etapa de herança cai aqui. Confira quem já aceitou: isso decide quantos versos o grupo terá na Missão 13.</p>')],
    13: [('Heranças nesta missão', li([
        '<strong>O juramento inteiro</strong> só funciona com os versos de quem aceitou a herança. O efeito está no material das heranças, seção "O Juramento Partido".',
        '<strong>Véspero:</strong> se protegeu Mael, a ama ensina a ele a canção de ninar no Trono Cinzento. O rei perde o primeiro turno. Não soma com o soldadinho de Vorn.',
    ]))],
}

PERSONAGENS = '''
<p>A mesa atual: cinco personagens e a herança de cada um. As etapas estão na página de cada missão, na caixa "Na sua mesa".</p>
<div class="tabela"><table>
<thead><tr><th>Personagem</th><th>Classe</th><th>Herança</th><th>Sinal</th><th>Pista</th><th>Revelação</th><th>Escolha</th></tr></thead>
<tbody>
<tr><td>Clérigo</td><td>Clérigo da Guerra</td><td>A Chama (capelães)</td><td>1</td><td>2</td><td>5</td><td>5</td></tr>
<tr><td>Mago</td><td>Gnomo, mago conjurador</td><td>A Pena (cronistas)</td><td>1</td><td>4</td><td>4</td><td>5 ou 6</td></tr>
<tr><td>Autognomo</td><td>Guerreiro rúnico</td><td>A Forja (ferreiros)</td><td>1</td><td>3 e 5</td><td>8</td><td>10</td></tr>
<tr><td>Véspero Vaelorik</td><td>Bruxo 3, Reborn, Undead Patron (familiar: diabinho)</td><td>O Outro Lado (a ama de Mael)</td><td>1 a 4</td><td>5</td><td>7</td><td>11</td></tr>
<tr><td>O drow (Maurício)</td><td>Patrulheiro Gloom Stalker, arqueiro</td><td>A Vigia, por escolha</td><td>1</td><td>5</td><td>6</td><td>9</td></tr>
</tbody></table></div>
<h2 id="lembretes">Lembretes de cada um</h2>
<ul>
<li><strong>Véspero</strong> não dorme nem sonha: os sinais chegam no descanso parado de 4 horas, no rito do Magical Cunning e na Form of Dread. O diabinho continua igual.</li>
<li><strong>O drow</strong> não tem sangue da Ordem. Achou o mapa de seis marcas e o apito de osso no corpo de um batedor antigo, nas cavernas. Matou o pai de Mira depois de ver "maldade" nele e ficou na região para proteger a família. Mira não é filha dele.</li>
<li><strong>A escolha é de verdade:</strong> quem recusa continua normal, e a herança pode passar a um NPC (Nilo pode virar o herdeiro da Pena).</li>
<li><strong>Os jogadores não sabem da Peste Cinza</strong> nem da Ordem no começo. Descreva os sinais e não explique.</li>
</ul>
'''

INICIO = '''
<p class="abre">A bíblia em PDF continua sendo o roteiro. Este site junta a bíblia, dividida por missão, com o que é só da sua mesa.</p>
<h2 id="como-usar">Como usar numa sessão</h2>
<ol>
<li>Abra a missão do dia no menu.</li>
<li>Leia primeiro a caixa dourada <strong>"Na sua mesa"</strong>, no topo: é o que entra por cima do PDF naquela missão (os destaques de cada personagem, as falas novas, o que muda no texto).</li>
<li>Siga a missão como está na bíblia. O sumário ao lado leva direto a cada cena.</li>
<li>Nas lutas, use a extensão no Roll20.</li>
</ol>
<h2 id="proxima-sessao">Próxima sessão: Missão 1, a luta contra Tobias</h2>
<p>O drow entra no começo, Tobias está preparado e os quatro personagens antigos recebem o sinal da herança. Está tudo na caixa "Na sua mesa" da Missão 1.</p>
<h2 id="o-que-tem-aqui">O que tem aqui</h2>
<ul>
<li><strong>Bíblia:</strong> a abertura e as 13 missões, com o texto do PDF.</li>
<li><strong>Personagens:</strong> a mesa atual e a herança de cada um.</li>
<li><strong>Heranças do Alvorecer:</strong> o material completo do mestre.</li>
<li><strong>Cartões dos jogadores:</strong> para entregar a cada um depois que aceitar a herança.</li>
<li><strong>Extensão:</strong> como instalar e usar o assistente de combate.</li>
<li><strong>Resumo das mudanças:</strong> o que mudou da história original, com botão para ouvir.</li>
</ul>
<p class="nota">Material do mestre. Não compartilhe o link com os jogadores.</p>
'''

roteiro = open(os.path.join(AQUI, 'roteiro.txt'), encoding='utf-8').read().strip().split('\n')
RESUMO = '<div class="ouvir"><button type="button" id="ouvir-resumo">▶ Ouvir o resumo</button><button type="button" id="parar-resumo" class="secundario">■ Parar</button><span id="voz-info" class="nota"></span></div>' + ''.join(
    f'<p class="falado">{html.escape(l.strip())}</p>' for l in roteiro if l.strip())


def mesa_html(n):
    if n not in MESA:
        return ''
    h = '<aside class="mesa"><div class="mesa-selo">Na sua mesa · não está no PDF</div>'
    for titulo, corpo in MESA[n]:
        h += f'<h3>{titulo}</h3>{corpo}'
    return h + '</aside>'


paginas = []
paginas.append(dict(id='inicio', grupo='Mesa', titulo='Início', curto='Início', html=INICIO))
paginas.append(dict(id='personagens', grupo='Mesa', titulo='Personagens', curto='Personagens', html=PERSONAGENS))
paginas.append(dict(id='resumo', grupo='Mesa', titulo='Resumo das mudanças', curto='Resumo das mudanças', html=RESUMO))
for c in caps:
    m = re.match(r'Missão (\d+) — (.*)', c['titulo'])
    if m:
        n = int(m.group(1))
        ato = 'Ato I · Sussurros' if n <= 4 else ('Ato II · A Coroa Partida' if n <= 8 else 'Ato III · O Retorno do Rei')
        paginas.append(dict(id=f'missao-{n}', grupo=ato, titulo=c['titulo'], curto=f'{n}. {m.group(2)}', html=mesa_html(n) + c['html'], num=n))
    else:
        paginas.append(dict(id='abertura', grupo='Bíblia', titulo='Abertura da bíblia', curto='Abertura', html=c['html']))
paginas.append(dict(id='herancas', grupo='Heranças', titulo='Heranças do Alvorecer', curto='Material do mestre', html=md(f'{RAIZ}/mestre/herancas-do-alvorecer.md').replace('<h1', '<h2').replace('</h1>', '</h2>')))
paginas.append(dict(id='cartoes', grupo='Heranças', titulo='Cartões dos jogadores', curto='Cartões dos jogadores', html=md(f'{RAIZ}/jogadores/herancas-do-alvorecer.md').replace('<h1', '<h2').replace('</h1>', '</h2>')))
paginas.append(dict(id='extensao', grupo='Ferramentas', titulo='Assistente de combate', curto='Extensão do Roll20', html=md(f'{RAIZ}/extensao/LEIA-ME.md').replace('<h1', '<h2').replace('</h1>', '</h2>')))

# ordem do menu: Mesa, Bíblia (abertura), atos, Heranças, Ferramentas
ordem_grupos = ['Mesa', 'Bíblia', 'Ato I · Sussurros', 'Ato II · A Coroa Partida', 'Ato III · O Retorno do Rei', 'Heranças', 'Ferramentas']
paginas.sort(key=lambda p: (ordem_grupos.index(p['grupo']), p.get('num', 0)))
json.dump(paginas, open(os.path.join(SAIDA, 'dados', 'cronicas.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(len(paginas), 'páginas', os.path.getsize(os.path.join(SAIDA, 'dados', 'cronicas.json')) // 1024, 'KB')
