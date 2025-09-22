"use client";

import PollForm from "./components/PollForm";
import PollCard from "./components/PollCard";
import { Poll } from "./types/poll";
import { v4 as uuidv4 } from "uuid";
// import useLocalStorage from "./hooks/useLocalStorage"; // Remover useLocalStorage
import { useState, useMemo, useEffect } from "react"; // Adicionar useEffect
import { useAuth } from "./context/AuthContext";
import { motion } from "framer-motion";
import { LayoutGroup } from "framer-motion";
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"; // Importar funções do Firestore

export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]); // Mudar para useState
  const [loadingPolls, setLoadingPolls] = useState(true); // Novo estado para carregamento
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setDeleteFeedbackType] = useState<"success" | "error" | null>(null);
  const [activeFilter, setActiveFilter] = useState<"recent" | "trending" | "mine">("recent");
  const { user, isMasterUser } = useAuth(); // Obter o usuário logado e o status de mestre
  const [isClient, setIsClient] = useState(false); // Novo estado para montagem no cliente

  // useEffect para carregar enquetes do Firestore em tempo real
  useEffect(() => {
    setIsClient(true); // Marcar como montado no cliente
    setLoadingPolls(true);
    const pollsCollection = collection(db, "polls");
    const q = query(pollsCollection, orderBy("createdAt", "desc")); // Ordenar por data de criação

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPolls = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Assegurar que poll.creator.id seja sempre definido para compatibilidade
        const creatorId = data.creator?.id || data.creatorId; // Prioriza o novo campo, mas usa o antigo se o novo não existir
        return {
          id: doc.id,
          ...data,
          creator: {
            ...data.creator,
            id: creatorId, // Garantir que o ID do criador esteja dentro do objeto creator
          },
        } as Poll;
      });
      setPolls(fetchedPolls);
      setLoadingPolls(false);
    }, (error) => {
      console.error("Erro ao carregar enquetes:", error);
      setLoadingPolls(false);
    });

    return () => unsubscribe(); // Limpar o listener quando o componente for desmontado
  }, []);

  const addPoll = async (title: string, options: string[], category: string) => {
    if (!user) {
      alert("Você precisa estar logado para criar uma enquete.");
      return;
    }

    const newPoll: Omit<Poll, "id"> = {
      title,
      options: options.map((opt) => ({
        id: uuidv4(), // Usar uuid para IDs de opções
        text: opt,
        votes: 0,
      })),
      creator: {
        name: user.email || "Usuário Logado",
        avatarUrl: "https://www.gravatar.com/avatar/?d=mp", // Pode ser personalizado com o avatar do usuário
        id: user.uid, // Adicionar o ID do criador aqui
      },
      createdAt: Date.now(), // Timestamp em milissegundos
      category, // Adicionar a categoria aqui
      likes: 0, // Inicializar curtidas como 0
      likedBy: [], // Inicializar likedBy como um array vazio
      dislikes: 0, // Inicializar descurtidas como 0
      dislikedBy: [], // Inicializar dislikedBy como um array vazio
      // creatorId: user.uid, // Remover esta linha
    };

    try {
      await addDoc(collection(db, "polls"), newPoll);
      // setPolls((prev) => [...prev, { id: docRef.id, ...newPoll }]); // onSnapshot vai atualizar o estado
    } catch (error) {
      console.error("Erro ao adicionar enquete:", error);
      alert("Erro ao criar enquete. Tente novamente.");
    }
  };

  const handlePollCreated = () => {
    setActiveFilter("mine");
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      alert("Você precisa estar logado para votar.");
      return;
    }

    // Otimista: Atualiza a UI imediatamente
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
      // Para evitar sobrescrever votos de outros usuários, busco o poll mais recente
      // Isso pode ser otimizado com transações ou um modelo de dados diferente no Firestore para votos
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

  const filteredPolls = useMemo(() => {
    let sortedPolls = [...polls];

    if (activeFilter === "recent") {
      sortedPolls.sort((a, b) => b.createdAt - a.createdAt);
    } else if (activeFilter === "trending") {
      sortedPolls.sort((a, b) => {
        const votesA = a.options.reduce((sum, option) => sum + option.votes, 0);
        const votesB = b.options.reduce((sum, option) => sum + option.votes, 0);
        return votesB - votesA;
      });
    } else if (activeFilter === "mine") {
      // Filter by logged-in user's ID, or show no polls if not logged in
      sortedPolls = sortedPolls.filter(poll => user && poll.creator.id === user.uid);
    }
    return sortedPolls;
  }, [polls, activeFilter, user]);

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
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-24 bg-white dark:bg-zinc-900">
      <div className="max-w-3xl w-full text-center mb-12">
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

      <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-center gap-8 px-4">
        {!isClient ? (
          <p className="text-zinc-600 dark:text-zinc-400">Carregando conteúdo...</p>
        ) : (
          <>
            <PollForm onAddPoll={addPoll} onPollCreated={handlePollCreated} />

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

            {loadingPolls ? (
              <p className="text-zinc-600 dark:text-zinc-400">Carregando enquetes...</p>
            ) : filteredPolls.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">Nenhuma enquete encontrada para este filtro.</p>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="w-full flex flex-col items-center gap-8"
              >
                <LayoutGroup>
                  {filteredPolls.map((poll) => (
                    <motion.div key={poll.id} variants={itemVariants} className="w-full">
                      <PollCard poll={poll} onVote={handleVote} onDelete={handleDeletePoll} />
                    </motion.div>
                  ))}
                </LayoutGroup>
              </motion.div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
