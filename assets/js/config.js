/* =========================================================================
   SUBLIME SONHOS — CONFIGURAÇÕES DA LOJA
   =========================================================================
   TODAS as informações da loja ficam centralizadas aqui.
   A proprietária pode editar estes valores ou usar a área administrativa
   (/admin.html), que salva as alterações neste navegador (modo demonstração).
   Para publicar as alterações para todos os clientes, veja o README.md
   (ativação do Supabase).
   ========================================================================= */
window.SS = window.SS || {};

SS.config = {
  /* ------------------------------------------------------------------ */
  /* MARCA                                                                */
  /* ------------------------------------------------------------------ */
  brand: {
    nome: 'Sublime Sonhos',
    tagline: 'Doces artesanais',
    frase: 'Doces que nascem de um sonho',
    descricao:
      'Confeitaria artesanal de Aurelino Leal e Ubaitaba (BA). Doces, bolos e mimos feitos com carinho, ingredientes selecionados e aquele toque de afeto que só o que é feito à mão tem.',
  },

  /* ------------------------------------------------------------------ */
  /* WHATSAPP                                                             */
  /* ------------------------------------------------------------------ */
  whatsapp: {
    /* Número da loja com DDD, apenas dígitos (o pedido é enviado aqui). */
    numero: '73981756809',
    /* Link comercial oficial da loja (botões de contato/chat). */
    linkComercial: 'https://wa.me/message/ONZAJVW3DQLTO1',
    /* Mensagem inicial padrão usada nos botões de contato. */
    mensagemContato: 'Olá! Vim pelo site da Sublime Sonhos e gostaria de saber mais. \uD83C\uDF6B',
  },

  /* ------------------------------------------------------------------ */
  /* REDES SOCIAIS                                                        */
  /* ------------------------------------------------------------------ */
  social: {
    instagram: 'https://www.instagram.com/sonhosublime_/',
    instagramUsuario: '@sonhosublime_',
  },

  /* ------------------------------------------------------------------ */
  /* LOJA / ÁREA ATENDIDA                                                */
  /* ------------------------------------------------------------------ */
  loja: {
    area: 'Aurelino Leal e Ubaitaba (BA)',
    cidade: 'Aurelino Leal - BA',
    endereco: '',
    horario: 'Segunda a sábado, das 8h às 18h',
    /* Antecedência mínima padrão para encomendas (dias). */
    antecedenciaMinimaDias: 2,
    /* Modo de cálculo da entrega:
         'confirmar' -> valor confirmado pelo WhatsApp
         'fixa'      -> taxa fixa (taxaEntrega)
         'bairro'    -> taxa por bairro (taxasBairro)
    */
    entrega: {
      modo: 'confirmar',
      taxaEntrega: 0,
      taxasBairro: {},
      nota: 'O valor da entrega é combinado pela loja conforme a região.',
      informacoes:
        'Fazemos entrega em Aurelino Leal e região. Consulte a disponibilidade e o valor pelo WhatsApp. Você também pode retirar seu pedido no local combinado.',
      retiradaDisponivel: true,
    },
    pagamento: {
      /* Formas de pagamento — usadas tanto para "antecipado" quanto para
         "na entrega ou retirada" (mesma lista em ambos). Cada método tem:
         nome, icone (Iconify) e tipo (pix|cartao|dinheiro|link|outro), que
         define o comportamento de simulação na tela de pagamento. */
      metodos: [
        { nome: 'PIX', icone: 'ph:qr-code', tipo: 'pix' },
        { nome: 'Cartão de crédito', icone: 'ph:credit-card', tipo: 'cartao' },
        { nome: 'Cartão de débito', icone: 'ph:credit-card', tipo: 'cartao' },
        { nome: 'Dinheiro', icone: 'ph:cash', tipo: 'dinheiro' },
        { nome: 'Link de pagamento', icone: 'ph:link', tipo: 'link' },
        { nome: 'Outro (combinar com a loja)', icone: 'ph:chat', tipo: 'outro' },
      ],
      nota: 'Pagamento antecipado pode ser solicitado para encomendas e pedidos de alto valor. Instruções de PIX e link são enviadas pela loja após o recebimento do pedido.',
    },
    politicas:
      'Pedidos enviados pelo WhatsApp são recebidos como solicitações e dependem da confirmação da confeitaria, conforme disponibilidade, prazo e região de entrega.',
  },

  /* ------------------------------------------------------------------ */
  /* ADMIN (modo demonstração)                                           */
  /* ------------------------------------------------------------------ */
  admin: {
    /* Senha provisória da área administrativa. NÃO é segura para produção.
       Quando o Supabase for ativado, a autenticação passará a ser feita
       pelo e-mail/senha do Supabase Auth (veja README.md). */
    senhaDemo: 'sublime2026',
    avisoDemo:
      'Modo demonstração: as alterações ficam salvas apenas neste navegador (localStorage). Para publicar os cadastros para todos os clientes, ative o Supabase conforme o README.',
  },
};