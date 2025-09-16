"use client";

import { useEffect, useState } from "react";
import { Poll, Comment } from "../types/poll";
import Image from "next/image";
import CommentComponent from "./Comment";
import CommentForm from "./CommentForm";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { motion } from "framer-motion";
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, orderBy, onSnapshot, addDoc } from "firebase/firestore"; // Importar funções do Firestore
import { useAuth } from "@/app/context/AuthContext"; // Importar useAuth

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  onDelete: (pollId: string) => void;
}

export default function PollCard({ poll, onVote, onDelete }: PollCardProps) {
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentTotalVotes, setCurrentTotalVotes] = useState(poll.options.reduce((sum, opt) => sum + opt.votes, 0));
  const { user } = useAuth(); // Obter o usuário logado

  // Update currentTotalVotes if the poll's total votes change externally (e.g., via real-time DB)
  useEffect(() => {
    setCurrentTotalVotes(poll.options.reduce((sum, opt) => sum + opt.votes, 0));
  }, [poll.options]);

  // useEffect para carregar comentários do Firestore em tempo real
  useEffect(() => {
    const commentsCollectionRef = collection(db, "polls", poll.id, "comments");
    const q = query(commentsCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(fetchedComments);
    }, (error) => {
      console.error("Erro ao carregar comentários:", error);
    });

    setIsClient(true); // Manter isso para outras funcionalidades que dependem do cliente
    return () => unsubscribe();
  }, [poll.id]);

  const pollShareLink = `${window.location.origin}/poll/${poll.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pollShareLink);
    alert("Link copiado para a área de transferência!");
    setShowShareMenu(false);
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(poll.title + "\n" + pollShareLink)}`, "_blank");
    setShowShareMenu(false);
  };

  const shareGeneric = () => {
    if (navigator.share) {
      navigator.share({
        title: poll.title,
        text: "Vote nesta enquete!",
        url: pollShareLink,
      }).then(() => {
        console.log("Compartilhado com sucesso!");
        setShowShareMenu(false);
      }).catch((error) => {
        console.error("Erro ao compartilhar:", error);
      });
    } else {
      alert("Seu navegador não suporta a API de Compartilhamento. Por favor, copie o link.");
      copyToClipboard();
    }
  };

  // Remover loadComments e saveCommentsToLocalStorage
  /*
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
  */

  const handleVoteClick = (optionId: string) => {
    if (votedOptionId) return;
    onVote(poll.id, optionId);
    setVotedOptionId(optionId);
    // Manually update total votes for immediate feedback (before state sync)
    setCurrentTotalVotes(prev => prev + 1);
  };

  const handleAddComment = async (text: string, parentId?: string) => {
    if (!user) {
      alert("Você precisa estar logado para comentar.");
      return;
    }

    const newComment = {
      pollId: poll.id,
      parentId,
      author: user.email || "Usuário Logado", // Usar o email do usuário logado como autor
      authorId: user.uid,
      authorEmail: user.email,
      text,
      timestamp: Date.now(),
    };

    try {
      const commentsCollectionRef = collection(db, "polls", poll.id, "comments");
      await addDoc(commentsCollectionRef, newComment);
      // onSnapshot já vai atualizar o estado de comments, não precisamos fazer setComments aqui
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      alert("Erro ao adicionar comentário. Tente novamente.");
    }
  };

  const renderCommentsHierarchically = (currentParentId: string | undefined, depth: number) => {
    const filteredComments = comments
      .filter((comment) => comment.parentId === currentParentId)
      .sort((a, b) => a.timestamp - b.timestamp);

    return filteredComments.map((comment) => (
      <div key={comment.id} className="w-full">
        <CommentComponent
          comment={comment}
          onAddReply={(replyParentId, text) => handleAddComment(text, replyParentId)}
          className={depth > 0 ? "ml-6" : ""}
        />
        {renderCommentsHierarchically(comment.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 mb-6 border border-transparent hover:border-indigo-500 transform hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white max-w-[calc(100%-80px)] sm:max-w-[calc(100%-120px)] break-words">
          {poll.title}
        </h2>
        <div className="flex flex-shrink-0 items-center space-x-2 relative">
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="text-zinc-300 hover:text-indigo-400 p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors duration-200"
              aria-label="Opções de Compartilhamento"
            >
              <FontAwesomeIcon icon={faShareNodes} size="lg" />
            </button>
            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-700 rounded-md shadow-lg py-1 z-10">
                <button
                  onClick={copyToClipboard}
                  className="block w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                >
                  Copiar Link
                </button>
                <button
                  onClick={shareOnWhatsApp}
                  className="block w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                >
                  Compartilhar no WhatsApp
                </button>
                <button
                  onClick={shareGeneric}
                  className="block w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                >
                  Compartilhar
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => onDelete(poll.id)}
            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors duration-200"
            aria-label="Excluir Enquete"
          >
            Excluir
          </button>
        </div>
      </div>
      <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        <Image src={poll.creator.avatarUrl} alt={poll.creator.name} width={32} height={32} className="w-8 h-8 rounded-full mr-2" />
        <span>Criado por {poll.creator.name}</span>
      </div>

      {isClient && (
        <>
          {votedOptionId && (
            <p className="text-green-600 text-sm mb-4">Obrigado por votar!</p>
          )}

          <ul className="space-y-4">
            {poll.options.map((option) => {
              const percent = currentTotalVotes ? Math.round((option.votes / currentTotalVotes) * 100) : 0;

              return (
                <li key={option.id}>
                  <div className="flex justify-between items-center mb-1">
                    <motion.button
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVoteClick(option.id)}
                      disabled={!!votedOptionId}
                      className={`text-left font-medium transition-colors duration-200 ${
                        votedOptionId === option.id
                          ? "text-blue-600 dark:text-blue-400"
                          : votedOptionId
                          ? "text-zinc-400"
                          : "text-zinc-800 dark:text-zinc-200 hover:text-blue-600"
                      }`}
                    >
                      {option.text}
                    </motion.button>
                    <span key={option.votes} className="text-sm text-zinc-600 dark:text-zinc-400 animate-pulse-once">
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
                renderCommentsHierarchically(undefined, 0)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
