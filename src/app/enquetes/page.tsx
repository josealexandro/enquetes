"use client";

import PollCard from "../components/PollCard";
import { Poll } from "../types/poll";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function EnquetesPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setDeleteFeedbackType] = useState<"success" | "error" | null>(null);
  const { user, isMasterUser } = useAuth();

  useEffect(() => {
    setLoadingPolls(true);
    const pollsCollection = collection(db, "polls");
    const q = query(pollsCollection, orderBy("createdAt", "desc"));

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
  }, []);

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
    <main className="min-h-screen w-full px-4 py-24 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-zinc-900 dark:text-white">
          Todas as Enquetes
        </h1>

        {deleteFeedbackMessage && (
          <div className={`p-3 rounded-md text-white mt-4 ${deleteFeedbackType === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {deleteFeedbackMessage}
          </div>
        )}

        {loadingPolls ? (
          <p className="text-center text-zinc-600 dark:text-zinc-400">Carregando enquetes...</p>
        ) : polls.length === 0 ? (
          <div className="space-y-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhuma enquete criada ainda.
          </div>
        ) : (
          <div className="space-y-8">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} onVote={handleVote} onDelete={handleDeletePoll} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
