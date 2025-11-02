"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"; // Adicionado updateDoc
import slugify from "@/utils/slugify";
import { useAuth } from "@/app/context/AuthContext"; // Importar useAuth
import Link from "next/link"; // Adicionado Link
import Image from "next/image"; // Importar Image

interface PollDetailPageProps {
  params: { slug: string; pollSlug: string };
}

interface Option {
  id: string;
  text: string;
  votes: number;
}

interface PollDetailData {
  id: string;
  title: string;
  options: Option[];
  category: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  createdAt: Date;
  isCommercial: boolean;
  votedBy?: string[]; // Adicionado campo para controle de votos duplicados em enquetes comerciais
}

// Função auxiliar para obter companyId a partir do slug da empresa
const getCompanyIdFromSlug = async (slug: string): Promise<string | null> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("accountType", "==", "commercial"));
    const querySnapshot = await getDocs(q);

    let companyId: string | null = null;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.commercialName && slugify(data.commercialName) === slug) {
        companyId = doc.id;
      }
    });
    return companyId;
  } catch (error) {
    console.error("Erro ao buscar ID da empresa pelo slug:", error);
    return null;
  }
};

const getPollData = async (companySlug: string, pollSlug: string): Promise<PollDetailData | null> => {
  try {
    const companyId = await getCompanyIdFromSlug(companySlug);
    if (!companyId) {
      return null;
    }

    const pollsRef = collection(db, "polls");
    const q = query(pollsRef, where("creator.id", "==", companyId));
    const querySnapshot = await getDocs(q);

    let pollData: PollDetailData | null = null;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.title && slugify(data.title) === pollSlug) {
        pollData = {
          id: doc.id,
          title: data.title,
          options: data.options || [],
          category: data.category || "Geral",
          creatorName: data.creator.name || "Desconhecido",
          creatorAvatarUrl: data.creator.avatarUrl || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          isCommercial: data.isCommercial || false,
          votedBy: data.votedBy || [], // Buscar votedBy
        };
      }
    });
    return pollData;
  } catch (error) {
    console.error("Erro ao buscar dados da enquete:", error);
    return null;
  }
};

const PollDetailPage: React.FC<PollDetailPageProps> = ({ params }) => { // Alterado para componente cliente
  const { slug, pollSlug } = params;
  const { user } = useAuth(); // Obter usuário logado
  const [poll, setPoll] = useState<PollDetailData | null>(null);
  const [loadingPoll, setLoadingPoll] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    console.log("PollDetailPage renderizado para slug:", slug, "e pollSlug:", pollSlug); // Adicionado para depuração
    const fetchPoll = async () => {
      setLoadingPoll(true);
      const fetchedPoll = await getPollData(slug, pollSlug);
      setPoll(fetchedPoll);
      setLoadingPoll(false);
    };
    fetchPoll();
  }, [slug, pollSlug]);

  const handleVote = async (optionId: string) => {
    if (!user) {
      setFeedbackMessage("Você precisa estar logado para votar.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    if (!poll) return;

    // Prevenção de voto duplicado para enquetes comerciais
    const hasVoted = poll.votedBy?.includes(user.uid);
    if (poll.isCommercial && hasVoted) {
      setFeedbackMessage("Você já votou nesta enquete comercial.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    const pollRef = doc(db, "polls", poll.id);
    const updatedOptions = poll.options.map((option) =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option
    );

    const updatedVotedBy = poll.isCommercial && user
      ? [...(poll.votedBy || []), user.uid]
      : poll.votedBy;

    try {
      await updateDoc(pollRef, {
        options: updatedOptions,
        ...(poll.isCommercial && { votedBy: updatedVotedBy }),
      });

      // Atualizar o estado local da enquete
      setPoll((prevPoll) => {
        if (!prevPoll) return null;
        return {
          ...prevPoll,
          options: updatedOptions,
          votedBy: updatedVotedBy,
        };
      });

      setFeedbackMessage("Voto registrado com sucesso!");
      setFeedbackType("success");
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao registrar voto:", error);
      setFeedbackMessage("Erro ao registrar voto. Tente novamente.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  if (loadingPoll) {
    return <div>Carregando enquete...</div>;
  }

  if (!poll) {
    return <div>Enquete não encontrada.</div>;
  }

  const hasUserVoted = poll.votedBy?.includes(user?.uid || '');
  const canVote = user && (!poll.isCommercial || (poll.isCommercial && !hasUserVoted));

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 text-center">{poll.title}</h1>
        <div className="flex items-center justify-center text-lg text-gray-700 mb-6"> {/* Container flexível */}
          Criado por:
          {poll.creatorAvatarUrl && (
            <div className="w-8 h-8 rounded-full overflow-hidden ml-2"> {/* Wrapper para a imagem */}
              <Image
                src={poll.creatorAvatarUrl}
                alt={poll.creatorName || "Avatar do criador"}
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          <Link href={`/empresa/${slug}`} className="text-blue-600 hover:text-blue-800 ml-1">
            {poll.creatorName}
          </Link>
        </div>

        <div className="space-y-4">
          {poll.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!canVote} // Desabilita o botão se não puder votar
              className={`flex justify-between items-center bg-gray-100 p-4 rounded-md shadow-sm w-full text-left
                ${canVote ? 'hover:bg-gray-200 cursor-pointer' : 'cursor-not-allowed opacity-70'}
                ${hasUserVoted && (poll.votedBy?.includes(user?.uid || '') && !poll.isCommercial) ? 'bg-blue-100 border-blue-500 border' : ''} /* Estilo para opção votada (não comercial) */
                ${hasUserVoted && poll.isCommercial && poll.votedBy?.includes(user?.uid || '') ? 'bg-green-100 border-green-500 border' : ''} /* Estilo para opção votada (comercial) */
              `}
            >
              <span className="text-gray-800 text-lg font-medium">{option.text}</span>
              <span className="text-blue-600 font-bold text-xl">{option.votes} votos</span>
            </button>
          ))}
        </div>

        {feedbackMessage && (
          <div className={`mt-4 p-3 rounded-md text-white text-center ${feedbackType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {feedbackMessage}
          </div>
        )}

        <div className="mt-8 text-center text-gray-600">
          <p>Categoria: {poll.category}</p>
          <p>Criado em: {poll.createdAt.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default PollDetailPage;
