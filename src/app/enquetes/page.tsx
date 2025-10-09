"use client";

import PollCard from "../components/PollCard";
import { Poll } from "../types/poll";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPolls = snapshot.docs.map((doc) => {
        const data = doc.data();
        const creatorId = data.creator?.id || data.creatorId;
        return {
          id: doc.id,
          ...data,
          creator: {
            ...data.creator,
            id: creatorId,
          },
        } as Poll;
      });
      setPolls(fetchedPolls);
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

    setPolls((prevPolls) =>
      prevPolls.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: poll.options.map((option) =>
                option.id === optionId
                  ? { ...option, votes: option.votes + 1 }
                  : option
              ),
            }
          : poll
      )
    );

    try {
      const pollRef = doc(db, "polls", pollId);
      const currentPoll = polls.find(p => p.id === pollId);
      if (currentPoll) {
        const updatedOptions = currentPoll.options.map(option =>
          option.id === optionId ? { ...option, votes: option.votes + 1 } : option
        );
        await updateDoc(pollRef, { options: updatedOptions });
      }
    } catch (error) {
      console.error("Erro ao votar:", error);
      alert("Erro ao registrar voto. Tente novamente.");
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
              }
            : poll
        )
      );
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

        {loadingPolls ? (
          <p className="text-center text-zinc-600 dark:text-zinc-400">Carregando enquetes...</p>
        ) : polls.length === 0 ? (
          <div className="space-y-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhuma enquete criada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {polls.map((poll) => (
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
