// Painel do mestre dentro do editor do Roll20.
(function () {
  const A = globalThis.AssistenteRC;
  const E = A.estado;
  const T = A.taticas;
  const C = A.chat;
  const S = A.armazenamento;
  const R = A.turnos;
  // Lutas que o painel conhece (Missão 1 e Missão 2). D é a luta escolhida agora.
  const LUTAS = ['m01c06', 'm02c04', 'm02c05', 'm02c06'].filter((id) => A.dados[id]);
  let D = A.dados.m01c06;
  const COND = A.condicoes;
  const FI = A.fichas;

  let estado = null;
  let vinculos = {};
  let raizEl = null;
  let bolhaEl = null;
  const ui = { erroChat: null, ultimoComando: '', mensagem: '', vez: null, doMapa: null };
  let historico = [];
  let memoriaTurno = null;
  let prefs = { seguirRoll20: true, atualizarTokens: true, barraPv: 'auto', usarFichas: true };
  const avisados = new Set();

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ficha = (c) => D.fichas[c.fichaId];
  const CHEGADAS = { normal: 'Normal', surpresa: 'Pego de surpresa', preparado: 'Preparado' };
  const CIRCULOS = { 0: 'truque', 1: '1º', 2: '2º', 3: '3º' };

  function usarLuta(id) {
    if (A.dados[id]) D = A.dados[id];
  }

  // Ficha de um combatente (Missão 1 ou 2). Monstros do mapa não têm ficha da bíblia.
  const chefe = () => { const id = E.chefeDe(estado); return id ? estado.combatentes[id] : null; };
  const nomeMagia = (c, magiaId) => { const f = c && ficha(c); return (f && f.magias && f.magias[magiaId]) ? f.magias[magiaId].nome : magiaId; };

  function novoCombate(opcoes, sussurro = true) {
    const e = E.criarCombate(D, opcoes);
    e.sussurro = sussurro;
    e.painel = { aguardandoCuraFe: false };
    return e;
  }

  // registrar: guarda o estado anterior para o botão "Desfazer".
  function mudar(novo, registrar = true) {
    const antes = estado;
    if (novo === antes) return render();
    if (registrar && antes) {
      historico.push(antes);
      if (historico.length > 40) historico.shift();
    }
    estado = novo;
    S.salvar(estado);
    render();
    levarPvAosTokens(antes, novo);
  }

  // ---------- conversa com a ponte (página do Roll20) ----------
  let pedidos = 0;
  function pedirPonte(msg, tipoResposta, feito, espera = 400) {
    const pedido = ++pedidos;
    let respondeu = false;
    const ouvir = (ev) => {
      const d = ev.data;
      if (ev.source !== window || !d || d.origem !== 'assistente-rc-ponte' || d.tipo !== tipoResposta) return;
      if (d.pedido !== undefined && d.pedido !== pedido) return;
      window.removeEventListener('message', ouvir);
      respondeu = true;
      feito(d);
    };
    window.addEventListener('message', ouvir);
    window.postMessage({ origem: 'assistente-rc', pedido, ...msg }, '*');
    setTimeout(() => {
      if (respondeu) return;
      window.removeEventListener('message', ouvir);
      feito(null);
    }, espera);
  }

  // ---------- barra de PV dos tokens ----------
  function guardarTokens(entradas, ids) {
    if (!estado || !estado.painel) return;
    const mapa = { ...(estado.painel.tokens || {}) };
    let mudou = false;
    ids.forEach((id, i) => {
      const tk = entradas[i] && entradas[i].tokenId;
      if (id && id !== 'covil' && tk && mapa[id] !== tk) { mapa[id] = tk; mudou = true; }
    });
    if (mudou) { estado.painel = { ...estado.painel, tokens: mapa }; S.salvar(estado); }
  }

  function avisarUmaVez(chave, texto) {
    if (avisados.has(chave)) return;
    avisados.add(chave);
    ui.mensagem = ui.mensagem ? `${ui.mensagem} ${texto}` : texto;
    render();
  }

  // Barra ligada à ficha só pode mudar se este é o único combatente daquela ficha.
  function barraLigadaPode(c) {
    if (c.id === E.chefeDe(estado)) return true;
    if (c.fichaId !== 'mapa' || !c.personagemId) return false;
    return !Object.values(estado.combatentes).some((o) => o.id !== c.id && o.personagemId === c.personagemId);
  }

  // ---------- PV e CA das fichas do Roll20 ----------
  function lerFichasDoRoll20(feito, diag = false) {
    pedirPonte({ tipo: 'fichas', diag }, 'fichas-resultado', (r) => feito((r && r.fichas) || null), 600);
  }

  // Liga cada combatente a um token (pelo mapa já conhecido ou pelo nome) e devolve {id: lido}.
  function casarFichas(fichas) {
    const mapa = { ...((estado.painel && estado.painel.tokens) || {}) };
    const porToken = Object.fromEntries(fichas.map((f) => [f.tokenId, f]));
    const usados = new Set(Object.values(mapa));
    const livres = fichas.filter((f) => !usados.has(f.tokenId));
    A.iniciativa.casarEntradas(estado.combatentes, livres).forEach((id, i) => {
      if (id && id !== 'covil' && !mapa[id]) mapa[id] = livres[i].tokenId;
    });
    const r = {};
    for (const [id, tk] of Object.entries(mapa)) if (estado.combatentes[id] && porToken[tk]) r[id] = porToken[tk];
    return { lidos: r, mapa };
  }

  let releitura = null;
  function aplicarFichas(depois, tentativas = 3) {
    if (!prefs.usarFichas || !estado || estado.iniciado) { if (depois) depois(0); return; }
    lerFichasDoRoll20((fichas) => {
      if (!fichas || !estado || estado.iniciado) { if (depois) depois(0); return; }
      const { lidos, mapa } = casarFichas(fichas);
      const carregando = Object.values(lidos).some((l) => l.personagem && !l.personagem.carregado);
      if (depois && carregando && tentativas > 0) { setTimeout(() => aplicarFichas(depois, tentativas - 1), 350); return; }
      let e = lerIniciativas(estado);
      let n = 0;
      for (const [id, lido] of Object.entries(lidos)) {
        const v = FI.extrair(lido);
        if (v.pv || v.ca) n += 1;
        e = E.aplicarFicha(e, id, v);
      }
      // Os atributos do Roll20 carregam na primeira leitura: lê de novo daqui a pouco.
      if (carregando && !releitura) {
        releitura = setTimeout(() => { releitura = null; aplicarFichas(); }, 1500);
      }
      e.painel = { ...(e.painel || {}), tokens: mapa };
      if (e !== estado) { estado = e; S.salvar(estado); render(); }
      if (depois) depois(n);
    });
  }

  // Tokens do mapa que podem entrar na luta: não estão no painel e a ficha não é de jogador.
  function candidatosDoMapa(fichas) {
    const { mapa } = casarFichas(fichas);
    const usados = new Set(Object.values(mapa));
    return fichas
      .filter((f) => !usados.has(f.tokenId) && f.nome && !(f.personagem && f.personagem.controlado))
      .map((f) => ({ ...FI.extrair(f), tokenId: f.tokenId, nome: f.nome, personagemId: f.personagem ? f.personagem.id : null }));
  }

  function chaveAcoesDe(c) {
    return c.personagemId ? `p:${c.personagemId}` : `n:${A.iniciativa.normalizar(c.nome).replace(/\s*\d+\s*$/, '')}`;
  }

  function levarPvAosTokens(antes, novo) {
    if (!prefs.atualizarTokens || !novo || !novo.iniciado) return;
    const ids = Object.keys(novo.combatentes).filter((id) => {
      const a = antes && antes.iniciado && antes.combatentes[id];
      const n = novo.combatentes[id];
      return !a || a.pv !== n.pv || a.pvMax !== n.pvMax;
    });
    if (ids.length) escreverBarras(ids);
  }

  function escreverBarras(ids) {
    const mapa = (estado.painel && estado.painel.tokens) || {};
    const faltam = ids.filter((id) => !mapa[id]);
    const mandar = () => {
      const m = (estado.painel && estado.painel.tokens) || {};
      for (const id of ids) {
        const c = estado.combatentes[id];
        if (!c) continue;
        if (!m[id]) { avisarUmaVez(`sem-token:${id}`, `Não achei no mapa o token de ${c.nome}: a barra de PV dele não muda sozinha.`); continue; }
        pedirPonte({ tipo: 'pv', tokenId: m[id], pv: c.pv, pvMax: c.pvMax, barra: prefs.barraPv, permitirLigada: barraLigadaPode(c) }, 'pv-resultado', (r) => {
          if (!r || r.ok) return;
          const tipo = c.fichaId === 'mapa' ? c.nome : D.fichas[c.fichaId].nome;
          const textos = {
            'sem-barra': `Os tokens de ${tipo} não têm barra com valor máximo. Em "⚙ Roll20", escolha a barra de PV.`,
            ligada: `A barra de PV dos tokens de ${tipo} está ligada à ficha (todos mudariam juntos), então o painel não mexe nela. Para o painel atualizar, desligue a ligação da barra nos tokens.`,
            'sem-token': `O token de ${c.nome} não está nesta página do Roll20.`,
          };
          const chave = r.motivo === 'sem-token' ? `pv:${id}:sem-token` : `pv:${c.fichaId}:${r.motivo}`;
          avisarUmaVez(chave, textos[r.motivo] || `Não consegui mudar a barra de PV de ${c.nome} (${r.motivo}).`);
        });
      }
    };
    if (!faltam.length) return mandar();
    pedirPonte({ tipo: 'tokens' }, 'tokens-resultado', (r) => {
      const tokens = (r && r.tokens) || [];
      const usados = new Set(Object.values(mapa));
      const livres = tokens.filter((t) => !usados.has(t.tokenId));
      const achados = A.iniciativa.casarEntradas(estado.combatentes, livres);
      const novo = { ...mapa };
      achados.forEach((id, i) => { if (id && id !== 'covil' && !novo[id]) novo[id] = livres[i].tokenId; });
      estado.painel = { ...estado.painel, tokens: novo };
      S.salvar(estado);
      mandar();
    });
    return undefined;
  }

  // ---------- envio ----------
  function enviarMsg(msg) {
    const r = C.enviar(msg, document, (via) => {
      ui.erroChat = via === 'copiado' ? 'naoRecebeuCopiado' : 'naoRecebeu';
      render();
    });
    ui.erroChat = r.ok ? null : r.via;
    ui.ultimoComando = msg;
  }

  // ---------- pedaços do HTML ----------
  // Ligação de um botão à ação da ficha do Roll20: "tobias:acao:maca", "tobias:magia:chamaSagrada".
  const LIGAVEIS = ['ataque', 'magia', 'armaAtaque'];
  const DANOS = ['dano', 'danoCritico', 'danoMagia', 'danoMagiaCritico'];
  function chaveVinculo(fichaId, b) {
    return b.acaoId ? `${fichaId}:acao:${b.acaoId}` : `${fichaId}:magia:${b.magiaId}`;
  }

  function htmlBotao(b, id) {
    const c = estado.combatentes[id];
    const chave = c ? chaveVinculo(c.fichaId, b) : '';
    const ligado = !!vinculos[chave];
    if (ligado && DANOS.includes(b.kind)) return '';
    const attrs = [`data-rolar`, `data-kind="${b.kind}"`, `data-id="${esc(id)}"`];
    if (b.acaoId) attrs.push(`data-acao="${b.acaoId}"`);
    if (b.magiaId) attrs.push(`data-magia="${b.magiaId}"`);
    if (!LIGAVEIS.includes(b.kind) || !c) return `<button ${attrs.join(' ')}>${esc(b.rotulo)}</button>`;
    return `<button ${attrs.join(' ')}${ligado ? ' class="arc-ligado"' : ''}>${esc(b.rotulo)}${ligado ? ' ✓ ficha' : ''}</button>`
      + `<button data-a="vincular" data-chave="${chave}" class="arc-elo" title="${ligado ? 'Ligado à ficha do Roll20. Clique para trocar ou desligar.' : 'Ligar à ação da ficha do Roll20'}">🔗</button>`;
  }

  function htmlPv(c) {
    return `${c.pv}/${c.pvMax}${c.pvTemp ? ` (+${c.pvTemp} temp.)` : ''}`;
  }

  function htmlTopo() {
    return `<div class="arc-topo" data-arrastar>
      <b>${esc(D.titulo)}</b>
      <span class="arc-topo-botoes">
        <button data-a="desfazer" title="Volta o último passo (dano, turno, magia...)"${historico.length ? '' : ' disabled'}>↶ Desfazer</button>
        <button data-a="sussurro" title="Quem vê as rolagens">${estado.sussurro ? 'Só para mim' : 'Para todos'}</button>
        <button data-a="minimizar" title="Minimizar">_</button>
      </span>
    </div>`;
  }

  function htmlAvisosGerais() {
    let h = '';
    if (ui.erroChat) {
      const textos = {
        copiado: 'Não achei o chat do Roll20. O comando foi copiado: cole no chat (Ctrl+V).',
        falhou: 'Não achei o chat do Roll20 e não consegui copiar. Copie o comando abaixo e cole no chat.',
        naoRecebeuCopiado: 'O Roll20 não recebeu a rolagem. O comando ficou no campo do chat: clique lá e aperte Enter (ele também foi copiado).',
        naoRecebeu: 'O Roll20 não recebeu a rolagem. O comando ficou no campo do chat: clique lá e aperte Enter.',
      };
      h += `<div class="arc-erro-chat">${textos[ui.erroChat]}
        <textarea readonly>${esc(ui.ultimoComando)}</textarea> <button data-a="fechar-erro">ok</button>
        <button data-a="diagnostico" title="Copia um resumo do chat do Roll20 para mandar ao Claude">Copiar diagnóstico</button></div>`;
    }
    if (ui.mensagem) h += `<div class="arc-info">${esc(ui.mensagem)} <button data-a="fechar-info">ok</button></div>`;
    return h;
  }

  function htmlPreparacao() {
    const opc = (v, txt, atual) => `<option value="${v}"${String(atual) === String(v) ? ' selected' : ''}>${txt}</option>`;
    const linhas = Object.values(estado.combatentes).map((c) => `
      <div class="arc-linha"><span class="arc-nome">${esc(c.nome)}</span>
        <span title="De onde vieram os números">PV ${c.pvMax} · CA ${c.ca} <small class="arc-origem">${esc(origem(c))}</small></span>
        <input type="number" data-ini="${c.id}" placeholder="inic." value="${c.iniciativa ?? ''}">
        ${c.id === E.chefeDe(estado) ? '<span class="arc-vazio"></span>' : `<button data-a="remover" data-id="${c.id}" title="Tirar da luta">✖</button>`}</div>`).join('');
    const adicionar = (D.adicionaveis || [])
      .map((f) => `<button data-a="adicionar" data-ficha="${f}">+ ${esc(D.fichas[f].nome)}</button>`).join('');
    const lutas = LUTAS.map((id) => opc(id, esc(A.dados[id].curto || A.dados[id].titulo), D.id)).join('');
    const extrasM1 = D.temChegada ? `
      <label>Chegada <select data-a="chegada">${Object.entries(CHEGADAS).map(([v, t]) => opc(v, t, estado.chegada)).join('')}</select></label>
      <label class="arc-check"><input type="checkbox" data-a="ritual"${estado.ritualCompleto ? ' checked' : ''}> Ritual completo (+15 PV temporários)</label>` : '';
    return `<div class="arc-prep">
      <label>Luta <select data-a="luta">${lutas}</select></label>
      <label>Jogadores <select data-a="jogadores">${opc(4, '4', estado.jogadores)}${opc(5, '5', estado.jogadores)}</select></label>${extrasM1}
      <p>Iniciativa: role no Roll20 e ela vem sozinha da ordem de turnos, ou digite aqui.
        <button data-a="puxar-iniciativa">Puxar iniciativa do Roll20</button>
        <button data-a="diagnostico" title="Copia um resumo do chat e da ordem de turnos para mandar ao Claude">Copiar diagnóstico</button></p>
      ${linhas}
      <div class="arc-adicionar">Adicionar: ${adicionar} <button data-a="do-mapa" title="Um monstro que está no mapa do Roll20, com PV e CA da ficha dele">+ Do mapa</button></div>
      ${htmlDoMapa()}
      <div class="arc-motivo">PV e CA: ${prefs.usarFichas ? 'vêm das fichas do Roll20 (ou da barra do token); "bíblia" quando não deu para ler.' : 'da bíblia (leitura das fichas desligada em ⚙ Roll20).'}
        <button data-a="ler-fichas">Ler fichas do Roll20</button></div>
      <div class="arc-motivo">Mude Luta, Jogadores${D.temChegada ? ' e Chegada' : ''} antes de tirar ou pôr inimigos: trocar essas opções remonta a lista.</div>
      <button class="arc-principal" data-a="comecar">Começar luta</button>
    </div>`;
  }

  function origem(c) {
    const nomes = { ficha: 'ficha', token: 'token', biblia: 'bíblia', 'padrão': '?' };
    const pv = nomes[c.origemPv || 'biblia'];
    const ca = nomes[c.origemCa || 'biblia'];
    return pv === ca ? `(${pv})` : `(PV: ${pv}, CA: ${ca})`;
  }

  function htmlDoMapa() {
    if (!ui.doMapa) return '';
    const itens = ui.doMapa.map((m, i) => `<button data-a="pegar-do-mapa" data-i="${i}">+ ${esc(m.nome)} (PV ${m.pv ?? '?'}, CA ${m.ca ?? '?'})</button>`).join('');
    return `<div class="arc-do-mapa"><b>No mapa do Roll20:</b> ${itens || 'nenhum monstro fora do painel nesta página.'}
      <button data-a="fechar-do-mapa">fechar</button></div>`;
  }

  // Cartão de um monstro que não está na bíblia: as ações são as que o mestre ligou à ficha.
  function htmlCartaoMapa(c) {
    const acoes = vinculos[`acoes:${c.chaveAcoes}`] || [];
    let h = `<div class="arc-cartao"><h3>Turno: ${esc(c.nome)} <small>${htmlPv(c)} PV · CA ${c.ca}</small></h3>`;
    h += (c.condicoes || []).map((x) => `<div class="arc-aviso arc-cond-aviso"><b>${esc(COND[x].nome)}:</b> ${esc(COND[x].texto)}</div>`).join('');
    h += '<div class="arc-subtitulo">Ações da ficha</div>';
    h += acoes.length
      ? `<div class="arc-botoes">${acoes.map((a, i) => `<button data-rolar data-kind="mapa" data-id="${c.id}" data-i="${i}" class="arc-ligado">${esc(a.nome)}</button><button data-a="editar-acao-mapa" data-id="${c.id}" data-i="${i}" class="arc-elo" title="Trocar ou apagar">✎</button>`).join('')}</div>`
      : '<div class="arc-motivo">Nenhuma ação ligada ainda. Ligue uma vez e vale para todos os tokens desta ficha.</div>';
    h += `<button data-a="ligar-acao-mapa" data-id="${c.id}">🔗 Ligar ação da ficha</button>`;
    return h + '</div>';
  }

  function htmlFeFraturada() {
    const t = estado.combatentes.tobias;
    if (!t) return '';
    if (t.pendenteFeFraturada) {
      return `<div class="arc-fe"><b>Usar a Fé Fraturada agora?</b>
        <div>Reação: recupera 3d8+4 PV e entra na Fase 2.${t.reacao ? '' : ' Atenção: Tobias está sem reação (abalado).'}</div>
        <button data-a="fe-sim">Sim</button> <button data-a="fe-nao">Não</button></div>`;
    }
    if (estado.painel && estado.painel.aguardandoCuraFe) {
      return `<div class="arc-fe"><b>Fé Fraturada</b><div>Quantos PV a rolagem deu?</div>
        <input type="number" data-a="fe-pv" placeholder="PV"> <button data-a="fe-aplicar">Aplicar PV recuperados</button></div>`;
    }
    return '';
  }

  function htmlFicha(c) {
    const f = ficha(c);
    let h = `<details class="arc-ficha"><summary>Ficha completa</summary><div class="arc-resumo">${esc(f.resumo)}</div>`;
    for (const [id, a] of Object.entries(f.acoes || {})) {
      const temDano = a.dano && a.dano.length;
      const dano = temDano ? a.dano.map((p) => `${p.dados} ${p.tipo}`).join(' + ') + '.' : '';
      const botoes = [htmlBotao({ rotulo: 'Ataque', kind: 'ataque', acaoId: id }, c.id)];
      if (temDano) botoes.push(htmlBotao({ rotulo: 'Dano', kind: 'dano', acaoId: id }, c.id), htmlBotao({ rotulo: 'Dano crítico', kind: 'danoCritico', acaoId: id }, c.id));
      h += `<div class="arc-item"><b>${esc(a.nome)}</b> +${a.bonus}, ${esc(a.alcance)}. ${esc(dano)}${a.extra ? ' ' + esc(a.extra) : ''}
        <div class="arc-botoes">${botoes.join('')}</div></div>`;
    }
    if (f.magias) {
      if (c.espacos) h += `<div class="arc-espacos">Espaços: 1º ${c.espacos[1]} · 2º ${c.espacos[2]} · 3º ${c.espacos[3]}</div>`;
      for (const [id, m] of Object.entries(f.magias)) {
        const tags = [m.circulo !== undefined ? CIRCULOS[m.circulo] : m.etiqueta, m.tempo === 'bonus' ? 'ação bônus' : 'ação', m.concentracao ? 'concentração' : ''].filter(Boolean).join(' · ');
        const botoes = [htmlBotao({ rotulo: m.circulo !== undefined ? 'Lançar' : 'Usar', kind: 'magia', magiaId: id }, c.id)];
        if (m.dano) botoes.push(htmlBotao({ rotulo: 'Dano', kind: 'danoMagia', magiaId: id }, c.id));
        h += `<div class="arc-item"><b>${esc(m.nome)}</b> <i>${esc(tags)}</i>${m.cd ? ` · CD ${esc(m.cd)}` : ''}
          <div>${esc(m.efeito)}</div><div class="arc-botoes">${botoes.join('')}</div></div>`;
      }
    }
    return h + '</details>';
  }

  function htmlTobiasExtras(c) {
    let h = '';
    if (c.concentracao === 'armaEspiritual') {
      h += `<div class="arc-jogada"><b>Arma Espiritual ativa (ação bônus)</b><div class="arc-motivo">Mova 6 m e ataque de novo, sem gastar espaço.</div>
        <div class="arc-botoes">${htmlBotao({ rotulo: 'Ataque da arma', kind: 'armaAtaque', magiaId: 'armaEspiritual' }, c.id)}${htmlBotao({ rotulo: 'Dano', kind: 'danoMagia', magiaId: 'armaEspiritual' }, c.id)}${htmlBotao({ rotulo: 'Dano crítico', kind: 'danoMagiaCritico', magiaId: 'armaEspiritual' }, c.id)}</div></div>`;
    }
    if (c.concentracao) {
      h += `<div class="arc-linha-fina">Concentração: <b>${esc(nomeMagia(c, c.concentracao))}</b> <button data-a="sem-conc">Encerrar</button></div>`;
    }
    h += `<div class="arc-abalo">Tobias foi abalado (Persuasão ou Intuição CD 16):
      <input type="text" data-a="nome-abalo" placeholder="quem conseguiu"> <button data-a="abalar">Abalado</button>
      ${estado.abaladoPor.length ? `<div class="arc-motivo">Já tentaram: ${esc(estado.abaladoPor.join(', '))}</div>` : ''}</div>`;
    return h;
  }

  function htmlCartao(id) {
    const c = estado.combatentes[id];
    const s = T.sugerir(estado, id);
    let h = `<div class="arc-cartao"><h3>Turno: ${esc(c.nome)} <small>${htmlPv(c)} PV · CA ${c.ca}</small></h3>`;
    if (c.espacos) h += `<div class="arc-espacos">Espaços: 1º ${c.espacos[1]} · 2º ${c.espacos[2]} · 3º ${c.espacos[3]}</div>`;
    h += s.avisos.map((a) => `<div class="arc-aviso">${esc(a)}</div>`).join('');
    h += (c.condicoes || []).map((x) => `<div class="arc-aviso arc-cond-aviso"><b>${esc(COND[x].nome)}:</b> ${esc(COND[x].texto)}</div>`).join('');
    if (c.fichaId === 'tobias' && c.fase === 1 && estado.rodada > 1) {
      const v = estado.perguntas.grupoFerido;
      h += `<div class="arc-pergunta">O grupo está ferido?
        <button data-a="responder" data-valor="sim" class="${v === true ? 'arc-marcado' : ''}">Sim</button>
        <button data-a="responder" data-valor="nao" class="${v === false ? 'arc-marcado' : ''}">Não</button></div>`;
    }
    if (s.fala) h += `<div class="arc-fala">${esc(s.fala)}</div>`;
    if (s.jogadas.length) h += '<div class="arc-subtitulo">Melhor jogada agora</div>';
    s.jogadas.forEach((j, i) => {
      h += `<div class="arc-jogada"><b>${i + 1}. ${esc(j.titulo)}</b><div class="arc-motivo">${esc(j.motivo)}</div>
        ${j.aviso ? `<div class="arc-aviso">${esc(j.aviso)}</div>` : ''}
        <div class="arc-botoes">${j.botoes.map((b) => htmlBotao(b, id)).join('')}</div></div>`;
    });
    if (c.fichaId === 'tobias') h += htmlTobiasExtras(c);
    if (c.fichaId === 'sussurrador') h += htmlSussurradorExtras(c);
    if (ficha(c)) h += htmlFicha(c);
    return h + '</div>';
  }

  function htmlSussurradorExtras(c) {
    const f = D.falas || {};
    return `<div class="arc-abalo">
      <button data-a="ritual-ossian" data-id="${c.id}" class="${c.ritualOssian ? 'arc-marcado' : ''}">${c.ritualOssian ? '✓ Ritual de Ossian feito' : 'Ritual de Ossian feito'}</button>
      <div class="arc-motivo">3 raízes grossas queimadas (o musgo da Cena 4 conta como uma) + o nome dele dito em voz alta sem obedecer: perde Submergir e fica vulnerável a radiante.</div>
      ${f.tobias ? `<div class="arc-motivo">Se falarem de Tobias ou Vaudreux: ${esc(f.tobias)}</div>` : ''}
      ${f.dialogo ? `<div class="arc-motivo">Se tentarem dialogar: ${esc(f.dialogo)}</div>` : ''}</div>`;
  }

  function htmlCovil() {
    const cv = T.sugerirCovil(estado);
    const covis = D.covis || {};
    const usados = E.covisUsados(estado);
    const feito = usados.length >= cv.quantidade;
    const pendentes = cv.sugestoes.filter((s) => !usados.includes(s.covilId));
    return `<div class="arc-covil"><h3>${esc(D.tituloCovil || 'Iniciativa 20 — ação de covil')}</h3>
      <div>${cv.quantidade === 2 ? 'Fase 2: Escolha 2 diferentes.' : 'Escolha 1.'}</div>
      ${feito ? '<div class="arc-feito">✓ Ação de covil desta rodada já usada. Clique em Próximo.</div>'
        : pendentes.map((s) => `<div class="arc-jogada"><b>Sugestão: ${esc(covis[s.covilId].nome)}</b><div class="arc-motivo">${esc(s.motivo)}</div></div>`).join('')}
      <div class="arc-botoes">${cv.todas.map((id) => `<button data-rolar data-kind="covil" data-covil="${id}"${usados.includes(id) ? ' class="arc-usado" title="Já usada nesta rodada"' : ''}>${usados.includes(id) ? '✓ ' : ''}${esc(covis[id].nome)}</button>`).join('')}</div>
      ${cv.motivos.raizesQuePrendem ? `<div class="arc-motivo">Raízes que Prendem: ${esc(cv.motivos.raizesQuePrendem)}</div>` : ''}</div>`;
  }

  function htmlLista() {
    const atual = estado.ordem[estado.indice];
    const linhas = estado.ordem.filter((id) => id !== 'covil').map((id) => {
      const c = estado.combatentes[id];
      const conds = c.condicoes || [];
      const chips = conds.map((x) => `<button data-a="tirar-cond" data-id="${id}" data-cond="${x}" class="arc-chip" title="Tirar a condição">${esc(COND[x].nome)} ×</button>`).join('');
      return `<div class="arc-linha${c.caido ? ' arc-caido' : ''}${id === atual ? ' arc-atual' : ''}">
        <span class="arc-nome">${esc(c.nome)}${c.concentracao ? ` <small class="arc-conc">conc.: ${esc(nomeMagia(c, c.concentracao))}</small>` : ''}</span>
        <span data-pv="${id}">${htmlPv(c)}</span><span>CA ${c.ca}</span>
        <input type="text" inputmode="numeric" data-dano="${id}" placeholder="dano">
        <button data-a="aplicar-dano" data-id="${id}" title="Dano">−</button>
        <button data-a="aplicar-cura" data-id="${id}" title="Cura">+</button>
        ${chips ? `<div class="arc-conds">${chips}</div>` : ''}</div>`;
    }).join('');
    const vivos = estado.ordem.filter((id) => id !== 'covil' && !estado.combatentes[id].caido);
    const alvo = vivos.includes(ui.condAlvo) ? ui.condAlvo : (vivos.includes(atual) ? atual : vivos[0]);
    const por = `<div class="arc-cond-por">Pôr condição em
      <select data-cond-alvo>${vivos.map((id) => `<option value="${id}"${id === alvo ? ' selected' : ''}>${esc(estado.combatentes[id].nome)}</option>`).join('')}</select>
      <select data-cond-add><option value="">escolha…</option>${Object.entries(COND).map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('')}</select></div>`;
    return `<details class="arc-lista" open><summary>Combatentes</summary>${por}${linhas}
      <button data-a="do-mapa" title="Um monstro que está no mapa do Roll20">+ Do mapa</button>${htmlDoMapa()}</details>`;
  }

  function htmlCombate() {
    const atual = estado.ordem[estado.indice];
    const t = estado.combatentes.tobias;
    const ch = chefe();
    let h = `<div class="arc-barra"><span class="arc-rodada">Rodada ${estado.rodada}</span>
      <button data-a="anterior">◀</button> <button class="arc-principal" data-a="proximo">Próximo ▶</button>
      <button data-a="recomecar">Recomeçar luta</button></div>`;
    h += htmlFeFraturada();
    if (ch && ch.caido && D.textoQueda) h += `<div class="arc-queda"><b>${esc(ch.nome)} caiu.</b> ${esc(D.textoQueda)}</div>`;
    if (!ch && D.textoFim && Object.values(estado.combatentes).every((x) => x.caido)) h += `<div class="arc-queda"><b>Luta vencida.</b> ${esc(D.textoFim)}</div>`;
    if (t && !t.caido && t.concentracao === 'imobilizarPessoa') {
      h += '<div class="arc-aviso">Imobilizar Pessoa ativo: o alvo repete a salvaguarda de Sabedoria (CD 13) no fim de cada turno dele.</div>';
    }
    if (ui.vez) {
      h += `<div class="arc-cartao arc-vez"><h3>${esc(ui.vez.titulo)}</h3><div class="arc-motivo">${esc(ui.vez.texto)}</div></div>`;
    } else if (atual === 'tobias' && t && t.pendenteFeFraturada) {
      h += '<div class="arc-cartao"><h3>Turno: Tobias</h3><div class="arc-aviso">Responda primeiro à Fé Fraturada (acima).</div></div>';
    } else {
      const c = estado.combatentes[atual];
      h += atual === 'covil' ? htmlCovil() : (c && c.fichaId === 'mapa' ? htmlCartaoMapa(c) : htmlCartao(atual));
    }
    return h + htmlLista();
  }

  function htmlConfig() {
    const opc = (v, t) => `<option value="${v}"${String(prefs.barraPv) === String(v) ? ' selected' : ''}>${t}</option>`;
    return `<details class="arc-config"><summary>⚙ Roll20</summary>
      <label class="arc-check"><input type="checkbox" data-pref="usarFichas"${prefs.usarFichas ? ' checked' : ''}> PV e CA das fichas do Roll20 (desligado: da bíblia)</label>
      <label class="arc-check"><input type="checkbox" data-pref="seguirRoll20"${prefs.seguirRoll20 ? ' checked' : ''}> Seguir a vez da ordem de turnos do Roll20</label>
      <label class="arc-check"><input type="checkbox" data-pref="atualizarTokens"${prefs.atualizarTokens ? ' checked' : ''}> Levar o PV para a barra dos tokens</label>
      <label>Barra de PV do token <select data-pref="barraPv">${opc('auto', 'Automática')}${opc(1, 'Barra 1 (verde)')}${opc(2, 'Barra 2 (azul)')}${opc(3, 'Barra 3 (vermelha)')}</select></label>
    </details>`;
  }

  function render() {
    if (!raizEl) return;
    const corpoAntes = raizEl.querySelector('.arc-corpo');
    const rolagem = corpoAntes ? corpoAntes.scrollTop : 0;
    const abertos = {};
    raizEl.querySelectorAll('details[class]').forEach((d) => { abertos[d.className] = d.open; });
    raizEl.innerHTML = htmlTopo() + `<div class="arc-corpo">${htmlAvisosGerais()}${estado.iniciado ? htmlCombate() : htmlPreparacao()}${htmlConfig()}</div>`;
    raizEl.querySelectorAll('details[class]').forEach((d) => {
      if (d.className in abertos) d.open = abertos[d.className];
    });
    const corpo = raizEl.querySelector('.arc-corpo');
    if (corpo) corpo.scrollTop = rolagem;
  }

  // ---------- ações ----------
  function rolar(el) {
    const kind = el.dataset.kind;
    let e = estado;
    const o = { sussurro: e.sussurro };
    if (kind === 'covil') {
      const usados = E.covisUsados(e);
      const cv = T.sugerirCovil(e);
      const covis = D.covis || {};
      const nomeCovil = covis[el.dataset.covil].nome;
      if (usados.includes(el.dataset.covil) && cv.quantidade === 2) {
        ui.mensagem = `Na Fase 2 as duas ações de covil têm de ser diferentes: ${nomeCovil} já foi usada nesta rodada.`;
        return render();
      }
      if (usados.length >= cv.quantidade && !globalThis.confirm(`A ação de covil desta rodada já foi usada. Rolar ${nomeCovil} mesmo assim?`)) return undefined;
      e = E.usarCovil(e, el.dataset.covil);
      const chefeAgora = E.chefeDe(e) ? e.combatentes[E.chefeDe(e)] : null;
      enviarMsg(C.montarCovil(covis[el.dataset.covil], chefeAgora ? chefeAgora.fase : 1, o));
      if (el.dataset.covil === 'broto' && D.fichas.raiz && T.sugerirCovil(e).todas.includes('broto')) {
        e = E.adicionarCombatente(e, D.fichas.raiz);
        ui.mensagem = D.id === 'm01c06'
          ? 'Uma Raiz nova brotou ao lado da raiz-mãe e entrou na lista (age logo depois do covil).'
          : 'Uma Raiz nova brotou do poço e entrou na lista (age logo depois do covil). Ponha um token de Raiz no mapa.';
      }
      return mudar(e);
    }
    const c = e.combatentes[el.dataset.id];
    if (kind === 'mapa') {
      const a = (vinculos[`acoes:${c.chaveAcoes}`] || [])[Number(el.dataset.i)];
      if (!a) return render();
      if (E.atacaComDesvantagem(c)) {
        ui.mensagem = `${c.nome} ataca com desvantagem (${motivoDesvantagem(c)}). Role de novo e fique com o menor.`;
        e = E.consumirDesvantagem(e, c.id);
      }
      enviarMsg(a.comando);
      return mudar(e);
    }
    const f = ficha(c);
    const comandoFicha = LIGAVEIS.includes(kind)
      ? vinculos[chaveVinculo(c.fichaId, { acaoId: el.dataset.acao, magiaId: el.dataset.magia })]
      : null;
    if (comandoFicha) {
      if (kind === 'magia') {
        const m = f.magias[el.dataset.magia];
        if (m.circulo > 0) {
          if (!(c.espacos[m.circulo] > 0)) {
            ui.mensagem = `Sem espaço de ${CIRCULOS[m.circulo]} círculo para ${m.nome}.`;
            return render();
          }
          e = E.gastarEspaco(e, c.id, m.circulo);
        }
        if (m.concentracao) e = E.definirConcentracao(e, c.id, el.dataset.magia);
      }
      if (E.atacaComDesvantagem(c) && kind !== 'magia') {
        ui.mensagem = `${c.nome} ataca com desvantagem (${motivoDesvantagem(c)}). Role de novo e fique com o menor.`;
        e = E.consumirDesvantagem(e, c.id);
      }
      enviarMsg(comandoFicha);
      return mudar(e);
    }
    if (kind === 'ataque' || kind === 'armaAtaque') {
      const acao = kind === 'ataque' ? f.acoes[el.dataset.acao] : { nome: 'Arma Espiritual', bonus: f.magias.armaEspiritual.ataque };
      enviarMsg(C.montarAtaque(c.nome, acao, { ...o, desvantagem: E.atacaComDesvantagem(c) }));
      e = E.consumirDesvantagem(e, c.id);
    } else if (kind === 'dano' || kind === 'danoCritico') {
      enviarMsg(C.montarDano(c.nome, f.acoes[el.dataset.acao], { ...o, critico: kind === 'danoCritico' }));
    } else if (kind === 'magia') {
      const m = f.magias[el.dataset.magia];
      if (m.circulo > 0) {
        if (!(c.espacos[m.circulo] > 0)) {
          ui.mensagem = `Sem espaço de ${CIRCULOS[m.circulo]} círculo para ${m.nome}.`;
          return render();
        }
        e = E.gastarEspaco(e, c.id, m.circulo);
      }
      if (m.concentracao) e = E.definirConcentracao(e, c.id, el.dataset.magia);
      enviarMsg(C.montarMagia(c.nome, m, { ...o, desvantagem: m.ataque !== undefined && E.atacaComDesvantagem(c) }));
      if (m.ataque !== undefined) e = E.consumirDesvantagem(e, c.id);
    } else if (kind === 'danoMagia' || kind === 'danoMagiaCritico') {
      enviarMsg(C.montarDanoMagia(c.nome, f.magias[el.dataset.magia], { ...o, critico: kind === 'danoMagiaCritico' }));
    }
    mudar(e);
  }

  function motivoDesvantagem(c) {
    const m = (c.condicoes || []).filter((x) => COND[x].desvantagemAtaque).map((x) => COND[x].nome.toLowerCase());
    if (c.desvantagemProximoAtaque) m.unshift('abalado');
    return m.join(', ');
  }

  function lerIniciativas(e) {
    raizEl.querySelectorAll('input[data-ini]').forEach((inp) => { e = E.definirIniciativa(e, inp.dataset.ini, inp.value); });
    return e;
  }

  function opcoesAtuais() {
    const chegada = raizEl.querySelector('[data-a="chegada"]');
    const ritual = raizEl.querySelector('[data-a="ritual"]');
    return {
      jogadores: Number(raizEl.querySelector('[data-a="jogadores"]').value),
      chegada: chegada ? chegada.value : estado.chegada,
      ritualCompleto: ritual ? ritual.checked : false,
    };
  }

  function aplicarDano(id) {
    const inp = raizEl.querySelector(`input[data-dano="${id}"]`);
    const r = E.aplicarDano(estado, id, inp ? inp.value : '');
    let e = r.estado;
    const avisos = [];
    for (const ev of r.eventos) {
      if (ev.tipo === 'limiarFeFraturada' && !e.combatentes[ev.id].reacao) {
        const rr = T.resolverFeFraturada(e, true);
        e = rr.estado;
        avisos.push(rr.mensagem);
      }
      if (ev.tipo === 'concentracao') {
        avisos.push(`Teste de concentração: Constituição CD ${ev.cd} (${nomeMagia(e.combatentes[ev.id], ev.magiaId)}). Se falhar, clique em "Encerrar" no cartão de Tobias.`);
      }
      if (ev.tipo === 'submergiu') {
        avisos.push(`${e.combatentes[ev.id].nome} passou da metade dos PV e afunda nas raízes: fica intangível e imune a dano até o próximo turno dele e reaparece a até 6 m.`);
      }
    }
    if (avisos.length) ui.mensagem = avisos.join(' ');
    mudar(e);
  }

  function acao(nome, el) {
    const t = estado.combatentes.tobias;
    switch (nome) {
      case 'sussurro': return mudar(E.alternarSussurro(estado), false);
      case 'desfazer': {
        if (!historico.length) return undefined;
        const anterior = historico.pop();
        ui.mensagem = 'Desfeito.';
        ui.vez = null;
        return mudar(anterior, false);
      }
      case 'ler-fichas':
        aplicarFichas((n) => {
          ui.mensagem = n ? `PV e CA lidos de ${n} ficha(s)/token(s) do Roll20.` : 'Não consegui ler fichas do Roll20 nesta página. Confira os nomes dos tokens, ou clique em "Copiar diagnóstico" e mande ao Claude.';
          render();
        });
        return undefined;
      case 'do-mapa':
        lerFichasDoRoll20((fichas) => {
          ui.doMapa = fichas ? candidatosDoMapa(fichas) : [];
          if (!fichas) ui.mensagem = 'Não consegui ler o mapa do Roll20.';
          render();
        });
        return undefined;
      case 'fechar-do-mapa': ui.doMapa = null; return render();
      case 'pegar-do-mapa': {
        const m = ui.doMapa && ui.doMapa[Number(el.dataset.i)];
        if (!m) return undefined;
        let { pv, ca } = m;
        if (!pv) {
          const r = globalThis.prompt(`Não achei o PV de ${m.nome} na ficha nem na barra do token. Quantos PV ele tem?`, '');
          if (r === null || !E.numeroValido(r)) return undefined;
          pv = E.numeroValido(r);
        }
        if (!ca) {
          const r = globalThis.prompt(`Não achei a CA de ${m.nome} na ficha. Qual é a CA? (vazio = 10)`, '');
          if (r === null) return undefined;
          ca = E.numeroValido(r);
        }
        const novo = { nome: m.nome, pv, ca, tokenId: m.tokenId, personagemId: m.personagemId, origemPv: m.pv ? m.origemPv : 'mestre', origemCa: m.ca ? 'ficha' : 'mestre' };
        novo.chaveAcoes = chaveAcoesDe(novo);
        let e = estado.iniciado ? estado : lerIniciativas(estado);
        e = E.adicionarDoMapa(e, novo);
        const id = Object.keys(e.combatentes).find((k) => !estado.combatentes[k]);
        e.painel = { ...(e.painel || {}), tokens: { ...((e.painel && e.painel.tokens) || {}), [id]: m.tokenId } };
        ui.doMapa = ui.doMapa.filter((x) => x !== m);
        ui.mensagem = `${m.nome} entrou na luta${estado.iniciado ? ' (age logo depois do covil)' : ''}. Ligue as ações dele no cartão do turno (🔗).`;
        return mudar(e);
      }
      case 'ligar-acao-mapa':
      case 'editar-acao-mapa': {
        const c = estado.combatentes[el.dataset.id];
        const chave = `acoes:${c.chaveAcoes}`;
        const lista = [...(vinculos[chave] || [])];
        const i = nome === 'editar-acao-mapa' ? Number(el.dataset.i) : lista.length;
        const atual = lista[i] || { nome: '', comando: '' };
        const comando = globalThis.prompt(
          `Ação de ${c.nome}:\n1) Na ficha do monstro, clique na ação.\n2) Clique no campo do chat (vazio) e aperte a seta para cima ↑.\n3) Copie o texto (Ctrl+A, Ctrl+C) e cole aqui.${atual.comando ? '\nDeixe vazio para apagar esta ação.' : ''}`,
          atual.comando);
        if (comando === null) return undefined;
        if (comando.trim() === '') {
          if (lista[i]) lista.splice(i, 1);
        } else if (!/^%\{[^|}]+\|.+\}$/.test(comando.trim())) {
          ui.mensagem = 'Esse texto não parece um comando da ficha. Ele começa com %{ e termina com }.';
          return render();
        } else {
          const nomeAcao = globalThis.prompt('Nome do botão (por exemplo: Mordida, Espada, Bola de Fogo):', atual.nome || '');
          if (nomeAcao === null || !nomeAcao.trim()) return undefined;
          lista[i] = { nome: nomeAcao.trim(), comando: comando.trim() };
        }
        vinculos[chave] = lista;
        S.salvarVinculos(vinculos);
        return render();
      }
      case 'tirar-cond': return mudar(E.removerCondicao(estado, el.dataset.id, el.dataset.cond));
      case 'minimizar':
        raizEl.style.display = 'none';
        bolhaEl.style.display = 'flex';
        return undefined;
      case 'fechar-info': ui.mensagem = ''; return render();
      case 'fechar-erro': ui.erroChat = null; return render();
      case 'vincular': {
        const chave = el.dataset.chave;
        const atual = vinculos[chave] || '';
        const resposta = globalThis.prompt(
          'Ligar à ficha do Roll20:\n1) Na ficha do monstro, clique nesta ação.\n2) Clique no campo do chat (vazio) e aperte a seta para cima ↑.\n3) Copie o texto (Ctrl+A, Ctrl+C) e cole aqui.\nDeixe vazio para desligar.',
          atual);
        if (resposta === null) return undefined;
        const comando = resposta.trim();
        if (comando === '') {
          delete vinculos[chave];
          ui.mensagem = 'Ligação desfeita: este botão volta a rolar pelo painel.';
        } else if (!/^%\{[^|}]+\|.+\}$/.test(comando)) {
          ui.mensagem = 'Esse texto não parece um comando da ficha. Ele começa com %{ e termina com }.';
          return render();
        } else {
          vinculos[chave] = comando;
          ui.mensagem = 'Ligado à ficha. O dano agora sai pelos botões do quadro da ficha no chat.';
        }
        S.salvarVinculos(vinculos);
        return render();
      }
      case 'diagnostico': {
        lerFichasDoRoll20((fichas) => {
          let texto = C.diagnostico(document);
          const monstros = (fichas || []).filter((f) => !(f.personagem && f.personagem.controlado)).slice(0, 4);
          texto += `\nfichas lidas: ${fichas ? fichas.length : 'nenhuma (sem Campaign)'}`;
          for (const f of monstros) {
            const b = [1, 2, 3].map((i) => `bar${i}=${f.barras[i].valor}/${f.barras[i].max}${f.barras[i].link ? ' ligada' : ''}`).join(' ');
            texto += `\n  token "${f.nome}" ${b}`;
            if (f.personagem) {
              texto += `\n    ficha "${f.personagem.nome}" carregada=${f.personagem.carregado} lidos=${JSON.stringify(f.personagem.atributos)}`;
              texto += `\n    campos: ${(f.personagem.campos || []).join(',')}`;
              texto += `\n    atributos: ${(f.personagem.nomesAtributos || []).join(',')}`;
            }
          }
          ui.mensagem = C.copiar(texto, document)
            ? 'Diagnóstico copiado. Cole na conversa com o Claude (Ctrl+V).'
            : 'Não consegui copiar o diagnóstico. Ele está no campo da faixa vermelha.';
          ui.ultimoComando = texto;
          render();
        }, true);
        return undefined;
      }
      case 'puxar-iniciativa':
        puxarIniciativa((n) => {
          ui.mensagem = n > 0
            ? `${n} iniciativa(s) copiadas da ordem de turnos do Roll20.`
            : 'Não achei iniciativas de monstros na ordem de turnos do Roll20. Abra a janela "Turn Order" e confira os nomes dos tokens.';
          render();
        });
        return undefined;
      case 'comecar':
        memoriaTurno = null;
        ui.vez = null;
        ui.doMapa = null;
        estado = lerIniciativas(estado);
        aplicarFichas(() => mudar(E.iniciar(lerIniciativas(estado))));
        return undefined;
      case 'remover': return mudar(E.removerCombatente(lerIniciativas(estado), el.dataset.id));
      case 'adicionar': return mudar(E.adicionarCombatente(lerIniciativas(estado), D.fichas[el.dataset.ficha]));
      case 'proximo': ui.vez = null; return mudar(E.proximoTurno(estado));
      case 'anterior': ui.vez = null; return mudar(E.turnoAnterior(estado));
      case 'recomecar':
        if (!globalThis.confirm('Recomeçar a luta do zero?')) return undefined;
        S.limpar();
        ui.mensagem = '';
        ui.erroChat = null;
        return mudar(novoCombate({ jogadores: estado.jogadores, chegada: estado.chegada, ritualCompleto: estado.ritualCompleto }, estado.sussurro));
      case 'aplicar-dano': return aplicarDano(el.dataset.id);
      case 'aplicar-cura': {
        const inp = raizEl.querySelector(`input[data-dano="${el.dataset.id}"]`);
        return mudar(E.curar(estado, el.dataset.id, inp ? inp.value : ''));
      }
      case 'ritual-ossian': return mudar(E.alternarRitualOssian(estado, el.dataset.id));
      case 'responder': return mudar(E.responder(estado, 'grupoFerido', el.dataset.valor === 'sim'));
      case 'sem-conc': return mudar(E.definirConcentracao(estado, 'tobias', null));
      case 'abalar': {
        const nomeP = raizEl.querySelector('[data-a="nome-abalo"]').value.trim();
        if (!nomeP) { ui.mensagem = 'Escreva quem conseguiu abalar Tobias.'; return render(); }
        if (estado.abaladoPor.includes(nomeP)) { ui.mensagem = `${nomeP} já tentou abalar Tobias (uma vez por personagem).`; return render(); }
        ui.mensagem = 'Tobias está abalado: sem reação até o turno dele e desvantagem no próximo ataque.';
        return mudar(E.marcarAbalado(estado, 'tobias', nomeP));
      }
      case 'fe-sim': {
        const r = T.resolverFeFraturada(estado, true);
        ui.mensagem = r.mensagem;
        const e = r.estado;
        e.painel = { ...(e.painel || {}), aguardandoCuraFe: r.precisaRolarCura };
        if (r.precisaRolarCura) enviarMsg(C.montarCura(t.nome, 'Fé Fraturada', D.fichas.tobias.feFraturada.cura, { sussurro: e.sussurro }));
        return mudar(e);
      }
      case 'fe-nao': {
        const r = T.resolverFeFraturada(estado, false);
        ui.mensagem = r.caiu ? 'Tobias cai.' : '';
        return mudar(r.estado);
      }
      case 'fe-aplicar': {
        const valor = raizEl.querySelector('[data-a="fe-pv"]').value;
        if (E.numeroValido(valor) === null) { ui.mensagem = 'Digite os PV recuperados (um número).'; return render(); }
        const e = E.curar(estado, 'tobias', valor);
        e.painel = { ...(e.painel || {}), aguardandoCuraFe: false };
        ui.mensagem = '';
        return mudar(e);
      }
      default: return undefined;
    }
  }

  function aoClicar(ev) {
    const el = ev.target.closest('button');
    if (!el || !raizEl.contains(el)) return;
    if (el.hasAttribute('data-rolar')) return rolar(el);
    if (el.dataset.a) return acao(el.dataset.a, el);
    return undefined;
  }

  function aoMudar(ev) {
    const ds = ev.target.dataset || {};
    if (ds.pref) {
      prefs = { ...prefs, [ds.pref]: ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value };
      S.salvarPreferencias(prefs);
      avisados.clear();
      if (ds.pref === 'seguirRoll20') { memoriaTurno = null; ui.vez = null; }
      if (ds.pref === 'usarFichas' && !estado.iniciado) {
        if (prefs.usarFichas) aplicarFichas(); else remontar();
      }
      if (estado.iniciado && (ds.pref === 'atualizarTokens' || ds.pref === 'barraPv')) levarPvAosTokens(null, estado);
      return render();
    }
    if ('condAlvo' in ds) { ui.condAlvo = ev.target.value; return undefined; }
    if ('condAdd' in ds) {
      if (!ev.target.value) return undefined;
      const alvo = raizEl.querySelector('[data-cond-alvo]').value;
      ui.condAlvo = alvo;
      const r = E.adicionarCondicao(estado, alvo, ev.target.value);
      if (r.estado === estado) ui.mensagem = `${estado.combatentes[alvo].nome} já está ${COND[ev.target.value].nome.toLowerCase()}.`;
      const perdeu = r.eventos.find((x) => x.tipo === 'perdeuConcentracao');
      if (perdeu) ui.mensagem = `${r.estado.combatentes[perdeu.id].nome} perdeu a concentração em ${nomeMagia(r.estado.combatentes[perdeu.id], perdeu.magiaId)} (incapacitado).`;
      return mudar(r.estado);
    }
    const a = ds.a;
    if (a === 'luta' && !estado.iniciado) {
      usarLuta(ev.target.value);
      ui.mensagem = '';
      return remontar();
    }
    if (!['jogadores', 'chegada', 'ritual'].includes(a) || estado.iniciado) return undefined;
    return remontar();
  }

  // Monta a lista de novo (Jogadores/Chegada mudaram) e lê as fichas outra vez.
  function remontar() {
    const iniciativas = {};
    raizEl.querySelectorAll('input[data-ini]').forEach((inp) => { iniciativas[inp.dataset.ini] = inp.value; });
    let e = novoCombate(opcoesAtuais(), estado.sussurro);
    for (const [id, v] of Object.entries(iniciativas)) if (e.combatentes[id] && v !== '') e = E.definirIniciativa(e, id, v);
    mudar(e);
    aplicarFichas();
  }

  function aoTeclar(ev) {
    if (ev.key !== 'Enter') return;
    const id = ev.target.dataset && ev.target.dataset.dano;
    if (id) { ev.preventDefault(); aplicarDano(id); }
  }

  function prepararArraste() {
    let inicio = null;
    raizEl.addEventListener('mousedown', (ev) => {
      if (!ev.target.closest('[data-arrastar]') || ev.target.closest('button')) return;
      const r = raizEl.getBoundingClientRect();
      inicio = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      ev.preventDefault();
    });
    document.addEventListener('mousemove', (ev) => {
      if (!inicio) return;
      raizEl.style.left = `${Math.max(0, ev.clientX - inicio.x)}px`;
      raizEl.style.top = `${Math.max(0, ev.clientY - inicio.y)}px`;
      raizEl.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (!inicio) return;
      inicio = null;
      S.salvarPosicao({ left: raizEl.style.left, top: raizEl.style.top });
    });
  }

  // ---------- iniciativa vinda do Roll20 ----------
  // Pede a ordem de turnos à ponte da página; se ela não responder, lê a janela Turn Order.
  function lerOrdemDoRoll20(feito) {
    pedirPonte({ tipo: 'iniciativa' }, 'iniciativa-resultado', (d) => {
      const entradas = d && d.entradas && d.entradas.length ? d.entradas : A.iniciativa.lerTrackerDom(document);
      if (estado && entradas.length) guardarTokens(entradas, A.iniciativa.casarEntradas(estado.combatentes, entradas));
      feito(entradas);
    }, 300);
  }

  // Durante a luta: quando a vez muda na ordem de turnos do Roll20, o painel vai junto.
  function seguirRoll20() {
    if (!estado || !estado.iniciado || !prefs.seguirRoll20) return;
    lerOrdemDoRoll20((entradas) => {
      if (!estado || !estado.iniciado || !prefs.seguirRoll20) return;
      const r = R.passo(memoriaTurno, entradas, estado);
      memoriaTurno = r.memoria;
      const a = r.acao;
      if (!a) return;
      if (a.tipo === 'ir') {
        ui.vez = null;
        mudar(E.sincronizar(estado, { id: a.id, novaRodada: a.novaRodada }), false);
      } else if (a.tipo === 'covil') {
        ui.vez = null;
        if (a.nome && !a.depois) ui.mensagem = `Iniciativa 20: ação de covil antes da vez de ${a.nome}.`;
        mudar(E.sincronizar(estado, { id: 'covil', novaRodada: a.novaRodada }), false);
      } else {
        const c = a.id ? estado.combatentes[a.id] : null;
        ui.vez = c
          ? { titulo: `Vez de ${c.nome}`, texto: 'Já caiu: passe a vez no Roll20 (ou tire o token da ordem de turnos).' }
          : { titulo: `Vez de ${a.nome}`, texto: 'Jogador. O painel volta sozinho quando chegar a vez de um monstro na ordem de turnos do Roll20.' };
        mudar(E.sincronizar(estado, { novaRodada: a.novaRodada }), false);
      }
    });
  }

  // Copia para o painel as iniciativas novas. Escreve direto nos campos para não tirar o foco de quem digita.
  function puxarIniciativa(depois) {
    if (!estado || estado.iniciado) return;
    lerOrdemDoRoll20((entradas) => {
      if (!estado || estado.iniciado) return;
      const achadas = A.iniciativa.casarIniciativa(estado.combatentes, entradas || []);
      let e = estado;
      let mudou = false;
      for (const [id, valor] of Object.entries(achadas)) {
        if (e.combatentes[id].iniciativa === valor) continue;
        e = E.definirIniciativa(e, id, valor);
        mudou = true;
        const campo = raizEl.querySelector(`input[data-ini="${id}"]`);
        if (campo) campo.value = String(valor);
      }
      if (mudou) { estado = e; S.salvar(estado); }
      if (depois) depois(Object.keys(achadas).length);
    });
  }

  async function montar(corpo = document.body) {
    if (document.getElementById('assistente-rc')) return;
    raizEl = document.createElement('div');
    raizEl.id = 'assistente-rc';
    bolhaEl = document.createElement('button');
    bolhaEl.id = 'assistente-rc-bolha';
    bolhaEl.textContent = '⚔';
    bolhaEl.title = 'Abrir o painel';
    bolhaEl.style.display = 'none';
    bolhaEl.addEventListener('click', () => { raizEl.style.display = ''; bolhaEl.style.display = 'none'; });
    corpo.appendChild(raizEl);
    corpo.appendChild(bolhaEl);
    const salvo = await S.carregar();
    if (salvo && salvo.combatentes && A.dados[salvo.encontroId]) usarLuta(salvo.encontroId);
    estado = salvo && salvo.encontroId === D.id && salvo.combatentes
      ? salvo
      : novoCombate({ jogadores: 5, chegada: 'preparado', ritualCompleto: false });
    estado.painel = estado.painel || { aguardandoCuraFe: false };
    vinculos = (await S.carregarVinculos()) || {};
    prefs = { ...prefs, ...((await S.carregarPreferencias()) || {}) };
    const pos = await S.carregarPosicao();
    if (pos && pos.left && pos.top) {
      raizEl.style.left = pos.left;
      raizEl.style.top = pos.top;
      raizEl.style.right = 'auto';
    }
    raizEl.addEventListener('click', aoClicar);
    raizEl.addEventListener('change', aoMudar);
    raizEl.addEventListener('keydown', aoTeclar);
    // Teclas digitadas no painel não chegam aos atalhos do Roll20 (Delete/Backspace apagariam o token selecionado).
    for (const tipo of ['keydown', 'keyup', 'keypress']) {
      raizEl.addEventListener(tipo, (ev) => { if (ev.target.matches('input, textarea, select')) ev.stopPropagation(); });
    }
    prepararArraste();
    render();
    setInterval(() => (estado && estado.iniciado ? seguirRoll20() : puxarIniciativa()), 1500);
    setTimeout(() => aplicarFichas(), 800);
  }

  A.painel = { montar };
})();
