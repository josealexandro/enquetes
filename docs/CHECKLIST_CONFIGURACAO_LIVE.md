# ✅ Checklist: Configuração Stripe Modo LIVE

## O Que Já Foi Feito

- [x] Chave secreta criada e salva na Vercel (`STRIPE_SECRET_KEY`)

---

## O Que Ainda Precisa Fazer

### 1. Publishable Key na Vercel

- [ ] Na Vercel, adicionar/atualizar:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- [ ] **Onde pegar:** Stripe Dashboard > Developers > API keys > Publishable key

### 2. Price IDs no Código

- [ ] Pegar Price IDs dos produtos em modo LIVE:
  - Basic: `price_...`
  - Intermediate: `price_...`
  - Pro: `price_...`
- [ ] Atualizar em `src/app/data/planSeeds.ts`
- [ ] Fazer commit e push

### 3. Webhook (Opcional mas Recomendado)

- [ ] No Stripe Dashboard (modo LIVE), criar webhook:
  - URL: `https://seu-dominio.vercel.app/api/stripe/webhook`
  - Eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`
- [ ] Copiar Signing secret (`whsec_...`)
- [ ] Adicionar na Vercel: `STRIPE_WEBHOOK_SECRET` = `whsec_...`

### 4. Deploy

- [ ] Fazer novo deploy na Vercel após todas as configurações

---

## 📝 Próximos Passos

1. **Agora:** Adicionar Publishable key na Vercel
2. **Depois:** Pegar Price IDs e atualizar no código
3. **Por último:** Configurar webhook e fazer deploy

---

## ⚠️ Lembrete

- Certifique-se de que os produtos (Basic, Intermediate, Pro) foram criados em **modo LIVE**
- Os Price IDs de modo LIVE são diferentes dos de modo TESTE
- Em modo LIVE, os pagamentos cobram dinheiro real!



