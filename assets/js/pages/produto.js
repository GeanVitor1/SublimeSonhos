window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var produto = null;
  var sel = { variacoes: {}, adicionais: [], qty: 1, observacao: '' };
  var grupos = [];

  function obterSlug() { return new URLSearchParams(location.search).get('slug') || ''; }

  function isCheckboxGroup(g) { return !(g.min === 1 && g.max === 1); }
  function selArray(g) {
    var v = sel.variacoes[g.id];
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  }

  function precoAtual() {
    if (!produto || produto.preco === null || produto.preco === undefined) return 0;
    var extras = 0;
    grupos.forEach(function (g) { selArray(g).forEach(function (it) { if (it.acrescimo) extras += Number(it.acrescimo) || 0; }); });
    (produto.adicionais || []).forEach(function (a) { if (sel.adicionais.indexOf(a.nome) !== -1 && a.preco) extras += Number(a.preco) || 0; });
    return Math.round((produto.preco + extras) * 100) / 100;
  }

  function renderPreco() {
    var el = document.getElementById('p-preco');
    if (!el) return;
    if (produto.preco === null || produto.preco === undefined) {
      var ex = 0;
      grupos.forEach(function (g) { selArray(g).forEach(function (it) { ex += Number(it.acrescimo) || 0; }); });
      (produto.adicionais || []).forEach(function (a) { if (sel.adicionais.indexOf(a.nome) !== -1) ex += Number(a.preco) || 0; });
      el.innerHTML = '<span class="p-now" style="font-size:22px">Valor sob consulta' + (ex ? ' <span style="font-size:14px;color:var(--muted)">+ ' + u.fmtBRL(ex) + ' adicionais</span>' : '') + '</span>';
      return;
    }
    var extras = 0;
    grupos.forEach(function (g) { selArray(g).forEach(function (it) { extras += Number(it.acrescimo) || 0; }); });
    (produto.adicionais || []).forEach(function (a) { if (sel.adicionais.indexOf(a.nome) !== -1) extras += Number(a.preco) || 0; });
    var total = precoAtual();
    var temPromo = produto.precoPromo && produto.precoPromo < produto.preco;
    var ok = grupos.every(function (g) { var n = selArray(g).length; return n >= g.min && n <= g.max && (!g.obrigatoria || n > 0); });
    var inicio = grupos.some(function (g) { return g.opcoes.some(function (o) { return o.acrescimo; }); }) && !ok;
    el.innerHTML =
      (inicio ? '<span class="p-start">A partir de</span>' : '') +
      '<span class="p-now">' + u.fmtBRL(temPromo ? produto.precoPromo + extras : total) + '</span>' +
      (temPromo ? '<span class="p-old">' + u.fmtBRL(total) + '</span>' : '') +
      (extras ? '<span style="font-size:13px;color:var(--muted);font-weight:600">inclui ' + u.fmtBRL(extras) + ' em adicionais</span>' : '');
  }

  function validarGrupos() {
    return grupos.filter(function (g) {
      var n = selArray(g).length;
      if (g.obrigatoria && n < g.min) return true;
      if (n > g.max) return true;
      return false;
    });
  }

  function renderOpcoes() {
    var wrap = document.getElementById('prod-opcoes');
    if (!wrap) return;
    grupos = [];
    (produto.variacoes || []).forEach(function (v) {
      var min = v.min !== undefined && v.min !== null ? v.min : (v.obrigatoria ? 1 : 0);
      var max = v.max !== undefined && v.max !== null ? v.max : 1;
      grupos.push({ id: v.id || ('var_' + grupos.length), nome: v.nome, min: min, max: max, obrigatoria: !!(v.obrigatoria || min > 0), opcoes: v.opcoes });
    });
    if (produto.sabores && produto.sabores.length) grupos.push({ id: 'sabor', nome: 'Sabor do bolo', min: 1, max: 1, obrigatoria: true, opcoes: produto.sabores.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    if (produto.tamanhos && produto.tamanhos.length) grupos.push({ id: 'tamanho', nome: 'Tamanho', min: 1, max: 1, obrigatoria: true, opcoes: produto.tamanhos.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });

    sel = { variacoes: {}, adicionais: [], qty: Math.max(1, produto.quantidadeMinima || 1), observacao: '' };
    grupos.forEach(function (g) { if (isCheckboxGroup(g)) sel.variacoes[g.id] = []; });

    var html = '';
    grupos.forEach(function (g) {
      var isCb = isCheckboxGroup(g);
      var rangeTxt = g.min === g.max ? (g.min === 1 ? 'Escolha 1 opção' : 'Escolha ' + g.min + ' opções') : (g.min === 0 ? 'Escolha até ' + g.max + ' opção' + (g.max > 1 ? 'ões' : '') : 'Escolha de ' + g.min + ' a ' + g.max + ' opções');
      html += '<div class="prod-opts" data-gid="' + u.esc(g.id) + '"><div class="prod-opts__head"><h4>' + u.esc(g.nome) + (g.obrigatoria ? ' <span style="color:var(--danger)">*</span>' : '') + '</h4><span class="prod-opts__meta"><span class="prod-opts__count" data-count="' + u.esc(g.id) + '">0 / ' + g.max + '</span> · ' + u.esc(rangeTxt) + (g.obrigatoria ? ' · <span style="color:var(--danger);font-weight:700">OBRIGATÓRIO</span>' : '') + '</span></div>';
      if (isCb) {
        html += '<div class="opts' + (g.id === 'sabor' || g.nome.toLowerCase().indexOf('sabor') !== -1 ? ' opts--grid2' : '') + '" role="group" aria-label="' + u.esc(g.nome) + '">' + g.opcoes.map(function (o) {
          var ac = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
          return '<label class="opt opt--checkbox" data-grupo="' + u.esc(g.id) + '"><input type="checkbox" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '"><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(o.nome) + ac + '</span></label>';
        }).join('') + '</div>';
      } else {
        html += '<div class="opts' + (g.id === 'sabor' || g.nome.toLowerCase().indexOf('sabor') !== -1 ? ' opts--grid2' : '') + '" role="radiogroup" aria-label="' + u.esc(g.nome) + '">' + g.opcoes.map(function (o) {
          var ac = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
          return '<label class="opt" data-grupo="' + g.id + '"><input type="radio" name="' + u.esc(g.id) + '" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '"><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(o.nome) + ac + '</span></label>';
        }).join('') + '</div>';
      }
      html += '</div>';
    });

    if (produto.adicionais && produto.adicionais.length) {
      html += '<div class="prod-opts"><h4>Adicionais</h4><div class="opts" role="group" aria-label="Adicionais">' + produto.adicionais.map(function (a) {
        return '<label class="opt opt--checkbox" data-grupo="adicionais"><input type="checkbox" value="' + u.esc(a.nome) + '" data-preco="' + (Number(a.preco) || 0) + '"><span class="opt__dot" aria-hidden="true"></span><span class="opt__label">' + u.esc(a.nome) + (Number(a.preco) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(a.preco) + '</span>' : '') + '</span></label>';
      }).join('') + '</div></div>';
    }

    html += '<div class="prod-opts"><h4>Quantidade <span style="color:var(--muted);font-weight:600;text-transform:none;letter-spacing:0;font-size:12.5px">(mínimo ' + (produto.quantidadeMinima || 1) + ')</span></h4><div class="qty" style="height:52px"><button type="button" data-qtd="-1" aria-label="Diminuir">−</button><input type="text" inputmode="numeric" id="qty-input" value="1" aria-label="Quantidade"><button type="button" data-qtd="1" aria-label="Aumentar">+</button></div></div><div class="prod-opts"><h4>Observações</h4><textarea class="form-control" id="obs-input" rows="2" placeholder="' + u.esc(produto.observacoes || 'Alguma observação sobre o seu pedido?') + '"></textarea></div>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('.prod-opts[data-gid="sabor"]').forEach(function (el) { if (el.querySelectorAll('.opt').length > 4) el.classList.add('has-scroll'); });

    function syncCount(g) {
      var c = wrap.querySelector('[data-count="' + g.id + '"]');
      if (c) c.textContent = selArray(g).length + ' / ' + g.max;
      var atLimit = selArray(g).length >= g.max;
      wrap.querySelectorAll('.opt[data-grupo="' + g.id + '"] input[type="checkbox"]').forEach(function (inp) {
        if (!inp.checked) { inp.disabled = atLimit; inp.closest('.opt').classList.toggle('is-disabled', atLimit); }
      });
    }

    grupos.forEach(function (g) {
      if (!isCheckboxGroup(g)) return;
      wrap.querySelectorAll('.opt[data-grupo="' + g.id + '"] input[type="checkbox"]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var arr = sel.variacoes[g.id] || [];
          if (!Array.isArray(arr)) arr = [];
          if (inp.checked) {
            if (arr.length >= g.max) { inp.checked = false; SS.ui.toast('Máximo de ' + g.max + ' em ' + g.nome, 'error'); return; }
            arr.push({ nome: inp.value, acrescimo: Number(inp.getAttribute('data-acrescimo')) || 0 });
          } else arr = arr.filter(function (x) { return x.nome !== inp.value; });
          sel.variacoes[g.id] = arr;
          inp.closest('.opt').classList.toggle('selected', inp.checked);
          syncCount(g); renderPreco();
        });
      });
      syncCount(g);
    });

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
    wrap.querySelectorAll('.opt[data-grupo="adicionais"] input[type="checkbox"]').forEach(function (inp) {
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
    document.getElementById('qty-input').addEventListener('change', function () {
      var min = produto.quantidadeMinima || 1;
      this.value = Math.max(min, Number(this.value) || min);
    });
    document.getElementById('obs-input').addEventListener('input', function () { sel.observacao = this.value; });
  }

  function coletarSelecao() {
    sel.qty = Math.max(produto.quantidadeMinima || 1, Number(document.getElementById('qty-input').value) || 1);
    sel.observacao = document.getElementById('obs-input').value.trim();
    return sel;
  }

  function validar() {
    var faltando = validarGrupos();
    if (faltando.length) {
      SS.ui.toast('Selecione: ' + faltando.map(function (g) { return g.nome + ' (' + g.min + '-' + g.max + ')'; }).join(', '), 'error');
      return false;
    }
    return true;
  }

  function renderProduto() {
    var el = document.getElementById('produto-conteudo');
    if (!produto) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state__ico" aria-hidden="true"><iconify-icon icon="ph:cake" width="52" height="52"></iconify-icon></div><h2>Produto não encontrado</h2><p>Este produto pode ter sido desativado ou o link está incorreto.</p><a class="btn btn--primary mt-3" href="index.html#destaques">Ver catálogo</a></div>';
      document.title = 'Produto não encontrado — Sublime Sonhos';
      return;
    }
    document.title = produto.nome + ' — Sublime Sonhos';
    document.getElementById('bc-cat').innerHTML = '<a href="index.html#cat-' + encodeURIComponent(produto.categoria) + '">' + u.esc(SS.catalog.db.getCategoriaNome(produto.categoria) || 'Produtos') + '</a>';
    document.getElementById('bc-nome').textContent = produto.nome;
    var semPreco = produto.precoSobConsulta || produto.preco === null || produto.preco === undefined;
    var selos = '';
    if (produto.esgotado) selos += '<span class="badge badge--ink">Esgotado</span>';
    if (produto.prontaEntrega) selos += '<span class="badge badge--green">Pronta entrega</span>';
    if (produto.encomenda && !produto.prontaEntrega) selos += '<span class="badge badge--gold">Sob encomenda</span>';
    var galeria = (produto.imagens && produto.imagens.length) ? produto.imagens : [];
    var main = galeria[0] || '';
    var thumbs = galeria.map(function (src, i) { return '<button type="button" class="' + (i === 0 ? 'active' : '') + '" data-gal="' + i + '" aria-label="Ver imagem ' + (i + 1) + '"><img src="' + u.esc(src) + '" alt="' + u.esc(produto.nome) + ' — foto ' + (i + 1) + '" loading="lazy"></button>'; }).join('');
    var esgotado = !!produto.esgotado;
    var podeAdicionar = !esgotado;
    el.innerHTML =
      '<div class="prod-grid">' +
        '<div class="gallery reveal"><div class="gallery__main">' + (main ? '<img id="gal-main" src="' + u.esc(main) + '" alt="' + u.esc(produto.nome) + '">' : '<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--muted)">Sem foto</div>') + '</div>' + (thumbs ? '<div class="gallery__thumbs">' + thumbs + '</div>' : '') + '</div>' +
        '<div class="prod-info reveal"><div class="product-card__badges" style="position:static;margin-bottom:10px">' + selos + '</div><h1 class="prod-info__title">' + u.esc(produto.nome) + '</h1><a class="prod-info__cat text-sm" href="index.html#cat-' + encodeURIComponent(produto.categoria) + '" style="color:var(--rose-600);font-weight:700">' + u.esc(SS.catalog.db.getCategoriaNome(produto.categoria)) + '</a><p class="prod-info__desc">' + u.esc(produto.descricao || '') + '</p><div class="prod-info__price" id="p-preco"></div><ul class="prod-info__meta"><li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>' + (produto.prontaEntrega ? 'Disponível para pronta entrega (confirme a disponibilidade do dia pelo WhatsApp).' : 'Produzido sob encomenda — ' + (produto.prazoProducaoDias || 0) + ' dia' + ((produto.prazoProducaoDias || 0) === 1 ? '' : 's') + ' de antecedência mínima.') + '</span></li>' + (produto.conservacao ? '<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Conservação: ' + u.esc(produto.conservacao) + '</span></li>' : '') + '<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span>Pedido enviado pelo WhatsApp e confirmado pela loja.</span></li></ul><div id="prod-opcoes"></div><div class="prod-actions">' + (esgotado ? '<button type="button" class="btn btn--outline btn--lg" disabled>Produto esgotado</button>' : '<button type="button" class="btn btn--primary btn--lg" id="btn-add-cart">Adicionar ao carrinho</button><button type="button" class="btn btn--dark btn--lg" id="btn-buy-now">Comprar agora</button>') + '</div><p class="text-sm text-muted mt-2">Entrega: ' + u.esc(SS.config.loja.entrega.nota) + '</p></div>' +
      '</div>';
    el.querySelectorAll('[data-gal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.getAttribute('data-gal'));
        var img = document.getElementById('gal-main');
        if (img) img.src = galeria[i];
        el.querySelectorAll('[data-gal]').forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });

    if (podeAdicionar) {
      renderOpcoes(); renderPreco();
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
      var pr = document.getElementById('p-preco');
      if (pr) pr.innerHTML = '<span class="p-now">Valor sob consulta</span>';
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
    wrap.innerHTML = '<div class="section-head section-head--left reveal"><p class="eyebrow">Você também pode gostar</p><h2 class="sec-title" style="font-size:30px">Produtos relacionados</h2></div><div class="grid-products grid-products--3" id="grid-relacionados"></div>';
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
