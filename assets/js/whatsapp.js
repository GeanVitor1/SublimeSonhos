/* =========================================================================
   SUBLIME SONHOS — GERAÇÃO DE MENSAGENS E LINKS DO WHATSAPP
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  var u = SS.utils;

  function linhaItem(item, idx) {
    var lines = [];
    var prefixo = item.qty + 'x ' + item.nome;
    var opcoes = SS.cart.formatarOpcoes(item);
    if (opcoes) prefixo += ' (' + opcoes + ')';
    lines.push(prefixo);
    if (item.observacao) lines.push('  Observação: ' + item.observacao);
    if (item.unitPrice !== null && item.unitPrice !== undefined) {
      lines.push('  Subtotal: ' + u.fmtBRL(item.unitPrice * item.qty));
    } else {
      lines.push('  Valor: sob consulta');
    }
    return lines.join('\n');
  }

  function enderecoTexto(end) {
    if (!end) return '';
    var partes = [];
    if (end.rua) partes.push(end.rua + (end.numero ? ', ' + end.numero : ''));
    if (end.complemento) partes.push(end.complemento);
    if (end.bairro) partes.push(end.bairro);
    if (end.cidade) partes.push(end.cidade + (end.uf ? ' - ' + end.uf : ''));
    if (end.cep) partes.push('CEP ' + end.cep);
    if (end.referencia) partes.push('Referência: ' + end.referencia);
    return partes.join(', ');
  }

  /* ------------------------------------------------------------------ */
  /* PEDIDO RÁPIDO (pronta entrega) ou ENCOMENDA AGENDADA                */
  /* ------------------------------------------------------------------ */
  function montarMensagemPedido(o) {
    var now = new Date();
    var lines = [];
    lines.push('Olá! Gostaria de solicitar o seguinte pedido:');
    lines.push('');
    lines.push('PEDIDO: #' + (o.numero || 'sem número'));
    lines.push('SOLICITADO: ' + now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    lines.push('TIPO: ' + o.tipo);
    lines.push('CLIENTE: ' + (o.cliente || '—'));
    if (o.telefone) lines.push('TELEFONE: ' + o.telefone);
    lines.push('');

    lines.push('ITENS');
    (o.itens || []).forEach(function (item, i) {
      lines.push(linhaItem(item, i + 1));
    });

    lines.push('');
    lines.push('ENTREGA');
    if (o.encomenda && o.encomenda.data) {
      lines.push('Data: ' + u.fmtData(o.encomenda.data) + (o.encomenda.hora ? ' às ' + o.encomenda.hora : ''));
    }
    if (o.encomenda && o.encomenda.evento) lines.push('Evento: ' + o.encomenda.evento);
    if (o.encomenda && o.encomenda.pessoas) lines.push('Pessoas: ' + o.encomenda.pessoas);
    lines.push('Modalidade: ' + (o.modalidade === 'retirada' ? 'Retirada no local' : 'Entrega'));
    if (o.modalidade === 'entrega' && o.endereco) {
      lines.push('Endereço: ' + enderecoTexto(o.endereco));
    }
    if (o.observacoes) lines.push('Observações gerais: ' + o.observacoes);

    lines.push('');
    lines.push('PAGAMENTO');
    lines.push('Forma: ' + (o.pagamento || '—'));
    lines.push('Momento: ' + (o.momentoPagamento || '—'));
    if (o.pixTxid) {
      lines.push('Pix TXID: ' + o.pixTxid);
      if (o.pixValor !== null && o.pixValor !== undefined) lines.push('Pix valor: ' + u.fmtBRL(o.pixValor));
      if (o.pixStatus) {
        var pixLabel = { 'pago':'Pix PAGO (confirmado)', 'aguardando_confirmacao':'Pix informado — aguardando confirmação da loja', 'pendente':'Pix pendente', 'expirado':'Pix expirado' };
        lines.push('Pix status: ' + (pixLabel[o.pixStatus] || o.pixStatus));
      }
    }
    if (o.pagamentoSimulado) {
      if (o.pagamento === 'PIX' && o.pixStatus === 'pago') lines.push('Situação: Pix pago e confirmado');
      else if (o.pagamento === 'PIX' && o.pixStatus === 'aguardando_confirmacao') lines.push('Situação: Cliente informou pagamento Pix — aguardando confirmação da loja');
      else if (o.pagamento === 'PIX') lines.push('Situação: Pix gerado — aguardando pagamento');
      else lines.push('Situação: pagamento confirmado — aguardando validação da loja');
    }
    if (o.cardUltimos4) lines.push('Cartão: ' + u.esc(o.cardMarca) + ' ···· ' + o.cardUltimos4);
    if (o.troco) lines.push('Troco: precisa de troco para ' + u.fmtBRL(o.troco));
    else if (o.pagamento === 'Dinheiro') lines.push('Troco: não precisa');

    lines.push('');
    lines.push('Subtotal: ' + u.fmtBRL(o.subtotal));
    lines.push('Entrega: ' + (o.entregaValor === null ? 'a confirmar' : u.fmtBRL(o.entregaValor)));
    if (o.total !== null) lines.push('Total estimado: ' + u.fmtBRL(o.total));
    lines.push('');
    lines.push('Entendo que o pedido depende da confirmação de disponibilidade, prazo e entrega pela confeitaria.');

    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* BOLO PERSONALIZADO (valor sob consulta)                             */
  /* ------------------------------------------------------------------ */
  function montarMensagemBolo(o) {
    var now = new Date();
    var lines = [];
    lines.push('Olá! Gostaria de solicitar um orçamento de bolo personalizado:');
    lines.push('');
    lines.push('PEDIDO: #' + o.numero);
    lines.push('SOLICITADO: ' + now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    lines.push('CLIENTE: ' + (o.cliente || '—'));
    if (o.telefone) lines.push('TELEFONE: ' + o.telefone);
    lines.push('');

    lines.push('ESPECIFICAÇÕES DO BOLO');
    if (o.tamanho) lines.push('Tamanho: ' + o.tamanho);
    if (o.peso) lines.push('Peso: ' + o.peso);
    if (o.pessoas) lines.push('Pessoas: ' + o.pessoas);
    if (o.massa) lines.push('Massa: ' + o.massa);
    if (o.recheio) lines.push('Recheio: ' + o.recheio);
    if (o.cobertura) lines.push('Cobertura: ' + o.cobertura);
    if (o.tema) lines.push('Tema: ' + o.tema);
    if (o.cores) lines.push('Cores: ' + o.cores);
    if (o.decoracao) lines.push('Decoração: ' + o.decoracao);
    if (o.topo) lines.push('Topo de bolo: ' + o.topo);
    if (o.mensagem) lines.push('Mensagem: ' + o.mensagem);
    if (o.referencia) lines.push('Referência: ' + o.referencia);

    lines.push('');
    lines.push('DATA');
    lines.push('Data desejada: ' + u.fmtData(o.data) + (o.hora ? ' às ' + o.hora : ''));
    lines.push('Modalidade: ' + (o.modalidade === 'retirada' ? 'Retirada no local' : 'Entrega'));
    if (o.modalidade === 'entrega' && o.endereco) {
      lines.push('Endereço: ' + enderecoTexto(o.endereco));
    }
    if (o.observacoes) lines.push('Observações: ' + o.observacoes);

    lines.push('');
    lines.push('PAGAMENTO');
    lines.push('Forma: ' + (o.pagamento || '—'));
    lines.push('Momento: ' + (o.momentoPagamento || '—'));
    if (o.pixTxid) {
      lines.push('Pix TXID: ' + o.pixTxid);
      if (o.pixStatus) {
        var pixLabelB = { 'pago':'Pix PAGO (confirmado)', 'aguardando_confirmacao':'Pix informado — aguardando confirmação da loja', 'pendente':'Pix pendente' };
        lines.push('Pix status: ' + (pixLabelB[o.pixStatus] || o.pixStatus));
      }
    }
    if (o.pagamentoSimulado) {
      if (o.pagamento === 'PIX' && o.pixStatus === 'pago') lines.push('Situação: Pix pago e confirmado');
      else if (o.pagamento === 'PIX' && o.pixStatus) lines.push('Situação: Pix ' + o.pixStatus);
      else lines.push('Situação: pagamento confirmado — aguardando validação da loja');
    }
    if (o.cardUltimos4) lines.push('Cartão: ' + u.esc(o.cardMarca) + ' ···· ' + o.cardUltimos4);

    lines.push('');
    lines.push('VALOR: sob consulta');
    lines.push('');
    lines.push('Entendo que o valor e a disponibilidade serão confirmados pela confeitaria.');

    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* LINKS                                                               */
  /* ------------------------------------------------------------------ */
  function linkNumero() { return 'https://wa.me/' + SS.config.whatsapp.numero; }

  function linkComTexto(texto) {
    return linkNumero() + '?text=' + encodeURIComponent(texto);
  }

  function linkContato() {
    var l = SS.config.whatsapp.linkComercial || linkComTexto(SS.config.whatsapp.mensagemContato);
    return l;
  }

  function abrir(texto, novaAba) {
    var url = linkComTexto(texto);
    if (novaAba) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
    return url;
  }

  SS.whatsapp = {
    montarMensagemPedido: montarMensagemPedido,
    montarMensagemBolo: montarMensagemBolo,
    linkNumero: linkNumero,
    linkComTexto: linkComTexto,
    linkContato: linkContato,
    abrir: abrir,
  };
})(window.SS);