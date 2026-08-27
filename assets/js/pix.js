/* =========================================================================
   SUBLIME SONHOS — PIX (BR Code + verificação de pagamento)
   - Geração de payload Pix Copia e Cola no padrão BACEN (EMV)
   - CRC16-CCITT (poly 0x1021 init 0xFFFF)
   - Persistência de pagamentos (localStorage) com verificação local
   - Pronto para plugar PSP real: basta trocar verificarPagamento por fetch
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var STORAGE_PAGAMENTOS = 'ss_pix_pagamentos_v1';

  /* ------------------------------------------------------------------ */
  /* CRC16 CCITT-FALSE                                                    */
  /* ------------------------------------------------------------------ */
  function crc16(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
        else crc <<= 1;
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function field(id, value) {
    var len = String(value.length).padStart(2, '0');
    return id + len + value;
  }

  function sanitize(str, max, upper) {
    if (!str) return '';
    var s = String(str)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 \-\.]/g, ' ')
      .replace(/\s+/g, ' ').trim();
    if (upper) s = s.toUpperCase();
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* PAYLOAD BR CODE                                                      */
  /* ------------------------------------------------------------------ */
  function gerarPayloadPix(opts) {
    // opts: { chave, nome, cidade, valor, txid } — descricao ignorada para manter QR válido (BACEN pede só TXID em 62)
    var chave = String(opts.chave || '').trim();
    // Nome e cidade em MAIÚSCULAS, sem acentos, até 25/15 — exigência de vários bancos
    var nome = sanitize(opts.nome || 'Sublime Sonhos', 25, true) || 'SUBLIME SONHOS';
    var cidade = sanitize(opts.cidade || 'Aurelino Leal', 15, true) || 'AURELINO LEAL';
    var txid = String(opts.txid || '***').replace(/[^A-Za-z0-9\-\*]/g, '').slice(0, 25) || '***';
    if (!txid) txid = '***';

    var valorStr = null;
    if (opts.valor !== null && opts.valor !== undefined && !isNaN(opts.valor) && Number(opts.valor) > 0) {
      valorStr = Number(opts.valor).toFixed(2);
    }

    var gui = field('00', 'br.gov.bcb.pix');
    // chave já normalizada (sem + para telefone, lower para email/aleatoria, só dígitos para CPF)
    // remove espaços acidentais
    chave = chave.replace(/\s/g, '');
    var chaveField = field('01', chave);
    var merchantAccount = field('26', gui + chaveField);

    var payload = '';
    payload += field('00', '01');
    // 01 = 11 para PIX estático (sempre). 12 indicaria dinâmico (exigiria URL) e causa "QR inválido" em bancos
    payload += field('01', '11');
    payload += merchantAccount;
    payload += field('52', '0000');
    payload += field('53', '986');
    if (valorStr) payload += field('54', valorStr);
    payload += field('58', 'BR');
    payload += field('59', nome);
    payload += field('60', cidade);
    // 62 — apenas TXID (05). Subcampo 02 causava "QR inválido" em bancos que validam 62 estrito.
    payload += field('62', field('05', txid));
    payload += '6304';
    var crc = crc16(payload);
    payload += crc;
    return payload;
  }

  function gerarTxid(pedidoNumero) {
    var base = 'SS' + String(pedidoNumero || Math.floor(Math.random()*9000+1000));
    var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    var txid = (base + rand).replace(/[^A-Z0-9]/g, '').slice(0, 25);
    if (txid.length < 5) txid = txid + '***';
    return txid;
  }

  /* ------------------------------------------------------------------ */
  /* VALIDAÇÃO DE CHAVE PIX                                               */
  /* ------------------------------------------------------------------ */
  function validarChave(tipo, chave) {
    var v = String(chave || '').trim();
    if (!v) return { ok: false, erro: 'Informe a chave Pix.' };
    if (tipo === 'CPF') {
      var d = v.replace(/\D/g, '');
      if (d.length !== 11) return { ok: false, erro: 'CPF deve ter 11 dígitos.' };
      if (/^(\d)\1{10}$/.test(d)) return { ok: false, erro: 'CPF inválido.' };
      return { ok: true, normalizada: d };
    }
    if (tipo === 'CNPJ') {
      var c = v.replace(/\D/g, '');
      if (c.length !== 14) return { ok: false, erro: 'CNPJ deve ter 14 dígitos.' };
      return { ok: true, normalizada: c };
    }
    if (tipo === 'TELEFONE') {
      var t = v.replace(/\D/g, '');
      // aceita 10-11 dígitos nacionais ou 12-13 começando com 55
      if (t.length < 10 || t.length > 13) return { ok: false, erro: 'Telefone deve ter 10 a 13 dígitos (com DDD e opcional +55).' };
      // normaliza para +55 formato para BR Code: 55 + DDD + numero
      if (t.length === 10 || t.length === 11) t = '55' + t;
      if (t.slice(0, 2) !== '55') return { ok: false, erro: 'Telefone deve incluir DDD brasileiro (começar com 55 quando internacional).' };
      return { ok: true, normalizada: '+' + t };
    }
    if (tipo === 'EMAIL') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, erro: 'E-mail inválido.' };
      return { ok: true, normalizada: v.toLowerCase() };
    }
    if (tipo === 'ALEATORIA') {
      var a = v.replace(/\s/g, '');
      // UUID: 8-4-4-4-12 = 36 chars com hífens, ou 32 sem
      var hex = a.replace(/-/g, '');
      if (!/^[0-9a-fA-F]{32}$/.test(hex)) return { ok: false, erro: 'Chave aleatória deve ser UUID (32 hex).' };
      // normaliza com hífens
      if (a.length === 32) {
        a = hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
      }
      return { ok: true, normalizada: a.toLowerCase() };
    }
    return { ok: false, erro: 'Tipo de chave inválido.' };
  }

  function mascaraPreview(tipo, chave) {
    if (!chave) return '';
    if (tipo === 'CPF') {
      var d = chave.replace(/\D/g, '');
      if (d.length===11) return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);
      return chave;
    }
    if (tipo === 'CNPJ') {
      var c = chave.replace(/\D/g, '');
      if (c.length===14) return c.slice(0,2)+'.'+c.slice(2,5)+'.'+c.slice(5,8)+'/'+c.slice(8,12)+'-'+c.slice(12);
      return chave;
    }
    if (tipo === 'TELEFONE') {
      var t = chave.replace(/\D/g, '');
      if (t.startsWith('55')) t = t.slice(2);
      if (t.length===11) return '('+t.slice(0,2)+') '+t.slice(2,7)+'-'+t.slice(7);
      if (t.length===10) return '('+t.slice(0,2)+') '+t.slice(2,6)+'-'+t.slice(6);
      return chave;
    }
    return chave;
  }

  /* ------------------------------------------------------------------ */
  /* STORAGE DE PAGAMENTOS                                                */
  /* ------------------------------------------------------------------ */
  function lerPagamentos() {
    try {
      var raw = localStorage.getItem(STORAGE_PAGAMENTOS);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function salvarPagamentos(arr) {
    try { localStorage.setItem(STORAGE_PAGAMENTOS, JSON.stringify(arr)); } catch (e) {}
  }
  function limparExpirados() {
    var agora = Date.now();
    var arr = lerPagamentos();
    var filtrado = arr.filter(function(p){
      // remove QRs antigos gerados com chave mock inválida (antes da correção)
      if (p.chave && String(p.chave).indexOf('sublime-pix-mock') !== -1) {
        return false;
      }
      if (p.status === 'pendente' || p.status === 'aguardando_confirmacao') {
        var exp = new Date(p.expiraEm).getTime();
        if (exp && agora > exp) { p.status = 'expirado'; return true; }
      }
      return true;
    });
    var limite = agora - 48*60*60*1000;
    filtrado = filtrado.filter(function(p){ return new Date(p.criadoEm).getTime() > limite; });
    salvarPagamentos(filtrado);
    return filtrado;
  }

  function criarPagamento(opts) {
    // opts: { valor, origem, pedidoNumero, expiraMinutos } — descricao não entra no QR para manter válido
    var cfgPix = getPixConfig();
    var tipo = cfgPix.tipo || 'ALEATORIA';
    var chave = cfgPix.chave || '';
    var nome = cfgPix.nome || 'Sublime Sonhos';
    var cidade = cfgPix.cidade || 'Aurelino Leal';
    // se Pix não configurado, retorna null — UI mostra aviso em vez de gerar QR inválido
    if (!chave || !chave.trim()) {
      return null;
    }
    // valida normalização — se inválida, não gera QR (evita "QR inválido" no banco)
    var vChk = validarChave(tipo, chave);
    if (!vChk.ok) {
      return null;
    }
    var valorChave = vChk.normalizada;
    // mantém "+" para telefone se normalizada com "+" (E.164) — bancos validam com "+". Não remove.

    var pedidoNumero = opts.pedidoNumero || String(Math.floor(1000+Math.random()*9000));
    var txid = gerarTxid(pedidoNumero);
    var payload = gerarPayloadPix({
      chave: valorChave,
      nome: nome,
      cidade: cidade,
      valor: opts.valor,
      txid: txid
    });
    // se payload ainda inválido (ex: chave vazia depois de sanitize), aborta
    if (!payload || payload.indexOf('br.gov.bcb.pix') === -1) return null;
    var agora = new Date();
    var expiraMin = opts.expiraMinutos || cfgPix.expiraMinutos || 30;
    var expira = new Date(agora.getTime() + expiraMin * 60 * 1000);
    var id = 'pix_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
    var pg = {
      id: id,
      pedidoNumero: String(pedidoNumero),
      txid: txid,
      payload: payload,
      valor: opts.valor !== undefined ? Number(opts.valor) : null,
      chave: chave,
      tipoChave: tipo,
      nome: nome,
      cidade: cidade,
      status: 'pendente',
      origem: opts.origem || 'carrinho',
      descricao: opts.descricao || '',
      criadoEm: agora.toISOString(),
      expiraEm: expira.toISOString(),
      verificacoes: 0,
      ultimaVerificacao: null,
      comprovanteEnviado: false,
      historico: [{ em: agora.toISOString(), status: 'pendente', obs: 'QR gerado' }]
    };
    var arr = lerPagamentos();
    arr.unshift(pg);
    // limita a 50
    if (arr.length > 50) arr = arr.slice(0,50);
    salvarPagamentos(arr);
    return pg;
  }

  function getPagamento(id) {
    var arr = lerPagamentos();
    for (var i=0;i<arr.length;i++) if (arr[i].id===id) return arr[i];
    return null;
  }
  function getPagamentoPorTxid(txid) {
    var arr = lerPagamentos();
    for (var i=0;i<arr.length;i++) if (arr[i].txid===txid) return arr[i];
    return null;
  }
  function atualizarStatus(id, novoStatus, obs) {
    var arr = lerPagamentos();
    var encontrado = null;
    for (var i=0;i<arr.length;i++) if (arr[i].id===id) {
      arr[i].status = novoStatus;
      arr[i].ultimaVerificacao = new Date().toISOString();
      if (!arr[i].historico) arr[i].historico=[];
      arr[i].historico.push({ em: new Date().toISOString(), status: novoStatus, obs: obs || ''});
      encontrado = arr[i];
      break;
    }
    salvarPagamentos(arr);
    return encontrado;
  }
  function marcarComprovanteEnviado(id) {
    var arr = lerPagamentos();
    for (var i=0;i<arr.length;i++) if (arr[i].id===id) {
      arr[i].comprovanteEnviado = true;
      arr[i].status = 'aguardando_confirmacao';
      arr[i].ultimaVerificacao = new Date().toISOString();
      if (!arr[i].historico) arr[i].historico=[];
      arr[i].historico.push({ em: new Date().toISOString(), status: 'aguardando_confirmacao', obs: 'Cliente informou pagamento'});
      salvarPagamentos(arr);
      return arr[i];
    }
    return null;
  }
  function confirmarPagamentoManual(id) {
    return atualizarStatus(id, 'pago', 'Confirmado manualmente pela loja');
  }
  function rejeitarPagamento(id, motivo) {
    return atualizarStatus(id, 'cancelado', motivo || 'Rejeitado pela loja');
  }

  function listarPagamentos(filtro) {
    limparExpirados();
    var arr = lerPagamentos();
    if (!filtro || !filtro.status) return arr;
    return arr.filter(function(p){ return p.status===filtro.status; });
  }

  /* Verificação — NÃO auto-aprova. Apenas verifica status real no storage.
     Para produção com PSP, troque o corpo por fetch no webhook (ver verificarPagamentoRemoto).
     O status só muda para "pago" quando a loja clica em "Confirmar pago" (confirmarPagamentoManual)
     ou quando um webhook externo chamar atualizarStatus. */
  function verificarPagamento(id) {
    var pg = getPagamento(id);
    if (!pg) return Promise.resolve({ ok:false, erro:'Pagamento não encontrado', status:'nao_encontrado' });
    if (pg.status === 'pago') return Promise.resolve({ ok:true, status:'pago', pg: pg });
    if (pg.status === 'cancelado') return Promise.resolve({ ok:true, status:'cancelado', pg: pg });
    if (pg.status === 'expirado') return Promise.resolve({ ok:true, status:'expirado', pg: pg });

    var agora = Date.now();
    var expira = new Date(pg.expiraEm).getTime();
    if (agora > expira) {
      atualizarStatus(id, 'expirado', 'Tempo esgotado');
      pg = getPagamento(id);
      return Promise.resolve({ ok:true, status:'expirado', pg: pg });
    }

    // apenas incrementa contador e retorna status atual — SEM mudar para pago sozinho
    var arr = lerPagamentos();
    for (var i=0;i<arr.length;i++) if (arr[i].id===id) {
      arr[i].verificacoes = (arr[i].verificacoes||0)+1;
      arr[i].ultimaVerificacao = new Date().toISOString();
      // NÃO aprova automaticamente — deixa para confirmação manual da loja
      salvarPagamentos(arr);
      pg = arr[i];
      break;
    }
    return new Promise(function(resolve){
      setTimeout(function(){
        resolve({ ok:true, status: pg.status, pg: pg });
      }, 600);
    });
  }

  /* Alias para integração real: verificarPagamentoRemoto(txid) faria fetch em /api/pix/status?txid= */
  function verificarPagamentoRemoto(txid) {
    // Placeholder para quando houver PSP (Gerencianet, Mercado Pago, etc)
    // Exemplo:
    // return fetch('/api/pix/verificar?txid=' + encodeURIComponent(txid)).then(r=>r.json());
    // Por enquanto delega à verificação local por id
    var pg = getPagamentoPorTxid(txid);
    if (!pg) return Promise.resolve({ ok:false, erro:'TXID não encontrado' });
    return verificarPagamento(pg.id);
  }

  /* ------------------------------------------------------------------ */
  /* CONFIG PIX                                                           */
  /* ------------------------------------------------------------------ */
  function getPixConfig() {
    // tenta ler de SS.config (aplicado via catalogo overrides)
    var cfg = SS.config && SS.config.loja && SS.config.loja.pix ? SS.config.loja.pix : null;
    if (cfg && cfg.chave) return cfg;
    // fallback: lê overrides diretos do localStorage
    try {
      var raw = localStorage.getItem('ss_admin_overrides_v1');
      var ov = raw ? JSON.parse(raw) : null;
      if (ov && ov.configuracoes && ov.configuracoes.pixChave) {
        return {
          tipo: ov.configuracoes.pixTipo || 'ALEATORIA',
          chave: ov.configuracoes.pixChave || '',
          nome: ov.configuracoes.pixNome || 'Sublime Sonhos',
          cidade: ov.configuracoes.pixCidade || 'Aurelino Leal',
          expiraMinutos: ov.configuracoes.pixExpira || 30,
          mensagem: ov.configuracoes.pixMensagem || ''
        };
      }
    } catch(e){}
    // config padrão vazia (será preenchida pelo admin)
    return {
      tipo: (cfg && cfg.tipo) || 'ALEATORIA',
      chave: (cfg && cfg.chave) || '',
      nome: (cfg && cfg.nome) || 'Sublime Sonhos',
      cidade: (cfg && cfg.cidade) || 'Aurelino Leal',
      expiraMinutos: (cfg && cfg.expiraMinutos) || 30,
      mensagem: (cfg && cfg.mensagem) || ''
    };
  }

  function isPixConfigurado() {
    var c = getPixConfig();
    return !!(c.chave && c.chave.trim().length >= 3);
  }

  /* ------------------------------------------------------------------ */
  /* QR CODE — gera URL via API pública, com fallback                   */
  /* ------------------------------------------------------------------ */
  function qrImageUrl(payload, size) {
    size = size || 300;
    // usa qrserver (grátis, sem key). Encode payload.
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(payload);
  }

  function tempoRestante(pg) {
    var agora = Date.now();
    var exp = new Date(pg.expiraEm).getTime();
    var diff = exp - agora;
    if (diff <= 0) return { expirado: true, txt: 'Expirado', ms: 0, min:0, seg:0 };
    var min = Math.floor(diff / 60000);
    var seg = Math.floor((diff % 60000)/1000);
    return { expirado:false, ms: diff, min:min, seg:seg, txt: String(min).padStart(2,'0')+':'+String(seg).padStart(2,'0') };
  }

  SS.pix = {
    gerarPayloadPix: gerarPayloadPix,
    gerarTxid: gerarTxid,
    validarChave: validarChave,
    mascaraPreview: mascaraPreview,
    crc16: crc16,
    criarPagamento: criarPagamento,
    getPagamento: getPagamento,
    getPagamentoPorTxid: getPagamentoPorTxid,
    atualizarStatus: atualizarStatus,
    marcarComprovanteEnviado: marcarComprovanteEnviado,
    confirmarPagamentoManual: confirmarPagamentoManual,
    rejeitarPagamento: rejeitarPagamento,
    listarPagamentos: listarPagamentos,
    verificarPagamento: verificarPagamento,
    verificarPagamentoRemoto: verificarPagamentoRemoto,
    getPixConfig: getPixConfig,
    isPixConfigurado: isPixConfigurado,
    qrImageUrl: qrImageUrl,
    tempoRestante: tempoRestante,
    STORAGE_PAGAMENTOS: STORAGE_PAGAMENTOS
  };

})(window.SS);
