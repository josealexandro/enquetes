"use client";

import PollCard from "../components/PollCard";
import { Poll, PollOption } from "../types/poll";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, where, arrayUnion, getDoc } from "firebase/firestore"; // Importar getDoc
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import PollPodium from "../components/PollPodium"; // Importar PollPodium

export default function EnquetesPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
  const { user, isMasterUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>("Todas"); // Novo estado para a categoria ativa

  const categories = ["Todas", "Geral", "Política", "Games", "Gastronomia", "Filme", "Esportes", "Tecnologia", "Educação"];

  useEffect(() => {
    setLoadingPolls(true);
    const pollsCollection = collection(db, "polls");
    let q = query(pollsCollection, orderBy("createdAt", "desc"));

    if (activeCategory && activeCategory !== "Todas") {
      q = query(pollsCollection, where("category", "==", activeCategory), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => { // Adicionar async aqui
      const fetchedPollsPromises = snapshot.docs.map(async (docSnap) => { // Mudar para const
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
        const optionsWithIds = data.options.map((opt: PollOption) => ({
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
      setLoadingPolls(false);
    }, (error) => {
      console.error("Erro ao carregar enquetes:", error);
      setLoadingPolls(false);
    });

    return () => unsubscribe();
  }, [activeCategory]); // Adicionar activeCategory como dependência

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      alert("Você precisa estar logado para votar.");
      return;
    }

    try {
      const pollRef = doc(db, "polls", pollId);
      const currentPoll = polls.find(p => p.id === pollId);
      if (currentPoll) {
        const updatedOptions = currentPoll.options.map(option =>
          option.id === optionId ? { ...option, votes: option.votes + 1 } : option
        );
        await updateDoc(pollRef, { options: updatedOptions, votedBy: arrayUnion(user.uid) });
      }
    } catch (error) {
      console.error("Erro ao votar:", error);
      alert("Erro ao registrar voto. Tente novamente.");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      alert("Você precisa estar logado para excluir enquetes.");
      return;
    }

    const pollToDelete = polls.find(p => p.id === pollId);
    if (!pollToDelete || (pollToDelete.creator.id !== user.uid && !isMasterUser)) {
      alert("Você não tem permissão para excluir esta enquete.");
      return;
    }

    try {
      await deleteDoc(doc(db, "polls", pollId));
      setDeleteFeedbackMessage("Enquete excluída com sucesso!");
      setFeedbackType("success");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao excluir enquete:", error);
      setDeleteFeedbackMessage("Erro ao excluir enquete.");
      setFeedbackType("error");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    }
  };

  const podiumPolls = polls
    .filter(poll => poll.rank && (poll.rank >= 1 && poll.rank <= 3))
    .sort((a, b) => (a.rank || 0) - (b.rank || 0))
    .slice(0, 3); // Garantir que apenas os top 3 sejam selecionados

  const otherPolls = polls.filter(poll => !podiumPolls.some(p => p.id === poll.id));

  return (
    <main className="min-h-screen w-full px-4 py-24 bg-white dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto"> {/* Aumentado max-w */}
        <h1 className="text-3xl font-bold mb-8 text-center text-zinc-900 dark:text-white">
          Todas as Enquetes
        </h1>

        {deleteFeedbackMessage && (
          <div className={`p-3 rounded-md text-white mt-4 ${deleteFeedbackType === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {deleteFeedbackMessage}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 mb-8">
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

        {/* Seção do Pódio de Enquetes */}
        {podiumPolls.length > 0 && (
          <>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-12 mb-6 text-center">Pódio das Enquetes</h2>
            <PollPodium polls={podiumPolls} onVote={handleVote} onDelete={handleDeletePoll} />
          </>
        )}

        {loadingPolls ? (
          <p className="text-center text-zinc-600 dark:text-zinc-400">Carregando enquetes...</p>
        ) : otherPolls.length === 0 ? (
          <div className="space-y-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhuma outra enquete encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8"> {/* Adicionado mt-8 para espaçamento */}
            {otherPolls.map((poll) => (
              <motion.div key={poll.id} className="w-full">
                <PollCard poll={poll} onVote={handleVote} onDelete={handleDeletePoll} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
