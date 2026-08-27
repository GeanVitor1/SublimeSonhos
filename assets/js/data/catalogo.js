/* =========================================================================
   SUBLIME SONHOS — CATÁLOGO DE PRODUTOS
   =========================================================================
   Catálogo inicial montado a partir dos arquivos de referência do projeto
   (pasta /Imagens e blocos de notas de preços). Nenhum preço, descrição ou
   informação comercial foi inventado: bolos sem preço no arquivo original
   aparecem como "Preço sob consulta".

   IMPORTANTE:
   - Este é um catálogo ESTÁTICO de partida, carregado no navegador.
   - A área administrativa salva alterações neste navegador
     e as mescla sobre este catálogo aqui.
   - Para sincronizar entre dispositivos, ative o backend
     (veja README.md). A camada de dados já está isolada: para conectar um
     banco, basta substituir as funções do objeto SS.catalog.db.
   ========================================================================= */
window.SS = window.SS || {};
(function (SS) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* CATEGORIAS                                                          */
  /* Apenas as 5 pastas reais de produtos. Ordem = ordem das seções.     */
  /* ------------------------------------------------------------------ */
  var CATEGORIAS_BASE = [
    { id: 'doces', nome: 'Cardápio do Dia', icone: 'cookie', imagem: 'assets/img/produtos/bolo-pote-brigadeiro.webp', descricao: 'Doces prontos para adoçar o dia', ativo: true },
    { id: 'copos', nome: 'Copos da Felicidade', icone: 'pint-glass', imagem: 'assets/img/produtos/copo-morango.webp', descricao: 'Copos temáticos cheios de sabor e encantamento', ativo: true },
    { id: 'mimos', nome: 'Mimos Doces', icone: 'gift', imagem: 'assets/img/produtos/caixa-fondue.webp', descricao: 'Caixas e presentes para encantar', ativo: true },
    { id: 'bolos', nome: 'Bolos', icone: 'cake', imagem: 'assets/img/produtos/bolo-decorado-30cm.webp', descricao: 'Bolos artesanais para cada celebração', ativo: true },
    { id: 'morangos', nome: 'Morangos Recheados', icone: 'cherries', imagem: 'assets/img/produtos/morango-do-amor.webp', descricao: 'Morangos doces e apaixonantes', ativo: true },
  ];

  var IMG = function (slug) { return 'assets/img/produtos/' + slug + '.webp'; };
  var IMG_LIST = function (arr) { return arr.map(IMG); };

  function GC(nome, min, max, obrigatoria, opcoes) { return { id: nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), nome: nome, min: min, max: max, obrigatoria: !!obrigatoria, opcoes: opcoes }; }
  function OP(nome, acrescimo) { return { nome: nome, acrescimo: acrescimo || 0 }; }

  /* ------------------------------------------------------------------ */
  /* PRODUTOS (dados iniciais de referência)                             */
  /* Descrições curtas/editáveis estão marcadas como provisórias no       */
  /* README.md; a proprietária pode ajustá-las na área administrativa.    */
  /* ------------------------------------------------------------------ */
  var PRODUTOS_BASE = [
    /* ============================ MORANGOS =========================== */
    {
      id: 'morango-encapado', nome: 'Morango encapado', categoria: 'morangos',
      descricaoCurta: 'Morango fresco coberto com chocolate.',
      descricao: 'Morango fresco coberto com chocolate. Disponível na versão tradicional ou por encomenda para datas especiais.',
      imagens: IMG_LIST(['morango-encapado-1', 'morango-encapado-2']),
      preco: 12, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Ex.: chocolate ao leite, meio amargo ou branco.',
      disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'coxinha-morango-brigadeiro', nome: 'Coxinha de morango — Brigadeiro', categoria: 'morangos',
      descricaoCurta: 'Coxinha de morango com recheio de brigadeiro.',
      descricao: 'Coxinha de morango com recheio de brigadeiro. Uma combinação clássica que derrete na boca.',
      imagens: IMG_LIST(['coxinha-morango-brigadeiro-1', 'coxinha-morango-brigadeiro-2', 'coxinha-morango-brigadeiro-3']),
      preco: 12, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'coxinha-morango-ninho-nutella', nome: 'Coxinha de morango — Ninho com Nutella', categoria: 'morangos',
      descricaoCurta: 'Coxinha de morango com recheio de ninho e nutella.',
      descricao: 'Coxinha de morango com recheio de ninho com nutella. O sabor cremoso que todo mundo ama.',
      imagens: IMG_LIST(['coxinha-morango-ninho-nutella-1', 'coxinha-morango-ninho-nutella-2']),
      preco: 12, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'coxinha-morango-ferrero-rocher', nome: 'Coxinha de morango — Ferrero Rocher', categoria: 'morangos',
      descricaoCurta: 'Coxinha de morango com recheio de Ferrero Rocher.',
      descricao: 'Coxinha de morango com recheio de Ferrero Rocher. Um toque de requinte para os amantes de chocolate.',
      imagens: IMG_LIST(['coxinha-morango-ferrero-rocher']),
      preco: 12, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'morango-do-amor', nome: 'Morango do amor — Tradicional', categoria: 'morangos',
      descricaoCurta: 'O morango do amor na versão tradicional.',
      descricao: 'Morango do amor na versão tradicional. Disponível apenas para pedidos agendados.',
      imagens: IMG_LIST(['morango-do-amor']),
      preco: 10, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 1,
      prontaEntrega: false, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },

    /* ====================== DOCES & SOBREMESAS ======================= */
    {
      id: 'geladinho', nome: 'Geladinho', categoria: 'doces',
      descricaoCurta: 'Geladinho artesanal.',
      descricao: 'Geladinho artesanal, perfeito para refrescar o dia. Consulte os sabores disponíveis.',
      imagens: IMG_LIST(['geladinho']),
      preco: 4, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter congelado até o consumo.'
    },
    {
      id: 'bolo-pote-brigadeiro', nome: 'Bolo no pote — Brigadeiro', categoria: 'doces',
      descricaoCurta: 'Massa de chocolate (280 g) com sabor brigadeiro.',
      descricao: 'Bolo no pote com massa de chocolate (280 g) e sabor brigadeiro. Praticidade e sabor em um só pote.',
      imagens: IMG_LIST(['bolo-pote-brigadeiro']),
      preco: 14, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-pote-casadinho', nome: 'Bolo no pote — Casadinho', categoria: 'doces',
      descricaoCurta: 'Massa de chocolate (280 g) com sabor casadinho.',
      descricao: 'Bolo no pote com massa de chocolate (280 g) e sabor casadinho.',
      imagens: IMG_LIST(['bolo-pote-casadinho']),
      preco: 14, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-pote-ninho', nome: 'Bolo no pote — Ninho', categoria: 'doces',
      descricaoCurta: 'Massa de chocolate (280 g) com sabor ninho.',
      descricao: 'Bolo no pote com massa de chocolate (280 g) e sabor ninho.',
      imagens: IMG_LIST(['bolo-pote-ninho']),
      preco: 14, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-pote-ninho-nutella', nome: 'Bolo no pote — Ninho com Nutella', categoria: 'doces',
      descricaoCurta: 'Massa de chocolate (280 g) com sabor ninho e nutella.',
      descricao: 'Bolo no pote com massa de chocolate (280 g) e sabor ninho com nutella.',
      imagens: IMG_LIST(['bolo-pote-ninho-nutella']),
      preco: 14, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bombom-aberto-brigadeiro', nome: 'Bombom aberto — Brigadeiro', categoria: 'doces',
      descricaoCurta: 'Casquinha de chocolate com recheio de brigadeiro.',
      descricao: 'Casquinha de chocolate com recheio de brigadeiro.',
      imagens: IMG_LIST(['bombom-aberto-brigadeiro']),
      preco: 10, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'bombom-aberto-casadinho', nome: 'Bombom aberto — Casadinho', categoria: 'doces',
      descricaoCurta: 'Casquinha de chocolate com recheio de brigadeiro e ninho.',
      descricao: 'Casquinha de chocolate com recheio de brigadeiro e ninho.',
      imagens: IMG_LIST(['bombom-aberto-casadinho']),
      preco: 10, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'bombom-aberto-ninho-nutella', nome: 'Bombom aberto — Ninho com Nutella', categoria: 'doces',
      descricaoCurta: 'Casquinha de chocolate com recheio de ninho e nutella.',
      descricao: 'Casquinha de chocolate com recheio de ninho e nutella.',
      imagens: IMG_LIST(['bombom-aberto-ninho-nutella']),
      preco: 10, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'docinhos', nome: 'Docinhos', categoria: 'doces',
      descricaoCurta: 'Docinhos artesanais. Consulte sabores e quantidades.',
      descricao: 'Docinhos artesanais. Consulte os sabores disponíveis e monte sua quantidade ideal para a sua festa ou momento especial.',
      imagens: IMG_LIST(['docinhos']),
      preco: 2.5, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: 'Informe os sabores desejados e a quantidade.',
      disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },

    /* ============================ BEBIDAS ============================ */
    {
      id: 'coca-lata-350ml', nome: 'Coca-Cola lata 350 ml', categoria: 'doces',
      descricaoCurta: 'Coca-Cola lata 350 ml.',
      descricao: 'Coca-Cola lata 350 ml para acompanhar seus doces.',
      imagens: IMG_LIST(['coca-lata-350ml']),
      preco: 5, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado.'
    },
    {
      id: 'refri-lata-350ml', nome: 'Refrigerante lata 350 ml', categoria: 'doces',
      descricaoCurta: 'Refrigerante lata 350 ml.',
      descricao: 'Refrigerante lata 350 ml para acompanhar seus doces. Consulte os sabores disponíveis.',
      imagens: IMG_LIST(['refri-lata-350ml']),
      preco: 5, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado.'
    },
    {
      id: 'colher-descartavel', nome: 'Colher descartável', categoria: 'doces',
      descricaoCurta: 'Deseja colher no seu pedido?',
      descricao: 'Colher descartável para acompanhar seu pedido.',
      imagens: IMG_LIST(['colher-descartavel']),
       preco: 0.01, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: ''
    },

    /* ==================== MIMOS & PRESENTES ========================== */
    {
      id: 'caixa-04-doces', nome: 'Caixa com 4 doces', categoria: 'mimos',
      descricaoCurta: '4 doces em uma linda caixa que vai surpreender quem receber.',
      descricao: '4 doces em uma linda caixa que vai surpreender quem receber.',
      imagens: IMG_LIST(['caixa-04-doces']),
      preco: 15, precoPromo: null, precoSobConsulta: false, unidade: 'caixa', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Consulte os sabores disponíveis.', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'caixa-06-doces', nome: 'Caixa com 6 doces', categoria: 'mimos',
      descricaoCurta: 'Charme e delicadeza: um verdadeiro mimo para presentear alguém.',
      descricao: 'Charme e delicadeza, um verdadeiro mimo para presentear alguém.',
      imagens: IMG_LIST(['caixa-06-doces']),
      preco: 19, precoPromo: null, precoSobConsulta: false, unidade: 'caixa', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Consulte os sabores disponíveis.', disponibilidade: true, esgotado: false, prazoProducaoDias: 1,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'caixa-09-doces', nome: 'Caixa com 9 doces', categoria: 'mimos',
      descricaoCurta: 'Porque cada detalhe fala mais que mil palavras.',
      descricao: 'Porque cada detalhe fala mais que mil palavras.',
      imagens: IMG_LIST(['caixa-09-doces']),
      preco: 30, precoPromo: null, precoSobConsulta: false, unidade: 'caixa', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Consulte os sabores disponíveis.', disponibilidade: true, esgotado: false, prazoProducaoDias: 1,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'caixa-12-doces', nome: 'Caixa com 12 doces', categoria: 'mimos',
      descricaoCurta: 'Surpreenda alguém que você ama com doces maravilhosos.',
      descricao: 'Surpreenda alguém que você ama com doces maravilhosos. Consulte os sabores disponíveis.',
      imagens: IMG_LIST(['caixa-12-doces']),
      preco: 40, precoPromo: null, precoSobConsulta: false, unidade: 'caixa', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Consulte os sabores disponíveis.', disponibilidade: true, esgotado: false, prazoProducaoDias: 1,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'caixa-12-doces-te-amo', nome: 'Caixa com 12 doces + Te amo', categoria: 'mimos',
      descricaoCurta: 'Uma caixa com 12 doces e a mensagem "Te amo".',
      descricao: 'Uma caixa com 12 doces acompanhada da mensagem "Te amo". Consulte os sabores disponíveis.',
      imagens: IMG_LIST(['caixa-12-doces-te-amo']),
      preco: 48.9, precoPromo: null, precoSobConsulta: false, unidade: 'caixa', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Consulte os sabores disponíveis.', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'caixa-amo-voce-trufas', nome: 'Caixa "Amo você" com trufas', categoria: 'mimos',
      descricaoCurta: '6 trufas sabor ninho.',
      descricao: '6 trufas sabor ninho em uma caixa cheia de amor.',
      imagens: IMG_LIST(['caixa-amo-voce-trufas']),
      preco: 35, precoPromo: null, precoSobConsulta: false, unidade: 'caixa', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'barra-chocolate-330g', nome: 'Barra de chocolate 330 g', categoria: 'mimos',
      descricaoCurta: 'Barra de chocolate 330 g, sabor casadinho.',
      descricao: 'Barra de chocolate 330 g, sabor casadinho. Disponível apenas para pedidos agendados.',
      imagens: IMG_LIST(['barra-chocolate-330g']),
      preco: 30, precoPromo: null, precoSobConsulta: false, unidade: 'barra', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 1,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter em local fresco e arejado.'
    },
    {
      id: 'caixa-fondue', nome: 'Caixa Fondue', categoria: 'mimos',
      descricaoCurta: 'Fondue para adoçar e encantar os corações apaixonados.',
      descricao: 'Fondue para adoçar e encantar os corações apaixonados. Itens: 18 doces, brownie, morangos, uvas e cremes de ninho e brigadeiro.',
      imagens: IMG_LIST(['caixa-fondue']),
      preco: 112, precoPromo: null, precoSobConsulta: false, unidade: 'caixa', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 2,
      prontaEntrega: false, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'box-love', nome: 'Box Love', categoria: 'mimos',
      descricaoCurta: 'Box recheado de docinhos, frutas e um coração de chocolate.',
      descricao: 'Box recheado de docinhos, frutas e um coração de chocolate com cremes de ninho e brigadeiro.',
      imagens: IMG_LIST(['box-love']),
      preco: 100, precoPromo: null, precoSobConsulta: false, unidade: 'box', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 2,
      prontaEntrega: false, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },

    /* ============================ BOLOS ============================== */
    {
      id: 'bolo-cenoura-chocolate', nome: 'Bolo de cenoura com chocolate', categoria: 'bolos',
      descricaoCurta: 'Bolo artesanal de cenoura com cobertura de chocolate.',
      descricao: 'Bolo artesanal de cenoura com cobertura de chocolate. Encomende com antecedência e consulte tamanhos e valores.',
      imagens: IMG_LIST(['bolo-cenoura-chocolate']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Informe tamanho, sabor e data desejada.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-caseiro', nome: 'Bolo caseiro', categoria: 'bolos',
      descricaoCurta: 'Bolo caseiro com sabor de infância.',
      descricao: 'Bolo caseiro com sabor de infância. Encomende com antecedência e consulte tamanhos e valores.',
      imagens: IMG_LIST(['bolo-caseiro']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabor', 0, 1, false, [OP('Laranja'), OP('Coco'), OP('Baunilha'), OP('Chocolate')])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha até 1 sabor.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bento-cake', nome: 'Bento cake', categoria: 'bolos',
      descricaoCurta: 'Bolo individual para presentear com carinho.',
      descricao: 'Bento cake: um bolo individual, delicado e cheio de carinho, ideal para presentear em ocasiões especiais.',
      imagens: IMG_LIST(['bento-cake']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Recheio', 1, 1, true, [OP('Brigadeiro'), OP('Ninho')])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha 1 recheio.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-decorado-30cm', nome: 'Bolo decorado 30 cm', categoria: 'bolos',
      descricaoCurta: 'Bolo decorado (30 cm) para festas e celebrações.',
      descricao: 'Bolo decorado (30 cm) para festas e celebrações. Consulte temas, sabores e valores.',
      imagens: IMG_LIST(['bolo-decorado-30cm']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabor', 2, 3, true, [OP('Massa de baunilha'), OP('Massa de chocolate'), OP('Massa limão', 20), OP('Massa red velvet', 25), OP('Recheio ninho'), OP('Recheio brigadeiro'), OP('Recheio: Prestígio'), OP('Coco com ameixa', 35), OP('Recheio: Abacaxi', 40), OP('Recheio: Ninho com geleia de morango', 50), OP('Recheio: Maracujá com brigadeiro', 45), OP('Recheio: Maracujá', 45), OP('Recheio: Limão', 30), OP('Recheio de Cream Cheese com geleia de morango', 70), OP('Recheio de Cream Cheese', 50)])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha de 2 a 3 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-decorado-22cm', nome: 'Bolo decorado 22 cm', categoria: 'bolos',
      descricaoCurta: 'Bolo decorado (22 cm) para festas médias.',
      descricao: 'Bolo decorado (22 cm) para festas médias. Consulte temas, sabores e valores.',
      imagens: IMG_LIST(['bolo-decorado-22cm']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabor', 2, 3, true, [OP('Massa - Limão', 10), OP('Massa - baunilha'), OP('Massa red velvet', 10), OP('Massa - Chocolate'), OP('Recheio - Ninho'), OP('Recheio - Brigadeiro'), OP('Recheio - coco'), OP('Recheio - Ninho com geleia de morango', 20), OP('Recheio - Abacaxi', 20), OP('Recheio - Limão', 10), OP('Nutella', 15), OP('Creme cheese', 26), OP('Coco com ameixa', 15)])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha de 2 a 3 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-decorado-15cm', nome: 'Bolo decorado 15 cm', categoria: 'bolos',
      descricaoCurta: 'Bolo decorado (15 cm), delicado e cheio de charme.',
      descricao: 'Bolo decorado (15 cm), delicado e cheio de charme para ocasiões íntimas.',
      imagens: IMG_LIST(['bolo-decorado-15cm']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabores', 1, 4, true, [OP('Recheio - Brigadeiro'), OP('Recheio: Ninho'), OP('Recheio: Coco'), OP('Recheio: Limão', 20), OP('Recheio - Casadinho'), OP('Morango', 16), OP('Geleia de morango', 10), OP('Topper com morango', 12), OP('Topper com Brigadeiro', 14), OP('Massa: chocolate'), OP('Massa: Baunilha'), OP('Massa: Limão', 10)])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha de 1 a 4 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'bolo-vulcao-casadinho', nome: 'Bolo vulcão — casadinho', categoria: 'bolos',
      descricaoCurta: 'Bolo vulcão sabor casadinho para surpreender.',
      descricao: 'Bolo vulcão sabor casadinho, perfeito para surpreender em qualquer celebração.',
      imagens: IMG_LIST(['bolo-vulcao-casadinho']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Informe tamanho e data desejada.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'petit-supreme', nome: 'Petit Supreme', categoria: 'bolos',
      descricaoCurta: 'Uma pequena sobremesa de sabor marcante.',
      descricao: 'Petit Supreme: uma pequena sobremesa de sabor marcante para ocasiões que pedem sofisticação.',
      imagens: IMG_LIST(['petit-supreme']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Informe quantidade e data desejada.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado.'
    },
    {
      id: 'naked-cake', nome: 'Naked cake', categoria: 'bolos',
      descricaoCurta: 'Naked cake artesanal com visual rústico e elegante.',
      descricao: 'Naked cake artesanal com visual rústico e elegante. Consulte tamanhos, sabores e valores.',
      imagens: IMG_LIST(['naked-cake']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabores', 1, 4, true, [OP('Recheio - Brigadeiro'), OP('Recheio: Ninho'), OP('Recheio: Coco'), OP('Recheio: Limão', 20), OP('Recheio - Casadinho'), OP('Morango', 16), OP('Geleia de morango', 10), OP('Topper com morango', 12), OP('Topper com Brigadeiro', 14), OP('Massa: chocolate'), OP('Massa: Baunilha'), OP('Massa: Limão', 10)])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha de 1 a 4 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'naked-cake-red-velvet-15', nome: 'Naked cake red velvet 15 cm', categoria: 'bolos',
      descricaoCurta: 'Naked cake red velvet (15 cm) com visual encantador.',
      descricao: 'Naked cake red velvet (15 cm), com massa vermelha e visual encantador para momentos especiais.',
      imagens: IMG_LIST(['naked-cake-red-velvet-15']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [
        GC('Sabores — bolo e doces', 1, 5, true, [OP('Brigadeiro'), OP('Brigadeiro de leite ninho'), OP('Casadinho'), OP('Ferrero Rocher'), OP('Ninho com Nutella'), OP('Uva coberta'), OP('Bolo Chocolate - recheio casadinho'), OP('Bolo Chocolate - recheio ninho'), OP('Bolo Chocolate - recheio brigadeiro'), OP('Bolo Baunilha - recheio casadinho'), OP('Bolo Baunilha - recheio ninho'), OP('Bolo Baunilha - recheio brigadeiro')]),
        GC('Recheios, toppers e massa', 1, 4, true, [OP('Recheio - Brigadeiro'), OP('Recheio: Ninho'), OP('Recheio: Coco'), OP('Recheio: Limão', 20), OP('Recheio - Casadinho'), OP('Morango', 16), OP('Geleia de morango', 10), OP('Topper com morango', 12), OP('Topper com Brigadeiro', 14), OP('Massa: chocolate'), OP('Massa: Baunilha'), OP('Massa: Limão', 10)])
      ], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Dois grupos: 1 a 5 e 1 a 4 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'naked-cake-8cm', nome: 'Naked cake 8 cm', categoria: 'bolos',
      descricaoCurta: 'Naked cake (8 cm), tamanho delicado para ocasiões íntimas.',
      descricao: 'Naked cake (8 cm), tamanho delicado para ocasiões íntimas e presentinhos especiais.',
      imagens: IMG_LIST(['naked-cake-8cm']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabor', 0, 1, false, [OP('Massa - chocolate'), OP('Massa - Baunilha'), OP('Recheio - Ninho'), OP('Recheio - Casadinho'), OP('Recheio - Brigadeiro')])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha até 1 opção.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'naked-cake-15cm', nome: 'Naked cake 15 cm', categoria: 'bolos',
      descricaoCurta: 'Naked cake (15 cm) para celebrar momentos especiais.',
      descricao: 'Naked cake (15 cm) para celebrar momentos especiais. Consulte sabores e valores.',
      imagens: IMG_LIST(['naked-cake-15cm']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabores', 1, 4, true, [OP('Recheio - Brigadeiro'), OP('Recheio: Ninho'), OP('Recheio: Coco'), OP('Recheio: Limão', 20), OP('Recheio - Casadinho'), OP('Morango', 16), OP('Geleia de morango', 10), OP('Topper com morango', 12), OP('Topper com Brigadeiro', 14), OP('Massa: chocolate'), OP('Massa: Baunilha'), OP('Massa: Limão', 10)])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha de 1 a 4 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'mini-cake', nome: 'Mini cake', categoria: 'bolos',
      descricaoCurta: 'Mini cake para ocasiões que pedem um doce do tamanho perfeito.',
      descricao: 'Mini cake para ocasiões que pedem um doce do tamanho perfeito. Consulte sabores e valores.',
      imagens: IMG_LIST(['mini-cake']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [GC('Sabor do bolo', 1, 2, true, [OP('Massa de baunilha'), OP('Massa de chocolate'), OP('Recheio - Ninho'), OP('Recheio - Brigadeiro'), OP('Recheio - Coco'), OP('Recheio - Coco com ameixa', 6), OP('Recheio - Ninho com morango', 10), OP('Recheio - Abacaxi', 10)])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha de 1 a 2 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'mini-bolo-encanto', nome: 'Mini bolo encanto', categoria: 'bolos',
      descricaoCurta: 'Mini bolo encanto, um doce que conquista pelo olhar.',
      descricao: 'Mini bolo encanto, um doce que conquista pelo olhar. Consulte sabores e valores.',
      imagens: IMG_LIST(['mini-bolo-encanto']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [
        GC('Sabores — bolo e doces', 1, 5, true, [OP('Bolo Chocolate - recheio casadinho'), OP('Bolo chocolate - Recheio Brigadeiro'), OP('Bolo Chocolate - Recheio de Ninho'), OP('Bolo Baunilha - Recheio de Ninho'), OP('Bolo Baunilha - Recheio de Brigadeiro'), OP('Doces - casadinho'), OP('Doces - Ninho'), OP('Doces - Ninho com nutella'), OP('Doces - Brigadeiro'), OP('Doces - Ferrero Rocher'), OP('Doces - uva coberta')]),
        GC('Recheios, toppers e massa', 1, 4, true, [OP('Recheio - Brigadeiro'), OP('Recheio: Ninho'), OP('Recheio: Coco'), OP('Recheio: Limão', 20), OP('Recheio - Casadinho'), OP('Morango', 16), OP('Geleia de morango', 10), OP('Topper com morango', 12), OP('Topper com Brigadeiro', 14), OP('Massa: chocolate'), OP('Massa: Baunilha'), OP('Massa: Limão', 10)])
      ], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Dois grupos: 1 a 5 e 1 a 4 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 3 dias.'
    },
    {
      id: 'cupcakes', nome: 'Cupcakes', categoria: 'bolos',
      descricaoCurta: 'Cupcakes artesanais, ideais para festas e mimos.',
      descricao: 'Cupcakes artesanais, ideais para festas e mimos. Consulte sabores, quantidades e valores.',
      imagens: IMG_LIST(['cupcakes']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Informe quantidade e data desejada.', disponibilidade: true, esgotado: false, prazoProducaoDias: 2,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Manter refrigerado. Consumir em até 2 dias.'
    },
    {
      id: 'kit-mini-festa', nome: 'Kit mini festa', categoria: 'bolos',
      descricaoCurta: 'Kit mini festa para celebrar com estilo.',
      descricao: 'Kit mini festa para celebrar com estilo. Consulte itens, quantidades e valores.',
      imagens: IMG_LIST(['kit-mini-festa']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'kit', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Informe data do evento e quantidade de pessoas.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Itens devem ser consumidos conforme orientação no dia do evento.'
    },
    {
      id: 'kit-festa-premium', nome: 'Kit festa premium', categoria: 'bolos',
      descricaoCurta: 'Kit festa premium: uma seleção completa para sua festa.',
      descricao: 'Kit festa premium: uma seleção completa de doces para a sua festa. Consulte itens, quantidades e valores.',
      imagens: IMG_LIST(['kit-festa-premium']),
      preco: null, precoPromo: null, precoSobConsulta: true, unidade: 'kit', quantidadeMinima: 1,
      variacoes: [GC('Sabores', 1, 5, true, [OP('Bolo Chocolate - recheio casadinho'), OP('Bolo chocolate - Recheio Brigadeiro'), OP('Bolo Chocolate - Recheio de Ninho'), OP('Bolo Baunilha - Recheio de Ninho'), OP('Bolo Baunilha - Recheio de Brigadeiro'), OP('Doces - casadinho'), OP('Doces - Ninho'), OP('Doces - Ninho com nutella'), OP('Doces - Brigadeiro'), OP('Doces - Ferrero Rocher'), OP('Doces - uva coberta')])], sabores: [], tamanhos: [], adicionais: [],
      observacoes: 'Escolha de 1 a 5 opções.', disponibilidade: true, esgotado: false, prazoProducaoDias: 3,
      prontaEntrega: false, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Itens devem ser consumidos conforme orientação no dia do evento.'
    },

    /* ===================== COPOS DA FELICIDADE ========================== */
    {
      id: 'copo-sonho-kids', nome: 'Copo Sonho kids', categoria: 'copos',
      descricaoCurta: 'Creme de Ninho, brigadeiro, morangos frescos, MM\'s, paçoca e jujubas.',
      descricao: 'Copo temático kids com creme de Ninho, brigadeiro, morangos frescos, MM\'s, paçoca e jujubas. Uma combinação cheia de cores, sabor e diversão em cada colherada!',
      imagens: IMG_LIST(['copo-sonho-kids']),
       preco: 20, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: true, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'copo-morango', nome: 'Copo Morango', categoria: 'copos',
      descricaoCurta: 'Creme de brigadeiro, creme de ninho e morango.',
      descricao: 'Copo com creme de brigadeiro, creme de ninho e morango. Uma combinação clássica e saborosa.',
      imagens: IMG_LIST(['copo-morango']),
      preco: 18, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'copo-ninho-morango', nome: 'Copo Ninho com Morango', categoria: 'copos',
      descricaoCurta: 'Creme de ninho e morango.',
      descricao: 'Copo com creme de ninho e morango. Simples e delicioso.',
      imagens: IMG_LIST(['copo-ninho-morango']),
      preco: 18, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'copo-ferreiro-rocher', nome: 'Copo Ferreiro Rocher', categoria: 'copos',
      descricaoCurta: 'Creme de brigadeiro, creme de ninho, amendoim e nutella.',
      descricao: 'Copo com creme de brigadeiro, creme de ninho, amendoim e nutella. Um blend de sabores premium.',
      imagens: IMG_LIST(['copo-ferreiro-rocher']),
      preco: 18, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'copo-tropical', nome: 'Copo Tropical', categoria: 'copos',
      descricaoCurta: 'Creme de brigadeiro, creme de ninho, morango e uvas verdes.',
      descricao: 'Copo tropical com creme de brigadeiro, creme de ninho, morango e uvas verdes. Uma viagem de sabor no verão.',
      imagens: IMG_LIST(['copo-tropical']),
      preco: 18, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
    {
      id: 'copo-uva', nome: 'Copo Uva', categoria: 'copos',
      descricaoCurta: 'Cremes de Ninho, brigadeiro e uvas verdes.',
      descricao: 'Copo com cremes de Ninho, brigadeiro e uvas verdes. Uma combinação doce e refrescante.',
      imagens: IMG_LIST(['copo-uva']),
      preco: 18, precoPromo: null, precoSobConsulta: false, unidade: 'un', quantidadeMinima: 1,
      variacoes: [], sabores: [], tamanhos: [], adicionais: [{ nome: 'Colher descartável', preco: 0.01 }],
      observacoes: '', disponibilidade: true, esgotado: false, prazoProducaoDias: 0,
      prontaEntrega: true, encomenda: true, destaque: false, ativo: true,
      conservacao: 'Consumir preferencialmente no mesmo dia. Manter refrigerado.'
    },
  ];

  /* ------------------------------------------------------------------ */
  /* CAMADA DE DADOS                                                     */
  /* ------------------------------------------------------------------ */
  var STORAGE_KEY = 'ss_admin_overrides_v1';

  function lerOverrides() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var base = raw ? JSON.parse(raw) : { produtos: {}, categorias: null, configuracoes: null };
      if (!base.produtos) base.produtos = {};
      if (!('categorias' in base)) base.categorias = null;
      if (!('configuracoes' in base)) base.configuracoes = null;
      return base;
    } catch (e) {
      return { produtos: {}, categorias: null, configuracoes: null };
    }
  }

  function salvarOverrides(ov) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ov)); } catch (e) {}
  }

  function aplicarOverride(p, ov) {
    if (!ov) return p;
    if (ov._excluido) return null;
    var merged = Object.assign({}, p, ov);
    merged.id = p.id;
    delete merged._excluido;
    return merged;
  }

  function normalizarCategorias(arr) {
    return (arr || []).map(function (c) {
      if (c.ativo === undefined) c.ativo = true;
      return c;
    });
  }
  function getCategoriasDeProduto(p) {
    if (Array.isArray(p.categorias) && p.categorias.length) return p.categorias.filter(Boolean);
    if (Array.isArray(p.categoria) && p.categoria.length) return p.categoria.filter(Boolean);
    if (p.categoria) return [String(p.categoria)];
    return [];
  }
  function produtoPertenceCategoria(p, catId) {
    return getCategoriasDeProduto(p).indexOf(catId) !== -1;
  }
  function produtoTemCategoriaVisivel(p, catIds) {
    var cats = getCategoriasDeProduto(p);
    if (!cats.length) return !p.categoria; // sem categoria -> mostra se não filtrado? mas oculta se categoria exigida
    for (var i=0;i<cats.length;i++) if (catIds[cats[i]]) return true;
    return false;
  }

  function getProdutos() {
    var ov = lerOverrides().produtos || {};
    var cats = getCategorias();
    var catIds = {};
    cats.forEach(function (c) { if (c.ativo !== false) catIds[c.id] = true; });
    var lista = [];
    PRODUTOS_BASE.forEach(function (p) {
      var o = ov[p.id];
      if (o && o._excluido) return;
      var m = aplicarOverride(p, o);
      if (!m || !m.ativo) return;
      var catsProd = getCategoriasDeProduto(m);
      if (catsProd.length && !produtoTemCategoriaVisivel(m, catIds)) return;
      lista.push(m);
    });
    Object.keys(ov).forEach(function (id) {
      if (PRODUTOS_BASE.some(function (p) { return p.id === id; })) return;
      var o = ov[id];
      if (!o || o._excluido || !o.ativo) return;
      var catsProd2 = getCategoriasDeProduto(Object.assign({ id: id }, o));
      if (catsProd2.length && !produtoTemCategoriaVisivel(Object.assign({ id: id }, o), catIds)) return;
      lista.push(Object.assign({ id: id }, o));
    });
    return lista;
  }

  function getProduto(id) {
    var ov = lerOverrides().produtos || {};
    var o = ov[id];
    if (o && o._excluido) return null;
    var base = PRODUTOS_BASE.filter(function (p) { return p.id === id; })[0];
    if (base) {
      var m = aplicarOverride(base, o);
      if (!m || !m.ativo) return null;
      var catsM = getCategoriasDeProduto(m);
      if (catsM.length) {
        var visivelAlgum = false;
        for (var i=0;i<catsM.length;i++) { var cc = getCategoria(catsM[i]); if (!cc || cc.ativo !== false) { visivelAlgum = true; break; } }
        if (!visivelAlgum) return null;
      }
      return m;
    }
    if (o && o.ativo) {
      var catsO = getCategoriasDeProduto(Object.assign({ id: id }, o));
      if (catsO.length) {
        var vis2 = false;
        for (var j=0;j<catsO.length;j++) { var c2 = getCategoria(catsO[j]); if (!c2 || c2.ativo !== false) { vis2 = true; break; } }
        if (!vis2) return null;
      }
      return Object.assign({ id: id }, o);
    }
    return null;
  }

  function getProdutosTodos() {
    var ov = lerOverrides().produtos || {};
    var lista = PRODUTOS_BASE.map(function (p) {
      var o = ov[p.id];
      if (o && o._excluido) return null;
      return aplicarOverride(p, o);
    }).filter(Boolean);
    Object.keys(ov).forEach(function (id) {
      if (PRODUTOS_BASE.some(function (p) { return p.id === id; })) return;
      var o = ov[id];
      if (!o || o._excluido) return;
      lista.push(Object.assign({ id: id }, o));
    });
    return lista;
  }

  function getProdutosPorCategoria(catId) {
    return getProdutos().filter(function (p) { return produtoPertenceCategoria(p, catId); });
  }

  function getCategorias() {
    var ov = lerOverrides();
    var base = ov.categorias !== null && ov.categorias !== undefined ? ov.categorias : CATEGORIAS_BASE;
    return normalizarCategorias(base.slice());
  }

  function getCategoriasVisiveis() {
    return getCategorias().filter(function (c) { return c.ativo !== false; });
  }

  function getCategoriasTodas() { return getCategorias(); }

  function getCategoria(id) {
    return getCategorias().filter(function (c) { return c.id === id; })[0] || null;
  }

  function getCategoriaNome(id) {
    var c = getCategoria(id);
    return c ? c.nome : '';
  }

  function contarProdutosPorCategoria(catId) {
    var todos = getProdutosTodos();
    var cnt = 0;
    todos.forEach(function (p) { if (produtoPertenceCategoria(p, catId) && !p._excluido) cnt++; });
    return cnt;
  }

  /* Aplica as configurações salvas no admin sobre o SS.config atual. */
  function aplicarConfiguracoes() {
    var ov = lerOverrides().configuracoes;
    if (!ov) return;
    if (ov.whatsappNumero) SS.config.whatsapp.numero = String(ov.whatsappNumero).replace(/\D/g, '');
    if (ov.linkComercial) SS.config.whatsapp.linkComercial = ov.linkComercial;
    if (ov.instagram) SS.config.social.instagram = ov.instagram;
    if (ov.instagramUsuario) SS.config.social.instagramUsuario = ov.instagramUsuario;
    if (ov.area) SS.config.loja.area = ov.area;
    if (ov.cidade) SS.config.loja.cidade = ov.cidade;
    if (ov.endereco !== undefined) SS.config.loja.endereco = ov.endereco;
    if (ov.horario) SS.config.loja.horario = ov.horario;
    if (ov.antecedenciaMinimaDias !== undefined && ov.antecedenciaMinimaDias !== null) SS.config.loja.antecedenciaMinimaDias = Number(ov.antecedenciaMinimaDias) || 0;
    if (ov.entregaModo) SS.config.loja.entrega.modo = ov.entregaModo;
    if (ov.taxaEntrega !== undefined) SS.config.loja.entrega.taxaEntrega = ov.taxaEntrega;
    if (ov.taxasBairro) SS.config.loja.entrega.taxasBairro = ov.taxasBairro;
    if (ov.notaEntrega) SS.config.loja.entrega.nota = ov.notaEntrega;
    if (ov.informacoesEntrega) SS.config.loja.entrega.informacoes = ov.informacoesEntrega;
    if (ov.pagamentoMetodos) {
      var defMet = SS.config.loja.pagamento.metodos || [];
      SS.config.loja.pagamento.metodos = ov.pagamentoMetodos.map(function (nome) {
        var clean = String(nome).trim();
        for (var i = 0; i < defMet.length; i++) if (defMet[i].nome === clean) return defMet[i];
        return { nome: clean, icone: 'ph:credit-card', tipo: 'outro' };
      }).filter(function (m) { return !!m.nome; });
    }
    // Pix configurável
    if (ov.pixChave !== undefined) {
      if (!SS.config.loja.pix) SS.config.loja.pix = {};
      SS.config.loja.pix.tipo = ov.pixTipo || SS.config.loja.pix.tipo || 'ALEATORIA';
      SS.config.loja.pix.chave = ov.pixChave || '';
      SS.config.loja.pix.nome = ov.pixNome || SS.config.loja.pix.nome || 'Sublime Sonhos';
      SS.config.loja.pix.cidade = ov.pixCidade || SS.config.loja.pix.cidade || 'Aurelino Leal';
      SS.config.loja.pix.expiraMinutos = (ov.pixExpira !== undefined && ov.pixExpira !== null) ? ov.pixExpira : (SS.config.loja.pix.expiraMinutos || 30);
      SS.config.loja.pix.mensagem = ov.pixMensagem !== undefined ? ov.pixMensagem : (SS.config.loja.pix.mensagem || '');
    }
  }

  /* ---------------------------------------------------------------- */
  /* API pública (esta camada será substituída pela integração Supabase */
  /* quando a proprietária ativar o backend — ver README).             */
  /* ---------------------------------------------------------------- */
  SS.catalog = {
    db: {
      getProdutos: getProdutos,
      getProduto: getProduto,
      getProdutosTodos: getProdutosTodos,
      getProdutosPorCategoria: getProdutosPorCategoria,
      getCategorias: getCategorias,
      getCategoriasVisiveis: getCategoriasVisiveis,
      getCategoriasTodas: getCategoriasTodas,
      getCategoria: getCategoria,
      getCategoriaNome: getCategoriaNome,
      contarProdutosPorCategoria: contarProdutosPorCategoria,
      getCategoriasDeProduto: getCategoriasDeProduto,
      produtoPertenceCategoria: produtoPertenceCategoria,
      aplicarConfiguracoes: aplicarConfiguracoes,
      _STORAGE_KEY: STORAGE_KEY,
      _salvarOverrides: salvarOverrides,
      _lerOverrides: lerOverrides,
      _base: { categorias: CATEGORIAS_BASE, produtos: PRODUTOS_BASE },
    },
  };
})(window.SS);