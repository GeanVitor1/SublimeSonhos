/* =========================================================================
   SUBLIME SONHOS — CARRINHO (persistência temporária no localStorage)
   =========================================================================
   O carrinho fica salvo no navegador do cliente (localStorage) apenas para
   manter os itens durante a navegação. Ele NÃO é um banco de dados da loja.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var KEY = 'ss_cart_v1';
  var listeners = [];

  function ler() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function salvar(itens) {
    try { localStorage.setItem(KEY, JSON.stringify(itens)); } catch (e) { /* ignore */ }
    notify();
  }

  function notify() {
    var data = { itens: ler() };
    listeners.forEach(function (fn) { try { fn(data); } catch (e) {} });
  }

  function on(fn) { listeners.push(fn); }

  /* Calcula o preço unitário de um produto com base na seleção feita.
     Retorna null quando o produto não tem preço definido (sob consulta) —
     encomendas com valor sob consulta não podem ser finalizadas como
     pedido rápido (carrinho); devem usar encomenda.html. */
  function calcularPrecoUnitario(produto, selecao) {
    if (produto.preco === null || produto.preco === undefined || produto.precoSobConsulta) {
      return null;
    }
    var preco = produto.preco;
    Object.keys(selecao.variacoes || {}).forEach(function (k) {
      var v = selecao.variacoes[k];
      var arr = Array.isArray(v) ? v : (v && v.nome ? [v] : []);
      arr.forEach(function (it) { if (it.acrescimo) preco += Number(it.acrescimo) || 0; });
    });
    (selecao.adicionais || []).forEach(function (nome) {
      var extra = (produto.adicionais || []).filter(function (a) { return a.nome === nome; })[0];
      if (extra && extra.preco) preco += Number(extra.preco) || 0;
    });
    return Math.round(preco * 100) / 100;
  }

  function gerarUID() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function getItens() { return ler(); }

  function getItem(uid) { return ler().filter(function (i) { return i.uid === uid; })[0] || null; }

  function adicionar(produto, selecao) {
    var itens = ler();
    selecao = selecao || {};
    var qty = Math.max(1, Number(selecao.qty) || 1);
    var unitPrice = calcularPrecoUnitario(produto, selecao);
    var item = {
      uid: gerarUID(),
      id: produto.id,
      nome: produto.nome,
      imagem: (produto.imagens && produto.imagens[0]) || '',
      unidade: produto.unidade || 'un',
      qty: qty,
      variacoes: selecao.variacoes || {},
      adicionais: selecao.adicionais || [],
      observacao: selecao.observacao || '',
      unitPrice: unitPrice,
    };
    itens.push(item);
    salvar(itens);
    return item;
  }

  function atualizarQtd(uid, qty) {
    var itens = ler();
    var it = itens.filter(function (i) { return i.uid === uid; })[0];
    if (!it) return;
    it.qty = Math.max(1, Number(qty) || 1);
    salvar(itens);
  }

  function remover(uid) {
    salvar(ler().filter(function (i) { return i.uid !== uid; }));
  }

  function limpar() { salvar([]); }

  function contar() {
    return ler().reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function subtotal() {
    return ler().reduce(function (s, i) {
      if (i.unitPrice === null || i.unitPrice === undefined) return s;
      return s + i.unitPrice * i.qty;
    }, 0);
  }

  /* Preço unitário atual de um item do carrinho (sem a qty). */
  function precoUnitarioItem(item) {
    return item.unitPrice === null || item.unitPrice === undefined ? null : item.unitPrice;
  }

  function temItensSobConsulta() {
    return ler().some(function (i) { return i.unitPrice === null || i.unitPrice === undefined; });
  }

  function formatarOpcoes(item) {
    var partes = [];
    Object.keys(item.variacoes || {}).forEach(function (k) {
      var v = item.variacoes[k];
      var arr = Array.isArray(v) ? v : (v && v.nome ? [v] : []);
      arr.forEach(function (it) { if (it.nome) partes.push(it.nome); });
    });
    (item.adicionais || []).forEach(function (a) { partes.push('+ ' + a); });
    return partes.join(' · ');
  }

  SS.cart = {
    KEY: KEY,
    on: on,
    getItens: getItens,
    getItem: getItem,
    adicionar: adicionar,
    atualizarQtd: atualizarQtd,
    remover: remover,
    limpar: limpar,
    contar: contar,
    subtotal: subtotal,
    precoUnitarioItem: precoUnitarioItem,
    temItensSobConsulta: temItensSobConsulta,
    formatarOpcoes: formatarOpcoes,
    calcularPrecoUnitario: calcularPrecoUnitario,
  };
})(window.SS);