# 🔍 Como Diagnosticar Erro 500 no Webhook

## ⚠️ Problema Identificado

O webhook está retornando **500 Internal Server Error** quando o Stripe tenta processar o evento `checkout.session.completed`.

## 📋 Passos para Diagnosticar

### 1. Verificar Logs na Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Deployments** → Clique no último deploy
4. Clique em **Functions** ou **Logs**
5. Procure por logs com:
   - `[WEBHOOK]`
   - `[handleCheckoutSessionCompleted]`
   - `ERRO`
   - `ERROR`

### 2. Verificar Variáveis de Ambiente na Vercel

1. Vercel Dashboard → Seu projeto → **Settings** → **Environment Variables**
2. Verifique se estas variáveis estão configuradas:
   - ✅ `STRIPE_WEBHOOK_SECRET` (começa com `whsec_...`)
   - ✅ `STRIPE_SECRET_KEY` (começa com `sk_live_...`)
   - ✅ `FIREBASE_ADMIN_PROJECT_ID`
   - ✅ `FIREBASE_ADMIN_CLIENT_EMAIL`
   - ✅ `FIREBASE_ADMIN_PRIVATE_KEY` (chave completa do Firebase)

### 3. Possíveis Causas do Erro 500

#### A) Admin SDK não disponível
**Sintoma nos logs:**
```
[handleCheckoutSessionCompleted] ERRO CRÍTICO: Admin SDK não está disponível!
```

**Solução:**
- Verificar se `FIREBASE_ADMIN_PRIVATE_KEY` está configurada na Vercel
- Verificar se a chave está completa (não cortada)
- Fazer novo deploy após adicionar/atualizar variáveis

#### B) Plano não encontrado
**Sintoma nos logs:**
```
[handleCheckoutSessionCompleted] ERRO: Plano não encontrado: plan_teste
```

**Solução:**
- Verificar se o plano `plan_teste` existe no Firestore (collection `plans`)
- Verificar se o `planId` no metadata do checkout está correto

#### C) Metadata incompleto
**Sintoma nos logs:**
```
[handleCheckoutSessionCompleted] ERRO: Metadata da sessão de checkout incompleto
```

**Solução:**
- Verificar se `planId`, `companyId` e `companyName` estão sendo enviados no checkout

#### D) Erro ao escrever no Firestore
**Sintoma nos logs:**
```
Erro ao criar assinatura
```

**Solução:**
- Verificar regras do Firestore
- Verificar se Admin SDK tem permissões

## 🔧 O que Fazer Agora

1. **Acesse os logs da Vercel** (passo 1 acima)
2. **Copie a mensagem de erro completa** que aparece nos logs
3. **Me envie a mensagem de erro** para eu identificar o problema específico

## 📝 Logs Melhorados

Agora o código tem logs mais detalhados que vão mostrar:
- ✅ Se Admin SDK está disponível
- ✅ Se o plano foi encontrado
- ✅ Qual etapa está falhando
- ✅ Mensagem de erro completa

## 🚀 Próximos Passos

Após verificar os logs:
1. Identificar o erro específico
2. Corrigir o problema
3. Fazer novo deploy
4. Testar novamente

---

**Importante:** O Stripe vai tentar reenviar o evento automaticamente. Após corrigir o problema, o webhook deve processar corretamente.

