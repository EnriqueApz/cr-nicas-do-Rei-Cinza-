// Painel do mestre dentro do editor do Roll20.
(function () {
  const A = globalThis.AssistenteRC;
  const E = A.estado;
  const T = A.taticas;
  const C = A.chat;
  const S = A.armazenamento;
  const D = A.dados.m01c06;

  let estado = null;
  let vinculos = {};
  let raizEl = null;
  let bolhaEl = null;
  const ui = { erroChat: null, ultimoComando: '', mensagem: '' };

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ficha = (c) => D.fichas[c.fichaId];
  const CHEGADAS = { normal: 'Normal', surpresa: 'Pego de surpresa', preparado: 'Preparado' };
  const CIRCULOS = { 0: 'truque', 1: '1º', 2: '2º', 3: '3º' };

  function novoCombate(opcoes, sussurro = true) {
    const e = E.criarCombate(D, opcoes);
    e.sussurro = sussurro;
    e.painel = { aguardandoCuraFe: false };
    return e;
  }

  function mudar(novo) {
    estado = novo;
    S.salvar(estado);
    render();
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
        <span>PV ${c.pvMax} · CA ${c.ca}</span>
        <input type="number" data-ini="${c.id}" placeholder="inic." value="${c.iniciativa ?? ''}">
        ${c.id === 'tobias' ? '<span class="arc-vazio"></span>' : `<button data-a="remover" data-id="${c.id}" title="Tirar da luta">✖</button>`}</div>`).join('');
    const adicionar = ['cultista', 'raiz', 'lobo']
      .map((f) => `<button data-a="adicionar" data-ficha="${f}">+ ${esc(D.fichas[f].nome)}</button>`).join('');
    return `<div class="arc-prep">
      <label>Jogadores <select data-a="jogadores">${opc(4, '4', estado.jogadores)}${opc(5, '5', estado.jogadores)}</select></label>
      <label>Chegada <select data-a="chegada">${Object.entries(CHEGADAS).map(([v, t]) => opc(v, t, estado.chegada)).join('')}</select></label>
      <label class="arc-check"><input type="checkbox" data-a="ritual"${estado.ritualCompleto ? ' checked' : ''}> Ritual completo (+15 PV temporários)</label>
      <p>Iniciativa: role no Roll20 e ela vem sozinha da ordem de turnos, ou digite aqui.
        <button data-a="puxar-iniciativa">Puxar iniciativa do Roll20</button>
        <button data-a="diagnostico" title="Copia um resumo do chat e da ordem de turnos para mandar ao Claude">Copiar diagnóstico</button></p>
      ${linhas}
      <div class="arc-adicionar">Adicionar: ${adicionar}</div>
      <div class="arc-motivo">Mude Jogadores e Chegada antes de tirar ou pôr inimigos: trocar essas opções remonta a lista.</div>
      <button class="arc-principal" data-a="comecar">Começar luta</button>
    </div>`;
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
    for (const [id, a] of Object.entries(f.acoes)) {
      const dano = a.dano.map((p) => `${p.dados} ${p.tipo}`).join(' + ');
      h += `<div class="arc-item"><b>${esc(a.nome)}</b> +${a.bonus}, ${esc(a.alcance)}. ${esc(dano)}.${a.extra ? ' ' + esc(a.extra) : ''}
        <div class="arc-botoes">${htmlBotao({ rotulo: 'Ataque', kind: 'ataque', acaoId: id }, c.id)}${htmlBotao({ rotulo: 'Dano', kind: 'dano', acaoId: id }, c.id)}${htmlBotao({ rotulo: 'Dano crítico', kind: 'danoCritico', acaoId: id }, c.id)}</div></div>`;
    }
    if (f.magias) {
      h += `<div class="arc-espacos">Espaços: 1º ${c.espacos[1]} · 2º ${c.espacos[2]} · 3º ${c.espacos[3]}</div>`;
      for (const [id, m] of Object.entries(f.magias)) {
        const tags = [CIRCULOS[m.circulo], m.tempo === 'bonus' ? 'ação bônus' : 'ação', m.concentracao ? 'concentração' : ''].filter(Boolean).join(' · ');
        const botoes = [htmlBotao({ rotulo: 'Lançar', kind: 'magia', magiaId: id }, c.id)];
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
      h += `<div class="arc-linha-fina">Concentração: <b>${esc(D.fichas.tobias.magias[c.concentracao].nome)}</b> <button data-a="sem-conc">Encerrar</button></div>`;
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
    h += htmlFicha(c);
    return h + '</div>';
  }

  function htmlCovil() {
    const cv = T.sugerirCovil(estado);
    const covis = D.fichas.tobias.covil;
    return `<div class="arc-covil"><h3>Iniciativa 20 — ação de covil</h3>
      <div>${cv.quantidade === 2 ? 'Fase 2: Escolha 2 diferentes.' : 'Escolha 1.'}</div>
      ${cv.sugestoes.map((s) => `<div class="arc-jogada"><b>Sugestão: ${esc(covis[s.covilId].nome)}</b><div class="arc-motivo">${esc(s.motivo)}</div></div>`).join('')}
      <div class="arc-botoes">${cv.todas.map((id) => `<button data-rolar data-kind="covil" data-covil="${id}">${esc(covis[id].nome)}</button>`).join('')}</div>
      <div class="arc-motivo">Raízes que Prendem: ${esc(cv.motivos.raizesQuePrendem)}</div></div>`;
  }

  function htmlLista() {
    const atual = estado.ordem[estado.indice];
    const linhas = estado.ordem.filter((id) => id !== 'covil').map((id) => {
      const c = estado.combatentes[id];
      return `<div class="arc-linha${c.caido ? ' arc-caido' : ''}${id === atual ? ' arc-atual' : ''}">
        <span class="arc-nome">${esc(c.nome)}${c.concentracao ? ` <small class="arc-conc">conc.: ${esc(D.fichas.tobias.magias[c.concentracao].nome)}</small>` : ''}</span>
        <span data-pv="${id}">${htmlPv(c)}</span><span>CA ${c.ca}</span>
        <input type="text" inputmode="numeric" data-dano="${id}" placeholder="dano">
        <button data-a="aplicar-dano" data-id="${id}" title="Dano">−</button>
        <button data-a="aplicar-cura" data-id="${id}" title="Cura">+</button></div>`;
    }).join('');
    return `<details class="arc-lista" open><summary>Combatentes</summary>${linhas}</details>`;
  }

  function htmlCombate() {
    const atual = estado.ordem[estado.indice];
    const t = estado.combatentes.tobias;
    let h = `<div class="arc-barra"><span class="arc-rodada">Rodada ${estado.rodada}</span>
      <button data-a="anterior">◀</button> <button class="arc-principal" data-a="proximo">Próximo ▶</button>
      <button data-a="recomecar">Recomeçar luta</button></div>`;
    h += htmlFeFraturada();
    if (t && t.caido) h += `<div class="arc-queda"><b>Tobias caiu.</b> ${esc(D.textoQueda)}</div>`;
    h += atual === 'covil' ? htmlCovil() : htmlCartao(atual);
    return h + htmlLista();
  }

  function render() {
    if (!raizEl) return;
    const corpoAntes = raizEl.querySelector('.arc-corpo');
    const rolagem = corpoAntes ? corpoAntes.scrollTop : 0;
    const abertos = {};
    raizEl.querySelectorAll('details[class]').forEach((d) => { abertos[d.className] = d.open; });
    raizEl.innerHTML = htmlTopo() + `<div class="arc-corpo">${htmlAvisosGerais()}${estado.iniciado ? htmlCombate() : htmlPreparacao()}</div>`;
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
      enviarMsg(C.montarCovil(D.fichas.tobias.covil[el.dataset.covil], e.combatentes.tobias.fase, o));
      if (el.dataset.covil === 'broto' && T.sugerirCovil(e).todas.includes('broto')) {
        e = E.adicionarCombatente(e, D.fichas.raiz);
        ui.mensagem = 'Uma Raiz nova brotou ao lado da raiz-mãe e entrou na lista (age logo depois do covil).';
      }
      return mudar(e);
    }
    const c = e.combatentes[el.dataset.id];
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
      if (c.desvantagemProximoAtaque && kind !== 'magia') {
        ui.mensagem = 'Tobias está abalado: este ataque é com desvantagem. Role de novo e fique com o menor.';
        e = E.consumirDesvantagem(e, c.id);
      }
      enviarMsg(comandoFicha);
      return mudar(e);
    }
    if (kind === 'ataque' || kind === 'armaAtaque') {
      const acao = kind === 'ataque' ? f.acoes[el.dataset.acao] : { nome: 'Arma Espiritual', bonus: f.magias.armaEspiritual.ataque };
      enviarMsg(C.montarAtaque(c.nome, acao, { ...o, desvantagem: c.desvantagemProximoAtaque }));
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
      enviarMsg(C.montarMagia(c.nome, m, { ...o, desvantagem: m.ataque !== undefined && c.desvantagemProximoAtaque }));
      if (m.ataque !== undefined) e = E.consumirDesvantagem(e, c.id);
    } else if (kind === 'danoMagia' || kind === 'danoMagiaCritico') {
      enviarMsg(C.montarDanoMagia(c.nome, f.magias[el.dataset.magia], { ...o, critico: kind === 'danoMagiaCritico' }));
    }
    mudar(e);
  }

  function lerIniciativas(e) {
    raizEl.querySelectorAll('input[data-ini]').forEach((inp) => { e = E.definirIniciativa(e, inp.dataset.ini, inp.value); });
    return e;
  }

  function opcoesAtuais() {
    return {
      jogadores: Number(raizEl.querySelector('[data-a="jogadores"]').value),
      chegada: raizEl.querySelector('[data-a="chegada"]').value,
      ritualCompleto: raizEl.querySelector('[data-a="ritual"]').checked,
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
        avisos.push(`Teste de concentração: Constituição CD ${ev.cd} (${D.fichas.tobias.magias[ev.magiaId].nome}). Se falhar, clique em "Encerrar" no cartão de Tobias.`);
      }
    }
    if (avisos.length) ui.mensagem = avisos.join(' ');
    mudar(e);
  }

  function acao(nome, el) {
    const t = estado.combatentes.tobias;
    switch (nome) {
      case 'sussurro': return mudar(E.alternarSussurro(estado));
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
        const texto = C.diagnostico(document);
        ui.mensagem = C.copiar(texto, document)
          ? 'Diagnóstico copiado. Cole na conversa com o Claude (Ctrl+V).'
          : 'Não consegui copiar o diagnóstico. Ele está no campo da faixa vermelha.';
        ui.ultimoComando = texto;
        return render();
      }
      case 'puxar-iniciativa':
        puxarIniciativa((n) => {
          ui.mensagem = n > 0
            ? `${n} iniciativa(s) copiadas da ordem de turnos do Roll20.`
            : 'Não achei iniciativas de monstros na ordem de turnos do Roll20. Abra a janela "Turn Order" e confira os nomes dos tokens.';
          render();
        });
        return undefined;
      case 'comecar': return mudar(E.iniciar(lerIniciativas(estado)));
      case 'remover': return mudar(E.removerCombatente(lerIniciativas(estado), el.dataset.id));
      case 'adicionar': return mudar(E.adicionarCombatente(lerIniciativas(estado), D.fichas[el.dataset.ficha]));
      case 'proximo': return mudar(E.proximoTurno(estado));
      case 'anterior': return mudar(E.turnoAnterior(estado));
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
    const a = ev.target.dataset && ev.target.dataset.a;
    if (!['jogadores', 'chegada', 'ritual'].includes(a) || estado.iniciado) return;
    const iniciativas = {};
    raizEl.querySelectorAll('input[data-ini]').forEach((inp) => { iniciativas[inp.dataset.ini] = inp.value; });
    let e = novoCombate(opcoesAtuais(), estado.sussurro);
    for (const [id, v] of Object.entries(iniciativas)) if (e.combatentes[id] && v !== '') e = E.definirIniciativa(e, id, v);
    mudar(e);
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
    let respondeu = false;
    const ouvir = (ev) => {
      const d = ev.data;
      if (ev.source !== window || !d || d.origem !== 'assistente-rc-ponte' || d.tipo !== 'iniciativa-resultado') return;
      window.removeEventListener('message', ouvir);
      respondeu = true;
      feito(d.entradas && d.entradas.length ? d.entradas : A.iniciativa.lerTrackerDom(document));
    };
    window.addEventListener('message', ouvir);
    window.postMessage({ origem: 'assistente-rc', tipo: 'iniciativa' }, '*');
    setTimeout(() => {
      if (respondeu) return;
      window.removeEventListener('message', ouvir);
      feito(A.iniciativa.lerTrackerDom(document));
    }, 300);
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
    estado = salvo && salvo.encontroId === D.id && salvo.combatentes
      ? salvo
      : novoCombate({ jogadores: 5, chegada: 'preparado', ritualCompleto: false });
    estado.painel = estado.painel || { aguardandoCuraFe: false };
    vinculos = (await S.carregarVinculos()) || {};
    const pos = await S.carregarPosicao();
    if (pos && pos.left && pos.top) {
      raizEl.style.left = pos.left;
      raizEl.style.top = pos.top;
      raizEl.style.right = 'auto';
    }
    raizEl.addEventListener('click', aoClicar);
    raizEl.addEventListener('change', aoMudar);
    raizEl.addEventListener('keydown', aoTeclar);
    prepararArraste();
    render();
    setInterval(() => puxarIniciativa(), 1500);
  }

  A.painel = { montar };
})();
