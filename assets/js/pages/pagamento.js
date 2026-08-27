/* =========================================================================
   SUBLIME SONHOS — PAGAMENTO (módulo compartilhado)
   UI unificada de forma de pagamento usada nas telas de carrinho, encomenda
   e bolo personalizado.

   - Checkboxes com ícone (mesmos métodos para "antecipado" e "na entrega")
   - Pix: geração BR Code real (BACEN) via SS.pix, QR Code, timer e verificação
   - Cartão: formulário completo
   - Verificação Pix: pendente → aguardando confirmação → pago (com polling)
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
  function getMetodosFiltrados(dados) {
    var todos = getMetodos();
    if (dados && dados.momentoPagamento === 'antecipado') {
      var soPix = todos.filter(function(m){ return m.tipo === 'pix'; });
      return soPix.length ? soPix : todos;
    }
    return todos;
  }

  /* ------------------------------------------------------------------ */
  /* CHECKBOXES COM ÍCONE                                                */
  /* ------------------------------------------------------------------ */
  function renderMetodos(selecionado, dadosCtx) {
    var list = dadosCtx ? getMetodosFiltrados(dadosCtx) : getMetodos();
    if (!list.length) return '<p class="text-sm text-muted">Nenhuma forma de pagamento disponível.</p>';
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
  /* QR CODE MOCKADO fallback (quando offline ou sem payload)             */
  /* ------------------------------------------------------------------ */
  var QR_SEED_BASE = 'sublime-pix-mock-2026';
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
    return h;
  }
  function renderPixQrMock(aprovado, seedExtra) {
    var n = 21, cs = 8, size = n * cs;
    var seed = (aprovado ? QR_SEED_BASE + '-pago-' : QR_SEED_BASE + '-') + (seedExtra||'');
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
    fillFinder(0, 0); fillFinder(0, n - 7); fillFinder(n - 7, 0);
    for (var k = 8; k < n - 8; k++) { grid[6][k] = (k % 2 === 0) ? 1 : 0; grid[k][6] = (k % 2 === 0) ? 1 : 0; }
    var rects = '';
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (grid[i][j]) rects += '<rect x="' + (j * cs) + '" y="' + (i * cs) + '" width="' + cs + '" height="' + cs + '" rx="1"/>';
    var label = aprovado ? 'Pago ✓' : 'QR Code Pix';
    return (
      '<div class="pix-qr-wrap' + (aprovado ? ' is-pago' : '') + '" data-aprovado="' + (aprovado ? '1' : '0') + '">' +
        '<svg class="pix-qr" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="QR Code Pix (fallback)">' +
          '<rect width="' + size + '" height="' + size + '" rx="8" class="pix-qr__bg"/>' + rects +
        '</svg>' +
        '<div class="pix-qr__label">' + label + '</div>' +
      '</div>'
    );
  }

  function renderPixQrReal(payload, aprovado, status) {
    var size = 168;
    var isPago = status === 'pago';
    var label = isPago ? 'Pago ✓' : (status === 'expirado' ? 'Expirado' : 'QR Code Pix');
    // tenta usar API externa; fallback inline é mock caso img falhe (onerror troca)
    var qrUrl = '';
    try { qrUrl = SS.pix && SS.pix.qrImageUrl ? SS.pix.qrImageUrl(payload, 300) : ''; } catch(e){ qrUrl=''; }
    if (!payload || !qrUrl) return renderPixQrMock(isPago, payload);
    // usa img com fallback para mock svg se falhar
    var mockFallback = encodeURIComponent(renderPixQrMock(isPago, payload).replace(/"/g,"'"));
    return (
      '<div class="pix-qr-wrap' + (isPago ? ' is-pago' : '') + (status==='expirado' ? ' is-expirado' : '') + '" data-aprovado="' + (isPago ? '1' : '0') + '">' +
        '<img class="pix-qr pix-qr--img" src="' + qrUrl + '" width="' + size + '" height="' + size + '" alt="QR Code Pix" style="width:'+size+'px;height:'+size+'px;border-radius:14px;border:1px solid var(--line);background:#fff;padding:8px;box-shadow:var(--shadow-sm);display:block;margin:0 auto" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'block\'">' +
        '<div style="display:none">' + renderPixQrMock(isPago, payload) + '</div>' +
        '<div class="pix-qr__label">' + label + '</div>' +
      '</div>'
    );
  }

  function statusBadgePix(status) {
    var map = {
      'pendente': { label: 'Aguardando pagamento', cls: 'pix-status--pendente', icon: 'ph:clock' },
      'aguardando_confirmacao': { label: 'Aguardando confirmação da loja', cls: 'pix-status--aguardando', icon: 'ph:clock-countdown' },
      'pago': { label: 'Pagamento confirmado', cls: 'pix-status--pago', icon: 'ph:check-circle-fill' },
      'expirado': { label: 'QR expirado', cls: 'pix-status--expirado', icon: 'ph:warning-circle' },
      'cancelado': { label: 'Cancelado', cls: 'pix-status--expirado', icon: 'ph:x-circle' }
    };
    var s = map[status] || map['pendente'];
    return '<span class="pix-status '+s.cls+'"><iconify-icon icon="'+s.icon+'" width="16" height="16"></iconify-icon> '+s.label+'</span>';
  }

  function renderPixAreaComPagamento(pg, aprovado) {
    // pg é objeto SS.pix pagamento
    if (!pg) {
      return '<div class="pix-area"><p class="text-sm text-muted">Erro ao gerar Pix. Recarregue a página.</p></div>';
    }
    var status = pg.status || (aprovado ? 'pago' : 'pendente');
    var isPago = status === 'pago';
    var isExpirado = status === 'expirado';
    var isAguardando = status === 'aguardando_confirmacao';
    var valorTxt = pg.valor !== null && pg.valor !== undefined && !isNaN(pg.valor) ? u.fmtBRL(pg.valor) : 'Valor a confirmar com a loja';
    var comValor = pg.valor !== null && !isNaN(pg.valor) && Number(pg.valor)>0;
    var pixCfg = (SS.pix && SS.pix.getPixConfig) ? SS.pix.getPixConfig() : null;
    var nomePix = pixCfg ? pixCfg.nome : (pg.nome||'Sublime Sonhos');
    var chaveMostra = pixCfg ? pixCfg.chave : pg.chave;
    var tipoChave = pixCfg ? pixCfg.tipo : pg.tipoChave;
    var chavePreview = '';
    try { chavePreview = SS.pix.mascaraPreview(tipoChave, chaveMostra) || chaveMostra; } catch(e){ chavePreview=chaveMostra; }
    var tempo = (SS.pix && SS.pix.tempoRestante) ? SS.pix.tempoRestante(pg) : { txt: '--:--', expirado:false };
    var timerHtml = '';
    if (status==='pendente') {
      timerHtml = '<div class="pix-timer" data-pix-timer="'+pg.id+'"><iconify-icon icon="ph:timer" width="14" height="14"></iconify-icon> Expira em <strong>'+u.esc(tempo.txt)+'</strong></div>';
    } else if (isAguardando) {
      timerHtml = '<div class="pix-timer pix-timer--aguardando"><iconify-icon icon="ph:seal-check" width="14" height="14"></iconify-icon> Você informou o pagamento — a loja confirma em instantes.</div>';
    } else if (isPago) {
      timerHtml = '<div class="pix-timer pix-timer--pago"><iconify-icon icon="ph:check-circle" width="14" height="14"></iconify-icon> Confirmado em '+ new Date(pg.ultimaVerificacao||pg.criadoEm).toLocaleTimeString('pt-BR') +'</div>';
    } else if (isExpirado) {
      timerHtml = '<div class="pix-timer pix-timer--expirado"><iconify-icon icon="ph:warning" width="14" height="14"></iconify-icon> Tempo esgotado — gere um novo Pix.</div>';
    }

    var hint = '';
    if (isPago) hint = '<p class="pix-area__hint" style="color:var(--success);font-weight:700"><iconify-icon icon="ph:check-circle-fill" width="16" height="16" style="vertical-align:-2px"></iconify-icon> Pagamento Pix confirmado! Você já pode enviar o pedido.</p>';
    else if (isExpirado) hint = '<p class="pix-area__hint" style="color:var(--danger);font-weight:700">QR Code expirado. Clique em “Gerar novo Pix” para continuar.</p>';
    else if (isAguardando) hint = '<p class="pix-area__hint">Aguardando confirmação da loja. Se já pagou, clique em <strong>Enviar comprovante no WhatsApp</strong>.</p>';
    else hint = '<p class="pix-area__hint">Escaneie o QR Code com o app do seu banco <strong>ou</strong> copie o código abaixo. Depois pague no banco e clique em <strong>Enviar comprovante no WhatsApp</strong>.</p>';

    var valorBadge = comValor ? '<span class="pix-valor-badge">'+u.esc(valorTxt)+'</span>' : '<span class="pix-valor-badge pix-valor-badge--consulta">'+u.esc(valorTxt)+'</span>';
    var semChave = !chaveMostra || chaveMostra.trim().length<3;

    return (
      '<div class="pix-area" data-pix-id="'+u.esc(pg.id)+'">' +
        '<div class="pix-area__head">' +
          '<span class="pix-area__badge"><iconify-icon icon="ph:qr-code" width="16" height="16"></iconify-icon> Pix — copia e cola</span>' +
          statusBadgePix(status) +
        '</div>' +
        (semChave ? '<div class="admin-banner" style="background:var(--danger-bg);color:var(--danger);border:1px solid rgba(179,64,63,0.18);margin-bottom:12px;font-size:12.5px"><iconify-icon icon="ph:warning-circle" width="16" height="16"></iconify-icon> <span><strong>Pix da loja não configurado.</strong> A proprietária precisa cadastrar a chave em Admin → Pix & Pagamentos.</span></div>' : '') +
        '<div class="pix-area__grid">' +
          renderPixQrReal(pg.payload, isPago, status) +
          '<div class="pix-area__info">' +
            '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">'+valorBadge+'<span class="text-sm text-muted">TXID: '+u.esc(pg.txid)+'</span></div>' +
            timerHtml +
            hint +
            '<div class="pix-copia">' +
              '<div class="pix-copia__label">Pix copia e cola '+(comValor? '' : '(sem valor fixo)')+'</div>' +
              '<div class="pix-copia__code" id="pix-copia-code">'+u.esc(pg.payload)+'</div>' +
              '<button type="button" class="btn btn--outline btn--sm pix-copia__btn" id="pix-copiar-btn"><iconify-icon icon="ph:copy" width="16" height="16"></iconify-icon> Copiar código</button>' +
            '</div>' +
            '<div class="pix-dados-loja" style="margin-top:10px;background:var(--sand-3);border:1px solid var(--line);border-radius:12px;padding:10px;display:grid;gap:4px;font-size:12.5px"><div><strong>Recebedor:</strong> '+u.esc(nomePix)+' · <strong>Cidade:</strong> '+u.esc(pixCfg? pixCfg.cidade : pg.cidade)+'</div><div><strong>Chave Pix ('+u.esc(tipoChave||'')+'):</strong> '+u.esc(chavePreview)+'</div><div class="text-sm text-muted" style="font-size:11px">Confira o nome ao pagar — deve aparecer “'+u.esc(nomePix)+'”.</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="pix-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' +
          (isExpirado ? '<button type="button" class="btn btn--primary btn--sm" id="pix-regenerar-btn"><iconify-icon icon="ph:arrows-clockwise" width="16" height="16"></iconify-icon> Gerar novo Pix</button>' : '') +
          (!isPago && !isExpirado ? '<button type="button" class="btn btn--whatsapp btn--sm" id="pix-comprovante-btn"><iconify-icon icon="ph:receipt" width="16" height="16"></iconify-icon> Enviar comprovante no WhatsApp</button>' : (isPago ? '<span class="text-sm" style="color:var(--success);font-weight:700"><iconify-icon icon="ph:check-circle-fill" width="16" height="16"></iconify-icon> Pagamento confirmado</span>' : '')) +
        '</div>' +
        '<p class="form-hint" style="margin-top:10px;font-size:11.5px">O pagamento é feito no app do seu banco. Após pagar, clique em “Já paguei” e a loja confirma o recebimento pelo WhatsApp.</p>' +
      '</div>'
    );
  }

  function renderPixAreaSimples(aprovado, copiaECola) {
    // fallback antigo quando SS.pix indisponível
    copiaECola = copiaECola || '';
    return (
      '<div class="pix-area">' +
        '<div class="pix-area__head">' +
          '<span class="pix-area__badge"><iconify-icon icon="ph:qr-code" width="16" height="16"></iconify-icon> Pagamento via Pix</span>' +
          (aprovado ? '<span class="pix-area__ok"><iconify-icon icon="ph:check-circle-fill" width="18" height="18"></iconify-icon> Pagamento confirmado</span>' : '') +
        '</div>' +
        '<div class="pix-area__grid">' +
          renderPixQrMock(aprovado, copiaECola) +
          '<div class="pix-area__info">' +
            (aprovado
              ? '<p class="pix-area__hint" style="color:var(--success);font-weight:700">Pagamento Pix confirmado!</p>'
              : '<p class="pix-area__hint">Escaneie o QR Code ou copie o código abaixo.</p>') +
            '<div class="pix-copia">' +
              '<div class="pix-copia__label">Pix copia e cola</div>' +
              '<div class="pix-copia__code" id="pix-copia-code">' + u.esc(copiaECola) + '</div>' +
              '<button type="button" class="btn btn--outline btn--sm pix-copia__btn" id="pix-copiar-btn"><iconify-icon icon="ph:copy" width="16" height="16"></iconify-icon> Copiar código</button>' +
            '</div>' +
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
          (aprovado ? '<span class="px-card__ok"><iconify-icon icon="ph:check-circle-fill" width="16" height="16"></iconify-icon> Confirmado</span>' : '') +
        '</div>' +
        (aprovado ? '' : '<p class="form-hint" style="margin:6px 0 12px">Preencha os dados abaixo para registrar o pagamento. Nenhum dado é cobrado automaticamente; a confirmação é feita pela loja via WhatsApp.</p>') +
        '<div class="form-grid">' +
          '<div class="form-group" id="g-px-numero"><label class="form-label" for="f-px-numero">Número do cartão <span class="req">*</span></label><input class="form-control" id="f-px-numero" type="text" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" autocomplete="cc-number" value="' + u.esc(card.numero) + '"><div class="form-error">Informe os 16 dígitos do cartão.</div></div>' +
          '<div class="form-group" id="g-px-nome"><label class="form-label" for="f-px-nome">Nome impresso no cartão <span class="req">*</span></label><input class="form-control" id="f-px-nome" type="text" autocomplete="cc-name" placeholder="Como está no cartão" value="' + u.esc(card.nome || '') + '"><div class="form-error">Informe o nome do titular.</div></div>' +
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
  /* TROCO                                                                 */
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
  /* ÁREA DINÂMICA                                                        */
  /* ------------------------------------------------------------------ */
  function garantirPagamentoPix(dados, opt) {
    // Pix só gera QR quando é pagamento antecipado. Na entrega/retirada paga presencialmente.
    if (dados.momentoPagamento === 'na-entrega') return null;
    var valor = null;
    if (opt && typeof opt.getValorTotal === 'function') {
      try { valor = opt.getValorTotal(); } catch(e){ valor=null; }
    } else if (opt && opt.valorTotal !== undefined) valor = opt.valorTotal;
    if (valor === null || valor === undefined) valor = dados._valorPix !== undefined ? dados._valorPix : null;
    if (valor !== null && isNaN(valor)) valor = null;
    if (valor !== null) valor = Math.round(Number(valor)*100)/100;
    if (!SS.pix) return null;
    // se Pix da loja não configurado, não gera QR (evita "QR inválido" no banco)
    if (!SS.pix.isPixConfigurado()) {
      dados._valorPix = valor;
      return null;
    }
    if (dados._pixId && SS.pix) {
      var existente = SS.pix.getPagamento(dados._pixId);
      if (existente && existente.payload && existente.status !== 'expirado' && existente.status !== 'cancelado') {
        if (existente.valor !== valor && valor !== null) {
        } else {
          dados._valorPix = valor;
          dados.pagamentoAprovado = existente.status === 'pago';
          dados._pixStatus = existente.status;
          return existente;
        }
      }
    }
    var origem = (opt && opt.origem) || dados._origem || 'carrinho';
    var pedidoNumero = dados._pixPedidoNumero || u.gerarNumeroPedido();
    dados._pixPedidoNumero = pedidoNumero;
    dados._valorPix = valor;
    var novo = SS.pix.criarPagamento({ valor: valor, origem: origem, pedidoNumero: pedidoNumero });
    if (!novo) return null;
    dados._pixId = novo.id;
    dados._pixStatus = novo.status;
    dados.pagamentoAprovado = false;
    return novo;
  }

  function renderDinamico(dados, opt) {
    if (!dados.pagamento) return '';
    var tipo = tipoMetodo(dados.pagamento);
    var aprovado = !!dados.pagamentoAprovado;
    var naEntrega = dados.momentoPagamento === 'na-entrega';
    if (tipo === 'pix') {
      // na entrega/retirada não gera QR — paga presencialmente
      if (naEntrega) {
        return '<div class="pix-area" style="background:#fdfbf7;border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;gap:12px;align-items:center"><iconify-icon icon="ph:storefront" width="28" height="28" style="color:var(--terra)"></iconify-icon><div><strong>Pix na entrega/retirada</strong><p class="text-sm text-muted" style="margin:4px 0 0">Nenhum QR é gerado agora. Você pagará via Pix presencialmente, direto para a chave da loja na hora da entrega ou retirada. Leve seu celular.</p></div></div>';
      }
      if (!SS.pix) {
        if (!dados._pixCopiaECola) dados._pixCopiaECola = 'PIX-MOCK-' + Math.random().toString(36).slice(2);
        return renderPixAreaSimples(aprovado, dados._pixCopiaECola);
      }
      if (!SS.pix.isPixConfigurado()) {
        return (
          '<div class="pix-area">' +
            '<div class="admin-banner" style="background:var(--danger-bg);color:var(--danger);border:1px solid rgba(179,64,63,0.18);margin-bottom:12px;font-size:12.5px"><iconify-icon icon="ph:warning-circle" width="16" height="16"></iconify-icon> <span><strong>Pix indisponível:</strong> a loja ainda não cadastrou a chave Pix em Admin → Pix & Pagamentos. Escolha outra forma ou contate a loja no WhatsApp.</span></div>' +
            '<p class="text-sm text-muted">Enquanto isso você pode finalizar com <strong>Dinheiro</strong>, <strong>Cartão</strong> ou <strong>Link de pagamento</strong>.</p>' +
          '</div>'
        );
      }
      var pg = garantirPagamentoPix(dados, opt);
      if (!pg) return '<div class="admin-banner" style="background:var(--danger-bg);color:var(--danger);border:1px solid rgba(179,64,63,0.18)"><iconify-icon icon="ph:warning-circle" width="16" height="16"></iconify-icon> <span>Não foi possível gerar o Pix. Verifique a chave em Admin → Pix & Pagamentos e gere novamente.</span></div>';
      if (pg.status === 'pago') dados.pagamentoAprovado = true;
      else if (pg.status === 'expirado' || pg.status === 'cancelado') dados.pagamentoAprovado = false;
      return renderPixAreaComPagamento(pg, aprovado);
    }
    if (tipo === 'cartao') {
      if (naEntrega) {
        return '<div class="px-card-form" style="background:#fdfbf7;border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;gap:12px;align-items:center"><iconify-icon icon="ph:credit-card" width="28" height="28" style="color:var(--terra)"></iconify-icon><div><strong>Cartão na entrega/retirada</strong><p class="text-sm text-muted" style="margin:4px 0 0">Nenhum dado do cartão é solicitado agora. O pagamento será feito presencialmente na maquininha da loja.</p></div></div>';
      }
      return renderCardForm(dados.card, aprovado);
    }
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
  /* VALIDAÇÃO                                                            */
  /* ------------------------------------------------------------------ */
  function validar(dados) {
    var erros = [];
    if (!dados.momentoPagamento) erros.push('Escolha o momento do pagamento.');
    if (!dados.pagamento) erros.push('Escolha a forma de pagamento.');
    else {
      var tipo = tipoMetodo(dados.pagamento);
      var naEntrega = dados.momentoPagamento === 'na-entrega';
      if (tipo === 'pix') {
        if (naEntrega) {
          // paga presencialmente — sem QR, sem validação de Pix
        } else {
          if (SS.pix && !SS.pix.isPixConfigurado()) {
            erros.push('Pix indisponível: a loja ainda não configurou a chave. Escolha outra forma.');
          }
          if (dados._pixId && SS.pix) {
            var pg = SS.pix.getPagamento(dados._pixId);
            if (pg && pg.status === 'expirado') erros.push('Seu QR Code Pix expirou. Gere um novo código.');
          } else if (SS.pix && SS.pix.isPixConfigurado() && !dados._pixId) {
            erros.push('Gere o QR Code Pix antes de continuar.');
          }
        }
      }
      if (tipo === 'cartao') {
        if (naEntrega) {
          // cartão presencial — não pede dados agora
        } else {
          var c = dados.card || {};
          if (u.apenasDigitos(c.numero || '').length < 16) erros.push('Informe os 16 dígitos do cartão.');
          if (!c.nome || !c.nome.trim()) erros.push('Informe o nome impresso no cartão.');
          var mVal = (c.validade || '').match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
          if (!mVal) erros.push('Informe a validade (MM/AA).');
          else {
            var mm = Number(mVal[1]);
            var aa = 2000 + Number(mVal[2]);
            var hoje = new Date();
            var fimMes = new Date(aa, mm, 0); // último dia do mês da validade
            if (fimMes < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) erros.push('Cartão vencido. Verifique a validade.');
          }
          if (u.apenasDigitos(c.cvv || '').length < 3) erros.push('Informe o CVV.');
        }
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
  var pixTimerInterval = null;
  var pixPollInterval = null;

  function pararPixTimers(){
    if (pixTimerInterval) { clearInterval(pixTimerInterval); pixTimerInterval=null; }
    if (pixPollInterval) { clearInterval(pixPollInterval); pixPollInterval=null; }
  }

  function iniciarPixTimers(pg, onUpdate){
    pararPixTimers();
    if (!pg || pg.status !== 'pendente') return;
    pixTimerInterval = setInterval(function(){
      var t = SS.pix.tempoRestante(pg);
      var el = document.querySelector('[data-pix-timer="'+pg.id+'"]');
      if (el) {
        if (t.expirado) {
          el.innerHTML = '<iconify-icon icon="ph:warning" width="14" height="14"></iconify-icon> Expirado';
          el.className = 'pix-timer pix-timer--expirado';
          if (onUpdate) onUpdate();
        } else {
          el.innerHTML = '<iconify-icon icon="ph:timer" width="14" height="14"></iconify-icon> Expira em <strong>'+u.esc(t.txt)+'</strong>';
        }
      }
      // pega status atualizado do storage
      var cur = SS.pix.getPagamento(pg.id);
      if (cur && cur.status !== pg.status) {
        pg.status = cur.status;
        if (onUpdate) onUpdate();
        if (cur.status !== 'pendente') pararPixTimers();
      }
    }, 1000);
    // polling silencioso a cada 12s
    pixPollInterval = setInterval(function(){
      if (!pg) return;
      SS.pix.verificarPagamento(pg.id).then(function(res){
        if (res && res.pg && res.pg.status !== pg.status) {
          pg.status = res.pg.status;
          if (onUpdate) onUpdate();
          if (res.pg.status === 'pago') {
            pararPixTimers();
            SS.ui.toast('Pagamento Pix confirmado!','success');
          }
        }
      });
    }, 12000);
  }

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

    function syncGFormaVis() {
      if (!gForma) return;
      var deveMostrar = !!dados.momentoPagamento;
      gForma.classList.toggle('hidden', !deveMostrar);
      // animação suave quando revela
      if (deveMostrar) {
        gForma.style.opacity = '0';
        gForma.style.transform = 'translateY(6px)';
        requestAnimationFrame(function(){
          gForma.style.transition = 'opacity 220ms ease, transform 220ms ease';
          gForma.style.opacity = '1';
          gForma.style.transform = 'translateY(0)';
        });
      }
    }

    function atualizarMetodos() {
      if (metodosEl) metodosEl.innerHTML = renderMetodos(dados.pagamento, dados);
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
    function bindPixAcoes() {
      var pg = dados._pixId && SS.pix ? SS.pix.getPagamento(dados._pixId) : null;
      var regenBtn = dinamicoEl && dinamicoEl.querySelector('#pix-regenerar-btn');
      var compBtn = dinamicoEl && dinamicoEl.querySelector('#pix-comprovante-btn');

      if (regenBtn && pg) regenBtn.addEventListener('click', function(){
        var valor = dados._valorPix;
        var origem = opt.origem || 'carrinho';
        var novo = SS.pix.criarPagamento({ valor: valor, origem: origem, pedidoNumero: dados._pixPedidoNumero });
        if (!novo) { SS.ui.toast('Pix não configurado. Configure em Admin → Pix & Pagamentos.','error'); return; }
        dados._pixId = novo.id;
        dados._pixStatus = novo.status;
        dados.pagamentoAprovado=false;
        SS.ui.toast('Novo QR Pix gerado!','');
        atualizarDinamico(); atualizarTroco();
      });
      if (compBtn && pg) compBtn.addEventListener('click', function(){
        resetErros();
        var v = validar(dados);
        if (!v.ok) {
          if (gForma) gForma.classList.add('invalid');
          SS.ui.toast(v.erros.join(' '), 'error'); return;
        }
        if (gForma) gForma.classList.remove('invalid');
        if (typeof onValidarExtra === 'function' && !onValidarExtra()) return;
        // marca no admin que o cliente informou o pagamento
        try { if (SS.pix && dados._pixId) SS.pix.marcarComprovanteEnviado(dados._pixId); } catch(e){}
        // Envia pedido completo com dados do Pix (TXID, valor) — serve como comprovante
        if (typeof onSimular === 'function') onSimular();
      });
    }

    function atualizarDinamico() {
      if (!dinamicoEl) return;
      pararPixTimers();
      dinamicoEl.innerHTML = renderDinamico(dados, opt);
      bindPixCopia();
      bindPixAcoes();
      // inicia timers se for pix pendente (só para antecipado)
      var pg = dados._pixId && SS.pix ? SS.pix.getPagamento(dados._pixId) : null;
      var isPixAnt = tipoMetodo(dados.pagamento)==='pix' && dados.momentoPagamento==='antecipado';
      if (simBtn) {
        if (isPixAnt) simBtn.classList.add('hidden');
        else simBtn.classList.remove('hidden');
      }
      if (dados.momentoPagamento === 'na-entrega') {
        if (simBtn) {
          simBtn.textContent = 'Enviar pedido';
          simBtn.classList.add('btn--whatsapp');
          simBtn.classList.remove('btn--primary');
          simBtn.disabled = false;
          simBtn.removeAttribute('aria-busy');
        }
      } else if (isPixAnt && pg && pg.status==='pendente') {
        iniciarPixTimers(pg, function(){ atualizarDinamico(); atualizarTroco(); });
      } else if (isPixAnt && pg && pg.status==='pago') {
        // já pago — mantém escondido, Pix area mostra confirmado
      } else if (isPixAnt && pg && pg.status==='aguardando_confirmacao') {
        // idem
      } else if (isPixAnt) {
        // pix antecipado sem pg ainda — mantém escondido
      } else if (pg && pg.status==='pendente') {
        iniciarPixTimers(pg, function(){ atualizarDinamico(); atualizarTroco(); });
        if (simBtn) {
          simBtn.textContent = 'Verificar pagamento';
          simBtn.classList.add('btn--primary');
          simBtn.classList.remove('btn--whatsapp');
          simBtn.disabled = false;
        }
      } else if (pg && pg.status==='pago') {
        if (simBtn) { simBtn.textContent='Pagamento confirmado ✓ — Enviar pedido'; simBtn.disabled=false; }
      } else if (pg && pg.status==='aguardando_confirmacao') {
        if (simBtn) { simBtn.textContent='Enviar pedido (aguardando loja confirmar)'; simBtn.disabled=false; }
      } else {
        if (simBtn && tipoMetodo(dados.pagamento)==='pix') {
          if (pg && pg.status==='expirado') simBtn.textContent='Gerar novo Pix';
          else simBtn.textContent='Verificar pagamento';
        }
      }

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
        dados.pagamentoAprovado = false;
        if (dados.momentoPagamento === 'antecipado') {
          var okPix = getMetodosFiltrados(dados).some(function(m){ return m.nome === dados.pagamento; });
          if (!okPix) {
            dados.pagamento = '';
            dados.pagamentoAprovado = false;
            dados.card = { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' };
          }
        }
        // revela Forma de pagamento somente após escolher momento
        syncGFormaVis();
        atualizarMetodos(); atualizarDinamico(); atualizarTroco();
        if (gForma) gForma.classList.remove('invalid'); return;
      }
      if (t.name === 'f-forma') {
        pararPixTimers();
        dados.pagamento = t.value; dados.pagamentoAprovado = false;
        dados.card = { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' };
        dados.troco = false; dados.trocoPara = '';
        // não limpa _pixId para reaproveitar se voltar ao pix; mas se mudou de método, mantém para não gerar lixo
        if (tipoMetodo(t.value) === 'pix') {
          // garante que existe pagamento com valor atual
          garantirPagamentoPix(dados, opt);
        }
        // atualiza botão principal (só para não-Pix; Pix é decidido em atualizarDinamico)
        if (simBtn && tipoMetodo(t.value) !== 'pix') {
          simBtn.textContent = 'Confirmar pagamento';
          simBtn.classList.remove('btn--whatsapp');
          simBtn.disabled = false;
          simBtn.removeAttribute('aria-busy');
        }
        atualizarDinamico(); atualizarTroco();
        if (gForma) gForma.classList.remove('invalid');
        return;
      }
      if (t.name === 'troco') { dados.troco = t.value === 'sim'; if (!dados.troco) dados.trocoPara = ''; atualizarTroco(); }
    });

    if (simBtn) {
      simBtn.addEventListener('click', function () {
        // Na entrega/retirada paga presencialmente — nunca exige QR nem dados de cartão
        if (dados.momentoPagamento === 'na-entrega') {
          resetErros();
          var vNE = validar(dados);
          if (!vNE.ok) {
            if (gForma) gForma.classList.add('invalid');
            SS.ui.toast(vNE.erros.join(' '), 'error'); return;
          }
          if (gForma) gForma.classList.remove('invalid');
          if (typeof onValidarExtra === 'function' && !onValidarExtra()) return;
          if (typeof onSimular === 'function') onSimular();
          return;
        }
        var isPix = tipoMetodo(dados.pagamento) === 'pix' && dados.momentoPagamento === 'antecipado';
        if (isPix) {
          resetErros();
          var vPix = validar(dados);
          if (!vPix.ok) {
            if (gForma) gForma.classList.add('invalid');
            SS.ui.toast(vPix.erros.join(' '), 'error'); return;
          }
          if (gForma) gForma.classList.remove('invalid');
          if (typeof onValidarExtra === 'function' && !onValidarExtra()) return;

          var pg = dados._pixId && SS.pix ? SS.pix.getPagamento(dados._pixId) : null;
          if (!pg) { SS.ui.toast('Gere o QR Code Pix primeiro.', 'error'); return; }
          if (pg.status === 'expirado') { SS.ui.toast('QR expirado. Clique em “Gerar novo Pix”.','error'); return; }
          if (pg.status === 'pago') {
            // já pago → finaliza pedido
            simBtn.disabled=true; simBtn.setAttribute('aria-busy','true'); simBtn.textContent='Enviando pedido...';
            setTimeout(function(){
              simBtn.disabled=false; simBtn.removeAttribute('aria-busy');
              if (typeof onSimular === 'function') onSimular();
            }, 500);
            return;
          }
          if (pg.status === 'aguardando_confirmacao') {
            // permite enviar mesmo aguardando
            if (typeof onSimular === 'function') onSimular();
            return;
          }
          // status pendente → verifica
          simBtn.disabled=true; simBtn.setAttribute('aria-busy','true'); var oldTxt=simBtn.textContent; simBtn.textContent='Verificando Pix...';
          SS.pix.verificarPagamento(pg.id).then(function(res){
            simBtn.disabled=false; simBtn.removeAttribute('aria-busy');
            if (!res.ok) { SS.ui.toast('Erro ao verificar.','error'); simBtn.textContent=oldTxt; return; }
            dados._pixStatus = res.pg.status;
            if (res.pg.status==='pago') {
              dados.pagamentoAprovado=true;
              SS.ui.toast('Pix confirmado! Enviando pedido...','success');
              atualizarDinamico(); atualizarTroco();
              setTimeout(function(){ if (typeof onSimular==='function') onSimular(); }, 600);
            } else if (res.pg.status==='aguardando_confirmacao') {
              SS.ui.toast('Aguardando confirmação da loja. Você pode enviar o pedido agora.','');
              atualizarDinamico(); atualizarTroco();
              simBtn.textContent='Enviar pedido (Pix aguardando confirmação)';
            } else if (res.pg.status==='expirado') {
              SS.ui.toast('Pix expirado. Gere um novo.','error');
              dados.pagamentoAprovado=false;
              atualizarDinamico(); atualizarTroco();
              simBtn.textContent='Gerar novo Pix';
            } else {
              SS.ui.toast('Ainda não identificamos o pagamento. Após pagar no banco, clique em “Já paguei” ou tente verificar novamente em 15s.','');
              simBtn.textContent='Verificar novamente';
              atualizarDinamico(); atualizarTroco();
            }
          });
          return;
        }

        // fluxo normal (cartão, dinheiro, etc)
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
        dados._simulando = true; simBtn.disabled = true; simBtn.setAttribute('aria-busy', 'true'); simBtn.textContent = 'Processando pagamento…';
        setTimeout(function () {
          dados.pagamentoAprovado = true; dados._simulando = false;
          atualizarDinamico(); atualizarTroco();
          simBtn.disabled = false; simBtn.removeAttribute('aria-busy'); simBtn.textContent = 'Pagamento confirmado ✓';
          SS.ui.toast('Pagamento confirmado!', 'success');
          if (typeof onSimular === 'function') onSimular();
        }, 900);
      });
    }
    // inicial — esconde Forma até escolher momento, conforme solicitado
    syncGFormaVis();
    if (tipoMetodo(dados.pagamento)==='pix' && SS.pix) garantirPagamentoPix(dados, opt);
    atualizarDinamico(); atualizarTroco();
    // expõe controle para o caller poder atualizar valor se mudar (ex: entrega)
    dados._refreshPix = function(){
      if (tipoMetodo(dados.pagamento)==='pix' && SS.pix) {
        var pg = SS.pix.getPagamento(dados._pixId);
        var novoValor = opt.getValorTotal ? opt.getValorTotal() : dados._valorPix;
        if (pg && pg.valor !== novoValor && novoValor!==null) {
          var novoPg = SS.pix.criarPagamento({ valor: novoValor, origem: opt.origem||dados._origem||'carrinho', pedidoNumero: dados._pixPedidoNumero });
          if (!novoPg) return;
          dados._pixId = novoPg.id;
          dados._pixStatus = novoPg.status;
          dados._valorPix = novoValor;
          dados.pagamentoAprovado=false;
          atualizarDinamico();
        }
      }
    };
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
    renderPixQr: renderPixQrMock, renderPixQrMock: renderPixQrMock, renderPixQrReal: renderPixQrReal,
    renderCardForm: renderCardForm,
    renderDinamico: function(d, opt){ return renderDinamico(d, opt||{}); }, renderTroco: renderTroco,
    validar: validar, init: init, cardUltimos4: cardUltimos4, cardMarca: cardMarca,
    parar: pararPixTimers,
    _garantirPagamentoPix: garantirPagamentoPix
  };
})(window.SS);
