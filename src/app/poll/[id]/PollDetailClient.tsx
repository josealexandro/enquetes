"use client";

import { useEffect, useState } from "react";
// import { useParams } from "next/navigation"; // Não precisamos mais de useParams aqui, receberemos via props
import PollCard from "@/app/components/PollCard";
import { Poll } from "@/app/types/poll";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/app/context/AuthContext";
import { PollOption } from "@/app/types/poll";

interface PollDetailClientProps {
  pollId: string;
}

export default function PollDetailClient({ pollId }: PollDetailClientProps) {
  // const params = useParams() as { id?: string | string[] };
  // const id = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const id = pollId;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchPoll = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "polls", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Ensure options have an 'id' for consistency if not present in DB
          const optionsWithIds = data.options.map((opt: PollOption) => ({ ...opt, id: opt.id || Math.random().toString(36).substring(7) }));

          setPoll({
            id: docSnap.id,
            ...data,
            options: optionsWithIds,
            // Adicionar campos opcionais com valores padrão se não existirem
            likes: data.likes || 0,
            likedBy: data.likedBy || [],
            dislikes: data.dislikes || 0,
            dislikedBy: data.dislikedBy || [],
            isCommercial: data.isCommercial || false,
            // Garantir que creator.id esteja presente
            creator: {
              ...data.creator,
              id: data.creator?.id || "", // Default para string vazia se creator.id não existir
            },
          } as Poll);
        } else {
          setPoll(null);
        }
      } catch (error) {
        console.error("Erro ao buscar enquete:", error);
        setPoll(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!poll || !user) {
      alert("Você precisa estar logado para votar.");
      return;
    }

    // Verificar se já votou
    if (poll.votedBy?.includes(user.uid)) {
      alert("Você já votou nesta enquete.");
      return;
    }

    const optionIndex = poll.options.findIndex(opt => opt.id === optionId);
    if (optionIndex === -1) return;

    // Atualização otimista
    const updatedOptions = [...poll.options];
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      votes: updatedOptions[optionIndex].votes + 1,
    };

    const updatedPoll = { 
      ...poll, 
      options: updatedOptions,
      votedBy: [...(poll.votedBy || []), user.uid],
    };
    setPoll(updatedPoll);

    try {
      // Usar API route com Admin SDK
      const response = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          optionId,
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao registrar voto.");
      }

      // Atualizar com dados do servidor
      if (data.data) {
        setPoll({
          ...poll,
          options: data.data.options,
          votedBy: data.data.votedBy,
        });
      }
    } catch (error: unknown) {
      console.error("Erro ao votar:", error);
      alert(error instanceof Error ? error.message : "Erro ao registrar voto. Tente novamente.");
      // Reverter o estado local se o voto falhar
      setPoll(poll);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      alert("Você precisa estar logado para excluir enquetes.");
      return;
    }

    if (!poll || poll.creator.id !== user.uid) {
      alert("Você não tem permissão para excluir esta enquete.");
      return;
    }

    if (window.confirm("Tem certeza de que deseja excluir esta enquete?")) {
      try {
        await deleteDoc(doc(db, "polls", pollId));
        router.push("/enquetes"); // Redirecionar após a exclusão
      } catch (error) {
        console.error("Erro ao excluir enquete:", error);
        alert("Erro ao excluir enquete. Tente novamente.");
      }
    }
  };

  if (isLoading || loading) return <p className="text-center mt-20">Carregando enquete...</p>;

  if (!poll) return <p className="text-center mt-20">Enquete não encontrada.</p>;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-24 pt-20">
      <div className="max-w-2xl w-full">
        <PollCard poll={poll} onVote={handleVote} onDelete={handleDeletePoll} />
      </div>
    </main>
  );
}
