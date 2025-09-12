"use client";

import PollCard from "../components/PollCard";
import { Poll } from "../types/poll";
import useLocalStorage from "../hooks/useLocalStorage";

export default function EnquetesPage() {
  const [polls, setPolls] = useLocalStorage<Poll[]>("polls", []);

  const handleVote = (pollId: string, optionId: string) => {
    const updatedPolls = polls.map((poll) =>
      poll.id === pollId
        ? {
            ...poll,
            options: poll.options.map((opt) =>
              opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            ),
          }
        : poll
    );
    setPolls(updatedPolls);
  };

  return (
    <main className="min-h-screen w-full px-4 py-24 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-zinc-900 dark:text-white">
          Todas as Enquetes
        </h1>
        
        {polls.length === 0 ? (
          <div className="space-y-8 text-center text-zinc-600 dark:text-zinc-400">
            Nenhuma enquete criada ainda.
          </div>
        ) : (
          <div className="space-y-8">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} onVote={handleVote} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
