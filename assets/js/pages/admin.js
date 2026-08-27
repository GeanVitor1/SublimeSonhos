window.SS = window.SS || {};
(function (SS) {
  'use strict';
  var u = SS.utils;
  var cfg = SS.config;
  var db = SS.catalog.db;
  var SESSION_KEY = 'ss_admin_session';

  function estaLogado() { return sessionStorage.getItem(SESSION_KEY) === '1'; }

  function getSenha() { return db.getSenhaAtual ? db.getSenhaAtual() : cfg.admin.senhaDemo; }

  function login() {
    var input = document.getElementById('senha');
    var senha = input.value;
    var aviso = document.getElementById('login-aviso');
    if (senha === getSenha()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      aviso.style.display = 'none';
      mostrarPainel();
    } else {
      aviso.style.display = 'block';
      input.focus();
      input.select();
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
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
    var produtos = todos.filter(function (p) {
      if (p._excluido) return false;
      if (!filtro) return true;
      return (p.nome + ' ' + (p.descricaoCurta||'') + ' ' + (p.descricao||'')).toLowerCase().indexOf(filtro) !== -1;
    });
    if (!produtos.length) {
      grid.innerHTML = '<div class="section-state" style="grid-column:1/-1"><span class="section-state__ico"><iconify-icon icon="ph:package" width="32" height="32"></iconify-icon></span><p><strong>Nenhum produto encontrado.</strong></p><p class="section-state__sub">Tente outro termo ou crie um novo produto.</p></div>';
    } else {
      grid.innerHTML = produtos.map(function (p) {
        var cat = db.getCategoriaNome(p.categoria) || 'Sem categoria';
        var catExists = !!db.getCategoria(p.categoria);
        var preco = p.preco === null || p.preco === undefined ? '<span class="text-muted">Sob consulta</span>' : u.fmtBRL(p.preco) + (p.precoPromo ? ' <span style="font-size:12px;color:var(--muted);text-decoration:line-through;margin-left:6px">' + u.fmtBRL(p.precoPromo) + '</span>' : '');
        var statusBadge = p.esgotado ? '<span class="badge badge--ink">Esgotado</span>' : p.ativo ? '<span class="badge badge--visible">Visível</span>' : '<span class="badge badge--hidden">Oculto</span>';
        if (!catExists && p.categoria) statusBadge += ' <span class="badge badge--hidden">Categoria oculta</span>';
        var media = p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + u.imgFallback() + '\';">' : '<div class="admin-card__media-fallback"><iconify-icon icon="ph:image" width="32" height="32"></iconify-icon></div>';
        return (
          '<article class="admin-card">' +
            '<div class="admin-card__media">' + media + '<div class="admin-card__topbadges">' + statusBadge + '</div></div>' +
            '<div class="admin-card__body">' +
              '<span class="admin-card__cat">' + u.esc(cat) + '</span>' +
              '<div class="admin-card__name">' + u.esc(p.nome) + '</div>' +
              '<div class="admin-card__id">' + u.esc(p.id) + '</div>' +
              '<div class="admin-card__price">' + preco + '</div>' +
              '<div class="admin-card__desc">' + u.esc(p.descricaoCurta || p.descricao || 'Sem descrição') + '</div>' +
            '</div>' +
            '<div class="admin-card__foot">' +
              '<div class="admin-card__actions">' +
                '<button type="button" class="a-edit" data-editar="' + u.esc(p.id) + '">Editar</button>' +
                '<button type="button" class="a-toggle a-vis' + (p.ativo ? '' : ' is-hidden') + '" data-toggle="' + u.esc(p.id) + '">' + (p.ativo ? 'Ocultar' : 'Mostrar') + '</button>' +
                '<button type="button" class="a-del" data-del="' + u.esc(p.id) + '">Excluir</button>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join('');
    }
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

  function abrirFormProduto(id) {
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
    var catOpts = cats.map(function (c) {
      var label = c.nome + (c.ativo === false ? ' (oculta)' : '');
      return '<option value="' + u.esc(c.id) + '"' + (p.categoria === c.id ? ' selected' : '') + '>' + u.esc(label) + '</option>';
    }).join('');
    if (!cats.length) catOpts = '<option value="">Sem categorias — crie uma primeiro</option>';
    if (p.categoria && !cats.some(function(c){return c.id===p.categoria;})) {
      catOpts = '<option value="' + u.esc(p.categoria) + '" selected>' + u.esc(p.categoria) + ' (excluída)</option>' + catOpts;
    }

    if (novo) {
      var stepHtml = '<div class="pf-steps-indicator"><div class="pf-step-dot active" data-sdot="1"><span>1</span><small>Identificação</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="2"><span>2</span><small>Preço e descrição</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="3"><span>3</span><small>Opções</small></div><div class="pf-step-line"></div><div class="pf-step-dot" data-sdot="4"><span>4</span><small>Fotos e exibição</small></div></div>' +
        '<div class="pf-step" data-step="1"><div class="modal-section"><h4><iconify-icon icon="ph:tag" width="16" height="16"></iconify-icon> Identificação</h4><div class="form-group"><label class="form-label">Nome do produto <span class="req">*</span></label><input class="form-control" id="pf-nome" value="' + u.esc(p.nome || '') + '" placeholder="Ex.: Caixa com 6 doces"><p class="form-hint">Nome que aparece na vitrine.</p></div><div class="form-group"><label class="form-label">Categoria <span class="req">*</span></label><select class="form-control" id="pf-cat">' + catOpts + '</select><p class="form-hint">Selecione onde o produto aparece na página inicial.</p></div></div></div>' +
        '<div class="pf-step hidden" data-step="2"><div class="modal-section"><h4><iconify-icon icon="ph:currency-dollar" width="16" height="16"></iconify-icon> Preço e descrição</h4><div class="modal-grid2"><div class="form-group"><label class="form-label">Preço (R$)</label><input class="form-control" id="pf-preco" type="number" min="0" step="0.01" value="' + (p.preco === null || p.preco===undefined ? '' : p.preco) + '" placeholder="Ex.: 32,00"><p class="form-hint">Deixe vazio para “Sob consulta”.</p></div><div class="form-group"><label class="form-label">Preço promocional (R$)</label><input class="form-control" id="pf-promo" type="number" min="0" step="0.01" value="' + (p.precoPromo || '') + '" placeholder="Opcional"></div></div><div class="form-group"><label class="form-label">Descrição completa <span style="font-weight:400;color:var(--muted)">(opcional)</span></label><textarea class="form-control" id="pf-desc" rows="4" placeholder="Detalhe ingredientes, tamanho, o que acompanha… (opcional)">' + u.esc(p.descricao || '') + '</textarea><p class="form-hint">Se preencher, a vitrine usará os primeiros 90 caracteres. Pode deixar vazio.</p></div></div></div>' +
        '<div class="pf-step hidden" data-step="3"><div class="modal-section"><h4><iconify-icon icon="ph:sliders" width="16" height="16"></iconify-icon> Opções do produto</h4><div class="pf-opt-sec"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:ruler" width="14" height="14"></iconify-icon> Tamanhos</h5><span class="form-hint">Ex.: P, M, G</span></div><div id="pf-tam-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-tam"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar tamanho</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:cookie" width="14" height="14"></iconify-icon> Sabores</h5><span class="form-hint">Ex.: Brigadeiro, Ninho</span></div><div id="pf-sabor-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-sabor"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar sabor</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:plus-circle" width="14" height="14"></iconify-icon> Adicionais</h5><span class="form-hint">Cobrança extra, ex.: Granulado + R$2</span></div><div id="pf-adic-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-adic"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar adicional</button></div></div></div>' +
        '<div class="pf-step hidden" data-step="4"><div class="modal-section"><h4><iconify-icon icon="ph:image" width="16" height="16"></iconify-icon> Fotos</h4><div class="pf-imgs" id="pf-imgs"></div><div class="pf-upload" id="pf-upload"><input class="sr-only" id="pf-img-file" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="pf-upload__icon"><iconify-icon icon="ph:upload-simple" width="24" height="24"></iconify-icon></div><p class="pf-upload__title">Arraste as fotos aqui ou clique para selecionar</p><p class="pf-upload__hint">JPG, PNG ou WebP • até 1,5 MB cada • várias de uma vez</p><button type="button" class="btn btn--outline btn--sm" id="pf-upload-btn"><iconify-icon icon="ph:images" width="16" height="16"></iconify-icon> Selecionar fotos</button></div><p class="form-hint mt-2">Em demonstração ficam salvas apenas neste navegador.</p></div><div class="modal-section"><h4><iconify-icon icon="ph:eye" width="16" height="16"></iconify-icon> Exibição na loja</h4><div class="pf-checks"><label class="pf-check"><input type="checkbox" id="pf-ativo" checked><span>Visível na vitrine</span></label><label class="pf-check"><input type="checkbox" id="pf-pronta" ' + (p.prontaEntrega ? 'checked' : '') + '><span>Pronta entrega</span></label><label class="pf-check"><input type="checkbox" id="pf-encomenda" ' + (p.encomenda ? 'checked' : '') + '><span>Aceita encomenda</span></label><label class="pf-check"><input type="checkbox" id="pf-esgotado" ' + (p.esgotado ? 'checked' : '') + '><span>Marcar como esgotado</span></label></div></div></div>';
      abrirModal('Novo produto', stepHtml, '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--outline" id="pf-voltar" style="display:none">Voltar</button><button type="button" class="btn btn--primary" id="pf-avancar">Avançar</button><button type="button" class="btn btn--primary" id="pf-salvar" style="display:none">Criar produto</button>');
    } else {
      abrirModal('Editar produto',
        '<div class="modal-section"><h4><iconify-icon icon="ph:tag" width="16" height="16"></iconify-icon> Identificação</h4><div class="modal-grid2"><div class="form-group"><label class="form-label">Nome do produto <span class="req">*</span></label><input class="form-control" id="pf-nome" value="' + u.esc(p.nome || '') + '" placeholder="Ex.: Caixa com 6 doces"><p class="form-hint">Nome que aparece na vitrine.</p></div><div class="form-group"><label class="form-label">Categoria <span class="req">*</span></label><select class="form-control" id="pf-cat">' + catOpts + '</select><p class="form-hint">Selecione onde o produto aparece na página inicial.</p></div></div></div>' +
        '<div class="modal-section"><h4><iconify-icon icon="ph:currency-dollar" width="16" height="16"></iconify-icon> Preço e descrição</h4><div class="modal-grid2"><div class="form-group"><label class="form-label">Preço (R$)</label><input class="form-control" id="pf-preco" type="number" min="0" step="0.01" value="' + (p.preco === null || p.preco===undefined ? '' : p.preco) + '" placeholder="Ex.: 32,00"><p class="form-hint">Deixe vazio para “Sob consulta”.</p></div><div class="form-group"><label class="form-label">Preço promocional (R$)</label><input class="form-control" id="pf-promo" type="number" min="0" step="0.01" value="' + (p.precoPromo || '') + '" placeholder="Opcional"></div></div><div class="form-group"><label class="form-label">Descrição completa <span style="font-weight:400;color:var(--muted)">(opcional)</span></label><textarea class="form-control" id="pf-desc" rows="4" placeholder="Detalhe ingredientes, tamanho, o que acompanha… (opcional)">' + u.esc(p.descricao || '') + '</textarea><p class="form-hint">Se preencher, a vitrine usará os primeiros 90 caracteres. Pode deixar vazio.</p></div></div>' +
        '<div class="modal-section"><h4><iconify-icon icon="ph:sliders" width="16" height="16"></iconify-icon> Opções do produto</h4><div class="pf-opt-sec"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:ruler" width="14" height="14"></iconify-icon> Tamanhos</h5><span class="form-hint">Ex.: P, M, G</span></div><div id="pf-tam-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-tam"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar tamanho</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:cookie" width="14" height="14"></iconify-icon> Sabores</h5><span class="form-hint">Ex.: Brigadeiro, Ninho</span></div><div id="pf-sabor-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-sabor"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar sabor</button></div><div class="pf-opt-sec mt-3"><div class="pf-opt-sec__head"><h5><iconify-icon icon="ph:plus-circle" width="14" height="14"></iconify-icon> Adicionais</h5><span class="form-hint">Cobrança extra, ex.: Granulado + R$2</span></div><div id="pf-adic-list" class="pf-var-list"></div><button type="button" class="btn btn--outline btn--sm mt-2" id="pf-add-adic"><iconify-icon icon="ph:plus" width="12" height="12"></iconify-icon> Adicionar adicional</button></div></div>' +
        '<div class="modal-section"><h4><iconify-icon icon="ph:image" width="16" height="16"></iconify-icon> Fotos</h4><div class="pf-imgs" id="pf-imgs"></div><div class="pf-upload" id="pf-upload"><input class="sr-only" id="pf-img-file" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="pf-upload__icon"><iconify-icon icon="ph:upload-simple" width="24" height="24"></iconify-icon></div><p class="pf-upload__title">Arraste as fotos aqui ou clique para selecionar</p><p class="pf-upload__hint">JPG, PNG ou WebP • até 1,5 MB cada • várias de uma vez</p><button type="button" class="btn btn--outline btn--sm" id="pf-upload-btn"><iconify-icon icon="ph:images" width="16" height="16"></iconify-icon> Selecionar fotos</button></div><p class="form-hint mt-2">Em demonstração ficam salvas apenas neste navegador.</p></div>' +
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
    function renderTam(){
      if (!tamListEl) return;
      if (!listaTam.length) { tamListEl.innerHTML = '<p class="text-sm text-muted" style="padding:6px 0">Nenhum tamanho. Clique em “Adicionar tamanho”.</p>'; return; }
      tamListEl.innerHTML = listaTam.map(function(it,i){
        return '<div class="pf-var-row" data-idx="'+i+'" style="display:grid;grid-template-columns:1fr 110px 36px;gap:8px;align-items:center;margin-bottom:8px">' +
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
        return '<div class="pf-var-row" data-idx="'+i+'" style="display:grid;grid-template-columns:1fr 110px 36px;gap:8px;align-items:center;margin-bottom:8px">' +
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
        return '<div class="pf-var-row" data-idx="'+i+'" style="display:grid;grid-template-columns:1fr 110px 36px;gap:8px;align-items:center;margin-bottom:8px">' +
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
          var ct=document.getElementById('pf-cat').value.trim();
          if(!nm){ SS.ui.toast('Informe o nome do produto.', 'error'); return false; }
          if(!ct){ SS.ui.toast('Selecione a categoria.', 'error'); return false; }
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
      var catVal = document.getElementById('pf-cat').value.trim();
      if (!catVal) { SS.ui.toast('Associe o produto a uma categoria.', 'error'); return; }
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
      var campos = {
        nome: nome,
        categoria: catVal,
        preco: isNaN(preco) ? null : preco,
        precoPromo: isNaN(promo) ? null : promo,
        precoSobConsulta: preco === null,
        descricaoCurta: curtaAuto,
        descricao: descCompleta,
        unidade: p.unidade || 'un',
        quantidadeMinima: p.quantidadeMinima || 1,
        prazoProducaoDias: p.prazoProducaoDias || 0,
        variacoes: [],
        sabores: sabores,
        tamanhos: tamanhos,
        adicionais: adicionais,
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
        var novoProduto = Object.assign({}, db._base.produtos[0] || { id: novoId }, campos, { id: novoId, variacoes: [] });
        novoProduto.ativo = campos.ativo;
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

    function renderCategorias() {
    var grid = document.getElementById('tabela-categorias');
    var cats = db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias();
    var todosProds = db.getProdutosTodos ? db.getProdutosTodos() : [];
    if (!cats.length) {
      grid.innerHTML = '<div class="section-state" style="grid-column:1/-1"><span class="section-state__ico"><iconify-icon icon="ph:folder" width="32" height="32"></iconify-icon></span><p><strong>Nenhuma categoria.</strong></p><p class="section-state__sub">Crie a primeira categoria para organizar seus produtos.</p></div>';
      return;
    }
    grid.innerHTML = cats.map(function (c) {
      var count = todosProds.filter(function (p) { return p.categoria === c.id && !p._excluido; }).length;
      var visivel = c.ativo !== false;
      return (
        '<article class="admin-cat-card">' +
          '<div class="admin-cat-card__head">' +
            '<span class="admin-cat-card__ico"><iconify-icon icon="ph:' + u.esc(c.icone || 'cookie') + '" width="20" height="20"></iconify-icon></span>' +
            '<div><div class="admin-cat-card__name">' + u.esc(c.nome) + '</div><div class="admin-cat-card__id">' + u.esc(c.id) + '</div></div>' +
          '</div>' +
          '<div class="admin-cat-card__desc">' + u.esc(c.descricao || 'Sem descrição') + '</div>' +
          '<div class="admin-cat-card__meta">' +
            (visivel ? '<span class="badge badge--visible">Visível na home</span>' : '<span class="badge badge--hidden">Oculta</span>') +
            '<span class="admin-cat-card__count">' + count + ' produto' + (count===1 ? '' : 's') + '</span>' +
          '</div>' +
          '<div class="admin-cat-card__actions">' +
            '<button type="button" class="a-edit" data-editcat="' + u.esc(c.id) + '">Editar</button>' +
            '<button type="button" class="a-vis' + (visivel ? '' : ' is-hidden') + '" data-actuscat="' + u.esc(c.id) + '">' + (visivel ? 'Ocultar' : 'Mostrar') + '</button>' +
            '<button type="button" class="a-del" data-delcat="' + u.esc(c.id) + '">Excluir</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');
    grid.querySelectorAll('[data-editcat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-editcat');
        var cat = db.getCategoria(id);
        if (!cat) return;
        abrirModal('Editar categoria',
          '<div class="modal-section"><h4><iconify-icon icon="ph:folder" width="16" height="16"></iconify-icon> Dados da categoria</h4>' +
          '<div class="form-group"><label class="form-label">Nome da categoria <span class="req">*</span></label><input class="form-control" id="cf-nome" value="' + u.esc(cat.nome) + '" placeholder="Ex.: Doces finos"><p class="form-hint">Como aparece na página inicial.</p></div>' +
          '<div class="form-group"><label class="form-label">Ícone</label><input class="form-control" id="cf-ico" value="' + u.esc(cat.icone) + '" placeholder="cookie"><p class="form-hint">Nome do ícone Phosphor sem prefixo: <code>cookie, cake, gift, cherries, candy, ice-cream</code></p></div>' +
          '<div class="form-group"><label class="form-label">Descrição curta</label><input class="form-control" id="cf-desc" value="' + u.esc(cat.descricao || '') + '" placeholder="Ex.: Doces para presentear"></div></div>' +
          '<div class="modal-section"><h4><iconify-icon icon="ph:eye" width="16" height="16"></iconify-icon> Exibição</h4><label class="pf-check"><input type="checkbox" id="cf-ativo" ' + (cat.ativo !== false ? 'checked' : '') + '><span>Visível na página inicial</span></label><p class="form-hint mt-2">Desmarque para ocultar a seção inteira sem excluir os produtos.</p></div>',
          '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--primary" id="cf-salvar">Salvar categoria</button>');
        modalOverlay.querySelector('#cf-salvar').addEventListener('click', function () {
          var nome = document.getElementById('cf-nome').value.trim();
          if (!nome) { SS.ui.toast('Informe o nome.', 'error'); return; }
          var cats = db.getCategoriasTodas().map(function (c) {
            if (c.id !== id) return c;
            return Object.assign({}, c, { nome: nome, icone: document.getElementById('cf-ico').value.trim() || c.icone, descricao: document.getElementById('cf-desc').value.trim(), ativo: document.getElementById('cf-ativo').checked });
          });
          var ov = lerOverrides();
          ov.categorias = cats;
          salvar(ov);
          fecharModal();
          SS.ui.toast('Categoria atualizada.', '');
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

  function novaCategoria() {
    abrirModal('Nova categoria',
      '<div class="modal-section"><h4><iconify-icon icon="ph:folder-plus" width="16" height="16"></iconify-icon> Nova categoria</h4>' +
      '<div class="form-group"><label class="form-label">Nome da categoria <span class="req">*</span></label><input class="form-control" id="cf-nome" placeholder="Ex.: Doces finos"><p class="form-hint">Crie um nome claro — ele vira o título da seção na home.</p></div>' +
      '<div class="form-group"><label class="form-label">Ícone</label><input class="form-control" id="cf-ico" placeholder="cookie"><p class="form-hint">Phosphor sem prefixo: <code>cookie, cake, gift, cherries, candy, ice-cream</code></p></div>' +
      '<div class="form-group"><label class="form-label">Descrição curta</label><input class="form-control" id="cf-desc" placeholder="Ex.: Doces para presentear"><p class="form-hint">Frase que aparece abaixo do título da seção.</p></div></div>' +
      '<div class="modal-section"><h4><iconify-icon icon="ph:eye" width="16" height="16"></iconify-icon> Exibição</h4><label class="pf-check"><input type="checkbox" id="cf-ativo" checked><span>Visível na página inicial</span></label></div>',
      '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--primary" id="cf-salvar">Criar categoria</button>');
    modalOverlay.querySelector('#cf-salvar').addEventListener('click', function () {
      var nome = document.getElementById('cf-nome').value.trim();
      if (!nome) { SS.ui.toast('Informe o nome da categoria.', 'error'); return; }
      var id = u.slugify(nome);
      var ov = lerOverrides();
      var cats = db.getCategoriasTodas ? db.getCategoriasTodas() : db.getCategorias();
      if (cats.some(function (c) { return c.id === id; })) { SS.ui.toast('Já existe categoria com este nome/slug.', 'error'); return; }
      var nova = { id: id, nome: nome, icone: document.getElementById('cf-ico').value.trim() || 'cookie', descricao: document.getElementById('cf-desc').value.trim(), imagem: cats[0] ? cats[0].imagem : '', ativo: document.getElementById('cf-ativo').checked };
      ov.categorias = cats.concat([nova]);
      salvar(ov);
      fecharModal();
      SS.ui.toast('Categoria criada.', '');
      renderCategorias();
    });
    modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
  }

  function popularConfig() {
    var ov = lerOverrides().configuracoes || {};
    var g = function (id, valor) { var el = document.getElementById(id); if (el) el.value = valor; };
    g('cfg-wa', ov.whatsappNumero || cfg.whatsapp.numero);
    g('cfg-link', ov.linkComercial || cfg.whatsapp.linkComercial);
    g('cfg-ig', ov.instagram || cfg.social.instagram);
    g('cfg-igu', ov.instagramUsuario || cfg.social.instagramUsuario);
    g('cfg-area', ov.area || cfg.loja.area);
    g('cfg-cidade', ov.cidade || cfg.loja.cidade);
    g('cfg-end', ov.endereco !== undefined ? ov.endereco : cfg.loja.endereco);
    g('cfg-horario', ov.horario || cfg.loja.horario);
    g('cfg-ant', ov.antecedenciaMinimaDias || cfg.loja.antecedenciaMinimaDias);
    g('cfg-ent-modo', ov.entregaModo || cfg.loja.entrega.modo);
    g('cfg-taxa', ov.taxaEntrega !== undefined ? ov.taxaEntrega : cfg.loja.entrega.taxaEntrega);
    var bairros = Object.keys(ov.taxasBairro || cfg.loja.entrega.taxasBairro).map(function (k) { return k + ';' + String(cfg.loja.entrega.taxasBairro[k]).replace('.', ','); }).join('\n');
    g('cfg-bairros', bairros);
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

  function toggleTaxaFields() {
    var modo = document.getElementById('cfg-ent-modo').value;
    document.getElementById('cfg-taxa-wrap').classList.toggle('hidden', modo !== 'fixa');
    document.getElementById('cfg-bairros-wrap').classList.toggle('hidden', modo !== 'bairro');
  }

  function salvarConfig(e) {
    e.preventDefault();
    var bairros = {};
    String(document.getElementById('cfg-bairros').value).split('\n').forEach(function (l) {
      var parts = l.split(';');
      if (parts.length >= 2 && parts[0].trim()) bairros[parts[0].trim().toLowerCase()] = Math.round(Number(parts[1].trim().replace(',', '.')) * 100) / 100;
    });
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
    };
    salvar(ov);
    SS.catalog.db.aplicarConfiguracoes();
    var st = document.getElementById('config-status');
    st.textContent = '✓ Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' (neste navegador).';
    SS.ui.toast('Configurações salvas.', '');
  }

  function trocarSenha() {
    var atual = document.getElementById('cfg-senha-atual').value;
    var nova = document.getElementById('cfg-senha-nova').value;
    var conf = document.getElementById('cfg-senha-conf').value;
    var st = document.getElementById('senha-status');
    if (atual !== getSenha()) { st.textContent = 'Senha atual incorreta.'; st.style.color='var(--danger)'; SS.ui.toast('Senha atual incorreta.', 'error'); return; }
    if (!nova || nova.length < 6) { st.textContent = 'Nova senha deve ter ao menos 6 caracteres.'; st.style.color='var(--danger)'; SS.ui.toast('Senha muito curta.', 'error'); return; }
    if (nova !== conf) { st.textContent = 'Confirmação não confere.'; st.style.color='var(--danger)'; SS.ui.toast('Confirmação não confere.', 'error'); return; }
    db.setSenhaNova(nova);
    document.getElementById('cfg-senha-atual').value='';
    document.getElementById('cfg-senha-nova').value='';
    document.getElementById('cfg-senha-conf').value='';
    st.textContent = '✓ Senha alterada com sucesso!';
    st.style.color='var(--success)';
    SS.ui.toast('Senha alterada.', '');
  }

  function mostrarPainel() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-painel').classList.remove('hidden');
    renderProdutos('');
    renderCategorias();
    popularConfig();
  }

  function initTabs() {
    document.querySelectorAll('.admin-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.admin-tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
        document.querySelectorAll('[data-tabpanel]').forEach(function (p) { p.classList.toggle('hidden', p.getAttribute('data-tabpanel') !== b.getAttribute('data-tab')); });
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
    var btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) btnExportar.addEventListener('click', exportarCatalogo);
    var busca = document.getElementById('busca-prod');
    if (busca) busca.addEventListener('input', u.debounce(function () { renderProdutos(busca.value); }, 250));
    var entModo = document.getElementById('cfg-ent-modo');
    if (entModo) entModo.addEventListener('change', toggleTaxaFields);
    SS.ui.initCustomSelects();
    var formCfg = document.getElementById('form-config');
    if (formCfg) formCfg.addEventListener('submit', salvarConfig);
    var btnSenha = document.getElementById('btn-trocar-senha');
    if (btnSenha) btnSenha.addEventListener('click', trocarSenha);
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
