"use client";

import React, { useState } from "react";
import { Comment } from "../types/poll";
import CommentForm from "./CommentForm";
import { useAuth } from "@/app/context/AuthContext"; // Importar useAuth

// Função auxiliar para formatar o tempo como "há X tempo"
const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return `${seconds} segundos atrás`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutos atrás`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} horas atrás`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dias atrás`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} meses atrás`;

  const years = Math.floor(months / 12);
  return `${years} anos atrás`;
};

interface CommentProps {
  comment: Comment;
  onAddReply: (parentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void; // Nova prop para excluir comentário
  replies?: Comment[]; // Adicionar prop para respostas diretas
  totalRepliesCount?: number; // Contagem total de respostas (incluindo aninhadas)
  className?: string;
}

export default function CommentComponent({ comment, onAddReply, onDeleteComment, replies = [], totalRepliesCount = 0, className }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(false); // Novo estado para controlar a visibilidade das respostas
  const { user, isMasterUser } = useAuth(); // Obter o usuário logado e o status de mestre

  const handleReplySubmit = async (text: string) => {
    await onAddReply(comment.id, text);
    setShowReplyForm(false);
  };

  const canDeleteComment = user && (user.uid === comment.authorId || isMasterUser);

  return (
    <div className={`bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg shadow-sm mb-4 max-w-full ${className}`}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">By: {comment.author} {formatTimeAgo(comment.timestamp)}</p>
      <p className="text-zinc-800 dark:text-zinc-200 mt-2 break-words">{comment.text}</p>
      <div className="flex items-center space-x-4 mt-2">
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="text-blue-500 hover:underline text-sm"
        >
          {showReplyForm ? "Cancel Reply" : "Reply"}
        </button>
        {canDeleteComment && (
          <button
            onClick={() => onDeleteComment(comment.id)}
            className="text-red-500 hover:underline text-sm"
          >
            Excluir
          </button>
        )}
        {totalRepliesCount > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-zinc-500 hover:underline text-sm ml-auto"
          >
            {showReplies ? `Ocultar ${totalRepliesCount} respostas` : `Ver ${totalRepliesCount} respostas`}
          </button>
        )}
      </div>

      {showReplyForm && (
        <div className="mt-4">
          <CommentForm
            pollId={comment.pollId}
            parentId={comment.id}
            onAddComment={handleReplySubmit}
            initialText={`@${comment.author} `}
          />
        </div>
      )}

      {showReplies && replies.length > 0 && (
        <div className="ml-6 mt-4 space-y-4">
          {replies.map((reply) => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              onAddReply={onAddReply}
              onDeleteComment={onDeleteComment}
              className="ml-6"
            />
          ))}
        </div>
      )}
    </div>
  );
}



