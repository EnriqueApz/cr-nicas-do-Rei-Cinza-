# Site do mestre (artifact no claude.ai)

Monta o site "Crônicas do Rei Cinza": a bíblia dividida por missão + heranças, personagens e extensão.
O texto da bíblia não fica no repositório; ele é extraído do PDF na hora.

1. pdftohtml -xml -i -q Biblia.pdf biblia  (gera biblia.xml)
2. python3 converter.py biblia.xml capitulos.json
3. python3 montar_site.py saida/  (gera saida/dados/cronicas.json; precisa de: pip install markdown)
4. Publicar index.html com dados/cronicas.json como arquivo junto.

A caixa "Na sua mesa" de cada missão fica no dicionário MESA, em montar_site.py.
