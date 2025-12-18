# 🚀 Guia Completo de Configuração - Poll App

Este guia vai te ajudar a configurar tudo do zero após recriar o banco de dados Firebase.

## 📋 Checklist de Configuração

- [ ] 1. Variáveis de Ambiente
- [ ] 2. Regras do Firestore
- [ ] 3. Regras do Storage
- [ ] 4. Inicialização dos Planos Padrão
- [ ] 5. Teste das Funcionalidades

---

## 1️⃣ Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id

# Para usar Firebase Emulators localmente (descomente a linha abaixo)
# NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Stripe (se estiver usando pagamentos)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Outras variáveis (se necessário)
```

**Onde encontrar essas informações:**
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Role até **Seus apps** e clique no ícone de configuração
5. Copie as credenciais do Firebase

---

## 2️⃣ Regras do Firestore

### Para Testes Locais (Emuladores)

Se você está usando os **Firebase Emulators** localmente:

1. **Instale o Firebase CLI** (se ainda não tiver):
   ```bash
   npm install -g firebase-tools
   ```

2. **Crie o arquivo `firebase.json`** na raiz do projeto:
   ```json
   {
     "firestore": {
       "rules": "firestore.rules"
     },
     "storage": {
       "rules": "storage.rules"
     },
     "emulators": {
       "auth": {
         "port": 9099
       },
       "firestore": {
         "port": 8080
       },
       "storage": {
         "port": 9199
       },
       "ui": {
         "enabled": true,
         "port": 4000
       }
     }
   }
   ```

3. **Adicione a variável de ambiente** no `.env.local`:
   ```env
   NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
   ```

4. **Inicie os emuladores** (em um terminal separado):
   ```bash
   firebase emulators:start
   ```
   
   Isso iniciará:
   - Auth Emulator na porta 9099
   - Firestore Emulator na porta 8080
   - Storage Emulator na porta 9199
   - Emulator UI na porta 4000 (acesse http://localhost:4000)

5. **Inicie o Next.js** (em outro terminal):
   ```bash
   npm run dev
   ```

6. As regras serão carregadas automaticamente dos arquivos `firestore.rules` e `storage.rules`

**Nota:** O código já está configurado para usar emuladores quando `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` está definido.

### Para Produção (Firebase Real)

1. Acesse o Firebase Console → **Firestore Database**
2. Vá na aba **Regras**
3. Cole o conteúdo do arquivo `firestore.rules` (que já está atualizado no projeto)
4. Clique em **Publicar**

**Arquivo:** `firestore.rules` (na raiz do projeto)

As regras já estão configuradas para:
- ✅ Criar/ler/atualizar enquetes
- ✅ Votar em enquetes (atualizar options + votedBy)
- ✅ Curtir/descurtir enquetes
- ✅ Criar comentários
- ✅ Gerenciar perfis de usuários
- ✅ Criar enquetes comerciais
- ✅ Criar/ler planos de assinatura
- ✅ Criar/ler assinaturas (via API routes)
- ✅ Criar logs de pagamentos e auditoria (via API routes)
- ✅ Criar logs de criação de enquetes

---

## 3️⃣ Regras do Storage

### Para Testes Locais (Emuladores)

Se você está usando os **Firebase Emulators**, as regras serão carregadas automaticamente do arquivo `storage.rules` quando você iniciar os emuladores (veja seção anterior).

### Para Produção (Firebase Real)

1. Acesse o Firebase Console → **Storage**
2. Vá na aba **Regras**
3. Cole o conteúdo do arquivo `storage.rules` (que já está atualizado no projeto)
4. Clique em **Publicar**

**Arquivo:** `storage.rules` (na raiz do projeto)

As regras permitem:
- ✅ Upload de avatares (`avatars/{userId}/{fileName}`)
- ✅ Upload de imagens de perfil (`profile_images/{fileName}`)
- ✅ Upload de banners (`banner_images/{fileName}`)
- ✅ Upload de imagens de enquetes (`poll_images/{fileName}`)

**Limites configurados:**
- Tamanho máximo: 5MB por arquivo
- Tipo: Apenas imagens (`image/*`)

---

## 4️⃣ Inicialização dos Planos Padrão

Os planos padrão são criados automaticamente quando você acessa a rota `/api/plans`, mas você pode inicializá-los manualmente também.

### Opção A: Automática (Recomendada)
1. Inicie o servidor: `npm run dev`
2. Acesse qualquer página que carregue os planos (ex: dashboard de assinaturas)
3. Os planos serão criados automaticamente no Firestore

### Opção B: Manual via API
1. Inicie o servidor: `npm run dev`
2. Acesse: `http://localhost:3000/api/plans`
3. Isso criará os 3 planos padrão:
   - **Basic** (R$ 10,00/mês) - 10 enquetes/mês
   - **Medium** (R$ 79,90/mês) - 40 enquetes/mês
   - **Pro** (R$ 159,90/mês) - 200 enquetes/mês

### Opção C: Script de Inicialização
Execute o script que será criado (veja seção abaixo)

---

## 5️⃣ Estrutura de Coleções do Firestore

As seguintes coleções serão criadas automaticamente conforme necessário:

### Coleções Principais:
- `polls` - Enquetes criadas
  - Subcoleção: `comments` - Comentários das enquetes
- `users` - Perfis de usuários
  - Subcoleção: `ratings` - Avaliações de empresas
- `plans` - Planos de assinatura (criados automaticamente)
- `subscriptions` - Assinaturas ativas
- `payments` - Histórico de pagamentos
- `subscription_audit` - Log de mudanças nas assinaturas
- `poll_creation_logs` - Log de criação de enquetes (para controle de limites)

---

## 6️⃣ Teste das Funcionalidades

Após configurar tudo, teste:

### ✅ Autenticação
- [ ] Criar conta (pessoal e comercial)
- [ ] Fazer login
- [ ] Fazer logout

### ✅ Enquetes
- [ ] Criar enquete
- [ ] Votar em enquete
- [ ] Curtir/descurtir enquete
- [ ] Comentar em enquete
- [ ] Compartilhar enquete

### ✅ Perfil
- [ ] Editar perfil
- [ ] Fazer upload de avatar
- [ ] Fazer upload de banner (conta comercial)
- [ ] Editar informações comerciais

### ✅ Dashboard
- [ ] Visualizar enquetes criadas
- [ ] Deletar enquete
- [ ] Ver estatísticas

---

## 🔧 Solução de Problemas

### Erro: "Permission denied" ao votar
- Verifique se as regras do Firestore foram publicadas
- Verifique se o usuário está autenticado
- Verifique se o usuário ainda não votou nesta enquete (não pode votar duas vezes)

### Erro: "Permission denied" ao criar enquete
- Verifique se as regras do Firestore foram publicadas
- Verifique se o usuário está autenticado
- Verifique se o `creator.id` no documento corresponde ao `request.auth.uid`

### Erro: "Storage unauthorized"
- Verifique se as regras do Storage foram publicadas
- Verifique se o arquivo tem menos de 5MB
- Verifique se o arquivo é uma imagem
- Verifique se o `contentType` está sendo definido (já está no código)

### Planos não aparecem
- Acesse `/api/plans` para inicializar os planos
- Verifique se a coleção `plans` foi criada no Firestore
- Verifique se as regras do Firestore permitem leitura pública de planos

### Assinaturas não funcionam
- Verifique se as regras do Firestore foram publicadas
- As assinaturas são criadas via API routes (`/api/subscriptions`)
- Verifique se o usuário está autenticado ao criar assinatura

### Upload de imagens não funciona
- Verifique se as regras do Storage foram publicadas
- Verifique se o `contentType` está sendo definido (já está no código)
- Verifique o tamanho do arquivo (máximo 5MB)

---

## 📝 Notas Importantes

1. **Regras de Segurança**: Sempre publique as regras após modificá-las
2. **Variáveis de Ambiente**: Nunca commite o arquivo `.env.local` no Git
3. **Planos**: Os planos são criados automaticamente via `/api/plans`, mas você pode editá-los no Firestore
4. **Limites**: Usuários sem assinatura têm limite de 2 enquetes/mês
5. **Votação**: Usuários podem votar apenas uma vez por enquete (controlado pelo campo `votedBy`)
6. **API Routes**: As operações de assinatura, pagamentos e planos são feitas via API routes (server-side), não diretamente do client
7. **Segurança**: As regras permitem operações necessárias, mas em produção considere usar Admin SDK nas API routes para maior segurança

---

## ✅ O Que Foi Corrigido/Configurado

### Regras do Firestore
- ✅ **Votação em enquetes**: Agora permite atualizar `options` e `votedBy` juntos quando o usuário vota
- ✅ **Planos**: Permite criar/atualizar planos via API routes (para inicialização)
- ✅ **Assinaturas**: Permite criar/atualizar assinaturas via API routes
- ✅ **Pagamentos**: Permite criar registros de pagamento via API routes
- ✅ **Logs de auditoria**: Permite criar logs via API routes
- ✅ **Logs de criação de enquetes**: Permite criar logs para controle de limites

### Regras do Storage
- ✅ **Upload de imagens**: Configurado com validação de contentType e tamanho
- ✅ **Metadata**: Código atualizado para incluir contentType nos uploads

### Código
- ✅ **Upload de imagens**: Adicionado metadata com contentType em todos os uploads
- ✅ **Criação de enquetes**: Inicialização dos campos `likes`, `likedBy`, `dislikes`, `dislikedBy`

---

## 🎉 Pronto!

Seu projeto deve estar funcionando agora. Se tiver algum problema, verifique os logs do console do navegador e do servidor.

### Checklist Final
- [ ] Variáveis de ambiente configuradas (`.env.local`)
- [ ] Regras do Firestore publicadas
- [ ] Regras do Storage publicadas
- [ ] Planos inicializados (acesse `/api/plans`)
- [ ] Teste de criação de conta
- [ ] Teste de criação de enquete
- [ ] Teste de votação
- [ ] Teste de curtidas
- [ ] Teste de upload de imagens


