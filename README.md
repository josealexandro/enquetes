# 📊 Poll App (Enquetes)

Uma plataforma moderna e interativa para criação, compartilhamento e votação em enquetes. Desenvolvido com **Next.js 15**, **TypeScript**, **Tailwind CSS** e **Firebase**.

![Poll App Banner](/public/globe.svg)

## 🚀 Funcionalidades Principais

### 🗳️ Sistema de Enquetes
*   **Criação Intuitiva:** Crie enquetes com múltiplas opções.
*   **Votação:** Sistema de votação simples e rápido.
*   **Rankings:** Pódio automático para as enquetes mais votadas (Ouro, Prata e Bronze).
*   **Categorias:** Organização por temas (Geral, Política, Games, etc.).

### 💬 Interação Social (Tempo Real)
*   **Comentários em Tempo Real:** Discuta sobre as enquetes instantaneamente (Powered by Firestore listeners).
*   **Limitação Inteligente:** Carregamento otimizado dos 20 comentários mais recentes para performance.
*   **Likes e Dislikes:** Reaja às enquetes com contadores visuais animados.
*   **Compartilhamento:** Links diretos, WhatsApp e geração de **QR Code** para cada enquete.

### 👤 Contas e Perfis
*   **Autenticação:** Login e Registro via Firebase Auth.
*   **Perfis de Usuário:**
    *   **Contas Pessoais:** Para usuários comuns.
    *   **Contas Comerciais (Empresas):** Perfis com personalização de marca (Logo, Cores, Links Sociais, "Sobre Nós").
*   **Dashboard:** Área administrativa para gerenciar suas enquetes e editar perfil.

### 🎨 Interface e UX
*   **Design Responsivo:** Funciona perfeitamente em Desktop e Mobile.
*   **Dark Mode:** Suporte nativo a tema escuro e claro.
*   **Animações:** Uso de `framer-motion` para interações fluidas (votos, likes, menus).
*   **Optimistic UI:** Atualizações de interface instantâneas para likes/dislikes antes mesmo da confirmação do servidor.

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/)
*   **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
*   **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Ícones:** [FontAwesome](https://fontawesome.com/)
*   **Animações:** [Framer Motion](https://www.framer.com/motion/)
*   **Backend / Database:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)
*   **Gerador de QR Code:** `react-qr-code`

---

## 📦 Como Rodar o Projeto

### Pré-requisitos
*   Node.js (versão 20 ou superior recomendada)
*   npm ou yarn
*   Conta no Firebase

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/josealexandro/enquetes.git
    cd enquetes
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo `.env.local` na raiz do projeto com as credenciais do seu projeto Firebase e do gateway de pagamento (Pagar.me):

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id

    PAGARME_API_BASE=https://api.pagar.me/core/v5
    PAGARME_API_KEY=sua_chave_privada
    PAGARME_ENCRYPTION_KEY=sua_chave_de_criptografia
    ```

4.  **Execute o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

5.  **Acesse:** Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📂 Estrutura do Projeto

```bash
src/
├── app/                 # Rotas e Páginas (App Router)
│   ├── components/      # Componentes Reutilizáveis (PollCard, Header, etc.)
│   ├── context/         # Contextos React (Auth, Theme)
│   ├── empresa/         # Páginas dinâmicas de empresas
│   ├── poll/            # Páginas dinâmicas de enquetes individuais
│   └── ...
├── lib/                 # Configurações de bibliotecas (Firebase)
├── types/               # Definições de Tipos TypeScript
└── utils/               # Funções utilitárias (Helpers)
```

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

1.  Faça um Fork do projeto
2.  Crie uma Branch para sua Feature (`git checkout -b feature/MinhaFeature`)
3.  Faça o Commit (`git commit -m 'Adicionando nova feature'`)
4.  Faça o Push (`git push origin feature/MinhaFeature`)
5.  Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
