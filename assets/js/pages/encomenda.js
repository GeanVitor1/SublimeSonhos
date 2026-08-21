/* =========================================================================
   SUBLIME SONHOS — ENCOMENDA AGENDADA
   Etapas: 1) Data e evento · 2) Produtos · 3) Retirada/Entrega ·
           4) Pagamento · 5) Revisão → WhatsApp
   Valida data >= hoje + prazo mínimo de produção dos produtos escolhidos.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;
  var passo = 1;
  var TOTAIS = 5;
  var itens = []; /* {id, qty, obs, variacoes, adicionais} */
  var dados = {
    data: '', hora: '', evento: '', pessoas: '', cliente: '', telefone: '',
    modalidade: 'retirada',
    endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: cfg.loja.cidade, referencia: '' },
    pagamento: '', momentoPagamento: '', troco: false, trocoPara: '',
    card: { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' }, pagamentoAprovado: false,
    observacoes: '',
  };

  /* ——— modo produto único: quando o usuário veio direto de um card/produto
     com ?produto=ID, a encomenda já tem o produto pré-selecionado e o fluxo
     vira: 1) Data (+ opções do produto) · 2) Retirada/Entrega · 3) Pagamento · 4) Revisão */
  var produtoFixo = null;
  var modoUnico = false;
  var selUnico = { variacoes: {}, adicionais: [], qty: 1, obs: '' };
  var gruposUnico = [];

  function detectarProdutoFixo() { return; }

  function isModoUnico() { return modoUnico && produtoFixo; }
  function getTotais() { return isModoUnico() ? 4 : 5; }

  function montarGruposUnico(p) {
    var grupos = [];
    (p.variacoes || []).forEach(function (v) {
      var min = v.min !== undefined && v.min !== null ? v.min : (v.obrigatoria ? 1 : 0);
      var max = v.max !== undefined && v.max !== null ? v.max : 1;
      grupos.push({ id: v.id || ('var_' + grupos.length), nome: v.nome, min: min, max: max, obrigatoria: !!(v.obrigatoria || min > 0), opcoes: v.opcoes });
    });
    if (p.sabores && p.sabores.length) grupos.push({ id: 'sabor', nome: 'Sabor do bolo', min: 1, max: 1, obrigatoria: true, opcoes: p.sabores.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    if (p.tamanhos && p.tamanhos.length) grupos.push({ id: 'tamanho', nome: 'Tamanho', min: 1, max: 1, obrigatoria: true, opcoes: p.tamanhos.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    return grupos;
  }
  function isCheckboxGroupUnico(g) { return g.max > 1; }
  function selArrayUnico(g) {
    var v = selUnico.variacoes[g.id];
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  }
  function syncItensUnico() {
    if (!isModoUnico()) return;
    if (!itens.length) itens = [{ id: produtoFixo.id, qty: selUnico.qty, obs: selUnico.obs || '', variacoes: selUnico.variacoes, adicionais: selUnico.adicionais }];
    else {
      itens[0].id = produtoFixo.id;
      itens[0].qty = selUnico.qty;
      itens[0].obs = selUnico.obs || '';
      itens[0].variacoes = selUnico.variacoes;
      itens[0].adicionais = selUnico.adicionais;
    }
  }

  function prazoMinimoDias() {
    var max = cfg.loja.antecedenciaMinimaDias;
    if (isModoUnico() && produtoFixo && produtoFixo.prazoProducaoDias > max) max = produtoFixo.prazoProducaoDias;
    itens.forEach(function (it) {
      var p = SS.catalog.db.getProduto(it.id);
      if (p && p.prazoProducaoDias > max) max = p.prazoProducaoDias;
    });
    return max;
  }

  function dataMinimaISO() {
    return u.dataParaInput(u.addDias(new Date(), prazoMinimoDias()));
  }

  function valorEntrega() {
    if (cfg.loja.entrega.modo === 'fixa' && dados.modalidade === 'entrega') return cfg.loja.entrega.taxaEntrega;
    if (cfg.loja.entrega.modo === 'bairro' && dados.modalidade === 'entrega') {
      var taxa = cfg.loja.entrega.taxasBairro && cfg.loja.entrega.taxasBairro[dados.endereco.bairro.trim().toLowerCase()];
      return taxa !== undefined && taxa !== null ? taxa : null;
    }
    return dados.modalidade === 'entrega' ? null : 0;
  }

  function extrasEncomenda(it) {
    if (!it.variacoes && !it.adicionais) return 0;
    var p = SS.catalog.db.getProduto(it.id);
    if (!p) return 0;
    var extras = 0;
    var vars = it.variacoes || {};
    Object.keys(vars).forEach(function (gid) {
      var val = vars[gid];
      if (!val) return;
      var arr = Array.isArray(val) ? val : [val];
      arr.forEach(function (v) { if (v && v.acrescimo) extras += Number(v.acrescimo) || 0; });
    });
    (p.adicionais || []).forEach(function (a) {
      if ((it.adicionais || []).indexOf(a.nome) !== -1 && a.preco) extras += Number(a.preco) || 0;
    });
    return extras;
  }
  function precoUnitarioEncomenda(it) {
    var p = SS.catalog.db.getProduto(it.id);
    if (!p || p.preco === null || p.preco === undefined) return null;
    return p.preco + extrasEncomenda(it);
  }
  function descricaoOpcoesEncomenda(it) {
    var partes = [];
    var vars = it.variacoes || {};
    Object.keys(vars).forEach(function (gid) {
      var val = vars[gid];
      if (!val) return;
      var arr = Array.isArray(val) ? val : [val];
      arr.forEach(function (v) { if (v && v.nome) partes.push(v.nome); });
    });
    if (it.adicionais && it.adicionais.length) partes = partes.concat(it.adicionais);
    return partes.join(' · ');
  }
  function subtotalItens() {
    var total = 0;
    itens.forEach(function (it) {
      var unit = precoUnitarioEncomenda(it);
      if (unit !== null) total += unit * it.qty;
    });
    return total;
  }

  function temSobConsulta() {
    return itens.some(function (it) {
      var p = SS.catalog.db.getProduto(it.id);
      return !p || p.preco === null || p.preco === undefined;
    });
  }

  function totalEstimado() {
    var ent = valorEntrega();
    if (temSobConsulta() || ent === null) return null;
    return subtotalItens() + ent;
  }

  function obterProduto(id) { return SS.catalog.db.getProduto(id); }

  function render() {
    var el = document.getElementById('enc-conteudo');
    TOTAIS = 5;
    if (passo > TOTAIS) passo = TOTAIS;
    var passos = [];
    for (var i = 1; i <= TOTAIS; i++) {
      passos.push('<div class="steps-bar__item' + (i < passo ? ' done' : i === passo ? ' active' : '') + '"></div>');
    }
    el.innerHTML =
      '<div class="steps-bar" aria-hidden="true">' + passos.join('') + '</div>' +
      '<div class="checkout-grid">' +
        '<div id="painel-esquerda"></div>' +
        '<aside class="panel" id="painel-resumo"></aside>' +
      '</div>';
    renderResumo();
    renderPasso();
  }

  function renderResumo() {
    var el = document.getElementById('painel-resumo');
    var sub = subtotalItens();
    var ent = valorEntrega();
    var total = totalEstimado();
    var sob = temSobConsulta();
    el.innerHTML =
      '<h2>Resumo da encomenda</h2>' +
      '<div class="panel__body">' +
        '<div id="resumo-itens">' +
          (itens.length ? itens.map(function (it) {
            var p = obterProduto(it.id);
            var opts = descricaoOpcoesEncomenda(it);
            var unit = precoUnitarioEncomenda(it);
            return (
              '<div class="order-summary-item">' +
                (p && p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '') +
                '<div class="order-summary-item__body"><div class="order-summary-item__name">' + it.qty + 'x ' + u.esc(p ? p.nome : it.id) + '</div>' + (opts ? '<div class="order-summary-item__opts">' + u.esc(opts) + '</div>' : '') + (it.obs ? '<div class="order-summary-item__opts">Obs.: ' + u.esc(it.obs) + '</div>' : '') + '</div>' +
                '<div class="order-summary-item__price">' + (unit !== null ? u.fmtBRL(unit * it.qty) : 'Sob consulta') + '</div>' +
              '</div>'
            );
          }).join('') : '<p class="text-sm text-muted">Nenhum produto selecionado ainda.</p>') +
        '</div>' +
        '<div class="summary-totals">' +
          '<div class="row"><span>Subtotal</span><span>' + u.fmtBRL(sub) + '</span></div>' +
          '<div class="row"><span>Entrega</span><span>' + (ent === null ? 'a confirmar' : u.fmtBRL(ent)) + '</span></div>' +
          '<div class="row total"><span>Total estimado</span><span>' + (total === null ? 'a confirmar' : u.fmtBRL(total)) + '</span></div>' +
        '</div>' +
        (sob ? '<p class="text-sm text-muted mt-2"><iconify-icon icon="ph:warning-circle" width="15" height="15" style="vertical-align:-2px"></iconify-icon> Alguns itens têm valor sob consulta — o total será confirmado pela loja.</p>' : '') +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* ETAPAS                                                              */
  /* ------------------------------------------------------------------ */
  function calcExtrasUnico() {
    var extras = 0;
    gruposUnico.forEach(function (g) { selArrayUnico(g).forEach(function (it) { if (it.acrescimo) extras += Number(it.acrescimo) || 0; }); });
    (produtoFixo.adicionais || []).forEach(function (a) { if (selUnico.adicionais.indexOf(a.nome) !== -1 && a.preco) extras += Number(a.preco) || 0; });
    return extras;
  }

  function htmlBlocoProdutoUnico() {
    if (!isModoUnico()) return '';
    var p = produtoFixo;
    var img = (p.imagens && p.imagens[0]) || '';
    var precoBase = p.preco === null || p.preco === undefined ? null : p.preco;
    var extras = calcExtrasUnico();
    var precoTxt = precoBase === null ? 'Valor sob consulta' + (extras ? ' + ' + u.fmtBRL(extras) + ' adicionais' : '') : u.fmtBRL(precoBase + extras);
    var html = '<div class="panel" style="margin-top:18px"><div class="panel__body unico-prod-head" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:14px;background:var(--rose-50, #fff7f8);border-radius:14px;border:1px solid var(--rose-100)">' +
      (img ? '<img src="' + u.esc(img) + '" alt="' + u.esc(p.nome) + '" style="width:74px;height:74px;object-fit:cover;border-radius:10px;flex-shrink:0">' : '') +
      '<div style="flex:1;min-width:180px"><div style="font-weight:800;color:var(--ink)">' + u.esc(p.nome) + '</div>' +
      '<div style="font-size:13px;color:var(--muted)">' + u.esc(p.descricaoCurta || p.descricao || '') + '</div>' +
      '<div style="font-weight:800;color:var(--rose-600);margin-top:4px">' + precoTxt + '</div></div>' +
      '<a href="produto.html?slug=' + encodeURIComponent(p.id) + '" class="btn btn--outline btn--sm" style="flex-shrink:0">Ver produto</a></div>';
    /* opções inline */
    if (gruposUnico.length) {
      html += '<div id="unico-opcoes" style="margin-top:14px"></div>';
    } else if (p.adicionais && p.adicionais.length) {
      html += '<div id="unico-opcoes" style="margin-top:14px"></div>';
    }
    /* quantidade + obs do produto */
    html += '<div class="prod-opts" style="margin-top:14px"><h4>Quantidade <span style="color:var(--muted);font-weight:600;text-transform:none;letter-spacing:0;font-size:12.5px">(mínimo ' + (p.quantidadeMinima || 1) + ')</span></h4><div class="qty" style="height:48px"><button type="button" data-unico-qtd="-1" aria-label="Diminuir">−</button><input type="text" inputmode="numeric" id="unico-qty" value="' + selUnico.qty + '" aria-label="Quantidade"><button type="button" data-unico-qtd="1" aria-label="Aumentar">+</button></div></div>';
    html += '<div class="form-group" style="margin-top:12px"><label class="form-label" for="unico-obs">Observação do produto</label><textarea class="form-control" id="unico-obs" rows="2" maxlength="140" placeholder="' + u.esc(p.observacoes || 'Ex.: escrever mensagem, caprichar na decoração...') + '">' + u.esc(selUnico.obs || '') + '</textarea><div class="form-hint" id="unico-obs-count" style="text-align:right">' + (selUnico.obs ? selUnico.obs.length : 0) + ' / 140</div></div>';
    html += '<div class="text-sm text-muted" style="margin-top:6px"><a href="encomenda.html" id="unico-trocar" style="color:var(--rose-600);font-weight:700">Trocar produto / encomendar outros itens →</a></div>';
    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* EXTRAS para o mesmo dia agendado (carrinho misto) — permite inserir */
  /* outros docinhos que serão entregues juntos na data agendada.       */
  /* ------------------------------------------------------------------ */
  function htmlExtrasAgendamento() {
    if (!isModoUnico()) return '';
    var extrasCount = Math.max(0, itens.length - 1);
    var cartCount = 0;
    try { cartCount = SS.cart.contar(); } catch (e) {}
    var cartBanner = '';
    if (cartCount > 0) {
      cartBanner = '<div id="unico-cart-banner" class="unico-cart-banner" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-top:12px"><iconify-icon icon="ph:shopping-cart" width="18" height="18" style="color:var(--ink)"></iconify-icon><span class="text-sm" style="flex:1;min-width:180px">Você tem <strong>' + cartCount + ' item' + (cartCount===1?'':'s') + ' no carrinho</strong> — quer entregar tudo junto no dia agendado?</span><button type="button" class="btn btn--primary btn--sm" id="unico-import-cart" style="flex-shrink:0">Trazer do carrinho</button></div>';
    }
    var listaExtras = '';
    if (extrasCount > 0) {
      listaExtras = '<div id="unico-extras-lista" style="margin-top:14px"></div>';
    } else {
      listaExtras = '<div id="unico-extras-lista" style="margin-top:14px"><p class="text-sm text-muted">Nenhum docinho extra adicionado ainda. Escolha abaixo para complementar a entrega do dia agendado.</p></div>';
    }
    return (
      '<div class="panel" style="margin-top:18px"><h3 style="font-family:var(--font-display);font-size:18px;color:var(--ink);margin:0 0 6px">Complemente sua entrega <span style="font-family:var(--font-body);font-weight:700;color:var(--rose-600);font-size:13px">· mesmo dia agendado</span></h3>' +
      '<p class="text-sm text-muted" style="margin:0 0 10px">Adicione outros docinhos e mimos — tudo será entregue junto no dia <strong>' + (dados.data ? u.fmtData(dados.data) : 'agendado') + '</strong>. Valor e prazo são recalculados automaticamente.</p>' +
      cartBanner +
      '<div class="enc-search-wrap mt-3" style="margin-top:12px;display:none" id="unico-search-wrap"><span class="enc-search__ico" aria-hidden="true"><iconify-icon icon="ph:magnifying-glass" width="18" height="18"></iconify-icon></span><input class="form-control enc-search__input" id="unico-extras-busca" type="search" placeholder="Buscar nesta categoria…" autocomplete="off" aria-label="Buscar docinhos extras"></div>' +
      '<div class="unico-extras-cats" id="unico-extras-cats" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"></div>' +
      '<div class="mini-cat mt-3" id="unico-extras-grid" style="margin-top:12px"></div>' +
      listaExtras +
      '</div>'
    );
  }

  function renderPasso() {
    var el = document.getElementById('painel-esquerda');
    var html = '';
    var unico = isModoUnico();

    if (unico) {
      if (passo === 1) {
        var horarios = [];
        for (var h = 8; h <= 19; h++) horarios.push('<option value="' + String(h).padStart(2, '0') + ':00"' + (dados.hora === String(h).padStart(2, '0') + ':00' ? ' selected' : '') + '>' + String(h).padStart(2, '0') + ':00</option>');
        var dataFmt = dados.data ? u.fmtData(dados.data) : '';
        html =
          '<div class="panel"><h2><span class="n">1</span> Data <span style="font-weight:400;color:var(--muted);font-size:15px">· ' + u.esc(produtoFixo.nome) + '</span></h2><div class="panel__body">' +
            '<div class="form-grid">' +
              '<div class="form-group" id="g-data"><label class="form-label" for="f-data">Data desejada <span class="req">*</span></label><input class="form-control dp-input" id="f-data" type="text" readonly placeholder="Selecione a data" value="' + u.esc(dataFmt) + '" data-iso="' + u.esc(dados.data) + '"><div class="form-error">Escolha uma data futura respeitando o prazo de produção.</div><p class="form-hint">Prazo mínimo: ' + prazoMinimoDias() + ' dia' + (prazoMinimoDias() === 1 ? '' : 's') + ' a partir de hoje. A data depende da confirmação da loja.</p></div>' +
              '<div class="form-group" id="g-hora"><label class="form-label" for="f-hora">Horário <span class="req">*</span></label><select class="form-control" id="f-hora"><option value="">Selecione…</option>' + horarios.join('') + '</select><div class="form-error">Escolha o horário.</div><p class="form-hint">Horário sujeito à confirmação.</p></div>' +
            '</div>' +
            '<p class="text-sm text-muted mt-2"><iconify-icon icon="ph:warning-circle" width="15" height="15" style="vertical-align:-2px"></iconify-icon> A data e o horário escolhidos dependem da confirmação da confeitaria após o envio do pedido.</p>' +
            htmlBlocoProdutoUnico() +
            htmlExtrasAgendamento() +
          '</div></div>';
      } else if (passo === 2) {
        html =
          '<div class="panel"><h2><span class="n">2</span> Retirada ou entrega</h2><div class="panel__body">' +
            '<div class="opts">' +
              '<label class="opt' + (dados.modalidade === 'retirada' ? ' selected' : '') + '"><input type="radio" name="modalidade" value="retirada"' + (dados.modalidade === 'retirada' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Retirada no local</span></label>' +
              '<label class="opt' + (dados.modalidade === 'entrega' ? ' selected' : '') + '"><input type="radio" name="modalidade" value="entrega"' + (dados.modalidade === 'entrega' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Entrega em domicílio</span></label>' +
            '</div>' +
            '<div id="endereco-fields"' + (dados.modalidade === 'entrega' ? '' : ' class="hidden"') + ' style="margin-top:18px">' +
              '<div class="form-grid">' +
                '<div class="form-group" id="g-numero"><label class="form-label" for="f-numero">Número</label><input class="form-control" id="f-numero" type="text" inputmode="numeric" value="' + u.esc(dados.endereco.numero) + '"><div class="form-error">Informe o número.</div></div>' +
                '<div class="form-group" id="g-rua"><label class="form-label" for="f-rua">Rua <span class="req">*</span></label><input class="form-control" id="f-rua" type="text" value="' + u.esc(dados.endereco.rua) + '" autocomplete="street-address"><div class="form-error">Informe a rua.</div></div>' +
                '<div class="form-group"><label class="form-label" for="f-complemento">Complemento</label><input class="form-control" id="f-complemento" type="text" value="' + u.esc(dados.endereco.complemento) + '"></div>' +
                '<div class="form-group" id="g-bairro"><label class="form-label" for="f-bairro">Bairro <span class="req">*</span></label><input class="form-control" id="f-bairro" type="text" value="' + u.esc(dados.endereco.bairro) + '"><div class="form-error">Informe o bairro.</div></div>' +
                '<div class="form-group"><label class="form-label" for="f-cidade">Cidade</label><input class="form-control" id="f-cidade" type="text" value="' + u.esc(dados.endereco.cidade) + '"></div>' +
                '<div class="form-group" style="grid-column:1/-1"><label class="form-label" for="f-ref">Ponto de referência</label><input class="form-control" id="f-ref" type="text" value="' + u.esc(dados.endereco.referencia) + '"></div>' +
              '</div>' +
              '<p class="form-hint mt-2">' + u.esc(cfg.loja.entrega.nota) + '</p>' +
            '</div>' +
          '</div></div>';
      } else if (passo === 3) {
        html =
          '<div class="panel"><h2><span class="n">3</span> Pagamento</h2><div class="panel__body">' +
            '<p class="form-hint mb-2">Escolha o momento e a forma de pagamento. Para encomendas, o pagamento antecipado pode ser solicitado pela loja.</p>' +
            '<div class="opts">' +
              '<label class="opt' + (dados.momentoPagamento === 'antecipado' ? ' selected' : '') + '"><input type="radio" name="momento" value="antecipado"' + (dados.momentoPagamento === 'antecipado' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Pagamento antecipado</span></label>' +
              '<label class="opt' + (dados.momentoPagamento === 'na-entrega' ? ' selected' : '') + '"><input type="radio" name="momento" value="na-entrega"' + (dados.momentoPagamento === 'na-entrega' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Pagamento na entrega ou retirada</span></label>' +
            '</div>' +
            '<div class="form-group mt-3" id="g-forma"><label class="form-label" for="pg-metodos">Forma de pagamento <span class="req">*</span></label>' +
              SS.pagamento.renderControles(dados) +
              '<div class="form-error">Escolha a forma de pagamento.</div>' +
            '</div>' +
            '<div class="form-group mt-3"><label class="form-label" for="f-obs">Observações gerais</label><textarea class="form-control" id="f-obs" rows="2" placeholder="Tema, cores, referências, detalhes da festa…">' + u.esc(dados.observacoes) + '</textarea></div>' +
            '<button type="button" class="btn btn--whatsapp btn--lg btn--block mt-3" id="btn-simular-pagamento">Simular pagamento</button>' +
          '</div></div>';
      } else {
        html = '<div class="panel"><h2><span class="n">4</span> Encomenda enviada!</h2><div class="panel__body">' +
          '<div class="pag-confirmado" role="status">' +
            '<iconify-icon icon="ph:check-circle" width="48" height="48"></iconify-icon>' +
            '<h3>Pagamento simulado e encomenda enviada pelo WhatsApp</h3>' +
            '<p>O WhatsApp foi aberto com a mensagem formatada da sua encomenda. Aguarde a confirmação da confeitaria.</p>' +
          '</div>' +
          htmlRevisao() +
        '</div></div>';
      }
    } else {
      if (passo === 1) {
        var min = dataMinimaISO();
        var hoje = u.hojeISO();
        var horarios2 = [];
        for (var h2 = 8; h2 <= 19; h2++) horarios2.push('<option value="' + String(h2).padStart(2, '0') + ':00"' + (dados.hora === String(h2).padStart(2, '0') + ':00' ? ' selected' : '') + '>' + String(h2).padStart(2, '0') + ':00</option>');
        var dataFmt2 = dados.data ? u.fmtData(dados.data) : '';
        html =
          '<div class="panel"><h2><span class="n">1</span> Data e evento</h2><div class="panel__body">' +
            '<div class="form-grid">' +
              '<div class="form-group" id="g-data"><label class="form-label" for="f-data">Data desejada <span class="req">*</span></label><input class="form-control dp-input" id="f-data" type="text" readonly placeholder="Selecione a data" value="' + u.esc(dataFmt2) + '" data-iso="' + u.esc(dados.data) + '"><div class="form-error">Escolha uma data futura respeitando o prazo de produção.</div><p class="form-hint">Prazo mínimo: ' + prazoMinimoDias() + ' dia' + (prazoMinimoDias() === 1 ? '' : 's') + ' a partir de hoje. A data depende da confirmação da loja.</p></div>' +
              '<div class="form-group" id="g-hora"><label class="form-label" for="f-hora">Horário <span class="req">*</span></label><select class="form-control" id="f-hora"><option value="">Selecione…</option>' + horarios2.join('') + '</select><div class="form-error">Escolha o horário.</div><p class="form-hint">Horário sujeito à confirmação.</p></div>' +
              '<div class="form-group" id="g-evento"><label class="form-label" for="f-evento">Tipo de evento <span class="req">*</span></label><select class="form-control" id="f-evento"><option value="">Selecione…</option>' +
                ['Aniversário', 'Casamento', 'Festa', 'Chá de bebê', 'Presente', 'Evento corporativo', 'Outro'].map(function (e) { return '<option value="' + u.esc(e) + '"' + (dados.evento === e ? ' selected' : '') + '>' + u.esc(e) + '</option>'; }).join('') +
              '</select><div class="form-error">Informe o tipo de evento.</div></div>' +
              '<div class="form-group"><label class="form-label" for="f-pessoas">Quantidade de pessoas</label><input class="form-control" id="f-pessoas" type="text" inputmode="numeric" placeholder="Ex.: 20" value="' + u.esc(dados.pessoas) + '"></div>' +
            '</div>' +
            '<p class="text-sm text-muted mt-2"><iconify-icon icon="ph:warning-circle" width="15" height="15" style="vertical-align:-2px"></iconify-icon> A data e o horário escolhidos dependem da confirmação da confeitaria após o envio do pedido.</p>' +
          '</div></div>';
      } else if (passo === 2) {
        var cats = SS.catalog.db.getCategorias();
        html =
          '<div class="panel"><h2><span class="n">2</span> Escolha os produtos</h2><div class="panel__body">' +
            '<p class="form-hint mb-3">Selecione os produtos da encomenda e informe a quantidade. Produtos "sob consulta" também podem ser encomendados — o valor será confirmado pela loja.</p>' +
            '<div class="opts" id="enc-cats" style="grid-auto-flow:column;overflow-x:auto;padding-bottom:6px">' +
              '<label class="opt"><input type="radio" name="enc-cat" value="todos" checked><span class="opt__dot"></span><span class="opt__label">Todos</span></label>' +
              cats.map(function (c) { return '<label class="opt"><input type="radio" name="enc-cat" value="' + u.esc(c.id) + '"><span class="opt__dot"></span><span class="opt__label"><iconify-icon icon="ph:' + (c.icone || 'cookie') + '" width="16" height="16"></iconify-icon> ' + u.esc(c.nome) + '</span></label>'; }).join('') +
            '</div>' +
            '<div class="enc-search-wrap mt-3">' +
              '<span class="enc-search__ico" aria-hidden="true"><iconify-icon icon="ph:magnifying-glass" width="18" height="18"></iconify-icon></span>' +
              '<input class="form-control enc-search__input" id="enc-busca" type="search" placeholder="Buscar produto por nome…" autocomplete="off" aria-label="Buscar produtos">' +
            '</div>' +
            '<div class="mini-cat mt-3" id="enc-mini-cat"></div>' +
            '<div class="mt-3" id="enc-itens-lista"></div>' +
          '</div></div>';
      } else if (passo === 3) {
        html =
          '<div class="panel"><h2><span class="n">3</span> Retirada ou entrega</h2><div class="panel__body">' +
            '<div class="opts">' +
              '<label class="opt' + (dados.modalidade === 'retirada' ? ' selected' : '') + '"><input type="radio" name="modalidade" value="retirada"' + (dados.modalidade === 'retirada' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Retirada no local</span></label>' +
              '<label class="opt' + (dados.modalidade === 'entrega' ? ' selected' : '') + '"><input type="radio" name="modalidade" value="entrega"' + (dados.modalidade === 'entrega' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Entrega em domicílio</span></label>' +
            '</div>' +
            '<div id="endereco-fields"' + (dados.modalidade === 'entrega' ? '' : ' class="hidden"') + ' style="margin-top:18px">' +
              '<div class="form-grid">' +
                '<div class="form-group" id="g-numero"><label class="form-label" for="f-numero">Número</label><input class="form-control" id="f-numero" type="text" inputmode="numeric" value="' + u.esc(dados.endereco.numero) + '"><div class="form-error">Informe o número.</div></div>' +
                '<div class="form-group" id="g-rua"><label class="form-label" for="f-rua">Rua <span class="req">*</span></label><input class="form-control" id="f-rua" type="text" value="' + u.esc(dados.endereco.rua) + '" autocomplete="street-address"><div class="form-error">Informe a rua.</div></div>' +
                '<div class="form-group"><label class="form-label" for="f-complemento">Complemento</label><input class="form-control" id="f-complemento" type="text" value="' + u.esc(dados.endereco.complemento) + '"></div>' +
                '<div class="form-group" id="g-bairro"><label class="form-label" for="f-bairro">Bairro <span class="req">*</span></label><input class="form-control" id="f-bairro" type="text" value="' + u.esc(dados.endereco.bairro) + '"><div class="form-error">Informe o bairro.</div></div>' +
                '<div class="form-group"><label class="form-label" for="f-cidade">Cidade</label><input class="form-control" id="f-cidade" type="text" value="' + u.esc(dados.endereco.cidade) + '"></div>' +
                '<div class="form-group" style="grid-column:1/-1"><label class="form-label" for="f-ref">Ponto de referência</label><input class="form-control" id="f-ref" type="text" value="' + u.esc(dados.endereco.referencia) + '"></div>' +
              '</div>' +
              '<p class="form-hint mt-2">' + u.esc(cfg.loja.entrega.nota) + '</p>' +
            '</div>' +
          '</div></div>';
      } else if (passo === 4) {
        html =
          '<div class="panel"><h2><span class="n">4</span> Pagamento</h2><div class="panel__body">' +
            '<p class="form-hint mb-2">Escolha o momento e a forma de pagamento. Para encomendas, o pagamento antecipado pode ser solicitado pela loja.</p>' +
            '<div class="opts">' +
              '<label class="opt' + (dados.momentoPagamento === 'antecipado' ? ' selected' : '') + '"><input type="radio" name="momento" value="antecipado"' + (dados.momentoPagamento === 'antecipado' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Pagamento antecipado</span></label>' +
              '<label class="opt' + (dados.momentoPagamento === 'na-entrega' ? ' selected' : '') + '"><input type="radio" name="momento" value="na-entrega"' + (dados.momentoPagamento === 'na-entrega' ? ' checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Pagamento na entrega ou retirada</span></label>' +
            '</div>' +
            '<div class="form-group mt-3" id="g-forma"><label class="form-label" for="pg-metodos">Forma de pagamento <span class="req">*</span></label>' +
              SS.pagamento.renderControles(dados) +
              '<div class="form-error">Escolha a forma de pagamento.</div>' +
            '</div>' +
            '<div class="form-group mt-3"><label class="form-label" for="f-obs">Observações gerais</label><textarea class="form-control" id="f-obs" rows="2" placeholder="Tema, cores, referências, detalhes da festa…">' + u.esc(dados.observacoes) + '</textarea></div>' +
            '<button type="button" class="btn btn--whatsapp btn--lg btn--block mt-3" id="btn-simular-pagamento">Simular pagamento</button>' +
          '</div></div>';
      } else {
        html = '<div class="panel"><h2><span class="n">5</span> Encomenda enviada!</h2><div class="panel__body">' +
          '<div class="pag-confirmado" role="status">' +
            '<iconify-icon icon="ph:check-circle" width="48" height="48"></iconify-icon>' +
            '<h3>Pagamento simulado e encomenda enviada pelo WhatsApp</h3>' +
            '<p>O WhatsApp foi aberto com a mensagem formatada da sua encomenda. Aguarde a confirmação da confeitaria.</p>' +
          '</div>' +
          htmlRevisao() +
        '</div></div>';
      }
    }

    var hideAvancar = unico ? (passo === 3 || passo >= getTotais()) : (passo === 4 || passo >= getTotais());
    var nav =
      '<div class="flex gap-3 mt-4" style="flex-wrap:wrap">' +
        (passo > 1 ? '<button type="button" class="btn btn--outline" id="btn-voltar">← Voltar</button>' : '<button type="button" class="btn btn--outline" data-continuar>← Continuar comprando</button>') +
        (passo < getTotais() && !hideAvancar ? '<button type="button" class="btn btn--primary btn--lg" id="btn-avancar">Continuar →</button>' : '') +
        (passo === getTotais() ? '<button type="button" class="btn btn--outline" data-continuar>Continuar comprando</button>' : '') +
      '</div>';

    el.innerHTML = html + nav;

    if (unico) {
      if (passo === 1) { initPassoData(); initOpcoesUnico(); initUnicoExtras(); }
      else if (passo === 2) initPassoEntrega();
      else if (passo === 3) initPassoPagamento();
    } else {
      if (passo === 1) initPassoData();
      if (passo === 2) initPassoProdutos();
      if (passo === 3) initPassoEntrega();
      if (passo === 4) initPassoPagamento();
    }

    /* Convert native selects to custom dropdowns (always open downward) */
    SS.ui.initCustomSelects(el);

    var av = document.getElementById('btn-avancar');
    if (av) av.addEventListener('click', function () { if (validarPasso()) { passo++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    var vo = document.getElementById('btn-voltar');
    if (vo) vo.addEventListener('click', function () { passo--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    el.querySelectorAll('[data-continuar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var h = sessionStorage.getItem('ss_last_catalog_hash') || '#destaques';
        var target = 'index.html' + h;
        if (document.referrer && document.referrer.indexOf('index.html') !== -1 && window.history.length > 1) history.back();
        else location.href = target;
      });
    });
  }

  /* -------------------------- ETAPA 1 ------------------------------- */
  function initPassoData() {
    var d = document.getElementById('f-data');
    if (d && SS.ui && SS.ui.initDatePicker) {
      SS.ui.initDatePicker(d, dataMinimaISO(), function(iso){ dados.data = iso; document.getElementById('g-data').classList.remove('invalid'); }, dados.data);
      d.addEventListener('change', function(){ var iso = d.dataset.iso || d.value; if (iso && /^\d{2}\/\d{2}\/\d{4}$/.test(d.value)) iso = d.dataset.iso; dados.data = iso || ''; document.getElementById('g-data').classList.remove('invalid'); });
    } else if (d) {
      d.addEventListener('change', function () {
        dados.data = d.dataset.iso || d.value;
        document.getElementById('g-data').classList.remove('invalid');
      });
      d.addEventListener('input', function () {
        dados.data = d.dataset.iso || d.value;
        if (d.value) document.getElementById('g-data').classList.remove('invalid');
      });
    }
    var h = document.getElementById('f-hora');
    if (h) h.addEventListener('change', function () { dados.hora = h.value; document.getElementById('g-hora').classList.remove('invalid'); });
    var e = document.getElementById('f-evento');
    if (e) e.addEventListener('change', function () { dados.evento = e.value; document.getElementById('g-evento').classList.remove('invalid'); });
    var pp = document.getElementById('f-pessoas');
    if (pp) pp.addEventListener('input', function () { dados.pessoas = u.apenasDigitos(pp.value); pp.value = dados.pessoas; });
  }

  function initOpcoesUnico() {
    if (!isModoUnico()) return;
    var dest = document.getElementById('unico-opcoes');
    var p = produtoFixo;
    if (!dest) return;
    if (!gruposUnico.length && !(p.adicionais && p.adicionais.length)) { dest.innerHTML = ''; return; }
    var html = '';
    gruposUnico.forEach(function (g) {
      var isCb = isCheckboxGroupUnico(g);
      var rangeTxt = g.min === g.max ? (g.min === 1 ? 'Escolha 1 opção' : 'Escolha ' + g.min + ' opções') : (g.min === 0 ? 'Escolha até ' + g.max + ' opção' + (g.max > 1 ? 'ões' : '') : 'Escolha de ' + g.min + ' a ' + g.max + ' opções');
      html += '<div class="prod-opts" data-gid="' + u.esc(g.id) + '"><div class="prod-opts__head"><h4>' + u.esc(g.nome) + (g.obrigatoria ? ' <span style="color:var(--danger)">*</span>' : '') + '</h4><span class="prod-opts__meta"><span class="prod-opts__count" data-count="' + u.esc(g.id) + '">0 / ' + g.max + '</span> · ' + u.esc(rangeTxt) + (g.obrigatoria ? ' · <span style="color:var(--danger);font-weight:700">OBRIGATÓRIO</span>' : '') + '</span></div>';
      if (isCb) {
        html += '<div class="opts" role="group" aria-label="' + u.esc(g.nome) + '">' + g.opcoes.map(function (o) {
          var ac = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
          var selArr = selArrayUnico(g);
          var isSel = selArr.some(function (x) { return x.nome === o.nome; });
          return '<label class="opt opt--checkbox' + (isSel ? ' selected' : '') + '" data-grupo="' + u.esc(g.id) + '"><input type="checkbox" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '"' + (isSel ? ' checked' : '') + '><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(o.nome) + ac + '</span></label>';
        }).join('') + '</div>';
      } else {
        html += '<div class="opts" role="radiogroup" aria-label="' + u.esc(g.nome) + '">' + g.opcoes.map(function (o) {
          var ac = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
          var cur = selUnico.variacoes[g.id];
          var isSelR = cur && !Array.isArray(cur) && cur.nome === o.nome;
          return '<label class="opt' + (isSelR ? ' selected' : '') + '" data-grupo="' + u.esc(g.id) + '"><input type="radio" name="unico-' + u.esc(g.id) + '" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '"' + (isSelR ? ' checked' : '') + '><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(o.nome) + ac + '</span></label>';
        }).join('') + '</div>';
      }
      html += '</div>';
    });
    if (p.adicionais && p.adicionais.length) {
      html += '<div class="prod-opts"><div class="prod-opts__head"><h4>Adicionais</h4></div><div class="opts" role="group" aria-label="Adicionais">' + p.adicionais.map(function (a) {
        var isSelA = selUnico.adicionais.indexOf(a.nome) !== -1;
        return '<label class="opt opt--checkbox' + (isSelA ? ' selected' : '') + '" data-grupo="adicionais"><input type="checkbox" value="' + u.esc(a.nome) + '" data-preco="' + (Number(a.preco) || 0) + '"' + (isSelA ? ' checked' : '') + '><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(a.nome) + (Number(a.preco) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(a.preco) + '</span>' : '') + '</span></label>';
      }).join('') + '</div></div>';
    }
    dest.innerHTML = html;
    dest.querySelectorAll('.prod-opts[data-gid="sabor"]').forEach(function (el) { if (el.querySelectorAll('.opt').length > 4) el.classList.add('has-scroll'); });

    function syncCount(g) {
      var c = dest.querySelector('[data-count="' + g.id + '"]');
      if (c) c.textContent = selArrayUnico(g).length + ' / ' + g.max;
      var wrap2 = dest.querySelector('.prod-opts[data-gid="' + g.id + '"]');
      if (!wrap2) return;
      var atLimit = selArrayUnico(g).length >= g.max;
      wrap2.querySelectorAll('.opt input[type="checkbox"]').forEach(function (inp) {
        if (!inp.checked) { inp.disabled = atLimit; inp.closest('.opt').classList.toggle('is-disabled', atLimit); }
      });
    }
    gruposUnico.forEach(function (g) {
      var isCb = isCheckboxGroupUnico(g);
      if (!isCb) return;
      dest.querySelectorAll('.opt[data-grupo="' + g.id + '"] input[type="checkbox"]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var arr = selUnico.variacoes[g.id] || [];
          if (!Array.isArray(arr)) arr = [];
          if (inp.checked) {
            if (arr.length >= g.max) { inp.checked = false; SS.ui.toast('Máximo de ' + g.max + ' em ' + g.nome, 'error'); return; }
            arr.push({ nome: inp.value, acrescimo: Number(inp.getAttribute('data-acrescimo')) || 0 });
          } else arr = arr.filter(function (x) { return x.nome !== inp.value; });
          selUnico.variacoes[g.id] = arr;
          inp.closest('.opt').classList.toggle('selected', inp.checked);
          syncCount(g); syncItensUnico(); renderResumo();
        });
      });
      syncCount(g);
    });
    dest.querySelectorAll('.opt input[type="radio"]').forEach(function (inp) {
      inp.addEventListener('click', function () {
        var lbl = inp.closest('.opt');
        var gid = lbl.getAttribute('data-grupo');
        var gDef = gruposUnico.filter(function (gg) { return gg.id === gid; })[0];
        if (gDef && gDef.min === 0 && lbl.classList.contains('selected')) {
          inp.checked = false;
          lbl.classList.remove('selected');
          delete selUnico.variacoes[gid];
          syncItensUnico(); renderResumo();
          return;
        }
      });
      inp.addEventListener('change', function () {
        var lbl = inp.closest('.opt');
        var g = lbl.getAttribute('data-grupo');
        lbl.parentElement.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('selected'); });
        lbl.classList.add('selected');
        selUnico.variacoes[g] = { nome: inp.value, acrescimo: Number(inp.getAttribute('data-acrescimo')) || 0 };
        syncItensUnico(); renderResumo();
      });
    });
    dest.querySelectorAll('.opt[data-grupo="adicionais"] input[type="checkbox"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        inp.closest('.opt').classList.toggle('selected', inp.checked);
        if (inp.checked) selUnico.adicionais.push(inp.value);
        else selUnico.adicionais = selUnico.adicionais.filter(function (n) { return n !== inp.value; });
        syncItensUnico(); renderResumo();
      });
    });

    var qtyEl = document.getElementById('unico-qty');
    if (qtyEl) {
      document.querySelectorAll('[data-unico-qtd]').forEach(function (b) {
        b.addEventListener('click', function () {
          var min = p.quantidadeMinima || 1;
          var q = Number(qtyEl.value) || min;
          q += Number(b.getAttribute('data-unico-qtd'));
          qtyEl.value = Math.max(min, q);
          selUnico.qty = Number(qtyEl.value);
          syncItensUnico(); renderResumo();
        });
      });
      qtyEl.addEventListener('change', function () { var min = p.quantidadeMinima || 1; this.value = Math.max(min, Number(this.value) || min); selUnico.qty = Number(this.value); syncItensUnico(); renderResumo(); });
      qtyEl.addEventListener('input', function () { var min = p.quantidadeMinima || 1; var v = Number(this.value) || min; selUnico.qty = Math.max(min, v); syncItensUnico(); renderResumo(); });
    }
    var obsEl = document.getElementById('unico-obs');
    if (obsEl) {
      obsEl.addEventListener('input', function () {
        selUnico.obs = this.value.slice(0,140);
        var c = document.getElementById('unico-obs-count');
        if (c) c.textContent = selUnico.obs.length + ' / 140';
        syncItensUnico(); renderResumo();
      });
    }
    var trocar = document.getElementById('unico-trocar');
    if (trocar) trocar.addEventListener('click', function (e) {
      e.preventDefault();
      try { sessionStorage.removeItem('ss_encomenda_produto'); sessionStorage.removeItem('ss_encomenda_selecao'); } catch (err) {}
      history.replaceState(null, '', 'encomenda.html');
      produtoFixo = null; modoUnico = false; TOTAIS = 5; passo = 1; itens = [];
      selUnico = { variacoes: {}, adicionais: [], qty: 1, obs: '' };
      gruposUnico = [];
      render();
    });
  }

  /* -------------------------- EXTRAS MODO ÚNICO --------------------- */
  function renderUnicoExtrasLista() {
    var el = document.getElementById('unico-extras-lista');
    if (!el) return;
    var extras = itens.slice(1);
    if (!extras.length) {
      el.innerHTML = '<p class="text-sm text-muted">Nenhum docinho extra adicionado ainda. Escolha abaixo para complementar a entrega do dia agendado.</p>';
      return;
    }
    el.innerHTML =
      '<h4 class="mb-2" style="font-size:14px;color:var(--rose-700)">Docinhos extras para o mesmo dia (' + extras.length + ')</h4>' +
      extras.map(function (it, idxReal) {
        var idx = idxReal + 1;
        var p = obterProduto(it.id);
        var optsTxt = descricaoOpcoesEncomenda(it);
        var unit = precoUnitarioEncomenda(it);
        return (
          '<div class="order-summary-item" style="align-items:center">' +
            (p && p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '') +
            '<div class="order-summary-item__body">' +
              '<div class="order-summary-item__name">' + u.esc(p ? p.nome : it.id) + '</div>' +
              (optsTxt ? '<div class="order-summary-item__opts">' + u.esc(optsTxt) + '</div>' : '') +
              (it.obs ? '<div class="order-summary-item__opts">Obs.: ' + u.esc(it.obs) + '</div>' : '') +
              '<div class="flex gap-3 items-center mt-2">' +
                '<div class="qty">' +
                  '<button type="button" data-unico-extra-qtd="-1" data-idx="' + idx + '" aria-label="Diminuir">−</button>' +
                  '<input type="text" inputmode="numeric" value="' + it.qty + '" data-unico-extra-input="' + idx + '" aria-label="Quantidade">' +
                  '<button type="button" data-unico-extra-qtd="1" data-idx="' + idx + '" aria-label="Aumentar">+</button>' +
                '</div>' +
                '<button type="button" class="cart-item__remove" data-unico-extra-del="' + idx + '">Remover</button>' +
              '</div>' +
            '</div>' +
            '<div class="order-summary-item__price">' + (unit !== null ? u.fmtBRL(unit * it.qty) : 'Sob consulta') + '</div>' +
          '</div>'
        );
      }).join('');
    el.querySelectorAll('[data-unico-extra-qtd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = Number(b.getAttribute('data-idx'));
        var it = itens[idx];
        if (!it) return;
        it.qty = Math.max(1, it.qty + Number(b.getAttribute('data-unico-extra-qtd')));
        renderUnicoExtrasLista(); renderResumo();
      });
    });
    el.querySelectorAll('[data-unico-extra-input]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var idx = Number(inp.getAttribute('data-unico-extra-input'));
        var it = itens[idx];
        if (!it) return;
        it.qty = Math.max(1, Number(inp.value) || 1);
        renderUnicoExtrasLista(); renderResumo();
      });
    });
    el.querySelectorAll('[data-unico-extra-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = Number(b.getAttribute('data-unico-extra-del'));
        itens.splice(idx, 1);
        renderUnicoExtrasLista(); renderResumo();
        var active = document.querySelector('#unico-extras-cats .chip--cat.active');
        var curCat = active ? active.getAttribute('data-cat') : null;
        var buscEl = document.getElementById('unico-extras-busca');
        var curBusca = buscEl ? buscEl.value.trim() : '';
        if (curCat) initUnicoExtrasGrid(curCat, curBusca);
      });
    });
  }

  function initUnicoExtrasGrid(catSel, buscaTermo) {
    var grid = document.getElementById('unico-extras-grid');
    var searchWrap = document.getElementById('unico-search-wrap');
    if (!grid) return;
    if (!catSel) {
      if (searchWrap) searchWrap.style.display = 'none';
      grid.innerHTML = '';
      return;
    }
    if (searchWrap) searchWrap.style.display = 'flex';
    var todos = SS.catalog.db.getProdutos();
    var filtrados = todos.filter(function (p) {
      if (p.id === produtoFixo.id) return false;
      if (p.categoria !== catSel) return false;
      if (buscaTermo) {
        var t = buscaTermo.toLowerCase();
        return (p.nome && p.nome.toLowerCase().indexOf(t) !== -1) || (p.descricaoCurta && p.descricaoCurta.toLowerCase().indexOf(t) !== -1);
      }
      return true;
    });
    if (!filtrados.length) {
      grid.innerHTML = '<p class="text-muted text-sm" style="grid-column:1/-1;text-align:center;padding:14px">' + (buscaTermo ? 'Nenhum docinho encontrado para "' + u.esc(buscaTermo) + '".' : 'Nenhum produto nesta categoria no momento.') + '</p>';
      return;
    }
    grid.innerHTML = filtrados.map(function (p) {
      var ja = itens.slice(1).filter(function (i) { return i.id === p.id; })[0];
      var precoTxt = (p.preco === null || p.preco === undefined ? 'Sob consulta' : u.fmtBRL(p.preco));
      return (
        '<div class="mini-prod" data-prod-unico="' + u.esc(p.id) + '">' +
          (p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '<span class="mini-prod__fallback" aria-hidden="true"><iconify-icon icon="ph:cake" width="22" height="22"></iconify-icon></span>') +
          '<div class="mini-prod__body">' +
            '<div class="mini-prod__name">' + u.esc(p.nome) + '</div>' +
            '<div class="mini-prod__price">' + precoTxt + '</div>' +
            (ja ? '<div class="text-sm" style="color:var(--success);font-weight:700">' + ja.qty + 'x na lista</div>' : '') +
          '</div>' +
          '<button type="button" class="mini-prod__add" aria-label="Adicionar ' + u.esc(p.nome) + '">+</button>' +
        '</div>'
      );
    }).join('');
    grid.querySelectorAll('[data-prod-unico]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        var id = card.getAttribute('data-prod-unico');
        var p = obterProduto(id);
        if (p) abrirModalEncomenda(p);
      });
    });
    grid.querySelectorAll('.mini-prod__add').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.closest('.mini-prod').getAttribute('data-prod-unico');
        var p = obterProduto(id);
        if (!p) return;
        var grupos = montarGruposEnc(p);
        var precisaEscolha = grupos.some(function (g) { return g.obrigatoria && g.min > 0; });
        if (precisaEscolha) {
          abrirModalEncomenda(p);
          return;
        }
        var qtd = Math.max(1, p.quantidadeMinima || 1);
        adicionarItem(p.id, qtd, '', {}, []);
        SS.ui.toast(p.nome + ' adicionado à entrega!');
      });
    });
  }

  function initUnicoExtras() {
    if (!isModoUnico()) return;
    var catSel = null;
    var busca = '';
    var cats = SS.catalog.db.getCategorias();
    var produtos = SS.catalog.db.getProdutos();
    var catsWrap = document.getElementById('unico-extras-cats');
    if (catsWrap) {
      var catsComProdutos = cats.filter(function (c) {
        return produtos.some(function (p) { return p.categoria === c.id && p.id !== produtoFixo.id; });
      });
      catsWrap.innerHTML = catsComProdutos.map(function (c) {
        var count = produtos.filter(function (p) { return p.categoria === c.id && p.id !== produtoFixo.id; }).length;
        return '<button type="button" class="chip chip--cat" data-cat="' + u.esc(c.id) + '" aria-pressed="false"><iconify-icon icon="ph:' + (c.icone || 'cookie') + '" width="16" height="16"></iconify-icon> ' + u.esc(c.nome) + ' <span class="chip-count">' + count + '</span></button>';
      }).join('');
      catsWrap.querySelectorAll('.chip--cat').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-cat');
          if (catSel === id) {
            catSel = null;
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
          } else {
            catSel = id;
            catsWrap.querySelectorAll('.chip--cat').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
          }
          initUnicoExtrasGrid(catSel, busca);
        });
      });
    }
    var buscEl = document.getElementById('unico-extras-busca');
    if (buscEl) {
      buscEl.addEventListener('input', function () {
        busca = buscEl.value.trim();
        initUnicoExtrasGrid(catSel, busca);
      });
    }
    var importBtn = document.getElementById('unico-import-cart');
    if (importBtn) {
      importBtn.addEventListener('click', function () {
        var cartItens = [];
        try { cartItens = SS.cart.getItens() || []; } catch (e) {}
        if (!cartItens.length) { SS.ui.toast('Seu carrinho está vazio', 'error'); return; }
        var added = 0;
        cartItens.forEach(function (ci) {
          if (ci.id === produtoFixo.id) {
            // já está na encomenda como item principal — soma quantidade se mesma variação, senão adiciona como extra
            var same = itens[0] && itens[0].id === ci.id && JSON.stringify(itens[0].variacoes||{})===JSON.stringify(ci.variacoes||{}) && JSON.stringify(itens[0].adicionais||[])===JSON.stringify(ci.adicionais||[]) ;
            if (same) { itens[0].qty += ci.qty; selUnico.qty = itens[0].qty; var qEl = document.getElementById('unico-qty'); if (qEl) qEl.value = selUnico.qty; }
            else adicionarItem(ci.id, ci.qty, ci.observacao || '', ci.variacoes || {}, ci.adicionais || []);
            added++;
          } else {
            adicionarItem(ci.id, ci.qty, ci.observacao || '', ci.variacoes || {}, ci.adicionais || []);
            added++;
          }
        });
        try { SS.cart.limpar(); } catch (e2) {}
        SS.ui.toast(added + ' item' + (added===1?'':'s') + ' trazido(s) do carrinho para o dia agendado!');
        renderUnicoExtrasLista(); renderResumo(); initUnicoExtrasGrid(catSel, busca);
        var banner = document.getElementById('unico-cart-banner');
        if (banner) banner.style.display = 'none';
      });
    }
    initUnicoExtrasGrid(catSel, busca);
    renderUnicoExtrasLista();
  }

  /* -------------------------- ETAPA 2 ------------------------------- */
  /* Modal encomenda — igual ao "Ver detalhes" (card.js) */
  var encModalState = null;
  function isCheckboxGroupEnc(g) {
    return g.max > 1;
  }
  function montarGruposEnc(p) {
    var grupos = [];
    (p.variacoes || []).forEach(function (v) {
      var min = v.min !== undefined && v.min !== null ? v.min : (v.obrigatoria ? 1 : 0);
      var max = v.max !== undefined && v.max !== null ? v.max : 1;
      grupos.push({ id: v.id || ('var_' + grupos.length), nome: v.nome, min: min, max: max, obrigatoria: !!(v.obrigatoria || min > 0), opcoes: v.opcoes });
    });
    if (p.sabores && p.sabores.length) grupos.push({ id: 'sabor', nome: 'Sabor do bolo', min: 1, max: 1, obrigatoria: true, opcoes: p.sabores.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    if (p.tamanhos && p.tamanhos.length) grupos.push({ id: 'tamanho', nome: 'Tamanho', min: 1, max: 1, obrigatoria: true, opcoes: p.tamanhos.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    return grupos;
  }
  function selArrayEnc(g, sel) {
    var v = sel.variacoes[g.id];
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  }
  function calcExtrasEnc(p, grupos, sel) {
    var extras = 0;
    grupos.forEach(function (g) {
      selArrayEnc(g, sel).forEach(function (it) { if (it.acrescimo) extras += Number(it.acrescimo) || 0; });
    });
    (p.adicionais || []).forEach(function (a) {
      if (sel.adicionais.indexOf(a.nome) !== -1 && a.preco) extras += Number(a.preco) || 0;
    });
    return extras;
  }
  function fecharModalEncomenda() {
    if (!encModalState) return;
    encModalState.overlay.classList.remove('open');
    document.removeEventListener('keydown', encModalState.onKey);
    document.body.style.overflow = '';
    var ov = encModalState.overlay;
    setTimeout(function () { if (encModalState && encModalState.overlay === ov) { ov.remove(); encModalState = null; } }, 250);
  }
  function abrirModalEncomenda(p) {
    if (!p) return;
    fecharModalEncomenda();
    var ICON_X = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    var grupos = montarGruposEnc(p);
    var hasOpcoes = grupos.length > 0 || (p.adicionais && p.adicionais.length);
    var esgotado = !!p.esgotado;
    var semPreco = p.preco === null || p.preco === undefined;
    var FALLBACK_ATTR = u.imgFallbackAttr ? u.imgFallbackAttr() : '';
    function seloHtml(prod) {
      if (prod.esgotado) return '<span class="badge badge--ink">Esgotado</span>';
      var selos = [];
      if (prod.prontaEntrega) selos.push('<span class="badge badge--green">Pronta entrega</span>');
      if (prod.encomenda && !prod.prontaEntrega) selos.push('<span class="badge badge--rose">Sob encomenda</span>');
      return selos.join('');
    }
    var sel = { variacoes: {}, adicionais: [], qty: Math.max(1, p.quantidadeMinima || 1), observacao: '' };
    grupos.forEach(function (g) { if (isCheckboxGroupEnc(g)) sel.variacoes[g.id] = []; });
    var img = (p.imagens && p.imagens[0]) || '';
    var podeAdicionar = !esgotado;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay--prod';
    overlay.innerHTML =
      '<div class="modal' + (img ? '' : ' modal--sem-media') + '" role="dialog" aria-modal="true" aria-label="' + u.esc(p.nome) + '">' +
        '<button type="button" class="modal__close" data-close aria-label="Fechar">' + ICON_X + '</button>' +
        (img ? '<div class="modal__media"><img src="' + u.esc(img) + '" alt="' + u.esc(p.nome) + '"' + FALLBACK_ATTR + '></div>' : '') +
        '<div class="modal__right">' +
          '<div class="modal__scroll">' +
            '<div class="modal__body">' +
              '<div class="modal__badges">' + seloHtml(p) + '</div>' +
              '<span class="product-card__cat">' + u.esc(SS.catalog.db.getCategoriaNome(p.categoria) || 'Nossos doces') + '</span>' +
              '<h3 class="modal__title">' + u.esc(p.nome) + '</h3>' +
              (p.descricao ? '<p class="modal__desc">' + u.esc(p.descricao) + '</p>' : '') +
              '<div class="modal__price" id="enc-pm-preco"></div>' +
              (podeAdicionar && hasOpcoes ? '<div id="enc-pm-opcoes"></div>' : (esgotado ? '' : (!hasOpcoes && !semPreco ? '' : '<p class="text-sm text-muted" style="margin-top:10px">Informe quantidade e, se quiser, uma observação. Valor sob consulta será confirmado pela loja.</p>'))) +
              (podeAdicionar ? '<div class="prod-opts" style="margin-top:16px"><h4>Quantidade <span style="color:var(--muted);font-weight:600;text-transform:none;letter-spacing:0;font-size:12.5px">(mínimo ' + (p.quantidadeMinima || 1) + ')</span></h4><div class="qty" style="height:48px"><button type="button" data-qtd="-1" aria-label="Diminuir quantidade">−</button><input type="text" inputmode="numeric" id="enc-pm-qty" value="' + sel.qty + '" aria-label="Quantidade"><button type="button" data-qtd="1" aria-label="Aumentar quantidade">+</button></div></div>' : '') +
              (podeAdicionar ? '<div class="form-group" style="margin-top:16px"><label class="form-label form-label--row" for="enc-pm-obs">Alguma observação? <span class="form-count" id="enc-pm-count">0 / 140</span></label><textarea class="form-control" id="enc-pm-obs" rows="3" maxlength="140" placeholder="' + u.esc(p.observacoes || 'Ex.: caprichar na decoração ou escrever uma mensagem especial...') + '"></textarea></div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="modal__foot">' +
            (esgotado ? '<button type="button" class="btn btn--outline btn--lg" disabled>Produto esgotado</button>' : '<button type="button" class="btn btn--primary btn--lg" id="enc-pm-add">Adicionar à encomenda</button>') +
            '<button type="button" class="btn btn--outline btn--lg" data-close2>Cancelar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    function fechar() { fecharModalEncomenda(); }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) fechar(); });
    overlay.querySelector('[data-close]').addEventListener('click', fechar);
    var c2 = overlay.querySelector('[data-close2]');
    if (c2) c2.addEventListener('click', fechar);
    var onKey = function (e) { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', onKey);
    function renderPreco() {
      var el = overlay.querySelector('#enc-pm-preco');
      if (!el) return;
      var extras = calcExtrasEnc(p, grupos, sel);
      var base = p.preco === null || p.preco === undefined ? 0 : p.preco;
      var total = Math.round((base + extras) * 100) / 100;
      var temPromo = p.precoPromo && p.precoPromo < p.preco;
      var temAcrescimo = (p.variacoes || []).some(function (v) { return v.opcoes.some(function (o) { return o.acrescimo; }); });
      var todosOk = grupos.every(function (g) { var n = selArrayEnc(g, sel).length; return n >= (g.min || 0) && (g.max ? n <= g.max : true) && (!g.obrigatoria || n > 0); });
      var inicio = temAcrescimo && !todosOk;
      if (p.preco === null || p.preco === undefined) {
        var addTxt = extras > 0 ? ' + adicionais ' + u.fmtBRL(extras) : '';
        el.innerHTML = '<span class="p-now">Valor sob consulta' + (addTxt ? ' <span style="font-size:14px;color:var(--muted)">(' + addTxt.trim() + ')</span>' : '') + '</span>';
        return;
      }
      el.innerHTML =
        (inicio ? '<span class="p-start">A partir de</span>' : '') +
        '<span class="p-now">' + u.fmtBRL(temPromo ? p.precoPromo + extras : total) + '</span>' +
        (temPromo ? '<span class="p-old">' + u.fmtBRL(total) + '</span>' : '') +
        (extras > 0 ? '<span class="p-add">inclui ' + u.fmtBRL(extras) + ' em adicionais</span>' : '');
    }
    function renderOpcoes() {
      var dest = overlay.querySelector('#enc-pm-opcoes');
      if (!dest) return;
      var html = '';
      grupos.forEach(function (g) {
        var isCb = isCheckboxGroupEnc(g);
        var rangeTxt = g.min === g.max ? (g.min === 1 ? 'Escolha 1 opção' : 'Escolha ' + g.min + ' opções') : (g.min === 0 ? 'Escolha até ' + g.max + ' opção' + (g.max > 1 ? 'ões' : '') : 'Escolha de ' + g.min + ' a ' + g.max + ' opções');
        html +=
          '<div class="prod-opts" data-gid="' + u.esc(g.id) + '">' +
            '<div class="prod-opts__head">' +
              '<h4>' + u.esc(g.nome) + (g.obrigatoria ? ' <span style="color:var(--danger)">*</span>' : '') + '</h4>' +
              '<span class="prod-opts__meta"><span class="prod-opts__count" data-count="' + u.esc(g.id) + '">0 / ' + g.max + '</span> · ' + u.esc(rangeTxt) + (g.obrigatoria ? ' · <span style="color:var(--danger);font-weight:700">OBRIGATÓRIO</span>' : '') + '</span>' +
            '</div>';
        if (isCb) {
          html += '<div class="opts' + (g.id === 'sabor' || g.nome.toLowerCase().indexOf('sabor') !== -1 ? ' opts--grid2' : '') + '" role="group" aria-label="' + u.esc(g.nome) + '">' +
            g.opcoes.map(function (o) {
              var acrescimo = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
              return '<label class="opt opt--checkbox" data-grupo="' + u.esc(g.id) + '"><input type="checkbox" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '"><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(o.nome) + acrescimo + '</span></label>';
            }).join('') + '</div>';
        } else {
          html += '<div class="opts' + (g.id === 'sabor' || g.nome.toLowerCase().indexOf('sabor') !== -1 ? ' opts--grid2' : '') + '" role="radiogroup" aria-label="' + u.esc(g.nome) + '">' +
            g.opcoes.map(function (o) {
              var acrescimo = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
              return '<label class="opt" data-grupo="' + u.esc(g.id) + '"><input type="radio" name="enc-pm-' + u.esc(g.id) + '" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '"><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(o.nome) + acrescimo + '</span></label>';
            }).join('') + '</div>';
        }
        html += '</div>';
      });
      if (p.adicionais && p.adicionais.length) {
        html +=
          '<div class="prod-opts">' +
            '<div class="prod-opts__head"><h4>Adicionais</h4></div>' +
            '<div class="opts" role="group" aria-label="Adicionais">' +
              p.adicionais.map(function (a) {
                return '<label class="opt opt--checkbox" data-grupo="adicionais"><input type="checkbox" value="' + u.esc(a.nome) + '" data-preco="' + (Number(a.preco) || 0) + '"><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(a.nome) + (Number(a.preco) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(a.preco) + '</span>' : '') + '</span></label>';
              }).join('') + '</div></div>';
      }
      dest.innerHTML = html;
      dest.querySelectorAll('.prod-opts[data-gid="sabor"]').forEach(function (el) { if (el.querySelectorAll('.opt').length > 4) el.classList.add('has-scroll'); });
      function syncCount(g) {
        var c = dest.querySelector('[data-count="' + g.id + '"]');
        if (c) c.textContent = selArrayEnc(g, sel).length + ' / ' + g.max;
        var wrap2 = dest.querySelector('.prod-opts[data-gid="' + g.id + '"]');
        if (!wrap2) return;
        var n = selArrayEnc(g, sel).length;
        var atLimit = n >= g.max;
        wrap2.querySelectorAll('.opt input[type="checkbox"]').forEach(function (inp) {
          if (!inp.checked) { inp.disabled = atLimit; inp.closest('.opt').classList.toggle('is-disabled', atLimit); }
        });
      }
      grupos.forEach(function (g) {
        var isCb = isCheckboxGroupEnc(g);
        if (!isCb) return;
        var inputs = dest.querySelectorAll('.opt[data-grupo="' + g.id + '"] input[type="checkbox"]');
        inputs.forEach(function (inp) {
          inp.addEventListener('change', function () {
            var arr = sel.variacoes[g.id] || [];
            if (!Array.isArray(arr)) arr = arr ? [arr] : [];
            if (inp.checked) {
              if (arr.length >= g.max) { inp.checked = false; SS.ui.toast('Máximo de ' + g.max + ' opção' + (g.max > 1 ? 'ões' : '') + ' em ' + g.nome, 'error'); return; }
              arr.push({ nome: inp.value, acrescimo: Number(inp.getAttribute('data-acrescimo')) || 0 });
            } else {
              arr = arr.filter(function (x) { return x.nome !== inp.value; });
            }
            sel.variacoes[g.id] = arr;
            inp.closest('.opt').classList.toggle('selected', inp.checked);
            syncCount(g);
            renderPreco();
          });
        });
        syncCount(g);
      });
      dest.querySelectorAll('.opt input[type="radio"]').forEach(function (inp) {
        inp.addEventListener('click', function () {
          var lbl = inp.closest('.opt');
          var gid = lbl.getAttribute('data-grupo');
          var gDef = grupos.filter(function (gg) { return gg.id === gid; })[0];
          if (gDef && gDef.min === 0 && lbl.classList.contains('selected')) {
            inp.checked = false;
            lbl.classList.remove('selected');
            delete sel.variacoes[gid];
            renderPreco();
            return;
          }
        });
        inp.addEventListener('change', function () {
          var lbl = inp.closest('.opt');
          var g = lbl.getAttribute('data-grupo');
          lbl.parentElement.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('selected'); });
          lbl.classList.add('selected');
          sel.variacoes[g] = { nome: inp.value, acrescimo: Number(inp.getAttribute('data-acrescimo')) || 0 };
          renderPreco();
        });
      });
      dest.querySelectorAll('.opt[data-grupo="adicionais"] input[type="checkbox"]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          inp.closest('.opt').classList.toggle('selected', inp.checked);
          if (inp.checked) sel.adicionais.push(inp.value);
          else sel.adicionais = sel.adicionais.filter(function (n) { return n !== inp.value; });
          renderPreco();
        });
      });
    }
    if (podeAdicionar && hasOpcoes) renderOpcoes();
    renderPreco();
    var obsEl = overlay.querySelector('#enc-pm-obs');
    if (obsEl) obsEl.addEventListener('input', function () { overlay.querySelector('#enc-pm-count').textContent = this.value.length + ' / 140'; });
    var qtyEl = overlay.querySelector('#enc-pm-qty');
    if (qtyEl) {
      overlay.querySelectorAll('[data-qtd]').forEach(function (b) {
        b.addEventListener('click', function () {
          var min = p.quantidadeMinima || 1;
          var q = Number(qtyEl.value) || min;
          q += Number(b.getAttribute('data-qtd'));
          qtyEl.value = Math.max(min, q);
        });
      });
      qtyEl.addEventListener('change', function () { var min = p.quantidadeMinima || 1; this.value = Math.max(min, Number(this.value) || min); });
    }
    var addBtn = overlay.querySelector('#enc-pm-add');
    if (addBtn) addBtn.addEventListener('click', function () {
      var faltando = grupos.filter(function (g) {
        var n = selArrayEnc(g, sel).length;
        if (g.obrigatoria && n < g.min) return true;
        if (n > g.max) return true;
        return false;
      });
      if (faltando.length) {
        SS.ui.toast('Selecione: ' + faltando.map(function (g) { return g.nome + ' (' + g.min + '-' + g.max + ')'; }).join(', '), 'error');
        return;
      }
      sel.qty = Math.max(p.quantidadeMinima || 1, Number(overlay.querySelector('#enc-pm-qty').value) || 1);
      sel.observacao = overlay.querySelector('#enc-pm-obs') ? overlay.querySelector('#enc-pm-obs').value.trim() : '';
      adicionarItem(p.id, sel.qty, sel.observacao, sel.variacoes, sel.adicionais);
      SS.ui.toast(p.nome + ' adicionado à encomenda!');
      fechar();
    });
    requestAnimationFrame(function () {
      overlay.classList.add('open');
      var c = overlay.querySelector('[data-close]');
      if (c) c.focus();
    });
    encModalState = { overlay: overlay, onKey: onKey };
  }

  function initPassoProdutos() {
    var catSel = 'todos';
    var buscaTermo = '';
    function getFiltrados() {
      var todos = SS.catalog.db.getProdutos();
      return todos.filter(function (p) {
        var okCat = catSel === 'todos' || p.categoria === catSel;
        if (!okCat) return false;
        if (!buscaTermo) return true;
        var t = buscaTermo.toLowerCase();
        return (p.nome && p.nome.toLowerCase().indexOf(t) !== -1) || (p.descricaoCurta && p.descricaoCurta.toLowerCase().indexOf(t) !== -1) || (p.descricao && p.descricao.toLowerCase().indexOf(t) !== -1);
      });
    }
    function renderMini() {
      var grid = document.getElementById('enc-mini-cat');
      if (!grid) return;
      var produtos = getFiltrados();
      if (!produtos.length) {
        grid.innerHTML = '<p class="text-muted text-sm" style="grid-column:1/-1;text-align:center;padding:18px">' + (buscaTermo ? 'Nenhum produto encontrado para "' + u.esc(buscaTermo) + '".' : 'Nenhum produto nesta categoria.') + '</p>';
        return;
      }
      grid.innerHTML = produtos.map(function (p) {
        var ja = itens.filter(function (i) { return i.id === p.id; })[0];
        var precoTxt = (p.preco === null || p.preco === undefined ? 'Sob consulta' : u.fmtBRL(p.preco));
        return (
          '<div class="mini-prod" data-prod="' + u.esc(p.id) + '">' +
            (p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '<span class="mini-prod__fallback" aria-hidden="true"><iconify-icon icon="ph:cake" width="22" height="22"></iconify-icon></span>') +
            '<div class="mini-prod__body">' +
              '<div class="mini-prod__name">' + u.esc(p.nome) + '</div>' +
              '<div class="mini-prod__price">' + precoTxt + '</div>' +
              (ja ? '<div class="text-sm" style="color:var(--success);font-weight:700">' + ja.qty + 'x na lista</div>' : '') +
            '</div>' +
            '<button type="button" class="mini-prod__add" aria-label="Adicionar ' + u.esc(p.nome) + '">+</button>' +
          '</div>'
        );
      }).join('');
      grid.querySelectorAll('[data-prod]').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('button')) return;
          var id = card.getAttribute('data-prod');
          var p = obterProduto(id);
          if (!p) return;
          abrirModalEncomenda(p);
        });
      });
      grid.querySelectorAll('.mini-prod__add').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = b.closest('.mini-prod').getAttribute('data-prod');
          var p = obterProduto(id);
          if (!p) return;
          abrirModalEncomenda(p);
        });
      });
    }

    document.querySelectorAll('input[name="enc-cat"]').forEach(function (r) {
      r.addEventListener('change', function () {
        catSel = r.value;
        document.querySelectorAll('input[name="enc-cat"]').forEach(function (x) { x.closest('.opt').classList.toggle('selected', x.checked); });
        renderMini();
      });
    });
    var buscEl = document.getElementById('enc-busca');
    if (buscEl) {
      buscEl.addEventListener('input', function () {
        buscaTermo = buscEl.value.trim();
        renderMini();
      });
    }
    renderMini();
    renderListaItens();
  }

  function adicionarItem(id, qty, obs, variacoes, adicionais) {
    var payloadVariacoes = variacoes || {};
    var payloadAdicionais = adicionais || [];
    var existente = itens.filter(function (i) {
      return i.id === id && JSON.stringify(i.variacoes || {}) === JSON.stringify(payloadVariacoes) && JSON.stringify(i.adicionais || []) === JSON.stringify(payloadAdicionais) && (i.obs || '') === (obs || '');
    })[0];
    if (existente) existente.qty += qty;
    else itens.push({ id: id, qty: qty, obs: obs || '', variacoes: payloadVariacoes, adicionais: payloadAdicionais });
    renderListaItens();
    renderResumo();
    // modo único (agendamento com carrinho misto): atualiza extras e resumo também
    if (isModoUnico()) {
      renderUnicoExtrasLista();
      renderResumo();
      try {
        var gUni = document.getElementById('unico-extras-grid');
        if (gUni) {
          var activeChip = document.querySelector('#unico-extras-cats .chip--cat.active');
          var catUni = activeChip ? activeChip.getAttribute('data-cat') : null;
          var buscUniEl = document.getElementById('unico-extras-busca');
          var buscUni = buscUniEl ? buscUniEl.value.trim() : '';
          if (catUni) initUnicoExtrasGrid(catUni, buscUni);
        }
      } catch (eU) {}
    }
    var grid = document.getElementById('enc-mini-cat');
    if (grid) {
      var catSelEl = document.querySelector('input[name="enc-cat"]:checked');
      var catSel = catSelEl ? catSelEl.value : 'todos';
      var buscaEl = document.getElementById('enc-busca');
      var termo = buscaEl ? buscaEl.value.trim().toLowerCase() : '';
      var produtos = SS.catalog.db.getProdutos().filter(function (p) {
        var okCat = catSel === 'todos' || p.categoria === catSel;
        if (!okCat) return false;
        if (!termo) return true;
        return (p.nome && p.nome.toLowerCase().indexOf(termo) !== -1);
      });
      var has = produtos.length;
      if (has) {
        var mini = document.getElementById('enc-mini-cat');
        if (mini) {
          mini.querySelectorAll('[data-prod]').forEach(function (card) {
            var pid = card.getAttribute('data-prod');
            var ja = itens.filter(function (i) { return i.id === pid; })[0];
            var priceEl = card.querySelector('.mini-prod__body');
            if (priceEl && ja) {
              var existingBadge = card.querySelector('.mini-prod__body .text-sm');
              if (!existingBadge) {
                var d = document.createElement('div');
                d.className = 'text-sm';
                d.style.cssText = 'color:var(--success);font-weight:700';
                d.textContent = ja.qty + 'x na lista';
                priceEl.appendChild(d);
              } else {
                existingBadge.textContent = ja.qty + 'x na lista';
              }
            }
          });
        }
      }
    }
  }

  function renderListaItens() {
    var el = document.getElementById('enc-itens-lista');
    if (!el) return;
    if (!itens.length) {
      el.innerHTML = '<p class="text-sm text-muted">Nenhum produto adicionado à encomenda.</p>';
      return;
    }
    el.innerHTML =
      '<h4 class="mb-2" style="font-size:15px;color:var(--rose-700)">Itens da encomenda</h4>' +
      itens.map(function (it, idx) {
        var p = obterProduto(it.id);
        var optsTxt = descricaoOpcoesEncomenda(it);
        var unit = precoUnitarioEncomenda(it);
        return (
          '<div class="order-summary-item" style="align-items:center">' +
            (p && p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '') +
            '<div class="order-summary-item__body">' +
              '<div class="order-summary-item__name">' + u.esc(p ? p.nome : it.id) + '</div>' +
              (optsTxt ? '<div class="order-summary-item__opts">' + u.esc(optsTxt) + '</div>' : (p && (p.sabores && p.sabores.length || p.tamanhos && p.tamanhos.length) ? '<div class="order-summary-item__opts">Consulte sabores/tamanhos com a loja</div>' : '')) +
              (it.obs ? '<div class="order-summary-item__opts">Obs.: ' + u.esc(it.obs) + '</div>' : '') +
              '<div class="flex gap-3 items-center mt-2">' +
                '<div class="qty">' +
                  '<button type="button" data-encqtd="-1" data-idx="' + idx + '" aria-label="Diminuir">−</button>' +
                  '<input type="text" inputmode="numeric" value="' + it.qty + '" data-encinput="' + idx + '" aria-label="Quantidade">' +
                  '<button type="button" data-encqtd="1" data-idx="' + idx + '" aria-label="Aumentar">+</button>' +
                '</div>' +
                '<button type="button" class="cart-item__remove" data-encdel="' + idx + '">Remover</button>' +
              '</div>' +
            '</div>' +
            '<div class="order-summary-item__price">' + (unit !== null ? u.fmtBRL(unit * it.qty) : 'Sob consulta') + '</div>' +
          '</div>'
        );
      }).join('');

    el.querySelectorAll('[data-encqtd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = Number(b.getAttribute('data-idx'));
        var it = itens[idx];
        if (!it) return;
        it.qty = Math.max(1, it.qty + Number(b.getAttribute('data-encqtd')));
        renderListaItens(); renderResumo();
      });
    });
    el.querySelectorAll('[data-encinput]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var idx = Number(inp.getAttribute('data-encinput'));
        var it = itens[idx];
        if (!it) return;
        it.qty = Math.max(1, Number(inp.value) || 1);
        renderListaItens(); renderResumo();
      });
    });
    el.querySelectorAll('[data-encdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = Number(b.getAttribute('data-encdel'));
        itens.splice(idx, 1);
        renderListaItens(); renderResumo();
        var mini = document.getElementById('enc-mini-cat');
        if (mini) initPassoProdutos();
      });
    });
  }

  /* -------------------------- ETAPA 3 ------------------------------- */
  function initPassoEntrega() {
    document.querySelectorAll('input[name="modalidade"]').forEach(function (r) {
      r.addEventListener('change', function () {
        dados.modalidade = r.value;
        document.querySelectorAll('input[name="modalidade"]').forEach(function (x) { x.closest('.opt').classList.toggle('selected', x.checked); });
        document.getElementById('endereco-fields').classList.toggle('hidden', r.value !== 'entrega');
        renderResumo();
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

  /* -------------------------- ETAPA 4 ------------------------------- */
  function initPassoPagamento() {
    /* Módulo compartilhado (pagamento.js): checkboxes com ícones, Pix QR mockado,
       formulário de cartão, troco e botão "Simular pagamento". Após a aprovação
       simulada, envia a encomenda pelo WhatsApp e avança para a confirmação. */
    SS.pagamento.init(document.getElementById('painel-esquerda'), dados, function () {
      finalizar();
      passo = TOTAIS;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    var obs = document.getElementById('f-obs');
    if (obs) obs.addEventListener('input', function () { dados.observacoes = obs.value.trim(); });
  }

  /* -------------------------- REVISÃO ------------------------------- */
  function htmlRevisao() {
    var ent = valorEntrega();
    var total = totalEstimado();
    var end = dados.modalidade === 'entrega' && dados.endereco.rua
      ? [dados.endereco.rua + (dados.endereco.numero ? ', ' + dados.endereco.numero : ''), dados.endereco.complemento, dados.endereco.bairro, dados.endereco.cidade, dados.endereco.referencia ? 'Ref.: ' + dados.endereco.referencia : ''].filter(Boolean).join(', ')
      : '';
    var extrasCountRev = isModoUnico() ? Math.max(0, itens.length - 1) : 0;
    var bannerUnificado = extrasCountRev > 0 ? '<div style="padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;margin-bottom:14px;font-size:13px;color:#065f46"><strong>Entrega unificada:</strong> ' + itens.length + ' itens serão entregues juntos no dia ' + (dados.data ? u.fmtData(dados.data) : 'agendado') + (dados.hora ? ' às ' + dados.hora : '') + ' — tudo em uma única entrega.</div>' : '';
    return (
      bannerUnificado +
      '<div class="review-block"><h3>Evento</h3><ul>' +
        '<li>Data: ' + (dados.data ? u.fmtDataLongo(dados.data) : '—') + (dados.hora ? ' às ' + dados.hora : '') + '</li>' +
        '<li>Tipo: ' + u.esc(dados.evento || '—') + (dados.pessoas ? ' · Pessoas: ' + dados.pessoas : '') + '</li>' +
      '</ul></div>' +
      '<div class="review-block"><h3>Itens (' + itens.length + ')</h3><ul>' +
        itens.map(function (it) {
          var p = obterProduto(it.id);
          var optsTxt = descricaoOpcoesEncomenda(it);
          var unit = precoUnitarioEncomenda(it);
          return '<li>' + it.qty + 'x ' + u.esc(p ? p.nome : it.id) + (optsTxt ? ' (' + u.esc(optsTxt) + ')' : '') + (it.obs ? ' — Obs.: ' + u.esc(it.obs) : '') + ' — ' + (unit !== null ? u.fmtBRL(unit * it.qty) : 'sob consulta') + '</li>';
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
        '<div class="row"><span>Subtotal</span><span>' + u.fmtBRL(subtotalItens()) + '</span></div>' +
        '<div class="row"><span>Entrega</span><span>' + (ent === null ? 'a confirmar' : u.fmtBRL(ent)) + '</span></div>' +
        '<div class="row total"><span>Total estimado</span><span>' + (total === null ? 'a confirmar' : u.fmtBRL(total)) + '</span></div>' +
      '</div>' +
      '<p class="text-sm text-muted mt-2">Valores e disponibilidade de data/horário estão sujeitos à confirmação da confeitaria após o envio.</p>'
    );
  }

  /* -------------------------- VALIDAÇÃO ----------------------------- */
  function validarPasso() {
    if (isModoUnico()) {
      if (passo === 1) {
        var ok = true;
        syncItensUnico();
        if (!dados.data) { var gd = document.getElementById('g-data'); if (gd) gd.classList.add('invalid'); ok = false; }
        else {
          var dt = u.dataDeInput(dados.data);
          var min = u.dataDeInput(dataMinimaISO());
          if (dt && min && dt < min) {
            var gd2 = document.getElementById('g-data'); if (gd2) gd2.classList.add('invalid');
            SS.ui.toast('A data mínima para esta encomenda é ' + u.fmtData(min) + '.', 'error');
            ok = false;
          }
        }
        if (!dados.hora) { var gh = document.getElementById('g-hora'); if (gh) gh.classList.add('invalid'); ok = false; }
        /* evento é opcional no modo produto único */
        if (!ok) SS.ui.toast('Preencha data e horário.', 'error');
        if (!ok) return false;
        /* valida opções obrigatórias do produto */
        var faltando = gruposUnico.filter(function (g) {
          var n = selArrayUnico(g).length;
          if (g.obrigatoria && n < g.min) return true;
          if (n > g.max) return true;
          return false;
        });
        if (faltando.length) {
          SS.ui.toast('Selecione: ' + faltando.map(function (g) { return g.nome + ' (' + g.min + '-' + g.max + ')'; }).join(', '), 'error');
          return false;
        }
        return true;
      }
      if (passo === 2) {
        if (dados.modalidade !== 'entrega') return true;
        var ok3 = true;
        if (!dados.endereco.rua) { document.getElementById('g-rua').classList.add('invalid'); ok3 = false; }
        if (!dados.endereco.numero) { document.getElementById('g-numero').classList.add('invalid'); ok3 = false; }
        if (!dados.endereco.bairro) { document.getElementById('g-bairro').classList.add('invalid'); ok3 = false; }
        if (!ok3) SS.ui.toast('Preencha os dados de entrega.', 'error');
        return ok3;
      }
      if (passo === 3) {
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
    if (passo === 1) {
      var ok = true;
      if (!dados.data) { document.getElementById('g-data').classList.add('invalid'); ok = false; }
      else {
        // valida prazo mínimo sem limpar o campo enquanto digita
        var dt = u.dataDeInput(dados.data);
        var min = u.dataDeInput(dataMinimaISO());
        if (dt && min && dt < min) {
          document.getElementById('g-data').classList.add('invalid');
          SS.ui.toast('A data mínima para esta encomenda é ' + u.fmtData(min) + '.', 'error');
          ok = false;
        }
      }
      if (!dados.hora) { document.getElementById('g-hora').classList.add('invalid'); ok = false; }
      if (!dados.evento) { document.getElementById('g-evento').classList.add('invalid'); ok = false; }
      if (!ok && !dados.data) SS.ui.toast('Preencha data, horário e tipo de evento.', 'error');
      return ok;
    }
    if (passo === 2) {
      if (!itens.length) { SS.ui.toast('Adicione pelo menos um produto à encomenda.', 'error'); return false; }
      return true;
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

  /* -------------------------- FINALIZAÇÃO --------------------------- */
  function finalizar() {
    if (!validarPasso()) return;
    var trocoValor = dados.troco ? Number(String(dados.trocoPara).replace(',', '.')) || 0 : 0;
    syncItensUnico();
    var extrasCount = isModoUnico() ? Math.max(0, itens.length - 1) : 0;
    var obsFinal = dados.observacoes || '';
    if (isModoUnico() && extrasCount > 0) {
      var notaUnificada = 'Entrega unificada: todos os itens (' + itens.length + ') serão entregues juntos no dia agendado (' + (dados.data ? u.fmtData(dados.data) : '') + (dados.hora ? ' às ' + dados.hora : '') + ').';
      obsFinal = obsFinal ? obsFinal + ' | ' + notaUnificada : notaUnificada;
    }
    var pedido = {
      numero: u.gerarNumeroPedido(),
      tipo: isModoUnico() && extrasCount > 0 ? 'Encomenda agendada (entrega unificada — ' + itens.length + ' itens no mesmo dia)' : 'Encomenda agendada',
      cliente: dados.cliente || '',
      telefone: dados.telefone || '',
      itens: itens.map(function (it) {
        var p = obterProduto(it.id);
        var unit = precoUnitarioEncomenda(it);
        return {
          nome: p ? p.nome : it.id,
          qty: it.qty,
          observacao: it.obs + (descricaoOpcoesEncomenda(it) ? ' | Opções: ' + descricaoOpcoesEncomenda(it) : ''),
          unitPrice: unit,
          variacoes: it.variacoes || {},
          adicionais: it.adicionais || [],
        };
      }),
      encomenda: { data: dados.data, hora: dados.hora, evento: dados.evento, pessoas: dados.pessoas },
      modalidade: dados.modalidade,
      endereco: dados.modalidade === 'entrega' ? dados.endereco : null,
      pagamento: dados.pagamento,
      momentoPagamento: dados.momentoPagamento === 'antecipado' ? 'Antecipado' : 'Na entrega/retirada',
      troco: trocoValor,
      pagamentoSimulado: true,
      cardMarca: SS.pagamento.cardMarca(dados),
      cardUltimos4: SS.pagamento.cardUltimos4(dados),
      subtotal: subtotalItens(),
      entregaValor: valorEntrega(),
      total: totalEstimado(),
      observacoes: obsFinal,
    };
    var msg = SS.whatsapp.montarMensagemPedido(pedido);
    SS.whatsapp.abrir(msg, true);
    SS.ui.toast('Abrindo WhatsApp… envie a mensagem para solicitar a encomenda.' + (extrasCount > 0 ? ' Tudo será entregue junto no dia agendado!' : ''));
    // Entrega unificada: limpa carrinho após enviar para não duplicar itens no próximo pedido
    try { if (extrasCount > 0 || SS.cart.contar() > 0) SS.cart.limpar(); } catch (e) {}
    try { sessionStorage.removeItem('ss_encomenda_selecao'); } catch (e2) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();
    detectarProdutoFixo();
    if (isModoUnico()) syncItensUnico();
    render();
  });
})(window.SS);