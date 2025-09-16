"use client";

import React, { useState } from "react";
import { Comment } from "../types/poll";
import CommentForm from "./CommentForm";

interface CommentProps {
  comment: Comment;
  onAddReply: (parentId: string, text: string) => void; // Ajustado para não esperar 'author'
  className?: string;
}

export default function CommentComponent({ comment, onAddReply, className }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  // handleReplySubmit agora corresponde à assinatura de onAddComment do CommentForm
  const handleReplySubmit = (text: string) => {
    // Chamamos onAddReply com o parentId do comentário atual e o texto da resposta
    // O author será providenciado pelo PollCard, que detém o estado do usuário logado
    onAddReply(comment.id, text);
    setShowReplyForm(false);
  };

  return (
    <div className={`bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg shadow-sm mb-4 max-w-full ${className}`}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">By: {comment.author} at {new Date(comment.timestamp).toLocaleString()}</p>
      <p className="text-zinc-800 dark:text-zinc-200 mt-2 break-words">{comment.text}</p>
      <button
        onClick={() => setShowReplyForm(!showReplyForm)}
        className="text-blue-500 hover:underline text-sm mt-2"
      >
        {showReplyForm ? "Cancel Reply" : "Reply"}
      </button>

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
    </div>
  );
}



