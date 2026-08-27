/* =========================================================================
   SUBLIME SONHOS — UTILITÁRIOS (formatação, máscaras, datas)
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function fmtBRL(v) {
    if (v === null || v === undefined || v === '' || isNaN(v)) return '—';
    if (typeof v === 'string' && v.trim() === '') return '—';
    return brl.format(v);
  }

  function parseLocal(d) {
    if (!d) return null;
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      var p = d.split('-').map(Number);
      var x = new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
      return isNaN(x.getTime()) ? null : x;
    }
    var y = new Date(d);
    return isNaN(y.getTime()) ? null : y;
  }

  function fmtData(d) {
    var x = parseLocal(d);
    if (!x) return '';
    return x.toLocaleDateString('pt-BR');
  }

  function fmtDataLongo(d) {
    var x = parseLocal(d);
    if (!x) return '';
    return x.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  function fmtHora(h) {
    if (!h) return '';
    return String(h).padStart(2, '0') + ':00';
  }

  function apenasDigitos(s) {
    return String(s || '').replace(/\D/g, '');
  }

  /* Máscara de telefone brasileiro: (73) 98175-6809 */
  function mascaraTelefone(v) {
    var d = apenasDigitos(v).slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  /* Máscara de CEP: 45645-000 */
  function mascaraCEP(v) {
    var d = apenasDigitos(v).slice(0, 8);
    if (d.length <= 5) return d;
    return d.slice(0, 5) + '-' + d.slice(5);
  }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, a); }, ms || 250);
    };
  }

  /* Soma uma quantidade de dias a uma data local (retorna Date). */
  function addDias(date, dias) {
    var d = new Date(date);
    d.setDate(d.getDate() + dias);
    return d;
  }

  /* Data de hoje no formato yyyy-mm-dd (para inputs date). */
  function hojeISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* Converte uma data de input (yyyy-mm-dd) para Date local à meia-noite. */
  function dataDeInput(v) {
    if (!v) return null;
    var p = String(v).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function dataParaInput(d) {
    var x = new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }

  function gerarNumeroPedido() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  /* Placeholder local (SVG nas cores da marca) usado quando uma imagem
     de produto não estiver disponível ou falhar ao carregar. Não depende
     de nenhum recurso externo. */
  function imgFallback() {
    return ("data:image/svg+xml;utf8," +
      "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E" +
      "%3Crect width='400' height='300' fill='%23f3c9d7'/%3E" +
      "%3Cellipse cx='200' cy='232' rx='118' ry='15' fill='%23c49a5a'/%3E" +
      "%3Crect x='118' y='178' width='164' height='54' rx='9' fill='%23eeb3c7'/%3E" +
      "%3Crect x='140' y='128' width='120' height='50' rx='9' fill='%23d97a99'/%3E" +
      "%3Crect x='160' y='84' width='80' height='44' rx='9' fill='%23c25a7c'/%3E" +
      "%3Crect x='196' y='58' width='8' height='26' fill='%235b1e33'/%3E" +
      "%3Ccircle cx='200' cy='52' r='7' fill='%23c49a5a'/%3E" +
      "%3Ctext x='200' y='150' font-family='Georgia, serif' font-size='26' font-style='italic' text-anchor='middle' fill='%235b1e33'%3ESublime Sonhos%3C/text%3E" +
      "%3C/svg%3E").replace(/'/g, '%27');
  }

  /* Atributo onerror pronto para usar nos <img> injetados por JS.
     (aspas internas do data URI vão percent-encoded para não quebrar o handler) */
  function imgFallbackAttr() {
    return ' onerror="this.onerror=null;this.src=\'' + imgFallback() + '\';"';
  }

  SS.utils = {
    fmtBRL: fmtBRL,
    imgFallback: imgFallback,
    imgFallbackAttr: imgFallbackAttr,
    fmtData: fmtData,
    fmtDataLongo: fmtDataLongo,
    fmtHora: fmtHora,
    apenasDigitos: apenasDigitos,
    mascaraTelefone: mascaraTelefone,
    mascaraCEP: mascaraCEP,
    slugify: slugify,
    esc: esc,
    debounce: debounce,
    addDias: addDias,
    hojeISO: hojeISO,
    dataDeInput: dataDeInput,
    dataParaInput: dataParaInput,
    gerarNumeroPedido: gerarNumeroPedido,
  };
})(window.SS);