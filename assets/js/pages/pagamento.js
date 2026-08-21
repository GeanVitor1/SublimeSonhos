/* =========================================================================
   SUBLIME SONHOS — PAGAMENTO (módulo compartilhado)
   UI unificada de forma de pagamento usada nas telas de carrinho, encomenda
   e bolo personalizado.

   - Checkboxes com ícone (mesmos métodos para "antecipado" e "na entrega")
   - Pix: gera um QR code mockado + código copia-e-cola e simula aprovação
   - Cartão: mostra formulário completo (número, nome, validade, CVV, parcelas)
   - Botão "Simular pagamento" presente em ambos os momentos
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;

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
        '<label class="opt opt--checkbox opt--metodo' + (selecionado === m.nome ? ' selected' : '') + '">' +
          '<input type="radio" name="f-forma" value="' + u.esc(m.nome) + '"' + checked + '>' +
          '<span class="opt__dot"></span>' +
          '<iconify-icon icon="' + m.icone + '" width="20" height="20" aria-hidden="true"></iconify-icon>' +
          '<span class="opt__label">' + u.esc(m.nome) + '</span>' +
        '</label>'
      );
    }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* QR CODE MOCKADO (Pix) — 21x21 com finder patterns + cópia-e-cola    */
  /* ------------------------------------------------------------------ */
  var QR_SEED_BASE = 'sublime-pix-mock-2026';
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
    return h;
  }
  function pixCopiaECola() {
    var seed = QR_SEED_BASE + '-' + Math.floor(Math.random() * 999999);
    return '00020126580014br.gov.bcb.pix0136' + seed.slice(0, 32) + '5204000053039865802BR5920Sublime Sonhos6009Aurelino Leal62070503***6304' + (1000 + Math.floor(Math.random() * 9000));
  }
  function renderPixQr(aprovado) {
    var n = 21, cs = 8, size = n * cs;
    var seed = aprovado ? QR_SEED_BASE + '-pago' : QR_SEED_BASE;
    var h = hashStr(seed);
    var grid = [];
    for (var i = 0; i < n; i++) {
      grid[i] = [];
      for (var j = 0; j < n; j++) {
        h = (h * 1103515245 + 12345) & 0x7fffffff;
        grid[i][j] = (h % 3 === 0) ? 1 : 0;
      }
    }
    function fillFinder(r, c) {
      for (var di = -1; di <= 7; di++) for (var dj = -1; dj <= 7; dj++) {
        var rr = r + di, cc = c + dj;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        var border = di === -1 || di === 7 || dj === -1 || dj === 7;
        var outer = di >= 0 && di <= 6 && dj >= 0 && dj <= 6 && (di === 0 || di === 6 || dj === 0 || dj === 6);
        var inner = di >= 2 && di <= 4 && dj >= 2 && dj <= 4;
        if (border) grid[rr][cc] = 0;
        else if (outer || inner) grid[rr][cc] = 1;
        else grid[rr][cc] = 0;
      }
    }
    fillFinder(0, 0);
    fillFinder(0, n - 7);
    fillFinder(n - 7, 0);
    for (var k = 8; k < n - 8; k++) { grid[6][k] = (k % 2 === 0) ? 1 : 0; grid[k][6] = (k % 2 === 0) ? 1 : 0; }

    var rects = '';
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (grid[i][j]) rects += '<rect x="' + (j * cs) + '" y="' + (i * cs) + '" width="' + cs + '" height="' + cs + '" rx="1"/>';
    var label = aprovado ? 'Pago ✓' : 'QR Code Pix';
    return (
      '<div class="pix-qr-wrap' + (aprovado ? ' is-pago' : '') + '" data-aprovado="' + (aprovado ? '1' : '0') + '">' +
        '<svg class="pix-qr" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="QR Code Pix (simulação)">' +
          '<rect width="' + size + '" height="' + size + '" rx="8" class="pix-qr__bg"/>' + rects +
        '</svg>' +
        '<div class="pix-qr__label">' + label + '</div>' +
      '</div>'
    );
  }

  function renderPixArea(aprovado, copiaECola) {
    copiaECola = copiaECola || pixCopiaECola();
    return (
      '<div class="pix-area">' +
        '<div class="pix-area__head">' +
          '<span class="pix-area__badge"><iconify-icon icon="ph:qr-code" width="16" height="16"></iconify-icon> Pix — QR Code mockado (simulação)</span>' +
          (aprovado ? '<span class="pix-area__ok"><iconify-icon icon="ph:check-circle-fill" width="18" height="18"></iconify-icon> Pagamento aprovado (simulado)</span>' : '') +
        '</div>' +
        '<div class="pix-area__grid">' +
          renderPixQr(aprovado) +
          '<div class="pix-area__info">' +
            (aprovado
              ? '<p class="pix-area__hint" style="color:var(--success);font-weight:700">Pagamento Pix simulado com sucesso! Clique em "Pagamento simulado" abaixo para concluir.</p>'
              : '<p class="pix-area__hint">Escaneie o QR Code com o app do seu banco <strong>ou</strong> copie o código abaixo para simular o pagamento.</p>') +
            '<div class="pix-copia">' +
              '<div class="pix-copia__label">Pix copia e cola (simulação)</div>' +
              '<div class="pix-copia__code" id="pix-copia-code">' + u.esc(copiaECola) + '</div>' +
              '<button type="button" class="btn btn--outline btn--sm pix-copia__btn" id="pix-copiar-btn"><iconify-icon icon="ph:copy" width="16" height="16"></iconify-icon> Copiar código</button>' +
            '</div>' +
            '<p class="form-hint" style="margin-top:10px">Este QR Code é apenas uma simulação visual — nenhum pagamento real é processado.</p>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* FORMULÁRIO DE CARTÃO                                                */
  /* ------------------------------------------------------------------ */
  function maskNumero(v) {
    var d = u.apenasDigitos(v).slice(0, 16);
    var out = '';
    for (var i = 0; i < d.length; i++) { if (i > 0 && i % 4 === 0) out += ' '; out += d[i]; }
    return out;
  }
  function maskValidade(v) {
    var d = u.apenasDigitos(v).slice(0, 4);
    if (d.length <= 2) return d;
    return d.slice(0, 2) + '/' + d.slice(2);
  }
  function maskCvv(v) { return u.apenasDigitos(v).slice(0, 4); }

  function bandeiraIcon(digitos) {
    var f = (digitos || '').charAt(0);
    if (f === '4') return 'Visa';
    if (f === '5' || f === '2') return 'Mastercard';
    if (f === '3') return 'Amex/Elo';
    if (f === '6') return 'Elo/Hipercard';
    return '';
  }

  function renderCardForm(card, aprovado) {
    card = card || { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' };
    var dig = u.apenasDigitos(card.numero || '');
    var band = bandeiraIcon(dig);
    return (
      '<div class="px-card-form">' +
        '<div class="px-card-form__head">' +
          '<div class="form-label" style="margin:0">Dados do cartão</div>' +
          (band ? '<span class="px-card__band">' + u.esc(band) + '</span>' : '') +
          (aprovado ? '<span class="px-card__ok"><iconify-icon icon="ph:check-circle-fill" width="16" height="16"></iconify-icon> Aprovado (simulado)</span>' : '') +
        '</div>' +
        (aprovado ? '' : '<p class="form-hint" style="margin:6px 0 12px">Preencha os dados abaixo para simular o pagamento. Nenhum dado é enviado ou cobrado.</p>') +
        '<div class="form-grid">' +
          '<div class="form-group" id="g-px-numero" style="grid-column:1/-1"><label class="form-label" for="f-px-numero">Número do cartão <span class="req">*</span></label><input class="form-control" id="f-px-numero" type="text" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" autocomplete="cc-number" value="' + u.esc(card.numero) + '"><div class="form-error">Informe os 16 dígitos do cartão.</div></div>' +
          '<div class="form-group" id="g-px-nome" style="grid-column:1/-1"><label class="form-label" for="f-px-nome">Nome impresso no cartão <span class="req">*</span></label><input class="form-control" id="f-px-nome" type="text" autocomplete="cc-name" placeholder="Como está no cartão" value="' + u.esc(card.nome || '') + '"><div class="form-error">Informe o nome do titular.</div></div>' +
          '<div class="form-group" id="g-px-validade"><label class="form-label" for="f-px-validade">Validade <span class="req">*</span></label><input class="form-control" id="f-px-validade" type="text" inputmode="numeric" maxlength="5" placeholder="MM/AA" autocomplete="cc-exp" value="' + u.esc(card.validade) + '"><div class="form-error">Informe MM/AA.</div></div>' +
          '<div class="form-group" id="g-px-cvv"><label class="form-label" for="f-px-cvv">CVV <span class="req">*</span></label><input class="form-control" id="f-px-cvv" type="text" inputmode="numeric" maxlength="4" placeholder="123" autocomplete="cc-csc" value="' + u.esc(card.cvv) + '"><div class="form-error">Informe o CVV.</div></div>' +
          '<div class="form-group" id="g-px-parcelas" style="grid-column:1/-1"><label class="form-label" for="f-px-parcelas">Parcelamento</label><select class="form-control" id="f-px-parcelas">' +
            ['1x sem juros','2x sem juros','3x sem juros','4x sem juros','5x sem juros','6x sem juros'].map(function (o) { var v = o.charAt(0); return '<option value="' + v + '"' + (String(card.parcelas) === v ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
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
      if (!dados._pixCopiaECola) dados._pixCopiaECola = pixCopiaECola();
      return renderPixArea(aprovado, dados._pixCopiaECola);
    }
    if (tipo === 'cartao') return renderCardForm(dados.card, aprovado);
    return '';
  }

  function renderTrocoWrap(dados) {
    if (dados.pagamento === 'Dinheiro' && dados.momentoPagamento === 'na-entrega') return renderTroco(dados);
    return '';
  }

  function renderControles(dados) {
    return (
      '<div class="opts opts--2col" id="pg-metodos">' + renderMetodos(dados.pagamento) + '</div>' +
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
        if (!c.nome || !c.nome.trim()) erros.push('Informe o nome impresso no cartão.');
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
  /* INICIALIZAÇÃO                                                        */
  /* ------------------------------------------------------------------ */
  function init(container, dados, onSimular, opt) {
    opt = opt || {};
    var onValidarExtra = opt.onValidarExtra;
    if (!container) return;
    if (!dados.card) dados.card = { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' };
    if (dados.card.parcelas === undefined) dados.card.parcelas = '1';
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
    function bindPixCopia() {
      var btn = dinamicoEl && dinamicoEl.querySelector('#pix-copiar-btn');
      var code = dinamicoEl && dinamicoEl.querySelector('#pix-copia-code');
      if (btn && code) btn.addEventListener('click', function () {
        var txt = code.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { SS.ui.toast('Código Pix copiado!', 'success'); }, function () { fallbackCopy(txt); });
        else fallbackCopy(txt);
        function fallbackCopy(t) {
          var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); SS.ui.toast('Código Pix copiado!', 'success'); } catch (e) { SS.ui.toast('Copie manualmente o código Pix.', 'error'); }
          document.body.removeChild(ta);
        }
      });
    }
    function atualizarDinamico() {
      if (!dinamicoEl) return;
      dinamicoEl.innerHTML = renderDinamico(dados);
      bindPixCopia();
      var num = dinamicoEl.querySelector('#f-px-numero');
      if (num) {
        num.addEventListener('input', function () { num.value = maskNumero(num.value); dados.card.numero = num.value; var b = dinamicoEl.querySelector('.px-card__band'); if (b) b.textContent = bandeiraIcon(u.apenasDigitos(num.value)); });
        num.addEventListener('blur', function () { dados.card.numero = num.value; });
      }
      var nome = dinamicoEl.querySelector('#f-px-nome');
      if (nome) {
        nome.addEventListener('input', function () { dados.card.nome = nome.value; });
        nome.addEventListener('blur', function () { dados.card.nome = nome.value.trim(); });
      }
      var val = dinamicoEl.querySelector('#f-px-validade');
      if (val) {
        val.addEventListener('input', function () { val.value = maskValidade(val.value); dados.card.validade = val.value; });
        val.addEventListener('blur', function () { dados.card.validade = val.value; });
      }
      var cvv = dinamicoEl.querySelector('#f-px-cvv');
      if (cvv) {
        cvv.addEventListener('input', function () { cvv.value = maskCvv(cvv.value); dados.card.cvv = cvv.value; });
        cvv.addEventListener('blur', function () { dados.card.cvv = cvv.value; });
      }
      var parc = dinamicoEl.querySelector('#f-px-parcelas');
      if (parc) parc.addEventListener('change', function () { dados.card.parcelas = parc.value; });
    }
    function atualizarTroco() {
      if (!trocoWrap) return;
      trocoWrap.innerHTML = renderTrocoWrap(dados);
      trocoWrap.classList.toggle('hidden', renderTrocoWrap(dados) === '');
      trocoWrap.querySelectorAll('input[name="troco"]').forEach(function (r) {
        r.addEventListener('change', function () { dados.troco = r.value === 'sim'; if (!dados.troco) dados.trocoPara = ''; atualizarTroco(); });
      });
      var tp = trocoWrap.querySelector('#f-trocoPara');
      if (tp) {
        tp.addEventListener('input', function () { var v = tp.value.replace(/\D/g, ''); if (v) v = (Number(v) / 100).toFixed(2).replace('.', ','); tp.value = v; dados.trocoPara = tp.value; });
        tp.addEventListener('blur', function () { dados.trocoPara = tp.value.trim(); });
      }
    }
    function resetErros() {
      ['#g-px-numero', '#g-px-nome', '#g-px-validade', '#g-px-cvv'].forEach(function (id) { var g = container.querySelector(id); if (g) g.classList.remove('invalid'); });
    }

    container.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'momento') {
        dados.momentoPagamento = t.value;
        // mantém forma já escolhida (mesma lista para antecipado/na-entrega) — apenas reseta estado de aprovação
        dados.pagamentoAprovado = false;
        // preserva dados.pagamento; apenas limpa pix/card se trocar de tipo? mantém para não perder seleção
        atualizarMetodos(); atualizarDinamico(); atualizarTroco();
        if (gForma) gForma.classList.remove('invalid'); return;
      }
      if (t.name === 'f-forma') {
        dados.pagamento = t.value; dados.pagamentoAprovado = false;
        dados.card = { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' };
        dados.troco = false; dados.trocoPara = ''; dados._pixCopiaECola = pixCopiaECola();
        atualizarDinamico(); atualizarTroco();
        if (gForma) gForma.classList.remove('invalid'); return;
      }
      if (t.name === 'troco') { dados.troco = t.value === 'sim'; if (!dados.troco) dados.trocoPara = ''; atualizarTroco(); }
    });

    if (simBtn) {
      simBtn.addEventListener('click', function () {
        resetErros();
        var v = validar(dados);
        if (!v.ok) {
          if (gForma) gForma.classList.add('invalid');
          if (dados.pagamento && tipoMetodo(dados.pagamento) === 'cartao') {
            ['#g-px-numero', '#g-px-nome', '#g-px-validade', '#g-px-cvv'].forEach(function (id) { var el = container.querySelector(id); if (el) el.classList.add('invalid'); });
          }
          SS.ui.toast(v.erros.join(' '), 'error'); return;
        }
        if (gForma) gForma.classList.remove('invalid');
        if (typeof onValidarExtra === 'function' && !onValidarExtra()) return;
        dados._simulando = true; simBtn.disabled = true; simBtn.setAttribute('aria-busy', 'true'); simBtn.textContent = 'Simulando pagamento…';
        setTimeout(function () {
          dados.pagamentoAprovado = true; dados._simulando = false;
          atualizarDinamico(); atualizarTroco();
          simBtn.disabled = false; simBtn.removeAttribute('aria-busy'); simBtn.textContent = 'Pagamento simulado ✓';
          SS.ui.toast('Pagamento simulado aprovado!', 'success');
          if (typeof onSimular === 'function') onSimular();
        }, 900);
      });
    }
    atualizarDinamico(); atualizarTroco();
  }

  function cardUltimos4(dados) {
    var d = u.apenasDigitos((dados.card || {}).numero || '');
    return d.length >= 4 ? d.slice(-4) : '';
  }
  function cardMarca(dados) {
    var d = u.apenasDigitos((dados.card || {}).numero || '');
    if (!d) return '';
    var f = d.charAt(0);
    if (f === '3') return 'Elo/Amex';
    if (f === '4') return 'Visa';
    if (f === '5' || f === '2') return 'Mastercard';
    if (f === '6') return 'Elo/Hipercard';
    return 'Cartão';
  }

  SS.pagamento = {
    getMetodos: getMetodos, getMetodo: getMetodo, tipoMetodo: tipoMetodo,
    renderMetodos: renderMetodos, renderControles: renderControles,
    renderPixQr: renderPixQr, renderCardForm: renderCardForm,
    renderDinamico: renderDinamico, renderTroco: renderTroco,
    validar: validar, init: init, cardUltimos4: cardUltimos4, cardMarca: cardMarca,
  };
})(window.SS);
