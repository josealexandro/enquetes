"use client";

import PollForm from "./components/PollForm";
import PollCard from "./components/PollCard";
import { Poll, PollOption } from "./types/poll"; // Importar PollOption aqui
// Removido: import { v4 as uuidv4 } from "uuid";
// import useLocalStorage from "./hooks/useLocalStorage"; // Remover useLocalStorage
import { useState, useMemo, useEffect, useRef, useCallback } from "react"; // Adicionar useEffect
import { useAuth } from "./context/AuthContext";
import { motion } from "framer-motion";
import { LayoutGroup, AnimatePresence } from "framer-motion"; // Importar AnimatePresence
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore"; // addDoc Removido
// Removido: import LoginForm from "./components/LoginForm";
// Removido: import SignupForm from "./components/SignupForm";
import PollPodium from "./components/PollPodium"; // Importar PollPodium

export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]); // Mudar para useState
  const [loadingPolls, setLoadingPolls] = useState(true); // Novo estado para carregamento
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setDeleteFeedbackType] = useState<"success" | "error" | null>(null);
  const [activeFilter, setActiveFilter] = useState<"recent" | "trending" | "mine" | "public" | "commercial">("recent");
  const { user, isMasterUser } = useAuth(); // Obter o usuário logado e o status de mestre
  const [isClient, setIsClient] = useState(false); // Novo estado para montagem no cliente

  // Removido: const [currentPublicPollIndex, setCurrentPublicPollIndex] = useState(0);
  // Removido: const [currentCommercialPollIndex, setCurrentCommercialPollIndex] = useState(0);

  const [showPollForm, setShowPollForm] = useState(false); // Novo estado para controlar a visibilidade do formulário de enquete
  const pollFormRef = useRef<HTMLDivElement>(null); // Ref para o contêiner do formulário de enquete

  const publicCarouselRef = useRef<HTMLDivElement>(null);
  const commercialCarouselRef = useRef<HTMLDivElement>(null);

  const [isPublicCarouselPaused, setIsPublicCarouselPaused] = useState(false);
  const [isCommercialCarouselPaused, setIsCommercialCarouselPaused] = useState(false);

  // useEffect para carregar enquetes do Firestore em tempo real
  useEffect(() => {
    setIsClient(true); // Marcar como montado no cliente
    setLoadingPolls(true);
    const pollsCollection = collection(db, "polls");
    // Removendo a ordenação inicial para lidar com ela no frontend, ou podemos buscar duas coleções separadas se a filtragem de segurança for necessária
    const q = query(pollsCollection, orderBy("createdAt", "desc")); 

    const unsubscribe = onSnapshot(q, async (snapshot) => { // Adicionar async aqui
      const fetchedPollsPromises = snapshot.docs.map(async (docSnap) => { // Mudar para docSnap
        const data = docSnap.data();
        const creatorId = data.creator?.id || data.createdBy; // Usar createdBy como fallback

        let creatorName = "Usuário Desconhecido";
        let creatorAvatarUrl = "https://www.gravatar.com/avatar/?d=mp"; // Default Gravatar

        if (creatorId) {
          const userDocRef = doc(db, "users", creatorId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            creatorName = userData.name || userData.displayName || "Usuário";
            creatorAvatarUrl = userData.avatarUrl || "https://www.gravatar.com/avatar/?d=mp";
          }
        }
        
        // Garantir que as opções tenham um 'id' para consistência, se não estiverem presentes no DB
        const optionsWithIds = data.options.map((opt: PollOption) => ({ // Adicionar : PollOption
          ...opt,
          id: opt.id || Math.random().toString(36).substring(7)
        }));

        return {
          id: docSnap.id, // Usar docSnap.id
          ...data,
          options: optionsWithIds, // Usar as opções com IDs garantidos
          creator: {
            id: creatorId,
            name: creatorName,
            avatarUrl: creatorAvatarUrl,
          },
          isCommercial: data.isCommercial || false,
        } as Poll;
      });

      let fetchedPolls = await Promise.all(fetchedPollsPromises); // Esperar por todas as promessas

      // Calcular engajamento e atribuir ranks
      fetchedPolls = fetchedPolls
        .map(poll => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
          const engagement = (poll.likes || 0) + totalVotes;
          return { ...poll, engagement };
        })
        .sort((a, b) => (b.engagement || 0) - (a.engagement || 0)); // Ordenar por engajamento decrescente

      // Atribuir ranks aos top 3
      const rankedPolls = fetchedPolls.map((poll, index) => {
        if (index === 0) return { ...poll, rank: 1 }; // Ouro
        if (index === 1) return { ...poll, rank: 2 }; // Prata
        if (index === 2) return { ...poll, rank: 3 }; // Bronze
        return poll;
      });

      setPolls(rankedPolls);
      console.log("Enquetes carregadas e ranqueadas:", rankedPolls); // Log para depuração
      setLoadingPolls(false);
    }, (error) => {
      console.error("Erro ao carregar enquetes:", error);
      setLoadingPolls(false);
    });

    return () => unsubscribe(); // Limpar o listener quando o componente for desmontado
  }, []);

  const publicPolls = useMemo(() => {
    return polls.filter(poll => !poll.isCommercial);
  }, [polls]);

  const commercialPolls = useMemo(() => {
    return polls.filter(poll => poll.isCommercial);
  }, [polls]);

  const filteredPublicPolls = useMemo(() => {
    let sortedPolls = [...publicPolls];
    if (activeFilter === "recent") {
      sortedPolls.sort((a, b) => b.createdAt - a.createdAt);
    } else if (activeFilter === "trending") {
      sortedPolls.sort((a, b) => {
        const votesA = a.options.reduce((sum, option) => sum + option.votes, 0);
        const votesB = b.options.reduce((sum, option) => sum + option.votes, 0);
        return votesB - votesA;
      });
    } else if (activeFilter === "mine") {
      sortedPolls = sortedPolls.filter(poll => user && poll.creator.id === user.uid);
    }
    return sortedPolls;
  }, [publicPolls, activeFilter, user]);

  const podiumPolls = useMemo(() => {
    // Filtrar as enquetes com rank 1, 2 e 3 e ordená-las
    const filteredPodium = polls // Alterado de filteredPublicPolls para polls
      .filter(poll => poll.rank && (poll.rank >= 1 && poll.rank <= 3))
      .sort((a, b) => (a.rank || 0) - (b.rank || 0))
      .slice(0, 3); // Garantir que apenas os top 3 sejam selecionados
    console.log("Podium Polls:", filteredPodium); // Log para depuração
    return filteredPodium;
  }, [polls]); // Alterado de filteredPublicPolls para polls

  const otherPublicPolls = useMemo(() => {
    // Filtrar as enquetes públicas que não estão no pódio
    const podiumIds = new Set(podiumPolls.map(poll => poll.id));
    return filteredPublicPolls.filter(poll => !podiumIds.has(poll.id));
  }, [filteredPublicPolls, podiumPolls]);

  const filteredCommercialPolls = useMemo(() => {
    let sortedPolls = [...commercialPolls];
    if (activeFilter === "recent") {
      sortedPolls.sort((a, b) => b.createdAt - a.createdAt);
    } else if (activeFilter === "trending") {
      sortedPolls.sort((a, b) => {
        const votesA = a.options.reduce((sum, option) => sum + option.votes, 0);
        const votesB = b.options.reduce((sum, option) => sum + option.votes, 0);
        return votesB - votesA;
      });
    } else if (activeFilter === "mine") {
      sortedPolls = sortedPolls.filter(poll => user && poll.creator.id === user.uid);
    }
    return sortedPolls;
  }, [commercialPolls, activeFilter, user]);

  // Efeito para rolagem automática das enquetes públicas
  useEffect(() => {
    if (!publicCarouselRef.current || filteredPublicPolls.length === 0 || isPublicCarouselPaused) return;

    const interval = setInterval(() => {
      // Removido: setCurrentPublicPollIndex e lógica de rolagem automática
      // Esta lógica agora está sendo gerenciada fora de page.tsx ou removida conforme necessário.
      // Para reintroduzir a rolagem, a lógica de index e scroll precisaria ser implementada com o novo design.

      // Temporariamente removendo a lógica de rolagem para resolver o erro.
      // Se a rolagem automática for necessária, precisará ser reconstruída usando useRef e useEffect.
    }, 5000); // Rola a cada 5 segundos

    return () => clearInterval(interval);
  }, [filteredPublicPolls, isPublicCarouselPaused]);

  // Efeito para rolagem automática das enquetes de comerciantes
  useEffect(() => {
    if (!commercialCarouselRef.current || filteredCommercialPolls.length === 0 || isCommercialCarouselPaused) return;

    const interval = setInterval(() => {
      // Removido: setCurrentCommercialPollIndex e lógica de rolagem automática
      // Esta lógica agora está sendo gerenciada fora de page.tsx ou removida conforme necessário.
      // Para reintroduzir a rolagem, a lógica de index e scroll precisaria ser implementada com o novo design.

      // Temporariamente removendo a lógica de rolagem para resolver o erro.
      // Se a rolagem automática for necessária, precisará ser reconstruída usando useRef e useEffect.
    }, 5000); // Rola a cada 5 segundos

    return () => clearInterval(interval);
  }, [filteredCommercialPolls, isCommercialCarouselPaused]);

  // Efeito para detectar cliques fora do formulário de enquete
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pollFormRef.current && !pollFormRef.current.contains(event.target as Node)) {
        setShowPollForm(false); // Oculta o formulário se o clique foi fora
      }
    }

    if (showPollForm) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPollForm]);

  const handlePublicCardClick = (isCardExpanded: boolean) => {
    setIsPublicCarouselPaused(isCardExpanded);
  };

  const handleCommercialCardClick = (isCardExpanded: boolean) => {
    setIsCommercialCarouselPaused(isCardExpanded);
  };

  const handlePollCreated = () => {
    setActiveFilter("mine");
  };

  const handleVote = useCallback(async (pollId: string, optionId: string) => {
    if (!user) {
      alert("Você precisa estar logado para votar.");
      return;
    }

    const pollToUpdate = polls.find(p => p.id === pollId);
    if (!pollToUpdate) {
      console.error("handleVote (na página) - Enquete não encontrada:", pollId);
      return;
    }

    console.log("handleVote (na página) - Chamado para pollId:", pollId, "com optionId:", optionId);
    console.log("handleVote (na página) - Poll antes da atualização:", JSON.parse(JSON.stringify(pollToUpdate)));

    // Preparar as opções atualizadas para a UI otimista e para o Firestore
    const updatedOptionsForOptimisticUI = pollToUpdate.options.map((option) => {
      const isThisOptionVoted = option.id === optionId; // Adicionar log para a comparação
      const newOption = isThisOptionVoted ? { ...option, votes: option.votes + 1 } : option;
      console.log("handleVote (na página) - UI Otimista - Opção:", option.id, "Clicada:", isThisOptionVoted, "Votos antes:", option.votes, "Votos depois:", newOption.votes);
      return newOption;
    });
    console.log("handleVote (na página) - UI Otimista - Updated Options:", JSON.parse(JSON.stringify(updatedOptionsForOptimisticUI)));

    // Preparar o array votedBy atualizado para a UI otimista e para o Firestore
    const updatedVotedByForOptimisticUI = user
      ? [...(pollToUpdate.votedBy || []), user.uid]
      : pollToUpdate.votedBy;

    // Otimista: Atualiza a UI imediatamente
    setPolls((prevPolls) =>
      prevPolls.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: updatedOptionsForOptimisticUI,
              votedBy: updatedVotedByForOptimisticUI,
            }
          : poll
      )
    );

    try {
      const pollRef = doc(db, "polls", pollId);
      
      // Não precisamos buscar currentPoll novamente se já temos pollToUpdate
      // Usaremos a mesma lógica de atualização para o Firestore que preparamos acima
      const updatedOptionsForFirestore = pollToUpdate.options.map(option => {
        const isThisOptionVoted = option.id === optionId; // Adicionar log para a comparação
        const newOption = isThisOptionVoted ? { ...option, votes: option.votes + 1 } : option;
        console.log("handleVote (na página) - Firestore - Opção:", option.id, "Clicada:", isThisOptionVoted, "Votos antes:", option.votes, "Votos depois:", newOption.votes);
        return newOption;
      });
      console.log("handleVote (na página) - Firestore - Updated Options:", JSON.parse(JSON.stringify(updatedOptionsForFirestore)));
      
      // Remover a condição de isCommercial para que votedBy seja sempre atualizado
      const updatedVotedByForFirestore = user
        ? [...(pollToUpdate.votedBy || []), user.uid]
        : pollToUpdate.votedBy;

      await updateDoc(pollRef, {
        options: updatedOptionsForFirestore,
        votedBy: updatedVotedByForFirestore, // VotedBy agora é sempre atualizado
      });

    } catch (error) {
      console.error("Erro ao votar:", error);
      alert("Erro ao registrar voto. Tente novamente.");
      // Reverter a UI se o voto falhar
      setPolls((prevPolls) =>
        prevPolls.map((poll) =>
          poll.id === pollId
            ? {
                ...poll,
                options: poll.options.map((option) =>
                  option.id === optionId
                    ? { ...option, votes: option.votes - 1 }
                    : option
                ),
                // Remover user.uid de votedBy se a reversão for para enquete comercial
                votedBy: poll.isCommercial && user ? (poll.votedBy || []).filter(uid => uid !== user.uid) : poll.votedBy,
              }
            : poll
        )
      );
    }
  }, [user, polls, setPolls]); // Adicionar dependências para useCallback

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      alert("Você precisa estar logado para excluir enquetes.");
      return;
    }

    const pollToDelete = polls.find(p => p.id === pollId);
    // Permitir exclusão se for o criador OU um usuário mestre
    if (!pollToDelete || (pollToDelete.creator.id !== user.uid && !isMasterUser)) {
      alert("Você não tem permissão para excluir esta enquete.");
      return;
    }

    try {
      await deleteDoc(doc(db, "polls", pollId));
      setDeleteFeedbackMessage("Enquete excluída com sucesso!");
      setDeleteFeedbackType("success");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao excluir enquete:", error);
      setDeleteFeedbackMessage("Erro ao excluir enquete.");
      setDeleteFeedbackType("error");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-24 dark:bg-zinc-900 pt-20">
      <div className="max-w-3xl w-full text-center mb-12 mt-10">
        <h1 className="text-5xl md:text-6xl font-extrabold text-zinc-900 dark:text-white leading-tight animate-fade-in">
          Bem-vindo ao Poll App!
        </h1>

        {deleteFeedbackMessage && (
        
        <div className={`p-3 rounded-md text-white mt-4 ${
            deleteFeedbackType === "success" ? "bg-green-500" : "bg-red-500"
          }`}>
            {deleteFeedbackMessage}
          </div>
        )}

        <div className="text-center mt-4">
        <a
          href="/enquetes"
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          Ver todas as enquetes
        </a>
      </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          Crie enquetes e envie para outras pessoas.
        </p>
      </div>

      {/* Novo Pódio de Enquetes no Topo */}
      {podiumPolls.length > 0 && (
        <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-center gap-8 px-4">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-12 mb-6">Pódio das Enquetes</h2>
          <PollPodium 
            polls={podiumPolls}
            onVote={handleVote}
            onDelete={handleDeletePoll}
            onCardClick={handlePublicCardClick} 
          />
        </div>
      )}

      <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-center gap-8 px-4">
        {!isClient ? (
          <p className="text-zinc-600 dark:text-zinc-400">Carregando conteúdo...</p>
        ) : (
          <>
            {/* Botão para criar enquete */}
            {!showPollForm && (
              <motion.button
                onClick={() => setShowPollForm(true)}
                className="w-full px-8 py-4 rounded-full bg-indigo-600 text-white text-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors duration-300 transform hover:scale-105 mb-8"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Crie sua enquete!
              </motion.button>
            )}

            {/* Renderizar PollForm condicionalmente */}
            {showPollForm && (
              <AnimatePresence>
                <motion.div
                  key="poll-form"
                  ref={pollFormRef} // Atribuir o ref ao contêiner do formulário
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <PollForm onPollCreated={() => { handlePollCreated(); setShowPollForm(false); }} />
                </motion.div>
              </AnimatePresence>
            )}

            <div className="flex space-x-4 mb-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${activeFilter === "recent" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
                onClick={() => setActiveFilter("recent")}
              >
                Recentes
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${activeFilter === "trending" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
                onClick={() => setActiveFilter("trending")}
              >
                Em alta
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${activeFilter === "mine" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
                onClick={() => setActiveFilter("mine")}
              >
                Minhas
              </motion.button>
            </div>

            {/* Seção de Enquetes Públicas */}
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-12 mb-6">Outras Enquetes Públicas</h2>
            <div className="relative w-full">
              {loadingPolls ? (
                <p className="text-zinc-600 dark:text-zinc-400">Carregando enquetes públicas...</p>
              ) : otherPublicPolls.length === 0 ? (
                <p className="text-zinc-600 dark:text-zinc-400">Nenhuma outra enquete pública encontrada.</p>
              ) : (
                <div className="sm:mx-12"> {/* Novo wrapper para o carrossel, criando espaço para as setas */}
                  <motion.div
                    ref={publicCarouselRef}
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="w-full flex overflow-x-auto snap-x snap-mandatory gap-8 scrollbar-hide"
                  >
                    <LayoutGroup>
                      {otherPublicPolls.map((poll) => (
                        <motion.div key={poll.id} variants={itemVariants} className="w-[90%] mx-auto flex-shrink-0 snap-center md:w-full md:min-w-[320px] md:max-w-[360px]">
                          <PollCard 
                            poll={poll} 
                            onVote={handleVote} 
                            onDelete={handleDeletePoll} 
                            onCardClick={handlePublicCardClick} 
                            
                          />
                        </motion.div>
                      ))}
                    </LayoutGroup>
                  </motion.div>
                </div>
              )}
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-zinc-800 bg-opacity-50 text-white p-2 rounded-full z-10"
                onClick={() => {
                  if (publicCarouselRef.current) {
                    publicCarouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
                  }
                }}
              >
                &#9664;
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-zinc-800 bg-opacity-50 text-white p-2 rounded-full z-10"
                onClick={() => {
                  if (publicCarouselRef.current) {
                    publicCarouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
                  }
                }}
              >
                &#9654;
              </button>
            </div>

            {/* Seção de Enquetes de Comerciantes */}
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-12 mb-6">Enquetes Comerciais</h2>
            <div className="relative w-full">
              {loadingPolls ? (
                <p className="text-zinc-600 dark:text-zinc-400">Carregando enquetes de comerciantes...</p>
              ) : filteredCommercialPolls.length === 0 ? (
                <p className="text-zinc-600 dark:text-zinc-400">Nenhuma enquete de comerciante encontrada.</p>
              ) : (
                <div className="sm:mx-12"> {/* Novo wrapper para o carrossel, criando espaço para as setas */}
                  <motion.div
                    ref={commercialCarouselRef}
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="w-full flex overflow-x-auto snap-x snap-mandatory gap-8 scrollbar-hide"
                  >
                    <LayoutGroup>
                      {filteredCommercialPolls.map((poll) => (
                        <motion.div key={poll.id} variants={itemVariants} className="w-[90%] mx-auto flex-shrink-0 snap-center md:w-full md:min-w-[320px] md:max-w-[360px]">
                          <PollCard 
                            poll={poll} 
                            onVote={handleVote} 
                            onDelete={handleDeletePoll} 
                            onCardClick={handleCommercialCardClick} 
                            
                          />
                        </motion.div>
                      ))}
                    </LayoutGroup>
                  </motion.div>
                </div>
              )}
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-zinc-800 bg-opacity-50 text-white p-2 rounded-full z-10"
                onClick={() => {
                  if (commercialCarouselRef.current) {
                    commercialCarouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
                  }
                }}
              >
                &#9664;
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-zinc-800 bg-opacity-50 text-white p-2 rounded-full z-10"
                onClick={() => {
                  if (commercialCarouselRef.current) {
                    commercialCarouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
                  }
                }}
              >
                &#9654;
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
