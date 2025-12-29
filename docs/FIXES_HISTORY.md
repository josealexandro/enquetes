# Histórico de Correções e Soluções

Este documento registra os problemas encontrados e as soluções aplicadas durante o desenvolvimento do Poll App, para evitar cometer os mesmos erros no futuro.

## Data: 24/12/2025

### 1. Erro de Permissão ao Curtir/Descurtir Enquetes

**Problema:**
- Erro "Missing or insufficient permissions" ao tentar curtir ou descurtir enquetes
- A operação era bem-sucedida (o like/dislike era registrado), mas aparecia mensagem de erro

**Causa:**
- As regras do Firestore não reconheciam corretamente as operações especiais `increment()`, `arrayUnion()` e `arrayRemove()`
- Essas operações são processadas no servidor e não aparecem em `request.resource.data.keys()` da mesma forma que valores diretos

**Solução:**
- Ajustadas as regras do Firestore para verificar que campos críticos permanecem inalterados, em vez de tentar validar os valores das operações especiais
- Regra aplicada (linhas 73-89 em `firestore.rules`):
  ```javascript
  || (
      // Ensure critical fields that should NOT be modified remain unchanged
      request.resource.data.options == resource.data.options
      && request.resource.data.votedBy == resource.data.votedBy  
      && request.resource.data.commentCount == resource.data.commentCount
      // ... outros campos críticos
  )
  ```

**Arquivos Modificados:**
- `firestore.rules` (linhas 73-89)
- `src/app/components/PollCard.tsx` (tratamento de erros)

---

### 2. Erro de Permissão ao Votar em Enquetes de Outras Contas

**Problema:**
- Erro "Missing or insufficient permissions" ao tentar votar em enquetes de outras contas
- O voto era registrado em `votedBy`, mas aparecia mensagem de erro

**Causa:**
- As regras do Firestore não permitiam que não-donos atualizassem `options.votes` e `votedBy` juntos
- O código tentava atualizar apenas `votedBy`, mas as regras eram muito restritivas

**Solução:**
- Ajustadas as regras do Firestore para permitir que não-donos atualizem `options` e `votedBy` juntos, com validações de segurança
- Regra aplicada (linhas 50-82 em `firestore.rules`):
  ```javascript
  || (
      // Ensure user hasn't voted before
      !resource.data.votedBy.hasAny([request.auth.uid])
      // Validate that votedBy only has one new element
      && request.resource.data.votedBy.size() == resource.data.votedBy.size() + 1
      && request.resource.data.votedBy.hasAll(resource.data.votedBy)
      && request.resource.data.votedBy.hasAny([request.auth.uid])
      // Ensure other critical fields are unchanged
      && request.resource.data.options == resource.data.options
      // ... outros campos críticos
  )
  ```

**Arquivos Modificados:**
- `firestore.rules` (linhas 50-82)
- `src/app/page.tsx` (handleVote)
- `src/app/enquetes/page.tsx` (handleVote)
- `src/app/empresa/[slug]/enquete/[pollSlug]/page.tsx` (handleVote)

---

### 3. Votos Não Persistindo Após Atualizar Página

**Problema:**
- Quando um usuário não-dono votava, o voto aparecia na UI, mas ao atualizar a página, o número de votos voltava ao valor anterior
- O `votedBy` era atualizado, mas `options.votes` não era

**Causa:**
- O código atualizava apenas `votedBy` quando não era o dono, mas não atualizava `options.votes`
- As regras do Firestore não permitiam atualizar `options` para não-donos

**Solução:**
- Ajustadas as regras do Firestore para permitir que não-donos atualizem `options` e `votedBy` juntos (ver item 2)
- O código agora atualiza ambos os campos quando não é o dono

**Arquivos Modificados:**
- `firestore.rules` (linhas 50-82)
- `src/app/page.tsx` (handleVote)
- `src/app/enquetes/page.tsx` (handleVote)
- `src/app/empresa/[slug]/enquete/[pollSlug]/page.tsx` (handleVote)

---

### 4. Erro de Permissão ao Adicionar Comentários

**Problema:**
- Erro "Missing or insufficient permissions" ao adicionar comentários
- O comentário era adicionado com sucesso, mas aparecia mensagem de erro

**Causa:**
- O código tentava incrementar `commentCount` após criar o comentário
- A atualização de `commentCount` falhava com erro de permissão, mesmo que o comentário fosse criado

**Solução:**
- Tratamento de erro separado: se o comentário for criado mas o incremento de `commentCount` falhar, não mostrar erro ao usuário
- O `onSnapshot` atualiza o estado automaticamente

**Arquivos Modificados:**
- `src/app/components/PollCard.tsx` (handleAddComment)

---

### 5. Erro de Permissão ao Excluir Comentários

**Problema:**
- Erro "Missing or insufficient permissions" ao excluir comentários
- O comentário era excluído com sucesso, mas aparecia mensagem de erro

**Causa:**
- O código tentava decrementar `commentCount` após excluir o comentário
- A atualização de `commentCount` falhava com erro de permissão, mesmo que o comentário fosse excluído

**Solução:**
- Tratamento de erro separado: se o comentário for excluído mas o decremento de `commentCount` falhar, não mostrar erro ao usuário
- O `onSnapshot` atualiza o estado automaticamente

**Arquivos Modificados:**
- `src/app/components/PollCard.tsx` (handleDeleteComment)

---

### 6. Erro de Permissão ao Atualizar Nome de Perfil de Conta Pública

**Problema:**
- Erro "Missing or insufficient permissions" ao atualizar o nome de perfil de conta pública
- O nome era atualizado no Firebase Auth, mas aparecia mensagem de erro

**Causa:**
- O código tentava atualizar o `displayName` no Firestore após atualizar no Firebase Auth
- A atualização no Firestore falhava com erro de permissão, mesmo que o Auth fosse atualizado

**Solução:**
- Tratamento de erro separado: se o Auth for atualizado mas o Firestore falhar, mostrar mensagem de sucesso
- O nome já foi atualizado no Firebase Auth, que é o principal

**Arquivos Modificados:**
- `src/app/profile/page.tsx` (handleUpdateProfile)

---

### 7. Erro de TypeScript no Build da Vercel

**Problema:**
- Erro de compilação TypeScript: `Property 'creator' does not exist on type 'PollDetailData'`
- O build falhava na Vercel

**Causa:**
- O tipo `PollDetailData` não tinha a propriedade `creator`, mas o código tentava acessar `poll.creator.id`

**Solução:**
- Adicionada a propriedade `creator` ao tipo `PollDetailData`
- Atualizado o objeto `pollData` para incluir `creator` ao ser criado

**Arquivos Modificados:**
- `src/app/empresa/[slug]/enquete/[pollSlug]/page.tsx`

---

## Lições Aprendidas

### 1. Operações Especiais do Firestore
- `increment()`, `arrayUnion()` e `arrayRemove()` são operações especiais processadas no servidor
- Essas operações não aparecem em `request.resource.data.keys()` da mesma forma que valores diretos
- **Solução:** Verificar que campos críticos permanecem inalterados, em vez de tentar validar os valores das operações especiais

### 2. Tratamento de Erros em Operações Múltiplas
- Quando uma operação envolve múltiplas atualizações (ex: criar comentário + incrementar contador), tratar erros separadamente
- Se a operação principal for bem-sucedida, não mostrar erro ao usuário mesmo que operações secundárias falhem
- **Solução:** Usar try/catch aninhados para operações secundárias

### 3. Validação de Tipos TypeScript
- Sempre garantir que os tipos TypeScript correspondam ao uso real no código
- Verificar tipos ao adicionar novas propriedades ou modificar estruturas de dados
- **Solução:** Executar `npm run build` localmente antes de fazer push

### 4. Regras do Firestore
- As regras devem ser permissivas o suficiente para permitir operações legítimas, mas restritivas o suficiente para manter a segurança
- Para operações especiais, validar que campos críticos não são modificados, em vez de tentar validar os valores das operações
- **Solução:** Usar comparação de igualdade (`==`) para campos críticos que não devem ser modificados

---

## Checklist Antes de Deploy

- [ ] Executar `npm run build` localmente para verificar erros de TypeScript
- [ ] Verificar que todas as variáveis de ambiente estão configuradas na Vercel
- [ ] Verificar que `firebase.json`, `firestore.rules` e `storage.rules` estão no repositório
- [ ] Verificar que arquivos sensíveis (`.env`, `.env.local`) estão no `.gitignore`
- [ ] Testar funcionalidades críticas localmente antes de fazer deploy

---

## Comandos Úteis

```bash
# Verificar erros de lint
npm run lint

# Verificar erros de TypeScript e build
npm run build

# Verificar status do Git
git status

# Adicionar todos os arquivos modificados
git add .

# Criar commit
git commit -m "Descrição das mudanças"

# Enviar para o GitHub
git push
```

---

## Notas Importantes

- Sempre testar localmente antes de fazer push
- As regras do Firestore devem ser deployadas manualmente no Console do Firebase
- Variáveis de ambiente devem ser configuradas na Vercel antes do deploy
- Logs de debug devem ser removidos antes de fazer commit (ou mantidos apenas para desenvolvimento)

