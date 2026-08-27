# Sublime Sonhos — Site Oficial

Site comercial da confeitaria **Sublime Sonhos** (Aurelino Leal / Ubaitaba — BA): catálogo completo, carrinho, pedido rápido, encomenda agendada, bolo personalizado e painel administrativo. Toda a finalização é feita pelo **WhatsApp**.

> **Status:** v1 em operação temporária 100% front-end (hospedado na Vercel). Pedidos via WhatsApp já funcionais; catálogo e configurações do admin ficam salvos no navegador (localStorage) até a ativação do backend. Veja [Ativação do Supabase](#ativação-do-supabase) para migração.

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
3. **Defina a variável de ambiente `ADMIN_PASSWORD`** (a senha de acesso ao painel) em *Settings → Environment Variables*. Sem ela, o login do `/admin` não funciona (a senha nunca fica no código).
4. Faça o deploy. O `vercel.json` já configura as rotas amigáveis (`/produto/:slug`, `/encomenda`, `/bolo-personalizado`, `/carrinho`, `/admin`) e a função `/api/login`.

> Para rodar o login do painel localmente, use `vercel dev` (que também carrega as env vars), pois o `npx serve` não executa a função `/api/login`.

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

> **Autenticação do admin:** a senha fica no servidor (variável `ADMIN_PASSWORD` na Vercel) e a comparação é feita em `api/login.js` com timing-safe e limite de tentativas por IP — sem hash no front-end. Para proteger também os dados (sincronizar entre dispositivos), use a [ativação do Supabase](#ativação-do-supabase).

## Painel administrativo

Acesse `/admin` e entre com a senha definida na variável `ADMIN_PASSWORD`.

- **Produtos:** editar preço, descrição, disponibilidade (pronta entrega / encomenda), adicionais e criar novos. Fotos de novos produtos ficam salvas em base64 no navegador (não servem para produção).
- **Categorias:** renomear e criar.
- **Configurações:** horário, WhatsApp, Instagram, taxas de entrega, etc. (as que estão no painel têm prioridade sobre o `config.js`).
- **Exportar catálogo:** gera um JSON pronto para ser importado no backend quando houver.

**Como funciona:** as alterações são gravadas em `localStorage` (`ss_admin_overrides_v1`) **neste navegador** e refletem imediatamente na vitrine para todos que acessarem a partir deste navegador. Para sincronizar entre dispositivos, é necessária a ativação do backend. Use o botão **Exportar catálogo** para backup — o JSON pode ser importado no Supabase depois.

## Estrutura do projeto

```
index.html              Página inicial (catálogo completo por categoria, sobre, depoimentos)
(produto.html removido) Detalhes do produto abrem no modal rápido dos cards
carrinho.html           Pedido rápido em 5 etapas → WhatsApp
encomenda.html          Encomenda agendada em 5 etapas → WhatsApp
bolo-personalizado.html Orçamento de bolo personalizado → WhatsApp
admin.html              Painel administrativo
 404.html, robots.txt, sitemap.xml, vercel.json
assets/js/config.js     Configurações da loja (ver acima)
assets/js/utils.js      Formatação de moeda/data, máscaras, helpers
assets/js/data/catalogo.js  49 produtos + 5 categorias (fonte de dados) + camada de overrides
assets/js/cart.js       Carrinho (localStorage ss_cart_v1)
assets/js/whatsapp.js   Montagem das mensagens e links do WhatsApp
assets/js/ui.js         Header/footer, menu, drawer do carrinho, toasts
assets/js/pages/*.js    Lógica de cada página
api/login.js            Autenticação do admin (Vercel Serverless — senha em env var)
assets/img/produtos/    Fotos otimizadas (webp + jpg)
assets/img/site/        Favicon, OG image, heróis
```

## Como editar o catálogo base (sem o admin)

Os 49 produtos e 5 categorias ficam em `assets/js/data/catalogo.js`. Para alterar algo de forma definitiva, edite esse arquivo (preços, textos, disponibilidade) — ele é o "banco de dados" estático. As mudanças feitas pelo admin têm prioridade apenas no navegador onde foram feitas.

## Ativação do Supabase

O site foi arquitetado para trocar o localStorage por um backend sem reescrever as páginas. O ponto único de troca é a camada `SS.catalog.db` em `assets/js/data/catalogo.js` (`getProdutos`, `getProduto`, `getCategorias`, `aplicarConfiguracoes`).

Passos sugeridos:

1. **Tabela `categorias`:** `id` (uuid pk), `nome`, `icone`, `ordem`.
2. **Tabela `produtos`:** `id` (uuid pk), `slug` (unique), `nome`, `categoria_id` (fk), `descricao`, `preco` (numeric, null = sob consulta), `unidade`, `disponibilidade` ('pronta', 'encomenda', 'ambos'), `prazo_producao_dias`, `destaque` (bool), `ativo` (bool), `ordem`, `imagens` (text[] de URLs do Supabase Storage), `adicionais` (jsonb), `variacoes` (jsonb).
3. **Tabela `configuracoes`:** chave/valor (horário, WhatsApp, Instagram, taxas de entrega, formas de pagamento).
4. **Auth:** habilitar e-mail/senha. Substituir a autenticação serverless (`api/login.js`) por `supabase.auth.signInWithPassword` e proteger as rotas de escrita via RLS.
5. **Storage:** bucket `produtos` (público) para as fotos enviadas pelo admin — substituir o armazenamento em base64 por upload.
6. Substituir as funções de `SS.catalog.db` por chamadas `fetch` ao Supabase (REST/PostgREST) mantendo as mesmas assinaturas. O admin passa a gravar no banco, e qualquer dispositivo enxerga as alterações.
7. **Pedidos (opcional):** criar tabela `pedidos` (jsonb completo da mensagem) e salvar antes de abrir o WhatsApp, para registro das vendas.

## Limitações e pendências da v1

- **Bolos e itens sem preço:** 17 produtos (bolos, kits e cupcakes) exibem "Preço sob consulta" — os valores originais não existiam nos arquivos fornecidos. Edite pelo admin ou no `catalogo.js`.
- **Descrições:** algumas foram escritas de forma provisória e devem ser revisadas com a proprietária.
- **Depoimentos:** os da home são de clientes reais — mantenha atualizados.
- **Endereço e taxa de entrega:** o site pergunta o endereço no pedido e a taxa fica "a confirmar" até a loja definir; quando definidos, mude `loja.entrega` no `config.js` (modo `fixa` com valor ou `bairro` com taxas).
- **Admin local:** a senha é verificada no servidor (sem brute-force), mas os dados do painel ainda ficam neste navegador; para sincronizar entre dispositivos e proteger as alterações, migre para backend conforme seção acima.
- **Pagamento:** a loja confirma cada pedido e envia as instruções de pagamento pelo WhatsApp; Pix gera QR Code BR Code válido quando a chave está configurada.

## Testes

Os testes de lógica, DOM e interação ficam fora do repositório (em `%TEMP%\opencode`). Para validar manualmente, sirva a pasta e percorra: home (filtros-âncora e seções por categoria) → produto → carrinho (5 etapas) → WhatsApp; encomenda; bolo personalizado; admin (login, edição, exportação).