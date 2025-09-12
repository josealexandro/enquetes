"use client";

import React, { useState } from "react";
import { Comment } from "../types/poll";
import CommentForm from "./CommentForm";

interface CommentProps {
  comment: Comment;
  onAddReply: (parentId: string, author: string, text: string) => void;
  className?: string;
}

export default function CommentComponent({ comment, onAddReply, className }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReplySubmit = (author: string, text: string) => {
    onAddReply(comment.id, author, text);
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



