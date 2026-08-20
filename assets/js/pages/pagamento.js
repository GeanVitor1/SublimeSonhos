/* =========================================================================
   SUBLIME SONHOS — PAGAMENTO (módulo compartilhado)
   UI unificada de forma de pagamento usada nas telas de carrinho, encomenda
   e bolo personalizado.

   - Checkboxes com ícone (mesmos métodos para "antecipado" e "na entrega")
   - Pix: gera um QR code mockado e simula a aprovação
   - Cartão: mostra o formulário de dados do cartão (número, validade, CVV)
   - Botão "Simular pagamento" presente em ambos os momentos
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;

  /* ------------------------------------------------------------------ */
  /* MÉTODOS DE PAGAMENTO (únnicos, com ícone e tipo de simulação)        */
  /* ------------------------------------------------------------------ */
  function getMetodos() {
    var m = cfg.loja.pagamento.metodos;
    return (m && m.length) ? m : [];
  }

  function getMetodo(nome) {
    var list = getMetodos();
    for (var i = 0; i < list.length; i++) if (list[i].nome === nome) return list[i];
    return null;
  }

  function tipoMetodo(nome) {
    var m = getMetodo(nome);
    return m ? m.tipo : null;
  }

  /* ------------------------------------------------------------------ */
  /* CHECKBOXES COM ÍCONE                                                */
  /* ------------------------------------------------------------------ */
  function renderMetodos(selecionado) {
    var list = getMetodos();
    if (!list.length) {
      return '<p class="text-sm text-muted">Nenhuma forma de pagamento disponível.</p>';
    }
    return list.map(function (m) {
      var checked = selecionado === m.nome ? ' checked' : '';
      return (
        '<label class="opt opt--checkbox opt--metodo">' +
          '<input type="radio" name="f-forma" value="' + u.esc(m.nome) + '"' + checked + '>' +
          '<span class="opt__dot"></span>' +
          '<iconify-icon icon="' + m.icone + '" width="20" height="20" aria-hidden="true"></iconify-icon>' +
          '<span class="opt__label">' + u.esc(m.nome) + '</span>' +
        '</label>'
      );
    }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* QR CODE MOCKADO (Pix)                                               */
  /* ------------------------------------------------------------------ */
  var QR_SEED = 'sublime-pix-mock';
  function renderPixQr(aprovado) {
    var n = 9, cs = 16, size = n * cs;
    var h = 0;
    for (var i = 0; i < QR_SEED.length; i++) h = ((h * 31) + QR_SEED.charCodeAt(i)) | 0;
    var grid = [];
    for (var i = 0; i < n; i++) {
      grid[i] = [];
      for (var j = 0; j < n; j++) {
        h = (h * 1103515245 + 12345) & 0x7fffffff;
        var bit = (h % 2 === 0) ? 1 : 0;
        /* bordas e cantos (finder patterns) sempre preenchidos */
        if (i === 0 || j === 0 || i === n - 1 || j === n - 1) bit = 1;
        if ((i < 3 && j < 3) || (i < 3 && j > n - 4) || (i > n - 4 && j < 3)) bit = 1;
        grid[i][j] = bit;
      }
    }
    var rects = '';
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (grid[i][j]) rects += '<rect x="' + (j * cs) + '" y="' + (i * cs) + '" width="' + cs + '" height="' + cs + '"/>';
      }
    }
    var label = aprovado ? 'Pago' : 'QR mockado';
    return (
      '<div class="pix-qr-wrap" ' + (aprovado ? 'data-aprovado' : '') + '>' +
        '<svg class="pix-qr" viewBox="0 0 ' + size + ' ' + size + '" width="' + (size + 2) + '" height="' + (size + 20) + '" role="img" aria-label="QR Code Pix (mockado)">' +
          '<rect width="' + size + '" height="' + size + '" class="pix-qr__bg"/>' +
          rects +
        '</svg>' +
        '<div class="pix-qr__label">' + u.esc(label) + '</div>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* FORMULÁRIO DE CARTÃO                                                */
  /* ------------------------------------------------------------------ */
  function maskNumero(v) {
    var d = u.apenasDigitos(v).slice(0, 19);
    var out = '';
    for (var i = 0; i < d.length; i++) {
      if (i > 0 && i % 4 === 0) out += ' ';
      out += d[i];
    }
    return out;
  }

  function maskValidade(v) {
    var d = u.apenasDigitos(v).slice(0, 4);
    if (d.length <= 2) return d;
    return d.slice(0, 2) + '/' + d.slice(2);
  }

  function maskCvv(v) {
    return u.apenasDigitos(v).slice(0, 4);
  }

  function renderCardForm(card, aprovado) {
    card = card || { numero: '', validade: '', cvv: '' };
    return (
      '<div class="px-card-form">' +
        '<div class="form-label" style="margin-bottom:10px">Dados do cartão</div>' +
        '<div class="form-grid">' +
          '<div class="form-group" id="g-px-numero"><label class="form-label" for="f-px-numero">Número do cartão</label><input class="form-control" id="f-px-numero" type="text" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" value="' + u.esc(card.numero) + '"><div class="form-error">Informe os 16 dígitos do cartão.</div></div>' +
          '<div class="form-group" id="g-px-validade"><label class="form-label" for="f-px-validade">Validade</label><input class="form-control" id="f-px-validade" type="text" inputmode="numeric" maxlength="5" placeholder="MM/AA" value="' + u.esc(card.validade) + '"><div class="form-error">Informe a validade.</div></div>' +
          '<div class="form-group" id="g-px-cvv"><label class="form-label" for="f-px-cvv">CVV</label><input class="form-control" id="f-px-cvv" type="text" inputmode="numeric" maxlength="4" placeholder="000"><div class="form-error">Informe o CVV.</div></div>' +
        '</div>' +
        (aprovado ? '<div class="form-label mt-2" style="color:var(--success);font-weight:700">Pagamento aprovado</div>' : '') +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* TROCO (somente Dinheiro + na entrega)                                */
  /* ------------------------------------------------------------------ */
  function renderTroco(dados) {
    return (
      '<div class="opts">' +
        '<label class="opt' + (!dados.troco ? ' selected' : '') + '"><input type="radio" name="troco" value="nao"' + (!dados.troco ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Não preciso de troco</span></label>' +
        '<label class="opt' + (dados.troco ? ' selected' : '') + '"><input type="radio" name="troco" value="sim"' + (dados.troco ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Preciso de troco</span></label>' +
      '</div>' +
      '<div class="form-group mt-2" id="g-trocoPara"><label class="form-label" for="f-trocoPara">Troco para quanto?</label><input class="form-control" id="f-trocoPara" type="text" inputmode="decimal" placeholder="Ex.: 100,00" value="' + u.esc(dados.trocoPara || '') + '"><div class="form-error">Informe o valor do troco.</div></div>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* ÁREA DINÂMICA (Pix / cartão / troco) conforme o método selecionado  */
  /* ------------------------------------------------------------------ */
  function renderDinamico(dados) {
    if (!dados.pagamento) return '';
    var tipo = tipoMetodo(dados.pagamento);
    var aprovado = !!dados.pagamentoAprovado;

    if (tipo === 'pix') {
      return (
        '<div class="pix-area">' +
          '<div class="form-label" style="margin-bottom:8px">QR code Pix (mockado)</div>' +
          renderPixQr(aprovado) +
          (aprovado
            ? '<div class="form-label mt-2" style="color:var(--success);font-weight:700">Pago</div>'
            : '<p class="form-hint">Escaneie ou leia o código para simular o pagamento.</p>') +
        '</div>'
      );
    }
    if (tipo === 'cartao') {
      return renderCardForm(dados.card, aprovado);
    }
    if (tipo === 'dinheiro' && dados.momentoPagamento === 'na-entrega') {
      return ''; /* troco é renderizado na área dedicada */
    }
    return '';
  }

  function renderTrocoWrap(dados) {
    if (dados.pagamento === 'Dinheiro' && dados.momentoPagamento === 'na-entrega') {
      return renderTroco(dados);
    }
    return '';
  }

  /* HTML com os controles de pagamento (métodos + área dinâmica + troco).
     O botão "Simular pagamento" é renderizado separadamente por cada tela. */
  function renderControles(dados) {
    return (
      '<div class="opts" id="pg-metodos">' + renderMetodos(dados.pagamento) + '</div>' +
      '<div id="pg-dinamico" class="mt-3"></div>' +
      '<div id="pg-troco-wrap" class="hidden mt-3"></div>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* VALIDAÇÃO                                                          */
  /* ------------------------------------------------------------------ */
  function validar(dados) {
    var erros = [];
    if (!dados.momentoPagamento) erros.push('Escolha o momento do pagamento.');
    if (!dados.pagamento) erros.push('Escolha a forma de pagamento.');
    else {
      var tipo = tipoMetodo(dados.pagamento);
      if (tipo === 'cartao') {
        var c = dados.card || {};
        if (u.apenasDigitos(c.numero || '').length < 16) erros.push('Informe os 16 dígitos do cartão.');
        if (!(c.validade || '').match(/^(0[1-9]|1[0-2])\/\d{2}$/)) erros.push('Informe a validade (MM/AA).');
        if (u.apenasDigitos(c.cvv || '').length < 3) erros.push('Informe o CVV.');
      }
      if (tipo === 'dinheiro' && dados.momentoPagamento === 'na-entrega' && dados.troco && !dados.trocoPara) {
        erros.push('Informe o troco para quanto.');
      }
    }
    return { ok: !erros.length, erros: erros };
  }

  /* ------------------------------------------------------------------ */
  /* INICIALIZAÇÃO (liga toda a interação da etapa de pagamento)         */
  /* init(container, dados, onSimular, opt)                              */
  /* opt.onValidarExtra: callback extra antes de simular (ex.: validar   */
  /*   campos do formulário de bolo) — aborta se retornar false         */
  /* ------------------------------------------------------------------ */
  function init(container, dados, onSimular, opt) {
    opt = opt || {};
    var onValidarExtra = opt.onValidarExtra;

    if (!container) return;

    /* Garante estado inicial de cartão */
    if (!dados.card) dados.card = { numero: '', validade: '', cvv: '' };

    /* Sincroniza momento/método a partir de radios já marcados (ex.: bolo) */
    var checkedMomento = container.querySelector('input[name="momento"]:checked');
    if (checkedMomento) dados.momentoPagamento = checkedMomento.value;

    var metodosEl = container.querySelector('#pg-metodos');
    var dinamicoEl = container.querySelector('#pg-dinamico');
    var trocoWrap = container.querySelector('#pg-troco-wrap');
    var simBtn = container.querySelector('#btn-simular-pagamento');
    var gForma = container.querySelector('#g-forma');

    function atualizarMetodos() {
      if (metodosEl) metodosEl.innerHTML = renderMetodos(dados.pagamento);
    }

    function atualizarDinamico() {
      if (!dinamicoEl) return;
      dinamicoEl.innerHTML = renderDinamico(dados);
      var num = dinamicoEl.querySelector('#f-px-numero');
      if (num) {
        num.value = dados.card.numero;
        num.addEventListener('input', function () {
          num.value = maskNumero(num.value);
          dados.card.numero = num.value;
        });
        num.addEventListener('blur', function () { dados.card.numero = num.value; });
      }
      var val = dinamicoEl.querySelector('#f-px-validade');
      if (val) {
        val.value = dados.card.validade;
        val.addEventListener('input', function () {
          val.value = maskValidade(val.value);
          dados.card.validade = val.value;
        });
        val.addEventListener('blur', function () { dados.card.validade = val.value; });
      }
      var cvv = dinamicoEl.querySelector('#f-px-cvv');
      if (cvv) {
        cvv.value = dados.card.cvv;
        cvv.addEventListener('input', function () {
          cvv.value = maskCvv(cvv.value);
          dados.card.cvv = cvv.value;
        });
        cvv.addEventListener('blur', function () { dados.card.cvv = cvv.value; });
      }
    }

    function atualizarTroco() {
      if (!trocoWrap) return;
      trocoWrap.innerHTML = renderTrocoWrap(dados);
      trocoWrap.classList.toggle('hidden', renderTrocoWrap(dados) === '');
      var radios = trocoWrap.querySelectorAll('input[name="troco"]');
      radios.forEach(function (r) {
        r.addEventListener('change', function () {
          dados.troco = r.value === 'sim';
          if (!dados.troco) dados.trocoPara = '';
          atualizarTroco();
        });
      });
      var tp = trocoWrap.querySelector('#f-trocoPara');
      if (tp) {
        tp.addEventListener('input', function () {
          var v = tp.value.replace(/\D/g, '');
          if (v) v = (Number(v) / 100).toFixed(2).replace('.', ',');
          tp.value = v;
          dados.trocoPara = tp.value;
        });
        tp.addEventListener('blur', function () { dados.trocoPara = tp.value.trim(); });
      }
    }

    function resetErros() {
      var ids = ['#g-px-numero', '#g-px-validade', '#g-px-cvv'];
      ids.forEach(function (id) {
        var g = container.querySelector(id);
        if (g) g.classList.remove('invalid');
      });
    }

    /* Delegação de eventos dentro do container */
    container.addEventListener('change', function (e) {
      var t = e.target;

      if (t.name === 'momento') {
        dados.momentoPagamento = t.value;
        dados.pagamento = '';
        dados.card = { numero: '', validade: '', cvv: '' };
        dados.troco = false; dados.trocoPara = '';
        dados.pagamentoAprovado = false;
        atualizarMetodos();
        dinamicoEl.innerHTML = '';
        atualizarTroco();
        if (gForma) gForma.classList.remove('invalid');
        return;
      }

      if (t.name === 'f-forma') {
        dados.pagamento = t.value;
        dados.pagamentoAprovado = false;
        dados.card = { numero: '', validade: '', cvv: '' };
        dados.troco = false; dados.trocoPara = '';
        atualizarDinamico();
        atualizarTroco();
        if (gForma) gForma.classList.remove('invalid');
        return;
      }

      if (t.name === 'troco') {
        dados.troco = t.value === 'sim';
        if (!dados.troco) dados.trocoPara = '';
        atualizarTroco();
      }
    });

    if (simBtn) {
      simBtn.addEventListener('click', function () {
        resetErros();
        var v = validar(dados);
        if (!v.ok) {
          if (gForma) gForma.classList.add('invalid');
          /* marca campos de cartão com erro */
          if (dados.pagamento && tipoMetodo(dados.pagamento) === 'cartao') {
            container.querySelector('#g-px-numero') && container.querySelector('#g-px-numero').classList.add('invalid');
            container.querySelector('#g-px-validade') && container.querySelector('#g-px-validade').classList.add('invalid');
            container.querySelector('#g-px-cvv') && container.querySelector('#g-px-cvv').classList.add('invalid');
          }
          SS.ui.toast(v.erros.join(' '), 'error');
          return;
        }
        if (gForma) gForma.classList.remove('invalid');
        if (typeof onValidarExtra === 'function' && !onValidarExtra()) return;
        dados._simulando = true;
        simBtn.disabled = true;
        simBtn.setAttribute('aria-busy', 'true');
        simBtn.textContent = 'Simulando pagamento…';

        setTimeout(function () {
          dados.pagamentoAprovado = true;
          dados._simulando = false;
          atualizarDinamico();
          atualizarTroco();
          simBtn.disabled = false;
          simBtn.removeAttribute('aria-busy');
          simBtn.textContent = 'Pagamento simulado';
          SS.ui.toast('Pagamento simulado aprovado', 'success');
          if (typeof onSimular === 'function') onSimular();
        }, 900);
      });
    }

    /* Renderiza estados iniciais */
    atualizarDinamico();
    atualizarTroco();
  }

  /* Últimos 4 dígitos do cartão para exibir na mensagem (máscara de segurança) */
  function cardUltimos4(dados) {
    var c = dados.card || {};
    var d = u.apenasDigitos(c.numero || '');
    return d.length >= 4 ? d.slice(-4) : '';
  }

  /* Marca do cartão a partir dos primeiros dígitos (mock simples) */
  function cardMarca(dados) {
    var d = u.apenasDigitos((dados.card || {}).numero || '');
    if (!d) return '';
    var f = d.slice(0, 1);
    if (f === '3') return 'Elo/Amex';
    if (f === '4') return 'Visa';
    if (f === '5' || f === '6') return 'Mastercard/Elo';
    return 'Cartão';
  }

  SS.pagamento = {
    getMetodos: getMetodos,
    getMetodo: getMetodo,
    tipoMetodo: tipoMetodo,
    renderMetodos: renderMetodos,
    renderControles: renderControles,
    renderPixQr: renderPixQr,
    renderCardForm: renderCardForm,
    renderDinamico: renderDinamico,
    renderTroco: renderTroco,
    validar: validar,
    init: init,
    cardUltimos4: cardUltimos4,
    cardMarca: cardMarca,
  };
})(window.SS);
