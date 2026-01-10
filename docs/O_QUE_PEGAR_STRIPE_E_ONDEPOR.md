# 📋 O Que Pegar do Stripe e Onde Colocar

## 🎯 Resumo Rápido

- **Na Vercel:** Apenas as **chaves do Stripe** (Secret Key e Publishable Key)
- **No código:** Os **Price IDs** dos produtos (Basic, Medium, Pro)
- **Na Vercel (variável):** Price ID da **enquete avulsa** (se usar)

---

## 1️⃣ O Que Pegar no Stripe Dashboard

### A. Chaves do Stripe (Vão na Vercel)

1. No Stripe Dashboard, vá em **Developers > API keys**
2. Com modo **LIVE** ativo, copie:
   - **Secret key:** `sk_live_...` 
   - **Publishable key:** `pk_live_...`

### B. Price IDs dos Produtos (Vão no Código)

Para cada produto (Basic, Intermediate, Pro):

1. Vá em **Products**
2. Clique no produto (ex: "Basic")
3. Na seção **Pricing**, você verá o preço
4. Clique no preço ou copie o **Price ID** (começa com `price_`)
5. Anote os 3 Price IDs:
   - **Basic:** `price_...`
   - **Intermediate:** `price_...`
   - **Pro:** `price_...`

### C. Price ID da Enquete Avulsa (Vai na Vercel)

1. Vá em **Products**
2. Clique em "criação de enquete avulsa"
3. Você verá "2 preços" - escolha o preço que você quer usar
4. Copie o **Price ID** (começa com `price_`)

---

## 2️⃣ Onde Colocar

### ✅ Na Vercel (Environment Variables)

Acesse: **Settings > Environment Variables**

Adicione/Atualize:

```env
# Chaves do Stripe (OBRIGATÓRIO)
STRIPE_SECRET_KEY=sk_live_... (Secret key que você copiou)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (Publishable key que você copiou)

# Webhook (OPCIONAL mas recomendado)
STRIPE_WEBHOOK_SECRET=whsec_... (Se configurou webhook)

# Enquete Avulsa (OPCIONAL - só se usar)
NEXT_PUBLIC_STRIPE_SINGLE_POLL_PRICE_ID=price_... (Price ID da enquete avulsa)
NEXT_PUBLIC_STRIPE_SINGLE_POLL_PRICE_DISPLAY_VALUE=R$ X,XX (Valor para exibir, ex: R$ 5,00)
```

### ✅ No Código (Price IDs dos Planos)

Arquivo: `src/app/data/planSeeds.ts`

Atualize os `stripePriceId` de cada plano:

```typescript
{
  id: "plan_basic",
  // ... outros campos ...
  stripePriceId: "price_...", // 👈 Price ID do Basic (modo LIVE)
},
{
  id: "plan_medium",
  // ... outros campos ...
  stripePriceId: "price_...", // 👈 Price ID do Intermediate (modo LIVE)
},
{
  id: "plan_pro",
  // ... outros campos ...
  stripePriceId: "price_...", // 👈 Price ID do Pro (modo LIVE)
},
```

---

## 📝 Passo a Passo Completo

### Passo 1: Pegar Chaves no Stripe
1. Stripe Dashboard > **Developers > API keys**
2. Modo **LIVE** ativo
3. Copiar:
   - Secret key (`sk_live_...`)
   - Publishable key (`pk_live_...`)

### Passo 2: Colocar Chaves na Vercel
1. Vercel > Projeto > **Settings > Environment Variables**
2. Adicionar/Editar:
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
3. Salvar

### Passo 3: Pegar Price IDs no Stripe
1. Stripe Dashboard > **Products**
2. Para cada produto (Basic, Intermediate, Pro):
   - Clicar no produto
   - Copiar o **Price ID** (começa com `price_`)

### Passo 4: Atualizar Price IDs no Código
1. Abrir `src/app/data/planSeeds.ts`
2. Atualizar `stripePriceId` de cada plano com os Price IDs de **modo LIVE**
3. Fazer commit e push

### Passo 5: (Opcional) Enquete Avulsa
1. Stripe Dashboard > **Products** > "criação de enquete avulsa"
2. Copiar o **Price ID** do preço que quer usar
3. Na Vercel, adicionar:
   - `NEXT_PUBLIC_STRIPE_SINGLE_POLL_PRICE_ID` = `price_...`
   - `NEXT_PUBLIC_STRIPE_SINGLE_POLL_PRICE_DISPLAY_VALUE` = `R$ X,XX`

### Passo 6: Deploy
1. Fazer novo deploy na Vercel
2. Testar

---

## ✅ Checklist

### Stripe:
- [ ] Modo LIVE ativo
- [ ] Secret key copiada (`sk_live_...`)
- [ ] Publishable key copiada (`pk_live_...`)
- [ ] Price ID do Basic copiado
- [ ] Price ID do Intermediate copiado
- [ ] Price ID do Pro copiado
- [ ] Price ID da enquete avulsa copiado (se usar)

### Vercel:
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- [ ] `NEXT_PUBLIC_STRIPE_SINGLE_POLL_PRICE_ID` = `price_...` (se usar)
- [ ] Novo deploy feito

### Código:
- [ ] Price IDs atualizados em `planSeeds.ts` (modo LIVE)
- [ ] Commit e push feito

---

## 💡 Resumo Visual

```
Stripe Dashboard
├── Developers > API keys
│   ├── Secret key (sk_live_...) ──────┐
│   └── Publishable key (pk_live_...) ─┤
│                                       │
└── Products                            │
    ├── Basic ──> Price ID ────────────┼──> Vercel (Environment Variables)
    ├── Intermediate ──> Price ID ─────┤
    ├── Pro ──> Price ID ──────────────┤
    └── Enquete Avulsa ──> Price ID ───┘
                                        │
                                        └──> Código (planSeeds.ts)
```

---

## ⚠️ Importante

- **Price IDs de modo LIVE são diferentes dos de modo TESTE!**
- Certifique-se de copiar os Price IDs enquanto está em **modo LIVE**
- Se você copiou em modo TESTE, precisa copiar novamente em modo LIVE



