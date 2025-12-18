Resumo

Se você está recebendo `permission-denied` ao criar uma enquete, isso significa que as Regras de Segurança do Firestore estão impedindo a operação.

Regras recomendadas de exemplo

Coloque este conteúdo em `firestore.rules` (já adicionado na raiz do repositório):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /polls/{pollId} {
      allow read: if true;

      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.creator.id
        && request.resource.data.title is string
        && request.resource.data.options is list
        && request.resource.data.options.size() >= 2;

      // Allow the poll creator to update/delete the poll.
      // Additionally, allow any authenticated user to update only the `commentCount` field
      // (this is required so commenters can increment/decrement the count safely from the client).
      allow update: if request.auth != null && (
        request.auth.uid == resource.data.creator.id
        || (request.resource.data.keys().hasOnly(['commentCount']) && request.resource.data.commentCount is int)
      );

      allow delete: if request.auth != null && request.auth.uid == resource.data.creator.id;

      // Subcollection for comments
      match /comments/{commentId} {
        allow read: if true;

        // Only authenticated users can create comments and the authorId must match the authenticated user
        allow create: if request.auth != null
          && request.auth.uid == request.resource.data.authorId
          && request.resource.data.text is string
          && request.resource.data.timestamp is int;

        // Only the comment author may update or delete their comment
        allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
      }
    }

    match /users/{userId} {
      allow read: if true; // Public profile

      // Creating a user document only allowed for the authenticated user with the same ID
      allow create: if request.auth != null && request.auth.uid == userId
        && request.resource.data.email is string;

      // Allow the user to update only a safe subset of fields
      allow update: if request.auth != null && request.auth.uid == userId
        && request.resource.data.keys().hasOnly([
          'displayName', 'avatarUrl', 'accountType', 'commercialName', 'aboutUs', 'contactEmail', 'address', 'facebookUrl', 'instagramUrl', 'twitterUrl', 'themeColor', 'extraPollsAvailable', 'bannerURL'
        ]);

      // Allow deletion only to the user (use with caution)
      allow delete: if request.auth != null && request.auth.uid == userId;
    }

    // Fallback: allow read for everything else (restrict as needed)
    match /{document=**} {
      allow read: if true;
    }
  }
}
```

Como testar localmente (Recomendado)

1. Instale o Firebase CLI se ainda não tiver:

```bash
npm install -g firebase-tools
```

2. Emule o Firestore localmente (na raiz do projeto):

```bash
firebase emulators:start --only firestore
```

3. No seu app (rodando em `next dev`), autentique um usuário e tente criar a enquete; o emulador mostrará os logs de autorização.

Como aplicar as regras ao projeto real

1. Faça login com `firebase login` e selecione o projeto correto (`firebase use --add` se necessário).
2. Deploy das regras:

```bash
firebase deploy --only firestore:rules
```

Observações e dicas de depuração

- Confirme que `request.auth.uid` corresponde exatamente ao `creator.id` que você grava no documento (no cliente você grava `creator: { id: user.uid, ... }`).
- Se você usa `serverTimestamp()` para `createdAt`, evite validar `createdAt` estritamente nas regras (o valor é preenchido pelo servidor).
- Se prefere lógica de confiança centralizada, crie uma API server-side que use Admin SDK para gravar em Firestore (Admin SDK ignora regras de segurança), por exemplo para ações administrativas ou validações complexas.

Se quiser, posso:
- A: Ajustar as regras para abranger outros requisitos (por exemplo validação de `creator.name`, `category` etc.).
- B: Adicionar testes de regras usando o Firebase Emulator e `@firebase/rules-unit-testing`.
- C: Implementar uma rota server (API) que cria enquetes com Admin SDK (se você preferir não alterar regras públicas).

Qual opção prefere que eu siga agora?