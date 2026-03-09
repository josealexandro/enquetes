# 🔴 Erro: "Your request was in live mode, but used a known test card"

## ❌ Problema

O erro acontece quando:
- Você está usando uma **chave de PRODUÇÃO** (`sk_live_...`) na Vercel
- Mas está tentando usar um **cartão de TESTE** (`4242 4242 4242 4242`)

**Cartões de teste só funcionam com chaves de teste!**

---

## ✅ Solução Rápida

### 1. Verificar a Chave na Vercel

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá no seu projeto
3. Clique em **Settings** > **Environment Variables**
4. Procure por `STRIPE_SECRET_KEY`
5. **Verifique se começa com `sk_test_`** (não `sk_live_`)

### 2. Se Estiver com Chave de Produção

**Opção A: Trocar para Chave de Teste (Recomendado para testes)**

1. No [Stripe Dashboard](https://dashboard.stripe.com/), certifique-se de estar em **modo TESTE** (toggle no canto superior)
2. Vá em **Developers > API keys**
3. Copie a **Secret key** que começa com `sk_test_...`
4. Na Vercel, **edite** a variável `STRIPE_SECRET_KEY`
5. Cole a chave de teste (`sk_test_...`)
6. **Salve** e faça um novo deploy

**Opção B: Usar Cartão Real (Apenas se quiser testar em produção)**

- Use um cartão de crédito real
- ⚠️ **ATENÇÃO:** Isso vai cobrar dinheiro real!

---

## 🔍 Como Verificar Qual Chave Está Sendo Usada

### No Código (Logs)

O código já valida automaticamente. Se você ver nos logs:

```
⚠️ STRIPE_SECRET_KEY com formato inválido!
⚠️ A chave do Stripe deve começar com 'sk_test_' (teste) ou 'sk_live_' (produção)
```

Isso significa que a chave está incorreta.

### Na Vercel

1. Vá em **Settings > Environment Variables**
2. Procure `STRIPE_SECRET_KEY`
3. O valor deve começar com:
   - `sk_test_` = ✅ Modo Teste (para testes)
   - `sk_live_` = ⚠️ Modo Produção (cobra dinheiro real)

---

## 📋 Checklist

- [ ] Stripe Dashboard está em **modo TESTE**
- [ ] Chave copiada começa com `sk_test_`
- [ ] Variável `STRIPE_SECRET_KEY` na Vercel começa com `sk_test_`
- [ ] Novo deploy feito após atualizar a variável
- [ ] Testando com cartão de teste (`4242 4242 4242 4242`)

---

## 💡 Dica

**Para testes, sempre use:**
- Chave de teste: `sk_test_...`
- Cartão de teste: `4242 4242 4242 4242`

**Para produção, use:**
- Chave de produção: `sk_live_...`
- Cartões reais de clientes

---

## ⚠️ Importante

- **Nunca** misture chave de produção com cartão de teste
- **Nunca** misture chave de teste com cartão real
- Sempre verifique o modo no Stripe Dashboard antes de copiar as chaves



