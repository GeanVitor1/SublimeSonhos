window.SS = window.SS || {};
(function (SS) {
  'use strict';
  var u = SS.utils;
  var cfg = SS.config;
  var db = SS.catalog.db;
  var SESSION_TOKEN_KEY = 'ss_admin_token';
  var SESSION_EXP_KEY = 'ss_admin_exp';

  function estaLogado() {
    try {
      var tok = sessionStorage.getItem(SESSION_TOKEN_KEY);
      var exp = Number(sessionStorage.getItem(SESSION_EXP_KEY)) || 0;
      return !!tok && exp > Date.now();
    } catch (e) { return false; }
  }

  function login() {
    var input = document.getElementById('senha');
    var aviso = document.getElementById('login-aviso');
    var btn = document.getElementById('btn-entrar');
    var senha = input.value;
    if (!senha) {
      aviso.textContent = 'Informe a senha.';
      aviso.style.display = 'block';
      return;
    }
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: senha })
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, erro: 'Resposta inválida do servidor.' }; });
    }).then(function (resp) {
      if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      if (resp && resp.ok) {
        try {
          sessionStorage.setItem(SESSION_TOKEN_KEY, resp.token);
          sessionStorage.setItem(SESSION_EXP_KEY, String(resp.exp));
        } catch (e) {}
        input.value = '';
        aviso.style.display = 'none';
        mostrarPainel();
      } else {
        aviso.textContent = (resp && resp.erro) || 'Senha incorreta. Tente novamente.';
        aviso.style.display = 'block';
        input.focus();
        input.select();
      }
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      aviso.textContent = 'Não foi possível conectar ao servidor de autenticação.';
      aviso.style.display = 'block';
    });
  }

  function logout() {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXP_KEY);
    location.reload();
  }

  var modalOverlay = null;
  function lockScroll(){
    var y = window.scrollY || document.documentElement.scrollTop;
    document.body.dataset.lockY = y;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + y + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
  }
  function unlockScroll(){
    var y = parseInt(document.body.dataset.lockY || '0', 10);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.documentElement.style.overflow = '';
    window.scrollTo(0, y);
  }
  function abrirModal(titulo, bodyHtml, acoesHtml) {
    modalOverlay = document.getElementById('modal');
    var modal = modalOverlay.querySelector('.modal');
    document.getElementById('modal-title').textContent = titulo;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    SS.ui.initCustomSelects(document.getElementById('modal-body'));
    document.getElementById('modal-actions').innerHTML = acoesHtml;
    var isWide = bodyHtml.indexOf('modal-section') !== -1;
    modal.classList.toggle('modal--wide', isWide);
    modalOverlay.classList.add('open');
    lockScroll();
    var btnClose = document.getElementById('modal-close');
    if (btnClose) { btnClose.onclick = fecharModal; }
  }
  function fecharModal() {
    if (!modalOverlay) modalOverlay = document.getElementById('modal');
    var modal = modalOverlay.querySelector('.modal');
    if (modal) modal.classList.remove('modal--wide');
    modalOverlay.classList.remove('open');
    unlockScroll();
  }

  function lerOverrides() { return db._lerOverrides(); }
  function salvar(ov) { db._salvarOverrides(ov); }

    function renderProdutos(filtro) {
    var grid = document.getElementById('tabela-produtos');
    filtro = (filtro || '').toLowerCase();
    var todos = db.getProdutosTodos ? db.getProdutosTodos() : db._base.produtos.map(function (p) {
      var ov = lerOverrides().produtos[p.id];
      return ov ? Object.assign({}, p, ov) : p;
    });
    var produtosFiltrados = todos.filter(function (p) {
      if (p._excluido) return false;
      if (!filtro) return true;
      return (p.nome + ' ' + (p.descricaoCurta||'') + ' ' + (p.descricao||'')).toLowerCase().indexOf(filtro) !== -1;
    });
    function catsDeProdLocal(prod) {
      if (db.getCategoriasDeProduto) return db.getCategoriasDeProduto(prod);
      if (Array.isArray(prod.categorias) && prod.categorias.length) return prod.categorias.slice();
      if (Array.isArray(prod.categoria) && prod.categoria.length) return prod.categoria.slice();
      if (prod.categoria) return [String(prod.categoria)];
      return [];
    }
    var cats = db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias();
    if (!cats.length) {
      grid.innerHTML = '<div class="section-state" style="grid-column:1/-1"><span class="section-state__ico"><iconify-icon icon="ph:folder" width="32" height="32"></iconify-icon></span><p><strong>Nenhuma categoria.</strong></p><p class="section-state__sub">Crie uma categoria primeiro para organizar seus produtos.</p></div>';
      return;
    }
    if (!produtosFiltrados.length) {
      grid.innerHTML = '<div class="section-state" style="grid-column:1/-1"><span class="section-state__ico"><iconify-icon icon="ph:package" width="32" height="32"></iconify-icon></span><p><strong>Nenhum produto encontrado.</strong></p><p class="section-state__sub">Tente outro termo ou crie um novo produto na categoria desejada.</p></div>';
      return;
    }
    var html = '';
    var semCategoriaProds = produtosFiltrados.filter(function(p){ return catsDeProdLocal(p).length === 0; });
    cats.forEach(function(cat){
      var prodsDaCat = produtosFiltrados.filter(function(p){
        var cps = catsDeProdLocal(p);
        return cps.indexOf(cat.id) !== -1;
      });
      if (filtro && !prodsDaCat.length) return;
      var count = prodsDaCat.length;
      var visivel = cat.ativo !== false;
      html += '<section class="admin-cat-section">' +
        '<div class="admin-cat-header">' +
          '<div class="admin-cat-header__left">' +
            '<span class="admin-cat-header__ico"><iconify-icon icon="ph:' + u.esc(cat.icone || 'cookie') + '" width="20" height="20"></iconify-icon></span>' +
            '<div><div class="admin-cat-header__title">' + u.esc(cat.nome) + '</div><div class="admin-cat-header__meta">' + count + ' produto' + (count===1?'':'s') + (visivel ? '' : ' · Oculta') + '</div></div>' +
          '</div>' +
          '<div class="admin-cat-header__actions">' +
            '<button type="button" class="btn btn--primary btn--sm" data-newcat="' + u.esc(cat.id) + '">+ Novo produto</button>' +
          '</div>' +
        '</div>';
      if (!prodsDaCat.length) {
        html += '<div class="section-state" style="padding:18px;margin:0"><p class="text-sm text-muted">Nenhum produto nesta categoria ainda. Clique em <strong>Novo produto em ' + u.esc(cat.nome) + '</strong> para criar.</p></div>';
      } else {
        html += '<div class="admin-cards">' + prodsDaCat.map(function (p) {
          var catsProd = catsDeProdLocal(p);
          var catLabel = catsProd.map(function(cid){ return db.getCategoriaNome(cid) || cid; }).join(', ') || 'Sem categoria';
          var catExistsAlgum = catsProd.some(function(cid){ return !!db.getCategoria(cid); });
          var preco = p.preco === null || p.preco === undefined ? '<span class="text-muted">Sob consulta</span>' : u.fmtBRL(p.preco) + (p.precoPromo ? ' <span style="font-size:12px;color:var(--muted);text-decoration:line-through;margin-left:6px">' + u.fmtBRL(p.precoPromo) + '</span>' : '');
          var statusBadge = p.esgotado ? '<span class="badge badge--ink">Esgotado</span>' : p.ativo ? '<span class="badge badge--visible">Visível</span>' : '<span class="badge badge--hidden">Oculto</span>';
          if (!catExistsAlgum && catsProd.length) statusBadge += ' <span class="badge badge--hidden">Categoria oculta</span>';
          var media = p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + u.imgFallback() + '\';">' : '<div class="admin-card__media-fallback"><iconify-icon icon="ph:image" width="32" height="32"></iconify-icon></div>';
          return (
            '<article class="admin-card">' +
              '<div class="admin-card__media">' + media + '<div class="admin-card__topbadges">' + statusBadge + '</div></div>' +
              '<div class="admin-card__body">' +
                '<span class="admin-card__cat">' + u.esc(catLabel) + '</span>' +
                '<div class="admin-card__name">' + u.esc(p.nome) + '</div>' +
                '<div class="admin-card__id">' + u.esc(p.id) + '</div>' +
                '<div class="admin-card__price">' + preco + '</div>' +
                '<div class="admin-card__desc">' + u.esc(p.descricaoCurta || p.descricao || 'Sem descrição') + '</div>' +
              '</div>' +
              '<div class="admin-card__foot">' +
                '<div class="admin-card__actions">' +
                  '<button type="button" class="btn-cat-act btn-cat-act--edit" data-editar="' + u.esc(p.id) + '"><iconify-icon icon="ph:pencil-simple" width="14" height="14"></iconify-icon> Editar</button>' +
                  '<button type="button" class="btn-cat-act btn-cat-act--vis' + (p.ativo ? '' : ' is-hidden') + '" data-toggle="' + u.esc(p.id) + '"><iconify-icon icon="ph:' + (p.ativo ? 'eye-slash' : 'eye') + '" width="14" height="14"></iconify-icon> ' + (p.ativo ? 'Ocultar' : 'Mostrar') + '</button>' +
                  '<button type="button" class="btn-cat-act btn-cat-act--del" data-del="' + u.esc(p.id) + '"><iconify-icon icon="ph:trash" width="14" height="14"></iconify-icon> Excluir</button>' +
                '</div>' +
              '</div>' +
            '</article>'
          );
        }).join('') + '</div>';
      }
      html += '</section>';
    });
    if (semCategoriaProds.length) {
      html += '<section class="admin-cat-section"><div class="admin-cat-header"><div class="admin-cat-header__left"><span class="admin-cat-header__ico"><iconify-icon icon="ph:package" width="20" height="20"></iconify-icon></span><div><div class="admin-cat-header__title">Sem categoria</div><div class="admin-cat-header__meta">' + semCategoriaProds.length + ' produto' + (semCategoriaProds.length===1?'':'s') + '</div></div></div><div class="admin-cat-header__actions"><button type="button" class="btn btn--primary btn--sm" data-newcat="">+ Novo produto</button></div></div><div class="admin-cards">' + semCategoriaProds.map(function(p){
        var preco2 = p.preco === null || p.preco === undefined ? '<span class="text-muted">Sob consulta</span>' : u.fmtBRL(p.preco) + (p.precoPromo ? ' <span style="font-size:12px;color:var(--muted);text-decoration:line-through;margin-left:6px">' + u.fmtBRL(p.precoPromo) + '</span>' : '');
        var statusBadge2 = p.esgotado ? '<span class="badge badge--ink">Esgotado</span>' : p.ativo ? '<span class="badge badge--visible">Visível</span>' : '<span class="badge badge--hidden">Oculto</span>';
        var media2 = p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + u.imgFallback() + '\';">' : '<div class="admin-card__media-fallback"><iconify-icon icon="ph:image" width="32" height="32"></iconify-icon></div>';
        return '<article class="admin-card"><div class="admin-card__media">' + media2 + '<div class="admin-card__topbadges">' + statusBadge2 + '</div></div><div class="admin-card__body"><span class="admin-card__cat">Sem categoria</span><div class="admin-card__name">' + u.esc(p.nome) + '</div><div class="admin-card__id">' + u.esc(p.id) + '</div><div class="admin-card__price">' + preco2 + '</div><div class="admin-card__desc">' + u.esc(p.descricaoCurta || p.descricao || 'Sem descrição') + '</div></div><div class="admin-card__foot"><div class="admin-card__actions"><button type="button" class="btn-cat-act btn-cat-act--edit" data-editar="' + u.esc(p.id) + '"><iconify-icon icon="ph:pencil-simple" width="14" height="14"></iconify-icon> Editar</button><button type="button" class="btn-cat-act btn-cat-act--vis' + (p.ativo ? '' : ' is-hidden') + '" data-toggle="' + u.esc(p.id) + '"><iconify-icon icon="ph:' + (p.ativo ? 'eye-slash' : 'eye') + '" width="14" height="14"></iconify-icon> ' + (p.ativo ? 'Ocultar' : 'Mostrar') + '</button><button type="button" class="btn-cat-act btn-cat-act--del" data-del="' + u.esc(p.id) + '"><iconify-icon icon="ph:trash" width="14" height="14"></iconify-icon> Excluir</button></div></div></article>';
      }).join('') + '</div></section>';
    }
    grid.innerHTML = html || '<div class="section-state" style="grid-column:1/-1"><span class="section-state__ico"><iconify-icon icon="ph:package" width="32" height="32"></iconify-icon></span><p><strong>Nenhum produto encontrado.</strong></p></div>';
    grid.querySelectorAll('[data-newcat]').forEach(function(b){
      b.addEventListener('click', function(){ abrirFormProduto(null, b.getAttribute('data-newcat')); });
    });
    grid.querySelectorAll('[data-editar]').forEach(function (b) {
      b.addEventListener('click', function () { abrirFormProduto(b.getAttribute('data-editar')); });
    });
    grid.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-toggle');
        var ov = lerOverrides();
        var base = db._base.produtos.filter(function (p) { return p.id === id; })[0];
        var atual = base ? Object.assign({}, base, ov.produtos[id] || {}) : Object.assign({ id: id }, ov.produtos[id] || {});
        var novoAtivo = !atual.ativo;
        ov.produtos[id] = Object.assign({}, ov.produtos[id] || {}, { ativo: novoAtivo });
        salvar(ov);
        SS.ui.toast(novoAtivo ? 'Produto visível na loja.' : 'Produto ocultado da vitrine.', '');
        renderProdutos(document.getElementById('busca-prod').value);
      });
    });
    grid.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del');
        var pNome = db.getProdutosTodos().filter(function (p){ return p.id===id; })[0];
        var nome = pNome ? pNome.nome : id;
        abrirModal('Excluir produto', '<p>Excluir <strong>' + u.esc(nome) + '</strong> definitivamente? Esta ação remove o produto da loja e do painel (apenas neste navegador). Pode ser desfeita recriando o produto.</p><p class="text-sm text-muted mt-2">Dica: para apenas ocultar da página inicial, use <em>Ocultar</em>.</p>',
          '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button>' +
          '<button type="button" class="btn btn--dark" data-confirmar>Excluir definitivamente</button>');
        modalOverlay.querySelector('[data-confirmar]').addEventListener('click', function () {
          var ov = lerOverrides();
          var isBase = db._base.produtos.some(function (p){ return p.id===id; });
          if (isBase) {
            ov.produtos[id] = Object.assign({}, ov.produtos[id] || {}, { _excluido: true, ativo: false });
          } else {
            delete ov.produtos[id];
          }
          salvar(ov);
          fecharModal();
          SS.ui.toast('Produto excluído.', '');
          renderProdutos(document.getElementById('busca-prod').value);
        });
        modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
      });
    });
  }

  function linhasParaLista(texto) {
    return texto.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function abrirFormProduto(id, categoriaPreselecionada) {
    var base = db._base.produtos.filter(function (p) { return p.id === id; })[0];
    var ov = lerOverrides().produtos[id] || {};
    var p = Object.assign({}, base || {}, ov);
    if (!base && !ov.id && id) p = Object.assign({}, ov);
    var novo = !base && !lerOverrides().produtos[id];
    if (!base && ov.id) novo = false;
    if (!id) novo = true;

    var sabores = (p.sabores || []).map(function (s) { return typeof s === 'object' ? s.nome : s; }).join('\n');
    var tamanhos = (p.tamanhos || []).map(function (s) { return typeof s === 'object' ? s.nome : s; }).join('\n');
    var adicionais = (p.adicionais || []).map(function (a) { return a.nome + ';' + (a.preco || 0); }).join('\n');
    var cats = db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias();
    // categorias do produto (suporta legado single string e novo array)
    function catsDoProduto(prod) {
      if (Array.isArray(prod.categorias) && prod.categorias.length) return prod.categorias.slice();
      if (Array.isArray(prod.categoria) && prod.categoria.length) return prod.categoria.slice();
      if (prod.categoria) return [String(prod.categoria)];
      return [];
    }
    var catsAtuais = catsDoProduto(p);
    if (novo && categoriaPreselecionada) catsAtuais = [String(categoriaPreselecionada)];
    var catChecks = '';
    if (!cats.length) {
      catChecks = '<p class="text-sm text-muted" style="padding:8px 0">Sem categorias — crie uma primeiro em <strong>Categorias</strong>.</p>';
    } else {
      catChecks = '<div class="pf-cat-grid" id="pf-cat-grid">' + cats.map(function (c) {
        var checked = catsAtuais.indexOf(c.id) !== -1 ? ' checked' : '';
        var label = c.nome + (c.ativo === false ? ' (oculta)' : '');
        return '<label class="pf-cat-check"><input type="checkbox" value="' + u.esc(c.id) + '"' + checked + '><span>' + u.esc(label) + '</span></label>';
      }).join('') + '</div>';
      // alerta se produto tem categoria excluída
      var catsExcluidas = catsAtuais.filter(function(cid){ return !cats.some(function(c){ return c.id===cid; }); });
      if (catsExcluidas.length) {
        catChecks += '<p class="text-sm" style="color:var(--danger);margin-top:6px">Categorias excluídas: ' + catsExcluidas.map(function(cid){ return u.esc(cid); }).join(', ') + ' — desmarque ou reassocie.</p>';
      }
    }

    if (novo) {
      var stepHtml = '<div class="pf-steps-indicator"><div class="pf-step-dot active" data-sdot="1"><span>1</span><small>Identificação</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="2"><span>2</span><small>Preço e descrição</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="3"><span>3</span><small>Opções</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="4"><span>4</span><small>Fotos e exibição</small></div></div>' +
        '<div class="pf-step" data-step="1"><div class="modal-section"><h4><iconify-icon icon="ph:tag" width="16" height="16"></iconify-icon> Identificação</h4><div class="form-group"><label class="form-label">Nome do produto <span class="req">*</span></label><input class="form-control" id="pf-nome" value="' + u.esc(p.nome || '') + '" placeholder="Ex.: Caixa com 6 doces"><p class="form-hint">Nome que aparece na vitrine.</p></div><div class="form-group"><label class="form-label">Categorias <span class="req">*</span></label>' + catChecks + '<p class="form-hint">Marque uma ou mais categorias onde o produto deve aparecer.</p></div></div></div>' +
        '<div class="pf-step hidden" data-step="2"><div class="modal-section"><h4><iconify-icon icon="ph:currency-dollar" width="16" height="16"></iconify-icon> Preço e descrição</h4><div class="modal-grid2"><div class="form-group"><label class="form-label">Preço (R$)</label><input class="form-control" id="pf-preco" type="number" min="0" step="0.01" value="' + (p.preco === null || p.preco===undefined ? '' : p.preco) + '" placeholder="Ex.: 32,00"><p class="form-hint">Deixe vazio para “Sob consulta”.</p></div><div class="form-group"><label class="form-label">Preço promocional (R$)</label><input class="form-control" id="pf-promo" type="number" min="0" step="0.01" value="' + (p.precoPromo || '') + '" placeholder="Opcional"></div></div><div class="form-group"><label class="form-label">Descrição completa <span style="font-weight:400;color:var(--muted)">(opcional)</span></label><textarea class="form-control" id="pf-desc" rows="4" placeholder="Detalhe ingredientes, tamanho, o que acompanha… (opcional)">' + u.esc(p.descricao || '') + '</textarea><p class="form-hint">Se preencher, a vitrine usará os primeiros 90 caracteres. Pode deixar vazio.</p></div></div></div>' +
        '<div class="pf-step hidden" data-step="3"><div class="modal-section"><h4><iconify-icon icon="ph:sliders" width="16" height="16"></iconify-icon> Opções do produto</h4><div class="pf-opt-sec"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:ruler" width="14" height="14"></iconify-icon> Tamanhos</h5><span class="form-hint">Ex.: P, M, G</span></div><div id="pf-tam-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-tam"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar tamanho</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:cookie" width="14" height="14"></iconify-icon> Sabores</h5><span class="form-hint">Ex.: Brigadeiro, Ninho</span></div><div id="pf-sabor-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-sabor"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar sabor</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:plus-circle" width="14" height="14"></iconify-icon> Adicionais</h5><span class="form-hint">Cobrança extra, ex.: Granulado + R$2</span></div><div id="pf-adic-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-adic"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar adicional</button></div></div></div>' +
        '<div class="pf-step hidden" data-step="4"><div class="modal-section"><h4><iconify-icon icon="ph:image" width="16" height="16"></iconify-icon> Fotos</h4><div class="pf-imgs" id="pf-imgs"></div><div class="pf-upload" id="pf-upload"><input class="sr-only" id="pf-img-file" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="pf-upload__icon"><iconify-icon icon="ph:upload-simple" width="24" height="24"></iconify-icon></div><p class="pf-upload__title">Arraste as fotos aqui ou clique para selecionar</p><p class="pf-upload__hint">JPG, PNG ou WebP • até 1,5 MB cada • várias de uma vez</p><button type="button" class="btn btn--outline btn--sm" id="pf-upload-btn"><iconify-icon icon="ph:images" width="16" height="16"></iconify-icon> Selecionar fotos</button></div><p class="form-hint mt-2">Ficam salvas neste navegador e refletem imediatamente na vitrine.</p></div><div class="modal-section"><h4><iconify-icon icon="ph:eye" width="16" height="16"></iconify-icon> Exibição na loja</h4><div class="pf-checks"><label class="pf-check"><input type="checkbox" id="pf-ativo" checked><span>Visível na vitrine</span></label><label class="pf-check"><input type="checkbox" id="pf-pronta" ' + (p.prontaEntrega ? 'checked' : '') + '><span>Pronta entrega</span></label><label class="pf-check"><input type="checkbox" id="pf-encomenda" ' + (p.encomenda ? 'checked' : '') + '><span>Aceita encomenda</span></label><label class="pf-check"><input type="checkbox" id="pf-esgotado" ' + (p.esgotado ? 'checked' : '') + '><span>Marcar como esgotado</span></label></div></div></div>';
      abrirModal('Novo produto', stepHtml, '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--outline" id="pf-voltar" style="display:none">Voltar</button><button type="button" class="btn btn--primary" id="pf-avancar">Avançar</button><button type="button" class="btn btn--primary" id="pf-salvar" style="display:none">Criar produto</button>');
    } else {
      abrirModal('Editar produto',
        '<div class="modal-section"><h4><iconify-icon icon="ph:tag" width="16" height="16"></iconify-icon> Identificação</h4><div class="form-group"><label class="form-label">Nome do produto <span class="req">*</span></label><input class="form-control" id="pf-nome" value="' + u.esc(p.nome || '') + '" placeholder="Ex.: Caixa com 6 doces"><p class="form-hint">Nome que aparece na vitrine.</p></div><div class="form-group"><label class="form-label">Categorias <span class="req">*</span></label>' + catChecks + '<p class="form-hint">Marque uma ou mais categorias onde o produto deve aparecer.</p></div></div>' +
        '<div class="modal-section"><h4><iconify-icon icon="ph:currency-dollar" width="16" height="16"></iconify-icon> Preço e descrição</h4><div class="modal-grid2"><div class="form-group"><label class="form-label">Preço (R$)</label><input class="form-control" id="pf-preco" type="number" min="0" step="0.01" value="' + (p.preco === null || p.preco===undefined ? '' : p.preco) + '" placeholder="Ex.: 32,00"><p class="form-hint">Deixe vazio para “Sob consulta”.</p></div><div class="form-group"><label class="form-label">Preço promocional (R$)</label><input class="form-control" id="pf-promo" type="number" min="0" step="0.01" value="' + (p.precoPromo || '') + '" placeholder="Opcional"></div></div><div class="form-group"><label class="form-label">Descrição completa <span style="font-weight:400;color:var(--muted)">(opcional)</span></label><textarea class="form-control" id="pf-desc" rows="4" placeholder="Detalhe ingredientes, tamanho, o que acompanha… (opcional)">' + u.esc(p.descricao || '') + '</textarea><p class="form-hint">Se preencher, a vitrine usará os primeiros 90 caracteres. Pode deixar vazio.</p></div></div>' +
        '<div class="modal-section"><h4><iconify-icon icon="ph:sliders" width="16" height="16"></iconify-icon> Opções do produto</h4><div class="pf-opt-sec"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:ruler" width="14" height="14"></iconify-icon> Tamanhos</h5><span class="form-hint">Ex.: P, M, G</span></div><div id="pf-tam-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-tam"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar tamanho</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:cookie" width="14" height="14"></iconify-icon> Sabores</h5><span class="form-hint">Ex.: Brigadeiro, Ninho</span></div><div id="pf-sabor-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-sabor"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar sabor</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:plus-circle" width="14" height="14"></iconify-icon> Adicionais</h5><span class="form-hint">Cobrança extra, ex.: Granulado + R$2</span></div><div id="pf-adic-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-adic"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar adicional</button></div></div>' +
        '<div class="modal-section"><h4><iconify-icon icon="ph:image" width="16" height="16"></iconify-icon> Fotos</h4><div class="pf-imgs" id="pf-imgs"></div><div class="pf-upload" id="pf-upload"><input class="sr-only" id="pf-img-file" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="pf-upload__icon"><iconify-icon icon="ph:upload-simple" width="24" height="24"></iconify-icon></div><p class="pf-upload__title">Arraste as fotos aqui ou clique para selecionar</p><p class="pf-upload__hint">JPG, PNG ou WebP • até 1,5 MB cada • várias de uma vez</p><button type="button" class="btn btn--outline btn--sm" id="pf-upload-btn"><iconify-icon icon="ph:images" width="16" height="16"></iconify-icon> Selecionar fotos</button></div><p class="form-hint mt-2">Ficam salvas neste navegador e refletem imediatamente na vitrine.</p></div>' +
        '<div class="modal-section"><h4><iconify-icon icon="ph:eye" width="16" height="16"></iconify-icon> Exibição na loja</h4><div class="pf-checks"><label class="pf-check"><input type="checkbox" id="pf-ativo" ' + (p.ativo !== false ? 'checked' : '') + '><span>Visível na vitrine</span></label><label class="pf-check"><input type="checkbox" id="pf-pronta" ' + (p.prontaEntrega ? 'checked' : '') + '><span>Pronta entrega</span></label><label class="pf-check"><input type="checkbox" id="pf-encomenda" ' + (p.encomenda ? 'checked' : '') + '><span>Aceita encomenda</span></label><label class="pf-check"><input type="checkbox" id="pf-esgotado" ' + (p.esgotado ? 'checked' : '') + '><span>Marcar como esgotado</span></label></div></div>',
        '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--primary" id="pf-salvar">' + (novo ? 'Criar produto' : 'Salvar alterações') + '</button>');
    }

    var imgsWrap = document.getElementById('pf-imgs');
    var imagens = (p.imagens || []).slice();
    function renderImgs() {
      imgsWrap.innerHTML = imagens.map(function (src, i) {
        return '<div class="pf-img-card"><img src="' + u.esc(src) + '" alt=""><button type="button" class="pf-img-rm" data-rmimg="' + i + '" aria-label="Remover imagem">×</button></div>';
      }).join('') || '<span class="text-sm text-muted">Nenhuma imagem ainda. Adicione a primeira foto acima.</span>';
      imgsWrap.querySelectorAll('[data-rmimg]').forEach(function (b) {
        b.addEventListener('click', function () { imagens.splice(Number(b.getAttribute('data-rmimg')), 1); renderImgs(); });
      });
    }
    var tamListEl = document.getElementById('pf-tam-list');
    var saborListEl = document.getElementById('pf-sabor-list');
    var adicListEl = document.getElementById('pf-adic-list');
    var listaTam = [];
    var listaSabor = [];
    var listaAdic = [];
    (p.tamanhos || []).forEach(function(s){ var n = typeof s==='object'?s.nome:s; if(n) listaTam.push({nome:n, preco:(s.acrescimo||0)}); });
    (p.sabores || []).forEach(function(s){ var n = typeof s==='object'?s.nome:s; if(n) listaSabor.push({nome:n, preco:(s.acrescimo||0)}); });
    (p.adicionais || []).forEach(function(a){ if(a.nome) listaAdic.push({nome:a.nome, preco:a.preco||0}); });
    (p.variacoes || []).forEach(function(v){ var nn=(v.nome||'').toLowerCase(); var tipo='sabor'; if(nn.indexOf('tamanho')!==-1) tipo='tamanho'; else if(nn.indexOf('adicional')!==-1) tipo='adicional'; (v.opcoes||[]).forEach(function(o){ if(tipo==='tamanho') listaTam.push({nome:o.nome, preco:o.acrescimo||0}); else if(tipo==='adicional') listaAdic.push({nome:o.nome, preco:o.preco||o.acrescimo||0}); else listaSabor.push({nome:o.nome, preco:o.acrescimo||0}); }); });
    // snapshot das listas de opções — preserva grupos de variação originais se nada mudar
    function snapLista(arr){ return JSON.stringify(arr.map(function(v){ return { nome: String(v.nome||'').trim(), preco: Math.round((Number(v.preco)||0)*100)/100 }; })); }
    var snapTam = snapLista(listaTam);
    var snapSabor = snapLista(listaSabor);
    var snapAdic = snapLista(listaAdic);
    function renderTam(){
      if (!tamListEl) return;
      if (!listaTam.length) { tamListEl.innerHTML = '<p class="text-sm text-muted" style="padding:6px 0">Nenhum tamanho. Clique em “Adicionar tamanho”.</p>'; return; }
      tamListEl.innerHTML = listaTam.map(function(it,i){
        return '<div class="pf-var-row" data-idx="'+i+'" style="margin-bottom:8px">' +
          '<input class="form-control" data-tnome value="'+u.esc(it.nome)+'" placeholder="Ex.: P, M, G">' +
          '<input class="form-control" data-tpreco type="number" min="0" step="0.01" value="'+(it.preco||'')+'" placeholder="+ R$">' +
          '<button type="button" class="btn btn--outline btn--sm" data-trm style="width:36px;height:40px;padding:0;display:grid;place-items:center">×</button></div>';
      }).join('');
      tamListEl.querySelectorAll('[data-tnome]').forEach(function(inp){ inp.addEventListener('input', function(){ var i=Number(inp.closest('.pf-var-row').getAttribute('data-idx')); listaTam[i].nome=inp.value; }); });
      tamListEl.querySelectorAll('[data-tpreco]').forEach(function(inp){ inp.addEventListener('input', function(){ var i=Number(inp.closest('.pf-var-row').getAttribute('data-idx')); listaTam[i].preco=Number(inp.value.replace(',','.'))||0; }); });
      tamListEl.querySelectorAll('[data-trm]').forEach(function(btn){ btn.addEventListener('click', function(){ var i=Number(btn.closest('.pf-var-row').getAttribute('data-idx')); listaTam.splice(i,1); renderTam(); }); });
    }
    function renderSabor(){
      if (!saborListEl) return;
      if (!listaSabor.length) { saborListEl.innerHTML = '<p class="text-sm text-muted" style="padding:6px 0">Nenhum sabor. Clique em “Adicionar sabor”.</p>'; return; }
      saborListEl.innerHTML = listaSabor.map(function(it,i){
        return '<div class="pf-var-row" data-idx="'+i+'" style="margin-bottom:8px">' +
          '<input class="form-control" data-snome value="'+u.esc(it.nome)+'" placeholder="Ex.: Brigadeiro, Ninho">' +
          '<input class="form-control" data-spreco type="number" min="0" step="0.01" value="'+(it.preco||'')+'" placeholder="+ R$">' +
          '<button type="button" class="btn btn--outline btn--sm" data-srm style="width:36px;height:40px;padding:0;display:grid;place-items:center">×</button></div>';
      }).join('');
      saborListEl.querySelectorAll('[data-snome]').forEach(function(inp){ inp.addEventListener('input', function(){ var i=Number(inp.closest('.pf-var-row').getAttribute('data-idx')); listaSabor[i].nome=inp.value; }); });
      saborListEl.querySelectorAll('[data-spreco]').forEach(function(inp){ inp.addEventListener('input', function(){ var i=Number(inp.closest('.pf-var-row').getAttribute('data-idx')); listaSabor[i].preco=Number(inp.value.replace(',','.'))||0; }); });
      saborListEl.querySelectorAll('[data-srm]').forEach(function(btn){ btn.addEventListener('click', function(){ var i=Number(btn.closest('.pf-var-row').getAttribute('data-idx')); listaSabor.splice(i,1); renderSabor(); }); });
    }
    function renderAdic(){
      if (!adicListEl) return;
      if (!listaAdic.length) { adicListEl.innerHTML = '<p class="text-sm text-muted" style="padding:6px 0">Nenhum adicional. Clique em “Adicionar adicional”.</p>'; return; }
      adicListEl.innerHTML = listaAdic.map(function(it,i){
        return '<div class="pf-var-row" data-idx="'+i+'" style="margin-bottom:8px">' +
          '<input class="form-control" data-anome value="'+u.esc(it.nome)+'" placeholder="Ex.: Granulado, Morango extra">' +
          '<input class="form-control" data-apreco type="number" min="0" step="0.01" value="'+(it.preco||'')+'" placeholder="R$">' +
          '<button type="button" class="btn btn--outline btn--sm" data-arm style="width:36px;height:40px;padding:0;display:grid;place-items:center">×</button></div>';
      }).join('');
      adicListEl.querySelectorAll('[data-anome]').forEach(function(inp){ inp.addEventListener('input', function(){ var i=Number(inp.closest('.pf-var-row').getAttribute('data-idx')); listaAdic[i].nome=inp.value; }); });
      adicListEl.querySelectorAll('[data-apreco]').forEach(function(inp){ inp.addEventListener('input', function(){ var i=Number(inp.closest('.pf-var-row').getAttribute('data-idx')); listaAdic[i].preco=Number(inp.value.replace(',','.'))||0; }); });
      adicListEl.querySelectorAll('[data-arm]').forEach(function(btn){ btn.addEventListener('click', function(){ var i=Number(btn.closest('.pf-var-row').getAttribute('data-idx')); listaAdic.splice(i,1); renderAdic(); }); });
    }
    renderTam(); renderSabor(); renderAdic();
    if (novo) {
      var curStep = 1;
      var totalSteps = 4;
      var btnAv = document.getElementById('pf-avancar');
      var btnVol = document.getElementById('pf-voltar');
      var btnSave = document.getElementById('pf-salvar');
      function showStep(n){
        curStep = n;
        modalOverlay.querySelectorAll('.pf-step').forEach(function(s){ s.classList.toggle('hidden', Number(s.getAttribute('data-step'))!==n); });
        modalOverlay.querySelectorAll('.pf-step-dot').forEach(function(d){ var sn=Number(d.getAttribute('data-sdot')); d.classList.toggle('active', sn===n); d.classList.toggle('done', sn<n); });
        if (btnVol) btnVol.style.display = n===1 ? 'none' : 'inline-flex';
        if (btnAv) btnAv.style.display = n===totalSteps ? 'none' : 'inline-flex';
        if (btnSave) btnSave.style.display = n===totalSteps ? 'inline-flex' : 'none';
        var body = modalOverlay.querySelector('#modal-body'); if(body) body.scrollTop = 0;
      }
      function validarStep(n){
        if (n===1){
          var nm=document.getElementById('pf-nome').value.trim();
          var ctChecked = document.querySelectorAll('#pf-cat-grid input[type="checkbox"]:checked');
          if(!nm){ SS.ui.toast('Informe o nome do produto.', 'error'); return false; }
          if(!ctChecked.length){ SS.ui.toast('Selecione ao menos uma categoria.', 'error'); return false; }
        }
        return true;
      }
      if (btnAv) btnAv.addEventListener('click', function(){ if(!validarStep(curStep)) return; if(curStep<totalSteps) showStep(curStep+1); });
      if (btnVol) btnVol.addEventListener('click', function(){ if(curStep>1) showStep(curStep-1); });
      showStep(1);
    }
    var btnAddTam = document.getElementById('pf-add-tam'); if (btnAddTam) btnAddTam.addEventListener('click', function(){ listaTam.push({nome:'', preco:0}); renderTam(); });
    var btnAddSabor = document.getElementById('pf-add-sabor'); if (btnAddSabor) btnAddSabor.addEventListener('click', function(){ listaSabor.push({nome:'', preco:0}); renderSabor(); });
    var btnAddAdic = document.getElementById('pf-add-adic'); if (btnAddAdic) btnAddAdic.addEventListener('click', function(){ listaAdic.push({nome:'', preco:0}); renderAdic(); });
    renderImgs();
    var fileInput = document.getElementById('pf-img-file');
    var uploadBtn = document.getElementById('pf-upload-btn');
    var uploadZone = document.getElementById('pf-upload');
    function handleFiles(files){
      Array.prototype.forEach.call(files, function(file){
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) { SS.ui.toast('Formato inválido: ' + file.name, 'error'); return; }
        if (file.size > 1.5 * 1024 * 1024) { SS.ui.toast('Imagem acima de 1,5 MB: ' + file.name, 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(){ compressImage(reader.result, function(dataUrl){ imagens.push(dataUrl); renderImgs(); }); };
        reader.readAsDataURL(file);
      });
    }
    if (uploadBtn) uploadBtn.addEventListener('click', function(e){ e.preventDefault(); fileInput.click(); });
    if (uploadZone) {
      uploadZone.addEventListener('click', function(e){ if (e.target.closest('button')) return; fileInput.click(); });
      uploadZone.addEventListener('dragover', function(e){ e.preventDefault(); uploadZone.classList.add('is-dragover'); });
      uploadZone.addEventListener('dragleave', function(){ uploadZone.classList.remove('is-dragover'); });
      uploadZone.addEventListener('drop', function(e){ e.preventDefault(); uploadZone.classList.remove('is-dragover'); handleFiles(e.dataTransfer.files); });
    }
    fileInput.addEventListener('change', function(){ handleFiles(fileInput.files); fileInput.value=''; });

    modalOverlay.querySelector('#pf-salvar').addEventListener('click', function () {
      var nome = document.getElementById('pf-nome').value.trim();
      if (!nome) { SS.ui.toast('Informe o nome do produto.', 'error'); return; }
      var catVals = Array.prototype.slice.call(document.querySelectorAll('#pf-cat-grid input[type="checkbox"]:checked')).map(function(cb){ return cb.value; });
      if (!catVals.length) { SS.ui.toast('Associe o produto a ao menos uma categoria.', 'error'); return; }
      var catVal = catVals[0];
      var precoStr = document.getElementById('pf-preco').value.trim();
      var preco = precoStr === '' ? null : Math.round(Number(precoStr.replace(',', '.')) * 100) / 100;
      var promoStr = document.getElementById('pf-promo').value.trim();
      var promo = promoStr === '' ? null : Math.round(Number(promoStr.replace(',', '.')) * 100) / 100;
      var novoId = novo ? u.slugify(nome) || ('produto-' + Date.now()) : p.id;
      var ovCheck = lerOverrides();
      if (novo && (db._base.produtos.some(function(x){return x.id===novoId;}) || ovCheck.produtos[novoId])) {
        novoId = novoId + '-' + Date.now().toString(36).slice(-4);
      }

      var descCompleta = document.getElementById('pf-desc').value.trim();
      var curtaAuto = descCompleta ? descCompleta.slice(0, 90) : '';
      if (descCompleta.length > 90) {
        var lastSp = curtaAuto.lastIndexOf(' ');
        if (lastSp > 60) curtaAuto = curtaAuto.slice(0, lastSp);
        curtaAuto += '…';
      }
      var sabores = listaSabor.filter(function(v){ return v.nome.trim(); }).map(function(v){ return { nome: v.nome.trim(), acrescimo: Number(v.preco)||0 }; });
      var tamanhos = listaTam.filter(function(v){ return v.nome.trim(); }).map(function(v){ return { nome: v.nome.trim(), acrescimo: Number(v.preco)||0 }; });
      var adicionais = listaAdic.filter(function(v){ return v.nome.trim(); }).map(function(v){ return { nome: v.nome.trim(), preco: Math.round((Number(v.preco)||0)*100)/100 }; });
      // se as listas de opções não foram alteradas, preserva os grupos de variação originais
      var preservaVars = !novo && !!p.variacoes && p.variacoes.length &&
        snapLista(listaTam) === snapTam && snapLista(listaSabor) === snapSabor && snapLista(listaAdic) === snapAdic;
      var campos = {
        nome: nome,
        categoria: catVal,
        categorias: catVals,
        preco: isNaN(preco) ? null : preco,
        precoPromo: isNaN(promo) ? null : promo,
        precoSobConsulta: preco === null,
        descricaoCurta: curtaAuto,
        descricao: descCompleta,
        unidade: p.unidade || 'un',
        quantidadeMinima: p.quantidadeMinima || 1,
        prazoProducaoDias: p.prazoProducaoDias || 0,
        variacoes: preservaVars ? p.variacoes : [],
        sabores: preservaVars ? (p.sabores || []) : sabores,
        tamanhos: preservaVars ? (p.tamanhos || []) : tamanhos,
        adicionais: preservaVars ? (p.adicionais || []) : adicionais,
        observacoes: p.observacoes || '',
        conservacao: p.conservacao || '',
        prontaEntrega: document.getElementById('pf-pronta').checked,
        encomenda: document.getElementById('pf-encomenda').checked,
        esgotado: document.getElementById('pf-esgotado').checked,
        ativo: document.getElementById('pf-ativo').checked,
        imagens: imagens,
      };

      var ov = lerOverrides();
      if (novo) {
        var novoProduto = Object.assign({}, {
          preco: null, precoPromo: null, precoSobConsulta: false,
          unidade: 'un', quantidadeMinima: 1, prazoProducaoDias: 0,
          observacoes: '', conservacao: '', disponibilidade: true,
          prontaEntrega: false, encomenda: false, esgotado: false,
          destaque: false, ativo: true, imagens: [],
          variacoes: [], sabores: [], tamanhos: [], adicionais: [],
          slug: novoId
        }, campos, { id: novoId });
        delete novoProduto._excluido;
        ov.produtos[novoId] = novoProduto;
      } else {
        var existing = ov.produtos[p.id] || {};
        if (existing._excluido) delete existing._excluido;
        ov.produtos[p.id] = Object.assign({}, existing, campos);
        if (base) ov.produtos[p.id].id = p.id;
      }
      salvar(ov);
      fecharModal();
      SS.ui.toast(novo ? 'Produto criado e associado à categoria.' : 'Produto atualizado.', '');
      renderProdutos(document.getElementById('busca-prod').value);
      renderCategorias();
    });
    modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
  }

  function compressImage(dataUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var max = 1000;
      var w = img.width, h = img.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FBF6F0';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = function () { cb(dataUrl); };
    img.src = dataUrl;
  }

    function moverCategoria(id, dir) {
      var ov = lerOverrides();
      var cats = (ov.categorias && ov.categorias.length ? ov.categorias : db._base.categorias.slice()).map(function (c) {
        return Object.assign({}, c);
      });
      var idx = -1;
      for (var i = 0; i < cats.length; i++) {
        if (cats[i].id === id) { idx = i; break; }
      }
      if (idx === -1) {
        var baseCat = db.getCategoria(id);
        if (baseCat) {
          cats.push(Object.assign({}, baseCat));
          idx = cats.length - 1;
        }
      }
      if (idx === -1) return;
      var targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= cats.length) return;
      var temp = cats[idx];
      cats[idx] = cats[targetIdx];
      cats[targetIdx] = temp;
      ov.categorias = cats;
      salvar(ov);
      SS.ui.toast('Ordem atualizada! "' + temp.nome + '" agora é a ' + (targetIdx + 1) + 'ª na vitrine.', 'success');
      renderCategorias();
    }

    function abrirModalReordenarCategorias() {
      var ov = lerOverrides();
      var cats = (ov.categorias && ov.categorias.length ? ov.categorias : db._base.categorias.slice()).map(function (c) {
        return Object.assign({}, c);
      });
      if (!cats.length) {
        SS.ui.toast('Nenhuma categoria cadastrada.', 'error');
        return;
      }

      function gerarListaReordenar(lista) {
        return lista.map(function (c, idx) {
          var isFirst = idx === 0;
          var isLast = idx === lista.length - 1;
          var opts = lista.map(function (_, i) {
            return '<option value="' + i + '"' + (i === idx ? ' selected' : '') + '>' + (i + 1) + 'ª posição' + (i === 0 ? ' (Primeira)' : (i === lista.length - 1 ? ' (Última)' : '')) + '</option>';
          }).join('');
          return (
            '<div class="cat-reorder-item" data-idx="' + idx + '" data-id="' + u.esc(c.id) + '">' +
              '<div class="cat-reorder-item__left">' +
                '<span class="cat-reorder-num">#' + (idx + 1) + '</span>' +
                '<span class="admin-cat-card__ico" style="width:32px;height:32px"><iconify-icon icon="ph:' + u.esc(c.icone || 'cookie') + '" width="18" height="18"></iconify-icon></span>' +
                '<div style="min-width:0;flex:1"><strong style="font-size:14px">' + u.esc(c.nome) + '</strong>' + (c.ativo === false ? ' <span class="badge badge--hidden" style="font-size:10px;padding:2px 6px;margin-left:4px">Oculta</span>' : '') + '</div>' +
              '</div>' +
              '<div class="cat-reorder-item__right">' +
                '<select class="form-control cat-pos-select" data-select-idx="' + idx + '" style="width:auto;min-height:36px;padding:4px 10px;font-size:13px">' + opts + '</select>' +
                '<div class="btn-group-order">' +
                  '<button type="button" class="btn btn--outline btn--sm" data-reorder-btn="' + idx + '" data-dir="-1" title="Mover para cima" ' + (isFirst ? 'disabled' : '') + ' style="padding:6px 10px"><iconify-icon icon="ph:arrow-up" width="14" height="14"></iconify-icon></button>' +
                  '<button type="button" class="btn btn--outline btn--sm" data-reorder-btn="' + idx + '" data-dir="1" title="Mover para baixo" ' + (isLast ? 'disabled' : '') + ' style="padding:6px 10px"><iconify-icon icon="ph:arrow-down" width="14" height="14"></iconify-icon></button>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('');
      }

      var modalHtml =
        '<div class="modal-section" style="padding:16px">' +
          '<h4><iconify-icon icon="ph:arrows-down-up" width="16" height="16"></iconify-icon> Ordem de exibição na loja</h4>' +
          '<p class="form-hint" style="margin-bottom:14px">Escolha a posição numérica ou use as setas para definir a sequência. A categoria no topo (1ª) é a primeira que aparece para o cliente na vitrine.</p>' +
          '<div id="cat-reorder-list" class="cat-reorder-list">' + gerarListaReordenar(cats) + '</div>' +
        '</div>';

      abrirModal('Organizar ordem das categorias', modalHtml,
        '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button>' +
        '<button type="button" class="btn btn--primary" id="btn-salvar-reordem"><iconify-icon icon="ph:check" width="16" height="16"></iconify-icon> Salvar ordem</button>'
      );

      function bindReorderEvents() {
        var listContainer = document.getElementById('cat-reorder-list');
        if (!listContainer) return;
        listContainer.innerHTML = gerarListaReordenar(cats);

        listContainer.querySelectorAll('[data-reorder-btn]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var cur = parseInt(btn.getAttribute('data-reorder-btn'), 10);
            var dir = parseInt(btn.getAttribute('data-dir'), 10);
            var target = cur + dir;
            if (target < 0 || target >= cats.length) return;
            var item = cats.splice(cur, 1)[0];
            cats.splice(target, 0, item);
            bindReorderEvents();
          });
        });

        listContainer.querySelectorAll('.cat-pos-select').forEach(function (sel) {
          sel.addEventListener('change', function () {
            var fromIdx = parseInt(sel.getAttribute('data-select-idx'), 10);
            var toIdx = parseInt(sel.value, 10);
            if (fromIdx === toIdx) return;
            var item = cats.splice(fromIdx, 1)[0];
            cats.splice(toIdx, 0, item);
            bindReorderEvents();
          });
        });
      }

      bindReorderEvents();

      var btnSalvar = modalOverlay.querySelector('#btn-salvar-reordem');
      if (btnSalvar) {
        btnSalvar.addEventListener('click', function () {
          var ov = lerOverrides();
          ov.categorias = cats;
          salvar(ov);
          fecharModal();
          SS.ui.toast('Ordem das categorias salva com sucesso!', 'success');
          renderCategorias();
        });
      }
      modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
    }

    function renderCategorias() {
    var grid = document.getElementById('tabela-categorias');
    var cats = db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias();
    var todosProds = db.getProdutosTodos ? db.getProdutosTodos() : [];
    if (!cats.length) {
      grid.innerHTML = '<div class="section-state" style="grid-column:1/-1"><span class="section-state__ico"><iconify-icon icon="ph:folder" width="32" height="32"></iconify-icon></span><p><strong>Nenhuma categoria.</strong></p><p class="section-state__sub">Crie a primeira categoria para organizar seus produtos.</p></div>';
      return;
    }
    grid.innerHTML = cats.map(function (c, idx) {
      var count = todosProds.filter(function (p) {
        if (p._excluido) return false;
        if (Array.isArray(p.categorias) && p.categorias.length) return p.categorias.indexOf(c.id) !== -1;
        if (p.categoria === c.id) return true;
        return false;
      }).length;
      var visivel = c.ativo !== false;
      var isFirst = idx === 0;
      var isLast = idx === cats.length - 1;
      return (
        '<article class="admin-cat-card' + (visivel ? '' : ' is-oculta') + '" data-catid="' + u.esc(c.id) + '">' +
          '<div class="admin-cat-card__header">' +
            '<div class="admin-cat-card__main">' +
              '<span class="admin-cat-card__ico"><iconify-icon icon="ph:' + u.esc(c.icone || 'cookie') + '" width="22" height="22"></iconify-icon></span>' +
              '<div class="admin-cat-card__info">' +
                '<h4 class="admin-cat-card__name">' + u.esc(c.nome) + '</h4>' +
                '<span class="admin-cat-card__slug">#' + u.esc(c.id) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="admin-cat-card__order-box" title="Posição na vitrine da loja">' +
              '<span class="cat-pos-tag">' + (idx + 1) + 'º</span>' +
              '<div class="cat-order-arrows">' +
                '<button type="button" class="btn-order-arrow" data-movecat="' + u.esc(c.id) + '" data-dir="-1" title="Subir na vitrine" ' + (isFirst ? 'disabled' : '') + '><iconify-icon icon="ph:caret-up-bold" width="13" height="13"></iconify-icon></button>' +
                '<button type="button" class="btn-order-arrow" data-movecat="' + u.esc(c.id) + '" data-dir="1" title="Descer na vitrine" ' + (isLast ? 'disabled' : '') + '><iconify-icon icon="ph:caret-down-bold" width="13" height="13"></iconify-icon></button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          (c.descricao ? '<p class="admin-cat-card__desc">' + u.esc(c.descricao) + '</p>' : '<p class="admin-cat-card__desc" style="color:var(--muted);font-style:italic">Sem descrição cadastrada</p>') +
          '<div class="admin-cat-card__status-line">' +
            '<span class="cat-status-dot ' + (visivel ? 'is-active' : 'is-inactive') + '"></span>' +
            '<span class="cat-status-text">' + (visivel ? 'Visível na vitrine' : 'Oculta da vitrine') + '</span>' +
            '<span class="cat-status-sep">•</span>' +
            '<span class="cat-count-text">' + count + ' ' + (count === 1 ? 'produto' : 'produtos') + '</span>' +
          '</div>' +
          '<div class="admin-cat-card__actions">' +
            '<button type="button" class="btn-cat-act btn-cat-act--edit" data-editcat="' + u.esc(c.id) + '"><iconify-icon icon="ph:pencil-simple" width="14" height="14"></iconify-icon> Editar</button>' +
            '<button type="button" class="btn-cat-act btn-cat-act--vis' + (visivel ? '' : ' is-hidden') + '" data-actuscat="' + u.esc(c.id) + '"><iconify-icon icon="ph:' + (visivel ? 'eye-slash' : 'eye') + '" width="14" height="14"></iconify-icon> ' + (visivel ? 'Ocultar' : 'Mostrar') + '</button>' +
            '<button type="button" class="btn-cat-act btn-cat-act--del" data-delcat="' + u.esc(c.id) + '"><iconify-icon icon="ph:trash" width="14" height="14"></iconify-icon> Excluir</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    grid.querySelectorAll('[data-movecat]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-movecat');
        var dir = parseInt(btn.getAttribute('data-dir'), 10);
        moverCategoria(id, dir);
      });
    });

    grid.querySelectorAll('[data-editcat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-editcat');
        var cat = db.getCategoria(id);
        if (!cat) return;
        var allCats = db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias();
        var curIdx = 0;
        for (var ci = 0; ci < allCats.length; ci++) {
          if (allCats[ci].id === id) { curIdx = ci; break; }
        }
        var posOptions = allCats.map(function (_, i) {
          return '<option value="' + i + '"' + (i === curIdx ? ' selected' : '') + '>' + (i + 1) + 'ª posição' + (i === 0 ? ' (Primeira da vitrine)' : (i === allCats.length - 1 ? ' (Última da vitrine)' : '')) + '</option>';
        }).join('');

        abrirModal('Editar categoria',
          '<div class="modal-section"><h4><iconify-icon icon="ph:folder" width="16" height="16"></iconify-icon> Dados da categoria</h4>' +
          '<div class="form-group"><label class="form-label">Nome da categoria <span class="req">*</span></label><input class="form-control" id="cf-nome" value="' + u.esc(cat.nome) + '" placeholder="Ex.: Doces finos"><p class="form-hint">Como aparece na página inicial.</p></div>' +
          '<div class="form-group"><label class="form-label">Ícone</label>' + campoIcone(cat.icone) + '</div>' +
          '<div class="form-group mt-2"><label class="form-label">Descrição curta</label><input class="form-control" id="cf-desc" value="' + u.esc(cat.descricao || '') + '" placeholder="Ex.: Doces para presentear"></div></div>' +
          '<div class="modal-section"><h4><iconify-icon icon="ph:arrows-down-up" width="16" height="16"></iconify-icon> Posição na vitrine</h4>' +
          '<div class="form-group"><label class="form-label">Ordem de exibição</label><select class="form-control" id="cf-posicao">' + posOptions + '</select><p class="form-hint">Define se aparece antes ou depois das outras categorias na loja.</p></div></div>' +
          '<div class="modal-section"><h4><iconify-icon icon="ph:eye" width="16" height="16"></iconify-icon> Exibição</h4><label class="pf-check"><input type="checkbox" id="cf-ativo" ' + (cat.ativo !== false ? 'checked' : '') + '><span>Visível na página inicial</span></label><p class="form-hint mt-2">Desmarque para ocultar a seção inteira sem excluir os produtos.</p></div>',
          '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--primary" id="cf-salvar">Salvar categoria</button>');
        initCampoIcone();
        modalOverlay.querySelector('#cf-salvar').addEventListener('click', function () {
          var nome = document.getElementById('cf-nome').value.trim();
          if (!nome) { SS.ui.toast('Informe o nome.', 'error'); return; }
          var newPos = parseInt(document.getElementById('cf-posicao').value, 10);
          var cats = (db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias()).map(function (c) {
            if (c.id !== id) return Object.assign({}, c);
            return Object.assign({}, c, { nome: nome, icone: document.getElementById('cf-ico').value.trim() || c.icone, descricao: document.getElementById('cf-desc').value.trim(), ativo: document.getElementById('cf-ativo').checked });
          });

          // Reordena se a posição mudou
          if (!isNaN(newPos) && newPos >= 0 && newPos < cats.length) {
            var oldIdx = -1;
            for (var k = 0; k < cats.length; k++) {
              if (cats[k].id === id) { oldIdx = k; break; }
            }
            if (oldIdx !== -1 && oldIdx !== newPos) {
              var item = cats.splice(oldIdx, 1)[0];
              cats.splice(newPos, 0, item);
            }
          }

          var ov = lerOverrides();
          ov.categorias = cats;
          salvar(ov);
          fecharModal();
          SS.ui.toast('Categoria atualizada.', 'success');
          renderCategorias();
        });
        modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
      });
    });
    grid.querySelectorAll('[data-actuscat]').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-actuscat');
        var ov = lerOverrides();
        var cats = (ov.categorias && ov.categorias.length ? ov.categorias : db._base.categorias.slice()).map(function(c){
          return Object.assign({}, c);
        });
        var target = cats.filter(function(c){ return c.id===id; })[0];
        if (!target) {
          var baseCat = db.getCategoria(id);
          if (baseCat) { cats.push(Object.assign({}, baseCat)); target = cats[cats.length-1]; }
        }
        if (target) {
          target.ativo = target.ativo === false ? true : false;
          ov.categorias = cats;
          salvar(ov);
          SS.ui.toast(target.ativo ? 'Categoria visível na página inicial.' : 'Categoria ocultada da vitrine.', '');
          renderCategorias();
        }
      });
    });
    grid.querySelectorAll('[data-delcat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-delcat');
        var count = (db.getProdutosTodos ? db.getProdutosTodos() : []).filter(function(p){ return p.categoria===id && !p._excluido; }).length;
        var msg = count > 0
          ? '<p>Excluir a categoria <strong>' + u.esc(id) + '</strong> que possui <strong>' + count + ' produto(s)</strong>?</p><p class="text-sm text-muted mt-2">Os produtos ficarão <strong>sem categoria</strong> e ocultos da loja até serem reassociados a outra categoria no painel. Esta ação não pode ser desfeita.</p>'
          : '<p>Excluir a categoria <strong>' + u.esc(id) + '</strong>? Esta ação não pode ser desfeita.</p>';
        abrirModal('Excluir categoria', msg,
          '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--dark" data-confirmar>Excluir definitivamente</button>');
        modalOverlay.querySelector('[data-confirmar]').addEventListener('click', function () {
          var ov = lerOverrides();
          var cats = (ov.categorias && ov.categorias.length ? ov.categorias : db._base.categorias.slice()).filter(function (c) { return c.id !== id; });
          ov.categorias = cats;
          salvar(ov);
          fecharModal();
          SS.ui.toast('Categoria excluída. ' + (count? count + ' produto(s) ficaram sem categoria.' : ''), '');
          renderCategorias();
          renderProdutos(document.getElementById('busca-prod').value);
        });
        modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
      });
    });
  }

  var ICONE_PACKS = [
    { nome: 'Bolos & Doces', icones: ['cake', 'cookie', 'cherries', 'ice-cream', 'popsicle', 'popcorn'] },
    { nome: 'Mimos & Presentes', icones: ['gift', 'heart', 'hand-heart', 'sparkle', 'balloon', 'confetti'] },
    { nome: 'Sabores & Bebidas', icones: ['coffee', 'coffee-bean', 'tea-bag', 'pint-glass', 'bowl-food', 'cheese'] },
    { nome: 'Frutas & Natureza', icones: ['orange', 'avocado', 'leaf', 'flower', 'flower-tulip', 'butterfly'] },
    { nome: 'Festas & Magia', icones: ['crown', 'diamond', 'rainbow', 'star', 'moon-stars', 'magic-wand'] },
    { nome: 'Datas & Ocasiões', icones: ['calendar', 'clock', 'trophy', 'medal', 'campfire', 'fire'] }
  ];

  function campoIcone(valorAtual) {
    var atual = valorAtual || '';
    var html = '<input type="hidden" id="cf-ico" value="' + u.esc(atual) + '">';
    html += '<div class="ico-packs" id="cf-ico-packs">';
    ICONE_PACKS.forEach(function (pack) {
      html += '<div class="ico-pack"><div class="ico-pack__titulo">' + pack.nome + '</div><div class="ico-pack__grid">';
      pack.icones.forEach(function (ic) {
        var sel = ic === atual ? ' is-sel' : '';
        html += '<button type="button" class="ico-opt' + sel + '" data-ico="' + ic + '" title="' + ic + '"><iconify-icon icon="ph:' + ic + '" width="22" height="22"></iconify-icon></button>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function initCampoIcone() {
    var packs = document.getElementById('cf-ico-packs');
    var hidden = document.getElementById('cf-ico');
    if (!packs || !hidden) return;
    packs.querySelectorAll('.ico-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        packs.querySelectorAll('.ico-opt').forEach(function (x) { x.classList.remove('is-sel'); });
        b.classList.add('is-sel');
        hidden.value = b.getAttribute('data-ico');
      });
    });
  }

  function novaCategoria() {
    var todosProdutos = db.getProdutosTodos ? db.getProdutosTodos() : [];
    var prodsVisiveis = todosProdutos.filter(function(p){ return !p._excluido; });
    var stepHtml =
      '<div class="pf-steps-indicator"><div class="pf-step-dot active" data-sdot="1"><span>1</span><small>Identificação</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="2"><span>2</span><small>Produtos</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="3"><span>3</span><small>Exibição</small></div></div>' +
      '<div class="pf-step" data-step="1"><div class="modal-section"><h4><iconify-icon icon="ph:folder-plus" width="16" height="16"></iconify-icon> Identificação</h4>' +
      '<div class="form-group"><label class="form-label">Nome da categoria <span class="req">*</span></label><input class="form-control" id="cf-nome" placeholder="Ex.: Doces finos"><p class="form-hint">Crie um nome claro — ele vira o título da seção na home e no painel.</p></div>' +
      '<div class="form-group"><label class="form-label">Ícone</label>' + campoIcone('') + '</div>' +
      '<div class="form-group mt-2"><label class="form-label">Descrição curta</label><input class="form-control" id="cf-desc" placeholder="Ex.: Doces para presentear"><p class="form-hint">Frase que aparece abaixo do título da seção.</p></div></div></div>' +
      '<div class="pf-step hidden" data-step="2"><div class="modal-section"><h4><iconify-icon icon="ph:package" width="16" height="16"></iconify-icon> Produtos nesta categoria <span style="font-weight:400;color:var(--muted)">(opcional)</span></h4>' +
      '<p class="form-hint" style="margin-bottom:10px">Selecione produtos já existentes para já nascerem nesta categoria. Você também pode associar um produto a várias categorias depois, em <em>Editar produto</em>.</p>' +
      '<div class="form-group" style="margin-bottom:10px"><input class="form-control" id="cf-prod-busca" type="search" placeholder="Buscar produto por nome…"></div>' +
      '<div id="cf-prod-list" class="pf-cat-prod-list"></div>' +
      '<p class="form-hint mt-2"><span id="cf-prod-count">0</span> produto(s) selecionado(s) — ficarão com esta nova categoria além das atuais.</p></div></div>' +
      '<div class="pf-step hidden" data-step="3"><div class="modal-section"><h4><iconify-icon icon="ph:eye" width="16" height="16"></iconify-icon> Exibição</h4><label class="pf-check"><input type="checkbox" id="cf-ativo" checked><span>Visível na página inicial</span></label><p class="form-hint mt-2">Desmarque para criar oculta e só mostrar quando quiser.</p></div><div class="modal-section" style="background:var(--pistachio-soft);border-color:rgba(127,176,105,0.22)"><h4 style="color:#2f4a20"><iconify-icon icon="ph:check-circle" width="16" height="16"></iconify-icon> Revisão</h4><div id="cf-resumo" class="text-sm text-muted">Preencha o nome para ver o resumo.</div></div></div>';
    abrirModal('Nova categoria', stepHtml, '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--outline" id="cf-voltar" style="display:none">Voltar</button><button type="button" class="btn btn--primary" id="cf-avancar">Avançar</button><button type="button" class="btn btn--primary" id="cf-salvar" style="display:none">Criar categoria</button>');
    initCampoIcone();
    var curStepCat = 1;
    var totalStepsCat = 3;
    var selecionados = {};
    var btnAvCat = document.getElementById('cf-avancar');
    var btnVolCat = document.getElementById('cf-voltar');
    var btnSaveCat = document.getElementById('cf-salvar');
    var buscaProdCat = document.getElementById('cf-prod-busca');
    var listaProdCat = document.getElementById('cf-prod-list');
    function catsDeProdLocalCat(prod){
      if (db.getCategoriasDeProduto) return db.getCategoriasDeProduto(prod);
      if (Array.isArray(prod.categorias) && prod.categorias.length) return prod.categorias;
      if (Array.isArray(prod.categoria)) return prod.categoria;
      if (prod.categoria) return [String(prod.categoria)];
      return [];
    }
    function renderProdListCat(filtro){
      filtro = (filtro||'').toLowerCase();
      var filtrados = prodsVisiveis.filter(function(p){
        if (!filtro) return true;
        return (p.nome + ' ' + (p.descricaoCurta||'') + ' ' + (p.descricao||'')).toLowerCase().indexOf(filtro)!==-1;
      });
      if (!filtrados.length) {
        listaProdCat.innerHTML = '<p class="text-sm text-muted" style="padding:12px;text-align:center">Nenhum produto encontrado.</p>';
        return;
      }
      listaProdCat.innerHTML = filtrados.map(function(p){
        var catsProd = catsDeProdLocalCat(p).map(function(cid){ return db.getCategoriaNome(cid)||cid; }).join(', ') || 'Sem categoria';
        var checked = selecionados[p.id] ? ' checked' : '';
        var precoTxt = p.preco==null ? 'Sob consulta' : u.fmtBRL(p.preco);
        var thumb = p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="" style="width:42px;height:42px;border-radius:10px;object-fit:cover;flex-shrink:0">' : '<div style="width:42px;height:42px;border-radius:10px;background:var(--rose-50);display:grid;place-items:center;flex-shrink:0"><iconify-icon icon="ph:image" width="18" height="18"></iconify-icon></div>';
        return '<label class="pf-prod-check' + (checked?' is-checked':'') + '"><input type="checkbox" value="' + u.esc(p.id) + '"' + checked + '><div style="display:flex;gap:10px;align-items:center;flex:1;min-width:0;overflow:hidden">' + thumb + '<div style="min-width:0;flex:1;overflow:hidden"><div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + u.esc(p.nome) + '</div><div class="text-sm text-muted" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + u.esc(catsProd) + ' · ' + precoTxt + '</div></div></div></label>';
      }).join('');
      listaProdCat.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
        cb.addEventListener('change', function(){
          if (cb.checked) selecionados[cb.value]=true; else delete selecionados[cb.value];
          cb.closest('.pf-prod-check').classList.toggle('is-checked', cb.checked);
          document.getElementById('cf-prod-count').textContent = Object.keys(selecionados).length;
          atualizarResumoCat();
        });
      });
    }
    function atualizarResumoCat(){
      var nome = document.getElementById('cf-nome').value.trim() || '<em>Sem nome</em>';
      var desc = document.getElementById('cf-desc').value.trim() || '—';
      var ico = document.getElementById('cf-ico').value.trim() || 'cookie';
      var nSel = Object.keys(selecionados).length;
      var vis = document.getElementById('cf-ativo').checked ? 'Visível' : 'Oculta';
      document.getElementById('cf-resumo').innerHTML = '<div style="display:flex;gap:10px;align-items:center"><span style="width:36px;height:36px;border-radius:10px;background:var(--rose-50);display:grid;place-items:center;color:var(--terra)"><iconify-icon icon="ph:' + u.esc(ico) + '" width="20" height="20"></iconify-icon></span><div><div style="font-weight:800">' + u.esc(nome) + '</div><div class="text-sm text-muted">' + u.esc(desc) + ' · ' + vis + ' · ' + nSel + ' produto(s)</div></div></div>';
    }
    function showStepCat(n){
      curStepCat=n;
      modalOverlay.querySelectorAll('.pf-step').forEach(function(s){ s.classList.toggle('hidden', Number(s.getAttribute('data-step'))!==n); });
      modalOverlay.querySelectorAll('.pf-step-dot').forEach(function(d){ var sn=Number(d.getAttribute('data-sdot')); d.classList.toggle('active', sn===n); d.classList.toggle('done', sn<n); });
      if (btnVolCat) btnVolCat.style.display = n===1 ? 'none' : 'inline-flex';
      if (btnAvCat) btnAvCat.style.display = n===totalStepsCat ? 'none' : 'inline-flex';
      if (btnSaveCat) btnSaveCat.style.display = n===totalStepsCat ? 'inline-flex' : 'none';
      var body = modalOverlay.querySelector('#modal-body'); if(body) body.scrollTop=0;
      if (n===2 && !listaProdCat.innerHTML) renderProdListCat('');
      if (n===3) atualizarResumoCat();
    }
    function validarStepCat(n){
      if (n===1){
        var nm=document.getElementById('cf-nome').value.trim();
        if(!nm){ SS.ui.toast('Informe o nome da categoria.', 'error'); return false; }
        var idTmp=u.slugify(nm);
        var catsTmp=db.getCategoriasTodas?db.getCategoriasTodas():db.getCategorias();
        if(catsTmp.some(function(c){return c.id===idTmp;})){ SS.ui.toast('Já existe categoria com este nome/slug.', 'error'); return false; }
      }
      return true;
    }
    if (buscaProdCat) buscaProdCat.addEventListener('input', u.debounce(function(){ renderProdListCat(buscaProdCat.value); }, 200));
    var cfNomeEl=document.getElementById('cf-nome');
    var cfDescEl=document.getElementById('cf-desc');
    if (cfNomeEl) cfNomeEl.addEventListener('input', atualizarResumoCat);
    if (cfDescEl) cfDescEl.addEventListener('input', atualizarResumoCat);
    var cfAtivoEl=document.getElementById('cf-ativo');
    if (cfAtivoEl) cfAtivoEl.addEventListener('change', atualizarResumoCat);
    if (btnAvCat) btnAvCat.addEventListener('click', function(){ if(!validarStepCat(curStepCat)) return; if(curStepCat<totalStepsCat) showStepCat(curStepCat+1); });
    if (btnVolCat) btnVolCat.addEventListener('click', function(){ if(curStepCat>1) showStepCat(curStepCat-1); });
    showStepCat(1);
    renderProdListCat('');
    modalOverlay.querySelector('#cf-salvar').addEventListener('click', function () {
      if(!validarStepCat(1)) { showStepCat(1); return; }
      var nome = document.getElementById('cf-nome').value.trim();
      if (!nome) { SS.ui.toast('Informe o nome da categoria.', 'error'); return; }
      var id = u.slugify(nome);
      var ov = lerOverrides();
      var cats = db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias();
      if (cats.some(function (c) { return c.id === id; })) { SS.ui.toast('Já existe categoria com este nome/slug.', 'error'); return; }
      var nova = { id: id, nome: nome, icone: document.getElementById('cf-ico').value.trim() || 'cookie', descricao: document.getElementById('cf-desc').value.trim(), imagem: cats[0] ? cats[0].imagem : '', ativo: document.getElementById('cf-ativo').checked };
      ov.categorias = cats.concat([nova]);
      var selIds = Object.keys(selecionados);
      if (selIds.length) {
        selIds.forEach(function(pid){
          var baseProd = db._base.produtos.filter(function(pr){ return pr.id===pid; })[0];
          var ovProd = ov.produtos[pid] || {};
          var curProd = Object.assign({}, baseProd || {}, ovProd);
          var curCats = (function(){
            if (db.getCategoriasDeProduto) return db.getCategoriasDeProduto(curProd);
            if (Array.isArray(curProd.categorias) && curProd.categorias.length) return curProd.categorias.slice();
            if (Array.isArray(curProd.categoria)) return curProd.categoria.slice();
            if (curProd.categoria) return [String(curProd.categoria)];
            return [];
          })();
          if (curCats.indexOf(id)===-1) curCats.push(id);
          ov.produtos[pid] = Object.assign({}, ovProd, { categorias: curCats, categoria: curCats[0] });
          if (baseProd) ov.produtos[pid].id = pid;
        });
      }
      salvar(ov);
      fecharModal();
      SS.ui.toast(selIds.length ? 'Categoria criada com ' + selIds.length + ' produto(s) vinculado(s).' : 'Categoria criada.', '');
      renderCategorias();
      renderProdutos(document.getElementById('busca-prod').value);
    });
    modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
  }

  function popularConfig() {
    var ov = lerOverrides().configuracoes || {};
    var g = function (id, valor) {
      var el = document.getElementById(id);
      if (el) {
        el.value = valor;
        el.dispatchEvent(new Event('change', {bubbles:true}));
        var wrapper = el.closest && el.closest('.custom-select');
        if(wrapper){
          var lbl = wrapper.querySelector('.custom-select__label');
          var opt = el.options[el.selectedIndex];
          if(lbl && opt) lbl.textContent = opt.textContent.trim();
        }
      }
    };
    g('cfg-wa', ov.whatsappNumero || cfg.whatsapp.numero);
    g('cfg-link', ov.linkComercial || cfg.whatsapp.linkComercial);
    g('cfg-ig', ov.instagram || cfg.social.instagram);
    g('cfg-igu', ov.instagramUsuario || cfg.social.instagramUsuario);
    g('cfg-area', ov.area || cfg.loja.area);
    g('cfg-cidade', ov.cidade || cfg.loja.cidade);
    g('cfg-end', ov.endereco !== undefined ? ov.endereco : cfg.loja.endereco);
    g('cfg-horario', ov.horario || cfg.loja.horario);
    g('cfg-ant', ov.antecedenciaMinimaDias !== undefined ? ov.antecedenciaMinimaDias : cfg.loja.antecedenciaMinimaDias);
    g('cfg-ent-modo', ov.entregaModo || cfg.loja.entrega.modo);
    g('cfg-taxa', ov.taxaEntrega !== undefined ? ov.taxaEntrega : cfg.loja.entrega.taxaEntrega);
    var bairrosFonte = ov.taxasBairro || cfg.loja.entrega.taxasBairro;
    var bairros = Object.keys(bairrosFonte).map(function (k) { return k + ';' + String(bairrosFonte[k]).replace('.', ','); }).join('\n');
    g('cfg-bairros', bairros);
    renderBairroList();
    g('cfg-ent-nota', ov.notaEntrega || cfg.loja.entrega.nota);
    g('cfg-ent-info', ov.informacoesEntrega || cfg.loja.entrega.informacoes);
    var metodosAtuais = ov.pagamentoMetodos || cfg.loja.pagamento.metodos.map(function (m) { return m.nome; });
    var padrao = ['PIX','Cartão de crédito','Cartão de débito','Dinheiro','Link de pagamento','Outro (combinar com a loja)'];
    document.querySelectorAll('#pg-methods [data-pg]').forEach(function(cb){
      cb.checked = metodosAtuais.indexOf(cb.value) !== -1;
    });
    var outros = metodosAtuais.filter(function(m){ return padrao.indexOf(m)===-1; });
    g('cfg-pg-outros', outros.join(', '));
    g('cfg-pg-metodos', metodosAtuais.join(', '));
    toggleTaxaFields();
  }

  /* ------------------------------------------------------------------ */
  /* PIX — configuração da chave da loja                                  */
  /* ------------------------------------------------------------------ */
  function popularPixConfig() {
    var ov = lerOverrides().configuracoes || {};
    var cfgPix = SS.config.loja.pix || {};
    var tipo = ov.pixTipo || cfgPix.tipo || 'ALEATORIA';
    var chave = ov.pixChave !== undefined ? ov.pixChave : (cfgPix.chave || '');
    var nome = ov.pixNome || cfgPix.nome || 'Sublime Sonhos';
    var cidade = ov.pixCidade || cfgPix.cidade || 'Aurelino Leal';
    var expira = ov.pixExpira || cfgPix.expiraMinutos || 30;
    var msg = ov.pixMensagem !== undefined ? ov.pixMensagem : (cfgPix.mensagem || '');
    var g = function(id,v){
      var el=document.getElementById(id);
      if(el){
        el.value=v;
        // dispara change para que custom-select atualize o label (ui.js escuta change)
        el.dispatchEvent(new Event('change', {bubbles:true}));
        // fallback caso custom-select ainda não tenha convertido: força label direto
        var wrapper = el.closest && el.closest('.custom-select');
        if(wrapper){
          var lbl = wrapper.querySelector('.custom-select__label');
          var opt = el.options[el.selectedIndex];
          if(lbl && opt) lbl.textContent = opt.textContent.trim();
        }
      }
    };
    g('cfg-pix-tipo', tipo);
    g('cfg-pix-chave', chave);
    g('cfg-pix-nome', nome);
    g('cfg-pix-cidade', cidade);
    g('cfg-pix-expira', expira);
    g('cfg-pix-msg', msg);
    atualizarHintPix();
    // badge se não configurado
    var st=document.getElementById('pix-status');
    if(st){
      if(!chave) st.textContent='⚠ Pix ainda não configurado — clientes não verão QR Code até você salvar.';
      else st.textContent='';
      st.style.color = !chave ? 'var(--danger)' : 'var(--success)';
    }
  }
  function atualizarHintPix(){
    var tipoEl=document.getElementById('cfg-pix-tipo');
    var chaveEl=document.getElementById('cfg-pix-chave');
    var hint=document.getElementById('pix-chave-hint');
    var err=document.getElementById('pix-chave-err');
    if(!tipoEl||!chaveEl||!hint) return;
    var tipo=tipoEl.value;
    var dicas={
      'CPF':'Digite 11 dígitos (apenas números). Ex.: 12345678909',
      'CNPJ':'Digite 14 dígitos (apenas números). Ex.: 12345678000190',
      'TELEFONE':'Digite com DDD (10 ou 11 dígitos). Ex.: 73981756809 — será salvo como +55...',
      'EMAIL':'Digite seu e-mail. Ex.: sua@loja.com',
      'ALEATORIA':'Cole o UUID da chave aleatória. Ex.: 123e4567-e89b-12d3-a456-426614174000'
    };
    hint.textContent=dicas[tipo]||'';
    if(err) err.style.display='none';
    chaveEl.classList.remove('invalid');
    if(chaveEl.value){
      var v = SS.pix ? SS.pix.validarChave(tipo, chaveEl.value) : {ok:true};
      if(!v.ok){
        if(err){ err.textContent=v.erro; err.style.display='block'; }
        chaveEl.classList.add('invalid');
      } else {
        hint.textContent += '  ✓ ' + SS.pix.mascaraPreview(tipo, chaveEl.value);
        hint.style.color='var(--success)';
      }
    } else {
      hint.style.color='var(--muted)';
    }
  }
  function salvarPixConfig(e){
    if(e) e.preventDefault();
    var tipo=document.getElementById('cfg-pix-tipo').value;
    var chave=document.getElementById('cfg-pix-chave').value.trim();
    var nome=document.getElementById('cfg-pix-nome').value.trim() || 'Sublime Sonhos';
    var cidade=document.getElementById('cfg-pix-cidade').value.trim() || 'Aurelino Leal';
    var expira=Math.max(5, Math.min(1440, Number(document.getElementById('cfg-pix-expira').value)||30));
    var msg=document.getElementById('cfg-pix-msg').value.trim();
    // validação
    if(!chave){
      SS.ui.toast('Informe sua chave Pix.', 'error');
      document.getElementById('cfg-pix-chave').focus();
      document.getElementById('pix-chave-err').textContent='Informe a chave Pix.';
      document.getElementById('pix-chave-err').style.display='block';
      return;
    }
    var val = SS.pix.validarChave(tipo, chave);
    if(!val.ok){
      SS.ui.toast(val.erro, 'error');
      var err=document.getElementById('pix-chave-err');
      if(err){ err.textContent=val.erro; err.style.display='block'; }
      document.getElementById('cfg-pix-chave').classList.add('invalid');
      return;
    }
    var ov=lerOverrides();
    if(!ov.configuracoes) ov.configuracoes={};
    ov.configuracoes.pixTipo=tipo;
    ov.configuracoes.pixChave= val.normalizada || chave;
    ov.configuracoes.pixNome=nome.slice(0,25);
    ov.configuracoes.pixCidade=cidade.slice(0,15);
    ov.configuracoes.pixExpira=expira;
    ov.configuracoes.pixMensagem=msg.slice(0,35);
    salvar(ov);
    SS.catalog.db.aplicarConfiguracoes();
    var st=document.getElementById('pix-status');
    if(st){ st.textContent='✓ Pix salvo às '+ new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'. QR Code já usa esta chave.'; st.style.color='var(--success)'; }
    SS.ui.toast('Chave Pix salva com sucesso!', 'success');
    popularPixConfig();
  }
  function testarPix(){
    var tipo=document.getElementById('cfg-pix-tipo').value;
    var chave=document.getElementById('cfg-pix-chave').value.trim();
    if(!chave){
      SS.ui.toast('Salve primeiro sua chave Pix.', 'error');
      return;
    }
    var val=SS.pix.validarChave(tipo, chave);
    if(!val.ok){ SS.ui.toast(val.erro,'error'); return; }
    var nome=document.getElementById('cfg-pix-nome').value.trim()||'Sublime Sonhos';
    var cidade=document.getElementById('cfg-pix-cidade').value.trim()||'Aurelino Leal';
    var chaveNorm = val.normalizada;
    // mantém "+" para telefone (E.164). Não remove.
    var payload=SS.pix.gerarPayloadPix({ chave: chaveNorm, nome: nome, cidade: cidade, valor: 10.50, txid: SS.pix.gerarTxid('TESTE') });
    var url=SS.pix.qrImageUrl(payload, 260);
    var area=document.getElementById('pix-teste-area');
    if(!area) return;
    area.classList.remove('hidden');
    area.innerHTML=
      '<div style="display:grid;grid-template-columns:140px 1fr;gap:16px;align-items:start">'+
        '<div style="text-align:center"><img src="'+url+'" alt="QR Pix teste" style="width:140px;height:140px;border-radius:12px;border:1px solid var(--line);background:#fff;padding:6px"><div class="text-sm text-muted mt-1">R$ 10,50 · TXID teste</div></div>'+
        '<div><div style="font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">Pix copia e cola (teste)</div><div style="font-family:ui-monospace,monospace;font-size:11px;word-break:break-all;background:var(--sand-3);border:1px solid var(--line);border-radius:10px;padding:10px;max-height:110px;overflow:auto;margin-top:6px">'+u.esc(payload)+'</div><button type="button" class="btn btn--outline btn--sm mt-2" id="pix-teste-copiar"><iconify-icon icon="ph:copy" width="14" height="14"></iconify-icon> Copiar código</button><p class="text-sm text-muted mt-2">Chave: <strong>'+u.esc(chave)+'</strong> ('+u.esc(tipo)+') · Recebedor: '+u.esc(nome)+' · '+u.esc(cidade)+'</p></div>'+
      '</div>';
    var btn=area.querySelector('#pix-teste-copiar');
    if(btn) btn.addEventListener('click', function(){
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(payload).then(function(){ SS.ui.toast('Código Pix copiado!','success'); });
      else {
        var ta=document.createElement('textarea'); ta.value=payload; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); SS.ui.toast('Código Pix copiado!','success'); }catch(e){ SS.ui.toast('Copie manualmente.','error'); }
        document.body.removeChild(ta);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* TABELA DE PAGAMENTOS PIX (admin)                                     */
  /* ------------------------------------------------------------------ */
  function renderTabelaPix(){
    var wrap=document.getElementById('tabela-pix-pagamentos');
    if(!wrap) return;
    if(!SS.pix){ wrap.innerHTML='<p class="text-sm text-muted">Módulo Pix não carregado.</p>'; return; }
    var filtro=document.getElementById('filtro-pix-status');
    var statusVal= filtro ? filtro.value : '';
    var lista= SS.pix.listarPagamentos(statusVal ? {status:statusVal}: null);
    if(!lista.length){
      wrap.innerHTML='<div class="section-state" style="padding:26px"><span class="section-state__ico"><iconify-icon icon="ph:qr-code" width="28" height="28"></iconify-icon></span><p><strong>Nenhum pagamento Pix '+ (statusVal ? '('+statusVal+')' : '') +' ainda.</strong></p><p class="section-state__sub">Quando um cliente gerar um QR Code no checkout, ele aparece aqui. Você confirma manualmente após ver o valor na conta.</p></div>';
      return;
    }
    wrap.innerHTML= lista.map(function(p){
      var tr=SS.pix.tempoRestante(p);
      var badgeClass={
        'pendente':'badge--gold',
        'aguardando_confirmacao':'badge badge--visible',
        'pago':'badge badge--visible',
        'expirado':'badge badge--hidden',
        'cancelado':'badge badge--hidden'
      };
      var badgeLabel={
        'pendente':'Pendente',
        'aguardando_confirmacao':'Aguard. confirmação',
        'pago':'Pago',
        'expirado':'Expirado',
        'cancelado':'Cancelado'
      };
      var statusBadge='<span class="badge '+(badgeClass[p.status]||'badge--gold')+'">'+(badgeLabel[p.status]||p.status)+'</span>';
      var valorTxt= p.valor!==null && p.valor!==undefined ? u.fmtBRL(p.valor) : 'Valor a confirmar';
      var tempoTxt= p.status==='pendente' ? (tr.expirado ? '<span style="color:var(--danger);font-weight:700">Expirado</span>' : '<span style="font-weight:700">'+tr.txt+'</span> restantes') : '';
      var criado=new Date(p.criadoEm).toLocaleString('pt-BR');
      var acoes='';
      if(p.status==='pendente' || p.status==='aguardando_confirmacao'){
        acoes='<button type="button" class="a-edit" data-pix-confirm="'+p.id+'"><iconify-icon icon="ph:check-circle" width="14" height="14"></iconify-icon> Confirmar pago</button><button type="button" class="a-del" data-pix-cancel="'+p.id+'">Recusar</button>';
      } else if(p.status==='pago'){
        acoes='<span class="text-sm" style="color:var(--success);font-weight:700">✓ Confirmado</span>';
      } else {
        acoes='<button type="button" class="a-del" data-pix-del="'+p.id+'">Remover</button>';
      }
      return (
        '<div class="admin-card" style="flex-direction:column;padding:14px;gap:10px">'+
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between"><div style="display:flex;gap:10px;align-items:center"><span style="width:38px;height:38px;border-radius:10px;background:var(--rose-50);display:grid;place-items:center;color:var(--terra-dark)"><iconify-icon icon="ph:qr-code" width="18" height="18"></iconify-icon></span><div><div style="font-weight:800;font-size:14px">'+u.esc(p.origem)+' · #'+u.esc(p.pedidoNumero)+' · '+valorTxt+'</div><div class="text-sm text-muted" style="font-size:11px">TXID '+u.esc(p.txid)+' · '+criado+ (tempoTxt ? ' · '+tempoTxt : '')+' · verificações: '+(p.verificacoes||0)+'</div><div class="text-sm text-muted" style="font-size:11px">Chave: '+u.esc(p.chave)+' ('+u.esc(p.tipoChave)+')</div></div></div>'+statusBadge+'</div>'+
          '<div style="font-family:ui-monospace,monospace;font-size:10.5px;word-break:break-all;background:#fffdf9;border:1px solid var(--line);border-radius:10px;padding:8px;max-height:64px;overflow:auto">'+u.esc(p.payload)+'</div>'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" class="btn btn--outline btn--sm" data-pix-copy="'+p.id+'"><iconify-icon icon="ph:copy" width="14" height="14"></iconify-icon> Copiar código</button>'+acoes+'<span class="text-sm text-muted" style="margin-left:auto;font-size:11px">'+(p.comprovanteEnviado? 'Cliente clicou em “Já paguei”' : 'Aguardando ação do cliente')+'</span></div>'+
        '</div>'
      );
    }).join('');
    // binds
    wrap.querySelectorAll('[data-pix-confirm]').forEach(function(b){
      b.addEventListener('click', function(){
        var id=b.getAttribute('data-pix-confirm');
        SS.pix.confirmarPagamentoManual(id);
        SS.ui.toast('Pagamento confirmado como PAGO.', 'success');
        renderTabelaPix();
      });
    });
    wrap.querySelectorAll('[data-pix-cancel]').forEach(function(b){
      b.addEventListener('click', function(){
        var id=b.getAttribute('data-pix-cancel');
        if(confirm('Recusar este Pix?')){ SS.pix.rejeitarPagamento(id,'Recusado pela loja'); SS.ui.toast('Pagamento recusado.',''); renderTabelaPix(); }
      });
    });
    wrap.querySelectorAll('[data-pix-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var id=b.getAttribute('data-pix-del');
        try{
          var raw=localStorage.getItem(SS.pix.STORAGE_PAGAMENTOS);
          var arr= raw ? JSON.parse(raw) : [];
          arr=arr.filter(function(p){ return p.id!==id; });
          localStorage.setItem(SS.pix.STORAGE_PAGAMENTOS, JSON.stringify(arr));
        }catch(e){}
        renderTabelaPix();
      });
    });
    wrap.querySelectorAll('[data-pix-copy]').forEach(function(b){
      b.addEventListener('click', function(){
        var id=b.getAttribute('data-pix-copy');
        var pg=SS.pix.getPagamento(id);
        if(!pg) return;
        if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(pg.payload).then(function(){ SS.ui.toast('Código copiado!','success'); });
        else { var ta=document.createElement('textarea'); ta.value=pg.payload; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); SS.ui.toast('Código copiado!','success'); }catch(e){} document.body.removeChild(ta); }
      });
    });
  }

  function toggleTaxaFields() {
    var modo = document.getElementById('cfg-ent-modo').value;
    document.getElementById('cfg-taxa-wrap').classList.toggle('hidden', modo !== 'fixa');
    document.getElementById('cfg-bairros-wrap').classList.toggle('hidden', modo !== 'bairro');
    document.querySelectorAll('.entrega-modo-card').forEach(function(card){
      var r = card.querySelector('input[type="radio"]');
      if (r) {
        r.checked = r.value === modo;
        card.classList.toggle('is-selected', r.checked);
      }
    });
  }
  function syncEntregaModoCards() {
    document.querySelectorAll('.entrega-modo-card').forEach(function(card){
      card.addEventListener('click', function(e){
        if (e.target.closest('input')) return;
        var r = card.querySelector('input[type="radio"]');
        if (r) { r.checked = true; document.getElementById('cfg-ent-modo').value = r.value; document.getElementById('cfg-ent-modo').dispatchEvent(new Event('change', {bubbles:true})); }
      });
      var r2 = card.querySelector('input[type="radio"]');
      if (r2) r2.addEventListener('change', function(){
        document.getElementById('cfg-ent-modo').value = r2.value;
        toggleTaxaFields();
      });
    });
    var sel = document.getElementById('cfg-ent-modo');
    if (sel) sel.addEventListener('change', toggleTaxaFields);
  }
  function renderBairroList() {
    var wrap = document.getElementById('bairro-list');
    var ta = document.getElementById('cfg-bairros');
    if (!wrap || !ta) return;
    var linhas = ta.value.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
    var dados = linhas.map(function(l){
      var parts = l.split(';');
      return { bairro: (parts[0]||'').trim(), valor: (parts[1]||'').trim().replace('.', ',') };
    }).filter(function(o){ return o.bairro; });
    if (!dados.length) dados = [{ bairro: '', valor: '' }];
    wrap.innerHTML = dados.map(function(item, idx){
      return '<div class="bairro-row" data-idx="' + idx + '"><input class="form-control" data-bairro placeholder="Bairro ex.: Centro" value="' + u.esc(item.bairro) + '"><input class="form-control" data-valor placeholder="R$ 5,00" inputmode="decimal" value="' + u.esc(item.valor) + '"><button type="button" class="btn btn--outline btn--sm" data-rm-bairro style="width:36px;height:36px;padding:0;display:grid;place-items:center" title="Remover">×</button></div>';
    }).join('');
    function syncTextarea(){
      var rows = Array.prototype.slice.call(wrap.querySelectorAll('.bairro-row'));
      var out = rows.map(function(row){
        var b = row.querySelector('[data-bairro]').value.trim();
        var v = row.querySelector('[data-valor]').value.trim().replace(',', '.');
        if (!b) return '';
        var num = v ? (Math.round(Number(v)*100)/100).toFixed(2).replace('.', ',') : '';
        return b + (num ? ';' + num : '');
      }).filter(Boolean).join('\n');
      ta.value = out;
    }
    wrap.querySelectorAll('[data-bairro]').forEach(function(inp){
      inp.addEventListener('input', syncTextarea);
      inp.addEventListener('blur', function(){ inp.value = inp.value.trim(); syncTextarea(); });
    });
    wrap.querySelectorAll('[data-valor]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var v = inp.value.replace(/[^0-9,\.]/g, '').replace('.', ',');
        // formata simples
        inp.value = v;
        syncTextarea();
      });
      inp.addEventListener('blur', function(){
        var v = inp.value.trim().replace(',', '.');
        if (v && !isNaN(Number(v))) inp.value = Number(v).toFixed(2).replace('.', ',');
        syncTextarea();
      });
    });
    wrap.querySelectorAll('[data-rm-bairro]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var idx = Number(btn.closest('.bairro-row').getAttribute('data-idx'));
        var cur = ta.value.split('\n').filter(Boolean);
        cur.splice(idx, 1);
        ta.value = cur.join('\n');
        renderBairroList();
      });
    });
  }

  function salvarConfig(e) {
    e.preventDefault();
    var bairros = {};
    String(document.getElementById('cfg-bairros').value).split('\n').forEach(function (l) {
      var parts = l.split(';');
      if (parts.length >= 2 && parts[0].trim()) bairros[parts[0].trim().toLowerCase()] = Math.round(Number(parts[1].trim().replace(',', '.')) * 100) / 100;
    });
    var ovPrev = lerOverrides().configuracoes || {};
    var ov = lerOverrides();
    ov.configuracoes = {
      whatsappNumero: u.apenasDigitos(document.getElementById('cfg-wa').value),
      linkComercial: document.getElementById('cfg-link').value.trim(),
      instagram: document.getElementById('cfg-ig').value.trim(),
      instagramUsuario: document.getElementById('cfg-igu').value.trim(),
      area: document.getElementById('cfg-area').value.trim(),
      cidade: document.getElementById('cfg-cidade').value.trim(),
      endereco: document.getElementById('cfg-end').value.trim(),
      horario: document.getElementById('cfg-horario').value.trim(),
      antecedenciaMinimaDias: Math.max(0, Number(document.getElementById('cfg-ant').value) || 0),
      entregaModo: document.getElementById('cfg-ent-modo').value,
      taxaEntrega: Math.round(Number(document.getElementById('cfg-taxa').value.replace(',', '.')) * 100) / 100 || 0,
      taxasBairro: bairros,
      notaEntrega: document.getElementById('cfg-ent-nota').value.trim(),
      informacoesEntrega: document.getElementById('cfg-ent-info').value.trim(),
      pagamentoMetodos: (function(){
        var base = [];
        document.querySelectorAll('#pg-methods [data-pg]:checked').forEach(function(cb){ base.push(cb.value); });
        var outros = String(document.getElementById('cfg-pg-outros').value).split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        outros.forEach(function(o){ if(base.indexOf(o)===-1) base.push(o); });
        var hidden = document.getElementById('cfg-pg-metodos'); if(hidden) hidden.value = base.join(', ');
        return base;
      })(),
      // preserva Pix já salvo via aba dedicada
      pixTipo: ovPrev.pixTipo,
      pixChave: ovPrev.pixChave,
      pixNome: ovPrev.pixNome,
      pixCidade: ovPrev.pixCidade,
      pixExpira: ovPrev.pixExpira,
      pixMensagem: ovPrev.pixMensagem,
    };
    salvar(ov);
    SS.catalog.db.aplicarConfiguracoes();
    var st = document.getElementById('config-status');
    st.textContent = '✓ Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' (neste navegador).';
    SS.ui.toast('Configurações salvas.', '');
  }

  function mostrarPainel() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-painel').classList.remove('hidden');
    renderProdutos('');
    renderCategorias();
    popularConfig();
    popularPixConfig();
    renderTabelaPix();
  }

  function initTabs() {
    document.querySelectorAll('.admin-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.admin-tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
        document.querySelectorAll('[data-tabpanel]').forEach(function (p) { p.classList.toggle('hidden', p.getAttribute('data-tabpanel') !== b.getAttribute('data-tab')); });
        if(b.getAttribute('data-tab')==='pix') renderTabelaPix();
      });
    });
  }

  function exportarCatalogo() {
    var ov = lerOverrides();
    var dados = {
      exportadoEm: new Date().toISOString(),
      produtos: db.getProdutosTodos ? db.getProdutosTodos() : db.getProdutos(),
      categorias: db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias(),
      configuracoes: ov.configuracoes || null,
    };
    var blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogo-sublime-sonhos.json';
    a.click();
    URL.revokeObjectURL(a.href);
    SS.ui.toast('Catálogo exportado.', '');
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();
    var form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); login(); });
    var btnSair = document.getElementById('btn-sair');
    if (btnSair) btnSair.addEventListener('click', logout);
    var btnNovo = document.getElementById('btn-novo');
    if (btnNovo) btnNovo.addEventListener('click', function () { abrirFormProduto(null); });
    var btnNovaCat = document.getElementById('btn-nova-cat');
    if (btnNovaCat) btnNovaCat.addEventListener('click', novaCategoria);
    var btnReordenarCats = document.getElementById('btn-reordenar-cats');
    if (btnReordenarCats) btnReordenarCats.addEventListener('click', abrirModalReordenarCategorias);
    var btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) btnExportar.addEventListener('click', exportarCatalogo);
    var busca = document.getElementById('busca-prod');
    if (busca) busca.addEventListener('input', u.debounce(function () { renderProdutos(busca.value); }, 250));
    syncEntregaModoCards();
    var btnAddBairro = document.getElementById('btn-add-bairro');
    if (btnAddBairro) btnAddBairro.addEventListener('click', function(){
      var ta = document.getElementById('cfg-bairros');
      ta.value = (ta.value ? ta.value.trim() + '\n' : '') + 'novo bairro;0,00';
      renderBairroList();
      var last = document.querySelector('#bairro-list .bairro-row:last-child [data-bairro]');
      if (last) { last.focus(); last.select(); }
    });
    SS.ui.initCustomSelects();
    // garante render inicial da lista de bairros
    renderBairroList();
    var formCfg = document.getElementById('form-config');
    if (formCfg) formCfg.addEventListener('submit', salvarConfig);
    // Pix
    var formPix = document.getElementById('form-pix');
    if(formPix) formPix.addEventListener('submit', salvarPixConfig);
    var pixTipo=document.getElementById('cfg-pix-tipo');
    if(pixTipo) pixTipo.addEventListener('change', atualizarHintPix);
    var pixChave=document.getElementById('cfg-pix-chave');
    if(pixChave) pixChave.addEventListener('input', atualizarHintPix);
    var btnTestar=document.getElementById('btn-testar-pix');
    if(btnTestar) btnTestar.addEventListener('click', testarPix);
    var filtroPix=document.getElementById('filtro-pix-status');
    if(filtroPix) filtroPix.addEventListener('change', renderTabelaPix);
    var btnLimparPix=document.getElementById('btn-limpar-pix');
    if(btnLimparPix) btnLimparPix.addEventListener('click', function(){
      try{
        var raw=localStorage.getItem(SS.pix.STORAGE_PAGAMENTOS);
        var arr= raw ? JSON.parse(raw) : [];
        arr=arr.filter(function(p){ return p.status!=='expirado' && p.status!=='cancelado'; });
        localStorage.setItem(SS.pix.STORAGE_PAGAMENTOS, JSON.stringify(arr));
      }catch(e){}
      renderTabelaPix(); SS.ui.toast('Histórico limpo.','');
    });
    // atualiza lista a cada 15s quando aba pix visível
    setInterval(function(){
      var painel=document.querySelector('[data-tabpanel="pix"]');
      if(painel && !painel.classList.contains('hidden')) renderTabelaPix();
    }, 15000);
    modalOverlay = document.getElementById('modal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) fecharModal(); });
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharModal(); });
    initTabs();
    var pwToggle = document.getElementById('pw-toggle');
    var senhaInput = document.getElementById('senha');
    if (pwToggle && senhaInput) {
      pwToggle.addEventListener('click', function(){
        var isPw = senhaInput.type === 'password';
        senhaInput.type = isPw ? 'text' : 'password';
        pwToggle.innerHTML = isPw ? '<iconify-icon icon="ph:eye-slash" width="18" height="18"></iconify-icon>' : '<iconify-icon icon="ph:eye" width="18" height="18"></iconify-icon>';
      });
    }
    if (estaLogado()) mostrarPainel();
  });
})(window.SS);
