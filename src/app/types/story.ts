import { Timestamp } from "firebase/firestore";

/**
 * Interface para representar um Story de empresa
 * 
 * DOCUMENTAÇÃO:
 * - Stories são posts temporários (24h) que aparecem em formato de bolhas circulares
 * - Apenas empresas com plano Medium ou Pro podem criar stories
 * - Máximo de 2 stories ativos por empresa
 * - Stories expiram automaticamente após 24 horas
 * 
 * ESTRUTURA:
 * - Armazenado em: users/{empresaId}/stories/{storyId}
 * - Campos obrigatórios: imageUrl, createdAt, expiresAt
 * - Campo opcional: text (máximo 80 caracteres)
 */
export interface Story {
  id: string;
  imageUrl: string; // URL da imagem (por enquanto apenas URL externa, sem upload)
  text?: string; // Texto opcional (máximo 80 caracteres)
  createdAt: Timestamp; // Data de criação
  expiresAt: Timestamp; // Data de expiração (createdAt + 24h)
}

/**
 * Interface para criar um novo Story
 * 
 * DOCUMENTAÇÃO:
 * - Usado na API route para criar stories
 * - Validações:
 *   - imageUrl deve ser uma URL válida
 *   - text é opcional, mas se fornecido, máximo 80 caracteres
 *   - expiresAt é calculado automaticamente (createdAt + 24h)
 */
export interface CreateStoryInput {
  imageUrl: string;
  text?: string;
}

/**
 * Interface para resposta da API de stories
 */
export interface StoryResponse {
  success: boolean;
  story?: Story;
  error?: string;
}
