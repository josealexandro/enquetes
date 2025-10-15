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
import AuthPromptCard from "./Auth/AuthPromptCard"; // Importar AuthPromptCard
import { useAuthModal } from "@/app/context/AuthModalContext"; // Importar useAuthModal

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
  onDelete: (pollId: string) => void;
  onCardClick?: (isCardExpanded: boolean) => void; // Novo prop para lidar com o clique no card, passando o estado de expansão
  userVoted: boolean; // Nova prop para indicar se o usuário já votou
}

export default function PollCard({ poll, onVote, onDelete, onCardClick, userVoted }: PollCardProps) {
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Novo estado para controlar a expansão
  const [currentTotalVotes, setCurrentTotalVotes] = useState(poll.options.reduce((sum, opt) => sum + opt.votes, 0));
  const { user, isMasterUser } = useAuth(); // Obter o usuário logado e o status de mestre
  const [showAuthPrompt, setShowAuthPrompt] = useState(false); // Novo estado para controlar a visibilidade do AuthPromptCard
  const { openLoginModal, openSignupModal } = useAuthModal(); // Usar o contexto para abrir modais

  console.log("PollCard renderizado.");
  console.log("User:", user);
  console.log("Poll:", poll);
  console.log("Is Master User:", isMasterUser);

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
      setShowAuthPrompt(true); // Mostrar o card de prompt de autenticação
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
      setShowAuthPrompt(true); // Mostrar o card de prompt de autenticação
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
    if (!user) { // Adicionar verificação de login aqui
      setShowAuthPrompt(true); // Mostrar o card de prompt de autenticação
      return;
    }
    // Adicionar verificação para `userVoted` para enquetes comerciais
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
      setShowAuthPrompt(true); // Mostrar o card de prompt de autenticação
      return;
    }

    const baseComment = {
      pollId: poll.id,
      author: user.displayName || user.email || "Usuário Logado", // Usar displayName, fallback para email ou "Usuário Logado"
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

  const renderComments = (parentComments: Comment[]) => {
    return parentComments.map((comment) => {
      const directReplies = comments.filter(c => c.parentId === comment.id).sort((a, b) => a.timestamp - b.timestamp);
      const totalCount = directReplies.length;

      return (
        <div key={comment.id}>
          <CommentComponent
            comment={comment}
            onAddReply={(replyParentId, text) => handleAddComment(text, comment.id)} // Respostas sempre vão para o comentário original
            onDeleteComment={handleDeleteComment}
            replies={directReplies} // Passar as respostas diretas
            totalRepliesCount={totalCount} // Passar a contagem total de respostas
            // depth={depth === 0 ? 1 : 1} // Removido
            // getReplies={getReplies} // Removido
            // countReplies={countReplies} // Removido
          />
        </div>
      );
    });
  };

  const topLevelComments = comments.filter(comment => !comment.parentId).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div
      className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 mb-6 border border-transparent hover:border-indigo-500 transform hover:-translate-y-1 cursor-pointer w-[90%] mx-auto"
      onClick={() => {
        const newExpandedState = !isExpanded; // Calcular o novo estado antes de definir
        setIsExpanded(newExpandedState);
        if (onCardClick) {
          onCardClick(newExpandedState); // Passar o novo estado de expansão
        }
      }} // Adicionado o manipulador de clique
    >
      <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        <Image 
          src={poll.creator.avatarUrl || "https://www.gravatar.com/avatar/?d=mp"} // Usar fallback para Gravatar se avatarUrl for nulo/vazio
          alt={poll.creator.name || "Avatar do criador"} // Adicionar fallback para alt
          width={32}
          height={32}
          className="w-8 h-8 rounded-full mr-2"
        />
        <span>{poll.creator.name}</span>
      </div>

      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white max-w-full break-words overflow-hidden mb-4 line-clamp-2"> {/* Ajustado max-w para dar mais espaço ao título e adicionado line-clamp-2 */}
        {poll.title}
      </h2>

      <div className="flex items-center space-x-2 mb-4" onClick={(e) => e.stopPropagation()}> {/* Impede a propagação do clique e define uma altura fixa */}
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

      {isExpanded && isClient && (
        <>
          {votedOptionId && (
            <p className="text-green-600 text-sm mb-4">Obrigado por votar!</p>
          )}

          <ul className="space-y-4"> {/* Removido max-h e overflow */}
            {poll.options.map((option) => {
              const percent = currentTotalVotes ? Math.round((option.votes / currentTotalVotes) * 100) : 0;

              return (
                <li key={option.id}>
                  <div className="flex justify-between items-center mb-1" onClick={(_e) => _e.stopPropagation()}> {/* Impede a propagação do clique */} 
                    <motion.button
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { 
                        handleVoteClick(option.id); 
                      }}
                      disabled={!!votedOptionId} // Desabilitar se já votou localmente
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

          <div className="w-full overflow-hidden" onClick={(_e) => _e.stopPropagation()}> {/* Nova div para agrupar comentários e formulário, impedindo a propagação */} 
            <CommentForm pollId={poll.id} onAddComment={handleAddComment} />
            {renderComments(topLevelComments)}
          </div>
        </>
      )}
      {showAuthPrompt && (
        <AuthPromptCard
          message="Você precisa estar logado para votar."
          onClose={() => setShowAuthPrompt(false)}
          onLoginClick={() => {
            setShowAuthPrompt(false);
            openLoginModal();
          }}
          onSignupClick={() => {
            setShowAuthPrompt(false);
            openSignupModal();
          }}
        />
      )}
    </div>
  );
}