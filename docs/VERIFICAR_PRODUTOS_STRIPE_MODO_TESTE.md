# 🔍 Verificar se Produtos Stripe Estão em Modo Teste

## ❌ Problema

Mesmo com a chave de teste (`sk_test_...`) configurada, você pode receber o erro:
> "Your request was in live mode, but used a known test card"

**Isso acontece quando os produtos/preços no Stripe estão em modo LIVE!**

---

## ✅ Solução

### 1. Verificar Modo no Stripe Dashboard

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. **IMPORTANTE:** Verifique o toggle no canto superior direito
   - Deve estar em **"Test mode"** (não "Live mode")
3. Se estiver em "Live mode", **mude para "Test mode"**

### 2. Verificar os Produtos/Preços

Os Price IDs que você configurou:
- Basic: `price_1SngyARt7Er6J4QoDYzgDQUK`
- Medium: `price_1Snh17Rt7Er6J4QoCdFLrWTs`
- Pro: `price_1Snh22Rt7Er6J4QoK3ycCCp8`

**Verifique se foram criados em modo TESTE:**

1. No Stripe Dashboard (em modo TESTE), vá em **Products**
2. Clique em cada produto (Basic, Intermediate, Pro)
3. Verifique se os preços aparecem
4. Se não aparecerem, significa que foram criados em modo LIVE

### 3. Criar Produtos/Preços em Modo Teste

Se os produtos não existirem em modo teste:

1. **Certifique-se de estar em modo TESTE** (toggle no topo)
2. Vá em **Products** > **Add product**
3. Crie os 3 produtos:
   - **Basic:** R$ 19,90/mês
   - **Intermediate:** R$ 39,90/mês  
   - **Pro:** R$ 79,90/mês
4. Configure como **Recurring** (mensal)
5. Copie os **novos Price IDs** (começam com `price_`)
6. Atualize no código (`src/app/data/planSeeds.ts`)

---

## 🔍 Como Identificar se Está em Modo Errado

### No Stripe Dashboard:

**Modo TESTE:**
- Toggle mostra "Test mode"
- Fundo mais claro/azulado
- Produtos criados aparecem aqui

**Modo LIVE:**
- Toggle mostra "Live mode"
- Fundo mais escuro
- Produtos criados aqui não aparecem em modo teste

### Verificar Price IDs:

Os Price IDs são diferentes entre teste e produção:
- **Teste:** `price_1ABC...` (geralmente)
- **Produção:** `price_1XYZ...` (geralmente)

Se você copiou os Price IDs enquanto estava em modo LIVE, eles não funcionarão em modo TESTE!

---

## 📋 Checklist

- [ ] Stripe Dashboard está em **modo TESTE**
- [ ] Produtos foram criados em **modo TESTE**
- [ ] Price IDs foram copiados em **modo TESTE**
- [ ] Price IDs no código correspondem aos de **modo TESTE**
- [ ] Chave `STRIPE_SECRET_KEY` na Vercel é `sk_test_...`
- [ ] Novo deploy feito após atualizar Price IDs

---

## 💡 Dica Importante

**Sempre crie produtos/preços no mesmo modo que você está testando:**
- Para testes: Crie em **modo TESTE** e use chaves `sk_test_`
- Para produção: Crie em **modo LIVE** e use chaves `sk_live_`

**Nunca misture:**
- ❌ Produtos em modo LIVE + chave de teste
- ❌ Produtos em modo TESTE + chave de produção

---

## ⚠️ Se Ainda Não Funcionar

1. **Limpar cache da Vercel:**
   - Vá em **Settings > Environment Variables**
   - Edite `STRIPE_SECRET_KEY`
   - Cole novamente (mesmo valor)
   - Salve e faça novo deploy

2. **Verificar logs:**
   - Na Vercel, vá em **Deployments**
   - Clique no último deploy
   - Veja os logs para erros relacionados ao Stripe

3. **Testar sem Price IDs:**
   - Remova temporariamente os `stripePriceId` do código
   - O sistema vai criar produtos dinamicamente
   - Se funcionar, o problema são os Price IDs



