# 🔍 Guia: Verificar Cancelamento de Assinatura no Stripe

## ⚠️ Problema
Ao clicar no botão "Cancelar assinatura", o evento parece não chegar até o Stripe.

---

## 📋 Checklist de Verificação Passo a Passo

### 1️⃣ Verificar no Console do Navegador (Frontend)

**O que fazer:**
1. Abra o Dashboard da aplicação
2. Abra o **DevTools** (F12) → aba **Console**
3. Clique no botão "Cancelar assinatura"
4. **Procure por:**
   - ✅ Mensagem de sucesso: `"Assinatura cancelada com sucesso!"`
   - ❌ Erros em vermelho (ex: `"Erro ao cancelar assinatura"`)
   - ❌ Erros de rede (ex: `Failed to fetch`, `404`, `500`)

**O que verificar:**
- Se aparecer erro **404**: A rota `/api/subscriptions/[id]/cancel` não existe ou o ID está errado
- Se aparecer erro **500**: Erro no servidor (veja logs abaixo)
- Se aparecer erro de rede: Problema de conexão ou CORS

**Exemplo de erro esperado:**
```
Erro ao cancelar assinatura: Assinatura não encontrada no Stripe.
```

---

### 2️⃣ Verificar Logs do Servidor (Backend)

**O que fazer:**
1. No terminal onde está rodando `npm run dev` (ou logs da Vercel)
2. Procure por logs com `[CANCEL_SUBSCRIPTION]`
3. **Procure por:**
   - ✅ `"Assinatura será cancelada ao final do período atual"`
   - ❌ Erros como `"Assinatura não encontrada no Stripe"`
   - ❌ Erros de autenticação do Stripe

**Logs esperados (sucesso):**
```
[CANCEL_SUBSCRIPTION] Buscando assinatura no Firestore...
[CANCEL_SUBSCRIPTION] Assinatura encontrada, buscando no Stripe...
[CANCEL_SUBSCRIPTION] Assinatura cancelada no Stripe: sub_xxx
```

**Logs de erro comuns:**
```
[CANCEL_SUBSCRIPTION] Erro: Assinatura não encontrada no Stripe.
[CANCEL_SUBSCRIPTION] Erro: stripeSubscriptionId do Firestore inválido
```

---

### 3️⃣ Verificar no Stripe Dashboard - Logs de API

**O que fazer:**
1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Certifique-se de estar no modo **LIVE** (não Test mode)
3. Vá em **Developers** → **Logs** (ou **API logs**)
4. **Procure por:**
   - Requisições para `/v1/subscriptions/{id}` com método `POST`
   - Status **200 OK** (sucesso) ou **404/400** (erro)

**Como filtrar:**
- Use o filtro de data para ver apenas requisições recentes
- Procure por `subscriptions.update` ou `subscriptions.retrieve`
- Verifique se há requisições com `cancel_at_period_end: true`

**O que procurar:**
- ✅ Requisição `POST /v1/subscriptions/sub_xxx` com `cancel_at_period_end: true` → **Sucesso!**
- ❌ Nenhuma requisição aparecendo → A chamada não está chegando ao Stripe
- ❌ Requisição com erro **404** → Subscription ID não existe no Stripe
- ❌ Requisição com erro **400** → Dados inválidos sendo enviados

---

### 4️⃣ Verificar Assinatura no Stripe Dashboard

**O que fazer:**
1. No Stripe Dashboard, vá em **Produtos** → **Assinaturas** (ou **Billing** → **Subscriptions**)
2. Procure pela assinatura usando:
   - **Subscription ID** do Firestore (campo `stripeSubscriptionId`)
   - **Customer email** (email do usuário)
   - **Metadata** → `companyId` (se configurado)

**O que verificar na assinatura:**
- ✅ Campo **"Cancel at period end"** deve estar marcado como **"Yes"** (Sim)
- ✅ Status deve continuar como **"Active"** (cancelamento é ao fim do período)
- ❌ Se **"Cancel at period end"** está **"No"** → Cancelamento não foi aplicado

**Como verificar:**
1. Clique na assinatura
2. Role até a seção **"Subscription details"**
3. Procure por **"Cancel at period end"** ou **"Cancelar ao fim do período"**

---

### 5️⃣ Verificar Webhook - Eventos de Cancelamento

**O que fazer:**
1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique no seu webhook endpoint
3. Vá na aba **"Events"** ou **"Eventos"**
4. **Procure por eventos:**
   - ✅ `customer.subscription.updated` → Deve aparecer quando `cancel_at_period_end` é atualizado
   - ✅ `customer.subscription.deleted` → Aparece quando a assinatura é efetivamente encerrada

**O que verificar:**
- ✅ Evento `customer.subscription.updated` com status **200 OK** → Webhook processou corretamente
- ❌ Evento com status **500** ou **400** → Erro no processamento do webhook
- ❌ Nenhum evento aparecendo → Webhook não está sendo chamado ou eventos não estão configurados

**Como verificar o conteúdo do evento:**
1. Clique no evento `customer.subscription.updated`
2. Veja o JSON do evento
3. Procure por `"cancel_at_period_end": true` no objeto `data.object`

---

### 6️⃣ Verificar Configuração do Webhook

**O que fazer:**
1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique no seu webhook endpoint
3. Verifique:
   - ✅ **Endpoint URL** está correto (ex: `https://seu-dominio.vercel.app/api/stripe/webhook`)
   - ✅ **Eventos selecionados** incluem:
     - `customer.subscription.updated` ✅
     - `customer.subscription.deleted` ✅ (novo evento que adicionamos)
   - ✅ Webhook está **ativo** (não desabilitado)

**Se eventos estiverem faltando:**
1. Clique em **"Edit"** ou **"Editar"**
2. Vá em **"Select events"** ou **"Selecionar eventos"**
3. Adicione `customer.subscription.deleted` se não estiver lá
4. Salve as alterações

---

### 7️⃣ Verificar Firestore - Status da Assinatura

**O que fazer:**
1. No Firebase Console, vá em **Firestore Database**
2. Abra a collection `subscriptions`
3. Encontre a assinatura pelo `companyId` ou `id`
4. **Verifique os campos:**
   - ✅ `cancelAtPeriodEnd` deve ser `true` após cancelamento
   - ✅ `status` deve continuar como `"ACTIVE"` (não muda até o fim do período)
   - ✅ `currentPeriodEnd` mostra quando a assinatura será encerrada

**Se `cancelAtPeriodEnd` não mudou:**
- O webhook `customer.subscription.updated` não foi processado
- Verifique logs do webhook (passo 5)

---

## 🔧 Diagnóstico Rápido

### Cenário 1: Botão não faz nada / Erro no console
**Causa:** Erro no frontend ou API route não existe  
**Solução:** Verifique passo 1 e 2

### Cenário 2: API retorna sucesso, mas Stripe não recebe
**Causa:** Erro na chamada ao Stripe API ou chave incorreta  
**Solução:** Verifique passo 3 (logs do Stripe)

### Cenário 3: Stripe recebe, mas webhook não atualiza Firestore
**Causa:** Webhook não configurado ou evento não está sendo processado  
**Solução:** Verifique passo 5 e 6

### Cenário 4: Tudo funciona, mas `cancelAtPeriodEnd` não muda no Firestore
**Causa:** Webhook não está processando `customer.subscription.updated` corretamente  
**Solução:** Verifique logs do webhook e se o handler está funcionando

---

## 🧪 Teste Manual Completo

### Passo 1: Cancelar Assinatura
1. No Dashboard, clique em "Cancelar assinatura"
2. Confirme o cancelamento
3. Aguarde mensagem de sucesso

### Passo 2: Verificar no Stripe (Imediato)
1. Abra Stripe Dashboard → **Assinaturas**
2. Encontre a assinatura
3. Verifique se **"Cancel at period end"** = **"Yes"**

### Passo 3: Verificar Webhook (Imediato)
1. Stripe Dashboard → **Webhooks** → Seu endpoint → **Events**
2. Deve aparecer evento `customer.subscription.updated` com status 200

### Passo 4: Verificar Firestore (Após alguns segundos)
1. Firebase Console → **Firestore** → `subscriptions`
2. Verifique se `cancelAtPeriodEnd` = `true`

---

## 📝 Resumo do Fluxo Esperado

```
1. Usuário clica "Cancelar" no Dashboard
   ↓
2. Frontend chama POST /api/subscriptions/[id]/cancel
   ↓
3. API busca assinatura no Firestore
   ↓
4. API chama Stripe: subscriptions.update(id, { cancel_at_period_end: true })
   ↓
5. Stripe atualiza a assinatura e envia webhook customer.subscription.updated
   ↓
6. Webhook atualiza Firestore: cancelAtPeriodEnd = true
   ↓
7. Frontend refaz fetch da assinatura e mostra cancelAtPeriodEnd = true
```

**Se algum passo falhar, verifique o passo correspondente acima.**

---

## 🆘 Se Nada Funcionar

1. **Verifique variáveis de ambiente:**
   - `STRIPE_SECRET_KEY` está configurada?
   - `STRIPE_WEBHOOK_SECRET` está configurada?

2. **Verifique logs completos:**
   - Console do navegador (F12)
   - Logs do servidor (terminal ou Vercel)
   - Logs do Stripe Dashboard

3. **Teste a API diretamente:**
   ```bash
   curl -X POST https://seu-dominio.vercel.app/api/subscriptions/[SUBSCRIPTION_ID]/cancel \
     -H "Content-Type: application/json"
   ```

4. **Verifique se a assinatura existe no Stripe:**
   - Use o `stripeSubscriptionId` do Firestore
   - Busque no Stripe Dashboard

---

**Última atualização:** 2026-01-24
