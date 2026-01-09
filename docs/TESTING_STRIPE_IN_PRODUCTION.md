# 🧪 Guia: Testar Assinaturas Stripe em Produção (Modo Teste)

## ✅ Sim, é possível!

Você pode usar as **chaves de teste do Stripe** (`sk_test_` e `pk_test_`) mesmo em produção. O Stripe não diferencia entre ambiente local e produção - ele só diferencia entre **chaves de teste** e **chaves de produção**.

---

## 📋 Como Configurar

### 1. Obter Chaves de Teste do Stripe

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/)
2. Certifique-se de estar no **modo de teste** (toggle no canto superior direito)
3. Vá em **Developers > API keys**
4. Copie:
   - **Secret key** (começa com `sk_test_`)
   - **Publishable key** (começa com `pk_test_`)

### 2. Configurar Variáveis de Ambiente

No seu ambiente de produção (Vercel, Netlify, etc.), configure:

```env
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_... (opcional, para webhooks)
```

**Importante:** Use as chaves de **teste** (`sk_test_` e `pk_test_`), não as de produção (`sk_live_` e `pk_live_`).

---

## 🎯 O Que Funciona em Modo Teste

### ✅ Funcionalidades Disponíveis:
- Criar assinaturas
- Processar pagamentos (com cartões de teste)
- Receber webhooks
- Cancelar assinaturas
- Atualizar planos
- Ver histórico de pagamentos

### 💳 Cartões de Teste do Stripe

Use estes cartões para testar pagamentos:

| Número do Cartão | Resultado |
|-----------------|-----------|
| `4242 4242 4242 4242` | Pagamento aprovado |
| `4000 0000 0000 0002` | Pagamento recusado |
| `4000 0025 0000 3155` | Requer autenticação 3D Secure |

**Outros dados:**
- **CVV:** Qualquer 3 dígitos (ex: `123`)
- **Data de validade:** Qualquer data futura (ex: `12/25`)
- **CEP:** Qualquer CEP válido (ex: `12345-678`)

---

## 🔍 Como Verificar se Está em Modo Teste

### No Código:
O código já valida automaticamente:
- Chaves que começam com `sk_test_` = Modo Teste
- Chaves que começam com `sk_live_` = Modo Produção

### No Stripe Dashboard:
- **Modo Teste:** Toggle no canto superior direito mostra "Test mode"
- **Modo Produção:** Toggle mostra "Live mode"

---

## ⚠️ Importante

### ✅ Pode Fazer:
- Testar todas as funcionalidades de pagamento
- Usar em produção com dados reais (mas pagamentos serão de teste)
- Desenvolver e testar sem custos

### ❌ Não Pode Fazer:
- Processar pagamentos reais (precisa de chaves `sk_live_`)
- Receber dinheiro real (todos os pagamentos são simulados)

---

## 🚀 Quando Migrar para Produção

Quando estiver pronto para receber pagamentos reais:

1. **Ative sua conta Stripe** (preencha informações da empresa)
2. **Obtenha as chaves de produção:**
   - No Stripe Dashboard, mude para **"Live mode"**
   - Vá em **Developers > API keys**
   - Copie as chaves **Live** (`sk_live_` e `pk_live_`)
3. **Atualize as variáveis de ambiente** em produção
4. **Teste novamente** com valores pequenos primeiro

---

## 📝 Checklist de Teste

- [ ] Configurar chaves de teste no ambiente de produção
- [ ] Testar criação de assinatura
- [ ] Testar pagamento com cartão de teste
- [ ] Verificar se webhook está funcionando
- [ ] Testar cancelamento de assinatura
- [ ] Verificar se dados aparecem no Stripe Dashboard (modo teste)

---

## 💡 Dica

**Mantenha um ambiente separado para testes:**
- **Desenvolvimento:** Use chaves de teste localmente
- **Produção (Teste):** Use chaves de teste em produção
- **Produção (Real):** Use chaves de produção quando estiver pronto

Isso permite testar tudo em produção sem risco de cobranças reais!

