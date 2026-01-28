# 🔧 Guia: Configurar Webhook Stripe Corretamente

## ⚠️ Problema
O evento `checkout.session.completed` não está sendo enviado pelo Stripe, então as assinaturas não estão sendo ativadas automaticamente.

## ✅ Solução: Configurar Webhook no Stripe Dashboard

### Passo 1: Acessar Webhooks no Stripe Dashboard

1. Acesse: https://dashboard.stripe.com/webhooks
2. Certifique-se de estar no modo **LIVE** (não Test mode)
   - Verifique o toggle no topo direito da tela
   - Deve estar em "Live mode" (não "Test mode")

### Passo 2: Verificar se Já Existe um Webhook

1. Procure por um webhook chamado "Webhook Enquetes Vercel" ou similar
2. Se **NÃO existir**, vá para o **Passo 3** (Criar Novo Webhook)
3. Se **JÁ existir**, vá para o **Passo 4** (Verificar Configuração)

### Passo 3: Criar Novo Webhook

1. Clique no botão **"+ Add endpoint"** (Adicionar endpoint)
2. **Endpoint URL**: Cole a URL do seu webhook
   ```
   https://enquetes-seven.vercel.app/api/stripe/webhook
   ```
   ⚠️ **IMPORTANTE**: Substitua `enquetes-seven.vercel.app` pelo seu domínio real se for diferente

3. **Description** (opcional): "Webhook para processar assinaturas e pagamentos"

4. **Events to send** (Eventos para enviar):
   - Clique em **"Select events"** (Selecionar eventos)
   - **NÃO** selecione "Send all events" (Enviar todos os eventos)
   - Selecione **APENAS** estes eventos:
     - ✅ `checkout.session.completed`
     - ✅ `invoice.paid`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted` (para marcar assinatura como CANCELED quando o período terminar)

5. Clique em **"Add endpoint"** (Adicionar endpoint)

6. **Copie o "Signing secret"**:
   - Aparecerá uma tela com o "Signing secret"
   - Começa com `whsec_...`
   - **COPIE ELE AGORA** (você não conseguirá vê-lo novamente)

### Passo 4: Verificar Configuração do Webhook Existente

1. Clique no webhook "Webhook Enquetes Vercel"
2. Verifique:

   **a) Endpoint URL:**
   - Deve ser: `https://enquetes-seven.vercel.app/api/stripe/webhook`
   - Se estiver diferente, clique em "Edit" e corrija

   **b) Events:**
   - Clique em "Events" ou "Edit events"
   - Verifique se estes eventos estão selecionados:
     - ✅ `checkout.session.completed`
     - ✅ `invoice.paid`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
   - Se algum estiver faltando, adicione

   **c) Signing secret:**
   - Se você não tem o "Signing secret", você precisará:
     - Clicar em "Reveal" ou "Show" para ver
     - Ou criar um novo webhook e copiar o secret

### Passo 5: Configurar Variável de Ambiente na Vercel

1. Acesse: Vercel Dashboard → Seu Projeto → Settings → Environment Variables

2. Adicione ou atualize a variável:
   - **Nome**: `STRIPE_WEBHOOK_SECRET`
   - **Valor**: O "Signing secret" que você copiou (começa com `whsec_...`)
   - **Environment**: Production (e Development se quiser testar localmente)

3. Clique em **"Save"**

4. **IMPORTANTE**: Faça um novo deploy para que a variável seja aplicada
   - Vercel Dashboard → Deployments → "Redeploy" no último deploy
   - Ou faça um commit vazio para triggerar um novo deploy

### Passo 6: Testar o Webhook

1. **Opção 1: Reenviar Evento Manualmente**
   - Stripe Dashboard → Webhooks → Seu webhook → Events
   - Encontre um evento `checkout.session.completed` antigo (se houver)
   - Clique em "Replay event" ou "Send test webhook"
   - Verifique se retorna 200 OK

2. **Opção 2: Fazer uma Nova Compra de Teste**
   - Faça uma nova compra de plano
   - Após o pagamento, verifique:
     - Stripe Dashboard → Webhooks → Events → Deve aparecer `checkout.session.completed`
     - Vercel Dashboard → Logs → Deve aparecer logs com `[WEBHOOK]`
     - Firebase Console → Firestore → Collection `subscriptions` → Deve aparecer a assinatura

### Passo 7: Verificar Logs

1. **No Stripe Dashboard:**
   - Webhooks → Seu webhook → Events
   - Veja se os eventos estão sendo enviados
   - Veja o status (200 OK = sucesso, 400/500 = erro)

2. **Na Vercel:**
   - Deployments → Último deploy → Functions
   - Procure por logs com `[WEBHOOK]` ou `[handleCheckoutSessionCompleted]`
   - Se houver erros, veja a mensagem

## 🔍 Verificação Final

Após configurar, verifique:

- ✅ Webhook configurado no Stripe Dashboard (modo LIVE)
- ✅ URL correta: `https://seu-dominio.vercel.app/api/stripe/webhook`
- ✅ Eventos selecionados: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
- ✅ `STRIPE_WEBHOOK_SECRET` configurado na Vercel
- ✅ Novo deploy feito na Vercel (para aplicar a variável)

## 🚨 Problemas Comuns

### Problema 1: "Webhook não está recebendo eventos"
**Solução**: Verifique se está no modo LIVE (não Test mode) no Stripe Dashboard

### Problema 2: "Erro 400: Invalid signature"
**Solução**: Verifique se `STRIPE_WEBHOOK_SECRET` está correto na Vercel

### Problema 3: "Erro 500: Admin SDK não disponível"
**Solução**: Verifique se `FIREBASE_ADMIN_PRIVATE_KEY` está configurado corretamente na Vercel

### Problema 4: "Evento não aparece no Stripe Dashboard"
**Solução**: 
- Verifique se o pagamento foi realmente concluído
- Verifique se está no modo correto (LIVE vs TEST)
- Aguarde alguns minutos (pode haver delay)

## 📝 Próximos Passos

Após configurar o webhook:

1. Faça uma nova compra de teste
2. Verifique se o evento `checkout.session.completed` aparece no Stripe Dashboard
3. Verifique se a assinatura foi criada no Firestore
4. Se ainda não funcionar, compartilhe os logs da Vercel para análise

