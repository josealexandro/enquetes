# 🔧 Como Configurar Price IDs do Stripe

## 📋 O Que Você Precisa Fazer

Se você criou produtos manualmente no Stripe e quer usar os Price IDs deles, siga estes passos:

### 1. Obter os Price IDs no Stripe

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Products** (Produtos)
3. Clique no produto que você criou (Basic, Intermediate ou Pro)
4. Na seção **Pricing**, você verá os preços
5. Copie o **Price ID** (começa com `price_`)

**Exemplo:**
- Basic: `price_1ABC123def456ghi789`
- Intermediate: `price_1XYZ789abc123def456`
- Pro: `price_1DEF456ghi789abc123`

### 2. Adicionar os Price IDs no Código

Abra o arquivo `src/app/data/planSeeds.ts` e adicione o campo `stripePriceId` em cada plano:

```typescript
{
  id: "plan_basic",
  slug: "basic",
  name: "Basic",
  // ... outros campos ...
  stripePriceId: "price_1ABC123def456ghi789", // 👈 Adicione aqui o Price ID do Stripe
},
{
  id: "plan_medium",
  slug: "medium",
  name: "Medium",
  // ... outros campos ...
  stripePriceId: "price_1XYZ789abc123def456", // 👈 Adicione aqui o Price ID do Stripe
},
{
  id: "plan_pro",
  slug: "pro",
  name: "Pro",
  // ... outros campos ...
  stripePriceId: "price_1DEF456ghi789abc123", // 👈 Adicione aqui o Price ID do Stripe
},
```

### 3. Atualizar no Firestore (Opcional)

Se os planos já estão no Firestore, você pode:

**Opção A:** Atualizar manualmente no Firestore
- Vá na collection `plans`
- Edite cada plano e adicione o campo `stripePriceId`

**Opção B:** Deixar o sistema atualizar automaticamente
- O sistema vai usar os Price IDs do `planSeeds.ts` quando criar/atualizar planos

---

## ✅ Como Funciona

- **Se você adicionar `stripePriceId`:** O sistema usa o preço existente no Stripe
- **Se você NÃO adicionar `stripePriceId`:** O sistema cria produto/preço dinamicamente (como antes)

---

## 🎯 Vantagens de Usar Price IDs

✅ Controle total no dashboard do Stripe  
✅ Pode editar preços diretamente no Stripe  
✅ Melhor organização dos produtos  
✅ Histórico de mudanças de preço no Stripe  

---

## ⚠️ Importante

- Certifique-se de que os **preços no Stripe** correspondem aos preços no código
- Use chaves de **teste** (`sk_test_`) para testes
- Use chaves de **produção** (`sk_live_`) quando estiver pronto

---

## 📝 Exemplo Completo

```typescript
{
  id: "plan_basic",
  slug: "basic",
  name: "Basic",
  description: "Ideal para comerciantes que estão começando a coletar feedback.",
  price: 1990, // R$ 19,90 em centavos
  originalPrice: 2990,
  currency: "BRL",
  billingPeriod: "monthly",
  stripePriceId: "price_1ABC123def456ghi789", // 👈 Price ID do Stripe
  // ... resto dos campos ...
}
```

