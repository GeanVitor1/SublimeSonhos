/* =========================================================================
   SUBLIME SONHOS — UI COMUM (header, footer, menu mobile, carrinho drawer)
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;

  var ICON_CART = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  var ICON_BURGER = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  var ICON_X = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var ICON_WHATSAPP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
  var ICON_INSTA = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>';
  var ICON_PIN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  var ICON_CLOCK = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var LOGO_LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>';

  function paginaAtual() {
    var p = location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function ehAtiva(href) {
    var alvo = href.split('#')[0];
    if (!alvo) return false;
    return paginaAtual() === alvo;
  }

  function renderHeader() {
    var el = document.getElementById('site-header');
    if (!el) return;
    var nav = [
      { href: 'index.html', label: 'Início' },
      { href: 'index.html#destaques', label: 'Produtos' },
      { href: 'encomenda.html', label: 'Encomendas' },
      { href: 'bolo-personalizado.html', label: 'Bolos' },
      { href: 'index.html#contato', label: 'Contato' },
    ].map(function (n) {
      return '<a href="' + n.href + '"' + (ehAtiva(n.href) ? ' class="active" aria-current="page"' : '') + '>' + n.label + '</a>';
    }).join('');
    el.innerHTML =
      '<div class="container header-inner">' +
        '<a class="logo" href="index.html" aria-label="' + u.esc(cfg.brand.nome) + ' — página inicial">' +
          '<span class="logo-mark" aria-hidden="true">' + LOGO_LEAF + '</span>' +
          '<span class="logo-text"><span class="logo-name">' + u.esc(cfg.brand.nome) + '</span><span class="logo-tag">' + u.esc(cfg.brand.tagline) + '</span></span>' +
        '</a>' +
        '<nav class="main-nav" aria-label="Navegação principal">' + nav + '</nav>' +
        '<div class="header-actions">' +
          '<a class="btn btn--dark btn--sm btn--cta-mobile" href="encomenda.html">Fazer pedido</a>' +
          '<button type="button" class="cart-btn" aria-label="Abrir carrinho" data-open-cart>' + ICON_CART + '<span class="cart-count" aria-hidden="true"></span></button>' +
          '<a class="btn btn--outline btn--sm" href="admin.html" aria-label="Área da loja" title="Área da loja"><iconify-icon icon="ph:lock" width="14" height="14"></iconify-icon> <span class="hide-sm">Entrar</span></a>' +
          '<button type="button" class="hamburger" aria-label="Abrir menu" data-open-menu>' + ICON_BURGER + '</button>' +
        '</div>' +
      '</div>' +
      renderMobileMenu(nav);
  }

  function renderMobileMenu(navHtml) {
    return (
      '<div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">' +
        '<div class="mobile-menu__scrim" data-close-menu></div>' +
        '<div class="mobile-menu__panel">' +
          '<div class="mobile-menu__head">' +
            '<span class="logo"><span class="logo-mark" aria-hidden="true">' + LOGO_LEAF + '</span><span class="logo-text"><span class="logo-name">' + u.esc(cfg.brand.nome) + '</span><span class="logo-tag">' + u.esc(cfg.brand.tagline) + '</span></span></span>' +
            '<button type="button" class="drawer__close" data-close-menu aria-label="Fechar menu">' + ICON_X + '</button>' +
          '</div>' +
          '<a class="mm-link" href="index.html">Início</a>' +
          '<a class="mm-link" href="index.html#destaques">Produtos</a>' +
          '<a class="mm-link" href="encomenda.html">Encomendas</a>' +
          '<a class="mm-link" href="bolo-personalizado.html">Bolos personalizados</a>' +
          '<a class="mm-link" href="index.html#como-funciona">Como funciona</a>' +
          '<a class="mm-link" href="index.html#contato">Contato</a>' +
          '<a class="mm-link" href="admin.html"><iconify-icon icon="ph:lock" width="16" height="16"></iconify-icon> Área da loja</a>' +
          '<a class="btn btn--primary btn--block mm-cta" href="encomenda.html">Fazer pedido</a>' +
          '<div class="mobile-menu__foot">' +
            '<a class="btn btn--whatsapp btn--block" href="' + SS.whatsapp.linkContato() + '" target="_blank" rel="noopener">' + ICON_WHATSAPP + ' Pedir pelo WhatsApp</a>' +
            '<a class="btn btn--outline btn--block" href="' + u.esc(cfg.social.instagram) + '" target="_blank" rel="noopener">' + ICON_INSTA + ' ' + u.esc(cfg.social.instagramUsuario) + '</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderFooter() {
    var el = document.getElementById('site-footer');
    if (!el) return;
    el.className = 'site-footer';
    el.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-logo">' +
            '<span class="logo"><span class="logo-mark" aria-hidden="true">' + LOGO_LEAF + '</span><span class="logo-text"><span class="logo-name">' + u.esc(cfg.brand.nome) + '</span><span class="logo-tag">' + u.esc(cfg.brand.tagline) + '</span></span></span>' +
            '<p>' + u.esc(cfg.brand.descricao) + '</p>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>Navegação</h4><ul>' +
              '<li><a href="index.html">Início</a></li>' +
              '<li><a href="index.html#destaques">Produtos</a></li>' +
              '<li><a href="encomenda.html">Encomendas</a></li>' +
              '<li><a href="bolo-personalizado.html">Bolos personalizados</a></li>' +
              '<li><a href="index.html#faq">Perguntas frequentes</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>Atendimento</h4><ul>' +
              '<li>' + ICON_PIN + '<span>' + u.esc(cfg.loja.area) + '</span></li>' +
              '<li>' + ICON_CLOCK + '<span>' + u.esc(cfg.loja.horario) + '</span></li>' +
              '<li><a href="' + u.esc(cfg.social.instagram) + '" target="_blank" rel="noopener">' + ICON_INSTA + ' ' + u.esc(cfg.social.instagramUsuario) + '</a></li>' +
              '<li><a href="' + SS.whatsapp.linkContato() + '" target="_blank" rel="noopener">' + ICON_WHATSAPP + ' WhatsApp da loja</a></li>' +
            '</ul>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>Como encomendar</h4>' +
            '<p class="text-sm" style="color:rgba(255,255,255,0.6)">Escolha seus doces, defina data e entrega, selecione o pagamento e envie tudo pelo WhatsApp. O pedido é confirmado pela loja após a verificação de disponibilidade.</p>' +
            '<div style="margin-top:16px"><a class="footer-whats" href="' + SS.whatsapp.linkContato() + '" target="_blank" rel="noopener">' + ICON_WHATSAPP + ' Fazer pedido agora</a></div>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>© ' + new Date().getFullYear() + ' ' + u.esc(cfg.brand.nome) + ' — Todos os direitos reservados.</span>' +
          '<span>Pedidos sujeitos à confirmação da confeitaria.</span>' +
          '<a href="admin.html" rel="nofollow">Área da loja</a>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* MENU MOBILE                                                         */
  /* ------------------------------------------------------------------ */
  function initMenu() {
    var menu = document.getElementById('mobile-menu');
    if (!menu) return;
    function set(open) {
      menu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }
    menu.querySelectorAll('[data-close-menu]').forEach(function (b) { b.addEventListener('click', function () { set(false); }); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    var btn = document.querySelector('[data-open-menu]');
    if (btn) btn.addEventListener('click', function () { set(true); });
  }

  /* ------------------------------------------------------------------ */
  /* CARRINHO DRAWER                                                     */
  /* ------------------------------------------------------------------ */
  function initCartDrawer() {
    var overlay = document.getElementById('drawer-overlay');
    if (!overlay) return;
    var drawer = document.getElementById('cart-drawer');
    function set(open) {
      overlay.classList.toggle('open', open);
      drawer.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }
    overlay.addEventListener('click', function () { set(false); });
    drawer.querySelector('[data-close-cart]').addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    document.querySelectorAll('[data-open-cart]').forEach(function (b) { b.addEventListener('click', function () { set(true); }); });
    SS.ui.toggleCart = set;
  }

  function atualizarCartFloat() {
    var cFloat = document.getElementById('cart-float');
    var cCount = document.querySelector('.cart-float__count');
    var n = SS.cart.contar();
    if (cFloat) {
      cFloat.classList.toggle('show', n > 0);
      cFloat.setAttribute('aria-label', n > 0 ? 'Abrir carrinho (' + n + ' itens) — finalizar compra' : 'Abrir carrinho');
    }
    if (cCount) cCount.textContent = n > 0 ? String(n) : '';
  }
  function renderCartDrawer(itens) {
    var body = document.getElementById('cart-drawer-body');
    var foot = document.getElementById('cart-drawer-foot');
    var count = document.getElementById('cart-count');
    var badge = document.querySelector('.cart-count');
    if (badge) badge.textContent = SS.cart.contar() > 0 ? String(SS.cart.contar()) : '';
    atualizarCartFloat();

    if (itens.length === 0) {
      body.innerHTML =
        '<div class="empty-state" style="padding:40px 10px">' +
          '<div class="empty-state__ico" aria-hidden="true"><iconify-icon icon="ph:bag-simple" width="46" height="46"></iconify-icon></div>' +
          '<h2>Seu carrinho está vazio</h2>' +
          '<p>Adicione doces maravilhosos e monte seu pedido.</p>' +
        '</div>';
      foot.innerHTML =
        '<a class="btn btn--primary btn--block" href="index.html#destaques">Ver produtos</a>' +
        '<button type="button" class="btn btn--outline btn--block" data-close-cart>Continuar navegando</button>';
      foot.querySelector('[data-close-cart]').addEventListener('click', function () { SS.ui.toggleCart(false); });
      return;
    }

    body.innerHTML = itens.map(function (item) {
      var ops = SS.cart.formatarOpcoes(item);
      var preco = SS.cart.precoUnitarioItem(item);
      return (
        '<div class="cart-item">' +
          (item.imagem ? '<img class="cart-item__img" src="' + item.imagem + '" alt="' + u.esc(item.nome) + '" loading="lazy">' : '') +
          '<div class="cart-item__body">' +
            '<div class="cart-item__name">' + u.esc(item.nome) + '</div>' +
            (ops ? '<div class="cart-item__opts">' + u.esc(ops) + '</div>' : '') +
            (item.observacao ? '<div class="cart-item__opts">Obs.: ' + u.esc(item.observacao) + '</div>' : '') +
            '<div class="cart-item__row">' +
              '<span class="cart-item__price">' + (preco === null ? 'Sob consulta' : u.fmtBRL(preco * item.qty)) + '</span>' +
              '<button type="button" class="cart-item__remove" data-remove="' + item.uid + '" aria-label="Remover ' + u.esc(item.nome) + '">Remover</button>' +
            '</div>' +
            '<div style="margin-top:6px">' +
              '<div class="qty" aria-label="Quantidade de ' + u.esc(item.nome) + '">' +
                '<button type="button" data-qty="' + item.uid + '" data-d="-1" aria-label="Diminuir quantidade">−</button>' +
                '<input type="text" inputmode="numeric" value="' + item.qty + '" data-qtyinput="' + item.uid + '" aria-label="Quantidade">' +
                '<button type="button" data-qty="' + item.uid + '" data-d="1" aria-label="Aumentar quantidade">+</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    var subtotal = SS.cart.subtotal();
    var sobConsulta = SS.cart.temItensSobConsulta();
    var entregaLabel = cfg.loja.entrega.modo === 'fixa' ? u.fmtBRL(cfg.loja.entrega.taxaEntrega) : 'a confirmar';
    var totalLabel = sobConsulta ? 'a confirmar' : u.fmtBRL(subtotal + (cfg.loja.entrega.modo === 'fixa' ? cfg.loja.entrega.taxaEntrega : 0));

    foot.innerHTML =
      '<div class="df-row"><span>Subtotal</span><strong>' + u.fmtBRL(subtotal) + '</strong></div>' +
      '<div class="df-row"><span>Entrega</span><strong>' + entregaLabel + '</strong></div>' +
      '<div class="df-row df-row--total"><span>Total estimado</span><span>' + totalLabel + '</span></div>' +
      '<a class="btn btn--primary btn--block" href="carrinho.html">Finalizar pedido</a>' +
      '<button type="button" class="btn btn--outline btn--block" data-close-cart>Continuar comprando</button>';
    foot.querySelector('[data-close-cart]').addEventListener('click', function () { SS.ui.toggleCart(false); });

    body.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        SS.cart.remover(b.getAttribute('data-remove'));
        toast('Item removido do carrinho', '');
      });
    });
    body.querySelectorAll('[data-qty]').forEach(function (b) {
      b.addEventListener('click', function () {
        var uid = b.getAttribute('data-qty');
        var item = SS.cart.getItem(uid);
        if (!item) return;
        SS.cart.atualizarQtd(uid, item.qty + Number(b.getAttribute('data-d')));
      });
    });
    body.querySelectorAll('[data-qtyinput]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        SS.cart.atualizarQtd(inp.getAttribute('data-qtyinput'), Number(inp.value) || 1);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* TOAST                                                               */
  /* ------------------------------------------------------------------ */
  var toastTimer = null;
  function toast(msg, tipo) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (tipo ? ' toast--' + tipo : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ------------------------------------------------------------------ */
  /* REVEAL AO ROLAR                                                     */
  /* ------------------------------------------------------------------ */
  /* Observa elementos `.reveal` dentro de um escopo e adiciona `.in`
     quando entram na viewport. Conteúdo injetado via JS deve chamar
     `SS.ui.observeReveal(container)` após ser montado para que os cards
     nunca permaneçam invisíveis (opacity: 0). */
  var revealIO = null;
  function revealPronto() {
    return (typeof window.IntersectionObserver !== 'function') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function revealEl(el) {
    if (revealPronto()) { el.classList.add('in'); return; }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    revealIO.observe(el);
  }
  function observeReveal(scope) {
    var els = (scope || document).querySelectorAll('.reveal');
    els.forEach(revealEl);
  }
  function initReveal() {
    observeReveal(document);
  }

  /* ------------------------------------------------------------------ */
  /* OVERLAYS (drawer do carrinho + toast + botão flutuante WhatsApp)    */
  /* ------------------------------------------------------------------ */
  function injetarOverlays() {
    if (document.getElementById('cart-drawer')) return;
    var div = document.createElement('div');
    div.innerHTML =
      '<div class="drawer-overlay" id="drawer-overlay"></div>' +
      '<aside class="drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Carrinho">' +
        '<div class="drawer__head">' +
          '<h3>Seu carrinho</h3>' +
          '<button type="button" class="drawer__close" data-close-cart aria-label="Fechar carrinho">' + ICON_X + '</button>' +
        '</div>' +
        '<div class="drawer__body" id="cart-drawer-body"></div>' +
        '<div class="drawer__foot" id="cart-drawer-foot"></div>' +
      '</aside>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +
      '<button type="button" class="cart-float" id="cart-float" aria-label="Abrir carrinho" data-open-cart>' + ICON_CART + '<span class="cart-float__count" aria-hidden="true"></span></button>' +
      '<a class="wa-float" href="' + SS.whatsapp.linkContato() + '" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp">' + ICON_WHATSAPP + '</a>';
    document.body.appendChild(div);
  }

  /* ------------------------------------------------------------------ */
  /* CUSTOM SELECT — dropdown sempre abre para baixo                    */
  /* ------------------------------------------------------------------ */
  var _openDropdown = null;
  var _docHandlersInited = false;
  function _ensureDocHandlers() {
    if (_docHandlersInited) return;
    _docHandlersInited = true;
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.custom-select') && _openDropdown) {
        _closeOpenDropdown();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _openDropdown) {
        _closeOpenDropdown();
      }
    });
  }
  function _closeOpenDropdown() {
    if (_openDropdown) {
      _openDropdown.listBox.style.display = 'none';
      _openDropdown.trigger.setAttribute('aria-expanded', 'false');
      _openDropdown = null;
    }
  }
  function initCustomSelects(scope) {
    _ensureDocHandlers();
    var container = scope || document;
    container.querySelectorAll('select.form-control').forEach(function (sel) {
      if (sel.hasAttribute('data-custom-select')) return;
      convertSelectToCustom(sel);
    });
  }
  function convertSelectToCustom(sel) {
    sel.setAttribute('data-custom-select', 'true');
    // Hide native select — kept alive for .value, form submit, change listeners
    sel.style.position = 'absolute';
    sel.style.left = '-9999px';
    sel.style.width = '1px';
    sel.style.height = '1px';

    var selId = sel.id || ('cs-' + Math.random().toString(36).slice(2, 11));
    var triggerId = 'cs-tr-' + selId;

    // Wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    sel.parentNode.insertBefore(wrapper, sel);
    wrapper.appendChild(sel);

    // Trigger button
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = triggerId;
    trigger.className = 'custom-select__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-labelledby', triggerId);
    trigger.innerHTML = '<span class="custom-select__label"></span>';

    // Options list — positioned at top:100% → always opens downward
    var listBox = document.createElement('div');
    listBox.className = 'custom-select__options';
    listBox.setAttribute('role', 'listbox');
    listBox.setAttribute('aria-labelledby', triggerId);
    listBox.style.display = 'none';

    wrapper.appendChild(trigger);
    wrapper.appendChild(listBox);

    // Clicking the label focuses the trigger (label[for] points to hidden select)
    sel.addEventListener('focus', function () { trigger.focus(); });

    function refresh() {
      listBox.innerHTML = '';
      var placeholder = 'Selecione…';
      var options = Array.prototype.slice.call(sel.options);
      options.forEach(function (opt) {
        if (!opt.value) placeholder = opt.textContent.trim();
      });

      var selectedText = '';
      options.forEach(function (opt, i) {
        var item = document.createElement('div');
        item.className = 'custom-select__option';
        item.setAttribute('role', 'option');
        item.setAttribute('data-index', String(i));
        item.setAttribute('aria-selected', String(opt.selected));
        item.textContent = opt.textContent;
        if (opt.value === sel.value) selectedText = opt.textContent.trim();
        if (!opt.value) item.style.fontStyle = 'italic';
        if (opt.disabled) item.setAttribute('aria-disabled', 'true');

        item.addEventListener('click', function (e) {
          e.stopPropagation();
          if (opt.disabled) return;
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          var lbl = trigger.querySelector('.custom-select__label');
          lbl.textContent = opt.textContent.trim() || placeholder;
          listBox.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
          _openDropdown = null;
        });
        listBox.appendChild(item);
      });

      var lbl = trigger.querySelector('.custom-select__label');
      lbl.textContent = selectedText || placeholder;
    }

    // When options change externally (e.g. f-forma innerHTML), update label
    var observer = new MutationObserver(function () {
      var placeholder = 'Selecione…';
      var selectedText = '';
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.value) placeholder = o.textContent.trim();
        if (o.value === sel.value) selectedText = o.textContent.trim();
      });
      var lbl = trigger.querySelector('.custom-select__label');
      lbl.textContent = selectedText || placeholder;
    });
    observer.observe(sel, { childList: true });

    // Trigger click: toggle dropdown
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (listBox.style.display === 'block') {
        listBox.style.display = 'none';
        trigger.setAttribute('aria-expanded', 'false');
        _openDropdown = null;
      } else {
        _closeOpenDropdown();
        refresh();
        listBox.style.display = 'block';
        trigger.setAttribute('aria-expanded', 'true');
        _openDropdown = { listBox: listBox, trigger: trigger };
        var selected = listBox.querySelector('[aria-selected="true"]');
        if (selected) selected.scrollIntoView({ block: 'nearest' });
      }
    });

    // Space/Enter on trigger opens (click handles this natively, but be safe)
    trigger.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') && listBox.style.display !== 'block') {
        e.preventDefault();
        trigger.click();
      }
    });

    // Initial render
    refresh();
  }

  /* ------------------------------------------------------------------ */
  /* DATE PICKER — calendário bonito para Data desejada                  */
  /* ------------------------------------------------------------------ */
  function criarDatePicker(input, opts) {
    if (!input || input.dataset.dpInit) return;
    input.dataset.dpInit = '1';
    var minISO = opts && opts.min ? opts.min : '';
    var onSelect = opts && opts.onSelect ? opts.onSelect : null;
    var wrap = document.createElement('div');
    wrap.className = 'dp-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.type = 'text';
    input.readOnly = true;
    input.classList.add('dp-input');
    input.placeholder = 'Selecione a data';
    input.autocomplete = 'off';
    if (input.value && /^\d{4}-\d{2}-\d{2}$/.test(input.value)) {
      var dtmp = SS.utils.dataDeInput(input.value);
      input.value = dtmp ? SS.utils.fmtData(input.value) : '';
      input.dataset.iso = opts && opts.isoVal ? opts.isoVal : (dtmp ? SS.utils.dataParaInput(dtmp) : '');
    }
    if (opts && opts.isoVal) { input.dataset.iso = opts.isoVal; if (opts.isoVal) input.value = SS.utils.fmtData(opts.isoVal); }
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'dp-trigger';
    trigger.setAttribute('aria-label', 'Abrir calendário');
    trigger.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
    wrap.appendChild(trigger);
    var cal = document.createElement('div');
    cal.className = 'dp-calendar';
    cal.hidden = true;
    wrap.appendChild(cal);
    var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var view = new Date();
    if (input.dataset.iso) { var pd = SS.utils.dataDeInput(input.dataset.iso); if (pd) view = new Date(pd.getFullYear(), pd.getMonth(), 1); }
    else if (minISO) { var md = SS.utils.dataDeInput(minISO); if (md) view = new Date(md.getFullYear(), md.getMonth(), 1); }
    else { view = new Date(view.getFullYear(), view.getMonth(), 1); }
    view.setDate(1);
    function isoDe(d){ return SS.utils.dataParaInput(d); }
    function renderCal(){
      var y = view.getFullYear(), m = view.getMonth();
      var first = new Date(y,m,1);
      var startDay = first.getDay();
      var daysInMonth = new Date(y,m+1,0).getDate();
      var prevDays = new Date(y,m,0).getDate();
      var minD = minISO ? SS.utils.dataDeInput(minISO) : null;
      if (minD) minD.setHours(0,0,0,0);
      var selISO = input.dataset.iso || '';
      var hojeISO = SS.utils.hojeISO();
      var head = '<div class="dp-head"><button type="button" class="dp-nav" data-dp-nav="-1" aria-label="Mês anterior"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button><div class="dp-title">' + meses[m] + ' ' + y + '</div><button type="button" class="dp-nav" data-dp-nav="1" aria-label="Próximo mês"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button></div>';
      var weekdays = ['D','S','T','Q','Q','S','S'].map(function(d){ return '<div class="dp-weekday">' + d + '</div>'; }).join('');
      var cells = '';
      for (var i=0;i<startDay;i++){ var dPrev = prevDays - startDay + 1 + i; cells += '<div class="dp-day dp-day--muted dp-day--disabled">' + dPrev + '</div>'; }
      for (var d=1; d<=daysInMonth; d++){
        var cur = new Date(y,m,d); cur.setHours(0,0,0,0);
        var iso = isoDe(cur);
        var isDisabled = minD && cur < minD;
        var isSel = selISO === iso;
        var isHoje = hojeISO === iso;
        var cls = 'dp-day' + (isDisabled ? ' dp-day--disabled' : '') + (isSel ? ' dp-day--selected' : '') + (isHoje ? ' dp-day--today' : '');
        cells += '<button type="button" class="' + cls + '" data-iso="' + iso + '"' + (isDisabled ? ' disabled' : '') + '>' + d + '</button>';
      }
      var total = startDay + daysInMonth;
      var rest = (7 - (total % 7)) % 7;
      for (var r=1; r<=rest; r++){ cells += '<div class="dp-day dp-day--muted dp-day--disabled">' + r + '</div>'; }
      var foot = '<div class="dp-foot"><span>' + (minISO ? 'A partir de ' + SS.utils.fmtData(minISO) : 'Selecione a data') + '</span><button type="button" data-dp-clear>Limpar</button></div>';
      cal.innerHTML = head + '<div class="dp-grid">' + weekdays + cells + '</div>' + foot;
      cal.querySelectorAll('[data-dp-nav]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); view.setMonth(view.getMonth() + Number(b.dataset.dpNav)); view.setDate(1); renderCal(); }); });
      cal.querySelectorAll('.dp-day[data-iso]').forEach(function(b){
        if (b.disabled) return;
        b.addEventListener('click', function(){
          var iso2 = b.dataset.iso;
          input.dataset.iso = iso2;
          input.value = SS.utils.fmtData(iso2);
          cal.hidden = true;
          input.dispatchEvent(new Event('change', {bubbles:true}));
          input.dispatchEvent(new Event('input', {bubbles:true}));
          if (onSelect) onSelect(iso2);
          wrap.closest('.form-group') && wrap.closest('.form-group').classList.remove('invalid');
        });
      });
      var clr = cal.querySelector('[data-dp-clear]');
      if (clr) clr.addEventListener('click', function(){ input.dataset.iso=''; input.value=''; cal.hidden=true; input.dispatchEvent(new Event('change',{bubbles:true})); if(onSelect) onSelect(''); });
    }
    function openCal(){ renderCal(); cal.hidden=false; }
    function closeCal(){ cal.hidden=true; }
    trigger.addEventListener('click', function(e){ e.stopPropagation(); cal.hidden ? openCal() : closeCal(); });
    input.addEventListener('click', function(){ cal.hidden ? openCal() : closeCal(); });
    document.addEventListener('click', function(e){ if (!wrap.contains(e.target)) closeCal(); });
    document.addEventListener('keydown', function(e){ if (e.key==='Escape') closeCal(); });
    input._dpSetMin = function(newMin){ minISO = newMin; };
    input._dpClose = closeCal;
  }
  function initDatePicker(input, minISO, onSelect, isoVal){
    if (typeof input === 'string') input = document.querySelector(input);
    if (!input) return;
    criarDatePicker(input, {min:minISO, onSelect:onSelect, isoVal:isoVal});
  }

  /* ------------------------------------------------------------------ */
  /* INICIALIZAÇÃO                                                       */
  /* ------------------------------------------------------------------ */
  function init() {
    injetarOverlays();
    renderHeader();
    renderFooter();
    initMenu();
    initCartDrawer();
    initReveal();
    SS.cart.on(function (d) { renderCartDrawer(d.itens); });
    renderCartDrawer(SS.cart.getItens());
  }

  document.addEventListener('DOMContentLoaded', init);

  SS.ui = {
    toast: toast,
    toggleCart: null,
    renderCartDrawer: renderCartDrawer,
    observeReveal: observeReveal,
    initCustomSelects: initCustomSelects,
    createDatePicker: criarDatePicker,
    initDatePicker: initDatePicker,
  };
})(window.SS);