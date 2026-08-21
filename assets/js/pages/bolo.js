/* =========================================================================
   SUBLIME SONHOS — BOLO PERSONALIZADO (valor sob consulta)
   Envia todas as especificações pelo WhatsApp para a loja preparar o
   orçamento. A foto de referência é orientada a ser enviada na conversa.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;
  var cfg = SS.config;

  /* Estado do pagamento (gerenciado pelo módulo pagamento.js). */
  var pg = {
    momentoPagamento: 'na-entrega',
    pagamento: '',
    card: { numero: '', nome: '', validade: '', cvv: '', parcelas: '1' },
    troco: false, trocoPara: '',
    pagamentoAprovado: false,
  };

  function lerCampo(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function marcarInvalido(id) {
    var g = document.getElementById('g-' + id);
    if (g) g.classList.add('invalid');
  }

  function validarCampos() {
    var ok = true;
    var obrigatorios = ['tamanho', 'massa', 'recheio', 'cobertura', 'data', 'hora', 'nome', 'telefone'];
    obrigatorios.forEach(function (id) {
      if (!lerCampo('f-' + id)) { marcarInvalido(id); ok = false; }
    });
    // valida prazo mínimo sem travar digitação: só no envio
    var dataVal = lerCampo('f-data');
    if (dataVal) {
      var dt = u.dataDeInput(dataVal);
      var minMid = u.dataDeInput(document.getElementById('f-data').min);
      if (dt && minMid && dt < minMid) {
        marcarInvalido('data');
        SS.ui.toast('Escolha uma data com no mínimo 3 dias de antecedência.', 'error');
        ok = false;
      }
    }
    if (!ok) { if (!document.querySelector('.invalid')) SS.ui.toast('Preencha os campos obrigatórios marcados em vermelho.', 'error'); return false; }
    return true;
  }

  function enviar() {
    var modalidade = document.querySelector('input[name="modalidade"]:checked');
    modalidade = modalidade ? modalidade.value : 'retirada';
    var end = {
      rua: lerCampo('f-rua'), numero: lerCampo('f-numero'),
      complemento: lerCampo('f-complemento'), bairro: lerCampo('f-bairro'),
      cidade: lerCampo('f-cidade'), referencia: lerCampo('f-refend'),
    };
    var pedido = {
      numero: u.gerarNumeroPedido(),
      tipo: 'Orçamento de bolo personalizado',
      cliente: lerCampo('f-nome'),
      telefone: lerCampo('f-telefone'),
      tamanho: lerCampo('f-tamanho'),
      peso: lerCampo('f-peso'),
      pessoas: lerCampo('f-pessoas'),
      massa: lerCampo('f-massa'),
      recheio: lerCampo('f-recheio'),
      cobertura: lerCampo('f-cobertura'),
      tema: lerCampo('f-tema'),
      cores: lerCampo('f-cores'),
      decoracao: lerCampo('f-decoracao'),
      topo: lerCampo('f-topo'),
      mensagem: lerCampo('f-mensagem'),
      referencia: lerCampo('f-ref'),
      data: lerCampo('f-data'),
      hora: lerCampo('f-hora'),
      modalidade: modalidade,
      endereco: modalidade === 'entrega' ? end : null,
      pagamento: pg.pagamento,
      momentoPagamento: pg.momentoPagamento === 'antecipado' ? 'Antecipado' : 'Na entrega/retirada',
      pagamentoSimulado: pg.pagamentoAprovado,
      cardMarca: SS.pagamento.cardMarca(pg),
      cardUltimos4: SS.pagamento.cardUltimos4(pg),
      observacoes: lerCampo('f-obs'),
    };

    var msg = SS.whatsapp.montarMensagemBolo(pedido);
    SS.whatsapp.abrir(msg, true);
    SS.ui.toast('Abrindo WhatsApp… envie para receber o orçamento.');
    mostrarSucesso();
  }

  function mostrarSucesso() {
    var form = document.getElementById('painel-form');
    var sucesso = document.getElementById('bolo-sucesso');
    if (form) form.classList.add('hidden');
    if (sucesso) {
      sucesso.classList.remove('hidden');
      sucesso.innerHTML =
        '<div class="pag-confirmado" role="status">' +
          '<iconify-icon icon="ph:check-circle" width="48" height="48"></iconify-icon>' +
          '<h3>Obrigado! Seu orçamento foi enviado pelo WhatsApp</h3>' +
          '<p>A mensagem foi formatada e enviada para a confeitaria. Respondemos com valor, prazo e confirmação em breve.</p>' +
          '<a class="btn btn--outline btn--lg mt-3" href="bolo-personalizado.html">Nova encomenda de bolo</a>' +
        '</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    SS.catalog.db.aplicarConfiguracoes();

    var hojeMeiaNoite = new Date(); hojeMeiaNoite.setHours(0,0,0,0);
    var min = u.addDias(hojeMeiaNoite, 3);
    var minISO = u.dataParaInput(min);
    var dataEl = document.getElementById('f-data');
    if (dataEl) {
      dataEl.min = minISO;
      // digitação livre: não apaga/limpa no change, validação só no envio
      dataEl.addEventListener('change', function () {
        document.getElementById('g-data').classList.remove('invalid');
      });
      dataEl.addEventListener('input', function () {
        if (dataEl.value) document.getElementById('g-data').classList.remove('invalid');
      });
    }

    var horas = [];
    for (var h = 8; h <= 19; h++) horas.push('<option value="' + String(h).padStart(2, '0') + ':00">' + String(h).padStart(2, '0') + ':00</option>');
    var horaEl = document.getElementById('f-hora');
    if (horaEl) {
      horaEl.innerHTML = '<option value="">Selecione…</option>' + horas.join('');
      horaEl.addEventListener('change', function () { document.getElementById('g-hora').classList.remove('invalid'); });
    }

    document.querySelectorAll('input[name="modalidade"]').forEach(function (r) {
      r.addEventListener('change', function () {
        document.querySelectorAll('input[name="modalidade"]').forEach(function (x) { x.closest('.opt').classList.toggle('selected', x.checked); });
        document.getElementById('endereco-fields').classList.toggle('hidden', r.value !== 'entrega');
      });
    });

    var tel = document.getElementById('f-telefone');
    if (tel) tel.addEventListener('input', function () { tel.value = u.mascaraTelefone(tel.value); document.getElementById('g-telefone').classList.remove('invalid'); });
    var pessoasEl = document.getElementById('f-pessoas');
    if (pessoasEl) pessoasEl.addEventListener('input', function (ev) { ev.target.value = u.apenasDigitos(ev.target.value); });
    ['f-tamanho', 'f-massa', 'f-recheio', 'f-cobertura', 'f-nome'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () { document.getElementById('g-' + id).classList.remove('invalid'); });
    });

    /* Pagamento: checkboxes com ícone + área dinâmica (Pix/cartão/troco) e
       botão "Simular pagamento", todos gerenciados pelo módulo pagamento.js. */
    var controles = document.getElementById('pg-controles');
    if (controles) controles.innerHTML = SS.pagamento.renderControles(pg);
    SS.pagamento.init(document.getElementById('form-bolo'), pg, enviar, { onValidarExtra: validarCampos });

    /* A ação de envio é o botão "Simular pagamento"; evita submissão nativa. */
    var formBolo = document.getElementById('form-bolo');
    if (formBolo) formBolo.addEventListener('submit', function (e) { e.preventDefault(); });

    SS.ui.initCustomSelects();
  });
})(window.SS);
