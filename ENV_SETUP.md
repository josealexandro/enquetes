# Configuração de Variáveis de Ambiente

Este arquivo serve como guia para configurar as variáveis de ambiente do projeto.

## Como usar

1. Copie este arquivo para `.env.local` na raiz do projeto:
   ```bash
   cp ENV_SETUP.md .env.local
   ```
   
   Ou crie manualmente o arquivo `.env.local` e copie o conteúdo abaixo.

2. Preencha os valores com suas credenciais reais.

## Template de Variáveis de Ambiente

```env
# Firebase Configuration
# Obtenha essas credenciais no Firebase Console: https://console.firebase.google.com/
# Vá em Configurações do Projeto > Seus apps > Configuração do SDK
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id

# Para usar Firebase Emulators localmente (descomente a linha abaixo)
# NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Pagar.me (Gateway de Pagamento)
# Obtenha essas credenciais no painel do Pagar.me
PAGARME_API_BASE=https://api.pagar.me/core/v5
PAGARME_API_KEY=sua_chave_privada
PAGARME_ENCRYPTION_KEY=sua_chave_de_criptografia

# Stripe (opcional - se estiver usando pagamentos com Stripe)
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

## Onde encontrar as credenciais

### Firebase
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Role até **Seus apps** e clique no ícone de configuração
5. Copie as credenciais do Firebase

### Pagar.me
1. Acesse o painel do Pagar.me
2. Vá em **Configurações** > **API Keys**
3. Copie suas chaves de API

### Stripe (se aplicável)
1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers** > **API keys**
3. Copie suas chaves de API








