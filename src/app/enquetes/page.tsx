"use client";

import PollCard from "../components/PollCard";
import { Poll, PollOption } from "../types/poll";
import { useState, useEffect, useCallback } from "react"; // Importar useCallback
import { db } from "@/lib/firebase";
import { collection, query, orderBy, updateDoc, deleteDoc, doc, where, arrayUnion, getDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import PollPodium from "../components/PollPodium";
import slugify from "@/utils/slugify";

export default function EnquetesPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
  const { user, isMasterUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>("Todas");
  
  // Estados de Paginação
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Estado separado para o pódio
  const [podiumPolls, setPodiumPolls] = useState<Poll[]>([]);

  const categories = ["Todas", "Geral", "Política", "Games", "Gastronomia", "Filme", "Esportes", "Tecnologia", "Educação"];

  // Função auxiliar de processamento
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

    // Obter a contagem de comentários (pode ser otimizado futuramente salvando count na enquete)
    const commentsQuery = query(collection(db, `polls/${docSnap.id}/comments`));
    const commentsSnapshot = await getDocs(commentsQuery);
    const commentCount = commentsSnapshot.size;

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
      commentCount: commentCount,
      createdAt: pollCreatedAt,
    } as Poll;
  };

  // Carregar Pódio
  useEffect(() => {
    const fetchPodium = async () => {
      try {
        const q = query(collection(db, "polls"), orderBy("likes", "desc"), limit(3));
        const snapshot = await getDocs(q);
        const pollsData = await Promise.all(snapshot.docs.map(processPollData));
        
        const rankedPolls = pollsData.map((poll, index) => ({
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

  // Carregar Enquetes Iniciais (com filtro)
  const fetchInitialPolls = useCallback(async () => {
    setLoadingPolls(true);
    setPolls([]); // Limpa lista anterior ao mudar filtro
    setHasMore(true);
    setLastDoc(null);

    try {
      const pollsCollection = collection(db, "polls");
      let q;

      if (activeCategory && activeCategory !== "Todas") {
        q = query(
          pollsCollection, 
          where("category", "==", activeCategory), 
          orderBy("createdAt", "desc"),
          limit(12)
        );
      } else {
        q = query(
          pollsCollection, 
          orderBy("createdAt", "desc"),
          limit(12)
        );
      }

      const snapshot = await getDocs(q);
      const newPolls = await Promise.all(snapshot.docs.map(processPollData));

      setPolls(newPolls);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (snapshot.docs.length < 12) setHasMore(false);

    } catch (error) {
      console.error("Erro ao carregar enquetes:", error);
    } finally {
      setLoadingPolls(false);
    }
  }, [activeCategory]);

  // Carregar Mais Enquetes
  const loadMorePolls = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);

    try {
      const pollsCollection = collection(db, "polls");
      let q;

      if (activeCategory && activeCategory !== "Todas") {
        q = query(
          pollsCollection, 
          where("category", "==", activeCategory), 
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(12)
        );
      } else {
        q = query(
          pollsCollection, 
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(12)
        );
      }

      const snapshot = await getDocs(q);
      const newPolls = await Promise.all(snapshot.docs.map(processPollData));

      setPolls(prev => [...prev, ...newPolls]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (snapshot.docs.length < 12) setHasMore(false);

    } catch (error) {
      console.error("Erro ao carregar mais enquetes:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInitialPolls();
  }, [fetchInitialPolls]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      alert("Você precisa estar logado para votar.");
      return;
    }

    // Procura nas duas listas (geral e pódio) para atualização otimista
    const pollToUpdate = polls.find(p => p.id === pollId) || podiumPolls.find(p => p.id === pollId);
    if (!pollToUpdate) return;

    const isOwner = pollToUpdate.creator.id === user.uid;
    const updatedOptions = pollToUpdate.options.map(option =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option
    );
    
    // Atualização Otimista
    const updateList = (list: Poll[]) => list.map(p => 
      p.id === pollId ? { ...p, options: updatedOptions, votedBy: [...(p.votedBy || []), user.uid] } : p
    );
    
    if (polls.some(p => p.id === pollId)) setPolls(prev => updateList(prev));
    if (podiumPolls.some(p => p.id === pollId)) setPodiumPolls(prev => updateList(prev));

    try {
      const pollRef = doc(db, "polls", pollId);
      
      // Se for o dono, pode atualizar options e votedBy juntos
      if (isOwner) {
        await updateDoc(pollRef, { 
          options: updatedOptions, 
          votedBy: arrayUnion(user.uid) 
        });
      } else {
        // Se não for o dono, atualizar options e votedBy juntos
        // As regras do Firestore validam que apenas uma opção teve seu voto incrementado
        await updateDoc(pollRef, { 
          options: updatedOptions, 
          votedBy: arrayUnion(user.uid) 
        });
      }
    } catch (error) {
      console.error("Erro ao votar:", error);
      alert("Erro ao registrar voto. Tente novamente.");
      // Reverter seria ideal aqui, mas omitido para brevidade
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      alert("Você precisa estar logado para excluir enquetes.");
      return;
    }

    const pollToDelete = polls.find(p => p.id === pollId) || podiumPolls.find(p => p.id === pollId);
    if (!pollToDelete || (pollToDelete.creator.id !== user.uid && !isMasterUser)) {
      alert("Você não tem permissão para excluir esta enquete.");
      return;
    }

    try {
      await deleteDoc(doc(db, "polls", pollId));
      setDeleteFeedbackMessage("Enquete excluída com sucesso!");
      setFeedbackType("success");
      
      // Remove localmente
      setPolls(prev => prev.filter(p => p.id !== pollId));
      setPodiumPolls(prev => prev.filter(p => p.id !== pollId));

      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao excluir enquete:", error);
      setDeleteFeedbackMessage("Erro ao excluir enquete.");
      setFeedbackType("error");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    }
  };

  // Filtrar pódio da lista principal para não duplicar visualmente
  const displayedPolls = polls.filter(poll => !podiumPolls.some(p => p.id === poll.id));

  return (
    <main className="min-h-screen w-full px-4 py-24 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto"> 
        {deleteFeedbackMessage && (
          <div className={`p-3 rounded-md text-white mt-4 ${deleteFeedbackType === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {deleteFeedbackMessage}
          </div>
        )}

        {/* Seção do Pódio de Enquetes */}
        {podiumPolls.length > 0 && (
          <>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-12 mb-6 text-center">Mais Votadas</h2>
            <PollPodium polls={podiumPolls} onVote={handleVote} onDelete={handleDeletePoll} />
          </>
        )}

        <div className="flex flex-wrap justify-center gap-2 mb-8 mt-8">
          {categories.map((cat) => (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                activeCategory === cat ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {loadingPolls ? (
          <p className="text-center text-zinc-600 dark:text-zinc-400">Carregando enquetes...</p>
        ) : displayedPolls.length === 0 && polls.length === 0 ? (
          <div className="space-y-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhuma enquete encontrada nesta categoria.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
              {displayedPolls.map((poll) => (
                <motion.div key={poll.id} className="w-full">
                  <PollCard 
                    poll={poll} 
                    onVote={handleVote} 
                    onDelete={handleDeletePoll} 
                    companySlug={poll.isCommercial && poll.creator.commercialName ? slugify(poll.creator.commercialName) : slugify(poll.creator.name)}
                    enableCompanyLink={poll.isCommercial}
                    companyThemeColor={poll.isCommercial ? poll.creator.themeColor : undefined}
                  />
                </motion.div>
              ))}
            </div>
            
            {hasMore && (
              <div className="flex justify-center mt-8 mb-8">
                <button
                  onClick={loadMorePolls}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Carregando..." : "Carregar Mais"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
