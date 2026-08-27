/* =========================================================================
   SUBLIME SONHOS — PÁGINA INICIAL
   Catálogo completo na home: filtros-âncora + seções por categoria, com
   estados de carregamento, erro, vazio, imagem ausente e preço ausente.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;

  function logErro(origem, err) {
    // log silencioso — evita expor stack no console em produção
    if (window.console && console.error) {
      // apenas em localhost para debug
      try{ if(location.hostname==='localhost' || location.hostname==='127.0.0.1') console.error('[Sublime Sonhos] Falha ao renderizar ' + origem + ':', err); }catch(e){}
    }
  }

  /* ------------------------------------------------------------------ */
  /* SKELETONS                                                           */
  /* ------------------------------------------------------------------ */
  function skeletonProduto(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push(
        '<article class="product-card skeleton-card">' +
          '<div class="skeleton-block product-card__media"></div>' +
          '<div class="product-card__body">' +
            '<div class="skeleton-line w-40"></div>' +
            '<div class="skeleton-line w-80"></div>' +
            '<div class="skeleton-line w-70"></div>' +
            '<div class="skeleton-line w-50"></div>' +
          '</div>' +
        '</article>'
      );
    }
    return out.join('');
  }

  function estadoErro(grid, mensagem, onRetry) {
    if (!grid) return;
    grid.innerHTML =
      '<div class="section-state" role="alert">' +
        '<span class="section-state__ico" aria-hidden="true"><iconify-icon icon="ph:smiley-sad" width="38" height="38"></iconify-icon></span>' +
        '<p><strong>Não foi possível carregar esta seção.</strong></p>' +
        '<p class="section-state__sub">' + u.esc(mensagem) + '</p>' +
        '<button type="button" class="btn btn--primary btn--sm" data-reload-section>' + u.esc('Tentar novamente') + '</button>' +
      '</div>';
    var btn = grid.querySelector('[data-reload-section]');
    if (btn) btn.addEventListener('click', function () {
      grid.innerHTML = skeletonProduto(4);
      setTimeout(function () {
        try { onRetry(); } catch (e) { logErro('retry', e); estadoErro(grid, 'Tente novamente em instantes. Se o problema persistir, fale conosco pelo WhatsApp.', onRetry); }
      }, 60);
    });
  }

  /* Renderização: skeleton só quando necessário; sem delay artificial para dados locais. */
  function renderComSkeleton(grid, skeletonHtml, fn, erroMsg) {
    if (!grid) return;
    try {
      fn();
      // Se fn não preencheu nada (ex: erro silencioso), exibe skeleton como fallback
      if (!grid.innerHTML.trim()) grid.innerHTML = skeletonHtml;
    } catch (e) {
      logErro(erroMsg, e);
      estadoErro(grid, 'Tente novamente em instantes. Se o problema persistir, fale conosco pelo WhatsApp.', fn);
    }
  }

  /* ------------------------------------------------------------------ */
  /* CATEGORIAS COM PRODUTOS (filtros + seções)                          */
  /* ------------------------------------------------------------------ */
  function categoriasComProdutos() {
    var produtos = SS.catalog.db.getProdutos();
    var cats = SS.catalog.db.getCategoriasVisiveis ? SS.catalog.db.getCategoriasVisiveis() : SS.catalog.db.getCategorias().filter(function(c){ return c.ativo !== false; });
    return cats.filter(function (c) {
      return produtos.some(function (p) {
        if (p._excluido || !p.ativo) return false;
        if (Array.isArray(p.categorias) && p.categorias.length) return p.categorias.indexOf(c.id) !== -1;
        return p.categoria === c.id;
      });
    });
  }

  /* Chips-âncora: cada categoria leva o visitante direto à sua seção. */
  function renderFiltros() {
    var bar = document.getElementById('filtros-categorias');
    if (!bar) return;
    var cats = categoriasComProdutos();
    if (!cats.length) { bar.innerHTML = ''; return; }
    bar.innerHTML = cats.map(function (c) {
      return (
        '<a class="chip" href="#cat-' + encodeURIComponent(c.id) + '" aria-label="Ir para a seção ' + u.esc(c.nome) + '">' +
          '<iconify-icon icon="ph:' + (c.icone || 'cookie') + '" width="16" height="16"></iconify-icon> ' + u.esc(c.nome) +
        '</a>'
      );
    }).join('');
    bar.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        try { sessionStorage.setItem('ss_last_catalog_hash', chip.getAttribute('href')); } catch (e) {}
      });
    });
  }

  /* Seções na ordem do catálogo; cada uma mostra todos os produtos reais
     da categoria, renderizados com o mesmo card das demais páginas. */
  function renderSecoes() {
    var container = document.getElementById('secoes-categorias');
    if (!container) return;

    var cats = categoriasComProdutos();
    var produtos = SS.catalog.db.getProdutos();
    if (!cats.length) {
      container.innerHTML =
        '<div class="section-state">' +
          '<span class="section-state__ico" aria-hidden="true"><iconify-icon icon="ph:fork-knife" width="38" height="38"></iconify-icon></span>' +
          '<p><strong>Nenhuma categoria disponível no momento.</strong></p>' +
          '<p class="section-state__sub">Em breve novidades deliciosas por aqui.</p>' +
        '</div>';
      return;
    }

    container.innerHTML = cats.map(function (c) {
      var itens = produtos.filter(function (p) {
        if (p._excluido || !p.ativo) return false;
        if (Array.isArray(p.categorias) && p.categorias.length) return p.categorias.indexOf(c.id) !== -1;
        return p.categoria === c.id;
      });
      var count = itens.length;
      return (
        '<section class="cat-secao" id="cat-' + encodeURIComponent(c.id) + '" aria-labelledby="cat-' + encodeURIComponent(c.id) + '-titulo">' +
          '<div class="cat-secao__head">' +
            '<h3 class="cat-secao__titulo" id="cat-' + encodeURIComponent(c.id) + '-titulo">' +
              '<span class="cat-secao__icone" aria-hidden="true"><iconify-icon icon="ph:' + (c.icone || 'cookie') + '" width="20" height="20"></iconify-icon></span>' +
              u.esc(c.nome) +
            '</h3>' +
            (c.descricao ? '<p class="cat-secao__desc">' + u.esc(c.descricao) + '</p>' : '') +
            '<span class="cat-secao__count">' + count + ' produto' + (count === 1 ? '' : 's') + '</span>' +
          '</div>' +
          '<div class="grid-products" id="grid-' + encodeURIComponent(c.id) + '">' + itens.map(SS.card.render).join('') + '</div>' +
        '</section>'
      );
    }).join('');

    cats.forEach(function (c) {
      var grid = document.getElementById('grid-' + c.id);
      if (grid) SS.card.initContainer(grid);
    });

    initScrollspy();
  }

  /* Destaca no filtro a categoria que está sendo visualizada. */
  function initScrollspy() {
    var chips = Array.prototype.slice.call(document.querySelectorAll('#filtros-categorias .chip'));
    if (!chips.length || typeof window.IntersectionObserver !== 'function') return;
    var secs = chips.map(function (c) {
      var id = c.getAttribute('href').replace(/^#/, '');
      return document.getElementById(id);
    }).filter(Boolean);
    if (!secs.length) return;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        chips.forEach(function (c) {
          var isActive = c.getAttribute('href') === '#' + id;
          c.classList.toggle('active', isActive);
          if (isActive) { try { sessionStorage.setItem('ss_last_catalog_hash', '#' + id); } catch (e) {} }
        });
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    secs.forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------------------ */
  /* INFORMAÇÕES (entrega, pagamento, atendimento)                       */
  /* ------------------------------------------------------------------ */
  function renderInfo() {
    var elEntrega = document.getElementById('info-entrega');
    if (elEntrega) elEntrega.textContent = cfg.loja.entrega.informacoes;
    var elArea = document.getElementById('info-area');
    if (elArea) elArea.textContent = cfg.loja.area + '.';
    var elPag = document.getElementById('info-pagamento');
    if (elPag) {
      elPag.innerHTML =
        '<li>Métodos: ' + u.esc(cfg.loja.pagamento.metodos.map(function (m) { return m.nome; }).join(', ')) + '</li>' +
        '<li>Instruções de PIX e link enviadas pela loja após o pedido</li>';
    }
    var elAtend = document.getElementById('info-atendimento');
    if (elAtend) {
      elAtend.innerHTML =
        '<li>Horário: ' + u.esc(cfg.loja.horario) + '</li>' +
        '<li>Encomendas: antecedência mínima de ' + cfg.loja.antecedenciaMinimaDias + ' dias</li>' +
        '<li>Instagram: <a href="' + u.esc(cfg.social.instagram) + '" target="_blank" rel="noopener" style="color:var(--rose-600);font-weight:700">' + u.esc(cfg.social.instagramUsuario) + '</a></li>';
    }
    var elHorario = document.getElementById('info-horario');
    if (elHorario) elHorario.textContent = cfg.loja.horario;
  }

  /* ------------------------------------------------------------------ */
  /* FAQ                                                                 */
  /* ------------------------------------------------------------------ */
  function initFaq() {
    document.querySelectorAll('.faq-item__q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.faq-item');
        var open = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(function (o) {
          o.classList.remove('open');
          o.querySelector('.faq-item__q').setAttribute('aria-expanded', 'false');
        });
        if (!open) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  function initSplitGaleria() {
    var a = document.getElementById('split-img-a');
    var b = document.getElementById('split-img-b');
    if (!a || !b) return;
    var reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) return;
    var fotos = [
      'assets/img/site/festa-1.jpg',
      'assets/img/site/festa-2.jpg',
      'assets/img/site/festa-3.jpg'
    ];
    var els = [a, b];
    var cur = 0;
    var vi = 0;
    fotos.forEach(function (src) { var im = new Image(); im.src = src; });
    setInterval(function () {
      if (document.hidden) return;
      cur = (cur + 1) % fotos.length;
      var hide = els[vi];
      var show = els[1 - vi];
      show.src = fotos[cur];
      hide.style.opacity = 0;
      show.style.opacity = 1;
      vi = 1 - vi;
      var after = (cur + 1) % fotos.length;
      var p = new Image();
      p.src = fotos[after];
    }, 5200);
  }

  function initContato() {
    var wa = document.getElementById('btn-contato-wa');
    if (wa) wa.href = SS.whatsapp.linkContato();
    var ig = document.getElementById('btn-contato-ig');
    if (ig) ig.href = cfg.social.instagram;
  }

  function initHeroRotacao() {
    var a = document.getElementById('hero-img-a');
    var b = document.getElementById('hero-img-b');
    if (!a || !b) return;
    var reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) return;
    var fotos = [
      'assets/img/site/hero-redvelvet.jpg',
      'assets/img/produtos/docinhos.jpg',
      'assets/img/produtos/bolo-decorado-15cm.jpg',
      'assets/img/produtos/morango-do-amor.jpg',
      'assets/img/produtos/caixa-fondue.jpg'
    ];
    var els = [a, b];
    var cur = 0;
    var vi = 0;
    fotos.forEach(function (src) { var im = new Image(); im.src = src; });
    setInterval(function () {
      if (document.hidden) return;
      cur = (cur + 1) % fotos.length;
      var hide = els[vi];
      var show = els[1 - vi];
      show.src = fotos[cur];
      hide.style.opacity = 0;
      show.style.opacity = 1;
      vi = 1 - vi;
      var after = (cur + 1) % fotos.length;
      var p = new Image();
      p.src = fotos[after];
    }, 5200);
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();
    var secContainer = document.getElementById('secoes-categorias');
    if (secContainer && !secContainer.querySelector('.cat-secao')) {
      renderComSkeleton(secContainer, skeletonProduto(8), function () {
        renderFiltros();
        renderSecoes();
      }, 'seções de categorias');
    }
    renderInfo();
    initFaq();
    initContato();
    initHeroRotacao();
    initSplitGaleria();
    try {
      if (location.hash) {
        // sanitiza: aceita apenas #categoria-alphanumerica — evita payload XSS
        var hSan = location.hash.match(/^#[a-zA-Z0-9_-]+/);
        sessionStorage.setItem('ss_last_catalog_hash', hSan ? hSan[0] : '#destaques');
      }
      else if (!sessionStorage.getItem('ss_last_catalog_hash')) sessionStorage.setItem('ss_last_catalog_hash', '#destaques');
    } catch (e) {}
  });
})(window.SS);