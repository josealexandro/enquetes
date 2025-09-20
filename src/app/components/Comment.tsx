"use client";

import React, { useState } from "react";
import { Comment } from "../types/poll";
import CommentForm from "./CommentForm";
import { useAuth } from "@/app/context/AuthContext"; // Importar useAuth

interface CommentProps {
  comment: Comment;
  onAddReply: (parentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void; // Nova prop para excluir comentário
  className?: string;
}

export default function CommentComponent({ comment, onAddReply, onDeleteComment, className }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { user, isMasterUser } = useAuth(); // Obter o usuário logado e o status de mestre

  const handleReplySubmit = async (text: string) => {
    await onAddReply(comment.id, text);
    setShowReplyForm(false);
  };

  const canDeleteComment = user && (user.uid === comment.authorId || isMasterUser);

  return (
    <div className={`bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg shadow-sm mb-4 max-w-full ${className}`}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">By: {comment.author} at {new Date(comment.timestamp).toLocaleString()}</p>
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
    </div>
  );
}



