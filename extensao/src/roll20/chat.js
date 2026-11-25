// Monta os comandos do chat do Roll20 e envia. Quem rola os dados é o próprio Roll20.
(function () {
  const prefixo = (o) => (o && o.sussurro ? '/w gm ' : '');
  const abrir = (o, nome) => `${prefixo(o)}&{template:default} {{name=${nome}}}`;

  function dobrarDados(expr) {
    return expr.replace(/(\d+)d(\d+)/g, (_, n, f) => `${Number(n) * 2}d${f}`);
  }

  function linhaDano(partes, critico) {
    return partes.map((p) => `[[${critico ? dobrarDados(p.dados) : p.dados}]] ${p.tipo}`).join(' + ');
  }

  function montarAtaque(nome, acao, o = {}) {
    const rolagem = o.desvantagem ? `[[2d20kl1+${acao.bonus}]] (desvantagem)` : `[[1d20+${acao.bonus}]]`;
    return `${abrir(o, `${nome} — ${acao.nome}`)} {{Ataque=${rolagem}}}`;
  }

  function montarDano(nome, acao, o = {}) {
    const titulo = `${nome} — ${acao.nome}${o.critico ? ' (crítico)' : ''}`;
    let msg = `${abrir(o, titulo)} {{Dano=${linhaDano(acao.dano, o.critico)}}}`;
    if (acao.extra) msg += ` {{Efeito=${acao.extra}}}`;
    return msg;
  }

  function montarMagia(nome, magia, o = {}) {
    let msg = abrir(o, `${nome} — ${magia.nome}`);
    if (magia.ataque !== undefined) {
      msg += o.desvantagem
        ? ` {{Ataque=[[2d20kl1+${magia.ataque}]] (desvantagem)}}`
        : ` {{Ataque=[[1d20+${magia.ataque}]]}}`;
    }
    if (magia.cd) msg += ` {{CD=${magia.cd}}}`;
    if (magia.cura) msg += ` {{Cura=[[${magia.cura}]]}}`;
    msg += ` {{Efeito=${magia.efeito}}}`;
    return msg;
  }

  function montarDanoMagia(nome, magia, o = {}) {
    const titulo = `${nome} — ${magia.nome}${o.critico ? ' (crítico)' : ''}`;
    const metade = magia.metadeSePassar ? ' (metade se passar)' : '';
    return `${abrir(o, titulo)} {{Dano=${linhaDano(magia.dano, o.critico)}${metade}}}`;
  }

  function montarCura(nome, titulo, dados, o = {}) {
    return `${abrir(o, `${nome} — ${titulo}`)} {{Cura=[[${dados}]]}}`;
  }

  function montarCovil(covil, fase, o = {}) {
    let msg = abrir(o, `Covil — ${covil.nome}`);
    if (covil.cd) msg += ` {{CD=${covil.cd}}}`;
    if (covil.dano) msg += ` {{Dano=[[${fase === 2 && covil.danoFase2 ? covil.danoFase2 : covil.dano}]] ${covil.tipo}}}`;
    msg += ` {{Efeito=${covil.efeito}}}`;
    return msg;
  }

  const SELETORES_CAMPO = ['#textchat-input textarea', 'textarea[name="chatInput"]', '#textchat-input [contenteditable="true"]'];

  // Igual ao Beyond20: o botão de enviar é o PRIMEIRO botão da área #textchat-input.
  function acharBotao(doc, campo) {
    const area = doc.getElementById('textchat-input') || (campo && campo.parentElement);
    return area ? area.getElementsByTagName('button')[0] || null : null;
  }

  function descrever(el) {
    const visivel = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const pais = [];
    let p = el.parentElement;
    for (let i = 0; p && i < 3; i++, p = p.parentElement) pais.push(p.id ? `#${p.id}` : p.tagName.toLowerCase());
    return `${el.tagName.toLowerCase()} id="${el.id}" class="${el.className}" name="${el.getAttribute('name') || ''}" type="${el.getAttribute('type') || ''}" placeholder="${el.getAttribute('placeholder') || ''}" texto="${(el.textContent || '').trim().slice(0, 30)}" visível=${visivel ? 'sim' : 'não'} pais=${pais.join(' < ')}`;
  }

  // Resumo do que existe na área do chat, para o mestre colar na conversa se o envio falhar.
  function diagnostico(doc = globalThis.document) {
    const fora = (el) => !el.closest('#assistente-rc');
    const area = doc.getElementById('textchat-input');
    const linhas = [`#textchat-input: ${area ? 'sim' : 'não'}`];
    if (area) [...area.querySelectorAll('textarea, button, [contenteditable]')].forEach((el) => linhas.push('  ' + descrever(el)));
    const campos = [...doc.querySelectorAll('textarea, [contenteditable="true"]')].filter(fora);
    linhas.push(`campos de texto na página: ${campos.length}`);
    campos.slice(0, 8).forEach((el) => linhas.push('  ' + descrever(el)));
    return linhas.join('\n');
  }

  function copiar(texto, doc) {
    try {
      const area = doc.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      doc.body.appendChild(area);
      area.select();
      const ok = doc.execCommand && doc.execCommand('copy');
      area.remove();
      if (ok) return true;
    } catch (_) { /* tenta a API moderna abaixo */ }
    try {
      if (globalThis.navigator && navigator.clipboard) { navigator.clipboard.writeText(texto); return true; }
    } catch (_) { /* sem área de transferência */ }
    return false;
  }

  // Depois de enviar, confere se o Roll20 esvaziou o campo. Se o comando continuar lá,
  // o Roll20 não recebeu: copia o comando e avisa por aoFalhar('copiado' | 'falhou').
  // Um rascunho que o mestre tinha digitado no chat volta para o campo depois do envio.
  function enviar(texto, doc = globalThis.document, aoFalhar = null, espera = 400) {
    const campo = SELETORES_CAMPO.map((s) => doc.querySelector(s)).find(Boolean);
    if (!campo) return { ok: false, via: copiar(texto, doc) ? 'copiado' : 'falhou' };
    const ler = () => (campo.isContentEditable ? campo.textContent : campo.value);
    const escrever = (v) => { if (campo.isContentEditable) campo.textContent = v; else campo.value = v; };
    const rascunho = ler();
    escrever(texto);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    const botao = acharBotao(doc, campo);
    let via = 'botao';
    if (botao) {
      botao.click();
    } else {
      via = 'enter';
      const tecla = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
      campo.dispatchEvent(new KeyboardEvent('keydown', tecla));
      campo.dispatchEvent(new KeyboardEvent('keyup', tecla));
    }
    setTimeout(() => {
      if (ler().trim() === texto.trim()) {
        if (aoFalhar) aoFalhar(copiar(texto, doc) ? 'copiado' : 'falhou');
      } else if (rascunho && ler().trim() === '') {
        escrever(rascunho);
        campo.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, espera);
    return { ok: true, via };
  }

  const api = { montarAtaque, montarDano, montarMagia, montarDanoMagia, montarCura, montarCovil, enviar, dobrarDados, diagnostico, copiar };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.chat = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
