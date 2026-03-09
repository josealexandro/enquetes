# 🏗️ Arquitetura do Backend - Poll App

## 📍 Localização do Backend

O backend desta aplicação está distribuído em **3 camadas principais**:

### 1. **Next.js API Routes** (Backend Serverless)
📍 **Localização:** `src/app/api/`

Estas são rotas serverless do Next.js que rodam no servidor (não no cliente).

#### Estrutura:
```
src/app/api/
├── plans/
│   └── route.ts                    # GET - Listar planos
├── subscriptions/
│   ├── route.ts                    # GET, POST - Gerenciar assinaturas
│   └── [subscriptionId]/
│       ├── plan/
│       │   └── route.ts            # PATCH - Atualizar plano
│       ├── status/
│       │   └── route.ts            # PATCH - Atualizar status
│       └── payments/
│           └── route.ts            # GET - Listar pagamentos
├── stripe/
│   ├── checkout/
│   │   └── route.ts                # POST - Criar sessão checkout
│   ├── single-poll-checkout/
│   │   └── route.ts                # POST - Checkout enquete avulsa
│   └── webhook/
│       └── route.ts                # POST - Webhook Stripe
└── env-debug/
    └── route.ts                     # GET - Debug variáveis ambiente
```

#### Como funciona:
- Cada arquivo `route.ts` exporta funções `GET`, `POST`, `PATCH`, etc.
- Rodam como serverless functions na Vercel/Next.js
- Acessíveis via: `https://seu-dominio.com/api/nome-da-rota`

### 2. **Firebase Cloud Functions** (Backend Alternativo)
📍 **Localização:** `functions/src/index.ts`

#### Função disponível:
- `voteOnPoll` - Processa votos com transações atômicas

#### Como funciona:
- Rodam no Firebase Cloud Functions
- Podem ser chamadas via SDK do Firebase
- Úteis para operações que precisam de transações complexas

**Nota:** Atualmente, os votos são processados diretamente via Firestore no cliente, então esta função pode não estar sendo usada.

### 3. **Serviços (Lógica de Negócio)**
📍 **Localização:** `src/app/services/`

#### Arquivos:
- `stripeService.ts` - Configuração e instância do Stripe
- `stripeWebhookHandlers.ts` - Handlers para eventos do Stripe
- `subscriptionService.ts` - Lógica completa de assinaturas e planos

#### Como funciona:
- Contém a lógica de negócio reutilizável
- Usado tanto pelas API Routes quanto pelo frontend
- Centraliza operações com Firestore e Stripe

## 🔄 Fluxo de Dados

```
Frontend (React/Next.js)
    ↓
API Routes (src/app/api/)
    ↓
Serviços (src/app/services/)
    ↓
Firebase (Firestore) + Stripe
```

## 🗄️ Banco de Dados

### Firebase Firestore
- **Collections principais:**
  - `polls` - Enquetes
  - `users` - Usuários
  - `plans` - Planos de assinatura
  - `subscriptions` - Assinaturas
  - `payments` - Pagamentos
  - `ratings` - Avaliações de empresas

### Configuração:
- **Arquivo:** `src/lib/firebase.ts`
- **Regras:** `firestore.rules`

## 🔐 Autenticação

- **Firebase Authentication**
- Configurado em: `src/lib/firebase.ts`
- Contexto React: `src/app/context/AuthContext.tsx`

## 💳 Pagamentos

- **Stripe** para processamento de pagamentos
- Webhooks configurados em: `src/app/api/stripe/webhook/route.ts`
- Handlers em: `src/app/services/stripeWebhookHandlers.ts`

## 🚀 Como Executar o Backend

### Desenvolvimento Local:

```bash
# API Routes rodam automaticamente com Next.js
npm run dev

# Acesse: http://localhost:3000/api/plans
```

### Firebase Functions (se necessário):

```bash
cd functions
npm install
firebase deploy --only functions
```

## 📝 Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/plans` | GET | Lista planos disponíveis |
| `/api/subscriptions` | GET, POST | Gerencia assinaturas |
| `/api/subscriptions/[id]/plan` | PATCH | Atualiza plano |
| `/api/stripe/checkout` | POST | Cria sessão checkout |
| `/api/stripe/webhook` | POST | Recebe eventos Stripe |

## 🔍 Onde Está Cada Funcionalidade?

- **Enquetes:** Firestore direto (client-side) + API Routes para validações
- **Assinaturas:** API Routes + `subscriptionService.ts`
- **Pagamentos:** API Routes + Stripe + Webhooks
- **Autenticação:** Firebase Auth (client-side)
- **Votos:** Firestore direto (com validação client-side)

## 📚 Próximos Passos

Para adicionar novas funcionalidades backend:
1. Crie nova rota em `src/app/api/nome-da-funcionalidade/route.ts`
2. Adicione lógica de negócio em `src/app/services/`
3. Configure regras no `firestore.rules` se necessário

