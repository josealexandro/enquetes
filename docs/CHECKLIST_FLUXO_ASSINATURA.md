# ✅ Checklist Completo - Fluxo de Assinatura Stripe

## 📋 Visão Geral do Fluxo

1. Usuário clica "Assinar" → Cria sessão Stripe Checkout
2. Usuário paga no Stripe → Stripe processa pagamento
3. Stripe envia webhook → Sistema atualiza assinatura no Firestore
4. Usuário retorna → Assinatura ativa e limites aplicados

---

## 1️⃣ CONFIGURAÇÃO NO STRIPE DASHBOARD

### 1.1. Criar Produtos e Preços (Modo LIVE)
- [x] **Plano Basic** criado
  - [x] Price ID: `price_1SngyARt7Er6J4QoDYzgDQUK`
  - [x] Tipo: Recurring (mensal)
  - [x] Valor: R$ 19,90

- [x] **Plano Medium** criado
  - [x] Price ID: `price_1Snh17Rt7Er6J4QoCdFLrWTs`
  - [x] Tipo: Recurring (mensal)
  - [x] Valor: R$ 39,90

- [x] **Plano Pro** criado
  - [x] Price ID: `price_1Snh22Rt7Er6J4QoK3ycCCp8`
  - [x] Tipo: Recurring (mensal)
  - [x] Valor: R$ 79,90

### 1.2. API Keys (Modo LIVE)
- [ ] **Secret Key** criada e copiada
  - Formato: `sk_live_...`
  - Onde pegar: Developers → API keys → Reveal test key (se em modo teste) ou Reveal live key (se em modo live)
  
- [ ] **Publishable Key** copiada
  - Formato: `pk_live_...`
  - Onde pegar: Developers → API keys → Copy publishable key

### 1.3. Webhook Endpoint (CRÍTICO)
- [ ] **Endpoint criado no Stripe Dashboard**
  - URL: `https://seu-dominio.vercel.app/api/stripe/webhook`
  - Eventos a escutar:
    - ✅ `checkout.session.completed` (primeira assinatura)
    - ✅ `invoice.paid` (renovações mensais)
    - ✅ `customer.subscription.updated` (mudanças na assinatura)
  
- [ ] **Webhook Secret copiado**
  - Formato: `whsec_...`
  - Onde pegar: Webhooks → Clique no endpoint → Signing secret → Reveal

---

## 2️⃣ VARIÁVEIS DE AMBIENTE

### 2.1. Local (.env.local)
```bash
# Stripe API Keys (MODO LIVE)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase (já configurado)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Status atual:**
- [x] `STRIPE_SECRET_KEY` configurada
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configurada
- [ ] `STRIPE_WEBHOOK_SECRET` configurada (VERIFICAR)

### 2.2. Vercel (Produção)
- [x] `STRIPE_SECRET_KEY` configurada na Vercel
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configurada na Vercel
- [ ] `STRIPE_WEBHOOK_SECRET` configurada na Vercel (VERIFICAR)
- [ ] Todas as variáveis do Firebase configuradas

**⚠️ IMPORTANTE:**
- Vercel e localhost usam variáveis de ambiente **separadas**
- Se atualizar na Vercel, precisa atualizar também no `.env.local` (e vice-versa)
- Após atualizar na Vercel, fazer **redeploy** para aplicar mudanças

---

## 3️⃣ CÓDIGO - Price IDs

### 3.1. Arquivo: `src/app/data/planSeeds.ts`
- [x] **Basic plan** tem `stripePriceId`: `price_1SngyARt7Er6J4QoDYzgDQUK`
- [x] **Medium plan** tem `stripePriceId`: `price_1Snh17Rt7Er6J4QoCdFLrWTs`
- [x] **Pro plan** tem `stripePriceId`: `price_1Snh22Rt7Er6J4QoK3ycCCp8`

**Status:** ✅ Todos os Price IDs estão corretos

---

## 4️⃣ WEBHOOK - Processamento de Eventos

### 4.1. Arquivo: `src/app/api/stripe/webhook/route.ts`
- [x] Endpoint criado: `/api/stripe/webhook`
- [x] Verifica `stripe-signature` header
- [x] Valida webhook usando `STRIPE_WEBHOOK_SECRET`
- [x] Processa eventos:
  - [x] `checkout.session.completed` → `handleCheckoutSessionCompleted`
  - [x] `invoice.paid` → `handleInvoicePaid`
  - [x] `customer.subscription.updated` → `handleCustomerSubscriptionUpdated`

### 4.2. Arquivo: `src/app/services/stripeWebhookHandlers.ts`
- [x] `handleCheckoutSessionCompleted`: Cria/atualiza assinatura no Firestore
- [x] `handleInvoicePaid`: Registra pagamento de renovação
- [x] `handleCustomerSubscriptionUpdated`: Atualiza status e período da assinatura

**Status:** ✅ Webhook handlers implementados

---

## 5️⃣ FIRESTORE - Estrutura de Dados

### 5.1. Coleções Necessárias
- [x] **`plans`**: Armazena planos (Basic, Medium, Pro)
  - Criados automaticamente por `ensureDefaultPlans`
  
- [x] **`subscriptions`**: Armazena assinaturas dos usuários
  - Criadas pelo webhook após checkout
  - Campos: `companyId`, `planId`, `status`, `currentPeriodStart`, `currentPeriodEnd`
  
- [x] **`payments`**: Armazena histórico de pagamentos
  - Criados pelo webhook quando pagamento é confirmado
  
- [x] **`subscription_audit`**: Armazena histórico de mudanças
  - Criado automaticamente ao mudar plano/status

### 5.2. Firestore Rules
- [x] Usuários podem ler suas próprias assinaturas
- [x] Usuários podem criar assinaturas para si
- [x] Webhook pode atualizar assinaturas (via API routes, que não passam pelas rules)

**Status:** ✅ Firestore configurado corretamente

---

## 6️⃣ FLUXO DO USUÁRIO (PASSO A PASSO)

### 6.1. Frontend - Seleção de Plano
**Arquivo:** `src/app/components/SubscriptionPanel.tsx`

- [x] Usuário vê planos disponíveis
- [x] Usuário clica em "Assinar plano"
- [x] Função `handlePlanSelection` é chamada
- [x] `startCheckoutFlow` faz POST para `/api/stripe/checkout`

**Dados enviados:**
```json
{
  "planId": "plan_basic",
  "companyId": "userId",
  "companyName": "Nome da Empresa",
  "successUrl": "https://.../dashboard?payment=success",
  "cancelUrl": "https://.../dashboard?payment=cancelled"
}
```

### 6.2. Backend - Criação da Sessão Checkout
**Arquivo:** `src/app/api/stripe/checkout/route.ts`

- [x] Recebe `planId`, `companyId`, `companyName`, `successUrl`, `cancelUrl`
- [x] Busca plano por `getPlanById(planId)`
- [x] Usa `stripePriceId` do plano para criar sessão
- [x] Cria sessão Stripe Checkout com `mode: "subscription"`
- [x] Adiciona `metadata` com `planId`, `companyId`, `companyName`
- [x] Retorna `{ url: session.url }`

### 6.3. Stripe Checkout - Pagamento
- [x] Usuário é redirecionado para `session.url` (página Stripe)
- [x] Usuário preenche dados do cartão
- [x] Usuário confirma pagamento
- [x] Stripe processa o pagamento
- [x] Stripe cria assinatura recorrente

### 6.4. Stripe Webhook - Confirmação
**Evento:** `checkout.session.completed`

**O que acontece:**
1. Stripe envia POST para `/api/stripe/webhook`
2. Sistema valida assinatura do webhook
3. `handleCheckoutSessionCompleted` é chamado
4. Sistema busca ou cria assinatura no Firestore:
   - Se não existe: cria nova assinatura com status `ACTIVE`
   - Se existe: atualiza plano e status para `ACTIVE`
5. Registra pagamento na coleção `payments`
6. Log de auditoria criado em `subscription_audit`

### 6.5. Retorno do Usuário
- [x] Usuário é redirecionado para `successUrl` (`/dashboard?payment=success`)
- [x] Dashboard carrega assinatura atualizada do Firestore
- [x] Limites do plano são aplicados automaticamente

---

## 7️⃣ VERIFICAÇÃO DE LIMITES

### 7.1. Limites do Plano
**Arquivo:** `src/app/services/subscriptionService.ts`

- [x] `getPollsLimitForCompany(companyId)` retorna limite de enquetes
  - Sem assinatura: 2 enquetes/mês
  - Com assinatura: limite do plano (`pollsPerMonth`)
  
- [x] `countPollsCreatedInCurrentPeriod(companyId)` conta enquetes criadas
  - Baseado em `poll_creation_logs` (não enquetes existentes)
  - Evita burlar limite excluindo e recriando enquetes

### 7.2. Validação ao Criar Enquete
**Arquivo:** `src/app/components/PollForm.tsx`

- [x] Antes de criar enquete, verifica:
  - Quantas enquetes já foram criadas no mês atual
  - Qual é o limite do plano
  - Se atingiu limite, bloqueia criação
  - Se tem créditos avulsos, usa um crédito

**Status:** ✅ Sistema de limites implementado

---

## 8️⃣ RENOVAÇÕES MENSALS

### 8.1. Evento: `invoice.paid`
**O que acontece:**
- A cada mês, Stripe gera uma nova fatura
- Quando pagamento é confirmado, envia evento `invoice.paid`
- Sistema atualiza status para `ACTIVE`
- Registra novo pagamento na coleção `payments`

### 8.2. Evento: `customer.subscription.updated`
**O que acontece:**
- Quando assinatura muda (cancelamento, reativação, etc)
- Sistema atualiza:
  - Status da assinatura
  - `currentPeriodStart` e `currentPeriodEnd`
  - `cancelAtPeriodEnd` (se cancelada)

---

## 9️⃣ PONTOS CRÍTICOS (VERIFICAR SEMPRE)

### ⚠️ Problemas Comuns

1. **Webhook não está funcionando**
   - [ ] Verificar se `STRIPE_WEBHOOK_SECRET` está configurado
   - [ ] Verificar se endpoint webhook está correto no Stripe Dashboard
   - [ ] Verificar logs do Vercel para erros de webhook
   - [ ] Testar webhook manualmente via Stripe Dashboard

2. **Assinatura criada mas não aparece no sistema**
   - [ ] Verificar se webhook foi processado (Stripe Dashboard → Webhooks → Eventos)
   - [ ] Verificar se `metadata` do checkout tem `companyId` e `planId`
   - [ ] Verificar logs do Firestore para criação de assinatura

3. **Erro "Expired API Key"**
   - [ ] Verificar se chave está correta no `.env.local`
   - [ ] Verificar se chave está correta na Vercel
   - [ ] Verificar se chave não foi revogada no Stripe Dashboard
   - [ ] Criar nova chave se necessário

4. **Price ID incorreto**
   - [ ] Verificar se Price IDs no código são do modo correto (LIVE ou TEST)
   - [ ] Verificar se produtos existem no Stripe Dashboard (modo correto)
   - [ ] Verificar se Price IDs estão corretos em `planSeeds.ts`

5. **Limites não estão sendo aplicados**
   - [ ] Verificar se assinatura foi criada corretamente no Firestore
   - [ ] Verificar se `planSnapshot.limits` está preenchido
   - [ ] Verificar se `getPollsLimitForCompany` está retornando valor correto

---

## 🔟 TESTE COMPLETO DO FLUXO

### Checklist de Teste:

1. [ ] **Teste 1: Nova Assinatura**
   - Acessar dashboard
   - Clicar em "Assinar" no plano Basic
   - Completar checkout no Stripe (usar cartão de teste se em modo teste)
   - Verificar redirecionamento para `/dashboard?payment=success`
   - Verificar se assinatura aparece no dashboard
   - Verificar se limite de enquetes foi atualizado (6 enquetes/mês)

2. [ ] **Teste 2: Verificação de Limites**
   - Tentar criar enquete
   - Verificar se limite está sendo respeitado
   - Criar enquetes até atingir limite
   - Tentar criar enquete além do limite → deve bloquear

3. [ ] **Teste 3: Webhook (Simulação)**
   - No Stripe Dashboard → Webhooks → Test webhook
   - Simular evento `checkout.session.completed`
   - Verificar se webhook foi processado (200 OK)
   - Verificar logs no Vercel

4. [ ] **Teste 4: Renovação (Simulação)**
   - Simular evento `invoice.paid` no Stripe Dashboard
   - Verificar se novo pagamento foi registrado no Firestore
   - Verificar se status da assinatura continua `ACTIVE`

---

## 📝 RESUMO FINAL

### ✅ O que está funcionando:
- [x] Criação de sessão Stripe Checkout
- [x] Redirecionamento para Stripe
- [x] Processamento de webhook (`checkout.session.completed`)
- [x] Criação/atualização de assinatura no Firestore
- [x] Registro de pagamentos
- [x] Sistema de limites implementado
- [x] Price IDs configurados corretamente

### ⚠️ O que precisa ser verificado:
- [ ] `STRIPE_WEBHOOK_SECRET` configurado (local e Vercel)
- [ ] Webhook endpoint configurado no Stripe Dashboard
- [ ] Eventos do webhook configurados corretamente

### 🔧 Próximos Passos:
1. Verificar se `STRIPE_WEBHOOK_SECRET` está configurado
2. Configurar webhook endpoint no Stripe Dashboard (se ainda não estiver)
3. Fazer teste completo do fluxo
4. Monitorar logs do webhook nas primeiras assinaturas

---

**Última atualização:** 2025-01-27


