"use client";

import React, { useState } from "react";
import { Comment } from "../types/poll";
import CommentForm from "./CommentForm";
import { useAuth } from "@/app/context/AuthContext";

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
  onDeleteComment: (commentId: string) => void;
  replies?: Comment[];
  totalRepliesCount?: number;
  depth: number;
  getReplies: (commentId: string) => Comment[];
  countReplies: (commentId: string) => number;
  className?: string;
}

export default function CommentComponent({
  comment,
  onAddReply,
  onDeleteComment,
  replies = [],
  totalRepliesCount = 0,
  depth,
  getReplies,
  countReplies,
  className,
}: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(depth > 0);
  const { user, isMasterUser } = useAuth();

  const MAX_INDENT_LEVEL = 2; // Definir o número máximo de níveis de indentação

  const handleReplySubmit = async (text: string) => {
    await onAddReply(comment.id, text);
    setShowReplyForm(false);
  };

  const canDeleteComment = user && (user.uid === comment.authorId || isMasterUser);

  return (
    <div
      className={`mb-4 transition-all duration-300 ${className || ""}`}
      style={{
        marginLeft: depth > 0 ? Math.min(depth, MAX_INDENT_LEVEL) * 12 : 0, // Limitar a indentação máxima
        maxWidth: `calc(100% - ${Math.min(depth, MAX_INDENT_LEVEL) * 12}px)`, // Ajustar maxWidth para o novo limite
      }}
    >
      <div className="border-l border-zinc-700/40 pl-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-200">{comment.author}</span>{" "}
          <span className="text-xs text-zinc-500">• {formatTimeAgo(comment.timestamp)}</span>
        </p>

        <p className="text-zinc-100 mt-1 break-words">{comment.text}</p>

        <div className="flex items-center space-x-3 mt-2 text-sm flex-wrap">
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-blue-500 hover:underline"
          >
            {showReplyForm ? "Cancelar" : "Responder"}
          </button>

          {canDeleteComment && (
            <button
              onClick={() => onDeleteComment(comment.id)}
              className="text-red-500 hover:underline"
            >
              Excluir
            </button>
          )}

          {totalRepliesCount > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-zinc-500 hover:underline ml-auto"
            >
              {showReplies
                ? `Ocultar ${totalRepliesCount} respostas`
                : `Ver ${totalRepliesCount} respostas`}
            </button>
          )}
        </div>

        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              pollId={comment.pollId}
              parentId={comment.id}
              onAddComment={handleReplySubmit}
              initialText={`@${comment.author} `}
            />
          </div>
        )}

        {showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <CommentComponent
                key={reply.id}
                comment={reply}
                onAddReply={onAddReply}
                onDeleteComment={onDeleteComment}
                replies={getReplies(reply.id)}
                totalRepliesCount={countReplies(reply.id)}
                depth={depth + 1}
                getReplies={getReplies}
                countReplies={countReplies}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
