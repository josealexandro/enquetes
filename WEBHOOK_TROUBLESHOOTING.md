# 🔍 Guia de Diagnóstico - Webhook Stripe Não Funciona

## ❌ Problema
Cliente fez assinatura, foi cobrado, mas o plano não está disponível no sistema.

## ✅ Checklist de Diagnóstico

### 1. Verificar Webhook no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/webhooks
2. Verifique se há um endpoint configurado para sua URL de produção
3. URL deve ser: `https://seu-dominio.vercel.app/api/stripe/webhook`
4. Verifique se os eventos estão configurados:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.paid`
   - ✅ `customer.subscription.updated`

**Se não estiver configurado:**
- Clique em "Add endpoint"
- Cole a URL de produção
- Selecione os eventos acima
- Copie o "Signing secret" (começa com `whsec_`)

### 2. Verificar Variáveis de Ambiente na Vercel

Acesse: Vercel Dashboard → Seu Projeto → Settings → Environment Variables

**Variáveis obrigatórias:**
- ✅ `STRIPE_SECRET_KEY` = `sk_live_...` (produção) ou `sk_test_...` (teste)
- ✅ `STRIPE_WEBHOOK_SECRET` = `whsec_...` (do Stripe Dashboard)
- ✅ `FIREBASE_ADMIN_PROJECT_ID` = ID do projeto Firebase
- ✅ `FIREBASE_ADMIN_CLIENT_EMAIL` = Email da service account
- ✅ `FIREBASE_ADMIN_PRIVATE_KEY` = Chave privada completa (sem aspas na Vercel)

**⚠️ IMPORTANTE:**
- `FIREBASE_ADMIN_PRIVATE_KEY` na Vercel deve estar SEM aspas
- A chave deve estar completa (incluir `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`)
- Use `\n` literais (duas barras + n) para quebras de linha

### 3. Verificar Logs na Vercel

1. Acesse: Vercel Dashboard → Seu Projeto → Deployments → Último deploy → Functions
2. Procure por logs com prefixo `[WEBHOOK]` ou `[handleCheckoutSessionCompleted]`
3. Verifique se há erros

**Logs esperados quando webhook funciona:**
```
[WEBHOOK] Recebida requisição de webhook do Stripe
[WEBHOOK] Evento recebido e validado: checkout.session.completed (ID: evt_...)
[handleCheckoutSessionCompleted] Iniciando processamento da sessão cs_...
[handleCheckoutSessionCompleted] Processando assinatura: planId=..., companyId=...
[handleCheckoutSessionCompleted] Assinatura criada com ID: ...
[handleCheckoutSessionCompleted] SUCESSO: Assinatura e pagamento processados
```

**Se não houver logs:**
- Webhook não está sendo chamado pelo Stripe
- Verifique se a URL está correta no Stripe Dashboard

**Se houver erros:**
- `STRIPE_WEBHOOK_SECRET não configurado` → Adicione a variável na Vercel
- `Admin SDK não está disponível` → Verifique `FIREBASE_ADMIN_PRIVATE_KEY`
- `Metadata da sessão incompleto` → Verifique se metadata está sendo passado no checkout

### 4. Verificar Logs no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique no seu endpoint
3. Veja a aba "Events" ou "Logs"
4. Verifique se há tentativas de envio e qual foi a resposta

**Status esperado:**
- ✅ `200 OK` = Webhook processado com sucesso
- ❌ `400 Bad Request` = Erro na validação da assinatura
- ❌ `500 Internal Server Error` = Erro no processamento

**Se houver erros 400/500:**
- Clique no evento para ver detalhes
- Verifique a mensagem de erro
- Veja os logs na Vercel para mais detalhes

### 5. Verificar se Assinatura Foi Criada no Firestore

1. Acesse: Firebase Console → Firestore Database
2. Vá para a collection `subscriptions`
3. Procure por um documento onde `companyId` = ID do usuário que fez a assinatura
4. Verifique se existe e qual é o `status`

**Se não existir:**
- Webhook não processou ou falhou
- Verifique logs na Vercel

**Se existir mas `status` não for `ACTIVE`:**
- Webhook processou mas houve erro ao atualizar status
- Verifique logs na Vercel

### 6. Solução Rápida: Reenviar Evento do Stripe

Se o webhook falhou, você pode reenviar manualmente:

1. Acesse: Stripe Dashboard → Webhooks → Seu endpoint → Events
2. Encontre o evento `checkout.session.completed` da assinatura
3. Clique em "Send test webhook" ou "Replay event"
4. Isso vai reenviar o evento para seu servidor

## 🚨 Problemas Comuns e Soluções

### Problema 1: "STRIPE_WEBHOOK_SECRET não configurado"
**Solução:** Adicione `STRIPE_WEBHOOK_SECRET` nas variáveis de ambiente da Vercel

### Problema 2: "Admin SDK não está disponível"
**Solução:** 
- Verifique se `FIREBASE_ADMIN_PRIVATE_KEY` está completo na Vercel
- Verifique se não tem aspas na Vercel
- Verifique se os `\n` estão como literais (duas barras + n)

### Problema 3: "Metadata da sessão incompleto"
**Solução:** 
- Verifique se `/api/stripe/checkout` está passando `metadata` corretamente
- Deve incluir: `planId`, `companyId`, `companyName`

### Problema 4: Webhook não está sendo chamado
**Solução:**
- Verifique se a URL está correta no Stripe Dashboard
- URL deve ser: `https://seu-dominio.vercel.app/api/stripe/webhook`
- Verifique se o endpoint está acessível (não retorna 404)

## 📝 Próximos Passos

1. Verifique os logs na Vercel após fazer uma nova assinatura de teste
2. Verifique os logs no Stripe Dashboard
3. Se necessário, reenvie o evento manualmente
4. Se o problema persistir, compartilhe os logs para análise

