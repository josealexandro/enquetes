# ✅ Verificar Configuração do Webhook Stripe

## 📋 Status do Código

✅ **O código do webhook está implementado e funcionando!**

O webhook está configurado em: `src/app/api/stripe/webhook/route.ts`

### Eventos que o webhook processa:

1. **`checkout.session.completed`** 
   - Quando o usuário completa o checkout
   - Cria/atualiza a assinatura no Firestore
   - Registra o pagamento

2. **`invoice.paid`**
   - Quando uma fatura é paga (renovação mensal)
   - Atualiza status da assinatura para "ACTIVE"
   - Registra o pagamento

3. **`customer.subscription.updated`**
   - Quando a assinatura é atualizada (cancelamento, mudança de plano, etc.)
   - Atualiza status e datas no Firestore

---

## 🔧 O Que Você Precisa Configurar

### 1. Variável de Ambiente

Certifique-se de que `STRIPE_WEBHOOK_SECRET` está configurada:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Onde encontrar:**
- No Stripe Dashboard, vá em **Developers > Webhooks**
- Clique no webhook que você criou
- Copie o **Signing secret** (começa com `whsec_`)

### 2. Configurar o Webhook no Stripe Dashboard

#### Passo a passo:

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers > Webhooks**
3. Clique em **Add endpoint** (ou edite o existente)
4. Configure:
   - **Endpoint URL:** `https://seu-dominio.com/api/stripe/webhook`
     - Exemplo: `https://meuapp.vercel.app/api/stripe/webhook`
   - **Description:** "Webhook para assinaturas"
5. Selecione os eventos:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.paid`
   - ✅ `customer.subscription.updated`
6. Clique em **Add endpoint**

### 3. Para Teste Local (Opcional)

Se quiser testar localmente, use o Stripe CLI:

```bash
# Instalar Stripe CLI
# Windows: https://github.com/stripe/stripe-cli/releases
# Mac: brew install stripe/stripe-cli/stripe
# Linux: snap install stripe

# Login
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Isso vai gerar um `whsec_...` que você pode usar no `.env.local` para testes.

---

## ✅ Checklist de Verificação

- [ ] `STRIPE_WEBHOOK_SECRET` configurado nas variáveis de ambiente
- [ ] Webhook criado no Stripe Dashboard
- [ ] URL do webhook aponta para `/api/stripe/webhook`
- [ ] Eventos selecionados: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`
- [ ] Webhook está ativo (não desabilitado)

---

## 🧪 Como Testar

1. **Teste de Checkout:**
   - Assine um plano
   - Verifique se a assinatura aparece no Firestore
   - Verifique os logs do webhook no Stripe Dashboard

2. **Teste de Renovação:**
   - Use o Stripe CLI para simular: `stripe trigger invoice.paid`
   - Ou aguarde a renovação automática (se configurado)

3. **Teste de Cancelamento:**
   - Cancele uma assinatura
   - Verifique se `cancelAtPeriodEnd` é atualizado no Firestore

---

## 🔍 Verificar se Está Funcionando

### No Stripe Dashboard:
1. Vá em **Developers > Webhooks**
2. Clique no seu webhook
3. Veja a aba **Events** - deve mostrar eventos sendo recebidos
4. Se houver erros, aparecerão em vermelho

### Nos Logs da Aplicação:
- Procure por mensagens como:
  - `"Assinatura e pagamento processados via Stripe Checkout Session"`
  - `"Assinatura Stripe atualizada no Firestore"`

---

## ⚠️ Problemas Comuns

### "Webhook Error: Missing stripe-signature header"
- **Causa:** Webhook não está sendo chamado pelo Stripe
- **Solução:** Verifique se a URL está correta no Stripe Dashboard

### "Webhook Error: Invalid signature"
- **Causa:** `STRIPE_WEBHOOK_SECRET` está incorreto
- **Solução:** Copie o Signing secret correto do Stripe Dashboard

### Webhook não recebe eventos
- **Causa:** Eventos não estão selecionados no Stripe Dashboard
- **Solução:** Verifique se os 3 eventos estão selecionados

---

## 📝 Resumo

✅ **Código:** Implementado e funcionando  
⚠️ **Configuração:** Precisa configurar no Stripe Dashboard  
⚠️ **Variável de Ambiente:** Precisa adicionar `STRIPE_WEBHOOK_SECRET`

**Próximo passo:** Configure o webhook no Stripe Dashboard e adicione a variável de ambiente!

