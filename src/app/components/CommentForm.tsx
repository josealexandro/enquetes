"use client";

import React, { useState, useEffect } from "react";

interface CommentFormProps {
  pollId: string;
  parentId?: string; // Optional: for replies
  onAddComment: (author: string, text: string) => void;
  initialText?: string; // New: for pre-filling reply text
}

export default function CommentForm({ pollId, parentId, onAddComment, initialText }: CommentFormProps) {
  const [author, setAuthor] = useState("");
  const [commentText, setCommentText] = useState(initialText || "");

  // Use useEffect to update commentText if initialText changes (e.g., when replying to different comments)
  useEffect(() => {
    setCommentText(initialText || "");
  }, [initialText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (author.trim() === "" || commentText.trim() === "") {
      alert("Please enter your name and comment.");
      return;
    }
    onAddComment(author.trim(), commentText.trim());
    setCommentText("");
    // Optionally, clear author if you want users to re-enter for each comment
    // setAuthor('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md space-y-4">
      <input
        type="text"
        placeholder="Your Name"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 font-inter"
        required
      />
      <textarea
        placeholder={parentId ? "Your Reply" : "Your Comment"}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 font-inter"
        required
      ></textarea>
      <button
        type="submit"
        className="w-full px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
      >
        {parentId ? "Submit Reply" : "Submit Comment"}
      </button>
    </form>
  );
}







