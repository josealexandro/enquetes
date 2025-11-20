"use client";

import PollForm from "./components/PollForm";
import PollCard from "./components/PollCard";
import { Poll, PollOption } from "./types/poll"; // Importar PollOption aqui
// Removido: import { v4 as uuidv4 } from "uuid";
// import useLocalStorage from "./hooks/useLocalStorage"; // Remover useLocalStorage
import { useState, useMemo, useEffect, useRef, useCallback } from "react"; // Adicionar useEffect
import { useAuth } from "./context/AuthContext";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion"; // Importar AnimatePresence
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, orderBy, updateDoc, deleteDoc, doc, getDoc, Timestamp, limit, startAfter, getDocs, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import PollPodium from "./components/PollPodium";
import slugify from "@/utils/slugify";

export default function Home() {
  // Separação dos estados das enquetes
  const [publicPolls, setPublicPolls] = useState<Poll[]>([]);
  const [commercialPolls, setCommercialPolls] = useState<Poll[]>([]);
  const [podiumPolls, setPodiumPolls] = useState<Poll[]>([]);
  
  // Controles de Paginação
  const [lastPublicDoc, setLastPublicDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastCommercialDoc, setLastCommercialDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMorePublic, setHasMorePublic] = useState(true);
  const [hasMoreCommercial, setHasMoreCommercial] = useState(true);
  const [loadingMorePublic, setLoadingMorePublic] = useState(false); // Novo loading para paginação
  const [loadingMoreCommercial, setLoadingMoreCommercial] = useState(false); // Novo loading para paginação

  const [loadingPolls, setLoadingPolls] = useState(true);
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setDeleteFeedbackType] = useState<"success" | "error" | null>(null);
  const [activeFilter, setActiveFilter] = useState<"recent" | "trending" | "mine" | "public" | "commercial">("recent");
  const { user, isMasterUser } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const pollFormRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Função auxiliar para processar os dados da enquete
  const processPollData = async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const data = docSnap.data();
    const creatorData = data.creator || {};
    const creatorId = creatorData.id || data.createdBy;

    let creatorName = creatorData.name || creatorData.displayName || "Usuário Desconhecido";
    let creatorAvatarUrl = creatorData.avatarUrl || creatorData.photoURL || "https://www.gravatar.com/avatar/?d=mp";
    let creatorCommercialName = creatorData.commercialName || undefined;
    let creatorThemeColor = creatorData.themeColor || undefined;

    const hasCompleteCreatorData = (creatorData.name || creatorData.displayName) && (creatorData.avatarUrl || creatorData.photoURL);

    if (creatorId && !hasCompleteCreatorData) {
      try {
        const userDocRef = doc(db, "users", creatorId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          creatorName = userData.name || userData.displayName || "Usuário";
          creatorAvatarUrl = userData.avatarUrl || userData.photoURL || "https://www.gravatar.com/avatar/?d=mp";
          creatorCommercialName = userData.commercialName || undefined;
          creatorThemeColor = userData.themeColor || undefined;
        }
      } catch (error) {
        console.error("Erro ao buscar dados do criador (fallback):", error);
      }
    }
    
    const optionsWithIds = data.options.map((opt: PollOption) => ({
      ...opt,
      id: opt.id || Math.random().toString(36).substring(7)
    }));

    let pollCreatedAt = data.createdAt;
    if (pollCreatedAt && typeof pollCreatedAt.toDate !== 'function') {
      pollCreatedAt = new Timestamp(pollCreatedAt.seconds, pollCreatedAt.nanoseconds);
    } else if (!pollCreatedAt) {
      pollCreatedAt = Timestamp.now();
    }

    return {
      id: docSnap.id,
      ...data,
      options: optionsWithIds,
      creator: {
        id: creatorId,
        name: creatorName,
        avatarUrl: creatorAvatarUrl,
        commercialName: creatorCommercialName,
        themeColor: creatorThemeColor,
      },
      isCommercial: data.isCommercial || false,
      createdAt: pollCreatedAt,
    } as Poll;
  };

  // Buscar Pódio (Separado)
  useEffect(() => {
    const fetchPodium = async () => {
      try {
        // Assumindo que 'likes' é um bom indicador para o pódio por enquanto.
        // Para 'engagement' perfeito (likes + votes), precisaríamos de um campo salvo no DB.
        const q = query(collection(db, "polls"), orderBy("likes", "desc"), limit(3));
        const snapshot = await getDocs(q);
        const polls = await Promise.all(snapshot.docs.map(processPollData));
        
        // Atribuir ranks
        const rankedPolls = polls.map((poll, index) => ({
          ...poll,
          rank: index + 1
        }));
        setPodiumPolls(rankedPolls);
      } catch (error) {
        console.error("Erro ao carregar pódio:", error);
      }
    };
    fetchPodium();
  }, []);

  // Buscar Enquetes Iniciais (Paginadas)
  const fetchInitialPolls = useCallback(async () => {
    setLoadingPolls(true);
    try {
      // Busca Públicas
      const qPublic = query(
        collection(db, "polls"), 
        where("isCommercial", "==", false),
        orderBy("createdAt", "desc"),
        limit(8)
      );
      
      // Busca Comerciais
      const qCommercial = query(
        collection(db, "polls"),
        where("isCommercial", "==", true),
        orderBy("createdAt", "desc"),
        limit(8)
      );

      const [publicSnap, commercialSnap] = await Promise.all([getDocs(qPublic), getDocs(qCommercial)]);

      const processedPublic = await Promise.all(publicSnap.docs.map(processPollData));
      const processedCommercial = await Promise.all(commercialSnap.docs.map(processPollData));

      setPublicPolls(processedPublic);
      setCommercialPolls(processedCommercial);

      setLastPublicDoc(publicSnap.docs[publicSnap.docs.length - 1] || null);
      setLastCommercialDoc(commercialSnap.docs[commercialSnap.docs.length - 1] || null);

      if (publicSnap.docs.length < 8) setHasMorePublic(false);
      if (commercialSnap.docs.length < 8) setHasMoreCommercial(false);

    } catch (error) {
      console.error("Erro ao carregar enquetes iniciais:", error);
    } finally {
      setLoadingPolls(false);
    }
  }, []);

  // Carregar Mais Públicas
  const loadMorePublic = async () => {
    if (!lastPublicDoc || loadingMorePublic) return;
    setLoadingMorePublic(true);
    try {
      const q = query(
        collection(db, "polls"),
        where("isCommercial", "==", false),
        orderBy("createdAt", "desc"),
        startAfter(lastPublicDoc),
        limit(8)
      );
      const snapshot = await getDocs(q);
      const newPolls = await Promise.all(snapshot.docs.map(processPollData));
      
      setPublicPolls(prev => [...prev, ...newPolls]);
      setLastPublicDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (snapshot.docs.length < 8) setHasMorePublic(false);
    } catch (error) {
      console.error("Erro ao carregar mais públicas:", error);
    } finally {
      setLoadingMorePublic(false);
    }
  };

  // Carregar Mais Comerciais
  const loadMoreCommercial = async () => {
    if (!lastCommercialDoc || loadingMoreCommercial) return;
    setLoadingMoreCommercial(true);
    try {
      const q = query(
        collection(db, "polls"),
        where("isCommercial", "==", true),
        orderBy("createdAt", "desc"),
        startAfter(lastCommercialDoc),
        limit(8)
      );
      const snapshot = await getDocs(q);
      const newPolls = await Promise.all(snapshot.docs.map(processPollData));
      
      setCommercialPolls(prev => [...prev, ...newPolls]);
      setLastCommercialDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (snapshot.docs.length < 8) setHasMoreCommercial(false);
    } catch (error) {
      console.error("Erro ao carregar mais comerciais:", error);
    } finally {
      setLoadingMoreCommercial(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchInitialPolls();
  }, [fetchInitialPolls]);

  // Filtros (Nota: Paginação implementada apenas para 'recent' por enquanto)
  const filteredPublicPolls = useMemo(() => {
    let currentList = [...publicPolls];
    if (activeFilter === 'mine') {
      currentList = currentList.filter(p => user && p.creator.id === user.uid);
    }
    // Para 'trending', idealmente precisaria de nova busca no servidor. Mantendo client-side sorting do que já foi carregado por enquanto.
    if (activeFilter === 'trending') {
       currentList.sort((a, b) => {
        const votesA = a.options.reduce((sum, option) => sum + option.votes, 0);
        const votesB = b.options.reduce((sum, option) => sum + option.votes, 0);
        return votesB - votesA;
      });
    }
    return currentList;
  }, [publicPolls, activeFilter, user]);

  const filteredCommercialPolls = useMemo(() => {
    let currentList = [...commercialPolls];
    if (activeFilter === 'mine') {
      currentList = currentList.filter(p => user && p.creator.id === user.uid);
    }
    if (activeFilter === 'trending') {
       currentList.sort((a, b) => {
        const votesA = a.options.reduce((sum, option) => sum + option.votes, 0);
        const votesB = b.options.reduce((sum, option) => sum + option.votes, 0);
        return votesB - votesA;
      });
    }
    return currentList;
  }, [commercialPolls, activeFilter, user]);


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

  const handlePollCreated = () => {
    setActiveFilter("mine");
  };

  const handleVote = useCallback(async (pollId: string, optionId: string) => {
    if (!user) {
      alert("Você precisa estar logado para votar.");
      return;
    }

    const pollToUpdate = publicPolls.find(p => p.id === pollId) || commercialPolls.find(p => p.id === pollId) || podiumPolls.find(p => p.id === pollId);
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

    // Helper function to update poll in a list
    const updatePollInList = (list: Poll[]) => list.map(poll => 
      poll.id === pollId 
        ? { ...poll, options: updatedOptionsForOptimisticUI, votedBy: updatedVotedByForOptimisticUI } 
        : poll
    );

    // Otimista: Atualiza a UI imediatamente nas listas onde a enquete existe
    if (publicPolls.some(p => p.id === pollId)) setPublicPolls(prev => updatePollInList(prev));
    if (commercialPolls.some(p => p.id === pollId)) setCommercialPolls(prev => updatePollInList(prev));
    if (podiumPolls.some(p => p.id === pollId)) setPodiumPolls(prev => updatePollInList(prev));

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
      const updateState = (prevPolls: Poll[]) =>
        prevPolls.map((poll) =>
          poll.id === pollId
            ? {
                ...poll,
                options: poll.options.map((option) =>
                  option.id === optionId
                    ? { ...option, votes: option.votes - 1 }
                    : option
                ),
                votedBy: user ? (poll.votedBy || []).filter(uid => uid !== user.uid) : poll.votedBy,
              }
            : poll
        );
      
      setPublicPolls(updateState);
      setCommercialPolls(updateState);
    }
  }, [user, publicPolls, commercialPolls]); // Atualizado dependências

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      alert("Você precisa estar logado para excluir enquetes.");
      return;
    }

    // Procura nas duas listas
    const pollToDelete = publicPolls.find(p => p.id === pollId) || commercialPolls.find(p => p.id === pollId);
    
    // Permitir exclusão se for o criador OU um usuário mestre
    if (!pollToDelete || (pollToDelete.creator.id !== user.uid && !isMasterUser)) {
      alert("Você não tem permissão para excluir esta enquete.");
      return;
    }

    try {
      await deleteDoc(doc(db, "polls", pollId));
      
      // Remove da lista local
      setPublicPolls(prev => prev.filter(p => p.id !== pollId));
      setCommercialPolls(prev => prev.filter(p => p.id !== pollId));

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


  return (
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-24 dark:bg-zinc-900 pt-20">
      <div className="max-w-3xl w-full text-center mb-6 mt-4"> {/* Ajustado mb-12 para mb-6 e mt-10 para mt-4 */}
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

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          Crie enquetes e envie para outras pessoas.
        </p>
      </div>

      {/* Novo Pódio de Enquetes no Topo */}
      {podiumPolls.length > 0 && (
        <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-center gap-8 px-4">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-6 mb-6">Mais Votadas</h2> {/* Ajustado mt-12 para mt-6 */}
          <PollPodium 
            polls={podiumPolls}
            onVote={handleVote}
            onDelete={handleDeletePoll}
          />
        </div>
      )}

      <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-7xl px-4 mt-4"> {/* Restaurado lg:max-w-7xl para desapertar os cards */}
        {!isClient ? (
          <p className="text-zinc-600 dark:text-zinc-400">Carregando conteúdo...</p>
        ) : (
          <>
            {/* Botão para criar enquete */}
            {!showPollForm && (
              <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-center gap-8 px-4 mx-auto"> {/* Adicionado mx-auto aqui */}
                <motion.button
                  onClick={() => setShowPollForm(true)}
                  className="w-full px-8 py-4 rounded-full bg-indigo-600 text-white text-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors duration-300 transform hover:scale-105 mb-8" // Botão preenche o novo pai, sem max-w e mx-auto
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Crie sua enquete!
                </motion.button>
              </div>
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
                  className="w-full mb-8"
                >
                  <PollForm onPollCreated={() => { handlePollCreated(); setShowPollForm(false); }} />
                </motion.div>
              </AnimatePresence>
            )}

            <div className="flex flex-wrap space-x-2 sm:space-x-4 gap-y-4 mb-8 justify-center"> {/* Centralizar botões de filtro e permitir quebra de linha */}
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 bg-indigo-600 text-white hover:bg-indigo-700`}
                onClick={() => router.push('/enquetes')}
              >
                Ver Todas as Enquetes
              </motion.button>
            </div>

            {/* Novo layout de duas colunas para enquetes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-8">
              {/* Coluna de Enquetes Públicas */}
              <div>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6 text-center">Enquetes Públicas</h2>
                {loadingPolls ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Carregando enquetes públicas...</p>
                ) : filteredPublicPolls.length === 0 ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Nenhuma outra enquete pública encontrada.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredPublicPolls.map((poll) => ( // Removido slice e otherPublicPolls
                        <PollCard
                          key={poll.id}
                          poll={poll}
                          onVote={handleVote}
                          onDelete={handleDeletePoll}
                          companySlug={poll.isCommercial && poll.creator.commercialName ? slugify(poll.creator.commercialName) : slugify(poll.creator.name)} // Usar commercialName para enquetes comerciais
                          enableCompanyLink={poll.isCommercial} // Habilitar link apenas para enquetes comerciais
                        />
                      ))}
                    </div>
                    {activeFilter === 'recent' && hasMorePublic && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={loadMorePublic}
                          disabled={loadingMorePublic}
                          className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
                        >
                          {loadingMorePublic ? "Carregando..." : "Carregar Mais"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Coluna de Enquetes Comerciais */}
              <div>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6 text-center">Enquetes Comerciais</h2>
                {loadingPolls ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Carregando enquetes comerciais...</p>
                ) : filteredCommercialPolls.length === 0 ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Nenhuma enquete comercial encontrada.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCommercialPolls.map((poll) => ( // Removido slice
                        <PollCard
                          key={poll.id}
                          poll={poll}
                          onVote={handleVote}
                          onDelete={handleDeletePoll}
                          companySlug={poll.isCommercial && poll.creator.commercialName ? slugify(poll.creator.commercialName) : slugify(poll.creator.name)} // Usar commercialName para enquetes comerciais
                          enableCompanyLink={poll.isCommercial} // Habilitar link apenas para enquetes comerciais
                          companyThemeColor={poll.isCommercial ? poll.creator.themeColor : undefined} // Passar themeColor apenas para enquetes comerciais
                        />
                      ))}
                    </div>
                    {activeFilter === 'recent' && hasMoreCommercial && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={loadMoreCommercial}
                          disabled={loadingMoreCommercial}
                          className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
                        >
                          {loadingMoreCommercial ? "Carregando..." : "Carregar Mais"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
