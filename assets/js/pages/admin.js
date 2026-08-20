/* =========================================================================
   SUBLIME SONHOS — ÁREA ADMINISTRATIVA (MODO DEMONSTRAÇÃO)
   =========================================================================
   Autenticação: senha simples definida em config.js (admin.senhaDemo).
   Persistência: localStorage (somente neste navegador) — ver README.md
   para ativar o Supabase e publicar cadastros para todos os clientes.

   NENHUMA credencial real deve ser colocada neste código. Nunca armazene
   chaves PIX ou tokens em arquivos públicos.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;
  var db = SS.catalog.db;
  var SESSION_KEY = 'ss_admin_session';

  /* ------------------------------------------------------------------ */
  /* AUTENTICAÇÃO (demonstração)                                         */
  /* ------------------------------------------------------------------ */
  function estaLogado() { return sessionStorage.getItem(SESSION_KEY) === '1'; }

  function login() {
    var senha = document.getElementById('senha').value;
    if (senha === cfg.admin.senhaDemo) {
      sessionStorage.setItem(SESSION_KEY, '1');
      mostrarPainel();
    } else {
      document.getElementById('login-aviso').style.display = 'block';
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  /* ------------------------------------------------------------------ */
  /* MODAL                                                               */
  /* ------------------------------------------------------------------ */
  var modalOverlay = null;
  function abrirModal(titulo, bodyHtml, acoesHtml) {
    modalOverlay = document.getElementById('modal');
    document.getElementById('modal-title').textContent = titulo;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    SS.ui.initCustomSelects(document.getElementById('modal-body'));
    document.getElementById('modal-actions').innerHTML = acoesHtml;
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function fecharModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ------------------------------------------------------------------ */
  /* PRODUTOS                                                            */
  /* ------------------------------------------------------------------ */
  function lerOverrides() { return db._lerOverrides(); }
  function salvar(ov) { db._salvarOverrides(ov); }

  function renderProdutos(filtro) {
    var tbody = document.getElementById('tabela-produtos');
    filtro = (filtro || '').toLowerCase();
    var produtos = db._base.produtos.map(function (p) {
      var ov = lerOverrides().produtos[p.id];
      return ov ? Object.assign({}, p, ov) : p;
    }).filter(function (p) {
      if (!filtro) return true;
      return (p.nome + ' ' + p.descricaoCurta + ' ' + p.descricao).toLowerCase().indexOf(filtro) !== -1;
    });
    tbody.innerHTML = produtos.map(function (p) {
      var cat = db.getCategoriaNome(p.categoria);
      var preco = p.preco === null || p.preco === undefined ? '<span class="text-muted">Sob consulta</span>' : u.fmtBRL(p.preco) + (p.precoPromo ? ' <old>' + u.fmtBRL(p.precoPromo) + '</old>' : '');
      return (
        '<tr>' +
          '<td><div class="flex gap-2 items-center">' +
            (p.imagens && p.imagens[0] ? '<img class="t-img" src="' + u.esc(p.imagens[0]) + '" alt="">' : '') +
            '<div><strong>' + u.esc(p.nome) + '</strong><br><span class="text-sm text-muted">' + u.esc(p.id) + '</span></div>' +
          '</div></td>' +
          '<td>' + u.esc(cat) + '</td>' +
          '<td>' + preco + '</td>' +
          '<td>' + (p.esgotado ? '<span class="badge badge--ink">Esgotado</span>' : p.ativo ? '<span class="badge badge--green">Ativo</span>' : '<span class="badge badge--rose">Inativo</span>') + '</td>' +
          '<td><div class="admin-actions">' +
            '<button type="button" class="a-edit" data-editar="' + u.esc(p.id) + '">Editar</button>' +
            '<button type="button" class="a-toggle" data-toggle="' + u.esc(p.id) + '">' + (p.ativo ? 'Desativar' : 'Ativar') + '</button>' +
            '<button type="button" class="a-del" data-del="' + u.esc(p.id) + '">Excluir</button>' +
          '</div></td>' +
        '</tr>'
      );
    }).join('') || '<tr><td colspan="5" class="text-muted text-center" style="padding:26px">Nenhum produto encontrado.</td></tr>';

    tbody.querySelectorAll('[data-editar]').forEach(function (b) {
      b.addEventListener('click', function () { abrirFormProduto(b.getAttribute('data-editar')); });
    });
    tbody.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-toggle');
        var ov = lerOverrides();
        var atual = Object.assign({}, db._base.produtos.filter(function (p) { return p.id === id; })[0], ov.produtos[id] || {});
        ov.produtos[id] = Object.assign({}, ov.produtos[id] || {}, { ativo: !atual.ativo });
        salvar(ov);
        SS.ui.toast(atual.ativo ? 'Produto desativado.' : 'Produto ativado.');
        renderProdutos(document.getElementById('busca-prod').value);
      });
    });
    tbody.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del');
        abrirModal('Excluir produto', '<p>Excluir <strong>' + u.esc(id) + '</strong>? Esta ação não pode ser desfeita.</p>',
          '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button>' +
          '<button type="button" class="btn btn--dark" data-confirmar>Excluir</button>');
        modalOverlay.querySelector('[data-confirmar]').addEventListener('click', function () {
          var ov = lerOverrides();
          delete ov.produtos[id];
          salvar(ov);
          fecharModal();
          SS.ui.toast('Produto excluído (somente neste navegador).');
          renderProdutos(document.getElementById('busca-prod').value);
        });
        modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
      });
    });
  }

  /* ---------------------- FORMULÁRIO DO PRODUTO ---------------------- */
  function linhasParaLista(texto) {
    return texto.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function abrirFormProduto(id) {
    var base = db._base.produtos.filter(function (p) { return p.id === id; })[0];
    var ov = lerOverrides().produtos[id] || {};
    var p = Object.assign({}, base || {}, ov);
    var novo = !base;

    var sabores = (p.sabores || []).map(function (s) { return typeof s === 'object' ? s.nome : s; }).join('\n');
    var tamanhos = (p.tamanhos || []).map(function (s) { return typeof s === 'object' ? s.nome : s; }).join('\n');
    var adicionais = (p.adicionais || []).map(function (a) { return a.nome + ';' + (a.preco || 0); }).join('\n');

    abrirModal(novo ? 'Novo produto' : 'Editar produto',
      '<div class="admin-form">' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Nome <span class="req">*</span></label><input class="form-control" id="pf-nome" value="' + u.esc(p.nome || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Categoria</label><select class="form-control" id="pf-cat">' + db.getCategorias().map(function (c) { return '<option value="' + u.esc(c.id) + '"' + (p.categoria === c.id ? ' selected' : '') + '>' + u.esc(c.nome) + '</option>'; }).join('') + '</select></div>' +
          '<div class="form-group"><label class="form-label">Preço (R$)</label><input class="form-control" id="pf-preco" type="number" min="0" step="0.01" value="' + (p.preco === null ? '' : p.preco) + '"><p class="form-hint">Deixe vazio para "Preço sob consulta".</p></div>' +
          '<div class="form-group"><label class="form-label">Preço promocional (R$)</label><input class="form-control" id="pf-promo" type="number" min="0" step="0.01" value="' + (p.precoPromo || '') + '"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Descrição curta</label><input class="form-control" id="pf-curta" value="' + u.esc(p.descricaoCurta || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Descrição completa</label><textarea class="form-control" id="pf-desc" rows="3">' + u.esc(p.descricao || '') + '</textarea></div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Unidade de venda</label><input class="form-control" id="pf-un" value="' + u.esc(p.unidade || 'un') + '"></div>' +
          '<div class="form-group"><label class="form-label">Quantidade mínima</label><input class="form-control" id="pf-min" type="number" min="1" value="' + (p.quantidadeMinima || 1) + '"></div>' +
          '<div class="form-group"><label class="form-label">Prazo de produção (dias)</label><input class="form-control" id="pf-prazo" type="number" min="0" value="' + (p.prazoProducaoDias || 0) + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Sabores (um por linha)</label><textarea class="form-control" id="pf-sabores" rows="3">' + u.esc(sabores) + '</textarea></div>' +
          '<div class="form-group"><label class="form-label">Tamanhos (um por linha)</label><textarea class="form-control" id="pf-tamanhos" rows="3">' + u.esc(tamanhos) + '</textarea></div>' +
          '<div class="form-group"><label class="form-label">Adicionais (nome;preço por linha)</label><textarea class="form-control" id="pf-add" rows="3" placeholder="Colher descartável;0&#10;Kit festa extra;15,00">' + u.esc(adicionais) + '</textarea></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Observações padrão (placeholder)</label><input class="form-control" id="pf-obs" value="' + u.esc(p.observacoes || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Conservação</label><input class="form-control" id="pf-cons" value="' + u.esc(p.conservacao || '') + '"></div>' +
        '<div class="form-row">' +
          '<label class="opt" style="border:none;padding:8px 0"><input type="checkbox" id="pf-pronta" ' + (p.prontaEntrega ? 'checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Pronta entrega</span></label>' +
          '<label class="opt" style="border:none;padding:8px 0"><input type="checkbox" id="pf-encomenda" ' + (p.encomenda ? 'checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Encomenda</span></label>' +
          '<label class="opt" style="border:none;padding:8px 0"><input type="checkbox" id="pf-esgotado" ' + (p.esgotado ? 'checked' : '') + '><span class="opt__dot"></span><span class="opt__label">Esgotado</span></label>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Imagens</label>' +
          '<div class="flex gap-2 items-center" style="flex-wrap:wrap" id="pf-imgs"></div>' +
          '<input class="form-control mt-2" id="pf-img-file" type="file" accept="image/jpeg,image/png,image/webp"><p class="form-hint">Adicione imagens (máx. 1,5 MB cada — JPG, PNG ou WebP). Em modo demonstração ficam salvas apenas neste navegador.</p>' +
        '</div>' +
      '</div>',
      '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button>' +
      '<button type="button" class="btn btn--primary" id="pf-salvar">Salvar produto</button>');

    /* imagens atuais */
    var imgsWrap = document.getElementById('pf-imgs');
    var imagens = (p.imagens || []).slice();
    function renderImgs() {
      imgsWrap.innerHTML = imagens.map(function (src, i) {
        return '<span style="position:relative"><img src="' + u.esc(src) + '" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">' +
          '<button type="button" data-rmimg="' + i + '" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--danger);color:#fff;font-size:12px;line-height:1">×</button></span>';
      }).join('') || '<span class="text-sm text-muted">Nenhuma imagem.</span>';
      imgsWrap.querySelectorAll('[data-rmimg]').forEach(function (b) {
        b.addEventListener('click', function () { imagens.splice(Number(b.getAttribute('data-rmimg')), 1); renderImgs(); });
      });
    }
    renderImgs();
    var fileInput = document.getElementById('pf-img-file');
    fileInput.addEventListener('change', function () {
      Array.prototype.forEach.call(fileInput.files, function (file) {
        if (file.size > 1.5 * 1024 * 1024) { SS.ui.toast('Imagem acima de 1,5 MB: ' + file.name, 'error'); return; }
        var reader = new FileReader();
        reader.onload = function () {
          compressImage(reader.result, function (dataUrl) { imagens.push(dataUrl); renderImgs(); });
        };
        reader.readAsDataURL(file);
      });
      fileInput.value = '';
    });

    modalOverlay.querySelector('#pf-salvar').addEventListener('click', function () {
      var nome = document.getElementById('pf-nome').value.trim();
      if (!nome) { SS.ui.toast('Informe o nome do produto.', 'error'); return; }
      var precoStr = document.getElementById('pf-preco').value.trim();
      var preco = precoStr === '' ? null : Math.round(Number(precoStr.replace(',', '.')) * 100) / 100;
      var promoStr = document.getElementById('pf-promo').value.trim();
      var promo = promoStr === '' ? null : Math.round(Number(promoStr.replace(',', '.')) * 100) / 100;
      var novoId = novo ? u.slugify(nome) || ('produto-' + Date.now()) : p.id;

      var campos = {
        nome: nome,
        categoria: document.getElementById('pf-cat').value,
        preco: isNaN(preco) ? null : preco,
        precoPromo: isNaN(promo) ? null : promo,
        precoSobConsulta: preco === null,
        descricaoCurta: document.getElementById('pf-curta').value.trim(),
        descricao: document.getElementById('pf-desc').value.trim(),
        unidade: document.getElementById('pf-un').value.trim() || 'un',
        quantidadeMinima: Math.max(1, Number(document.getElementById('pf-min').value) || 1),
        prazoProducaoDias: Math.max(0, Number(document.getElementById('pf-prazo').value) || 0),
        sabores: linhasParaLista(document.getElementById('pf-sabores').value).map(function (s) { return { nome: s, acrescimo: 0 }; }),
        tamanhos: linhasParaLista(document.getElementById('pf-tamanhos').value).map(function (s) { return { nome: s, acrescimo: 0 }; }),
        adicionais: linhasParaLista(document.getElementById('pf-add').value).map(function (l) {
          var parts = l.split(';');
          return { nome: parts[0].trim(), preco: Math.round(Number(String(parts[1] || '0').replace(',', '.')) * 100) / 100 };
        }),
        observacoes: document.getElementById('pf-obs').value.trim(),
        conservacao: document.getElementById('pf-cons').value.trim(),
        prontaEntrega: document.getElementById('pf-pronta').checked,
        encomenda: document.getElementById('pf-encomenda').checked,
        esgotado: document.getElementById('pf-esgotado').checked,
        ativo: true,
        imagens: imagens,
      };

      var ov = lerOverrides();
      if (novo) {
        var novoProduto = Object.assign({}, db._base.produtos[0], campos, { id: novoId, variacoes: [] });
        ov.produtos[novoId] = novoProduto;
      } else {
        ov.produtos[p.id] = Object.assign({}, ov.produtos[p.id] || {}, campos);
      }
      salvar(ov);
      fecharModal();
      SS.ui.toast('Produto salvo (neste navegador).');
      renderProdutos(document.getElementById('busca-prod').value);
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

  /* ------------------------------------------------------------------ */
  /* CATEGORIAS                                                          */
  /* ------------------------------------------------------------------ */
  function renderCategorias() {
    var tbody = document.getElementById('tabela-categorias');
    var cats = db.getCategorias();
    tbody.innerHTML = cats.map(function (c) {
      var count = db.getProdutos().filter(function (p) { return p.categoria === c.id; }).length;
      return (
        '<tr>' +
          '<td><strong>' + (c.icone ? '<iconify-icon icon="ph:' + u.esc(c.icone) + '" width="16" height="16" style="vertical-align:-2px"></iconify-icon> ' : '') + u.esc(c.nome) + '</strong></td>' +
          '<td>' + u.esc(c.id) + '</td>' +
          '<td>' + count + '</td>' +
          '<td><div class="admin-actions">' +
            '<button type="button" class="a-edit" data-editcat="' + u.esc(c.id) + '">Editar</button>' +
            '<button type="button" class="a-del" data-delcat="' + u.esc(c.id) + '"' + (count > 0 ? ' disabled title="Categoria com produtos não pode ser excluída"' : '') + '>Excluir</button>' +
          '</div></td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-editcat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-editcat');
        var cat = db.getCategoria(id);
        abrirModal('Editar categoria',
          '<div class="admin-form"><div class="form-group"><label class="form-label">Nome</label><input class="form-control" id="cf-nome" value="' + u.esc(cat.nome) + '"></div>' +
          '<div class="form-group"><label class="form-label">Ícone (Phosphor)</label><input class="form-control" id="cf-ico" value="' + u.esc(cat.icone) + '"><p class="form-hint">Nome do ícone Phosphor sem prefixo, ex.: cookie, cake, gift, cherries</p></div>' +
          '<div class="form-group"><label class="form-label">Descrição</label><input class="form-control" id="cf-desc" value="' + u.esc(cat.descricao || '') + '"></div></div>',
          '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--primary" id="cf-salvar">Salvar</button>');
        modalOverlay.querySelector('#cf-salvar').addEventListener('click', function () {
          var cats = db.getCategorias().map(function (c) {
            if (c.id !== id) return c;
            return Object.assign({}, c, { nome: document.getElementById('cf-nome').value.trim() || c.nome, icone: document.getElementById('cf-ico').value.trim() || c.icone, descricao: document.getElementById('cf-desc').value.trim() });
          });
          var ov = lerOverrides();
          ov.categorias = cats;
          salvar(ov);
          fecharModal();
          SS.ui.toast('Categoria salva.');
          renderCategorias();
        });
        modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
      });
    });
    tbody.querySelectorAll('[data-delcat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-delcat');
        abrirModal('Excluir categoria', '<p>Excluir a categoria <strong>' + u.esc(id) + '</strong>?</p>',
          '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--dark" data-confirmar>Excluir</button>');
        modalOverlay.querySelector('[data-confirmar]').addEventListener('click', function () {
          var ov = lerOverrides();
          ov.categorias = db.getCategorias().filter(function (c) { return c.id !== id; });
          salvar(ov);
          fecharModal();
          SS.ui.toast('Categoria excluída.');
          renderCategorias();
        });
        modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
      });
    });
  }

  function novaCategoria() {
    abrirModal('Nova categoria',
      '<div class="admin-form"><div class="form-group"><label class="form-label">Nome <span class="req">*</span></label><input class="form-control" id="cf-nome"></div>' +
      '<div class="form-group"><label class="form-label">Ícone (Phosphor)</label><input class="form-control" id="cf-ico" placeholder="cookie"><p class="form-hint">Nome do ícone Phosphor sem prefixo, ex.: cookie, cake, gift, cherries</p></div>' +
      '<div class="form-group"><label class="form-label">Descrição</label><input class="form-control" id="cf-desc"></div></div>',
      '<button type="button" class="btn btn--outline" data-fechar>Cancelar</button><button type="button" class="btn btn--primary" id="cf-salvar">Criar</button>');
    modalOverlay.querySelector('#cf-salvar').addEventListener('click', function () {
      var nome = document.getElementById('cf-nome').value.trim();
      if (!nome) { SS.ui.toast('Informe o nome da categoria.', 'error'); return; }
      var id = u.slugify(nome);
      var ov = lerOverrides();
      var cats = db.getCategorias();
      if (cats.some(function (c) { return c.id === id; })) { SS.ui.toast('Já existe uma categoria com este nome.', 'error'); return; }
      ov.categorias = cats.concat([{ id: id, nome: nome, icone: document.getElementById('cf-ico').value.trim() || 'cookie', descricao: document.getElementById('cf-desc').value.trim(), imagem: cats[0] ? cats[0].imagem : '' }]);
      salvar(ov);
      fecharModal();
      SS.ui.toast('Categoria criada.');
      renderCategorias();
    });
    modalOverlay.querySelector('[data-fechar]').addEventListener('click', fecharModal);
  }

  /* ------------------------------------------------------------------ */
  /* CONFIGURAÇÕES                                                       */
  /* ------------------------------------------------------------------ */
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
    g('cfg-pg-metodos', (ov.pagamentoMetodos || cfg.loja.pagamento.metodos.map(function (m) { return m.nome; })).join(', '));
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
      pagamentoMetodos: document.getElementById('cfg-pg-metodos').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    };
    salvar(ov);
    SS.catalog.db.aplicarConfiguracoes();
    var st = document.getElementById('config-status');
    st.textContent = '✓ Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' (neste navegador).';
  }

  /* ------------------------------------------------------------------ */
  /* PAINEL                                                              */
  /* ------------------------------------------------------------------ */
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
      produtos: db.getProdutos(),
      categorias: db.getCategorias(),
      configuracoes: ov.configuracoes || null,
    };
    var blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogo-sublime-sonhos.json';
    a.click();
    URL.revokeObjectURL(a.href);
    SS.ui.toast('Catálogo exportado.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();
    document.getElementById('login-form').addEventListener('submit', function (e) { e.preventDefault(); login(); });
    document.getElementById('btn-sair').addEventListener('click', logout);
    document.getElementById('btn-novo').addEventListener('click', function () { abrirFormProduto(null); });
    document.getElementById('btn-nova-cat').addEventListener('click', novaCategoria);
    document.getElementById('btn-exportar').addEventListener('click', exportarCatalogo);
    document.getElementById('busca-prod').addEventListener('input', u.debounce(function () { renderProdutos(document.getElementById('busca-prod').value); }, 250));
    document.getElementById('cfg-ent-modo').addEventListener('change', toggleTaxaFields);
    SS.ui.initCustomSelects();
    document.getElementById('form-config').addEventListener('submit', salvarConfig);
    modalOverlay = document.getElementById('modal');
    modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) fecharModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharModal(); });
    initTabs();
    if (estaLogado()) mostrarPainel();
  });
})(window.SS);