"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PollCard from "@/app/components/PollCard";
import { Poll } from "@/app/types/poll";
import { useRouter } from "next/navigation"; // Importar useRouter

export default function PollPage() {
  const params = useParams() as { id?: string | string[] };
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const router = useRouter(); // Inicializar router

  const [poll, setPoll] = useState<Poll | null>(null);

  useEffect(() => {
    const storedPolls = localStorage.getItem("polls");
    if (storedPolls) {
      const allPolls: Poll[] = JSON.parse(storedPolls);
      const found = allPolls.find((p) => p.id === id);
      if (found) setPoll(found);
    }
  }, [id]);

  const handleVote = (pollId: string, optionId: string) => {
    if (!poll) return;
    const updatedPoll = {
      ...poll,
      options: poll.options.map((opt) =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      ),
    };
    setPoll(updatedPoll);

    const storedPolls = localStorage.getItem("polls");
    if (storedPolls) {
      const allPolls: Poll[] = JSON.parse(storedPolls);
      const updatedPolls = allPolls.map((p) =>
        p.id === pollId ? updatedPoll : p
      );
      localStorage.setItem("polls", JSON.stringify(updatedPolls));
    }
  };

  const handleDeletePoll = (pollId: string) => {
    if (window.confirm("Tem certeza de que deseja excluir esta enquete?")) {
      const storedPolls = localStorage.getItem("polls");
      if (storedPolls) {
        const allPolls: Poll[] = JSON.parse(storedPolls);
        const updatedPolls = allPolls.filter((p) => p.id !== pollId);
        localStorage.setItem("polls", JSON.stringify(updatedPolls));
        router.push("/enquetes"); // Redirecionar após a exclusão
      }
    }
  };

  if (!poll) return <p className="text-center mt-20">Enquete não encontrada.</p>;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 bg-white dark:bg-zinc-900">
      <div className="max-w-2xl w-full">
        <PollCard poll={poll} onVote={handleVote} onDelete={handleDeletePoll} />
      </div>
    </main>
  );
}
