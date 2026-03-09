# 🚀 Configurar Stripe em Modo LIVE (Produção)

## 📋 Checklist Completo

### 1️⃣ No Stripe Dashboard

#### A. Ativar Conta em Modo LIVE
1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. **Ative sua conta Stripe** (se ainda não ativou):
   - Preencha informações da empresa
   - Adicione dados bancários para receber pagamentos
   - Complete a verificação de identidade
3. **Mude para modo LIVE:**
   - Toggle no canto superior direito deve estar em **"Live mode"**

#### B. Obter Chaves de Produção
1. Com o modo LIVE ativo, vá em **Developers > API keys**
2. Copie as chaves **Live** (não as de teste):
   - **Secret key:** Começa com `sk_live_...`
   - **Publishable key:** Começa com `pk_live_...`

#### C. Criar/Verificar Produtos em Modo LIVE
1. Certifique-se de estar em **modo LIVE**
2. Vá em **Products**
3. Verifique se os produtos existem:
   - **Basic:** R$ 19,90/mês
   - **Intermediate:** R$ 39,90/mês
   - **Pro:** R$ 79,90/mês
4. Se não existirem, crie-os agora
5. Copie os **Price IDs** (começam com `price_`)
6. **IMPORTANTE:** Esses Price IDs são diferentes dos de teste!

#### D. Configurar Webhook (Opcional mas Recomendado)
1. Em modo LIVE, vá em **Developers > Webhooks**
2. Clique em **Add endpoint**
3. Configure:
   - **Endpoint URL:** `https://seu-dominio.vercel.app/api/stripe/webhook`
   - **Description:** "Webhook para assinaturas em produção"
4. Selecione os eventos:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.paid`
   - ✅ `customer.subscription.updated`
5. Copie o **Signing secret** (começa com `whsec_`)

---

### 2️⃣ Na Vercel

#### A. Variáveis de Ambiente
1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá no seu projeto > **Settings > Environment Variables**
3. Configure/Atualize:

```env
STRIPE_SECRET_KEY=sk_live_... (chave de PRODUÇÃO)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (chave de PRODUÇÃO)
STRIPE_WEBHOOK_SECRET=whsec_... (se configurou webhook)
```

**⚠️ IMPORTANTE:**
- Use chaves que começam com `sk_live_` e `pk_live_`
- **NÃO** use chaves de teste (`sk_test_` ou `pk_test_`)

#### B. Fazer Novo Deploy
1. Após atualizar as variáveis, faça um novo deploy
2. Ou aguarde o próximo push para GitHub (se tiver auto-deploy)

---

### 3️⃣ No Código (Se Precisar Atualizar Price IDs)

Se os Price IDs em modo LIVE forem diferentes dos de teste:

1. Abra `src/app/data/planSeeds.ts`
2. Atualize os `stripePriceId` com os Price IDs de **modo LIVE**:
   ```typescript
   stripePriceId: "price_1ABC...", // Price ID de modo LIVE
   ```
3. Faça commit e push

---

## ✅ Checklist Final

### Stripe Dashboard:
- [ ] Conta Stripe ativada e verificada
- [ ] Modo LIVE ativado
- [ ] Chaves de produção copiadas (`sk_live_` e `pk_live_`)
- [ ] Produtos criados em modo LIVE
- [ ] Price IDs de modo LIVE copiados
- [ ] Webhook configurado (opcional)

### Vercel:
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...` (se configurou webhook)
- [ ] Novo deploy feito

### Código:
- [ ] Price IDs atualizados (se diferentes dos de teste)

---

## ⚠️ Importante

### Diferenças entre Teste e Produção:

| Item | Modo TESTE | Modo LIVE |
|------|------------|-----------|
| Chave Secret | `sk_test_...` | `sk_live_...` |
| Chave Publishable | `pk_test_...` | `pk_live_...` |
| Price IDs | Diferentes | Diferentes |
| Cartões | Apenas de teste | Cartões reais |
| Cobrança | Não cobra | **Cobra dinheiro real!** |

### ⚠️ ATENÇÃO:
- **Em modo LIVE, você vai cobrar dinheiro real!**
- Teste primeiro com valores pequenos
- Certifique-se de que tudo está funcionando antes de lançar

---

## 🧪 Como Testar em Modo LIVE

### Opção 1: Teste Real (Cobra Dinheiro)
- Use um cartão de crédito real
- Valor será cobrado de verdade
- ⚠️ Use apenas para testes finais

### Opção 2: Usar Stripe Test Mode Primeiro
- Teste tudo em modo TESTE primeiro
- Só mude para LIVE quando estiver 100% certo
- Isso evita cobranças acidentais

---

## 📝 Resumo Rápido

1. **Stripe:** Ative conta, mude para LIVE, copie chaves `sk_live_` e `pk_live_`
2. **Vercel:** Configure variáveis com chaves de produção
3. **Deploy:** Faça novo deploy
4. **Teste:** Use cartão real (vai cobrar dinheiro!)

**Pronto!** 🎉



