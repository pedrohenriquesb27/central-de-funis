# Central de Funis • Prosperus Inteligência Financeira

Painel administrativo unificado para acompanhamento e gestão de leads provenientes de múltiplos funis de marketing (Quiz Prosperus, Páginas de Venda / Informativos, etc.).

---

## 🎨 Identidade Visual
- **Cor Primária:** `#062E20` (Verde Escuro Prosperus)
- **Cor Secundária / Destaque:** `#C59B27` (Dourado Nobre)
- **Fundo:** `#F5F3EF` (Off-white aconchegante)
- **Tipografia:** `Plus Jakarta Sans` (Google Fonts)

---

## 🚀 Funcionalidades Principais
1. **Login Seguro:** Proteção de acesso com senha padrão (`admin123`) persistida no `localStorage`.
2. **Seletor de Funis (Abas no Topo):**
   - *Visão Geral (Todos os Funis)*
   - *Funil 1: Quiz Prosperus* (`quiz_prosperus`)
   - *Funil 2: Informativo / Venda* (`informativo_venda`)
3. **Cards de Métricas Dinâmicos:**
   - Total de Leads
   - Formulário / Quiz Preenchido
   - Iniciou Checkout (com taxa % de conversão)
   - Vendas Aprovadas (com taxa % e total acumulado faturado em R$)
4. **Sub-abas de Status de Conversão:** Filtre em 1 clique por *Todos*, *Preencheu Formulário*, *Iniciou Checkout* ou *Comprou*.
5. **Busca em Tempo Real:** Pesquisa instantânea por nome, telefone/WhatsApp, e-mail, CPF ou identificador do funil.
6. **Ações Rápidas de Contato:**
   - Botão direto para WhatsApp com mensagem personalizada para cada etapa (boas-vindas, recuperação de carrinho, etc.).
   - Copiar contatos formatados para WhatsApp com 1 clique.
7. **Exportação de Dados:** Exportação completa para CSV formatado em UTF-8 com BOM (compatível diretamente com Excel).
8. **Gestão de Lead no Modal:** Altere o status ou o funil do lead diretamente pelo painel e salve no Supabase.

---

## 💾 Banco de Dados Supabase (`quiz_leads`)
A aplicação se conecta diretamente à tabela `quiz_leads`. Para garantir suporte completo à coluna `funil_id`, execute o seguinte comando no **SQL Editor** do Supabase se ainda não tiver feito:

```sql
ALTER TABLE quiz_leads ADD COLUMN IF NOT EXISTS funil_id TEXT DEFAULT 'quiz_prosperus';
```

> **Nota:** Todos os leads anteriores que possuírem `funil_id` nulo são automaticamente associados ao **Funil 1: Quiz Prosperus**.

---

## 🌐 Publicação na Vercel
Como o projeto é construído exclusivamente com arquivos estáticos (`index.html`, `supabaseConfig.js`, `vercel.json`):

1. **Deploy via Vercel CLI:**
   ```bash
   cd central-de-funis
   vercel --prod
   ```

2. **Deploy via GitHub:**
   - Faça push desta pasta para um repositório GitHub.
   - Conecte o repositório na dashboard da Vercel.
   - Framework Preset: **Other** / Nenhum comando de build necessário.
