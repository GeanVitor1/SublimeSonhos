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
  var itens = []; /* {id, qty, obs} */
  var dados = {
    data: '', hora: '', evento: '', pessoas: '', cliente: '', telefone: '',
    modalidade: 'retirada',
    endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: cfg.loja.cidade, referencia: '' },
    pagamento: '', momentoPagamento: '', troco: false, trocoPara: '',
    card: { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' }, pagamentoAprovado: false,
    observacoes: '',
  };

  function prazoMinimoDias() {
    var max = cfg.loja.antecedenciaMinimaDias;
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

  function subtotalItens() {
    var total = 0;
    itens.forEach(function (it) {
      var p = SS.catalog.db.getProduto(it.id);
      if (p && p.preco !== null && p.preco !== undefined) total += p.preco * it.qty;
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
    var passos = [];
    for (var i = 1; i <= TOTAIS; i++) {
      passos.push('<div class="steps-bar__item' + (i < passo ? ' done' : i === passo ? ' active' : '') + '"></div>');
    }
    el.innerHTML =
      '<div class="steps-bar" aria-hidden="true">' + passos.join('') + '</div>' +
      '<div class="checkout-grid">' +
        '<div id="painel-esquerda"></div>' +
        '<aside class="panel" id="painel-resumo" style="position:sticky;top:calc(var(--header-h) + 20px)"></aside>' +
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
            return (
              '<div class="order-summary-item">' +
                (p && p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '') +
                '<div class="order-summary-item__body"><div class="order-summary-item__name">' + it.qty + 'x ' + u.esc(p ? p.nome : it.id) + '</div>' + (it.obs ? '<div class="order-summary-item__opts">Obs.: ' + u.esc(it.obs) + '</div>' : '') + '</div>' +
                '<div class="order-summary-item__price">' + (p && p.preco !== null && p.preco !== undefined ? u.fmtBRL(p.preco * it.qty) : 'Sob consulta') + '</div>' +
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
  function renderPasso() {
    var el = document.getElementById('painel-esquerda');
    var html = '';

    if (passo === 1) {
      var min = dataMinimaISO();
      var hoje = u.hojeISO();
      var horarios = [];
      for (var h = 8; h <= 19; h++) horarios.push('<option value="' + String(h).padStart(2, '0') + ':00"' + (dados.hora === String(h).padStart(2, '0') + ':00' ? ' selected' : '') + '>' + String(h).padStart(2, '0') + ':00</option>');
      html =
        '<div class="panel"><h2><span class="n">1</span> Data e evento</h2><div class="panel__body">' +
          '<div class="form-grid">' +
            '<div class="form-group" id="g-data"><label class="form-label" for="f-data">Data desejada <span class="req">*</span></label><input class="form-control" id="f-data" type="date" min="' + min + '" value="' + u.esc(dados.data) + '"><div class="form-error">Escolha uma data futura respeitando o prazo de produção.</div><p class="form-hint">Prazo mínimo: ' + prazoMinimoDias() + ' dia' + (prazoMinimoDias() === 1 ? '' : 's') + ' a partir de hoje. A data depende da confirmação da loja.</p></div>' +
            '<div class="form-group" id="g-hora"><label class="form-label" for="f-hora">Horário <span class="req">*</span></label><select class="form-control" id="f-hora"><option value="">Selecione…</option>' + horarios.join('') + '</select><div class="form-error">Escolha o horário.</div><p class="form-hint">Horário sujeito à confirmação.</p></div>' +
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

    var nav =
      '<div class="flex gap-3 mt-4" style="flex-wrap:wrap">' +
        (passo > 1 ? '<button type="button" class="btn btn--outline" id="btn-voltar">← Voltar</button>' : '<a class="btn btn--outline" href="index.html#destaques">← Continuar comprando</a>') +
        (passo < TOTAIS && passo !== 4 ? '<button type="button" class="btn btn--primary btn--lg" id="btn-avancar">Continuar →</button>' : '') +
        (passo === TOTAIS ? '<a class="btn btn--outline" href="index.html#destaques">Continuar comprando</a>' : '') +
      '</div>';

    el.innerHTML = html + nav;

    if (passo === 1) initPassoData();
    if (passo === 2) initPassoProdutos();
    if (passo === 3) initPassoEntrega();
    if (passo === 4) initPassoPagamento();

    /* Convert native selects to custom dropdowns (always open downward) */
    SS.ui.initCustomSelects(el);

    var av = document.getElementById('btn-avancar');
    if (av) av.addEventListener('click', function () { if (validarPasso()) { passo++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    var vo = document.getElementById('btn-voltar');
    if (vo) vo.addEventListener('click', function () { passo--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* -------------------------- ETAPA 1 ------------------------------- */
  function initPassoData() {
    var d = document.getElementById('f-data');
    // digitação livre: apenas salva o valor, sem bloquear/limpar
    // a validação de prazo mínimo acontece em validarPasso() ao clicar em Continuar
    d.addEventListener('change', function () {
      dados.data = d.value;
      document.getElementById('g-data').classList.remove('invalid');
    });
    d.addEventListener('input', function () {
      // mantém dados.data sincronizado enquanto digita, sem validação agressiva
      dados.data = d.value;
      if (d.value) document.getElementById('g-data').classList.remove('invalid');
    });
    var h = document.getElementById('f-hora');
    h.addEventListener('change', function () { dados.hora = h.value; document.getElementById('g-hora').classList.remove('invalid'); });
    var e = document.getElementById('f-evento');
    e.addEventListener('change', function () { dados.evento = e.value; document.getElementById('g-evento').classList.remove('invalid'); });
    var p = document.getElementById('f-pessoas');
    p.addEventListener('input', function () { dados.pessoas = u.apenasDigitos(p.value); p.value = dados.pessoas; });
  }

  /* -------------------------- ETAPA 2 ------------------------------- */
  function initPassoProdutos() {
    var catSel = 'todos';
    function renderMini() {
      var grid = document.getElementById('enc-mini-cat');
      var produtos = SS.catalog.db.getProdutos().filter(function (p) { return catSel === 'todos' || p.categoria === catSel; });
      grid.innerHTML = produtos.map(function (p) {
        var ja = itens.filter(function (i) { return i.id === p.id; })[0];
        return (
          '<div class="mini-prod" data-prod="' + u.esc(p.id) + '">' +
            (p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '') +
            '<div class="mini-prod__body">' +
              '<div class="mini-prod__name">' + u.esc(p.nome) + '</div>' +
              '<div class="mini-prod__price">' + (p.preco === null || p.preco === undefined ? 'Sob consulta' : u.fmtBRL(p.preco)) + '</div>' +
              (ja ? '<div class="text-sm" style="color:var(--success);font-weight:700">' + ja.qty + 'x na lista</div>' : '') +
            '</div>' +
            '<button type="button" class="mini-prod__add" aria-label="Adicionar ' + u.esc(p.nome) + '">+</button>' +
          '</div>'
        );
      }).join('') || '<p class="text-muted text-sm">Nenhum produto nesta categoria.</p>';
      grid.querySelectorAll('[data-prod]').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('button')) return;
          var id = card.getAttribute('data-prod');
          var p = obterProduto(id);
          if (!p) return;
          var qtyStr = prompt('Quantidade de "' + p.nome + '":', String(itens.filter(function (i) { return i.id === id; })[0] ? itens.filter(function (i) { return i.id === id; })[0].qty : 1));
          if (qtyStr === null) return;
          var q = Math.max(1, Number(qtyStr) || 1);
          adicionarItem(id, q, '');
        });
      });
      grid.querySelectorAll('.mini-prod__add').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.closest('.mini-prod').getAttribute('data-prod');
          var p = obterProduto(id);
          if (!p) return;
          var qtyStr = prompt('Quantidade de "' + p.nome + '":', String(itens.filter(function (i) { return i.id === id; })[0] ? itens.filter(function (i) { return i.id === id; })[0].qty : 1));
          if (qtyStr === null) return;
          var q = Math.max(1, Number(qtyStr) || 1);
          adicionarItem(id, q, '');
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
    renderMini();
    renderListaItens();
  }

  function adicionarItem(id, qty, obs) {
    var existente = itens.filter(function (i) { return i.id === id; })[0];
    if (existente) existente.qty += qty;
    else itens.push({ id: id, qty: qty, obs: obs || '' });
    renderListaItens();
    renderResumo();
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
      itens.map(function (it) {
        var p = obterProduto(it.id);
        return (
          '<div class="order-summary-item" style="align-items:center">' +
            (p && p.imagens && p.imagens[0] ? '<img src="' + u.esc(p.imagens[0]) + '" alt="' + u.esc(p.nome) + '" loading="lazy">' : '') +
            '<div class="order-summary-item__body">' +
              '<div class="order-summary-item__name">' + u.esc(p ? p.nome : it.id) + '</div>' +
              (p && (p.sabores && p.sabores.length || p.tamanhos && p.tamanhos.length) ? '<div class="order-summary-item__opts">Consulte sabores/tamanhos com a loja</div>' : '') +
              '<div class="flex gap-3 items-center mt-2">' +
                '<div class="qty">' +
                  '<button type="button" data-encqtd="-1" data-id="' + u.esc(it.id) + '" aria-label="Diminuir">−</button>' +
                  '<input type="text" inputmode="numeric" value="' + it.qty + '" data-encinput="' + u.esc(it.id) + '" aria-label="Quantidade">' +
                  '<button type="button" data-encqtd="1" data-id="' + u.esc(it.id) + '" aria-label="Aumentar">+</button>' +
                '</div>' +
                '<button type="button" class="cart-item__remove" data-encdel="' + u.esc(it.id) + '">Remover</button>' +
              '</div>' +
            '</div>' +
            '<div class="order-summary-item__price">' + (p && p.preco !== null && p.preco !== undefined ? u.fmtBRL(p.preco * it.qty) : 'Sob consulta') + '</div>' +
          '</div>'
        );
      }).join('');

    el.querySelectorAll('[data-encqtd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var it = itens.filter(function (i) { return i.id === b.getAttribute('data-id'); })[0];
        if (!it) return;
        it.qty = Math.max(1, it.qty + Number(b.getAttribute('data-encqtd')));
        renderListaItens(); renderResumo();
      });
    });
    el.querySelectorAll('[data-encinput]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var it = itens.filter(function (i) { return i.id === inp.getAttribute('data-encinput'); })[0];
        if (!it) return;
        it.qty = Math.max(1, Number(inp.value) || 1);
        renderListaItens(); renderResumo();
      });
    });
    el.querySelectorAll('[data-encdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        itens = itens.filter(function (i) { return i.id !== b.getAttribute('data-encdel'); });
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
    return (
      '<div class="review-block"><h3>Evento</h3><ul>' +
        '<li>Data: ' + (dados.data ? u.fmtDataLongo(dados.data) : '—') + (dados.hora ? ' às ' + dados.hora : '') + '</li>' +
        '<li>Tipo: ' + u.esc(dados.evento || '—') + (dados.pessoas ? ' · Pessoas: ' + dados.pessoas : '') + '</li>' +
      '</ul></div>' +
      '<div class="review-block"><h3>Itens</h3><ul>' +
        itens.map(function (it) {
          var p = obterProduto(it.id);
          return '<li>' + it.qty + 'x ' + u.esc(p ? p.nome : it.id) + (it.obs ? ' — Obs.: ' + u.esc(it.obs) : '') + ' — ' + (p && p.preco !== null && p.preco !== undefined ? u.fmtBRL(p.preco * it.qty) : 'sob consulta') + '</li>';
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
    var pedido = {
      numero: u.gerarNumeroPedido(),
      tipo: 'Encomenda agendada',
      cliente: dados.cliente || '',
      telefone: dados.telefone || '',
      itens: itens.map(function (it) {
        var p = obterProduto(it.id);
        return {
          nome: p ? p.nome : it.id,
          qty: it.qty,
          observacao: it.obs,
          unitPrice: p ? p.preco : null,
          variacoes: {},
          adicionais: [],
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
      observacoes: dados.observacoes,
    };
    var msg = SS.whatsapp.montarMensagemPedido(pedido);
    SS.whatsapp.abrir(msg, true);
    SS.ui.toast('Abrindo WhatsApp… envie a mensagem para solicitar a encomenda.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();
    render();
  });
})(window.SS);