# 🔧 Troubleshooting - Problemas com Assinaturas

## ❌ Erros Comuns e Soluções

### 1. **"Stripe não está configurado"**

**Causa:** Variável `STRIPE_SECRET_KEY` não está configurada ou está vazia.

**Solução:**
1. Crie ou edite o arquivo `.env.local` na raiz do projeto
2. Adicione:
   ```env
   STRIPE_SECRET_KEY=sk_test_... (ou sk_live_... para produção)
   ```
3. Reinicie o servidor de desenvolvimento (`npm run dev`)

**Como obter a chave:**
- Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
- Vá em **Developers > API keys**
- Copie a **Secret key** (não a Publishable key)

---

### 2. **"Plano não encontrado"**

**Causa:** O `planId` enviado não existe no Firestore ou nos planos padrão.

**Solução:**
1. Verifique se os planos foram inicializados no Firestore
2. Acesse `/api/plans` para ver os planos disponíveis
3. Verifique se o `planId` usado corresponde a um plano válido

---

### 3. **"Plano com preço inválido"**

**Causa:** O plano tem `price` igual a 0 ou negativo.

**Solução:**
1. Verifique os dados do plano no Firestore (collection `plans`)
2. Certifique-se de que `price` está em centavos (ex: R$ 29,90 = 2990)
3. Verifique se o campo `currency` está definido (deve ser "BRL", "USD" ou "EUR")

---

### 4. **"Moeda inválida"**

**Causa:** O campo `currency` do plano não é "BRL", "USD" ou "EUR".

**Solução:**
1. Verifique o campo `currency` no plano
2. Deve ser exatamente: `"BRL"`, `"USD"` ou `"EUR"` (maiúsculas)
3. Corrija no Firestore se necessário

---

### 5. **"Erro ao gerar URL de checkout"**

**Causa:** Stripe retornou uma sessão sem URL.

**Solução:**
1. Verifique os logs do servidor para mais detalhes
2. Verifique se a chave do Stripe está correta
3. Verifique se a conta Stripe está ativa
4. Tente novamente após alguns segundos

---

### 6. **"Falha ao registrar solicitação (código 500)"**

**Causa:** Erro ao criar a assinatura no Firestore.

**Solução:**
1. Verifique as regras do Firestore (`firestore.rules`)
2. Verifique se o usuário tem permissão para criar documentos na collection `subscriptions`
3. Verifique os logs do servidor para mais detalhes

---

## 🔍 Como Diagnosticar

### 1. Verificar Variáveis de Ambiente

Acesse: `http://localhost:3000/api/env-debug`

Isso mostrará quais variáveis estão configuradas (sem mostrar valores sensíveis).

### 2. Verificar Logs do Servidor

No terminal onde está rodando `npm run dev`, procure por:
- `[STRIPE_CHECKOUT_POST]` - Erros do checkout
- `[POST_SUBSCRIPTION]` - Erros ao criar assinatura
- `[GET_PLANS]` - Erros ao buscar planos

### 3. Verificar Console do Navegador

Abra o DevTools (F12) e vá na aba **Console**:
- Procure por erros em vermelho
- Veja mensagens de erro detalhadas

### 4. Testar Endpoints Individualmente

```bash
# Testar listagem de planos
curl http://localhost:3000/api/plans

# Testar criação de assinatura (substitua os valores)
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"companyId":"test","companyName":"Test","planId":"plan-id"}'
```

---

## ✅ Checklist de Verificação

Antes de tentar fazer uma assinatura, verifique:

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] `STRIPE_SECRET_KEY` está configurada no `.env.local`
- [ ] Servidor foi reiniciado após adicionar variáveis de ambiente
- [ ] Planos existem no Firestore (collection `plans`)
- [ ] Planos têm `price` > 0 e `currency` válido
- [ ] Regras do Firestore permitem criar subscriptions
- [ ] Usuário está autenticado (logado)

---

## 🆘 Se Nada Funcionar

1. **Limpe o cache do Next.js:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Verifique a versão do Stripe:**
   - A versão da API pode estar desatualizada
   - Verifique em `src/app/services/stripeService.ts`

3. **Teste com Stripe Test Mode:**
   - Use cartões de teste do Stripe
   - Exemplo: `4242 4242 4242 4242`

4. **Verifique a documentação do Stripe:**
   - [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)

---

## 📝 Logs Úteis

Adicione estes logs temporariamente para debug:

```typescript
console.log("Plan data:", plan);
console.log("Stripe key exists:", !!process.env.STRIPE_SECRET_KEY);
console.log("Session created:", session.id);
```

