/* =========================================================================
   SUBLIME SONHOS — RENDERIZAÇÃO DE CARTÕES DE PRODUTO (compartilhado)
   Modal rápido de produto: detalhes, observação (0/140) e adicionar.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;
  var FALLBACK_ATTR = u.imgFallbackAttr();

  function seloDoProduto(p) {
    var selos = [];
    if (p.esgotado) return '<span class="badge badge--ink">Esgotado</span>';
    if (p.prontaEntrega) selos.push('<span class="badge badge--green">Pronta entrega</span>');
    if (p.encomenda && !p.prontaEntrega) selos.push('<span class="badge badge--rose">Sob encomenda</span>');
    return selos.join('');
  }

  function precoHtml(p) {
    if (p.precoSobConsulta || p.preco === null || p.preco === undefined) {
      return '<span class="product-card__price product-card__price--consulta"><small>Sob consulta</small>Valor a combinar</span>';
    }
    var comecos = (p.variacoes || []).some(function (v) { return v.opcoes.some(function (o) { return o.acrescimo; }); });
    var html = '';
    if (comecos) html += '<small>A partir de</small>';
    html += u.fmtBRL(p.preco);
    if (p.precoPromo && p.precoPromo < p.preco) {
      html += '<old>' + u.fmtBRL(p.preco) + '</old>';
    }
    return '<span class="product-card__price">' + html + '</span>';
  }

  var ICON_CART = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  var ICON_X = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function render(p) {
    var semPreco = p.precoSobConsulta || p.preco === null || p.preco === undefined;
    var podeAdd = !semPreco && !p.esgotado;
    var nomeCat = SS.catalog.db.getCategoriaNome(p.categoria) || 'Nossos doces';
    var imgSrc = (p.imagens && p.imagens.length) ? p.imagens[0] : '';
    var quickLabel = podeAdd ? 'Ver detalhes' : (p.esgotado ? 'Ver detalhes' : 'Consultar valores');
    return (
      '<article class="product-card reveal">' +
        '<button type="button" class="product-card__media" data-quick="' + u.esc(p.id) + '" aria-label="' + u.esc('Ver detalhes de ' + p.nome) + '">' +
          (imgSrc
            ? '<img src="' + u.esc(imgSrc) + '" alt="' + u.esc(p.nome) + '" loading="lazy"' + FALLBACK_ATTR + '>'
            : '<span class="product-card__media-fallback" aria-hidden="true"><iconify-icon icon="ph:cake" width="46" height="46"></iconify-icon></span>') +
          '<span class="product-card__badges">' + seloDoProduto(p) + '</span>' +
          '<span class="product-card__quick">' + u.esc(quickLabel) + '</span>' +
        '</button>' +
        '<div class="product-card__body">' +
          '<span class="product-card__cat">' + u.esc(nomeCat) + '</span>' +
          '<h3 class="product-card__name"><button type="button" class="product-card__name-link" data-quick="' + u.esc(p.id) + '" aria-label="' + u.esc('Ver detalhes de ' + p.nome) + '">' + u.esc(p.nome) + '</button></h3>' +
          (p.descricaoCurta ? '<p class="product-card__desc">' + u.esc(p.descricaoCurta) + '</p>' : '') +
          '<div class="product-card__foot">' +
            precoHtml(p) +
            (podeAdd
              ? '<button type="button" class="btn btn--primary btn--sm product-card__add" data-add="' + u.esc(p.id) + '" aria-label="Adicionar ' + u.esc(p.nome) + ' ao carrinho" title="Adicionar ao carrinho">' + ICON_CART + '<span>Adicionar</span></button>'
              : '<button type="button" class="btn btn--outline btn--sm product-card__detail" data-quick="' + u.esc(p.id) + '">' + (p.esgotado ? 'Ver detalhes' : 'Consultar valores') + '</button>') +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* MODAL RÁPIDO DE PRODUTO                                             */
  /* ------------------------------------------------------------------ */
  var modalState = null;

  function montarGrupos(p) {
    var grupos = [];
    (p.variacoes || []).forEach(function (v, vi) {
      grupos.push({ id: 'var_' + vi, nome: v.nome, obrigatoria: !!v.obrigatoria, opcoes: v.opcoes });
    });
    if (p.sabores && p.sabores.length) grupos.push({ id: 'sabor', nome: 'Sabor', obrigatoria: true, opcoes: p.sabores.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    if (p.tamanhos && p.tamanhos.length) grupos.push({ id: 'tamanho', nome: 'Tamanho', obrigatoria: true, opcoes: p.tamanhos.map(function (s) { return typeof s === 'object' ? s : { nome: s }; }) });
    return grupos;
  }

  function renderModalPreco(p, grupos, sel, wrap) {
    var el = wrap.querySelector('#pm-preco');
    if (!el) return;
    var extras = 0;
    grupos.forEach(function (g) {
      var v = sel.variacoes[g.id];
      if (v && v.acrescimo) extras += Number(v.acrescimo) || 0;
    });
    (p.adicionais || []).forEach(function (a) {
      if (sel.adicionais.indexOf(a.nome) !== -1 && a.preco) extras += Number(a.preco) || 0;
    });
    var total = Math.round((p.preco + extras) * 100) / 100;
    var temPromo = p.precoPromo && p.precoPromo < p.preco;
    var todosSel = grupos.every(function (g) { return sel.variacoes[g.id]; });
    var inicio = (p.variacoes || []).some(function (v) { return v.opcoes.some(function (o) { return o.acrescimo; }); }) && !todosSel;
    el.innerHTML =
      (inicio ? '<span class="p-start">A partir de</span>' : '') +
      '<span class="p-now">' + u.fmtBRL(temPromo ? p.precoPromo + extras : total) + '</span>' +
      (temPromo ? '<span class="p-old">' + u.fmtBRL(total) + '</span>' : '');
  }

  function renderModalOpcoes(p, grupos, sel, wrap) {
    var dest = wrap.querySelector('#pm-opcoes');
    if (!dest) return;
    var html = '';
    grupos.forEach(function (g) {
      html +=
        '<div class="prod-opts">' +
          '<h4>' + u.esc(g.nome) + (g.obrigatoria ? ' <span style="color:var(--danger)">*</span>' : '') + '</h4>' +
          '<div class="opts">' +
            g.opcoes.map(function (o) {
              var acrescimo = Number(o.acrescimo) > 0 ? ' <span class="opt__price">+' + u.fmtBRL(o.acrescimo) + '</span>' : '';
              return (
                '<label class="opt" data-grupo="' + g.id + '">' +
                  '<input type="radio" name="pm-' + u.esc(g.id) + '" value="' + u.esc(o.nome) + '" data-acrescimo="' + (Number(o.acrescimo) || 0) + '">' +
                  '<span class="opt__dot" aria-hidden="true"></span>' +
                  '<span class="opt__label">' + u.esc(o.nome) + acrescimo + '</span>' +
                '</label>'
              );
            }).join('') +
          '</div>' +
        '</div>';
    });
    if (p.adicionais && p.adicionais.length) {
      html +=
        '<div class="prod-opts">' +
          '<h4>Adicionais</h4>' +
          '<div class="opts">' +
            p.adicionais.map(function (a) {
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
        '<h4>Quantidade <span style="color:var(--muted);font-weight:600;text-transform:none;letter-spacing:0;font-size:12.5px">(mínimo ' + (p.quantidadeMinima || 1) + ')</span></h4>' +
        '<div class="qty" style="height:48px">' +
          '<button type="button" data-qtd="-1" aria-label="Diminuir quantidade">−</button>' +
          '<input type="text" inputmode="numeric" id="pm-qty" value="' + sel.qty + '" aria-label="Quantidade">' +
          '<button type="button" data-qtd="1" aria-label="Aumentar quantidade">+</button>' +
        '</div>' +
      '</div>';
    dest.innerHTML = html;

    dest.querySelectorAll('.opt input[type="radio"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var lbl = inp.closest('.opt');
        var g = lbl.getAttribute('data-grupo');
        lbl.parentElement.querySelectorAll('.opt').forEach(function (o) { o.classList.remove('selected'); });
        lbl.classList.add('selected');
        sel.variacoes[g] = { nome: inp.value, acrescimo: Number(inp.getAttribute('data-acrescimo')) || 0 };
        renderModalPreco(p, grupos, sel, wrap);
      });
    });
    dest.querySelectorAll('.opt input[type="checkbox"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        inp.closest('.opt').classList.toggle('selected', inp.checked);
        if (inp.checked) sel.adicionais.push(inp.value);
        else sel.adicionais = sel.adicionais.filter(function (n) { return n !== inp.value; });
        renderModalPreco(p, grupos, sel, wrap);
      });
    });
    dest.querySelectorAll('[data-qtd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var min = p.quantidadeMinima || 1;
        var q = Number(dest.querySelector('#pm-qty').value) || min;
        q += Number(b.getAttribute('data-qtd'));
        dest.querySelector('#pm-qty').value = Math.max(min, q);
      });
    });
    dest.querySelector('#pm-qty').addEventListener('change', function () {
      var min = p.quantidadeMinima || 1;
      this.value = Math.max(min, Number(this.value) || min);
    });
  }

  function abrirModalProduto(p) {
    if (!p) return;
    fecharModalProduto();
    var semPreco = p.precoSobConsulta || p.preco === null || p.preco === undefined;
    var addavel = !semPreco && !p.esgotado;
    var grupos = addavel ? montarGrupos(p) : [];
    var sel = { variacoes: {}, adicionais: [], qty: Math.max(1, p.quantidadeMinima || 1), observacao: '' };
    var img = (p.imagens && p.imagens[0]) || '';

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay--prod';
    overlay.innerHTML =
      '<div class="modal' + (img ? '' : ' modal--sem-media') + '" role="dialog" aria-modal="true" aria-label="' + u.esc(p.nome) + '">' +
        '<button type="button" class="modal__close" data-close aria-label="Fechar">' + ICON_X + '</button>' +
        (img ? '<div class="modal__media"><img src="' + u.esc(img) + '" alt="' + u.esc(p.nome) + '"></div>' : '') +
        '<div class="modal__right">' +
          '<div class="modal__scroll">' +
            '<div class="modal__body">' +
              '<div class="modal__badges">' + seloDoProduto(p) + '</div>' +
              '<span class="product-card__cat">' + u.esc(SS.catalog.db.getCategoriaNome(p.categoria) || 'Nossos doces') + '</span>' +
              '<h3 class="modal__title">' + u.esc(p.nome) + '</h3>' +
              (p.descricao ? '<p class="modal__desc">' + u.esc(p.descricao) + '</p>' : '') +
              '<div class="modal__price" id="pm-preco"></div>' +
              (addavel ? '<div id="pm-opcoes"></div>' : '') +
              (addavel
                ? '<div class="form-group" style="margin-top:16px">' +
                    '<label class="form-label form-label--row" for="pm-obs">Alguma observação? <span class="form-count" id="pm-count">0 / 140</span></label>' +
                    '<textarea class="form-control" id="pm-obs" rows="3" maxlength="140" placeholder="' + u.esc(p.observacoes || 'Ex.: caprichar na decoração ou escrever uma mensagem especial...') + '"></textarea>' +
                  '</div>'
                : '') +
            '</div>' +
          '</div>' +
          '<div class="modal__foot">' +
            (p.esgotado
              ? '<button type="button" class="btn btn--outline btn--lg" disabled>Produto esgotado</button>'
              : semPreco
                ? '<a class="btn btn--primary btn--lg" href="encomenda.html">Encomendar este produto</a>'
                : '<button type="button" class="btn btn--primary btn--lg" id="pm-add">Adicionar ao carrinho</button>') +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function fechar() { fecharModalProduto(); }

    overlay.addEventListener('click', function (e) { if (e.target === overlay) fechar(); });
    overlay.querySelector('[data-close]').addEventListener('click', fechar);
    var onKey = function (e) { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', onKey);

    if (addavel) {
      renderModalOpcoes(p, grupos, sel, overlay);
      renderModalPreco(p, grupos, sel, overlay);
      overlay.querySelector('#pm-obs').addEventListener('input', function () {
        overlay.querySelector('#pm-count').textContent = this.value.length + ' / 140';
      });
      overlay.querySelector('#pm-add').addEventListener('click', function () {
        var faltando = grupos.filter(function (g) { return g.obrigatoria && !sel.variacoes[g.id]; });
        if (faltando.length) {
          SS.ui.toast('Selecione: ' + faltando.map(function (g) { return g.nome; }).join(', '), 'error');
          return;
        }
        sel.qty = Math.max(p.quantidadeMinima || 1, Number(overlay.querySelector('#pm-qty').value) || 1);
        sel.observacao = overlay.querySelector('#pm-obs').value.trim();
        SS.cart.adicionar(p, { variacoes: sel.variacoes, adicionais: sel.adicionais, qty: sel.qty, observacao: sel.observacao });
        SS.ui.toast(p.nome + ' adicionado ao carrinho!');
        fechar();
        if (SS.ui.toggleCart) SS.ui.toggleCart(true);
      });
    } else {
      var pr = overlay.querySelector('#pm-preco');
      if (pr) pr.innerHTML = semPreco ? '<span class="p-now">Valor sob consulta</span>' : '<span class="p-now">' + u.fmtBRL(p.preco) + '</span>';
    }

    requestAnimationFrame(function () {
      overlay.classList.add('open');
      var c = overlay.querySelector('[data-close]');
      if (c) c.focus();
    });
    modalState = { overlay: overlay, onKey: onKey };
  }

  function fecharModalProduto() {
    if (!modalState) return;
    modalState.overlay.classList.remove('open');
    document.removeEventListener('keydown', modalState.onKey);
    document.body.style.overflow = '';
    var ov = modalState.overlay;
    setTimeout(function () {
      if (modalState && modalState.overlay === ov) { ov.remove(); modalState = null; }
    }, 250);
  }

  /* Liga os botões "adicionar" e "ver detalhes" dentro de um contêiner (delegação). */
  function initContainer(el) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      var quick = e.target.closest('[data-quick]');
      if (quick) {
        var p2 = SS.catalog.db.getProduto(quick.getAttribute('data-quick'));
        if (p2) abrirModalProduto(p2);
        return;
      }
      var btn = e.target.closest('[data-add]');
      if (!btn) return;
      if (btn.disabled || btn.classList.contains('is-loading')) return;
      var p = SS.catalog.db.getProduto(btn.getAttribute('data-add'));
      if (!p || p.esgotado || p.preco === null || p.preco === undefined) return;
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      setTimeout(function () {
        SS.cart.adicionar(p, { qty: 1, variacoes: {}, adicionais: [], observacao: '' });
        SS.ui.toast(p.nome + ' adicionado ao carrinho!');
        btn.classList.remove('is-loading');
        btn.removeAttribute('aria-busy');
        if (SS.ui.toggleCart) SS.ui.toggleCart(true);
      }, 450);
    });
  }

  SS.card = { render: render, initContainer: initContainer, abrirModalProduto: abrirModalProduto };
})(window.SS);