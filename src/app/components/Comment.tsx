"use client";

import React, { useState, useEffect } from "react";
import { Comment } from "../types/poll";
import CommentForm from "./CommentForm";
import { useAuth } from "@/app/context/AuthContext";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, arrayUnion, arrayRemove } from "firebase/firestore";

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
  onAddReply: (parentId: string, text: string) => Promise<void | { ok: boolean; message?: string }>;
  onDeleteComment: (commentId: string) => void;
  replies?: Comment[];
  totalRepliesCount?: number;
}

export default function CommentComponent({
  comment,
  onAddReply,
  onDeleteComment,
  replies = [],
  totalRepliesCount = 0,
}: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const { user, isMasterUser } = useAuth();
  
  // Estados locais para Optimistic UI de Likes (simples - apenas curtir)
  const [likes, setLikes] = useState(comment.likes || 0);
  const [likedBy, setLikedBy] = useState<string[]>(comment.likedBy || []);

  // Sincronizar estados locais se o comentário mudar
  useEffect(() => {
    setLikes(comment.likes || 0);
    setLikedBy(comment.likedBy || []);
  }, [comment.likes, comment.likedBy]);

  // ============================================
  // FUNÇÃO: HANDLE LIKE (Curtir comentário)
  // ============================================
  // OBJETIVO: Permite usuário curtir/descurtir comentário
  // FUNCIONAMENTO:
  //   1. Verifica se usuário está logado
  //   2. Atualiza estado local (Optimistic UI)
  //   3. Atualiza Firestore (increment/arrayUnion ou arrayRemove)
  //   4. Em caso de erro, reverte estado local
  // SIMPLICIDADE: Apenas curtir (sem dislike), mesma lógica das enquetes
  // ============================================
  const handleLike = async () => {
    if (!user) {
      // Não exibir prompt - apenas não fazer nada se não estiver logado
      return;
    }

    const commentRef = doc(db, "polls", comment.pollId, "comments", comment.id);
    const hasLiked = likedBy.includes(user.uid);

    // Optimistic Update - atualiza UI imediatamente
    if (hasLiked) {
      setLikes(prev => prev - 1);
      setLikedBy(prev => prev.filter(id => id !== user.uid));
    } else {
      setLikes(prev => prev + 1);
      setLikedBy(prev => [...prev, user.uid]);
    }

    try {
      if (hasLiked) {
        // Descurtir - remove do array e decrementa contador
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid),
        });
      } else {
        // Curtir - adiciona no array e incrementa contador
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        });
      }
    } catch (error: unknown) {
      console.error("Erro ao curtir comentário:", error);
      const code = error && typeof error === "object" && "code" in error ? (error as { code: string }).code : undefined;
      if (code === "permission-denied") {
        return;
      }
      
      // Reverter Optimistic Update em caso de erro
      if (hasLiked) {
        setLikes(prev => prev + 1);
        setLikedBy(prev => [...prev, user.uid]);
      } else {
        setLikes(prev => prev - 1);
        setLikedBy(prev => prev.filter(id => id !== user.uid));
      }
    }
  };

  const handleReplySubmit = async (text: string) => {
    await onAddReply(comment.id, text);
    setShowReplyForm(false);
  };

  const canDeleteComment =
    user && (user.uid === comment.authorId || isMasterUser);

  return (
    <div
      style={{
        marginLeft: 0, // Todas as respostas e comentários de nível superior sem margem à esquerda
      }}
    >
      <div className="border-l border-zinc-700/40">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-medium text-zinc-200">{comment.author}</span>{" "}
              <span className="text-xs text-zinc-500">
                • {formatTimeAgo(comment.timestamp)}
              </span>
            </p>

            <p className="text-zinc-100 mt-1 break-words whitespace-normal">
              {comment.text}
            </p>
          </div>

          {/* Botão de curtir comentário - ao lado do texto */}
          <button
            onClick={handleLike}
            className={`p-1.5 rounded-full transition-colors duration-200 flex items-center gap-1 shrink-0 self-start mt-1 ${
              user && likedBy.includes(user.uid)
                ? "text-red-500 hover:text-red-600"
                : "text-zinc-400 hover:text-red-500"
            }`}
            aria-label="Curtir Comentário"
          >
            <FontAwesomeIcon icon={faHeart} size="sm" />
            {likes > 0 && <span className="text-xs font-medium min-w-[1rem] text-center">{likes}</span>}
          </button>
        </div>

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
          <div className="mt-3 space-y-3" style={{ marginLeft: '20px' }}>
            {replies.map((reply) => (
              <CommentComponent
                key={reply.id}
                comment={reply}
                onAddReply={onAddReply}
                onDeleteComment={onDeleteComment}
                replies={[]} // Respostas de respostas não são exibidas
                totalRepliesCount={0} // Respostas de respostas não contam
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
