/* =========================================================================
   SUBLIME SONHOS — PÁGINA DO PRODUTO
   Galeria, variações, adicionais, preço dinâmico, carrinho e relacionados.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var produto = null;
  var sel = { variacoes: {}, adicionais: [], qty: 1, observacao: '' };
  var grupos = [];

  function obterSlug() {
    return new URLSearchParams(location.search).get('slug') || '';
  }

  function precoAtual() {
    if (!produto || produto.preco === null || produto.preco === undefined) return null;
    var preco = produto.preco;
    grupos.forEach(function (g) {
      var v = sel.variacoes[g.id];
      if (v && v.acrescimo) preco += Number(v.acrescimo) || 0;
    });
    (produto.adicionais || []).forEach(function (a) {
      if (sel.adicionais.indexOf(a.nome) !== -1 && a.preco) preco += Number(a.preco) || 0;
    });
    return Math.round(preco * 100) / 100;
  }

  function renderPreco() {
    var el = document.getElementById('p-preco');
    var preco = precoAtual();
    if (preco === null) {
      el.innerHTML = '<span class="p-now" style="font-size:26px">Valor sob consulta</span>';
      return;
    }
    var txt = u.fmtBRL(preco);
    var inicio = (produto.variacoes || []).some(function (v) { return v.opcoes.some(function (o) { return o.acrescimo; }); }) && !gruposSelecionados();
    el.innerHTML =
      (inicio ? '<span class="p-start">A partir de</span>' : '') +
      '<span class="p-now">' + txt + '</span>' +
      (produto.precoPromo && produto.precoPromo < produto.preco ? '<span class="p-old">' + u.fmtBRL(produto.preco) + '</span>' : '');
  }

  function gruposSelecionados() {
    return grupos.every(function (g) { return sel.variacoes[g.id]; });
  }

  function opcoesObrigatoriasFaltando() {
    return grupos.filter(function (g) { return g.obrigatoria && !sel.variacoes[g.id]; });
  }

  function renderOpcoes() {
    var wrap = document.getElementById('prod-opcoes');
    if (!wrap) return;
    grupos = [];
    (produto.variacoes || []).forEach(function (v, vi) {
      grupos.push({ id: 'var_' + vi, nome: v.nome, obrigatoria: !!v.obrigatoria, opcoes: v.opcoes });
    });
    if (produto.sabores && produto.sabores.length) grupos.push({ id: 'sabor', nome: 'Sabor', obrigatoria: true, opcoes: produto.sabores.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    if (produto.tamanhos && produto.tamanhos.length) grupos.push({ id: 'tamanho', nome: 'Tamanho', obrigatoria: true, opcoes: produto.tamanhos.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });

    var html = '';
    grupos.forEach(function (g) {
      html +=
        '<div class="prod-opts">' +
          '<h4>' + u.esc(g.nome) + (g.obrigatoria ? ' <span style="color:var(--danger)">*</span>' : '') + '</h4>' +
          '<div class="opts" role="radiogroup" aria-label="' + u.esc(g.nome) + '">' +
            g.opcoes.map(function (o, oi) {
              var acrescimo = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
              return (
                '<label class="opt" data-grupo="' + g.id + '">' +
                  '<input type="radio" name="' + u.esc(g.id) + '" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '">' +
                  '<span class="opt__dot" aria-hidden="true"></span>' +
                  '<span class="opt__label">' + u.esc(o.nome) + acrescimo + '</span>' +
                '</label>'
              );
            }).join('') +
          '</div>' +
        '</div>';
    });

    if (produto.adicionais && produto.adicionais.length) {
      html +=
        '<div class="prod-opts">' +
          '<h4>Adicionais</h4>' +
          '<div class="opts" role="group" aria-label="Adicionais">' +
            produto.adicionais.map(function (a) {
              return (
                '<label class="opt opt--checkbox" data-grupo="adicionais">' +
                  '<input type="checkbox" value="' + u.esc(a.nome) + '" data-preco="' + (Number(a.preco) || 0) + '">' +
                  '<span class="opt__dot" aria-hidden="true"></span>' +
                  '<span class="opt__label">' + u.esc(a.nome) + (Number(a.preco) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(a.preco) + '</span>' : '') + '</span>' +
                '</label>'
              );
            }).join('') +
          '</div>' +
        '</div>';
    }

    html +=
      '<div class="prod-opts">' +
        '<h4>Quantidade <span style="color:var(--muted);font-weight:600;text-transform:none;letter-spacing:0;font-size:12.5px">(mínimo ' + (produto.quantidadeMinima || 1) + ')</span></h4>' +
        '<div class="qty" style="height:52px">' +
          '<button type="button" data-qtd="-1" aria-label="Diminuir quantidade">−</button>' +
          '<input type="text" inputmode="numeric" id="qty-input" value="1" aria-label="Quantidade">' +
          '<button type="button" data-qtd="1" aria-label="Aumentar quantidade">+</button>' +
        '</div>' +
      '</div>' +
      '<div class="prod-opts">' +
        '<h4>Observações</h4>' +
        '<textarea class="form-control" id="obs-input" rows="2" placeholder="' + u.esc(produto.observacoes || 'Alguma observação sobre o seu pedido?') + '"></textarea>' +
      '</div>';

    wrap.innerHTML = html;

    wrap.querySelectorAll('.opt input[type="radio"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var lbl = inp.closest('.opt');
        var g = lbl.getAttribute('data-grupo');
        lbl.parentElement.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('selected'); });
        lbl.classList.add('selected');
        sel.variacoes[g] = { nome: inp.value, acrescimo: Number(inp.getAttribute('data-acrescimo')) || 0 };
        renderPreco();
      });
    });
    wrap.querySelectorAll('.opt input[type="checkbox"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        inp.closest('.opt').classList.toggle('selected', inp.checked);
        if (inp.checked) sel.adicionais.push(inp.value);
        else sel.adicionais = sel.adicionais.filter(function (n) { return n !== inp.value; });
        renderPreco();
      });
    });
    wrap.querySelectorAll('[data-qtd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var min = produto.quantidadeMinima || 1;
        var q = Number(document.getElementById('qty-input').value) || min;
        q += Number(b.getAttribute('data-qtd'));
        document.getElementById('qty-input').value = Math.max(min, q);
      });
    });
    var qtyInput = document.getElementById('qty-input');
    qtyInput.addEventListener('change', function () {
      var min = produto.quantidadeMinima || 1;
      qtyInput.value = Math.max(min, Number(qtyInput.value) || min);
    });
    document.getElementById('obs-input').addEventListener('input', function () { sel.observacao = this.value; });
  }

  function coletarSelecao() {
    sel.qty = Math.max(produto.quantidadeMinima || 1, Number(document.getElementById('qty-input').value) || 1);
    sel.observacao = document.getElementById('obs-input').value.trim();
    return sel;
  }

  function validar() {
    var faltando = opcoesObrigatoriasFaltando();
    if (faltando.length) {
      SS.ui.toast('Selecione: ' + faltando.map(function (g) { return g.nome; }).join(', '), 'error');
      faltando[0] && document.querySelector('.prod-opts h4') && faltando[0].id && null;
      return false;
    }
    return true;
  }

  function renderProduto() {
    var el = document.getElementById('produto-conteudo');
    if (!produto) {
      el.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__ico" aria-hidden="true"><iconify-icon icon="ph:cake" width="52" height="52"></iconify-icon></div>' +
          '<h2>Produto não encontrado</h2>' +
          '<p>Este produto pode ter sido desativado ou o link está incorreto.</p>' +
          '<a class="btn btn--primary mt-3" href="index.html#destaques">Ver catálogo</a>' +
        '</div>';
      document.title = 'Produto não encontrado — Sublime Sonhos';
      return;
    }

    document.title = produto.nome + ' — Sublime Sonhos';
    var bcCat = document.getElementById('bc-cat');
    var nomeCat = SS.catalog.db.getCategoriaNome(produto.categoria) || 'Produtos';
    bcCat.innerHTML = '<a href="index.html#cat-' + encodeURIComponent(produto.categoria) + '">' + u.esc(nomeCat) + '</a>';
    document.getElementById('bc-nome').textContent = produto.nome;

    var semPreco = produto.preco === null || produto.preco === undefined;
    var selos = '';
    if (produto.esgotado) selos += '<span class="badge badge--ink">Esgotado</span>';
    if (produto.prontaEntrega) selos += '<span class="badge badge--green">Pronta entrega</span>';
    if (produto.encomenda && !produto.prontaEntrega) selos += '<span class="badge badge--gold">Sob encomenda</span>';

    var galeria = (produto.imagens && produto.imagens.length) ? produto.imagens : [];
    var main = galeria[0] || '';
    var thumbs = galeria.map(function (src, i) {
      return '<button type="button" class="' + (i === 0 ? 'active' : '') + '" data-gal="' + i + '" aria-label="Ver imagem ' + (i + 1) + ' do produto"><img src="' + u.esc(src) + '" alt="' + u.esc(produto.nome) + ' — foto ' + (i + 1) + '" loading="lazy"></button>';
    }).join('');

    el.innerHTML =
      '<div class="prod-grid">' +
        '<div class="gallery reveal">' +
          '<div class="gallery__main">' +
            (main ? '<img id="gal-main" src="' + u.esc(main) + '" alt="' + u.esc(produto.nome) + '">' : '<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--muted)">Sem foto</div>') +
          '</div>' +
          (thumbs ? '<div class="gallery__thumbs">' + thumbs + '</div>' : '') +
        '</div>' +
        '<div class="prod-info reveal">' +
          '<div class="product-card__badges" style="position:static;margin-bottom:10px">' + selos + '</div>' +
          '<h1 class="prod-info__title">' + u.esc(produto.nome) + '</h1>' +
          '<a class="prod-info__cat text-sm" href="index.html#cat-' + encodeURIComponent(produto.categoria) + '" style="color:var(--rose-600);font-weight:700">' + u.esc(SS.catalog.db.getCategoriaNome(produto.categoria)) + '</a>' +
          '<p class="prod-info__desc">' + u.esc(produto.descricao || '') + '</p>' +
          '<div class="prod-info__price" id="p-preco"></div>' +
          '<ul class="prod-info__meta">' +
            '<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>' + (produto.prontaEntrega ? 'Disponível para pronta entrega (confirme a disponibilidade do dia pelo WhatsApp).' : 'Produzido sob encomenda — ' + (produto.prazoProducaoDias || 0) + ' dia' + ((produto.prazoProducaoDias || 0) === 1 ? '' : 's') + ' de antecedência mínima.') + '</span></li>' +
            (produto.conservacao ? '<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Conservação: ' + u.esc(produto.conservacao) + '</span></li>' : '') +
            '<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span>Pedido enviado pelo WhatsApp e confirmado pela loja.</span></li>' +
          '</ul>' +
          '<div id="prod-opcoes"></div>' +
          '<div class="prod-actions">' +
            (semPreco
              ? '<a class="btn btn--primary btn--lg w-full" href="encomenda.html">Encomendar este produto</a>'
              : '<button type="button" class="btn btn--primary btn--lg" id="btn-add-cart">Adicionar ao carrinho</button>' +
                '<button type="button" class="btn btn--dark btn--lg" id="btn-buy-now">Comprar agora</button>') +
          '</div>' +
          '<p class="text-sm text-muted mt-2">Entrega: ' + u.esc(cfgNota()) + '</p>' +
        '</div>' +
      '</div>';

    function cfgNota() {
      return SS.config.loja.entrega.nota;
    }

    el.querySelectorAll('[data-gal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.getAttribute('data-gal'));
        var img = document.getElementById('gal-main');
        if (img) img.src = galeria[i];
        el.querySelectorAll('[data-gal]').forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });

    if (!semPreco) {
      renderOpcoes();
      renderPreco();
      document.getElementById('btn-add-cart').addEventListener('click', function () {
        if (!validar()) return;
        SS.cart.adicionar(produto, coletarSelecao());
        SS.ui.toast('Adicionado ao carrinho!');
        if (SS.ui.toggleCart) SS.ui.toggleCart(true);
      });
      document.getElementById('btn-buy-now').addEventListener('click', function () {
        if (!validar()) return;
        SS.cart.adicionar(produto, coletarSelecao());
        location.href = 'carrinho.html';
      });
    } else {
      renderPreco();
    }
  }

  function renderRelacionados() {
    var wrap = document.getElementById('relacionados-wrap');
    if (!produto) return;
    var relacionados = SS.catalog.db.getProdutos().filter(function (p) { return p.id !== produto.id && p.categoria === produto.categoria; });
    if (relacionados.length < 4) {
      SS.catalog.db.getProdutos().forEach(function (p) {
        if (relacionados.length >= 4) return;
        if (p.id !== produto.id && relacionados.indexOf(p) === -1) relacionados.push(p);
      });
    }
    relacionados = relacionados.slice(0, 4);
    if (!relacionados.length) return;
    wrap.innerHTML =
      '<div class="section-head section-head--left reveal">' +
        '<p class="eyebrow">Você também pode gostar</p>' +
        '<h2 class="sec-title" style="font-size:30px">Produtos relacionados</h2>' +
      '</div>' +
      '<div class="grid-products grid-products--3" id="grid-relacionados"></div>';
    var grid = document.getElementById('grid-relacionados');
    grid.innerHTML = relacionados.map(SS.card.render).join('');
    SS.card.initContainer(grid);
    grid.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();
    produto = SS.catalog.db.getProduto(obterSlug());
    renderProduto();
    renderRelacionados();
  });
})(window.SS);