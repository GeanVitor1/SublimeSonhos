# Sublime Sonhos — Site Oficial

Site comercial da confeitaria **Sublime Sonhos** (Aurelino Leal / Ubaitaba — BA): catálogo completo, carrinho, pedido rápido, encomenda agendada, bolo personalizado e painel administrativo. Toda a finalização é feita pelo **WhatsApp**.

> **Status:** v1 em modo demonstração. Catálogo e edições do admin ficam salvos **apenas no navegador (localStorage)** para validação do cliente. A migração para um backend real (Supabase) está documentada na seção [Ativação do Supabase](#ativação-do-supabase).

---

## Como rodar localmente

O site é 100% estático (HTML + CSS + JS puro, sem build). Basta servir a pasta:

```bash
npx serve .
```

ou abrir `index.html` direto no navegador (a maioria das funções funciona, exceto as URLs amigáveis, que dependem do `vercel.json`).

## Publicação na Vercel

1. Crie um repositório no GitHub e envie a pasta do projeto (não inclua a pasta `Imagens/` original nem os blocos de notas — não são usados pelo site).
2. Na Vercel: **Add New Project → Import** o repositório. Framework: *Other*. Build: nenhum. Publish directory: raiz (padrão).
3. Pronto. O `vercel.json` já configura as rotas amigáveis (`/produto/:slug`, `/encomenda`, `/bolo-personalizado`, `/carrinho`, `/admin`).

O `sitemap.xml`, `robots.txt` e as tags de SEO assumem o domínio `https://sublimesonhos.vercel.app/`. Se usar outro domínio, ajuste:
- `sitemap.xml` (URLs)
- `<link rel="canonical">`, `<meta property="og:url">` e o JSON-LD em cada página HTML

## Configurações da loja

Tudo fica centralizado em **`assets/js/config.js`**:

| Configuração | Onde | Valor atual |
|---|---|---|
| WhatsApp (pedidos) | `whatsapp.numero` | `73981756809` |
| WhatsApp (link do perfil) | `whatsapp.linkComercial` | `https://wa.me/message/ONZAJVW3DQLTO1` |
| Instagram | `rede.instagram` | `https://www.instagram.com/sonhosublime_/` |
| Área de atuação | `loja.area` | Aurelino Leal e Ubaitaba (BA) |
| Horário | `loja.horario` | Segunda a sábado, das 8h às 18h |
| Entrega | `loja.entrega` | Taxa "a confirmar" (modo `confirmar`) |
| Pagamentos | `loja.pagamento` | PIX, Dinheiro, Cartão |
| Antecedência de encomenda | `loja.antecedenciaMinimaDias` | 2 dias |
| Senha demo do admin | `admin.senhaDemo` | `sublime2026` |

> A senha do admin é **somente demonstrativa** e fica visível no código-fonte. Para produção com segurança real, use a [ativação do Supabase](#ativação-do-supabase).

## Painel administrativo (modo demo)

Acesse `/admin` e entre com a senha demo `sublime2026`.

- **Produtos:** editar preço, descrição, disponibilidade (pronta entrega / encomenda), adicionais e criar novos. Fotos de novos produtos ficam salvas em base64 no navegador (não servem para produção).
- **Categorias:** renomear e criar.
- **Configurações:** horário, WhatsApp, Instagram, taxas de entrega, etc. (as que estão no painel têm prioridade sobre o `config.js`).
- **Exportar catálogo:** gera um JSON pronto para ser importado no backend quando houver.

**Como funciona (importante):** as alterações são gravadas em `localStorage` (`ss_admin_overrides_v1`) **no navegador onde foram feitas**. Elas valem apenas para a validação com o cliente nessa mesma máquina/navegador. Não são compartilhadas entre dispositivos e somem se o navegador for limpo. Por isso o backup: use o botão **Exportar catálogo** e guarde o JSON — ele pode ser importado no Supabase depois.

## Estrutura do projeto

```
index.html              Página inicial (catálogo completo por categoria, sobre, depoimentos)
(produto.html removido) Detalhes do produto abrem no modal rápido dos cards
carrinho.html           Pedido rápido em 5 etapas → WhatsApp
encomenda.html          Encomenda agendada em 5 etapas → WhatsApp
bolo-personalizado.html Orçamento de bolo personalizado → WhatsApp
admin.html              Painel administrativo demo
404.html, robots.txt, sitemap.xml, vercel.json
assets/js/config.js     Configurações da loja (ver acima)
assets/js/utils.js      Formatação de moeda/data, máscaras, helpers
assets/js/data/catalogo.js  42 produtos + 4 categorias (fonte de dados) + camada de overrides
assets/js/cart.js       Carrinho (localStorage ss_cart_v1)
assets/js/whatsapp.js   Montagem das mensagens e links do WhatsApp
assets/js/ui.js         Header/footer, menu, drawer do carrinho, toasts
assets/js/pages/*.js    Lógica de cada página
assets/img/produtos/    Fotos otimizadas (webp + jpg)
assets/img/site/        Favicon, OG image, heróis
```

## Como editar o catálogo base (sem o admin)

Os 42 produtos e 4 categorias ficam em `assets/js/data/catalogo.js`. Para alterar algo de forma definitiva, edite esse arquivo (preços, textos, disponibilidade) — ele é o "banco de dados" estático. As mudanças feitas pelo admin têm prioridade apenas no navegador onde foram feitas.

## Ativação do Supabase

O site foi arquitetado para trocar o localStorage por um backend sem reescrever as páginas. O ponto único de troca é a camada `SS.catalog.db` em `assets/js/data/catalogo.js` (`getProdutos`, `getProduto`, `getCategorias`, `aplicarConfiguracoes`).

Passos sugeridos:

1. **Tabela `categorias`:** `id` (uuid pk), `nome`, `icone`, `ordem`.
2. **Tabela `produtos`:** `id` (uuid pk), `slug` (unique), `nome`, `categoria_id` (fk), `descricao`, `preco` (numeric, null = sob consulta), `unidade`, `disponibilidade` ('pronta', 'encomenda', 'ambos'), `prazo_producao_dias`, `destaque` (bool), `ativo` (bool), `ordem`, `imagens` (text[] de URLs do Supabase Storage), `adicionais` (jsonb), `variacoes` (jsonb).
3. **Tabela `configuracoes`:** chave/valor (horário, WhatsApp, Instagram, taxas de entrega, formas de pagamento).
4. **Auth:** habilitar e-mail/senha. No `config.js`, substituir `admin.senhaDemo` por autenticação real (ex.: `supabase.auth.signInWithPassword`) e proteção das rotas de escrita via RLS.
5. **Storage:** bucket `produtos` (público) para as fotos enviadas pelo admin — substituir o armazenamento em base64 por upload.
6. Substituir as funções de `SS.catalog.db` por chamadas `fetch` ao Supabase (REST/PostgREST) mantendo as mesmas assinaturas. O admin passa a gravar no banco, e qualquer dispositivo enxerga as alterações.
7. **Pedidos (opcional):** criar tabela `pedidos` (jsonb completo da mensagem) e salvar antes de abrir o WhatsApp, para registro das vendas.

## Limitações e pendências da v1

- **Bolos e itens sem preço:** 16 produtos (bolos, kits e cupcakes) exibem "Preço sob consulta" — os valores originais não existiam nos arquivos fornecidos. Edite pelo admin ou no `catalogo.js`.
- **Descrições:** algumas foram escritas de forma provisória e devem ser revisadas com a proprietária.
- **Depoimentos:** os da home são demonstrativos (marcados no código) — substituir por reais.
- **Endereço e taxa de entrega:** não informados; o site pergunta o endereço no pedido e a taxa fica "a confirmar". Quando definidos, mude `loja.entrega` no `config.js` (modo `fixa` com valor ou `bairro` com taxas).
- **Admin é demo** (dados só no navegador, senha visível no código) — veja a seção acima.
- **Sem pagamento online:** a loja confirma cada pedido e envia as instruções de pagamento pelo WhatsApp.

## Testes

Os testes de lógica, DOM e interação ficam fora do repositório (em `%TEMP%\opencode`). Para validar manualmente, sirva a pasta e percorra: home (filtros-âncora e seções por categoria) → produto → carrinho (5 etapas) → WhatsApp; encomenda; bolo personalizado; admin (login, edição, exportação).