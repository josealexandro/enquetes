export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  pollId: string;
  parentId?: string; // Optional: for replies to a comment
  author: string;
  authorId: string; // Adicionar o ID do autor aqui
  text: string;
  timestamp: number; // Using timestamp for easy sorting
}

export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  creator: {
    name: string;
    avatarUrl: string;
    id: string; // Adicionar o ID do criador aqui
  };
  createdAt: number; // Timestamp for sorting by recency
  category: string;
  likes: number; // Novo campo para o número de curtidas
  likedBy: string[]; // Novo campo para armazenar os IDs dos usuários que curtiram
  dislikes: number; // Novo campo para o número de descurtidas
  dislikedBy: string[]; // Novo campo para armazenar os IDs dos usuários que descurtiram
  isCommercial: boolean; // Novo campo para indicar se a enquete é comercial
  // creatorId?: string; // Remover esta linha, pois o ID agora está dentro de 'creator'
}

