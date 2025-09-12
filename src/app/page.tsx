"use client";

import PollForm from "./components/PollForm";
import PollCard from "./components/PollCard";
import { Poll } from "./types/poll";
import { v4 as uuidv4 } from "uuid";
import useLocalStorage from "./hooks/useLocalStorage";
import { useState, useMemo } from "react";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const [polls, setPolls] = useLocalStorage<Poll[]>("polls", []);
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setDeleteFeedbackType] = useState<"success" | "error" | null>(null);
  const [activeFilter, setActiveFilter] = useState<"recent" | "trending" | "mine">("recent");
  const { user } = useAuth(); // Get the current user from AuthContext

  const addPoll = (title: string, options: string[]) => {
    const newPoll: Poll = {
      id: uuidv4(),
      title,
      options: options.map((opt) => ({
        id: uuidv4(),
        text: opt,
        votes: 0,
      })),
      creator: {
        name: user ? user.email : "Usuário Anônimo", // Use user email if logged in
        avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
      },
      createdAt: Date.now(),
      creatorId: user ? user.uid : "anonymous", // Use user uid if logged in
    };
    setPolls([...polls, newPoll]);
  };

  const handlePollCreated = () => {
    setActiveFilter("mine");
  };

  const handleVote = (pollId: string, optionId: string) => {
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
  };

  const handleDeletePoll = (pollId: string) => {
    try {
      setPolls((prevPolls) => prevPolls.filter((poll) => poll.id !== pollId));
      setDeleteFeedbackMessage("Enquete excluída com sucesso!");
      setDeleteFeedbackType("success");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    } catch (error) {
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
      sortedPolls = sortedPolls.filter(poll => user && poll.creatorId === user.uid);
    }
    return sortedPolls;
  }, [polls, activeFilter, user]);

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
        <PollForm onAddPoll={addPoll} onPollCreated={handlePollCreated} />

        <div className="flex space-x-4 mb-8">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${activeFilter === "recent" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
            onClick={() => setActiveFilter("recent")}
          >
            Recentes
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${activeFilter === "trending" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
            onClick={() => setActiveFilter("trending")}
          >
            Em alta
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${activeFilter === "mine" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
            onClick={() => setActiveFilter("mine")}
          >
            Minhas
          </button>
        </div>

        {filteredPolls.map((poll) => (
          <PollCard key={poll.id} poll={poll} onVote={handleVote} onDelete={handleDeletePoll} />
        ))}
      </div>
    </main>
  );
}
