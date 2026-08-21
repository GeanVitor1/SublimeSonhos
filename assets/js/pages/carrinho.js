/* =========================================================================
   SUBLIME SONHOS — FINALIZAÇÃO DO PEDIDO RÁPIDO (carrinho → WhatsApp)
   Etapas: 1) Itens · 2) Cliente · 3) Retirada/Entrega · 4) Pagamento · 5) Revisão
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;
  var passo = 1;
  var TOTAIS = 5;
  var dados = {
    nome: '', telefone: '',
    modalidade: 'retirada',
    endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: cfg.loja.cidade, referencia: '' },
    pagamento: '', momentoPagamento: '', troco: false, trocoPara: '',
    card: { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' }, pagamentoAprovado: false,
    observacoes: '',
  };

  function valorEntrega() {
    if (cfg.loja.entrega.modo === 'fixa' && dados.modalidade === 'entrega') return cfg.loja.entrega.taxaEntrega;
    if (cfg.loja.entrega.modo === 'bairro' && dados.modalidade === 'entrega') {
      var taxa = cfg.loja.entrega.taxasBairro && cfg.loja.entrega.taxasBairro[dados.endereco.bairro.trim().toLowerCase()];
      return taxa !== undefined && taxa !== null ? taxa : null;
    }
    return dados.modalidade === 'entrega' ? null : 0;
  }

  function totalEstimado() {
    var sub = SS.cart.subtotal();
    var ent = valorEntrega();
    if (ent === null) return null;
    return sub + ent;
  }

  function render() {
    var el = document.getElementById('cart-conteudo');
    var itens = SS.cart.getItens();

    if (!itens.length) {
      var ultimaCat = sessionStorage.getItem('ss_last_catalog_hash') || '#destaques';
      var hrefCat = 'index.html' + (ultimaCat.charAt(0) === '#' ? ultimaCat : '#' + ultimaCat);
      el.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__ico" aria-hidden="true"><iconify-icon icon="ph:bag-simple" width="48" height="48"></iconify-icon></div>' +
          '<h2>Seu carrinho está vazio</h2>' +
          '<p>Adicione produtos ao carrinho para montar seu pedido.</p>' +
          '<div class="flex gap-3 items-center justify-center mt-4" style="flex-wrap:wrap">' +
            '<a class="btn btn--primary btn--lg" href="' + hrefCat + '">Ver produtos</a>' +
            '<a class="btn btn--outline btn--lg" href="encomenda.html">Fazer encomenda</a>' +
          '</div>' +
        '</div>';
      return;
    }

    var sobConsulta = SS.cart.temItensSobConsulta();

    var passos = [];
    for (var i = 1; i <= TOTAIS; i++) {
      passos.push('<div class="steps-bar__item' + (i < passo ? ' done' : i === passo ? ' active' : '') + '"></div>');
    }

    el.innerHTML =
      '<div class="steps-bar" aria-hidden="true">' + passos.join('') + '</div>' +
      '<div class="checkout-grid checkout-grid--sem-resumo">' +
        '<div id="painel-esquerda"></div>' +
      '</div>';

    renderPasso(sobConsulta);
  }

  /* ------------------------------------------------------------------ */
  /* RESUMO                                                              */
  /* ------------------------------------------------------------------ */
  function renderResumo(itens, sobConsulta) {
    var el = document.getElementById('painel-resumo');
    if (!el) return;
    var sub = SS.cart.subtotal();
    var ent = valorEntrega();
    var total = totalEstimado();
    el.innerHTML =
      '<h2>Resumo do pedido</h2>' +
      '<div class="panel__body">' +
        '<div id="resumo-itens">' +
          itens.map(function (item) {
            var ops = SS.cart.formatarOpcoes(item);
            var preco = SS.cart.precoUnitarioItem(item);
            return (
              '<div class="order-summary-item">' +
                (item.imagem ? '<img src="' + u.esc(item.imagem) + '" alt="' + u.esc(item.nome) + '" loading="lazy">' : '') +
                '<div class="order-summary-item__body">' +
                  '<div class="order-summary-item__name">' + item.qty + 'x ' + u.esc(item.nome) + '</div>' +
                  (ops ? '<div class="order-summary-item__opts">' + u.esc(ops) + '</div>' : '') +
                '</div>' +
                '<div class="order-summary-item__price">' + (preco === null ? 'Sob consulta' : u.fmtBRL(preco * item.qty)) + '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>' +
        '<div class="summary-totals">' +
          '<div class="row"><span>Subtotal</span><span>' + u.fmtBRL(sub) + '</span></div>' +
          '<div class="row"><span>Entrega</span><span>' + (ent === null ? 'a confirmar' : u.fmtBRL(ent)) + '</span></div>' +
          '<div class="row total"><span>Total estimado</span><span>' + (total === null ? 'a confirmar' : u.fmtBRL(total)) + '</span></div>' +
        '</div>' +
        (sobConsulta ? '<p class="text-sm text-muted mt-2"><iconify-icon icon="ph:warning-circle" width="15" height="15" style="vertical-align:-2px"></iconify-icon> Itens sem preço definido precisam ser tratados como encomenda — o total será confirmado pela loja.</p>' : '') +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* PAINEL DA ETAPA                                                     */
  /* ------------------------------------------------------------------ */
  function renderPasso(sobConsulta) {
    var el = document.getElementById('painel-esquerda');
    var html = '';

    if (passo === 1) {
      html = '<div class="panel"><h2><span class="n">1</span> Itens do pedido</h2><div class="panel__body" id="passo-itens"></div></div>';
    } else if (passo === 2) {
      html =
        '<div class="panel"><h2><span class="n">2</span> Seus dados</h2><div class="panel__body">' +
          '<div class="form-grid">' +
            '<div class="form-group" id="g-nome"><label class="form-label" for="f-nome">Nome completo <span class="req">*</span></label><input class="form-control" id="f-nome" type="text" value="' + u.esc(dados.nome) + '" autocomplete="name"><div class="form-error">Informe seu nome.</div></div>' +
            '<div class="form-group" id="g-telefone"><label class="form-label" for="f-telefone">WhatsApp <span class="req">*</span></label><input class="form-control" id="f-telefone" type="tel" inputmode="tel" placeholder="(73) 90000-0000" value="' + u.esc(dados.telefone) + '" autocomplete="tel"><div class="form-error">Informe um telefone válido com DDD.</div></div>' +
          '</div>' +
        '</div></div>';
    } else if (passo === 3) {
      html =
        '<div class="panel"><h2><span class="n">3</span> Retirada ou entrega</h2><div class="panel__body">' +
          '<div class="opts opts--2col">' +
            '<label class="opt' + (dados.modalidade === 'retirada' ? ' selected' : '') + '"><input type="radio" name="modalidade" value="retirada"' + (dados.modalidade === 'retirada' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Retirada no local</span></label>' +
            '<label class="opt' + (dados.modalidade === 'entrega' ? ' selected' : '') + '"><input type="radio" name="modalidade" value="entrega"' + (dados.modalidade === 'entrega' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Entrega em domicílio</span></label>' +
          '</div>' +
          '<div id="endereco-fields"' + (dados.modalidade === 'entrega' ? '' : ' class="hidden"') + ' style="margin-top:18px">' +
            '<div class="form-grid">' +
              '<div class="form-group" id="g-numero"><label class="form-label" for="f-numero">Número</label><input class="form-control" id="f-numero" type="text" inputmode="numeric" value="' + u.esc(dados.endereco.numero) + '"><div class="form-error">Informe o número.</div></div>' +
              '<div class="form-group" id="g-rua"><label class="form-label" for="f-rua">Rua <span class="req">*</span></label><input class="form-control" id="f-rua" type="text" value="' + u.esc(dados.endereco.rua) + '" autocomplete="street-address"><div class="form-error">Informe a rua.</div></div>' +
              '<div class="form-group"><label class="form-label" for="f-complemento">Complemento</label><input class="form-control" id="f-complemento" type="text" value="' + u.esc(dados.endereco.complemento) + '"></div>' +
              '<div class="form-group" id="g-bairro"><label class="form-label" for="f-bairro">Bairro <span class="req">*</span></label><input class="form-control" id="f-bairro" type="text" value="' + u.esc(dados.endereco.bairro) + '" autocomplete="address-level2"><div class="form-error">Informe o bairro.</div></div>' +
              '<div class="form-group"><label class="form-label" for="f-cidade">Cidade</label><input class="form-control" id="f-cidade" type="text" value="' + u.esc(dados.endereco.cidade) + '"></div>' +
              '<div class="form-group" style="grid-column:1/-1"><label class="form-label" for="f-ref">Ponto de referência</label><input class="form-control" id="f-ref" type="text" value="' + u.esc(dados.endereco.referencia) + '"></div>' +
            '</div>' +
            '<p class="form-hint mt-2">' + u.esc(cfg.loja.entrega.nota) + '</p>' +
          '</div>' +
        '</div></div>';
    } else if (passo === 4) {
      var sub4 = SS.cart.subtotal();
      var ent4 = valorEntrega();
      var total4 = totalEstimado();
      var itens4 = SS.cart.getItens();
      var resumoHtml = '<div class="panel" style="margin-top:18px;background:#fffdf9;border:1.5px solid var(--line)"><h3 style="font-size:15px;font-weight:800;margin:0 0 12px">Resumo do pedido</h3>' +
        '<div>' + itens4.map(function(item){ var ops=SS.cart.formatarOpcoes(item); var preco=SS.cart.precoUnitarioItem(item); return '<div class="order-summary-item"><div class="order-summary-item__body"><div class="order-summary-item__name">'+item.qty+'x '+u.esc(item.nome)+'</div>'+(ops?'<div class="order-summary-item__opts">'+u.esc(ops)+'</div>':'')+'</div><div class="order-summary-item__price">'+(preco===null?'Sob consulta':u.fmtBRL(preco*item.qty))+'</div></div>'; }).join('') + '</div>' +
        '<div class="summary-totals" style="margin-top:12px"><div class="row"><span>Subtotal</span><span>'+u.fmtBRL(sub4)+'</span></div><div class="row"><span>Entrega</span><span>'+(ent4===null?'a confirmar':u.fmtBRL(ent4))+'</span></div><div class="row total"><span>Total estimado</span><span>'+(total4===null?'a confirmar':u.fmtBRL(total4))+'</span></div></div>' +
        (sobConsulta?'<p class="text-sm text-muted mt-2"><iconify-icon icon="ph:warning-circle" width="15" height="15" style="vertical-align:-2px"></iconify-icon> Itens sem preço definido — total será confirmado pela loja.</p>':'') + '</div>';
      html =
        '<div class="panel"><h2><span class="n">4</span> Pagamento</h2><div class="panel__body">' +
          '<p class="form-hint mb-2">Mesmas formas de pagamento para <strong>antecipado</strong> e <strong>na entrega/retirada</strong>. Ao simular o pagamento, abrimos o WhatsApp com a mensagem formatada do seu pedido.</p>' +
          '<div class="opts opts--2col">' +
            '<label class="opt' + (dados.momentoPagamento === 'antecipado' ? ' selected' : '') + '"><input type="radio" name="momento" value="antecipado"' + (dados.momentoPagamento === 'antecipado' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Pagamento antecipado</span></label>' +
            '<label class="opt' + (dados.momentoPagamento === 'na-entrega' ? ' selected' : '') + '"><input type="radio" name="momento" value="na-entrega"' + (dados.momentoPagamento === 'na-entrega' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Pagamento na entrega ou retirada</span></label>' +
          '</div>' +
          '<div class="form-group mt-3" id="g-forma"><label class="form-label" for="pg-metodos">Forma de pagamento <span class="req">*</span></label>' +
            SS.pagamento.renderControles(dados) +
            '<div class="form-error">Escolha a forma de pagamento.</div>' +
          '</div>' +
          resumoHtml +
          '<div class="form-group mt-3"><label class="form-label" for="f-obs">Observações gerais</label><textarea class="form-control" id="f-obs" rows="2" placeholder="Alguma observação para a loja?">' + u.esc(dados.observacoes) + '</textarea></div>' +
          '<button type="button" class="btn btn--whatsapp btn--lg btn--block mt-3" id="btn-simular-pagamento">Simular pagamento</button>' +
        '</div></div>';
    } else {
      html = '<div class="panel"><h2><span class="n">5</span> Pedido enviado!</h2><div class="panel__body">' +
        '<div class="pag-confirmado" role="status">' +
          '<iconify-icon icon="ph:check-circle" width="48" height="48"></iconify-icon>' +
          '<h3>Pagamento simulado e pedido enviado pelo WhatsApp</h3>' +
          '<p>O WhatsApp foi aberto com a mensagem formatada do seu pedido. Aguarde a confirmação da confeitaria.</p>' +
        '</div>' +
        htmlRevisao(sobConsulta) +
      '</div></div>';
    }

    var navBtns =
      '<div class="flex gap-3 mt-4" style="flex-wrap:wrap">' +
        (passo > 1 ? '<button type="button" class="btn btn--outline" id="btn-voltar">← Voltar</button>' : '<button type="button" class="btn btn--outline" data-continuar>← Continuar comprando</button>') +
        (passo < TOTAIS && passo !== 4 ? '<button type="button" class="btn btn--primary btn--lg" id="btn-avancar">Continuar →</button>' : '') +
        (passo === TOTAIS ? '<button type="button" class="btn btn--outline" data-continuar>Continuar comprando</button>' : '') +
      '</div>';

    el.innerHTML = html + navBtns;

    if (passo === 1) renderPassoItens(sobConsulta);
    if (passo === 2) initPassoCliente();
    if (passo === 3) initPassoEntrega();
    if (passo === 4) initPassoPagamento();
    if (passo === 5) initPassoRevisao(sobConsulta);

    /* Convert native selects to custom dropdowns (always open downward) */
    SS.ui.initCustomSelects(el);

    var av = document.getElementById('btn-avancar');
    if (av) av.addEventListener('click', function () {
      if (validarPasso()) { passo++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
    var vo = document.getElementById('btn-voltar');
    if (vo) vo.addEventListener('click', function () { passo--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    el.querySelectorAll('[data-continuar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var h = sessionStorage.getItem('ss_last_catalog_hash') || '#destaques';
        var target = 'index.html' + h;
        // se veio do catálogo, volta exatamente de onde saiu sem recarregar topo
        if (document.referrer && document.referrer.indexOf('index.html') !== -1 && window.history.length > 1) {
          history.back();
        } else {
          location.href = target;
        }
      });
    });
  }

  /* ------------------------- ETAPA 1: ITENS ------------------------- */
  function renderPassoItens(sobConsulta) {
    var el = document.getElementById('passo-itens');
    var itens = SS.cart.getItens();
    el.innerHTML =
      itens.map(function (item) {
        var ops = SS.cart.formatarOpcoes(item);
        var preco = SS.cart.precoUnitarioItem(item);
        return (
          '<div class="order-summary-item" style="align-items:center">' +
            (item.imagem ? '<img src="' + u.esc(item.imagem) + '" alt="' + u.esc(item.nome) + '" loading="lazy">' : '') +
            '<div class="order-summary-item__body">' +
              '<div class="order-summary-item__name">' + u.esc(item.nome) + '</div>' +
              (ops ? '<div class="order-summary-item__opts">' + u.esc(ops) + '</div>' : '') +
              '<div class="flex gap-3 items-center mt-2" style="flex-wrap:wrap">' +
                '<div class="qty" aria-label="Quantidade de ' + u.esc(item.nome) + '">' +
                  '<button type="button" data-qtd="-1" data-uid="' + item.uid + '" aria-label="Diminuir">−</button>' +
                  '<input type="text" inputmode="numeric" value="' + item.qty + '" data-qtdinput="' + item.uid + '" aria-label="Quantidade">' +
                  '<button type="button" data-qtd="1" data-uid="' + item.uid + '" aria-label="Aumentar">+</button>' +
                '</div>' +
                '<button type="button" class="cart-item__remove" data-rem="' + item.uid + '">Remover</button>' +
              '</div>' +
            '</div>' +
            '<div class="order-summary-item__price">' + (preco === null ? 'Sob consulta' : u.fmtBRL(preco * item.qty)) + '</div>' +
          '</div>'
        );
      }).join('') +
      (sobConsulta ? '<p class="text-sm text-muted mt-2"><iconify-icon icon="ph:warning-circle" width="15" height="15" style="vertical-align:-2px"></iconify-icon> Itens com valor sob consulta terão o total confirmado pela loja no WhatsApp. Você pode finalizar normalmente.</p>' : '');

    el.querySelectorAll('[data-qtd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var item = SS.cart.getItem(b.getAttribute('data-uid'));
        if (!item) return;
        SS.cart.atualizarQtd(item.uid, item.qty + Number(b.getAttribute('data-qtd')));
        render(); renderResumo(SS.cart.getItens(), SS.cart.temItensSobConsulta());
      });
    });
    el.querySelectorAll('[data-qtdinput]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        SS.cart.atualizarQtd(inp.getAttribute('data-qtdinput'), Number(inp.value) || 1);
        render();
      });
    });
    el.querySelectorAll('[data-rem]').forEach(function (b) {
      b.addEventListener('click', function () {
        SS.cart.remover(b.getAttribute('data-rem'));
        SS.ui.toast('Item removido do carrinho');
        render();
      });
    });
  }

  /* ----------------------- ETAPA 2: CLIENTE ------------------------- */
  function initPassoCliente() {
    var nome = document.getElementById('f-nome');
    var tel = document.getElementById('f-telefone');
    nome.addEventListener('input', function () { dados.nome = nome.value.trim(); document.getElementById('g-nome').classList.remove('invalid'); });
    tel.addEventListener('input', function () { tel.value = u.mascaraTelefone(tel.value); dados.telefone = tel.value; document.getElementById('g-telefone').classList.remove('invalid'); });
  }

  /* --------------------- ETAPA 3: RETIRADA/ENTREGA ------------------ */
  function initPassoEntrega() {
    var radios = document.querySelectorAll('input[name="modalidade"]');
    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        dados.modalidade = r.value;
        document.querySelectorAll('input[name="modalidade"]').forEach(function (x) { x.closest('.opt').classList.toggle('selected', x.checked); });
        var campos = document.getElementById('endereco-fields');
        campos.classList.toggle('hidden', r.value !== 'entrega');
        renderResumo(SS.cart.getItens(), SS.cart.temItensSobConsulta());
      });
    });
    var mapa = {
      'f-numero': { k: 'numero' },
      'f-rua': { k: 'rua' },
      'f-complemento': { k: 'complemento' },
      'f-bairro': { k: 'bairro' },
      'f-cidade': { k: 'cidade' },
      'f-ref': { k: 'referencia' },
    };
    Object.keys(mapa).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var conf = mapa[id];
      el.addEventListener('input', function () {
        if (conf.mask) el.value = conf.mask(el.value);
        dados.endereco[conf.k] = el.value.trim();
        var g = document.getElementById('g-' + conf.k);
        if (g) g.classList.remove('invalid');
      });
    });
  }

  /* ---------------------- ETAPA 4: PAGAMENTO ------------------------ */
  function initPassoPagamento() {
    /* O módulo compartilhado (pagamento.js) renderiza e liga os checkboxes
       de forma de pagamento (com ícones), a área dinâmica do Pix (QR mockado)
       e do cartão, o troco e o botão "Simular pagamento". Após a simulação
       ser aprovada, envia o pedido pelo WhatsApp e avança para a confirmação. */
    SS.pagamento.init(document.getElementById('painel-esquerda'), dados, function () {
      finalizar();
      passo = TOTAIS;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    var obs = document.getElementById('f-obs');
    if (obs) obs.addEventListener('input', function () { dados.observacoes = obs.value.trim(); });
  }

  /* ----------------------- ETAPA 5: REVISÃO ------------------------- */
  function htmlRevisao(sobConsulta) {
    var ent = valorEntrega();
    var total = totalEstimado();
    var end = dados.modalidade === 'entrega' && dados.endereco.rua
      ? [dados.endereco.rua + (dados.endereco.numero ? ', ' + dados.endereco.numero : ''), dados.endereco.complemento, dados.endereco.bairro, dados.endereco.cidade, dados.endereco.referencia ? 'Ref.: ' + dados.endereco.referencia : ''].filter(Boolean).join(', ')
      : '';
    return (
      '<div class="review-block"><h3>Cliente</h3><ul><li>' + u.esc(dados.nome || '—') + (dados.telefone ? ' · ' + u.esc(dados.telefone) : '') + '</li></ul></div>' +
      '<div class="review-block"><h3>Itens</h3><ul>' +
        SS.cart.getItens().map(function (item) {
          var ops = SS.cart.formatarOpcoes(item);
          var preco = SS.cart.precoUnitarioItem(item);
          return '<li>' + item.qty + 'x ' + u.esc(item.nome) + (ops ? ' (' + u.esc(ops) + ')' : '') + (item.observacao ? ' — Obs.: ' + u.esc(item.observacao) : '') + ' — ' + (preco === null ? 'sob consulta' : u.fmtBRL(preco * item.qty)) + '</li>';
        }).join('') +
      '</ul></div>' +
      '<div class="review-block"><h3>Entrega</h3><ul>' +
        '<li>Modalidade: ' + (dados.modalidade === 'retirada' ? 'Retirada no local' : 'Entrega em domicílio') + '</li>' +
        (end ? '<li>Endereço: ' + u.esc(end) + '</li>' : '') +
      '</ul></div>' +
      '<div class="review-block"><h3>Pagamento</h3><ul>' +
        '<li>Forma: ' + u.esc(dados.pagamento || '—') + (dados.pagamentoAprovado ? ' (simulado, aprovado)' : '') + '</li>' +
        '<li>Momento: ' + (dados.momentoPagamento === 'antecipado' ? 'Antecipado' : dados.momentoPagamento === 'na-entrega' ? 'Na entrega/retirada' : '—') + '</li>' +
        (SS.pagamento.cardUltimos4(dados) ? '<li>Cartão: ' + u.esc(SS.pagamento.cardMarca(dados)) + ' ···· ' + SS.pagamento.cardUltimos4(dados) + '</li>' : '') +
        (dados.momentoPagamento === 'na-entrega' && dados.pagamento === 'Dinheiro' ? '<li>Troco: ' + (dados.troco ? 'para ' + u.fmtBRL(Number(String(dados.trocoPara).replace(',', '.')) || 0) : 'não precisa') + '</li>' : '') +
      '</ul></div>' +
      (dados.observacoes ? '<div class="review-block"><h3>Observações</h3><ul><li>' + u.esc(dados.observacoes) + '</li></ul></div>' : '') +
      '<div class="summary-totals" style="border-top:none;margin-top:18px">' +
        '<div class="row"><span>Subtotal</span><span>' + u.fmtBRL(SS.cart.subtotal()) + '</span></div>' +
        '<div class="row"><span>Entrega</span><span>' + (ent === null ? 'a confirmar' : u.fmtBRL(ent)) + '</span></div>' +
        '<div class="row total"><span>Total estimado</span><span>' + (total === null ? 'a confirmar' : u.fmtBRL(total)) + '</span></div>' +
      '</div>' +
      '<p class="text-sm text-muted mt-2">Os valores são estimativas e estão sujeitos à confirmação da loja. O pedido só é confirmado após a resposta da confeitaria.</p>'
    );
  }

  function initPassoRevisao() {}

  /* -------------------------- VALIDAÇÃO ----------------------------- */
  function validarPasso() {
    if (passo === 1) {
      if (!SS.cart.getItens().length) { SS.ui.toast('Seu carrinho está vazio.', 'error'); return false; }
      return true;
    }
    if (passo === 2) {
      var ok = true;
      if (!dados.nome) { document.getElementById('g-nome').classList.add('invalid'); ok = false; }
      if (u.apenasDigitos(dados.telefone).length < 10) { document.getElementById('g-telefone').classList.add('invalid'); ok = false; }
      if (!ok) SS.ui.toast('Preencha os campos obrigatórios.', 'error');
      return ok;
    }
    if (passo === 3) {
      if (dados.modalidade !== 'entrega') return true;
      var ok3 = true;
      if (!dados.endereco.rua) { document.getElementById('g-rua').classList.add('invalid'); ok3 = false; }
      if (!dados.endereco.numero) { document.getElementById('g-numero').classList.add('invalid'); ok3 = false; }
      if (!dados.endereco.bairro) { document.getElementById('g-bairro').classList.add('invalid'); ok3 = false; }
      if (!ok3) SS.ui.toast('Preencha os dados de entrega.', 'error');
      return ok3;
    }
    if (passo === 4) {
      if (!dados.momentoPagamento) { SS.ui.toast('Escolha o momento do pagamento.', 'error'); return false; }
      var v = SS.pagamento.validar(dados);
      if (!v.ok) {
        if (document.getElementById('g-forma')) document.getElementById('g-forma').classList.add('invalid');
        SS.ui.toast(v.erros.join(' '), 'error');
        return false;
      }
      if (document.getElementById('g-forma')) document.getElementById('g-forma').classList.remove('invalid');
      return true;
    }
    return true;
  }

  /* ------------------------- FINALIZAÇÃO ---------------------------- */
  function finalizar() {
    if (!validarPasso()) return;
    var sub = SS.cart.subtotal();
    var ent = valorEntrega();
    var total = totalEstimado();
    var trocoValor = dados.troco ? Number(String(dados.trocoPara).replace(',', '.')) || 0 : 0;

    var pedido = {
      numero: u.gerarNumeroPedido(),
      tipo: 'Pedido rápido (pronta entrega)',
      cliente: dados.nome,
      telefone: dados.telefone,
      itens: SS.cart.getItens().map(function (item) {
        return {
          nome: item.nome,
          qty: item.qty,
          observacao: item.observacao,
          unitPrice: item.unitPrice,
          variacoes: item.variacoes,
          adicionais: item.adicionais,
        };
      }),
      modalidade: dados.modalidade,
      endereco: dados.modalidade === 'entrega' ? dados.endereco : null,
      pagamento: dados.pagamento,
      momentoPagamento: dados.momentoPagamento === 'antecipado' ? 'Antecipado' : 'Na entrega/retirada',
      troco: trocoValor,
      pagamentoSimulado: true,
      cardMarca: SS.pagamento.cardMarca(dados),
      cardUltimos4: SS.pagamento.cardUltimos4(dados),
      subtotal: sub,
      entregaValor: ent,
      total: total,
      observacoes: dados.observacoes,
    };

    var msg = SS.whatsapp.montarMensagemPedido(pedido);
    SS.whatsapp.abrir(msg, true);
    SS.ui.toast('Abrindo WhatsApp… envie a mensagem para solicitar o pedido.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();
    render();
  });
})(window.SS);