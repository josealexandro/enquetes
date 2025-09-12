"use client";

import { useEffect, useState } from "react";
import { Poll, Comment } from "../types/poll";
import { v4 as uuidv4 } from "uuid";
import CommentComponent from "./Comment";
import CommentForm from "./CommentForm";
import Image from "next/image";

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  onDelete: (pollId: string) => void;
}

export default function PollCard({ poll, onVote, onDelete }: PollCardProps) {
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isClient, setIsClient] = useState(false); // Adicionar estado isClient
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

  const loadComments = (pollId: string) => {
    const storedComments = localStorage.getItem("comments");
    if (storedComments) {
      const allComments: Comment[] = JSON.parse(storedComments);
      setComments(allComments.filter(comment => comment.pollId === pollId));
    }
  };

  const saveCommentsToLocalStorage = (updatedComments: Comment[]) => {
    const existingComments = JSON.parse(localStorage.getItem("comments") || "[]");
    const otherPollComments = existingComments.filter((comment: Comment) => comment.pollId !== poll.id);
    const newComments = [...otherPollComments, ...updatedComments];
    localStorage.setItem("comments", JSON.stringify(newComments));
  };

  useEffect(() => {
    loadComments(poll.id);
    setIsClient(true); // Definir como true após a montagem do cliente
  }, [poll.id]);

  const handleVoteClick = (optionId: string) => {
    if (votedOptionId) return; // impede múltiplos votos
    onVote(poll.id, optionId);
    setVotedOptionId(optionId);
  };

  const handleAddComment = (author: string, text: string, parentId?: string) => {
    const newComment: Comment = {
      id: uuidv4(),
      pollId: poll.id,
      parentId,
      author,
      text,
      timestamp: Date.now(),
    };
    const updatedComments = [...comments, newComment]; // Remover a ordenação aqui
    setComments(updatedComments);
    saveCommentsToLocalStorage(updatedComments);
  };

  const renderCommentsHierarchically = (currentParentId: string | undefined, depth: number) => {
    const filteredComments = comments
      .filter((comment) => comment.parentId === currentParentId)
      .sort((a, b) => a.timestamp - b.timestamp);

    return filteredComments.map((comment) => (
      <div key={comment.id} className="w-full">
        <CommentComponent
          comment={comment}
          onAddReply={(replyParentId, author, text) => handleAddComment(author, text, replyParentId)}
          className={depth > 0 ? "ml-6" : ""}
        />
        {/* Recursivamente renderiza as respostas */}
        {renderCommentsHierarchically(comment.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 mb-6 border border-transparent hover:border-indigo-500 transform hover:-translate-y-1">
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-4">
        {poll.title}
      </h2>
      <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        <img src={poll.creator.avatarUrl} alt={poll.creator.name} className="w-8 h-8 rounded-full mr-2" />
        <span>Criado por {poll.creator.name}</span>
      </div>
      <button
        onClick={() => onDelete(poll.id)}
        className="absolute top-4 right-4 text-red-500 hover:text-red-700"
      >
        Excluir
      </button>

      {isClient && ( // Renderizar conteúdo dependente do cliente apenas se isClient for true
        <>
          {votedOptionId && (
            <p className="text-green-600 text-sm mb-4">Obrigado por votar!</p>
          )}

          <ul className="space-y-4">
            {poll.options.map((option) => {
              const percent = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;

              return (
                <li key={option.id}>
                  <div className="flex justify-between items-center mb-1">
                    <button
                      onClick={() => handleVoteClick(option.id)}
                      disabled={!!votedOptionId}
                      className={`text-left font-medium ${
                        votedOptionId === option.id
                          ? "text-blue-600 dark:text-blue-400"
                          : votedOptionId
                          ? "text-zinc-400"
                          : "text-zinc-800 dark:text-zinc-200 hover:text-blue-600"
                      }`}
                    >
                      {option.text}
                    </button>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {option.votes} votos ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 h-2 rounded">
                    <div
                      className="bg-blue-500 h-2 rounded transition-all duration-500 ease-out"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="comments-section pt-6 border-t border-zinc-200 dark:border-zinc-700 mt-6">
            <h4 className="text-xl font-poppins font-semibold mb-4 text-zinc-900 dark:text-white">Comentários</h4>
            <CommentForm pollId={poll.id} onAddComment={handleAddComment} />
            <div className="mt-6 overflow-hidden">
              {comments.length === 0 ? (
                <div className="text-center text-zinc-600 dark:text-zinc-400">Nenhum comentário ainda. Seja o primeiro a comentar!</div>
              ) : (
                renderCommentsHierarchically(undefined, 0) // Passar undefined para o primeiro nível
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
