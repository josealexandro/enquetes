"use client";

import React, { useState, useEffect } from "react";
import { contemPalavrao } from "@/utils/profanityFilter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceFrown } from "@fortawesome/free-regular-svg-icons";

interface CommentFormProps {
  pollId: string;
  parentId?: string;
  onAddComment: (text: string, parentId?: string) => Promise<void | { ok: boolean; message?: string }>;
  initialText?: string;
}

export default function CommentForm({ parentId, onAddComment, initialText }: CommentFormProps) {
  const [commentText, setCommentText] = useState(initialText || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setCommentText(initialText || "");
  }, [initialText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (commentText.trim() === "") {
      setErrorMessage("Digite algo antes de enviar.");
      return;
    }
    if (contemPalavrao(commentText.trim())) {
      setErrorMessage("Opa! Esse comentário tem palavras que não permitimos por aqui. Que tal reescrever de um jeito mais legal?");
      return;
    }

    const res = await onAddComment(commentText.trim(), parentId);
    if (res && typeof res === "object" && res.ok === false) {
      setErrorMessage(res.message || "Algo deu errado. Tente novamente.");
      return;
    }
    setCommentText("");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md space-y-4">
      <textarea
        placeholder={parentId ? "Sua Resposta" : "Seu Comentário"}
        value={commentText}
        onChange={(e) => { setCommentText(e.target.value); setErrorMessage(null); }}
        rows={3}
        className={`w-full px-4 py-2 rounded border font-inter placeholder-zinc-500 dark:placeholder-zinc-400 transition-colors ${
          errorMessage
            ? "border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/10"
            : "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white"
        }`}
        required
      />
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-200"
        >
          <FontAwesomeIcon icon={faFaceFrown} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-sm font-medium leading-snug">{errorMessage}</p>
        </div>
      )}
      <button
        type="submit"
        className="w-full px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
      >
        {parentId ? "Enviar Resposta" : "Enviar Comentário"}
      </button>
    </form>
  );
}







