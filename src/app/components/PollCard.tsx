"use client";

import { useEffect, useState } from "react";
import { Poll, Comment } from "../types/poll";
import Image from "next/image";
import CommentComponent from "./Comment";
import CommentForm from "./CommentForm";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes, faHeart, faHeartCrack } from '@fortawesome/free-solid-svg-icons';
import { motion } from "framer-motion";
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, FieldValue, increment } from "firebase/firestore"; // Importar funções do Firestore e arrayUnion/arrayRemove
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
  const { user, isMasterUser } = useAuth(); // Obter o usuário logado e o status de mestre

  // Efeito para carregar o estado do voto do localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const storedVote = localStorage.getItem(`poll_vote_${user.uid}_${poll.id}`);
      if (storedVote) {
        setVotedOptionId(storedVote);
      }
    }
  }, [user, poll.id]); // Dependências: user e poll.id

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

  const handleLike = async () => {
    if (!user) {
      alert("Você precisa estar logado para curtir uma enquete.");
      return;
    }

    const pollRef = doc(db, "polls", poll.id);
    const hasLiked = poll.likedBy?.includes(user.uid);
    const hasDisliked = poll.dislikedBy?.includes(user.uid);

    try {
      if (hasLiked) {
        // Se já curtiu, descurtir
        await updateDoc(pollRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid),
        });
      } else {
        // Se não curtiu, curtir
        const updateData: { likes: number | FieldValue; likedBy: string[] | FieldValue; dislikes?: number | FieldValue; dislikedBy?: string[] | FieldValue; } = {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        };
        if (hasDisliked) {
          // Se descurtiu, remover descurtida ao curtir
          updateData.dislikes = increment(-1);
          updateData.dislikedBy = arrayRemove(user.uid);
        }
        await updateDoc(pollRef, updateData);
      }
    } catch (error) {
      console.error("Erro ao curtir/descurtir enquete:", error);
      alert("Erro ao curtir/descurtir enquete. Tente novamente.");
    }
  };

  const handleDislike = async () => {
    if (!user) {
      alert("Você precisa estar logado para descurtir uma enquete.");
      return;
    }

    const pollRef = doc(db, "polls", poll.id);
    const hasLiked = poll.likedBy?.includes(user.uid);
    const hasDisliked = poll.dislikedBy?.includes(user.uid);

    try {
      if (hasDisliked) {
        // Se já descurtiu, remover descurtida
        await updateDoc(pollRef, {
          dislikes: increment(-1),
          dislikedBy: arrayRemove(user.uid),
        });
      } else {
        // Se não descurtiu, descurtir
        const updateData: { dislikes: number | FieldValue; dislikedBy: string[] | FieldValue; likes?: number | FieldValue; likedBy?: string[] | FieldValue; } = {
          dislikes: increment(1),
          dislikedBy: arrayUnion(user.uid),
        };
        if (hasLiked) {
          // Se curtiu, remover curtida ao descurtir
          updateData.likes = increment(-1);
          updateData.likedBy = arrayRemove(user.uid);
        }
        await updateDoc(pollRef, updateData);
      }
    } catch (error) {
      console.error("Erro ao curtir/descurtir enquete:", error);
      alert("Erro ao curtir/descurtir enquete. Tente novamente.");
    }
  };

  const handleVoteClick = (optionId: string) => {
    if (votedOptionId) return;
    onVote(poll.id, optionId);
    setVotedOptionId(optionId);
    if (typeof window !== "undefined" && user) {
      localStorage.setItem(`poll_vote_${user.uid}_${poll.id}`, optionId);
    }
    // Manually update total votes for immediate feedback (before state sync)
    setCurrentTotalVotes(prev => prev + 1);
  };

  const handleAddComment = async (text: string, parentId?: string) => {
    if (!user) {
      alert("Você precisa estar logado para comentar.");
      return;
    }

    const baseComment = {
      pollId: poll.id,
      author: user.email || "Usuário Logado",
      authorId: user.uid,
      authorEmail: user.email,
      text,
      timestamp: Date.now(),
    };

    const newComment = parentId
      ? { ...baseComment, parentId }
      : baseComment;

    try {
      const commentsCollectionRef = collection(db, "polls", poll.id, "comments");
      await addDoc(commentsCollectionRef, newComment);
      // onSnapshot já vai atualizar o estado de comments, não precisamos fazer setComments aqui
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      alert("Erro ao adicionar comentário. Tente novamente.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      alert("Você precisa estar logado para excluir comentários.");
      return;
    }

    try {
      const commentRef = doc(db, "polls", poll.id, "comments", commentId);
      await deleteDoc(commentRef);
      // onSnapshot já vai atualizar o estado de comments, não precisamos fazer setComments aqui
      console.log("Comentário excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir comentário:", error);
      alert("Erro ao excluir comentário. Tente novamente.");
    }
  };

  const getReplies = (commentId: string) => {
    return comments.filter(c => c.parentId === commentId).sort((a, b) => a.timestamp - b.timestamp);
  };

  const countReplies = (commentId: string): number => {
    let count = 0;
    const directReplies = comments.filter(c => c.parentId === commentId);
    count += directReplies.length;
    directReplies.forEach(reply => {
      count += countReplies(reply.id);
    });
    return count;
  };

  const renderComments = (parentComments: Comment[], depth: number) => {
    return parentComments.map((comment) => {
      const directReplies = getReplies(comment.id);
      const totalCount = countReplies(comment.id);

      return (
        <div key={comment.id} className="w-full">
          <CommentComponent
            comment={comment}
            onAddReply={(replyParentId, text) => handleAddComment(text, replyParentId)}
            onDeleteComment={handleDeleteComment}
            replies={directReplies} // Passar as respostas diretas
            totalRepliesCount={totalCount} // Passar a contagem total de respostas
            className={depth > 0 ? "ml-6" : ""}
          />
        </div>
      );
    });
  };

  const topLevelComments = comments.filter(comment => !comment.parentId).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 mb-6 border border-transparent hover:border-indigo-500 transform hover:-translate-y-1 min-h-[150px]"> {/* Ajustado min-h para ser metade do anterior */}
      <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        <Image src={poll.creator.avatarUrl} alt={poll.creator.name} width={32} height={32} className="w-8 h-8 rounded-full mr-2" />
        <span>{poll.creator.name}</span>
      </div>

      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white max-w-[calc(100%-40px)] sm:max-w-[calc(100%-60px)] break-words overflow-hidden mb-4"> {/* Ajustado max-w para dar mais espaço ao título */} 
        {poll.title}
      </h2>

      <div className="flex items-center space-x-2 mb-4">
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="text-zinc-300 hover:text-indigo-400 p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors duration-200"
            aria-label="Opções de Compartilhamento"
          >
            <FontAwesomeIcon icon={faShareNodes} size="lg" />
          </button>
          {showShareMenu && (
            <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-700 rounded-md shadow-lg py-1 z-10">
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
          onClick={handleLike}
          className={`p-2 rounded-full transition-colors duration-200 ${
            user && poll.likedBy?.includes(user.uid)
              ? "text-red-500 hover:text-red-600 bg-red-100 dark:bg-red-900"
              : "text-zinc-300 hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
          aria-label="Curtir Enquete"
        >
          <FontAwesomeIcon icon={faHeart} size="lg" />
          <span className="ml-1 text-sm">{poll.likedBy?.length || 0}</span>
        </button>

        <button
          onClick={handleDislike}
          className={`p-2 rounded-full transition-colors duration-200 ${
            user && poll.dislikedBy?.includes(user.uid)
              ? "text-indigo-500 hover:text-indigo-600 bg-indigo-100 dark:bg-indigo-900"
              : "text-zinc-300 hover:text-indigo-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
          aria-label="Descurtir Enquete"
        >
          <FontAwesomeIcon icon={faHeartCrack} size="lg" />
          <span className="ml-1 text-sm">{poll.dislikedBy?.length || 0}</span>
        </button>
        {(user?.uid === poll.creator.id || isMasterUser) && (
          <button
            onClick={() => onDelete(poll.id)}
            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors duration-200"
            aria-label="Excluir Enquete"
          >
            Excluir
          </button>
        )}
      </div>

      {isClient && (
        <>
          {votedOptionId && (
            <p className="text-green-600 text-sm mb-4">Obrigado por votar!</p>
          )}

          <ul className="space-y-4"> {/* Removido max-h e overflow */}
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

          <div className="comments-section pt-6 border-t border-zinc-200 dark:border-zinc-700 mt-6"> {/* Removido max-h e overflow daqui */}
            <h4 className="text-xl font-poppins font-semibold mb-4 text-zinc-900 dark:text-white">Comentários ({comments.length})</h4>
            <div className="mt-4">
              <CommentForm pollId={poll.id} onAddComment={handleAddComment} />
            </div>
            <div className="mt-6 overflow-hidden max-h-[50px] overflow-y-auto"> {/* Reduzido max-h pela metade */}
              {comments.length === 0 ? (
                <div className="text-center text-zinc-600 dark:text-zinc-400">Nenhum comentário ainda. Seja o primeiro a comentar!</div>
              ) : (
                <>
                  {renderComments(topLevelComments.slice(0, 3), 0)} {/* Limitar a 3 comentários */}
                  {topLevelComments.length > 3 && (
                    <button
                      onClick={() => { /* Implementar abertura do modal */ }}
                      className="mt-4 text-blue-500 hover:underline text-sm w-full text-center"
                    >
                      Ver mais {comments.length - 3} comentários
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
